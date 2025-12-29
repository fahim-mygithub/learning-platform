/**
 * Sign In Screen Tests
 *
 * Tests for the sign-in screen including:
 * - Form rendering with all inputs
 * - Validation error display
 * - Successful submission
 * - API error display (invalid credentials)
 * - Unverified email error handling
 * - Password visibility toggle
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SignInScreen from '../sign-in';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    }),
    Link: ({ children, asChild }: { children: React.ReactNode; href: string; asChild?: boolean }) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children);
      }
      return children;
    },
  };
});

// Mock auth context
const mockSignIn = jest.fn();
jest.mock('@/src/lib/auth-context', () => ({
  useAuth: () => ({
    signUp: jest.fn(),
    signIn: mockSignIn,
    signOut: jest.fn(),
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ data: { user: {}, session: {} }, error: null });
  });

  describe('Form Rendering', () => {
    it('renders the sign-in form with all inputs', () => {
      render(<SignInScreen />);

      // Check title and subtitle
      expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
      expect(screen.getByText('Welcome Back')).toBeTruthy();
      expect(screen.getByText('Sign in to continue')).toBeTruthy();

      // Check inputs exist
      expect(screen.getByTestId('email-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();

      // Check submit button
      expect(screen.getByTestId('submit-button')).toBeTruthy();

      // Check sign up link
      expect(screen.getByText("Don't have an account?")).toBeTruthy();
      expect(screen.getByTestId('sign-up-link')).toBeTruthy();

      // Check forgot password link
      expect(screen.getByTestId('forgot-password-link')).toBeTruthy();
      expect(screen.getByText('Forgot password?')).toBeTruthy();
    });

    it('renders password visibility toggle', () => {
      render(<SignInScreen />);

      expect(screen.getByTestId('toggle-password-visibility')).toBeTruthy();
    });

    it('initially hides password', () => {
      render(<SignInScreen />);

      const passwordInput = screen.getByTestId('password-input-input');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility when show/hide is pressed', () => {
      render(<SignInScreen />);

      const passwordInput = screen.getByTestId('password-input-input');
      const toggleButton = screen.getByTestId('toggle-password-visibility');

      // Initially hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(screen.getByText('Show')).toBeTruthy();

      // Click to show
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);
      expect(screen.getByText('Hide')).toBeTruthy();

      // Click to hide again
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(screen.getByText('Show')).toBeTruthy();
    });
  });

  describe('Validation Errors', () => {
    it('shows email validation error on blur with invalid email', async () => {
      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('shows email required error on blur with empty email', async () => {
      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');

      fireEvent.changeText(emailInput, '');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeTruthy();
      });
    });

    it('shows password validation error on blur with short password', async () => {
      render(<SignInScreen />);

      const passwordInput = screen.getByTestId('password-input-input');

      fireEvent.changeText(passwordInput, 'short1');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('shows password required error on blur with empty password', async () => {
      render(<SignInScreen />);

      const passwordInput = screen.getByTestId('password-input-input');

      fireEvent.changeText(passwordInput, '');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeTruthy();
      });
    });

    it('shows all validation errors on submit with empty form', async () => {
      render(<SignInScreen />);

      const submitButton = screen.getByTestId('submit-button');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('Password is required')).toBeTruthy();
      });

      // Should not call signIn
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });

  describe('Successful Submission', () => {
    it('calls signIn with correct credentials on success', async () => {
      mockSignIn.mockResolvedValue({ data: { user: {}, session: {} }, error: null });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Should NOT navigate manually - auth state change handles it
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('trims email before submission', async () => {
      mockSignIn.mockResolvedValue({ data: { user: {}, session: {} }, error: null });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows loading state during submission', async () => {
      // Create a promise that we can control
      let resolveSignIn: (value: unknown) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId('submit-button-loading')).toBeTruthy();
      });

      // Resolve the promise to complete the submission
      resolveSignIn!({ data: { user: {}, session: {} }, error: null });

      // After completion, verify signIn was called (loading state will have ended)
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('API Error Display', () => {
    it('displays API error when signIn fails with invalid credentials', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword1');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
        expect(screen.getByText('Invalid login credentials')).toBeTruthy();
      });

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('displays generic error when signIn throws exception', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'));

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
      });
    });

    it('clears API error when form is resubmitted', async () => {
      mockSignIn
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        })
        .mockResolvedValueOnce({
          data: { user: {}, session: {} },
          error: null,
        });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      // First submission with error
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword1');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
      });

      // Change password and resubmit
      fireEvent.changeText(passwordInput, 'correctpassword1');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId('api-error')).toBeNull();
      });
    });

    it('clears API error when field is blurred', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
      });

      // Blur email input to trigger validation
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.queryByTestId('api-error')).toBeNull();
      });
    });
  });

  describe('Unverified Email Handling', () => {
    it('navigates to verify-email when email is not confirmed', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'unverified@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/verify-email?email=unverified%40example.com');
      });

      // Should NOT display API error for unverified email
      expect(screen.queryByTestId('api-error')).toBeNull();
    });

    it('navigates to verify-email when user is not confirmed (alternative message)', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User is not confirmed' },
      });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/verify-email?email=test%40example.com');
      });
    });

    it('handles email not verified error message', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not verified' },
      });

      render(<SignInScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/verify-email?email=test%40example.com');
      });
    });
  });

  describe('Forgot Password', () => {
    it('shows alert when forgot password is pressed', () => {
      render(<SignInScreen />);

      const forgotPasswordLink = screen.getByTestId('forgot-password-link');

      fireEvent.press(forgotPasswordLink);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Coming Soon',
        'Password reset functionality will be available in a future update.',
        [{ text: 'OK' }]
      );
    });
  });

  describe('Navigation', () => {
    it('sign up link is rendered and accessible', () => {
      render(<SignInScreen />);

      const signUpLink = screen.getByTestId('sign-up-link');
      expect(signUpLink).toBeTruthy();
      expect(screen.getByText('Sign Up')).toBeTruthy();
    });
  });
});
