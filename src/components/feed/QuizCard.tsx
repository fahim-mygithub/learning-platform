/**
 * QuizCard Component
 *
 * Interactive quiz card for the learning feed. Displays a question with
 * multiple choice options and provides animated feedback with haptics.
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

import React, { useState, useCallback } from 'react';
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
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';
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
 */
function getAnswerOptions(question: SampleQuestion): string[] {
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
 * OptionButton Component
 *
 * Individual answer option with animated feedback
 */
function OptionButton({
  text,
  index,
  isSelected,
  isCorrect,
  answerState,
  onPress,
  testID,
}: OptionButtonProps): React.ReactElement {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  /**
   * Handle press with animation
   */
  const handlePress = useCallback(() => {
    if (answerState !== 'unanswered') return;

    // Press animation
    scale.value = withSequence(
      withSpring(0.95, ANIMATION_CONFIG.springConfig),
      withSpring(1, ANIMATION_CONFIG.springConfig)
    );

    onPress();
  }, [answerState, onPress, scale]);

  /**
   * Shake animation for incorrect answer
   */
  React.useEffect(() => {
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

  return (
    <Animated.View style={animatedStyle}>
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
        <View style={styles.optionLabelContainer}>
          <Text style={[
            styles.optionLabel,
            isSelected && answerState !== 'unanswered' && styles.optionLabelSelected,
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
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>&#10003;</Text>
          </View>
        )}
        {isSelected && !isCorrect && answerState === 'incorrect' && (
          <View style={styles.crossmark}>
            <Text style={styles.crossmarkText}>&#10007;</Text>
          </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  } as ViewStyle,
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
    marginBottom: spacing[4],
  } as ViewStyle,
  typeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
  questionContainer: {
    marginBottom: spacing[6],
  } as ViewStyle,
  questionText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 32,
  } as TextStyle,
  optionsContainer: {
    gap: spacing[3],
  } as ViewStyle,
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.borderLight,
  } as ViewStyle,
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.success,
  } as ViewStyle,
  optionIncorrect: {
    backgroundColor: '#FFEBEE',
    borderColor: colors.error,
  } as ViewStyle,
  optionDisabled: {
    opacity: 0.6,
  } as ViewStyle,
  optionLabelContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  } as ViewStyle,
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  } as TextStyle,
  optionLabelSelected: {
    color: colors.primary,
  } as TextStyle,
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  } as TextStyle,
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  } as TextStyle,
  optionTextIncorrect: {
    color: colors.error,
  } as TextStyle,
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  } as ViewStyle,
  checkmarkText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  } as TextStyle,
  crossmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[2],
  } as ViewStyle,
  crossmarkText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  } as TextStyle,
  explanationContainer: {
    marginTop: spacing[6],
    padding: spacing[4],
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  } as ViewStyle,
  explanationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
    marginBottom: spacing[2],
  } as TextStyle,
  explanationText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,
  resultIndicator: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
  } as ViewStyle,
  resultCorrect: {
    backgroundColor: colors.success,
  } as ViewStyle,
  resultIncorrect: {
    backgroundColor: colors.error,
  } as ViewStyle,
  resultText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  } as TextStyle,
});

export default QuizCard;
