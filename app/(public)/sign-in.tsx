/**
 * Sign In Screen
 *
 * Login form for existing users with:
 * - Email input with validation
 * - Password input with show/hide toggle
 * - Submit button with loading state
 * - Navigation to sign-up screen
 * - Forgot password link (placeholder)
 * - Error handling including unverified email redirect
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
  Alert,
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
  api: string | null;
}

/**
 * Initial form errors state
 */
const initialErrors: FormErrors = {
  email: null,
  password: null,
  api: null,
};

export default function SignInScreen() {
  const router = useRouter();
  // DEV ONLY - Get dev auth methods from context
  const { signIn, devSignIn, isDevEnvironment } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
   * Toggle password visibility
   */
  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  /**
   * Validate all form fields
   * @returns true if form is valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({
      email: emailError,
      password: passwordError,
      api: null,
    });

    return !emailError && !passwordError;
  }, [email, password]);

  /**
   * Check if error indicates unverified email
   */
  const isUnverifiedEmailError = useCallback((errorMessage: string): boolean => {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      lowerMessage.includes('not confirmed') ||
      lowerMessage.includes('email not confirmed') ||
      lowerMessage.includes('email not verified')
    );
  }, []);

  /**
   * Handle forgot password press
   */
  const handleForgotPassword = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Password reset functionality will be available in a future update.',
      [{ text: 'OK' }]
    );
  }, []);

  /**
   * DEV ONLY - Handle dev login button press
   * Bypasses authentication for testing purposes
   */
  const handleDevLogin = useCallback(() => {
    if (devSignIn) {
      devSignIn();
      // DEV ONLY - Navigate to authenticated area after dev sign in
      router.replace('/(auth)/(tabs)');
    }
  }, [devSignIn, router]);

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
      const { error } = await signIn(email.trim(), password);

      if (error) {
        // Check if this is an unverified email error
        if (isUnverifiedEmailError(error.message)) {
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }

        setErrors((prev) => ({ ...prev, api: error.message }));
        return;
      }

      // Success: Auth state change will trigger auto-redirect via layout
      // No manual navigation needed
    } catch {
      setErrors((prev) => ({
        ...prev,
        api: 'An unexpected error occurred. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn, router, validateForm, isUnverifiedEmailError]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="sign-in-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* DEV ONLY - Dev Login Button */}
        {isDevEnvironment && devSignIn && (
          <View style={styles.devLoginContainer} testID="dev-login-container">
            <Text style={styles.devLoginWarning}>DEV ONLY - REMOVE BEFORE PRODUCTION</Text>
            <Pressable
              onPress={handleDevLogin}
              style={styles.devLoginButton}
              accessibilityLabel="Dev Login - Bypass Authentication"
              accessibilityRole="button"
              testID="dev-login-button"
            >
              <Text style={styles.devLoginButtonText}>Dev Login (Bypass Auth)</Text>
            </Pressable>
            <Text style={styles.devLoginHint}>Signs in as dev@localhost.test</Text>
          </View>
        )}

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
              autoComplete="password"
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

          {/* Forgot Password Link */}
          <Pressable
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
            accessibilityRole="button"
            testID="forgot-password-link"
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              accessibilityLabel="Sign in"
              testID="submit-button"
            >
              Sign In
            </Button>
          </View>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/sign-up" asChild>
            <Pressable accessibilityRole="link" testID="sign-up-link">
              <Text style={styles.linkText}>Sign Up</Text>
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
    padding: 4,
  },
  forgotPasswordText: {
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
  // DEV ONLY - Styles for dev login button
  devLoginContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  devLoginWarning: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  devLoginButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  devLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devLoginHint: {
    color: '#92400e',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
