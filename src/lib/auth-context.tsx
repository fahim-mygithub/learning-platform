/**
 * Authentication Context Provider
 *
 * Provides authentication state management for the app:
 * - Holds current session state
 * - Subscribes to auth state changes via Supabase
 * - Provides loading state during session restore
 * - Exposes useAuth() hook for components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { Session, User, AuthError, AuthResponse } from '@supabase/supabase-js';

import { supabase } from './supabase';
// DEV ONLY - Import dev auth utilities for testing bypass
import {
  isDevEnvironment,
  devSignIn as devSignInFn,
  devSignOut as devSignOutFn,
  getDevAuthState,
} from './dev-auth';

/**
 * Authentication state interface
 */
interface AuthState {
  /** Current user session, null if not authenticated */
  session: Session | null;
  /** Current user, null if not authenticated */
  user: User | null;
  /** True while restoring session from storage */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Sign up response type
 */
type SignUpResponse = Pick<AuthResponse, 'data' | 'error'>;

/**
 * Sign in response type
 */
type SignInResponse = Pick<AuthResponse, 'data' | 'error'>;

/**
 * Resend verification response type
 */
interface ResendVerificationResponse {
  error: AuthError | null;
}

/**
 * Authentication context value interface
 */
interface AuthContextValue extends AuthState {
  /** Sign up a new user with email and password */
  signUp: (email: string, password: string) => Promise<SignUpResponse>;
  /** Sign in an existing user with email and password */
  signIn: (email: string, password: string) => Promise<SignInResponse>;
  /** Resend email verification to the specified email */
  resendVerification: (email: string) => Promise<ResendVerificationResponse>;
  /** Sign out the current user */
  signOut: () => Promise<{ error: AuthError | null }>;
  /** Refresh the current session */
  refreshSession: () => Promise<{ error: AuthError | null }>;
  // DEV ONLY - Dev authentication bypass methods
  /** DEV ONLY - Sign in with dev bypass (only available in dev environment) */
  devSignIn: (() => void) | null;
  /** DEV ONLY - Check if dev environment is available */
  isDevEnvironment: boolean;
}

/**
 * Default context value used before provider is mounted
 */
const defaultContextValue: AuthContextValue = {
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  resendVerification: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  refreshSession: async () => ({ error: null }),
  // DEV ONLY - Dev auth defaults
  devSignIn: null,
  isDevEnvironment: false,
};

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextValue>(defaultContextValue);

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 *
 * Wraps the app to provide authentication state to all components.
 * Handles:
 * - Initial session restoration from AsyncStorage
 * - Real-time auth state change subscription
 * - Loading state management
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // DEV ONLY - Track if user is authenticated via dev bypass
  const [isDevAuth, setIsDevAuth] = useState(false);

  useEffect(() => {
    // Restore session from storage on mount
    const initializeSession = async () => {
      try {
        // DEV ONLY - Check for existing dev auth state first
        if (isDevEnvironment()) {
          const devState = getDevAuthState();
          if (devState.isDevAuthenticated && devState.session) {
            setSession(devState.session);
            setIsDevAuth(true);
            setIsLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error restoring session:', error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch (error) {
        console.error('Unexpected error restoring session:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // DEV ONLY - Don't override dev auth session with Supabase events
      if (!isDevAuth) {
        setSession(newSession);
      }
      // Ensure loading is false after any auth state change
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [isDevAuth]);

  /**
   * Sign up a new user with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResponse> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('Error signing up:', error.message);
      }
      return { data, error };
    },
    []
  );

  /**
   * Sign in an existing user with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResponse> => {
      console.log('[AUTH DEBUG] Attempting sign in for:', email);

      // DEV ONLY - Clear any existing dev auth state before real sign-in
      // This fixes the bug where dev auth blocks real auth state updates
      if (isDevAuth) {
        console.log('[AUTH DEBUG] Clearing dev auth state before real sign-in');
        devSignOutFn();
        setIsDevAuth(false);
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[AUTH DEBUG] Response:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error?.message ?? null,
      });

      if (error) {
        console.error('Error signing in:', error.message);
      } else if (data?.session) {
        // Explicitly set session on success (don't rely solely on onAuthStateChange)
        console.log('[AUTH DEBUG] Setting session explicitly');
        setSession(data.session);
      }

      return { data, error };
    },
    [isDevAuth]
  );

  /**
   * Resend email verification to the specified email
   */
  const resendVerification = useCallback(
    async (email: string): Promise<ResendVerificationResponse> => {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        console.error('Error resending verification:', error.message);
      }
      return { error };
    },
    []
  );

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    // DEV ONLY - Handle dev auth sign out
    if (isDevAuth) {
      devSignOutFn();
      setSession(null);
      setIsDevAuth(false);
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    return { error };
  }, [isDevAuth]);

  /**
   * Refresh the current session
   */
  const refreshSession = useCallback(async (): Promise<{ error: AuthError | null }> => {
    // DEV ONLY - No refresh needed for dev auth
    if (isDevAuth) {
      return { error: null };
    }

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error.message);
    } else {
      setSession(data.session);
    }
    return { error };
  }, [isDevAuth]);

  /**
   * DEV ONLY - Sign in with dev bypass
   * Only available when isDevEnvironment() returns true
   */
  const devSignIn = useCallback(() => {
    if (!isDevEnvironment()) {
      console.warn('[DEV AUTH] Dev sign in blocked - not in dev environment');
      return;
    }

    const devSession = devSignInFn();
    if (devSession) {
      setSession(devSession);
      setIsDevAuth(true);
    }
  }, []);

  // DEV ONLY - Check if dev environment is available
  const isDevEnv = isDevEnvironment();

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: !!session,
      signUp,
      signIn,
      resendVerification,
      signOut,
      refreshSession,
      // DEV ONLY - Dev auth properties (only expose devSignIn in dev environment)
      devSignIn: isDevEnv ? devSignIn : null,
      isDevEnvironment: isDevEnv,
    }),
    [session, isLoading, signUp, signIn, resendVerification, signOut, refreshSession, isDevEnv, devSignIn]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication state and actions
 *
 * Must be used within an AuthProvider.
 *
 * @returns Authentication context value with session, user, loading state, and actions
 *
 * @example
 * ```tsx
 * function ProfileScreen() {
 *   const { user, isLoading, signOut } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!user) {
 *     return <SignInPrompt />;
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Welcome, {user.email}</Text>
 *       <Button onPress={signOut} title="Sign Out" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type {
  AuthState,
  AuthContextValue,
  AuthProviderProps,
  SignUpResponse,
  SignInResponse,
  ResendVerificationResponse,
};
