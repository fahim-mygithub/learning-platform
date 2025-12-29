/**
 * Verify Email Screen
 *
 * Displayed after sign-up or when an unverified user tries to sign in:
 * - Shows email address passed via route params
 * - "Check your email" messaging with icon
 * - Resend verification button with 60-second cooldown
 * - Countdown timer during cooldown
 * - Success/error feedback after resend
 * - Back to sign-in link
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';

import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/lib/auth-context';

/**
 * Cooldown duration in seconds
 */
const COOLDOWN_DURATION = 60;

/**
 * Feedback state interface
 */
interface FeedbackState {
  type: 'success' | 'error' | null;
  message: string | null;
}

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { resendVerification } = useAuth();

  // State for resend functionality
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>({
    type: null,
    message: null,
  });

  // Ref to prevent rapid button presses
  const isResendingRef = useRef(false);

  /**
   * Handle cooldown timer countdown
   */
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [cooldownSeconds]);

  /**
   * Handle resend verification email
   */
  const handleResend = useCallback(async () => {
    // Use ref for synchronous guard against rapid presses
    if (!email || cooldownSeconds > 0 || isResendingRef.current) {
      return;
    }

    isResendingRef.current = true;
    setIsResending(true);
    setFeedback({ type: null, message: null });

    try {
      const { error } = await resendVerification(email);

      if (error) {
        setFeedback({
          type: 'error',
          message: error.message || 'Failed to resend verification email',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Verification email sent successfully!',
        });
        // Start cooldown after successful send
        setCooldownSeconds(COOLDOWN_DURATION);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      isResendingRef.current = false;
      setIsResending(false);
    }
  }, [email, cooldownSeconds, resendVerification]);

  /**
   * Determine if resend button should be disabled
   */
  const isResendDisabled = isResending || cooldownSeconds > 0;

  /**
   * Get resend button text based on state
   */
  const getResendButtonText = (): string => {
    if (isResending) {
      return 'Resend Verification Email';
    }
    if (cooldownSeconds > 0) {
      return `Resend available in ${cooldownSeconds}s`;
    }
    return 'Resend Verification Email';
  };

  return (
    <View style={styles.container} testID="verify-email-screen">
      <View style={styles.content}>
        {/* Mail Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon} accessibilityLabel="Email icon">
            ✉
          </Text>
        </View>

        {/* Header */}
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to
        </Text>
        <Text style={styles.email} testID="email-display">
          {email || 'your email address'}
        </Text>

        {/* Instructions */}
        <Text style={styles.instructions}>
          Click the link in the email to verify your account. If you don't see
          it, check your spam folder.
        </Text>

        {/* Feedback Message */}
        {feedback.type && (
          <View
            style={[
              styles.feedbackContainer,
              feedback.type === 'success'
                ? styles.successContainer
                : styles.errorContainer,
            ]}
            testID={`${feedback.type}-feedback`}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.type === 'success'
                  ? styles.successText
                  : styles.errorText,
              ]}
              accessibilityRole="alert"
            >
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Resend Button */}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleResend}
            loading={isResending}
            disabled={isResendDisabled}
            variant="outline"
            accessibilityLabel={
              cooldownSeconds > 0
                ? `Resend verification email. Available in ${cooldownSeconds} seconds`
                : 'Resend verification email'
            }
            testID="resend-button"
          >
            {getResendButtonText()}
          </Button>
        </View>

        {/* Back to Sign In Link */}
        <View style={styles.footer}>
          <Link href="/sign-in" asChild>
            <Pressable
              accessibilityRole="link"
              testID="back-to-sign-in-link"
              style={styles.backLink}
            >
              <Text style={styles.linkText}>Back to Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  feedbackContainer: {
    width: '100%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  feedbackText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#15803d',
  },
  errorText: {
    color: '#dc2626',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  footer: {
    alignItems: 'center',
  },
  backLink: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
