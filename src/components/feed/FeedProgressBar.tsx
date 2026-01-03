/**
 * FeedProgressBar Component
 *
 * A thin progress bar that shows the user's current position in the learning feed.
 * Displayed at the top of the feed screen with smooth animations.
 *
 * @example
 * ```tsx
 * <FeedProgressBar
 *   currentIndex={5}
 *   totalItems={20}
 *   animated={true}
 * />
 * ```
 */

import React, { useEffect } from 'react';
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
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';

/**
 * Props for the FeedProgressBar component
 */
export interface FeedProgressBarProps {
  /** Current item index (0-based) */
  currentIndex: number;
  /** Total number of items in the feed */
  totalItems: number;
  /** Whether to animate progress changes */
  animated?: boolean;
  /** Whether to show the progress text label */
  showLabel?: boolean;
  /** Height of the progress bar */
  height?: number;
  /** Background color override */
  backgroundColor?: string;
  /** Fill color override */
  fillColor?: string;
  /** Custom styles for the container */
  style?: ViewStyle;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Spring configuration for progress bar */
  springConfig: {
    damping: 20,
    stiffness: 100,
  },
  /** Timing configuration for smooth transitions */
  timingConfig: {
    duration: 300,
  },
};

/**
 * Default progress bar height
 */
const DEFAULT_HEIGHT = 3;

/**
 * FeedProgressBar Component
 *
 * A thin, animated progress bar for tracking feed position.
 */
export function FeedProgressBar({
  currentIndex,
  totalItems,
  animated = true,
  showLabel = false,
  height = DEFAULT_HEIGHT,
  backgroundColor,
  fillColor,
  style,
  testID = 'feed-progress-bar',
}: FeedProgressBarProps): React.ReactElement {
  const progress = useSharedValue(0);

  /**
   * Calculate progress percentage
   */
  const progressPercent = totalItems > 0
    ? Math.min(100, Math.max(0, ((currentIndex + 1) / totalItems) * 100))
    : 0;

  /**
   * Update progress value when index changes
   */
  useEffect(() => {
    if (animated) {
      progress.value = withSpring(progressPercent, ANIMATION_CONFIG.springConfig);
    } else {
      progress.value = progressPercent;
    }
  }, [progressPercent, animated, progress]);

  /**
   * Animated style for the progress fill
   */
  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  /**
   * Get background color
   */
  const bgColor = backgroundColor || 'rgba(255, 255, 255, 0.3)';
  const fColor = fillColor || colors.primary;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <View
        style={[
          styles.track,
          { height, backgroundColor: bgColor },
        ]}
        testID={`${testID}-track`}
      >
        <Animated.View
          style={[
            styles.fill,
            { height, backgroundColor: fColor },
            animatedFillStyle,
          ]}
          testID={`${testID}-fill`}
        />
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>
            {currentIndex + 1} / {totalItems}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Segmented progress bar for showing individual items
 */
export interface SegmentedProgressBarProps {
  /** Current item index (0-based) */
  currentIndex: number;
  /** Total number of items */
  totalItems: number;
  /** Maximum segments to show (will combine if more items) */
  maxSegments?: number;
  /** Segment gap width */
  segmentGap?: number;
  /** Custom styles for the container */
  style?: ViewStyle;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * SegmentedProgressBar Component
 *
 * Shows individual segments for each item in the feed.
 */
export function SegmentedProgressBar({
  currentIndex,
  totalItems,
  maxSegments = 10,
  segmentGap = 4,
  style,
  testID = 'segmented-progress-bar',
}: SegmentedProgressBarProps): React.ReactElement {
  /**
   * Calculate number of segments to show
   */
  const segmentCount = Math.min(totalItems, maxSegments);
  const itemsPerSegment = Math.ceil(totalItems / segmentCount);

  /**
   * Calculate which segment is active
   */
  const activeSegment = Math.floor(currentIndex / itemsPerSegment);

  return (
    <View
      testID={testID}
      style={[styles.segmentedContainer, style]}
    >
      {Array.from({ length: segmentCount }).map((_, index) => {
        const isCompleted = index < activeSegment;
        const isActive = index === activeSegment;
        const isFuture = index > activeSegment;

        return (
          <View
            key={index}
            style={[
              styles.segment,
              { marginRight: index < segmentCount - 1 ? segmentGap : 0 },
            ]}
          >
            <SegmentFill
              isCompleted={isCompleted}
              isActive={isActive}
              progress={isActive ? (currentIndex % itemsPerSegment) / itemsPerSegment : 0}
              testID={`${testID}-segment-${index}`}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Individual segment fill with animation
 */
interface SegmentFillProps {
  isCompleted: boolean;
  isActive: boolean;
  progress: number;
  testID?: string;
}

function SegmentFill({
  isCompleted,
  isActive,
  progress,
  testID,
}: SegmentFillProps): React.ReactElement {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (isCompleted) {
      animatedProgress.value = withTiming(100, ANIMATION_CONFIG.timingConfig);
    } else if (isActive) {
      animatedProgress.value = withSpring(
        progress * 100,
        ANIMATION_CONFIG.springConfig
      );
    } else {
      animatedProgress.value = 0;
    }
  }, [isCompleted, isActive, progress, animatedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return (
    <View style={styles.segmentTrack} testID={testID}>
      <Animated.View
        style={[
          styles.segmentFill,
          isCompleted && styles.segmentCompleted,
          isActive && styles.segmentActive,
          animatedStyle,
        ]}
      />
    </View>
  );
}

/**
 * Circular progress indicator for the feed
 */
export interface CircularProgressProps {
  /** Current progress (0-100) */
  progress: number;
  /** Size of the circle */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to show percentage label */
  showLabel?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Simple circular progress (text-based, no SVG)
 */
export function CircularProgress({
  progress,
  size = 48,
  showLabel = true,
  testID = 'circular-progress',
}: CircularProgressProps): React.ReactElement {
  const roundedProgress = Math.round(Math.min(100, Math.max(0, progress)));

  return (
    <View
      testID={testID}
      style={[
        styles.circularContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <View
        style={[
          styles.circularInner,
          {
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
          },
        ]}
      >
        {showLabel && (
          <Text style={styles.circularLabel}>{roundedProgress}%</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  track: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    borderRadius: 2,
  } as ViewStyle,
  labelContainer: {
    marginTop: spacing[1],
    alignItems: 'center',
  } as ViewStyle,
  labelText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  } as TextStyle,
  segmentedContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 3,
  } as ViewStyle,
  segment: {
    flex: 1,
    height: '100%',
  } as ViewStyle,
  segmentTrack: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  } as ViewStyle,
  segmentFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 1.5,
  } as ViewStyle,
  segmentCompleted: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  segmentActive: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  circularContainer: {
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  circularInner: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  circularLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  } as TextStyle,
});

export default FeedProgressBar;
