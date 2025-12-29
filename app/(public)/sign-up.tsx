/**
 * Sign Up Screen
 *
 * Registration form for new users with:
 * - Email input with validation
 * - Password input with show/hide toggle
 * - Confirm password input with matching validation
 * - Submit button with loading state
 * - Navigation to sign-in screen
 * - Error handling and display
 */

import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/lib/auth-context';
import { validateEmail, validatePassword } from '@/src/lib/validation';

/**
 * Form field errors interface
 */
interface FormErrors {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  api: string | null;
}

/**
 * Initial form errors state
 */
const initialErrors: FormErrors = {
  email: null,
  password: null,
  confirmPassword: null,
  api: null,
};

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(initialErrors);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validate email on blur
   */
  const handleEmailBlur = useCallback(() => {
    const error = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: error, api: null }));
  }, [email]);

  /**
   * Validate password on blur
   */
  const handlePasswordBlur = useCallback(() => {
    const error = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: error, api: null }));
  }, [password]);

  /**
   * Validate confirm password on blur
   */
  const handleConfirmPasswordBlur = useCallback(() => {
    let error: string | null = null;
    if (confirmPassword.length === 0) {
      error = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      error = 'Passwords do not match';
    }
    setErrors((prev) => ({ ...prev, confirmPassword: error, api: null }));
  }, [confirmPassword, password]);

  /**
   * Toggle password visibility
   */
  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Toggle confirm password visibility
   */
  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  /**
   * Validate all form fields
   * @returns true if form is valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    let confirmPasswordError: string | null = null;
    if (confirmPassword.length === 0) {
      confirmPasswordError = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      confirmPasswordError = 'Passwords do not match';
    }

    setErrors({
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      api: null,
    });

    return !emailError && !passwordError && !confirmPasswordError;
  }, [email, password, confirmPassword]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Clear API error
    setErrors((prev) => ({ ...prev, api: null }));

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email.trim(), password);

      if (error) {
        setErrors((prev) => ({ ...prev, api: error.message }));
        return;
      }

      // Navigate to verify-email screen on success
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch {
      setErrors((prev) => ({
        ...prev,
        api: 'An unexpected error occurred. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signUp, router, validateForm]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="sign-up-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* API Error Display */}
        {errors.api && (
          <View style={styles.apiErrorContainer} testID="api-error">
            <Text style={styles.apiErrorText} accessibilityRole="alert">
              {errors.api}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Email Input */}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            onBlur={handleEmailBlur}
            error={errors.email ?? undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="Enter your email"
            accessibilityLabel="Email"
            testID="email-input"
          />

          {/* Password Input with Toggle */}
          <View style={styles.passwordContainer}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              onBlur={handlePasswordBlur}
              error={errors.password ?? undefined}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="Enter your password"
              accessibilityLabel="Password"
              testID="password-input"
            />
            <Pressable
              onPress={toggleShowPassword}
              style={styles.showPasswordButton}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              testID="toggle-password-visibility"
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          {/* Confirm Password Input with Toggle */}
          <View style={styles.passwordContainer}>
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={handleConfirmPasswordBlur}
              error={errors.confirmPassword ?? undefined}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              placeholder="Confirm your password"
              accessibilityLabel="Confirm Password"
              testID="confirm-password-input"
            />
            <Pressable
              onPress={toggleShowConfirmPassword}
              style={styles.showPasswordButton}
              accessibilityLabel={
                showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
              }
              accessibilityRole="button"
              testID="toggle-confirm-password-visibility"
            >
              <Text style={styles.showPasswordText}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              accessibilityLabel="Create account"
              testID="submit-button"
            >
              Create Account
            </Button>
          </View>
        </View>

        {/* Sign In Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="link" testID="sign-in-link">
              <Text style={styles.linkText}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  apiErrorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  apiErrorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 34,
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  showPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  linkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
