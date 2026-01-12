/**
 * Sign Up Screen - Luminous Focus Design
 *
 * Registration form for new users with:
 * - Branded header with app name
 * - Premium input fields with zinc-400 labels
 * - Show/hide password toggle
 * - Confirm password input with matching validation
 * - Loading state and error handling
 * - Navigation to sign-in screen
 * - Dark background with clean, centered layout
 * - Staggered entrance animations
 */

import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, Link } from 'expo-router';

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/lib/auth-context';
import { useTypography } from '@/src/lib/typography-context';
import { validateEmail, validatePassword } from '@/src/lib/validation';
import { type ColorTheme } from '@/src/theme/colors';
import { entrance, stagger } from '@/src/theme/animations';

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
  // Get dynamic colors from typography context
  const { getColors, getFontFamily } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fontFamily = getFontFamily('semibold');
  const fontFamilyBold = getFontFamily('bold');

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
        showsVerticalScrollIndicator={false}
      >
        {/* App Branding - Logo entrance animation */}
        <Animated.View
          style={styles.branding}
          entering={FadeInDown.duration(entrance.primary).delay(0)}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={[styles.logoText, { fontFamily: fontFamilyBold }]}>L</Text>
            </View>
          </View>
          <Text style={[styles.appName, { fontFamily: fontFamilyBold }]}>LearnFlow</Text>
        </Animated.View>

        {/* Welcome Header - Staggered entrance */}
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements)}
        >
          <Text style={[styles.title, { fontFamily }]}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start your learning journey</Text>
        </Animated.View>

        {/* API Error Display */}
        {errors.api && (
          <View style={styles.apiErrorContainer} testID="api-error">
            <Text style={styles.apiErrorText} accessibilityRole="alert">
              {errors.api}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Email Input - Staggered entrance */}
          <Animated.View entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 2)}>
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
          </Animated.View>

          {/* Password Input with Toggle - Staggered entrance */}
          <Animated.View
            style={styles.passwordContainer}
            entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 3)}
          >
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
          </Animated.View>

          {/* Confirm Password Input with Toggle - Staggered entrance */}
          <Animated.View
            style={styles.passwordContainer}
            entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 4)}
          >
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
          </Animated.View>

          {/* Submit Button - Glow Variant - Final entrance */}
          <Animated.View
            style={styles.buttonContainer}
            entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 5)}
          >
            <Button
              variant="glow"
              size="large"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              accessibilityLabel="Create account"
              testID="submit-button"
            >
              Create Account
            </Button>
          </Animated.View>
        </View>

        {/* Sign In Link - Final entrance */}
        <Animated.View
          style={styles.footer}
          entering={FadeInDown.duration(entrance.tertiary).delay(stagger.formElements * 6)}
        >
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="link" testID="sign-in-link">
              <Text style={styles.linkText}>Sign In</Text>
            </Pressable>
          </Link>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Create dynamic styles based on theme colors
 * Luminous Focus Design:
 * - Background: zinc-950 (#09090b)
 * - Centered content with max-width 400px
 * - Labels in zinc-400
 * - Premium glow effects on primary actions
 */
function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    },
    branding: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoContainer: {
      marginBottom: 16,
    },
    logoIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      // Glow effect on logo
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 10,
    },
    logoText: {
      fontSize: 32,
      color: colors.white,
      fontWeight: '700',
    },
    appName: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    apiErrorContainer: {
      backgroundColor: `${colors.error}15`,
      borderWidth: 1,
      borderColor: `${colors.error}40`,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
    },
    apiErrorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
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
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonContainer: {
      marginTop: 24,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    footerText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    linkText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
