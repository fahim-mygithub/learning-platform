/**
 * Button Component - Luminous Focus Design
 *
 * An accessible button component with:
 * - Minimum 44x44px touch target (WCAG 2.1 AAA compliance)
 * - Loading state with morph animation (rect -> circle)
 * - Animated press scale with spring physics
 * - Haptic feedback on press
 * - Premium glow effects with glass-morphism
 */

import React, { useMemo, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';
import { timing, spring, scale } from '../../theme/animations';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * Button variant types for styling
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'glow';

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
  /** Enable loading morph animation (default: true) */
  animateLoading?: boolean;
  /** Enable haptic feedback on press (default: true) */
  hapticOnPress?: boolean;
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
 * Loading morph circle size (height becomes width for circle)
 */
const LOADING_CIRCLE_SIZE = 56;

/**
 * Default glow color fallback
 */
const DEFAULT_GLOW_PRIMARY = 'rgba(99, 102, 241, 0.5)';

// Create animated Pressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Button Component
 *
 * A pressable button with accessibility features and animated loading state.
 * Features premium "Luminous Focus" design with glow effects and glass-morphism.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button onPress={handlePress}>Submit</Button>
 *
 * // With loading state (morph animation)
 * <Button loading={isSubmitting} onPress={handleSubmit}>
 *   Save Changes
 * </Button>
 *
 * // Glow variant for emphasis
 * <Button variant="glow" onPress={handleAction}>
 *   Start Learning
 * </Button>
 *
 * // Disable animations
 * <Button animateLoading={false} hapticOnPress={false} onPress={handleAction}>
 *   No Animations
 * </Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  animateLoading = true,
  hapticOnPress = true,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  testID,
  onPress,
  ...pressableProps
}: ButtonProps): React.ReactElement {
  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();
  const haptics = useHaptics();

  // Button is disabled when loading or explicitly disabled
  const isDisabled = loading || disabled;

  // Get size-specific styles
  const sizeStyles = getSizeStyles(size);

  // Get variant-specific styles
  const variantStyles = useMemo(
    () => getVariantStyles(variant, isDisabled, colors),
    [variant, isDisabled, colors]
  );

  // Animation shared values
  const pressedScale = useSharedValue(1);
  const loadingProgress = useSharedValue(loading ? 1 : 0);
  const textOpacity = useSharedValue(loading ? 0 : 1);
  const spinnerOpacity = useSharedValue(loading ? 1 : 0);

  // Handle loading state changes with animation
  useEffect(() => {
    if (animateLoading) {
      loadingProgress.value = withTiming(loading ? 1 : 0, {
        duration: timing.buttonMorph,
        easing: Easing.out(Easing.cubic),
      });
      textOpacity.value = withTiming(loading ? 0 : 1, {
        duration: timing.buttonMorph / 2,
        easing: Easing.out(Easing.ease),
      });
      spinnerOpacity.value = withTiming(loading ? 1 : 0, {
        duration: timing.buttonMorph / 2,
        easing: Easing.in(Easing.ease),
      });
    } else {
      loadingProgress.value = loading ? 1 : 0;
      textOpacity.value = loading ? 0 : 1;
      spinnerOpacity.value = loading ? 1 : 0;
    }
  }, [loading, animateLoading, loadingProgress, textOpacity, spinnerOpacity]);

  // Animated button container style (morph animation)
  const animatedButtonStyle = useAnimatedStyle(() => {
    // Morph from full width to circle when loading
    const borderRadius = interpolate(
      loadingProgress.value,
      [0, 1],
      [12, LOADING_CIRCLE_SIZE / 2] // 12px -> 28px (circle)
    );

    return {
      borderRadius,
      // Width animates from undefined (full) to fixed circle size
      ...(loadingProgress.value > 0
        ? {
            width: interpolate(
              loadingProgress.value,
              [0, 1],
              [300, LOADING_CIRCLE_SIZE] // Approximate full width to circle
            ),
            alignSelf: 'center' as const,
          }
        : {}),
    };
  });

  // Animated press scale style
  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  // Animated text opacity
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // Animated spinner opacity
  const animatedSpinnerStyle = useAnimatedStyle(() => ({
    opacity: spinnerOpacity.value,
  }));

  // Handle press in - scale down and haptic
  const handlePressIn = () => {
    if (isDisabled) return;

    // Haptic feedback
    if (hapticOnPress) {
      haptics.impact('light');
    }

    // Animated scale
    pressedScale.value = withSpring(scale.buttonPressed, spring.buttonPress);
  };

  // Handle press out - scale back
  const handlePressOut = () => {
    pressedScale.value = withSpring(1, spring.buttonPress);
  };

  return (
    <AnimatedPressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={[
        styles.button,
        sizeStyles.button,
        variantStyles.button,
        // Apply glow shadow for primary and glow variants
        (variant === 'primary' || variant === 'glow') &&
          !isDisabled &&
          variantStyles.glowShadow,
        animatedButtonStyle,
        animatedScaleStyle,
        style,
      ]}
      {...pressableProps}
    >
      <View style={styles.contentContainer}>
        {/* Text (fades out when loading) */}
        <Animated.Text
          style={[
            styles.text,
            sizeStyles.text,
            variantStyles.text,
            textStyle,
            animatedTextStyle,
            loading && styles.hiddenText,
          ]}
          numberOfLines={1}
        >
          {children}
        </Animated.Text>

        {/* Spinner (fades in when loading) */}
        {loading && (
          <Animated.View style={[styles.spinnerContainer, animatedSpinnerStyle]}>
            <ActivityIndicator
              testID={testID ? `${testID}-loading` : 'button-loading'}
              size="small"
              color={variantStyles.loadingColor}
              accessibilityLabel="Loading"
            />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
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
  disabled: boolean,
  colors: ColorTheme
): {
  button: ViewStyle;
  text: TextStyle;
  loadingColor: string;
  glowShadow?: ViewStyle;
} {
  const opacity = disabled ? 0.5 : 1;

  // Get glow color from theme or use default
  const glassColor = (colors as Record<string, unknown>).glass as string || 'rgba(39, 39, 42, 0.8)';
  const glassBorderColor = (colors as Record<string, unknown>).glassBorder as string || 'rgba(63, 63, 70, 0.5)';

  switch (variant) {
    case 'secondary':
      // Glass-morphism effect for secondary buttons
      return {
        button: {
          backgroundColor: glassColor,
          borderWidth: 1,
          borderColor: glassBorderColor,
          opacity,
        },
        text: {
          color: colors.text,
        },
        loadingColor: colors.text,
      };
    case 'outline':
      return {
        button: {
          backgroundColor: colors.transparent,
          borderWidth: 2,
          borderColor: colors.primary,
          opacity,
        },
        text: {
          color: colors.primary,
        },
        loadingColor: colors.primary,
      };
    case 'glow':
      // Intense glow variant for emphasis
      return {
        button: {
          backgroundColor: colors.primary,
          opacity,
        },
        text: {
          color: colors.white,
          fontWeight: '700',
        },
        loadingColor: colors.white,
        // Intense glow shadow
        glowShadow: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 16,
          elevation: 10,
        },
      };
    case 'primary':
    default:
      return {
        button: {
          backgroundColor: colors.primary,
          opacity,
        },
        text: {
          color: colors.white,
        },
        loadingColor: colors.white,
        // Subtle glow shadow
        glowShadow: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        },
      };
  }
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  hiddenText: {
    position: 'absolute',
    opacity: 0,
  },
  spinnerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
