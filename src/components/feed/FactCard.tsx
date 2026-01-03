/**
 * FactCard Component
 *
 * A flip card that shows a teaser on the front and reveals the full fact
 * on the back when tapped. Provides visual variety in the learning feed.
 *
 * @example
 * ```tsx
 * <FactCard
 *   factText="The human brain processes images 60,000 times faster than text."
 *   whyItMatters="This is why visual learning is so effective."
 *   conceptId="concept-123"
 *   onFlip={() => trackInteraction()}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';
import { haptics } from '@/src/lib/haptic-feedback';
import type { FactItem } from '@/src/types/engagement';

/**
 * Props for the FactCard component
 */
export interface FactCardProps {
  /** The main fact text to display */
  factText: string;
  /** Explanation of why this fact matters */
  whyItMatters: string;
  /** Associated concept ID */
  conceptId: string;
  /** Called when card is flipped */
  onFlip?: (isFlipped: boolean) => void;
  /** Called when card interaction is complete */
  onComplete?: () => void;
  /** Whether this card is currently active */
  isActive?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Spring configuration for flip */
  springConfig: {
    damping: 20,
    stiffness: 100,
  },
  /** Flip duration in milliseconds */
  flipDuration: 500,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * FactCard Component
 *
 * An interactive flip card showing a "Did you know?" teaser on the front
 * and the full fact with context on the back.
 */
export function FactCard({
  factText,
  whyItMatters,
  conceptId,
  onFlip,
  onComplete,
  isActive = false,
  testID = 'fact-card',
}: FactCardProps): React.ReactElement {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotation = useSharedValue(0);

  /**
   * Handle card flip
   */
  const handleFlip = useCallback(async () => {
    const newFlippedState = !isFlipped;
    setIsFlipped(newFlippedState);

    // Animate rotation
    rotation.value = withSpring(
      newFlippedState ? 180 : 0,
      ANIMATION_CONFIG.springConfig
    );

    // Haptic feedback
    await haptics.light();

    // Notify parent
    onFlip?.(newFlippedState);

    // If flipped to back, consider it "read" after a delay
    if (newFlippedState) {
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  }, [isFlipped, rotation, onFlip, onComplete]);

  /**
   * Animated style for front face
   */
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [0, 180],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      opacity: rotation.value < 90 ? 1 : 0,
    };
  });

  /**
   * Animated style for back face
   */
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [180, 360],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      opacity: rotation.value >= 90 ? 1 : 0,
    };
  });

  /**
   * Get teaser text (first sentence or truncated)
   */
  const teaserText = getTeaser(factText);

  return (
    <Pressable
      testID={testID}
      style={styles.container}
      onPress={handleFlip}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={isFlipped ? 'Fact card showing details. Tap to flip back.' : 'Did you know? Tap to reveal.'}
      accessibilityHint="Double tap to flip the card"
    >
      {/* Front face - Teaser */}
      <Animated.View
        testID={`${testID}-front`}
        style={[styles.face, styles.frontFace, frontAnimatedStyle]}
      >
        <View style={styles.frontContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>&#128161;</Text>
          </View>
          <Text style={styles.didYouKnow}>Did you know?</Text>
          <Text style={styles.teaserText} numberOfLines={3}>
            {teaserText}
          </Text>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap to reveal</Text>
            <Text style={styles.tapHintIcon}>&#8594;</Text>
          </View>
        </View>
        <View style={styles.frontPattern} />
      </Animated.View>

      {/* Back face - Full fact */}
      <Animated.View
        testID={`${testID}-back`}
        style={[styles.face, styles.backFace, backAnimatedStyle]}
      >
        <View style={styles.backContent}>
          <View style={styles.factHeader}>
            <Text style={styles.factLabel}>The Fact</Text>
          </View>
          <Text style={styles.factText}>{factText}</Text>

          <View style={styles.divider} />

          <View style={styles.whySection}>
            <Text style={styles.whyLabel}>Why It Matters</Text>
            <Text style={styles.whyText}>{whyItMatters}</Text>
          </View>

          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap to flip back</Text>
          </View>
        </View>
      </Animated.View>

      {/* Flip indicator */}
      <View style={styles.flipIndicator}>
        <Text style={styles.flipIndicatorText}>
          {isFlipped ? '2/2' : '1/2'}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Get teaser text from full fact
 */
function getTeaser(factText: string): string {
  // Get first sentence
  const firstSentence = factText.split(/[.!?]/)[0];

  // Truncate if too long
  if (firstSentence.length > 100) {
    return firstSentence.substring(0, 97) + '...';
  }

  return firstSentence + (factText.length > firstSentence.length ? '...' : '');
}

/**
 * Create FactCard props from a FactItem
 */
export function createFactCardProps(
  item: FactItem
): Omit<FactCardProps, 'onFlip' | 'onComplete' | 'isActive'> {
  return {
    factText: item.factText,
    whyItMatters: item.whyItMatters,
    conceptId: item.conceptId,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  face: {
    position: 'absolute',
    width: SCREEN_WIDTH - spacing[8],
    minHeight: 400,
    borderRadius: 20,
    padding: spacing[6],
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
  frontFace: {
    backgroundColor: colors.primary,
    overflow: 'hidden',
  } as ViewStyle,
  backFace: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,
  frontContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  } as ViewStyle,
  frontPattern: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  } as ViewStyle,
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  } as ViewStyle,
  icon: {
    fontSize: 40,
  } as TextStyle,
  didYouKnow: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing[3],
  } as TextStyle,
  teaserText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing[4],
  } as TextStyle,
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
  } as ViewStyle,
  tapHintText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: spacing[2],
  } as TextStyle,
  tapHintIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  } as TextStyle,
  backContent: {
    flex: 1,
  } as ViewStyle,
  factHeader: {
    marginBottom: spacing[3],
  } as ViewStyle,
  factLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  factText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 28,
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing[5],
  } as ViewStyle,
  whySection: {
    flex: 1,
  } as ViewStyle,
  whyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  } as TextStyle,
  whyText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  } as TextStyle,
  flipIndicator: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[6],
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  } as ViewStyle,
  flipIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  } as TextStyle,
});

export default FactCard;
