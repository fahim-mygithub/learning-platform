/**
 * Card Component - Luminous Focus Design
 *
 * A container component that provides a consistent card-style appearance
 * with padding, border radius, and elevation. Supports:
 * - Glass-morphism effect (semi-transparent with blur)
 * - Subtle luminous borders
 * - Optional press animation with scale
 * - Deep shadows that feel premium
 * - Elegant dark luxury aesthetic
 */

import React, { useMemo, type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  type ViewProps,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';
import { spring, scale } from '../../theme/animations';

/**
 * Card variant types for different visual styles
 * - default: Solid background (original styling)
 * - glass: Glass-morphism with semi-transparent background and blur
 * - elevated: Higher elevation with more prominent shadow
 * - glow: Subtle glowing border effect
 */
export type CardVariant = 'default' | 'glass' | 'elevated' | 'glow';

/**
 * Props for the Card component
 */
export interface CardProps extends ViewProps {
  /** Content to render inside the card */
  children: ReactNode;
  /** Optional custom styles to apply to the card container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing purposes */
  testID?: string;
  /**
   * Visual variant of the card
   * @default 'default'
   */
  variant?: CardVariant;
  /**
   * Optional press handler - when provided, card becomes pressable with scale animation
   */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * Accessibility label for the card when pressable
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint for the card when pressable
   */
  accessibilityHint?: string;
}

// Create animated View
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Card Component
 *
 * A styled container that wraps content with consistent padding,
 * border radius, and visual elevation. When onPress is provided,
 * includes animated press feedback.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Text>Card content goes here</Text>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * <Card
 *   variant="glass"
 *   onPress={() => handlePress()}
 *   accessibilityLabel="Project card"
 * >
 *   <Text>Pressable glass card with animation</Text>
 * </Card>
 * ```
 */
export function Card({
  children,
  style,
  testID = 'card',
  variant = 'default',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: CardProps): React.ReactElement {
  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Animation shared value for press scale
  const pressedScale = useSharedValue(1);

  // Animated style for scale
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  // Get variant-specific style
  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'glass':
        return styles.glass;
      case 'elevated':
        return styles.elevated;
      case 'glow':
        return styles.glow;
      default:
        return null;
    }
  }, [variant, styles]);

  // Handle press in - scale down
  const handlePressIn = () => {
    if (onPress) {
      pressedScale.value = withSpring(scale.cardPressed, spring.cardPress);
    }
  };

  // Handle press out - scale back
  const handlePressOut = () => {
    pressedScale.value = withSpring(1, spring.cardPress);
  };

  // If onPress is provided, wrap in animated Pressable
  if (onPress) {
    return (
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.container, variantStyle, animatedStyle, style]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  }

  // Non-pressable card
  return (
    <View
      testID={testID}
      style={[styles.container, variantStyle, style]}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...rest}
    >
      {children}
    </View>
  );
}

/**
 * Create dynamic styles based on theme colors
 *
 * "Luminous Focus" design system:
 * - Cards use backgroundTertiary (zinc-800 in dark mode)
 * - 16px border radius for modern feel
 * - Multiple variants for different visual effects
 *
 * Variants:
 * - default: Solid background with subtle shadow
 * - glass: Glass-morphism with blur and transparency
 * - elevated: Higher elevation with deeper shadows
 * - glow: Luminous border effect
 */
function createStyles(colors: ColorTheme) {
  // Type-safe access to glass/glow colors with fallbacks
  const colorsAny = colors as unknown as Record<string, string>;
  const glassColor = colorsAny.glass ?? colors.backgroundTertiary;
  const glassBorderColor = colorsAny.glassBorder ?? colors.border;
  const glowPrimaryColor = colorsAny.glowPrimary ?? colors.primary;

  return StyleSheet.create({
    // Base container style (default variant)
    container: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      // Premium shadow for iOS
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      // Elevation for Android
      elevation: 4,
    },

    // Glass-morphism variant
    glass: {
      backgroundColor: glassColor,
      borderColor: glassBorderColor,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },

    // Elevated variant
    elevated: {
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 12,
    },

    // Glow variant
    glow: {
      borderWidth: 1.5,
      borderColor: glowPrimaryColor,
      shadowColor: glowPrimaryColor,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    },
  });
}

export default Card;
