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
import { Session, User, AuthError } from '@supabase/supabase-js';

import { supabase } from './supabase';

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
 * Authentication context value interface
 */
interface AuthContextValue extends AuthState {
  /** Sign out the current user */
  signOut: () => Promise<{ error: AuthError | null }>;
  /** Refresh the current session */
  refreshSession: () => Promise<{ error: AuthError | null }>;
}

/**
 * Default context value used before provider is mounted
 */
const defaultContextValue: AuthContextValue = {
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => ({ error: null }),
  refreshSession: async () => ({ error: null }),
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

  useEffect(() => {
    // Restore session from storage on mount
    const initializeSession = async () => {
      try {
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
      setSession(newSession);
      // Ensure loading is false after any auth state change
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    return { error };
  }, []);

  /**
   * Refresh the current session
   */
  const refreshSession = useCallback(async (): Promise<{ error: AuthError | null }> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error.message);
    } else {
      setSession(data.session);
    }
    return { error };
  }, []);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: !!session,
      signOut,
      refreshSession,
    }),
    [session, isLoading, signOut, refreshSession]
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
export type { AuthState, AuthContextValue, AuthProviderProps };
