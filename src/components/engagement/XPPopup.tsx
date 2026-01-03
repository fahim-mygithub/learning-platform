/**
 * XPPopup Component
 *
 * Animated popup that displays XP earned with a BounceIn animation.
 * Triggers haptic feedback and auto-dismisses after a duration.
 *
 * @example
 * ```tsx
 * <XPPopup
 *   amount={25}
 *   visible={showXP}
 *   onComplete={() => setShowXP(false)}
 * />
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';
import { haptics } from '@/src/lib/haptic-feedback';

/**
 * Props for the XPPopup component
 */
export interface XPPopupProps {
  /** Amount of XP to display */
  amount: number;
  /** Whether the popup is visible */
  visible: boolean;
  /** Called when the popup animation completes */
  onComplete?: () => void;
  /** Reason for XP award (for display) */
  reason?: string;
  /** Position on screen */
  position?: 'center' | 'top' | 'bottom';
  /** Duration to show popup (ms) */
  duration?: number;
  /** Whether to trigger haptic feedback */
  enableHaptics?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Default display duration (ms) */
  defaultDuration: 1500,
  /** BounceIn spring config */
  bounceSpring: {
    damping: 8,
    stiffness: 150,
  },
  /** Fade out duration (ms) */
  fadeOutDuration: 300,
  /** Scale pulse configuration */
  pulseScale: 1.1,
};

/**
 * XPPopup Component
 *
 * Displays XP earned with satisfying animations and haptic feedback.
 */
export function XPPopup({
  amount,
  visible,
  onComplete,
  reason,
  position = 'center',
  duration = ANIMATION_CONFIG.defaultDuration,
  enableHaptics = true,
  testID = 'xp-popup',
}: XPPopupProps): React.ReactElement | null {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  /**
   * Handle animation complete
   */
  const handleAnimationComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  /**
   * Trigger animation when popup becomes visible
   */
  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      if (enableHaptics) {
        haptics.xpAward();
      }

      // Entrance animation
      scale.value = withSpring(1, ANIMATION_CONFIG.bounceSpring);
      opacity.value = withTiming(1, { duration: 200 });

      // Float up slightly
      translateY.value = withSequence(
        withTiming(-10, { duration: 200 }),
        withTiming(0, { duration: 200 })
      );

      // Pulse effect
      scale.value = withSequence(
        withSpring(1, ANIMATION_CONFIG.bounceSpring),
        withDelay(300, withSequence(
          withTiming(ANIMATION_CONFIG.pulseScale, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ))
      );

      // Auto dismiss
      const timeout = setTimeout(() => {
        // Exit animation
        opacity.value = withTiming(0, { duration: ANIMATION_CONFIG.fadeOutDuration });
        translateY.value = withTiming(-30, { duration: ANIMATION_CONFIG.fadeOutDuration }, () => {
          runOnJS(handleAnimationComplete)();
        });
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      scale.value = 0;
      opacity.value = 0;
      translateY.value = 0;
    }
  }, [visible, duration, enableHaptics, scale, opacity, translateY, handleAnimationComplete]);

  /**
   * Animated styles
   */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  /**
   * Get position styles
   */
  const getPositionStyle = (): ViewStyle => {
    switch (position) {
      case 'top':
        return styles.positionTop;
      case 'bottom':
        return styles.positionBottom;
      default:
        return styles.positionCenter;
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, getPositionStyle()]} pointerEvents="none">
      <Animated.View
        testID={testID}
        style={[styles.popup, animatedStyle]}
      >
        {/* Star icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.starIcon}>&#11088;</Text>
        </View>

        {/* XP amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.plusSign}>+</Text>
          <Text style={styles.amount} testID={`${testID}-amount`}>
            {amount}
          </Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>

        {/* Reason (optional) */}
        {reason && (
          <Text style={styles.reason} testID={`${testID}-reason`}>
            {reason}
          </Text>
        )}

        {/* Sparkle effects */}
        <SparkleEffects />
      </Animated.View>
    </View>
  );
}

