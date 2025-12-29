/**
 * Sign Up Screen Tests
 *
 * Tests for the sign-up screen including:
 * - Form rendering with all inputs
 * - Validation error display
 * - Successful submission and navigation
 * - API error display
 * - Password visibility toggle
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SignUpScreen from '../sign-up';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => {
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
const mockSignUp = jest.fn();
jest.mock('@/src/lib/auth-context', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signIn: jest.fn(),
    signOut: jest.fn(),
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });
  });

  describe('Form Rendering', () => {
    it('renders the sign-up form with all inputs', () => {
      render(<SignUpScreen />);

      // Check title and subtitle
      expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
      expect(screen.getByText('Sign up to get started')).toBeTruthy();

      // Check inputs exist
      expect(screen.getByTestId('email-input')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();
      expect(screen.getByTestId('confirm-password-input')).toBeTruthy();

      // Check submit button
      expect(screen.getByTestId('submit-button')).toBeTruthy();

      // Check sign in link
      expect(screen.getByText('Already have an account?')).toBeTruthy();
      expect(screen.getByTestId('sign-in-link')).toBeTruthy();
    });

    it('renders password visibility toggles', () => {
      render(<SignUpScreen />);

      expect(screen.getByTestId('toggle-password-visibility')).toBeTruthy();
      expect(screen.getByTestId('toggle-confirm-password-visibility')).toBeTruthy();
    });

    it('initially hides passwords', () => {
      render(<SignUpScreen />);

      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');

      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility when show/hide is pressed', () => {
      render(<SignUpScreen />);

      const passwordInput = screen.getByTestId('password-input-input');
      const toggleButton = screen.getByTestId('toggle-password-visibility');

      // Initially hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(screen.getAllByText('Show').length).toBeGreaterThan(0);

      // Click to show
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(false);

      // Click to hide again
      fireEvent.press(toggleButton);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('toggles confirm password visibility independently', () => {
      render(<SignUpScreen />);

      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const toggleButton = screen.getByTestId('toggle-confirm-password-visibility');

      // Initially hidden
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

      // Click to show
      fireEvent.press(toggleButton);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
    });
  });

  describe('Validation Errors', () => {
    it('shows email validation error on blur with invalid email', async () => {
      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('shows email required error on blur with empty email', async () => {
      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');

      fireEvent.changeText(emailInput, '');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeTruthy();
      });
    });

    it('shows password validation error on blur with short password', async () => {
      render(<SignUpScreen />);

      const passwordInput = screen.getByTestId('password-input-input');

      fireEvent.changeText(passwordInput, 'short1');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('shows password required error on blur with empty password', async () => {
      render(<SignUpScreen />);

      const passwordInput = screen.getByTestId('password-input-input');

      fireEvent.changeText(passwordInput, '');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeTruthy();
      });
    });

    it('shows confirm password required error on blur with empty confirm password', async () => {
      render(<SignUpScreen />);

      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');

      fireEvent.changeText(confirmPasswordInput, '');
      fireEvent(confirmPasswordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Please confirm your password')).toBeTruthy();
      });
    });

    it('shows passwords do not match error on blur', async () => {
      render(<SignUpScreen />);

      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'differentpassword123');
      fireEvent(confirmPasswordInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeTruthy();
      });
    });

    it('shows all validation errors on submit with empty form', async () => {
      render(<SignUpScreen />);

      const submitButton = screen.getByTestId('submit-button');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('Password is required')).toBeTruthy();
        expect(screen.getByText('Please confirm your password')).toBeTruthy();
      });

      // Should not call signUp
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows password mismatch error on submit when passwords differ', async () => {
      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'different123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeTruthy();
      });

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('Successful Submission', () => {
    it('calls signUp with correct credentials and navigates on success', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/verify-email?email=test%40example.com');
      });
    });

    it('trims email before submission', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows loading state during submission', async () => {
      // Create a promise that we can control
      let resolveSignUp: (value: unknown) => void;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });
      mockSignUp.mockReturnValue(signUpPromise);

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      fireEvent.press(submitButton);

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId('submit-button-loading')).toBeTruthy();
      });

      // Resolve the promise to complete the submission
      resolveSignUp!({ data: { user: {}, session: null }, error: null });

      // After completion, should navigate (loading state ends)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });

  describe('API Error Display', () => {
    it('displays API error when signUp fails', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
        expect(screen.getByText('User already registered')).toBeTruthy();
      });

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('displays generic error when signUp throws exception', async () => {
      mockSignUp.mockRejectedValue(new Error('Network error'));

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
      });
    });

    it('clears API error when form is resubmitted', async () => {
      mockSignUp
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        })
        .mockResolvedValueOnce({
          data: { user: {}, session: null },
          error: null,
        });

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      // First submission with error
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('api-error')).toBeTruthy();
      });

      // Change email and resubmit
      fireEvent.changeText(emailInput, 'different@example.com');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId('api-error')).toBeNull();
      });
    });

    it('clears API error when field is blurred', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      render(<SignUpScreen />);

      const emailInput = screen.getByTestId('email-input-input');
      const passwordInput = screen.getByTestId('password-input-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
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

  describe('Navigation', () => {
    it('sign in link is rendered and accessible', () => {
      render(<SignUpScreen />);

      const signInLink = screen.getByTestId('sign-in-link');
      expect(signInLink).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
    });
  });
});
