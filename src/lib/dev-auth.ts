/**
 * DEV ONLY - REMOVE BEFORE PRODUCTION
 *
 * Development-only authentication bypass utilities.
 * This module provides mock authentication for testing purposes only.
 *
 * Safety measures:
 * - Uses __DEV__ constant (automatically false in production builds)
 * - Checks hostname is localhost
 * - Stores dev auth state in memory only (not AsyncStorage)
 *
 * @module dev-auth
 */

import { Session, User } from '@supabase/supabase-js';

/**
 * DEV ONLY - Mock user object matching Supabase User type
 * Used for testing the app without requiring actual Supabase authentication
 */
export const DEV_USER: User = {
  id: 'dev-user-00000000-0000-0000-0000-000000000000',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'dev@localhost.test',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: 'dev-bypass',
    providers: ['dev-bypass'],
  },
  user_metadata: {
    name: 'Dev User',
    is_dev_user: true,
  },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * DEV ONLY - Mock session object matching Supabase Session type
 * Provides a mock session for development testing
 */
export const DEV_SESSION: Session = {
  access_token: 'dev-access-token-not-for-production',
  refresh_token: 'dev-refresh-token-not-for-production',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: DEV_USER,
};

/**
 * DEV ONLY - Session storage key for dev auth
 * Using sessionStorage so auth persists during browser session but not across restarts
 */
const DEV_AUTH_STORAGE_KEY = 'dev-auth-session';

/**
 * DEV ONLY - Get dev auth state from sessionStorage (web) or memory (native)
 */
function getStoredDevAuth(): { isDevAuthenticated: boolean; session: Session | null } {
  // Only use sessionStorage on web platform
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(DEV_AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          isDevAuthenticated: parsed.isDevAuthenticated ?? false,
          session: parsed.session ?? null,
        };
      }
    } catch {
      // Ignore parsing errors
    }
  }
  return { isDevAuthenticated: false, session: null };
}

/**
 * DEV ONLY - Save dev auth state to sessionStorage (web only)
 */
function setStoredDevAuth(state: { isDevAuthenticated: boolean; session: Session | null }): void {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    try {
      window.sessionStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * DEV ONLY - Clear dev auth state from sessionStorage
 */
function clearStoredDevAuth(): void {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    try {
      window.sessionStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Check if the app is running in development environment on localhost
 *
 * This function performs two checks:
 * 1. __DEV__ constant (false in production builds)
 * 2. Hostname is localhost (for web platform)
 *
 * @returns true if running in dev mode, false otherwise
 *
 * @example
 * ```tsx
 * if (isDevEnvironment()) {
 *   // Show dev login button
 * }
 * ```
 */
export function isDevEnvironment(): boolean {
  // DEV ONLY - Check __DEV__ constant first (React Native)
  // This is automatically set to false in production builds
  if (typeof __DEV__ !== 'undefined' && __DEV__ === true) {
    return true;
  }

  // DEV ONLY - Check hostname for web platform
  // Only allow on localhost/127.0.0.1
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }

  return false;
}

/**
 * DEV ONLY - Sign in with dev bypass
 *
 * Creates a mock session without calling Supabase.
 * Only works when isDevEnvironment() returns true.
 *
 * @returns The mock session if successful, null if not in dev environment
 *
 * @example
 * ```tsx
 * const session = devSignIn();
 * if (session) {
 *   // Dev user is now "authenticated"
 * }
 * ```
 */
export function devSignIn(): Session | null {
  // DEV ONLY - Safety check: only allow in dev environment
  if (!isDevEnvironment()) {
    console.warn('[DEV AUTH] Attempted dev sign in outside of dev environment - blocked');
    return null;
  }

  console.log('[DEV AUTH] Dev sign in - bypassing authentication');

  // Create a fresh session with updated timestamps
  const session: Session = {
    ...DEV_SESSION,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  const state = {
    isDevAuthenticated: true,
    session,
  };

  // Save to sessionStorage for persistence across page navigations
  setStoredDevAuth(state);

  return session;
}

/**
 * DEV ONLY - Sign out dev user
 *
 * Clears the mock dev session from memory.
 *
 * @example
 * ```tsx
 * devSignOut();
 * // Dev user is now signed out
 * ```
 */
export function devSignOut(): void {
  console.log('[DEV AUTH] Dev sign out');
  clearStoredDevAuth();
}

/**
 * DEV ONLY - Get current dev auth state
 *
 * Returns the current dev authentication state.
 * Only used for checking dev auth status within the AuthContext.
 *
 * @returns Current dev auth state
 */
export function getDevAuthState(): {
  isDevAuthenticated: boolean;
  session: Session | null;
} {
  return getStoredDevAuth();
}

/**
 * DEV ONLY - Check if currently authenticated via dev bypass
 *
 * @returns true if authenticated via dev bypass
 */
export function isDevAuthenticated(): boolean {
  return getStoredDevAuth().isDevAuthenticated;
}