/**
 * Sparkle effects around the popup
 */
function SparkleEffects(): React.ReactElement {
  const sparkles = [
    { top: -10, left: -15, delay: 0 },
    { top: -15, right: -10, delay: 100 },
    { bottom: -10, left: -10, delay: 200 },
    { bottom: -15, right: -15, delay: 150 },
  ];

  return (
    <>
      {sparkles.map((sparkle, index) => (
        <SparkleParticle
          key={index}
          style={sparkle}
          delay={sparkle.delay}
        />
      ))}
    </>
  );
}

/**
 * Individual sparkle particle
 */
interface SparkleParticleProps {
  style: ViewStyle & { delay?: number };
  delay: number;
}

function SparkleParticle({ style, delay }: SparkleParticleProps): React.ReactElement {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(0, { duration: 400 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(200, withTiming(0, { duration: 250 }))
      )
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const { delay: _, ...positionStyle } = style;

  return (
    <Animated.Text
      style={[
        styles.sparkle,
        positionStyle as ViewStyle,
        animatedStyle,
      ]}
    >
      &#10022;
    </Animated.Text>
  );
}

/**
 * XP Toast - a simpler notification-style XP indicator
 */
export interface XPToastProps {
  amount: number;
  visible: boolean;
  onComplete?: () => void;
  testID?: string;
}

export function XPToast({
  amount,
  visible,
  onComplete,
  testID = 'xp-toast',
}: XPToastProps): React.ReactElement | null {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });

      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(-100, { duration: 200 }, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        });
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [visible, translateY, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View testID={testID} style={[styles.toast, animatedStyle]}>
      <Text style={styles.toastIcon}>&#11088;</Text>
      <Text style={styles.toastText}>+{amount} XP</Text>
    </Animated.View>
  );
}

/**
 * XP Counter - animated counter that increments
 */
export interface XPCounterProps {
  currentXP: number;
  targetXP: number;
  duration?: number;
  testID?: string;
}

export function XPCounter({
  currentXP,
  targetXP,
  duration = 500,
  testID = 'xp-counter',
}: XPCounterProps): React.ReactElement {
  // Note: Animation is handled by passing targetXP directly.
  // For animated text counting, consider using react-native-reanimated's
  // useAnimatedProps with AnimatedTextInput or a custom AnimatedText component.

  return (
    <View testID={testID} style={styles.counterContainer}>
      <Text style={styles.counterIcon}>&#11088;</Text>
      <Text style={styles.counterValue}>{targetXP}</Text>
      <Text style={styles.counterLabel}>XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as ViewStyle,
  positionTop: {
    top: 100,
  } as ViewStyle,
  positionCenter: {
    top: 0,
    bottom: 0,
  } as ViewStyle,
  positionBottom: {
    bottom: 150,
  } as ViewStyle,
  popup: {
    backgroundColor: colors.xpGold,
    borderRadius: 24,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    alignItems: 'center',
    // Shadow
    shadowColor: colors.xpGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  } as ViewStyle,
  iconContainer: {
    marginBottom: spacing[1],
  } as ViewStyle,
  starIcon: {
    fontSize: 32,
  } as TextStyle,
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  } as ViewStyle,
  plusSign: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.black,
    marginRight: 2,
  } as TextStyle,
  amount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.black,
  } as TextStyle,
  xpLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginLeft: spacing[1],
    opacity: 0.8,
  } as TextStyle,
  reason: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    opacity: 0.7,
    marginTop: spacing[1],
  } as TextStyle,
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    color: colors.xpGold,
  } as TextStyle,
  // Toast styles
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.xpGold,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  toastIcon: {
    fontSize: 16,
    marginRight: spacing[2],
  } as TextStyle,
  toastText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  } as TextStyle,
  // Counter styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  counterIcon: {
    fontSize: 16,
    marginRight: spacing[1],
  } as TextStyle,
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.xpGold,
  } as TextStyle,
  counterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: 2,
  } as TextStyle,
});

export default XPPopup;
