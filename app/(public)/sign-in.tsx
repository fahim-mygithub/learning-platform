/**
 * Sign In Screen - Luminous Focus Design
 *
 * Premium login form for existing users with:
 * - Branded header with app name and tagline
 * - Premium input fields with zinc-400 labels
 * - Glow variant primary button
 * - Show/hide password toggle
 * - Loading state and error handling
 * - Navigation to sign-up and forgot password
 * - Dev login for development environment
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
  Alert,
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
  // Get dynamic colors from typography context
  const { getColors, getFontFamily } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fontFamily = getFontFamily('semibold');
  const fontFamilyBold = getFontFamily('bold');

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
   * Signs in with real Supabase credentials from environment
   */
  const handleDevLogin = useCallback(async () => {
    if (devSignIn) {
      const success = await devSignIn();
      if (success) {
        // DEV ONLY - Navigate to authenticated area after successful dev sign in
        router.replace('/(auth)/(tabs)');
      } else {
        // Show error if dev login failed
        setErrors((prev) => ({
          ...prev,
          api: 'Dev login failed. Check console for details.',
        }));
      }
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
    console.log('[SIGN-IN DEBUG] Starting sign-in attempt...');

    try {
      const { error } = await signIn(email.trim(), password);
      console.log('[SIGN-IN DEBUG] Sign-in response received, error:', error?.message ?? 'none');

      if (error) {
        console.log('[SIGN-IN DEBUG] Error received:', error.message);

        // Check if this is an unverified email error and redirect (don't show error UI)
        if (isUnverifiedEmailError(error.message)) {
          console.log('[SIGN-IN DEBUG] Detected unverified email, redirecting...');
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
          return;
        }

        // Show other errors in UI
        console.log('[SIGN-IN DEBUG] Setting error in UI:', error.message);
        setErrors((prev) => ({ ...prev, api: error.message }));
        return;
      }

      console.log('[SIGN-IN DEBUG] Sign-in successful, navigating to authenticated area...');
      // Navigate to the authenticated area
      router.replace('/(auth)/(tabs)');
    } catch (e) {
      console.error('[SIGN-IN DEBUG] Unexpected error:', e);
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
          <Text style={styles.tagline}>Master anything, one concept at a time</Text>
        </Animated.View>

        {/* Welcome Header - Staggered entrance */}
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements)}
        >
          <Text style={[styles.title, { fontFamily }]}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
        </Animated.View>

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
            <Text style={styles.devLoginHint}>Signs in with dev credentials from .env</Text>
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
          </Animated.View>

          {/* Forgot Password Link - Staggered entrance */}
          <Animated.View entering={FadeInDown.duration(entrance.tertiary).delay(stagger.formElements * 4)}>
            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotPasswordContainer}
              accessibilityRole="button"
              testID="forgot-password-link"
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
              accessibilityLabel="Sign in"
              testID="submit-button"
            >
              Sign In
            </Button>
          </Animated.View>
        </View>

        {/* Sign Up Link - Final entrance */}
        <Animated.View
          style={styles.footer}
          entering={FadeInDown.duration(entrance.tertiary).delay(stagger.formElements * 6)}
        >
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/sign-up" asChild>
            <Pressable accessibilityRole="link" testID="sign-up-link">
              <Text style={styles.linkText}>Sign Up</Text>
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
      marginBottom: 40,
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
      marginBottom: 8,
    },
    tagline: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      letterSpacing: 0.2,
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
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: 8,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
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
    // DEV ONLY - Styles for dev login button
    devLoginContainer: {
      backgroundColor: `${colors.xp}15`,
      borderWidth: 2,
      borderColor: colors.xp,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      alignItems: 'center',
    },
    devLoginWarning: {
      color: colors.xp,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    devLoginButton: {
      backgroundColor: colors.xp,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      minWidth: 200,
      alignItems: 'center',
    },
    devLoginButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    devLoginHint: {
      color: colors.xp,
      fontSize: 12,
      marginTop: 10,
      fontStyle: 'italic',
      opacity: 0.8,
    },
  });
}
