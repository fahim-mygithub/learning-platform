/**
 * Input Component
 *
 * An accessible text input component that wraps React Native's TextInput.
 * Enforces minimum 44px touch target height for accessibility.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   value={email}
 *   onChangeText={setEmail}
 *   placeholder="Enter your email"
 *   keyboardType="email-address"
 * />
 *
 * <Input
 *   label="Password"
 *   value={password}
 *   onChangeText={setPassword}
 *   secureTextEntry
 *   error="Password is required"
 * />
 * ```
 */

import React, { forwardRef, useId } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

/**
 * Minimum touch target size for accessibility (WCAG 2.1 Success Criterion 2.5.5)
 */
const MIN_TOUCH_TARGET_HEIGHT = 44;

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
 * Accessible Input component
 *
 * Features:
 * - Minimum 44px touch target height for accessibility
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
    ...textInputProps
  },
  ref
) {
  // Generate unique ID for accessibility linking
  const inputId = useId();

  // Determine if input is in error state
  const hasError = Boolean(error);

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
      <TextInput
        ref={ref}
        style={[
          styles.input,
          hasError && styles.inputError,
          disabled && styles.inputDisabled,
          inputStyle,
        ]}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={hasError ? '#dc2626' : '#9ca3af'}
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
