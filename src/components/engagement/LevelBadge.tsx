/**
 * LevelBadge Component
 *
 * Displays the user's current level in a circular badge with
 * progress indicator to the next level.
 *
 * @example
 * ```tsx
 * <LevelBadge
 *   level={5}
 *   currentXP={450}
 *   progressToNext={75}
 *   onPress={() => showLevelDetails()}
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
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';

/**
 * Props for the LevelBadge component
 */
export interface LevelBadgeProps {
  /** Current level number */
  level: number;
  /** Current total XP */
  currentXP?: number;
  /** Progress percentage to next level (0-100) */
  progressToNext?: number;
  /** Called when badge is pressed */
  onPress?: () => void;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the progress ring */
  showProgress?: boolean;
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
    outerSize: 40,
    innerSize: 32,
    fontSize: 14,
    progressWidth: 3,
  },
  medium: {
    outerSize: 56,
    innerSize: 44,
    fontSize: 20,
    progressWidth: 4,
  },
  large: {
    outerSize: 80,
    innerSize: 64,
    fontSize: 28,
    progressWidth: 5,
  },
};

/**
 * Level tier colors
 */
const LEVEL_COLORS = {
  beginner: colors.primary,      // 1-5
  intermediate: colors.secondary, // 6-15
  advanced: '#9B59B6',           // 16-30
  expert: colors.xpGold,         // 31-50
  master: '#E74C3C',             // 51+
};

/**
 * Get level tier color
 */
function getLevelColor(level: number): string {
  if (level <= 5) return LEVEL_COLORS.beginner;
  if (level <= 15) return LEVEL_COLORS.intermediate;
  if (level <= 30) return LEVEL_COLORS.advanced;
  if (level <= 50) return LEVEL_COLORS.expert;
  return LEVEL_COLORS.master;
}

/**
 * Get level tier name
 */
function getLevelTier(level: number): string {
  if (level <= 5) return 'Novice';
  if (level <= 15) return 'Learner';
  if (level <= 30) return 'Scholar';
  if (level <= 50) return 'Expert';
  return 'Master';
}

/**
 * LevelBadge Component
 *
 * Circular badge showing level with optional progress ring.
 */
export function LevelBadge({
  level,
  currentXP,
  progressToNext = 0,
  onPress,
  size = 'medium',
  showProgress = true,
  style,
  testID = 'level-badge',
}: LevelBadgeProps): React.ReactElement {
  const previousLevel = useRef(level);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  /**
   * Get size configuration
   */
  const sizeConfig = SIZES[size];
  const levelColor = getLevelColor(level);

  /**
   * Animate on level up
   */
  useEffect(() => {
    if (level > previousLevel.current) {
      // Celebration animation
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      );
      rotation.value = withSequence(
        withTiming(360, { duration: 500 }),
        withTiming(0, { duration: 0 })
      );
    }
    previousLevel.current = level;
  }, [level, scale, rotation]);

  /**
   * Animated styles
   */
  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  /**
   * Calculate progress arc (simplified as background opacity)
   */
  const progressOpacity = progressToNext / 100;

  return (
    <Pressable
      testID={testID}
      style={[styles.container, style]}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}. ${progressToNext}% progress to next level.`}
      accessibilityHint={onPress ? 'Tap to view level details' : undefined}
    >
      <Animated.View style={animatedBadgeStyle}>
        {/* Progress ring (background) */}
        {showProgress && (
          <View
            style={[
              styles.progressRing,
              {
                width: sizeConfig.outerSize,
                height: sizeConfig.outerSize,
                borderRadius: sizeConfig.outerSize / 2,
                borderWidth: sizeConfig.progressWidth,
                borderColor: levelColor + '30',
              },
            ]}
          />
        )}

        {/* Progress ring (foreground) - simplified as partial border */}
        {showProgress && progressToNext > 0 && (
          <View
            style={[
              styles.progressForeground,
              {
                width: sizeConfig.outerSize,
                height: sizeConfig.outerSize,
                borderRadius: sizeConfig.outerSize / 2,
                borderWidth: sizeConfig.progressWidth,
                borderColor: levelColor,
                borderTopColor: progressToNext >= 25 ? levelColor : 'transparent',
                borderRightColor: progressToNext >= 50 ? levelColor : 'transparent',
                borderBottomColor: progressToNext >= 75 ? levelColor : 'transparent',
                borderLeftColor: progressToNext >= 100 ? levelColor : 'transparent',
              },
            ]}
            testID={`${testID}-progress`}
          />
        )}

        {/* Inner badge */}
        <View
          style={[
            styles.badge,
            {
              width: sizeConfig.innerSize,
              height: sizeConfig.innerSize,
              borderRadius: sizeConfig.innerSize / 2,
              backgroundColor: levelColor,
            },
          ]}
          testID={`${testID}-inner`}
        >
          <Text
            style={[styles.levelText, { fontSize: sizeConfig.fontSize }]}
            testID={`${testID}-level`}
          >
            {level}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Level progress bar component
 */
export interface LevelProgressBarProps {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  style?: ViewStyle;
  testID?: string;
}

export function LevelProgressBar({
  level,
  currentXP,
  xpForCurrentLevel,
  xpForNextLevel,
  style,
  testID = 'level-progress-bar',
}: LevelProgressBarProps): React.ReactElement {
  const levelColor = getLevelColor(level);
  const xpInLevel = currentXP - xpForCurrentLevel;
  const xpRange = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = xpRange > 0 ? Math.min(100, (xpInLevel / xpRange) * 100) : 0;

  return (
    <View testID={testID} style={[styles.progressBarContainer, style]}>
      <View style={styles.progressBarHeader}>
        <Text style={styles.progressBarLabel}>Level {level}</Text>
        <Text style={styles.progressBarXP}>
          {currentXP} / {xpForNextLevel} XP
        </Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPercent}%`, backgroundColor: levelColor },
          ]}
        />
      </View>
      <Text style={styles.progressBarHint}>
        {xpForNextLevel - currentXP} XP to Level {level + 1}
      </Text>
    </View>
  );
}

