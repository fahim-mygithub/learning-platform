/**
 * FeedCard Component
 *
 * Base card component for the TikTok-style learning feed with gesture handling.
 * Supports swipe left (I know this), swipe right (review later),
 * tap (pause/flip), and double-tap (save to flashcards) gestures.
 *
 * @example
 * ```tsx
 * <FeedCard
 *   onSwipeLeft={() => handleKnownConcept()}
 *   onSwipeRight={() => handleReviewLater()}
 *   onTap={() => handlePauseOrFlip()}
 *   onDoubleTap={() => handleSaveToFlashcards()}
 * >
 *   <VideoChunkCard {...props} />
 * </FeedCard>
 * ```
 */

import React, { useCallback, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/src/theme';

/**
 * Swipe direction type
 */
export type SwipeDirection = 'left' | 'right' | 'none';

/**
 * Props for the FeedCard component
 */
export interface FeedCardProps {
  /** Content to render inside the card */
  children: ReactNode;
  /** Called when user swipes left (I know this) */
  onSwipeLeft?: () => void;
  /** Called when user swipes right (Review later) */
  onSwipeRight?: () => void;
  /** Called when user taps the card (pause/flip) */
  onTap?: () => void;
  /** Called when user double-taps the card (save to flashcards) */
  onDoubleTap?: () => void;
  /** Called when card is actively being swiped */
  onSwipeProgress?: (direction: SwipeDirection, progress: number) => void;
  /** Whether gestures are enabled (default: true) */
  gesturesEnabled?: boolean;
  /** Custom styles for the card container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Configuration for swipe thresholds and animations
 */
const SWIPE_CONFIG = {
  /** Minimum horizontal distance to trigger swipe action */
  threshold: 100,
  /** Screen width for calculations */
  screenWidth: Dimensions.get('window').width,
  /** Maximum rotation angle during swipe (degrees) */
  maxRotation: 15,
  /** Spring configuration for snap back */
  springConfig: {
    damping: 15,
    stiffness: 150,
  },
  /** Duration for exit animation (ms) */
  exitDuration: 300,
  /** Maximum time between taps for double-tap (ms) */
  doubleTapDelay: 300,
};

/**
 * FeedCard Component
 *
 * A swipeable card that handles gestures for the learning feed.
 * Provides visual feedback during swipe with rotation and opacity changes.
 */
export function FeedCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onDoubleTap,
  onSwipeProgress,
  gesturesEnabled = true,
  style,
  testID = 'feed-card',
}: FeedCardProps): React.ReactElement {
  // Shared values for animations
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isExiting = useSharedValue(false);

  /**
   * Handle swipe left completion
   */
  const handleSwipeLeft = useCallback(() => {
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  /**
   * Handle swipe right completion
   */
  const handleSwipeRight = useCallback(() => {
    onSwipeRight?.();
  }, [onSwipeRight]);

  /**
   * Report swipe progress to parent
   */
  const reportSwipeProgress = useCallback(
    (direction: SwipeDirection, progress: number) => {
      onSwipeProgress?.(direction, progress);
    },
    [onSwipeProgress]
  );

  /**
   * Pan gesture for swipe handling
   */
  const panGesture = Gesture.Pan()
    .enabled(gesturesEnabled)
    .onUpdate((event) => {
      if (isExiting.value) return;

      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // Dampen vertical movement

      // Calculate swipe progress for visual feedback
      const progress = Math.min(
        Math.abs(event.translationX) / SWIPE_CONFIG.threshold,
        1
      );
      const direction: SwipeDirection =
        event.translationX < 0 ? 'left' : event.translationX > 0 ? 'right' : 'none';

      runOnJS(reportSwipeProgress)(direction, progress);
    })
    .onEnd((event) => {
      if (isExiting.value) return;

      // Check if swipe threshold was reached
      if (event.translationX < -SWIPE_CONFIG.threshold) {
        // Swipe left - "I know this"
        isExiting.value = true;
        translateX.value = withTiming(
          -SWIPE_CONFIG.screenWidth * 1.5,
          { duration: SWIPE_CONFIG.exitDuration },
          () => {
            runOnJS(handleSwipeLeft)();
          }
        );
      } else if (event.translationX > SWIPE_CONFIG.threshold) {
        // Swipe right - "Review later"
        isExiting.value = true;
        translateX.value = withTiming(
          SWIPE_CONFIG.screenWidth * 1.5,
          { duration: SWIPE_CONFIG.exitDuration },
          () => {
            runOnJS(handleSwipeRight)();
          }
        );
      } else {
        // Snap back to center
        translateX.value = withSpring(0, SWIPE_CONFIG.springConfig);
        translateY.value = withSpring(0, SWIPE_CONFIG.springConfig);
        runOnJS(reportSwipeProgress)('none', 0);
      }
    });

  /**
   * Single tap gesture
   */
  const tapGesture = Gesture.Tap()
    .enabled(gesturesEnabled)
    .maxDuration(250)
    .onEnd(() => {
      if (onTap) {
        runOnJS(onTap)();
      }
    });

  /**
   * Double tap gesture
   */
  const doubleTapGesture = Gesture.Tap()
    .enabled(gesturesEnabled)
    .numberOfTaps(2)
    .maxDelay(SWIPE_CONFIG.doubleTapDelay)
    .onEnd(() => {
      if (onDoubleTap) {
        runOnJS(onDoubleTap)();
      }
    });

  /**
   * Combine gestures - double tap takes priority over single tap
   * Pan gesture runs simultaneously with tap detection
   */
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    Gesture.Exclusive(doubleTapGesture, tapGesture)
  );

  /**
   * Animated styles for card transformation
   */
  const animatedCardStyle = useAnimatedStyle(() => {
    // Rotation based on horizontal swipe
    const rotation = interpolate(
      translateX.value,
      [-SWIPE_CONFIG.screenWidth, 0, SWIPE_CONFIG.screenWidth],
      [-SWIPE_CONFIG.maxRotation, 0, SWIPE_CONFIG.maxRotation],
      Extrapolation.CLAMP
    );

    // Opacity decreases as card moves away
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_CONFIG.screenWidth * 0.5],
      [1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        testID={testID}
        style={[styles.container, animatedCardStyle, style]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Feed card. Swipe left if you know this, swipe right to review later, tap to pause or flip, double tap to save to flashcards"
        accessibilityHint="Interactive learning card with gesture controls"
      >
        {children}

        {/* Swipe direction indicators (visual feedback) */}
        <SwipeIndicators translateX={translateX} />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Swipe direction indicators that appear during swipe
 */
interface SwipeIndicatorsProps {
  translateX: SharedValue<number>;
}

function SwipeIndicators({ translateX }: SwipeIndicatorsProps): React.ReactElement {
  const leftIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_CONFIG.threshold, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  const rightIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_CONFIG.threshold],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  return (
    <>
      {/* Left indicator - "I know this" */}
      <Animated.View
        style={[styles.indicator, styles.leftIndicator, leftIndicatorStyle]}
        testID="feed-card-left-indicator"
      >
        <View style={styles.indicatorContent}>
          <Animated.Text style={styles.indicatorText}>Got it!</Animated.Text>
        </View>
      </Animated.View>

      {/* Right indicator - "Review later" */}
      <Animated.View
        style={[styles.indicator, styles.rightIndicator, rightIndicatorStyle]}
        testID="feed-card-right-indicator"
      >
        <View style={styles.indicatorContent}>
          <Animated.Text style={styles.indicatorText}>Review</Animated.Text>
        </View>
      </Animated.View>
    </>
  );
}

/**
 * Reset card position (for use when recycling cards in a list)
 */
export function useFeedCardReset() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const reset = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  return { translateX, translateY, reset };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 6,
  } as ViewStyle,
  indicator: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  } as ViewStyle,
  leftIndicator: {
    left: 20,
    backgroundColor: colors.success,
  } as ViewStyle,
  rightIndicator: {
    right: 20,
    backgroundColor: colors.warning,
  } as ViewStyle,
  indicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  indicatorText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FeedCard;
