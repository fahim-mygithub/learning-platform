/**
 * Auth Context Tests
 *
 * Tests for authentication context methods:
 * - signUp: Register new users
 * - signIn: Authenticate existing users
 * - resendVerification: Resend email verification
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthError, Session, User } from '@supabase/supabase-js';

import { AuthProvider, useAuth } from '../auth-context';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resend: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));

// Import the mocked supabase
import { supabase } from '../supabase';

// Type the mocked functions
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockResend = supabase.auth.resend as jest.Mock;

/**
 * Helper to create a mock user
 */
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

/**
 * Helper to create a mock session
 */
function createMockSession(overrides?: Partial<Session>): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Helper to create a mock AuthError
 */
function createMockAuthError(message: string, status?: number): AuthError {
  const error = new Error(message) as AuthError;
  error.name = 'AuthError';
  error.status = status || 400;
  return error;
}

/**
 * Wrapper component for testing hooks
 */
function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  // Mock subscription for onAuthStateChange
  const mockUnsubscribe = jest.fn();
  const mockSubscription = { unsubscribe: mockUnsubscribe };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: mockSubscription },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signUp', () => {
    it('successfully signs up a new user', async () => {
      const mockUser = createMockUser({ email: 'newuser@example.com' });
      const mockSession = createMockSession({ user: mockUser });

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signUp>>;
      await act(async () => {
        response = await result.current.signUp('newuser@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
      expect(response!.data.user).toEqual(mockUser);
      expect(response!.data.session).toEqual(mockSession);
      expect(response!.error).toBeNull();
    });

    it('returns data with null session when email confirmation is required', async () => {
      const mockUser = createMockUser({
        email: 'unverified@example.com',
        email_confirmed_at: undefined,
      });

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signUp>>;
      await act(async () => {
        response = await result.current.signUp('unverified@example.com', 'password123');
      });

      expect(response!.data.user).toEqual(mockUser);
      expect(response!.data.session).toBeNull();
      expect(response!.error).toBeNull();
    });

    it('handles sign up error - email already registered', async () => {
      const mockError = createMockAuthError('User already registered', 400);

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signUp>>;
      await act(async () => {
        response = await result.current.signUp('existing@example.com', 'password123');
      });

      expect(response!.error).toEqual(mockError);
      expect(response!.data.user).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error signing up:', 'User already registered');
    });

    it('handles sign up error - weak password', async () => {
      const mockError = createMockAuthError('Password is too weak', 422);

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signUp>>;
      await act(async () => {
        response = await result.current.signUp('user@example.com', 'weak');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error signing up:', 'Password is too weak');
    });

    it('handles network error during sign up', async () => {
      const mockError = createMockAuthError('Network error', 500);

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signUp>>;
      await act(async () => {
        response = await result.current.signUp('user@example.com', 'password123');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error signing up:', 'Network error');
    });
  });

  describe('signIn', () => {
    it('successfully signs in an existing user', async () => {
      const mockUser = createMockUser({ email: 'user@example.com' });
      const mockSession = createMockSession({ user: mockUser });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signIn>>;
      await act(async () => {
        response = await result.current.signIn('user@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(response!.data.user).toEqual(mockUser);
      expect(response!.data.session).toEqual(mockSession);
      expect(response!.error).toBeNull();
    });

    it('handles sign in error - invalid credentials', async () => {
      const mockError = createMockAuthError('Invalid login credentials', 400);

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signIn>>;
      await act(async () => {
        response = await result.current.signIn('user@example.com', 'wrongpassword');
      });

      expect(response!.error).toEqual(mockError);
      expect(response!.data.user).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error signing in:', 'Invalid login credentials');
    });

    it('handles sign in error - email not confirmed', async () => {
      const mockError = createMockAuthError('Email not confirmed', 400);

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signIn>>;
      await act(async () => {
        response = await result.current.signIn('unverified@example.com', 'password123');
      });

      expect(response!.error).toEqual(mockError);
      expect(response!.error?.message).toBe('Email not confirmed');
      expect(console.error).toHaveBeenCalledWith('Error signing in:', 'Email not confirmed');
    });

    it('handles sign in error - user not found', async () => {
      const mockError = createMockAuthError('User not found', 404);

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signIn>>;
      await act(async () => {
        response = await result.current.signIn('nonexistent@example.com', 'password123');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error signing in:', 'User not found');
    });

    it('handles network error during sign in', async () => {
      const mockError = createMockAuthError('Network request failed', 500);

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.signIn>>;
      await act(async () => {
        response = await result.current.signIn('user@example.com', 'password123');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error signing in:', 'Network request failed');
    });
  });

  describe('resendVerification', () => {
    it('successfully resends verification email', async () => {
      mockResend.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.resendVerification>>;
      await act(async () => {
        response = await result.current.resendVerification('user@example.com');
      });

      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'user@example.com',
      });
      expect(response!.error).toBeNull();
    });

    it('handles resend verification error - rate limited', async () => {
      const mockError = createMockAuthError('Rate limit exceeded', 429);

      mockResend.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.resendVerification>>;
      await act(async () => {
        response = await result.current.resendVerification('user@example.com');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith(
        'Error resending verification:',
        'Rate limit exceeded'
      );
    });

    it('handles resend verification error - user not found', async () => {
      const mockError = createMockAuthError('User not found', 404);

      mockResend.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.resendVerification>>;
      await act(async () => {
        response = await result.current.resendVerification('nonexistent@example.com');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error resending verification:', 'User not found');
    });

    it('handles network error during resend', async () => {
      const mockError = createMockAuthError('Network error', 500);

      mockResend.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: Awaited<ReturnType<typeof result.current.resendVerification>>;
      await act(async () => {
        response = await result.current.resendVerification('user@example.com');
      });

      expect(response!.error).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith('Error resending verification:', 'Network error');
    });
  });

  describe('useAuth hook', () => {
    it('provides auth context with all methods', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify all expected methods are available
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.resendVerification).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');

      // Verify initial state
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('updates auth state after successful sign in', async () => {
      const mockUser = createMockUser({ email: 'user@example.com' });
      const mockSession = createMockSession({ user: mockUser });

      // Capture the onAuthStateChange callback
      let authStateCallback: ((event: string, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockSubscription } };
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Sign in
      await act(async () => {
        await result.current.signIn('user@example.com', 'password123');
      });

      // Simulate Supabase triggering auth state change
      await act(async () => {
        authStateCallback?.('SIGNED_IN', mockSession);
      });

      // Verify state is updated
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
