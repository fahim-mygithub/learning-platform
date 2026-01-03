/**
 * CaptionOverlay Component
 *
 * Displays synchronized captions with yellow active word highlighting.
 * Syncs with video playback position to highlight the currently spoken word.
 *
 * @example
 * ```tsx
 * <CaptionOverlay
 *   words={transcriptWords}
 *   currentPositionMs={playbackPosition}
 *   isVisible={true}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';

/**
 * Word data structure for caption synchronization
 */
export interface CaptionWord {
  /** The word text */
  text: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
}

/**
 * Props for the CaptionOverlay component
 */
export interface CaptionOverlayProps {
  /** Array of words with timing information */
  words: CaptionWord[];
  /** Current playback position in milliseconds */
  currentPositionMs: number;
  /** Whether captions are visible */
  isVisible?: boolean;
  /** Number of words to show before/after current word */
  contextWindow?: number;
  /** Custom styles for the container */
  style?: ViewStyle;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Configuration for caption display
 */
const CAPTION_CONFIG = {
  /** Default context window (words shown before/after current) */
  defaultContextWindow: 8,
  /** Maximum words to display at once */
  maxDisplayWords: 20,
  /** Fade animation duration (ms) */
  fadeAnimationDuration: 150,
};

/**
 * Find the current word index based on playback position
 */
export function getCurrentWordIndex(
  words: CaptionWord[],
  positionMs: number
): number {
  return words.findIndex(
    (word) => positionMs >= word.startMs && positionMs < word.endMs
  );
}

/**
 * Get a window of words around the current position
 */
function getWordWindow(
  words: CaptionWord[],
  currentIndex: number,
  contextWindow: number
): { words: CaptionWord[]; startIndex: number } {
  if (currentIndex === -1) {
    // No current word, find nearest upcoming word
    const nextWordIndex = words.findIndex((word) => word.startMs > 0);
    if (nextWordIndex === -1) {
      return { words: words.slice(0, CAPTION_CONFIG.maxDisplayWords), startIndex: 0 };
    }
    currentIndex = nextWordIndex;
  }

  const startIndex = Math.max(0, currentIndex - contextWindow);
  const endIndex = Math.min(
    words.length,
    currentIndex + contextWindow + 1
  );

  return {
    words: words.slice(startIndex, endIndex),
    startIndex,
  };
}

/**
 * CaptionOverlay Component
 *
 * Displays synchronized captions with word-level highlighting.
 * The currently spoken word is highlighted in yellow (#FFD700).
 */
export function CaptionOverlay({
  words,
  currentPositionMs,
  isVisible = true,
  contextWindow = CAPTION_CONFIG.defaultContextWindow,
  style,
  testID = 'caption-overlay',
}: CaptionOverlayProps): React.ReactElement | null {
  /**
   * Find current word index
   */
  const currentWordIndex = useMemo(
    () => getCurrentWordIndex(words, currentPositionMs),
    [words, currentPositionMs]
  );

  /**
   * Get word window around current position
   */
  const { words: displayWords, startIndex } = useMemo(
    () => getWordWindow(words, currentWordIndex, contextWindow),
    [words, currentWordIndex, contextWindow]
  );

  /**
   * Animated style for visibility
   */
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible ? 1 : 0, {
      duration: CAPTION_CONFIG.fadeAnimationDuration,
    }),
  }));

  if (words.length === 0) {
    return null;
  }

  return (
    <Animated.View
      testID={testID}
      style={[styles.container, animatedContainerStyle, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel="Video captions"
    >
      <View style={styles.captionBox}>
        <Text style={styles.captionText}>
          {displayWords.map((word, index) => {
            const actualIndex = startIndex + index;
            const isCurrentWord = actualIndex === currentWordIndex;
            const isUpcoming = actualIndex > currentWordIndex;

            return (
              <CaptionWordSpan
                key={`${word.startMs}-${actualIndex}`}
                word={word}
                isActive={isCurrentWord}
                isUpcoming={isUpcoming}
                testID={`${testID}-word-${actualIndex}`}
              />
            );
          })}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Props for CaptionWordSpan
 */
interface CaptionWordSpanProps {
  word: CaptionWord;
  isActive: boolean;
  isUpcoming: boolean;
  testID?: string;
}

/**
 * Individual word span with highlighting
 */
function CaptionWordSpan({
  word,
  isActive,
  isUpcoming,
  testID,
}: CaptionWordSpanProps): React.ReactElement {
  const wordStyle = useMemo(() => {
    if (isActive) {
      return styles.activeWord;
    }
    if (isUpcoming) {
      return styles.upcomingWord;
    }
    return styles.spokenWord;
  }, [isActive, isUpcoming]);

  return (
    <Text testID={testID} style={[styles.word, wordStyle]}>
      {word.text}{' '}
    </Text>
  );
}

/**
 * Animated caption word with smooth highlight transition
 */
export function AnimatedCaptionWord({
  word,
  isActive,
  testID,
}: {
  word: CaptionWord;
  isActive: boolean;
  testID?: string;
}): React.ReactElement {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isActive ? 1.05 : 1, { duration: 100 });
    const opacity = withTiming(isActive ? 1 : 0.8, { duration: 100 });

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.Text
      testID={testID}
      style={[
        styles.word,
        isActive ? styles.activeWord : styles.spokenWord,
        animatedStyle,
      ]}
    >
      {word.text}{' '}
    </Animated.Text>
  );
}

/**
 * Hook to track caption position and provide current word
 */
export function useCaptionSync(
  words: CaptionWord[],
  positionMs: number
): {
  currentWord: CaptionWord | null;
  currentIndex: number;
  progress: number;
} {
  return useMemo(() => {
    const currentIndex = getCurrentWordIndex(words, positionMs);
    const currentWord = currentIndex >= 0 ? words[currentIndex] : null;

    // Calculate progress through current word
    let progress = 0;
    if (currentWord) {
      const wordDuration = currentWord.endMs - currentWord.startMs;
      const elapsed = positionMs - currentWord.startMs;
      progress = Math.min(1, Math.max(0, elapsed / wordDuration));
    }

    return { currentWord, currentIndex, progress };
  }, [words, positionMs]);
}

/**
 * Parse transcript text with timestamps into CaptionWord array
 * Assumes format: "word|startMs|endMs word|startMs|endMs ..."
 */
export function parseTimestampedTranscript(
  transcript: string,
  delimiter: string = '|'
): CaptionWord[] {
  const parts = transcript.split(' ');
  const words: CaptionWord[] = [];

  for (const part of parts) {
    const segments = part.split(delimiter);
    if (segments.length >= 3) {
      words.push({
        text: segments[0],
        startMs: parseInt(segments[1], 10),
        endMs: parseInt(segments[2], 10),
      });
    }
  }

  return words;
}

/**
 * Create caption words from a simple transcript with uniform timing
 */
export function createUniformCaptionWords(
  text: string,
  startMs: number,
  endMs: number
): CaptionWord[] {
  const words = text.split(/\s+/).filter(Boolean);
  const duration = endMs - startMs;
  const wordDuration = duration / words.length;

  return words.map((word, index) => ({
    text: word,
    startMs: startMs + index * wordDuration,
    endMs: startMs + (index + 1) * wordDuration,
  }));
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: spacing[4],
    right: spacing[4],
    alignItems: 'center',
  } as ViewStyle,
  captionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: '100%',
  } as ViewStyle,
  captionText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  } as TextStyle,
  word: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 28,
  } as TextStyle,
  activeWord: {
    color: colors.captionHighlight, // #FFD700 - Yellow
    fontWeight: '700',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  } as TextStyle,
  spokenWord: {
    color: 'rgba(255, 255, 255, 0.6)',
  } as TextStyle,
  upcomingWord: {
    color: colors.white,
  } as TextStyle,
});

export default CaptionOverlay;
