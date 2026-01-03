/**
 * StreakDisplay Component
 *
 * Displays the user's current learning streak with a flame icon.
 * Animates when streak increases and shows different states
 * based on streak health.
 *
 * @example
 * ```tsx
 * <StreakDisplay
 *   currentStreak={7}
 *   isActive={true}
 *   onIncrement={() => playAnimation()}
 * />
 * ```
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';

/**
 * Props for the StreakDisplay component
 */
export interface StreakDisplayProps {
  /** Current streak count */
  currentStreak: number;
  /** Longest streak achieved */
  longestStreak?: number;
  /** Whether the streak is active (not expired) */
  isActive?: boolean;
  /** Whether the streak is at risk of expiring */
  isAtRisk?: boolean;
  /** Called when display is tapped */
  onPress?: () => void;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the label */
  showLabel?: boolean;
  /** Custom styles for the container */
  style?: ViewStyle;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Size configurations
 */
const SIZES = {
  small: {
    containerSize: 48,
    iconSize: 20,
    fontSize: 14,
  },
  medium: {
    containerSize: 64,
    iconSize: 28,
    fontSize: 18,
  },
  large: {
    containerSize: 80,
    iconSize: 36,
    fontSize: 24,
  },
};

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Spring configuration for bounce */
  springConfig: {
    damping: 10,
    stiffness: 200,
  },
  /** Pulse animation duration */
  pulseDuration: 1000,
  /** Flame flicker duration */
  flickerDuration: 150,
};

/**
 * StreakDisplay Component
 *
 * Animated streak counter with flame icon and visual feedback.
 */
export function StreakDisplay({
  currentStreak,
  longestStreak,
  isActive = true,
  isAtRisk = false,
  onPress,
  size = 'medium',
  showLabel = true,
  style,
  testID = 'streak-display',
}: StreakDisplayProps): React.ReactElement {
  const previousStreak = useRef(currentStreak);
  const scale = useSharedValue(1);
  const flameScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  /**
   * Get size configuration
   */
  const sizeConfig = SIZES[size];

  /**
   * Animate when streak increases
   */
  useEffect(() => {
    if (currentStreak > previousStreak.current) {
      // Bounce animation
      scale.value = withSequence(
        withSpring(1.2, ANIMATION_CONFIG.springConfig),
        withSpring(1, ANIMATION_CONFIG.springConfig)
      );

      // Flame pulse
      flameScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      // Glow effect
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(300, withTiming(0, { duration: 300 }))
      );
    }
    previousStreak.current = currentStreak;
  }, [currentStreak, scale, flameScale, glowOpacity]);

  /**
   * Continuous flame flicker animation when active
   */
  useEffect(() => {
    if (isActive && currentStreak > 0) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: ANIMATION_CONFIG.flickerDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: ANIMATION_CONFIG.flickerDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: ANIMATION_CONFIG.flickerDuration, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite repeat
        false // Don't reverse
      );
    } else {
      flameScale.value = withTiming(1);
    }
  }, [isActive, currentStreak, flameScale]);

  /**
   * Animated styles
   */
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  /**
   * Get container background color based on state
   */
  const getContainerStyle = (): ViewStyle => {
    if (!isActive || currentStreak === 0) {
      return styles.containerInactive;
    }
    if (isAtRisk) {
      return styles.containerAtRisk;
    }
    return styles.containerActive;
  };

  /**
   * Get flame color based on streak length
   */
  const getFlameColor = (): string => {
    if (!isActive || currentStreak === 0) {
      return colors.textTertiary;
    }
    if (currentStreak >= 30) {
      return '#FF4500'; // Red-orange for 30+ days
    }
    if (currentStreak >= 7) {
      return colors.streakOrange;
    }
    return '#FFA500'; // Orange for < 7 days
  };

  const flameColor = getFlameColor();

  return (
    <Pressable
      testID={testID}
      style={[styles.wrapper, style]}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Learning streak: ${currentStreak} days${isActive ? '' : ' (inactive)'}`}
      accessibilityHint={onPress ? 'Tap to view streak details' : undefined}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: sizeConfig.containerSize,
            height: sizeConfig.containerSize,
            borderRadius: sizeConfig.containerSize / 2,
          },
          getContainerStyle(),
          animatedContainerStyle,
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: sizeConfig.containerSize + 20,
              height: sizeConfig.containerSize + 20,
              borderRadius: (sizeConfig.containerSize + 20) / 2,
            },
            animatedGlowStyle,
          ]}
        />

        {/* Flame icon */}
        <Animated.View style={animatedFlameStyle}>
          <Text
            style={[
              styles.flameIcon,
              { fontSize: sizeConfig.iconSize, color: flameColor },
            ]}
            testID={`${testID}-flame`}
          >
            &#128293;
          </Text>
        </Animated.View>

        {/* Streak count */}
        <Text
          style={[
            styles.streakCount,
            { fontSize: sizeConfig.fontSize },
            !isActive && styles.streakCountInactive,
          ]}
          testID={`${testID}-count`}
        >
          {currentStreak}
        </Text>
      </Animated.View>

      {/* Label */}
      {showLabel && (
        <Text style={styles.label} testID={`${testID}-label`}>
          {currentStreak === 1 ? 'day streak' : 'days streak'}
        </Text>
      )}

      {/* At risk indicator */}
      {isAtRisk && isActive && (
        <View style={styles.atRiskBadge} testID={`${testID}-at-risk`}>
          <Text style={styles.atRiskText}>!</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Compact streak indicator for headers/navigation
 */
export interface CompactStreakProps {
  currentStreak: number;
  isActive?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function CompactStreak({
  currentStreak,
  isActive = true,
  onPress,
  testID = 'compact-streak',
}: CompactStreakProps): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      style={styles.compactContainer}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${currentStreak} day streak`}
    >
      <Text style={[styles.compactFlame, !isActive && styles.compactFlameInactive]}>
        &#128293;
      </Text>
      <Text style={[styles.compactCount, !isActive && styles.compactCountInactive]}>
        {currentStreak}
      </Text>
    </Pressable>
  );
}

