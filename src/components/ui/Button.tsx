/**
 * Button Component
 *
 * An accessible button component with:
 * - Minimum 44x44px touch target (WCAG 2.1 AAA compliance)
 * - Loading state with ActivityIndicator
 * - Full accessibility support for screen readers
 * - Disabled state that prevents double-submission
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

/**
 * Button variant types for styling
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline';

/**
 * Button size types
 */
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Props for the Button component
 */
export interface ButtonProps extends Omit<PressableProps, 'style'> {
  /** Button text content */
  children: string;
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading indicator and disables the button */
  loading?: boolean;
  /** Disables the button */
  disabled?: boolean;
  /** Accessibility label for screen readers (defaults to children if not provided) */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Custom style for the button container */
  style?: StyleProp<ViewStyle>;
  /** Custom style for the button text */
  textStyle?: StyleProp<TextStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Button Component
 *
 * A pressable button with accessibility features and loading state support.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button onPress={handlePress}>Submit</Button>
 *
 * // With loading state
 * <Button loading={isSubmitting} onPress={handleSubmit}>
 *   Save Changes
 * </Button>
 *
 * // With accessibility label
 * <Button
 *   accessibilityLabel="Submit form"
 *   accessibilityHint="Double tap to submit your information"
 *   onPress={handleSubmit}
 * >
 *   Submit
 * </Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  testID,
  onPress,
  ...pressableProps
}: ButtonProps): React.ReactElement {
  // Button is disabled when loading or explicitly disabled
  const isDisabled = loading || disabled;

  // Get size-specific styles
  const sizeStyles = getSizeStyles(size);

  // Get variant-specific styles
  const variantStyles = getVariantStyles(variant, isDisabled);

  return (
    <Pressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={({ pressed }) => [
        styles.button,
        sizeStyles.button,
        variantStyles.button,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...pressableProps}
    >
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator
            testID={testID ? `${testID}-loading` : 'button-loading'}
            size="small"
            color={variantStyles.loadingColor}
            accessibilityLabel="Loading"
          />
        ) : (
          <Text
            style={[styles.text, sizeStyles.text, variantStyles.text, textStyle]}
            numberOfLines={1}
          >
            {children}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Get size-specific styles
 */
function getSizeStyles(size: ButtonSize): {
  button: ViewStyle;
  text: TextStyle;
} {
  switch (size) {
    case 'small':
      return {
        button: {
          minHeight: MIN_TOUCH_TARGET_SIZE,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        text: {
          fontSize: 14,
        },
      };
    case 'large':
      return {
        button: {
          minHeight: 56,
          paddingHorizontal: 24,
          paddingVertical: 16,
        },
        text: {
          fontSize: 18,
        },
      };
    case 'medium':
    default:
      return {
        button: {
          minHeight: MIN_TOUCH_TARGET_SIZE,
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        text: {
          fontSize: 16,
        },
      };
  }
}

/**
 * Get variant-specific styles
 */
function getVariantStyles(
  variant: ButtonVariant,
  disabled: boolean
): {
  button: ViewStyle;
  text: TextStyle;
  loadingColor: string;
} {
  const opacity = disabled ? 0.5 : 1;

  switch (variant) {
    case 'secondary':
      return {
        button: {
          backgroundColor: '#6B7280',
          opacity,
        },
        text: {
          color: '#FFFFFF',
        },
        loadingColor: '#FFFFFF',
      };
    case 'outline':
      return {
        button: {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#3B82F6',
          opacity,
        },
        text: {
          color: '#3B82F6',
        },
        loadingColor: '#3B82F6',
      };
    case 'primary':
    default:
      return {
        button: {
          backgroundColor: '#3B82F6',
          opacity,
        },
        text: {
          color: '#FFFFFF',
        },
        loadingColor: '#FFFFFF',
      };
  }
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});

export default Button;