/**
 * Level up celebration overlay
 */
export interface LevelUpCelebrationProps {
  newLevel: number;
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export function LevelUpCelebration({
  newLevel,
  visible,
  onDismiss,
  testID = 'level-up-celebration',
}: LevelUpCelebrationProps): React.ReactElement | null {
  const levelColor = getLevelColor(newLevel);
  const tierName = getLevelTier(newLevel);

  if (!visible) return null;

  return (
    <View testID={testID} style={styles.celebrationOverlay}>
      <Animated.View style={styles.celebrationContent}>
        <Text style={styles.celebrationEmoji}>&#127881;</Text>
        <Text style={styles.celebrationTitle}>Level Up!</Text>
        <View style={[styles.celebrationBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.celebrationLevel}>{newLevel}</Text>
        </View>
        <Text style={[styles.celebrationTier, { color: levelColor }]}>
          {tierName}
        </Text>
        <Text style={styles.celebrationMessage}>
          Keep learning to reach new heights!
        </Text>
        <Pressable
          style={[styles.celebrationButton, { backgroundColor: levelColor }]}
          onPress={onDismiss}
        >
          <Text style={styles.celebrationButtonText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Compact level indicator for headers
 */
export interface CompactLevelProps {
  level: number;
  progressToNext?: number;
  onPress?: () => void;
  testID?: string;
}

export function CompactLevel({
  level,
  progressToNext = 0,
  onPress,
  testID = 'compact-level',
}: CompactLevelProps): React.ReactElement {
  const levelColor = getLevelColor(level);

  return (
    <Pressable
      testID={testID}
      style={styles.compactContainer}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}`}
    >
      <View style={[styles.compactBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.compactLevel}>{level}</Text>
      </View>
      {progressToNext > 0 && (
        <View style={styles.compactProgressTrack}>
          <View
            style={[
              styles.compactProgressFill,
              { width: `${progressToNext}%`, backgroundColor: levelColor },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  progressRing: {
    position: 'absolute',
  } as ViewStyle,
  progressForeground: {
    position: 'absolute',
  } as ViewStyle,
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  levelText: {
    fontWeight: '800',
    color: colors.white,
  } as TextStyle,
  // Progress bar styles
  progressBarContainer: {
    width: '100%',
  } as ViewStyle,
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  } as ViewStyle,
  progressBarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,
  progressBarXP: {
    fontSize: 12,
    color: colors.textSecondary,
  } as TextStyle,
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  } as ViewStyle,
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  } as ViewStyle,
  progressBarHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing[1],
    textAlign: 'right',
  } as TextStyle,
  // Celebration styles
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  } as ViewStyle,
  celebrationContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: spacing[6],
    alignItems: 'center',
    maxWidth: 320,
  } as ViewStyle,
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: spacing[2],
  } as TextStyle,
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing[4],
  } as TextStyle,
  celebrationBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  celebrationLevel: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
  } as TextStyle,
  celebrationTier: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing[3],
  } as TextStyle,
  celebrationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  } as TextStyle,
  celebrationButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: 12,
  } as ViewStyle,
  celebrationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  } as TextStyle,
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  compactBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  compactLevel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  } as TextStyle,
  compactProgressTrack: {
    width: 40,
    height: 3,
    backgroundColor: colors.borderLight,
    borderRadius: 1.5,
    marginLeft: spacing[2],
    overflow: 'hidden',
  } as ViewStyle,
  compactProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  } as ViewStyle,
});

export default LevelBadge;
