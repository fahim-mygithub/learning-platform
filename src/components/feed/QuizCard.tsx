/**
 * QuizCard Component - Luminous Focus Design
 *
 * Premium interactive quiz card for the learning feed with glowing feedback.
 * Implements "Luminous Focus" design direction:
 * - Multiple choice options as pressable cards with subtle borders
 * - Green glow on correct answer after submit
 * - Red glow on incorrect, green on correct after wrong answer
 * - Explanation text revealed after submit
 * - XP reward animation (+10/15/25/50)
 *
 * @example
 * ```tsx
 * <QuizCard
 *   question={sampleQuestion}
 *   conceptId="concept-123"
 *   onCorrectAnswer={(xpAwarded) => handleXP(xpAwarded)}
 *   onIncorrectAnswer={() => markForReview()}
 *   isActive={true}
 * />
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
  ZoomIn,
  interpolate,
} from 'react-native-reanimated';
import { spacing } from '@/src/theme';
import { type ColorTheme } from '@/src/theme/colors';
import { useTypography } from '@/src/lib/typography-context';
import { haptics } from '@/src/lib/haptic-feedback';
import type { SampleQuestion } from '@/src/types/three-pass';
import { selectXPAmount, type QuizItem } from '@/src/types/engagement';

/**
 * Props for the QuizCard component
 */
export interface QuizCardProps {
  /** The question to display */
  question: SampleQuestion;
  /** Associated concept ID */
  conceptId: string;
  /** Called when user answers correctly */
  onCorrectAnswer?: (xpAwarded: number) => void;
  /** Called when user answers incorrectly */
  onIncorrectAnswer?: () => void;
  /** Called when quiz is completed (after feedback shown) */
  onComplete?: () => void;
  /** Whether this card is currently active */
  isActive?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Answer state for tracking selection
 */
type AnswerState = 'unanswered' | 'correct' | 'incorrect';

/**
 * Option button props
 */
interface OptionButtonProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  answerState: AnswerState;
  onPress: () => void;
  colors: ColorTheme;
  isDarkMode: boolean;
  testID?: string;
}

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Spring configuration for button press */
  springConfig: {
    damping: 15,
    stiffness: 400,
  },
  /** Duration for shake animation */
  shakeDuration: 80,
  /** Shake distance in pixels */
  shakeDistance: 8,
  /** Delay before showing next card */
  feedbackDuration: 1500,
};

/**
 * Generate answer options from question
 *
 * For true_false questions, always return ['True', 'False'] regardless of
 * what distractors the AI provides. This prevents the bug where AI omits
 * distractors and only one option is displayed.
 */