/**
 * Streak milestone celebration
 */
export interface StreakMilestoneProps {
  milestone: number;
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export function StreakMilestone({
  milestone,
  visible,
  onDismiss,
  testID = 'streak-milestone',
}: StreakMilestoneProps): React.ReactElement | null {
  if (!visible) return null;

  const message = getMilestoneMessage(milestone);

  return (
    <Animated.View
      testID={testID}
      entering={FadeIn}
      style={styles.milestoneContainer}
    >
      <View style={styles.milestoneContent}>
        <Text style={styles.milestoneEmoji}>&#127881;</Text>
        <Text style={styles.milestoneTitle}>{milestone} Day Streak!</Text>
        <Text style={styles.milestoneMessage}>{message}</Text>
        <Pressable style={styles.milestoneDismiss} onPress={onDismiss}>
          <Text style={styles.milestoneDismissText}>Awesome!</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/**
 * Get milestone celebration message
 */
function getMilestoneMessage(milestone: number): string {
  if (milestone >= 365) return "An entire year of learning! You're legendary!";
  if (milestone >= 100) return 'Triple digits! Your dedication is inspiring!';
  if (milestone >= 30) return "A whole month! You've built a solid habit!";
  if (milestone >= 14) return 'Two weeks strong! Keep the momentum going!';
  if (milestone >= 7) return 'One week down! Great start!';
  if (milestone >= 3) return "You're building consistency!";
  return 'Great start! Keep it up!';
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  } as ViewStyle,
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: colors.streakOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  containerActive: {
    backgroundColor: colors.streakOrange + '20',
    borderWidth: 2,
    borderColor: colors.streakOrange,
  } as ViewStyle,
  containerAtRisk: {
    backgroundColor: colors.warning + '20',
    borderWidth: 2,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  } as ViewStyle,
  containerInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
  glow: {
    position: 'absolute',
    backgroundColor: colors.streakOrange + '40',
  } as ViewStyle,
  flameIcon: {
    marginBottom: -4,
  } as TextStyle,
  streakCount: {
    fontWeight: '800',
    color: colors.text,
  } as TextStyle,
  streakCountInactive: {
    color: colors.textTertiary,
  } as TextStyle,
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
    fontWeight: '500',
  } as TextStyle,
  atRiskBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  atRiskText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  } as TextStyle,
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.streakOrange + '15',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 12,
  } as ViewStyle,
  compactFlame: {
    fontSize: 14,
    marginRight: 2,
  } as TextStyle,
  compactFlameInactive: {
    opacity: 0.5,
  } as TextStyle,
  compactCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.streakOrange,
  } as TextStyle,
  compactCountInactive: {
    color: colors.textTertiary,
  } as TextStyle,
  // Milestone styles
  milestoneContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  milestoneContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: spacing[6],
    alignItems: 'center',
    maxWidth: 320,
  } as ViewStyle,
  milestoneEmoji: {
    fontSize: 48,
    marginBottom: spacing[3],
  } as TextStyle,
  milestoneTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.streakOrange,
    marginBottom: spacing[2],
  } as TextStyle,
  milestoneMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  } as TextStyle,
  milestoneDismiss: {
    backgroundColor: colors.streakOrange,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
  } as ViewStyle,
  milestoneDismissText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
});

export default StreakDisplay;
