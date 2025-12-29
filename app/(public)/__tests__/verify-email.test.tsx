/**
 * Verify Email Screen Tests
 *
 * Tests for the verify-email screen including:
 * - Screen displays email from params
 * - Resend button works
 * - Cooldown prevents spam
 * - Back to sign-in navigation
 * - Success/error feedback display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import VerifyEmailScreen from '../verify-email';

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: { email?: string } = { email: 'test@example.com' };

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: mockBack,
    }),
    useLocalSearchParams: () => mockSearchParams,
    Link: ({ children, asChild }: { children: React.ReactNode; href: string; asChild?: boolean }) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children);
      }
      return children;
    },
  };
});

// Mock auth context
const mockResendVerification = jest.fn();
jest.mock('@/src/lib/auth-context', () => ({
  useAuth: () => ({
    resendVerification: mockResendVerification,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    user: null,
    session: null,
    isLoading: false,
    isAuthenticated: false,
  }),
}));

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearchParams = { email: 'test@example.com' };
    mockResendVerification.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Screen Rendering', () => {
    it('renders the verify email screen with correct content', () => {
      render(<VerifyEmailScreen />);

      // Check main elements
      expect(screen.getByTestId('verify-email-screen')).toBeTruthy();
      expect(screen.getByText('Check your email')).toBeTruthy();
      expect(screen.getByText('We sent a verification link to')).toBeTruthy();
    });

    it('displays the email address from route params', () => {
      render(<VerifyEmailScreen />);

      const emailDisplay = screen.getByTestId('email-display');
      expect(emailDisplay).toBeTruthy();
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('displays fallback text when email is not provided', () => {
      mockSearchParams = {};
      render(<VerifyEmailScreen />);

      expect(screen.getByText('your email address')).toBeTruthy();
    });

    it('renders resend button', () => {
      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');
      expect(resendButton).toBeTruthy();
      expect(screen.getByText('Resend Verification Email')).toBeTruthy();
    });

    it('renders back to sign in link', () => {
      render(<VerifyEmailScreen />);

      const backLink = screen.getByTestId('back-to-sign-in-link');
      expect(backLink).toBeTruthy();
      expect(screen.getByText('Back to Sign In')).toBeTruthy();
    });

    it('renders email icon', () => {
      render(<VerifyEmailScreen />);

      expect(screen.getByLabelText('Email icon')).toBeTruthy();
    });

    it('renders instructions text', () => {
      render(<VerifyEmailScreen />);

      expect(
        screen.getByText(/Click the link in the email to verify your account/)
      ).toBeTruthy();
    });
  });

  describe('Resend Button Functionality', () => {
    it('calls resendVerification when resend button is pressed', async () => {
      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(mockResendVerification).toHaveBeenCalledWith('test@example.com');
    });

    it('shows loading state during resend', async () => {
      // Create a promise that we can control
      let resolveResend: (value: unknown) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });
      mockResendVerification.mockReturnValue(resendPromise);

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId('resend-button-loading')).toBeTruthy();
      });

      // Resolve the promise
      await act(async () => {
        resolveResend!({ error: null });
      });
    });

    it('shows success feedback after successful resend', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-feedback')).toBeTruthy();
        expect(screen.getByText('Verification email sent successfully!')).toBeTruthy();
      });
    });

    it('shows error feedback when resend fails', async () => {
      mockResendVerification.mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-feedback')).toBeTruthy();
        expect(screen.getByText('Rate limit exceeded')).toBeTruthy();
      });
    });

    it('shows generic error when resend throws exception', async () => {
      mockResendVerification.mockRejectedValue(new Error('Network error'));

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-feedback')).toBeTruthy();
        expect(
          screen.getByText('An unexpected error occurred. Please try again.')
        ).toBeTruthy();
      });
    });

    it('does not call resendVerification when email is not provided', async () => {
      mockSearchParams = {};
      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(mockResendVerification).not.toHaveBeenCalled();
    });
  });

  describe('Cooldown Functionality', () => {
    it('starts 60 second cooldown after successful resend', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend available in 60s')).toBeTruthy();
      });
    });

    it('countdown timer decrements every second', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend available in 60s')).toBeTruthy();
      });

      // Advance timer by 1 second
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend available in 59s')).toBeTruthy();
      });

      // Advance timer by another 5 seconds
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend available in 54s')).toBeTruthy();
      });
    });

    it('re-enables resend button after cooldown expires', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend available in 60s')).toBeTruthy();
      });

      // Advance timer to complete cooldown
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(screen.getByText('Resend Verification Email')).toBeTruthy();
      });
    });

    it('prevents resend during cooldown', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      // First press - should work
      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(mockResendVerification).toHaveBeenCalledTimes(1);
      });

      // Second press during cooldown - should not call resendVerification
      await act(async () => {
        fireEvent.press(resendButton);
      });

      expect(mockResendVerification).toHaveBeenCalledTimes(1);
    });

    it('does not start cooldown on resend failure', async () => {
      mockResendVerification.mockResolvedValue({
        error: { message: 'Failed to send' },
      });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-feedback')).toBeTruthy();
      });

      // Button should still show normal text (no cooldown)
      expect(screen.getByText('Resend Verification Email')).toBeTruthy();
    });

    it('allows resend after cooldown completes', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      // First resend
      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(mockResendVerification).toHaveBeenCalledTimes(1);
      });

      // Complete cooldown
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Second resend should work
      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(mockResendVerification).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Navigation', () => {
    it('back to sign in link is rendered and accessible', () => {
      render(<VerifyEmailScreen />);

      const backLink = screen.getByTestId('back-to-sign-in-link');
      expect(backLink).toBeTruthy();
      expect(backLink.props.accessibilityRole).toBe('link');
    });
  });

  describe('Accessibility', () => {
    it('has appropriate accessibility labels', () => {
      render(<VerifyEmailScreen />);

      // Check resend button accessibility
      const resendButton = screen.getByTestId('resend-button');
      expect(resendButton.props.accessibilityLabel).toBe('Resend verification email');
    });

    it('updates accessibility label during cooldown', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        const updatedButton = screen.getByTestId('resend-button');
        expect(updatedButton.props.accessibilityLabel).toContain('Available in');
      });
    });

    it('feedback messages have alert role', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        const feedbackText = screen.getByText('Verification email sent successfully!');
        expect(feedbackText.props.accessibilityRole).toBe('alert');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid button presses during loading', async () => {
      let resolveResend: (value: unknown) => void;
      const resendPromise = new Promise((resolve) => {
        resolveResend = resolve;
      });
      mockResendVerification.mockReturnValue(resendPromise);

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      // Press multiple times rapidly
      await act(async () => {
        fireEvent.press(resendButton);
        fireEvent.press(resendButton);
        fireEvent.press(resendButton);
      });

      // Should only call once
      expect(mockResendVerification).toHaveBeenCalledTimes(1);

      // Resolve
      await act(async () => {
        resolveResend!({ error: null });
      });
    });

    it('clears feedback when resending again after cooldown', async () => {
      mockResendVerification.mockResolvedValue({ error: null });

      render(<VerifyEmailScreen />);

      const resendButton = screen.getByTestId('resend-button');

      // First resend
      await act(async () => {
        fireEvent.press(resendButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-feedback')).toBeTruthy();
      });

      // Complete cooldown
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Second resend - feedback should be cleared first
      await act(async () => {
        fireEvent.press(resendButton);
      });

      // New success feedback appears
      await waitFor(() => {
        expect(screen.getByTestId('success-feedback')).toBeTruthy();
      });
    });
  });
});