function getAnswerOptions(question: SampleQuestion): string[] {
  // Hardcode True/False options - never rely on AI for this
  if (question.question_type === 'true_false') {
    return shuffleArray(['True', 'False']);
  }

  const options = [question.correct_answer];

  if (question.distractors) {
    options.push(...question.distractors);
  }

  // Shuffle options
  return shuffleArray(options);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * QuizCard Component
 *
 * Interactive quiz with animated feedback and haptic responses.
 */
export function QuizCard({
  question,
  conceptId,
  onCorrectAnswer,
  onIncorrectAnswer,
  onComplete,
  isActive = false,
  testID = 'quiz-card',
}: QuizCardProps): React.ReactElement {
  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [options] = useState(() => getAnswerOptions(question));
  const [showExplanation, setShowExplanation] = useState(false);

  /**
   * Handle option selection
   */
  const handleOptionPress = useCallback(
    async (index: number) => {
      if (answerState !== 'unanswered') return;

      setSelectedIndex(index);
      const selectedOption = options[index];
      const isCorrect = selectedOption === question.correct_answer;

      if (isCorrect) {
        setAnswerState('correct');
        await haptics.success();

        // Award weighted random XP: [10, 15, 25, 50] with 60%/25%/10%/5% distribution
        const xpAwarded = selectXPAmount('quiz_correct');
        onCorrectAnswer?.(xpAwarded);
      } else {
        setAnswerState('incorrect');
        await haptics.error();
        onIncorrectAnswer?.();
      }

      // Show explanation after brief delay
      setTimeout(() => {
        setShowExplanation(true);
      }, 500);

      // Complete after feedback duration
      setTimeout(() => {
        onComplete?.();
      }, ANIMATION_CONFIG.feedbackDuration);
    },
    [answerState, options, question.correct_answer, onCorrectAnswer, onIncorrectAnswer, onComplete]
  );

  /**
   * Get question type label
   */
  const questionTypeLabel = getQuestionTypeLabel(question.question_type);

  return (
    <View testID={testID} style={styles.container}>
      {/* Question type badge */}
      <Animated.View
        entering={FadeIn.delay(200)}
        style={styles.typeBadge}
      >
        <Text style={styles.typeBadgeText}>{questionTypeLabel}</Text>
      </Animated.View>

      {/* Question text */}
      <Animated.View
        entering={SlideInUp.delay(100)}
        style={styles.questionContainer}
      >
        <Text
          style={styles.questionText}
          testID={`${testID}-question`}
          accessible={true}
          accessibilityRole="text"
        >
          {question.question_text}
        </Text>
      </Animated.View>

      {/* Answer options */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <OptionButton
            key={`${option}-${index}`}
            text={option}
            index={index}
            isSelected={selectedIndex === index}
            isCorrect={option === question.correct_answer}
            answerState={answerState}
            onPress={() => handleOptionPress(index)}
            colors={colors}
            isDarkMode={isDarkMode}
            testID={`${testID}-option-${index}`}
          />
        ))}
      </View>

      {/* Feedback section */}
      {showExplanation && question.explanation && (
        <Animated.View
          entering={FadeIn}
          style={styles.explanationContainer}
          testID={`${testID}-explanation`}
        >
          <Text style={styles.explanationLabel}>
            {answerState === 'correct' ? 'Great job!' : 'Not quite...'}
          </Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </Animated.View>
      )}

      {/* Result indicator */}
      {answerState !== 'unanswered' && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.resultIndicator,
            answerState === 'correct' ? styles.resultCorrect : styles.resultIncorrect,
          ]}
          testID={`${testID}-result`}
        >
          <Text style={styles.resultText}>
            {answerState === 'correct' ? 'Correct!' : 'Incorrect'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * OptionButton Component - Luminous Focus Design
 *
 * Individual answer option with glowing animated feedback:
 * - Subtle border before submit
 * - Green glow on correct answer
 * - Red glow on incorrect, green on correct
 */
function OptionButton({
  text,
  index,
  isSelected,
  isCorrect,
  answerState,
  onPress,
  colors,
  isDarkMode,
  testID,
}: OptionButtonProps): React.ReactElement {
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  /**
   * Handle press with animation
   */
  const handlePress = useCallback(() => {
    if (answerState !== 'unanswered') return;

    // Press animation
    scale.value = withSequence(
      withSpring(0.97, ANIMATION_CONFIG.springConfig),
      withSpring(1, ANIMATION_CONFIG.springConfig)
    );

    onPress();
  }, [answerState, onPress, scale]);

  /**
   * Glow pulse animation for correct answer
   */
  useEffect(() => {
    if (answerState !== 'unanswered' && isCorrect) {
      // Pulse glow effect
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        3,
        true
      );
    }
  }, [answerState, isCorrect, glowOpacity]);

  /**
   * Shake animation for incorrect answer
   */
  useEffect(() => {
    if (isSelected && answerState === 'incorrect') {
      translateX.value = withSequence(
        withTiming(-ANIMATION_CONFIG.shakeDistance, { duration: ANIMATION_CONFIG.shakeDuration }),
        withTiming(ANIMATION_CONFIG.shakeDistance, { duration: ANIMATION_CONFIG.shakeDuration }),
        withTiming(-ANIMATION_CONFIG.shakeDistance, { duration: ANIMATION_CONFIG.shakeDuration }),
        withTiming(0, { duration: ANIMATION_CONFIG.shakeDuration })
      );
    }
  }, [isSelected, answerState, translateX]);

  /**
   * Animated style for button
   */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  /**
   * Animated glow style
   */
  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  /**
   * Get button style based on state
   */
  const getButtonStyle = (): ViewStyle => {
    if (answerState === 'unanswered') {
      return styles.optionButton;
    }

    if (isCorrect) {
      return { ...styles.optionButton, ...styles.optionCorrect };
    }

    if (isSelected && !isCorrect) {
      return { ...styles.optionButton, ...styles.optionIncorrect };
    }

    return { ...styles.optionButton, ...styles.optionDisabled };
  };

  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

  // Glow colors
  const greenGlow = isDarkMode ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)';
  const redGlow = isDarkMode ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)';

  return (
    <Animated.View style={[animatedStyle, styles.optionWrapper]}>
      {/* Glow effect layer */}
      {answerState !== 'unanswered' && (isCorrect || (isSelected && !isCorrect)) && (
        <Animated.View
          style={[
            styles.glowLayer,
            {
              backgroundColor: isCorrect ? greenGlow : redGlow,
              shadowColor: isCorrect ? colors.success : colors.error,
            },
            animatedGlowStyle,
          ]}
        />
      )}

      <Pressable
        testID={testID}
        style={getButtonStyle()}
        onPress={handlePress}
        disabled={answerState !== 'unanswered'}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Option ${optionLabel}: ${text}`}
        accessibilityState={{
          selected: isSelected,
          disabled: answerState !== 'unanswered',
        }}
      >
        <View style={[
          styles.optionLabelContainer,
          isCorrect && answerState !== 'unanswered' && styles.optionLabelCorrect,
          isSelected && !isCorrect && answerState === 'incorrect' && styles.optionLabelIncorrect,
        ]}>
          <Text style={[
            styles.optionLabel,
            isCorrect && answerState !== 'unanswered' && styles.optionLabelTextCorrect,
            isSelected && !isCorrect && answerState === 'incorrect' && styles.optionLabelTextIncorrect,
          ]}>
            {optionLabel}
          </Text>
        </View>
        <Text
          style={[
            styles.optionText,
            isCorrect && answerState !== 'unanswered' && styles.optionTextCorrect,
            isSelected && !isCorrect && answerState === 'incorrect' && styles.optionTextIncorrect,
          ]}
          numberOfLines={3}
        >
          {text}
        </Text>
        {answerState !== 'unanswered' && isCorrect && (
          <Animated.View
            entering={ZoomIn.springify()}
            style={styles.checkmark}
          >
            <Text style={styles.checkmarkText}>{'\u2713'}</Text>
          </Animated.View>
        )}
        {isSelected && !isCorrect && answerState === 'incorrect' && (
          <Animated.View
            entering={ZoomIn.springify()}
            style={styles.crossmark}
          >
            <Text style={styles.crossmarkText}>{'\u2717'}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Get human-readable question type label
 */
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    definition_recall: 'Definition',
    true_false: 'True/False',
    multiple_choice: 'Multiple Choice',
    comparison: 'Comparison',
    sequence: 'Sequence',
    cause_effect: 'Cause & Effect',
    application: 'Application',
  };
  return labels[type] || 'Quiz';
}

/**
 * Create QuizCard props from a QuizItem
 */
export function createQuizCardProps(
  item: QuizItem
): Omit<QuizCardProps, 'onCorrectAnswer' | 'onIncorrectAnswer' | 'onComplete' | 'isActive'> {
  return {
    question: item.question,
    conceptId: item.conceptId,
  };
}

/**
 * Create dynamic styles based on theme colors
 * Implements "Luminous Focus" design:
 * - Deep black backgrounds
 * - Glowing feedback on correct/incorrect
 * - Premium card styling
 */
function createStyles(colors: ColorTheme, isDarkMode: boolean) {
  // Glow colors
  const greenGlow = 'rgba(34, 197, 94, 0.5)';
  const redGlow = 'rgba(239, 68, 68, 0.5)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#09090b' : colors.background, // zinc-950
      paddingHorizontal: spacing[5],
      paddingTop: spacing[10],
      paddingBottom: spacing[4],
    } as ViewStyle,

    // Question type badge
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : colors.primary,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: 8,
      marginBottom: spacing[4],
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: 'rgba(99, 102, 241, 0.4)',
    } as ViewStyle,
    typeBadgeText: {
      color: isDarkMode ? '#818cf8' : colors.white, // indigo-400
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    } as TextStyle,

    // Question
    questionContainer: {
      marginBottom: spacing[6],
    } as ViewStyle,
    questionText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 30,
    } as TextStyle,

    // Options container
    optionsContainer: {
      gap: spacing[3],
    } as ViewStyle,

    // Option wrapper for glow effect
    optionWrapper: {
      position: 'relative',
    } as ViewStyle,

    // Glow layer behind option
    glowLayer: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 8,
    } as ViewStyle,

    // Option button - subtle border before submit
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.6)' : colors.backgroundSecondary,
      borderRadius: 14,
      padding: spacing[4],
      borderWidth: 1.5,
      borderColor: isDarkMode ? 'rgba(63, 63, 70, 0.5)' : colors.borderLight,
    } as ViewStyle,

    // Correct option - GREEN GLOW
    optionCorrect: {
      backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#E8F5E9',
      borderColor: colors.success,
      borderWidth: 2,
      // Glow shadow
      shadowColor: greenGlow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,

    // Incorrect option - RED GLOW
    optionIncorrect: {
      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FFEBEE',
      borderColor: colors.error,
      borderWidth: 2,
      // Glow shadow
      shadowColor: redGlow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,

    optionDisabled: {
      opacity: 0.5,
    } as ViewStyle,

    // Option label (A, B, C, D)
    optionLabelContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? 'rgba(63, 63, 70, 0.8)' : colors.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing[3],
    } as ViewStyle,
    optionLabelCorrect: {
      backgroundColor: colors.success,
    } as ViewStyle,
    optionLabelIncorrect: {
      backgroundColor: colors.error,
    } as ViewStyle,
    optionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    } as TextStyle,
    optionLabelTextCorrect: {
      color: colors.white,
    } as TextStyle,
    optionLabelTextIncorrect: {
      color: colors.white,
    } as TextStyle,
    optionLabelSelected: {
      color: colors.primary,
    } as TextStyle,

    // Option text
    optionText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    } as TextStyle,
    optionTextCorrect: {
      color: isDarkMode ? '#86efac' : colors.success, // green-300
      fontWeight: '600',
    } as TextStyle,
    optionTextIncorrect: {
      color: isDarkMode ? '#fca5a5' : colors.error, // red-300
    } as TextStyle,

    // Checkmark and crossmark
    checkmark: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing[2],
      // Glow
      shadowColor: greenGlow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    } as ViewStyle,
    checkmarkText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    } as TextStyle,
    crossmark: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing[2],
      // Glow
      shadowColor: redGlow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    } as ViewStyle,
    crossmarkText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    } as TextStyle,

    // Explanation
    explanationContainer: {
      marginTop: spacing[5],
      padding: spacing[4],
      backgroundColor: isDarkMode ? 'rgba(39, 39, 42, 0.6)' : colors.backgroundSecondary,
      borderRadius: 14,
      borderLeftWidth: 4,
      borderLeftColor: colors.info,
    } as ViewStyle,
    explanationLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.info,
      marginBottom: spacing[2],
    } as TextStyle,
    explanationText: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    } as TextStyle,

    // Result indicator (top right)
    resultIndicator: {
      position: 'absolute',
      top: spacing[4],
      right: spacing[4],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: 10,
      // Glow shadow
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,
    resultCorrect: {
      backgroundColor: colors.success,
      shadowColor: greenGlow,
    } as ViewStyle,
    resultIncorrect: {
      backgroundColor: colors.error,
      shadowColor: redGlow,
    } as ViewStyle,
    resultText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
    } as TextStyle,
  });
}

export default QuizCard;
