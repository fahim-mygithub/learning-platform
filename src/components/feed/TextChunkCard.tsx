/**
 * TextChunkCard Component
 *
 * Displays text content in the learning feed with bionic reading support.
 * Text is chunked to 60 words max per card, with scrollable expansion
 * for longer passages.
 *
 * @example
 * ```tsx
 * <TextChunkCard
 *   text="This is the text content to display..."
 *   propositions={['proposition 1', 'proposition 2']}
 *   chunkIndex={0}
 *   totalChunks={5}
 *   onTap={() => console.log('tapped')}
 *   onComplete={() => console.log('read')}
 * />
 * ```
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  type ViewStyle,
  type TextStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { colors, spacing } from '@/src/theme';
import { haptics } from '@/src/lib/haptic-feedback';
import { useTypography } from '@/src/lib/typography-context';
import type { TextChunkItem } from '@/src/types/engagement';

// ============================================================================
// Constants
// ============================================================================

/** Maximum words per card before expansion is needed */
const MAX_WORDS_PER_CARD = 60;

/** Screen dimensions for card sizing */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Scroll threshold to consider content "read" */
const SCROLL_READ_THRESHOLD = 0.8;

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the TextChunkCard component
 */
export interface TextChunkCardProps {
  /** The text content to display */
  text: string;
  /** Array of propositions in this chunk */
  propositions: string[];
  /** Current chunk index */
  chunkIndex: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Called when card is tapped */
  onTap?: () => void;
  /** Called when card is read (scrolled through) */
  onComplete?: () => void;
  /** Whether this card is currently active */
  isActive?: boolean;
  /** Test ID */
  testID?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TextChunkCard Component
 *
 * An interactive card for displaying text content with bionic reading.
 * Supports expansion for longer text and tracks reading progress.
 */
export function TextChunkCard({
  text,
  propositions,
  chunkIndex,
  totalChunks,
  onTap,
  onComplete,
  isActive = false,
  testID = 'text-chunk-card',
}: TextChunkCardProps): React.ReactElement {
  const { processText, getColors, getScaledFontSize, getFontFamily } = useTypography();
  const themeColors = getColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasCompletedRead, setHasCompletedRead] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  // Check if text exceeds word limit
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const needsExpansion = wordCount > MAX_WORDS_PER_CARD;

  // Apply bionic reading to text
  const formattedText = processText(text);

  /**
   * Handle card tap
   */
  const handleTap = useCallback(async () => {
    await haptics.light();

    if (needsExpansion) {
      setIsExpanded((prev) => !prev);
    }

    onTap?.();

    // If short text, mark as complete immediately
    if (!needsExpansion && !hasCompletedRead) {
      setHasCompletedRead(true);
      onComplete?.();
    }
  }, [needsExpansion, onTap, onComplete, hasCompletedRead]);

  /**
   * Handle scroll to track reading progress
   */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (hasCompletedRead) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const scrollProgress =
        (contentOffset.y + layoutMeasurement.height) / contentSize.height;

      if (scrollProgress >= SCROLL_READ_THRESHOLD) {
        setHasCompletedRead(true);
        onComplete?.();
      }
    },
    [hasCompletedRead, onComplete]
  );

  /**
   * Get truncated text for collapsed view
   */
  const getDisplayText = useCallback(() => {
    if (!needsExpansion || isExpanded) {
      return formattedText;
    }

    // Truncate to approximately 60 words
    const words = text.split(/\s+/).filter(Boolean);
    const truncated = words.slice(0, MAX_WORDS_PER_CARD).join(' ') + '...';
    return processText(truncated);
  }, [needsExpansion, isExpanded, text, formattedText, processText]);

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: themeColors.backgroundSecondary,
      borderColor: themeColors.borderLight,
    },
    text: {
      color: themeColors.text,
      fontFamily: getFontFamily('regular'),
      fontSize: getScaledFontSize(18),
    },
    progressText: {
      color: themeColors.textSecondary,
    },
    expandHint: {
      color: themeColors.primary,
    },
  };

  return (
    <Pressable
      testID={testID}
      style={[styles.container, dynamicStyles.container]}
      onPress={handleTap}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Reading chunk ${chunkIndex + 1} of ${totalChunks}. ${
        needsExpansion ? (isExpanded ? 'Tap to collapse.' : 'Tap to expand.') : ''
      }`}
      accessibilityHint={needsExpansion ? 'Double tap to toggle expansion' : undefined}
    >
      {/* Header with chunk indicator */}
      <View style={styles.header}>
        <View style={styles.chunkIndicator}>
          <Text style={[styles.chunkLabel, dynamicStyles.progressText]}>Reading</Text>
        </View>
        <View style={styles.progressIndicator}>
          <Text
            testID={`${testID}-progress`}
            style={[styles.progressText, dynamicStyles.progressText]}
          >
            {chunkIndex + 1} of {totalChunks}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        testID={`${testID}-scroll`}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={isExpanded}
        scrollEnabled={isExpanded}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text
          testID={`${testID}-text`}
          style={[styles.text, dynamicStyles.text]}
        >
          {getDisplayText()}
        </Text>
      </ScrollView>

      {/* Expansion hint */}
      {needsExpansion && (
        <View style={styles.expandHintContainer}>
          <Text
            testID={`${testID}-expand-hint`}
            style={[styles.expandHint, dynamicStyles.expandHint]}
          >
            {isExpanded ? 'Tap to collapse' : `Tap to read all ${wordCount} words`}
          </Text>
        </View>
      )}

      {/* Proposition count indicator */}
      {propositions.length > 0 && (
        <View style={styles.propositionIndicator}>
          <Text
            testID={`${testID}-propositions`}
            style={[styles.propositionText, dynamicStyles.progressText]}
          >
            {propositions.length} key point{propositions.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Read indicator */}
      {hasCompletedRead && (
        <View testID={`${testID}-read-indicator`} style={styles.readIndicator}>
          <Text style={styles.checkmark}>&#10003;</Text>
        </View>
      )}
    </Pressable>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create TextChunkCard props from a TextChunkItem
 */
export function createTextChunkCardProps(
  item: TextChunkItem
): Omit<TextChunkCardProps, 'onTap' | 'onComplete' | 'isActive'> {
  return {
    text: item.text,
    propositions: item.propositions,
    chunkIndex: item.chunkIndex,
    totalChunks: item.totalChunks,
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH - spacing[8],
    minHeight: 300,
    maxHeight: 500,
    borderRadius: 20,
    padding: spacing[5],
    marginHorizontal: spacing[4],
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  } as ViewStyle,
  chunkIndicator: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  } as ViewStyle,
  chunkLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  progressIndicator: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  } as ViewStyle,
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,
  scrollView: {
    flex: 1,
    marginBottom: spacing[3],
  } as ViewStyle,
  scrollContent: {
    paddingBottom: spacing[2],
  } as ViewStyle,
  text: {
    lineHeight: 28,
  } as TextStyle,
  expandHintContainer: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  } as ViewStyle,
  expandHint: {
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
  propositionIndicator: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  } as ViewStyle,
  propositionText: {
    fontSize: 12,
    fontWeight: '500',
  } as TextStyle,
  readIndicator: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  } as TextStyle,
});

export default TextChunkCard;
