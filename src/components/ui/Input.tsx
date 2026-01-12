/**
 * Input Component - Luminous Focus Design
 *
 * An accessible text input component that wraps React Native's TextInput.
 * Features:
 * - Minimum 44px touch target height for accessibility
 * - Animated border color on focus
 * - Error state with visual feedback
 * - Accessibility labels for screen readers
 */

import React, { forwardRef, useId, useMemo, useCallback } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';
import { timing } from '../../theme/animations';

/**
 * Minimum touch target size for accessibility (WCAG 2.1 Success Criterion 2.5.5)
 */
const MIN_TOUCH_TARGET_HEIGHT = 44;

// Create animated TextInput
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Props for the Input component
 */
export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input (not shown when error is present) */
  helperText?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom style for the container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom style for the input */
  inputStyle?: StyleProp<TextStyle>;
  /** Custom style for the label */
  labelStyle?: StyleProp<TextStyle>;
  /** Test ID for the container */
  testID?: string;
}

/**
 * Accessible Input component with animated focus state
 *
 * Features:
 * - Minimum 44px touch target height for accessibility
 * - Animated border color transition on focus
 * - Error state with visual feedback
 * - Accessibility labels for screen readers
 * - Support for label and helper text
 * - Disabled state
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    disabled = false,
    containerStyle,
    inputStyle,
    labelStyle,
    testID,
    accessibilityLabel,
    accessibilityHint,
    placeholder,
    onFocus,
    onBlur,
    ...textInputProps
  },
  ref
) {
  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Generate unique ID for accessibility linking
  const inputId = useId();

  // Determine if input is in error state
  const hasError = Boolean(error);

  // Focus animation shared value (0 = unfocused, 1 = focused)
  const focusProgress = useSharedValue(0);

  // Handle focus - animate border to primary color
  // Type assertion needed due to Reanimated's AnimatedTextInput having different event types
  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      focusProgress.value = withTiming(1, {
        duration: timing.inputFocus,
        easing: Easing.out(Easing.ease),
      });
      onFocus?.(e);
    },
    [focusProgress, onFocus]
  ) as TextInputProps['onFocus'];

  // Handle blur - animate border back to default
  // Type assertion needed due to Reanimated's AnimatedTextInput having different event types
  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      focusProgress.value = withTiming(0, {
        duration: timing.inputFocus,
        easing: Easing.in(Easing.ease),
      });
      onBlur?.(e);
    },
    [focusProgress, onBlur]
  ) as TextInputProps['onBlur'];

  // Animated border style
  const animatedBorderStyle = useAnimatedStyle(() => {
    // Don't animate if in error state - error always shows error color
    if (hasError) {
      return {
        borderColor: colors.error,
        borderWidth: 2,
      };
    }

    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.borderLight, colors.primary]
    );

    return {
      borderColor,
      borderWidth: focusProgress.value > 0.5 ? 2 : 1,
    };
  });

  // Build accessibility label from provided label or explicit accessibilityLabel
  const computedAccessibilityLabel =
    accessibilityLabel ?? label ?? placeholder ?? 'Text input';

  // Build accessibility hint including error state
  const computedAccessibilityHint = hasError
    ? `Error: ${error}${accessibilityHint ? `. ${accessibilityHint}` : ''}`
    : accessibilityHint;

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {label && (
        <Text
          style={[styles.label, labelStyle]}
          nativeID={`${inputId}-label`}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <AnimatedTextInput
        ref={ref}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
          inputStyle,
          animatedBorderStyle,
          // Static error style override for test compatibility
          hasError && { borderColor: colors.error, borderWidth: 2 },
        ]}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={hasError ? colors.error : colors.textTertiary}
        accessibilityLabel={computedAccessibilityLabel}
        accessibilityHint={computedAccessibilityHint}
        accessibilityState={{
          disabled,
        }}
        accessibilityLabelledBy={label ? `${inputId}-label` : undefined}
        aria-invalid={hasError}
        aria-describedby={
          hasError
            ? `${inputId}-error`
            : helperText
              ? `${inputId}-helper`
              : undefined
        }
        onFocus={handleFocus}
        onBlur={handleBlur}
        testID={testID ? `${testID}-input` : 'input'}
        {...textInputProps}
      />
      {hasError && (
        <Text
          style={styles.errorText}
          nativeID={`${inputId}-error`}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={testID ? `${testID}-error` : 'input-error'}
        >
          {error}
        </Text>
      )}
      {!hasError && helperText && (
        <Text
          style={styles.helperText}
          nativeID={`${inputId}-helper`}
          accessibilityRole="text"
          testID={testID ? `${testID}-helper` : 'input-helper'}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
});

/**
 * Create dynamic styles based on theme colors
 * Per Design OS auth spec:
 * - Input background: backgroundTertiary (zinc-800 in dark mode)
 * - Border: borderLight (zinc-700 in dark mode)
 * - Text: text (zinc-100 in dark mode)
 * - Label: textSecondary (zinc-400 in dark mode)
 */
function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      width: '100%',
      marginVertical: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      minHeight: MIN_TOUCH_TARGET_HEIGHT,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 8,
      backgroundColor: colors.backgroundTertiary,
      fontSize: 16,
      color: colors.text,
    },
    inputDisabled: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.textTertiary,
      opacity: 0.6,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 4,
    },
    helperText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
}
