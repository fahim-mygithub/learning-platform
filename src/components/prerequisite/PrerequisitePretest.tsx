/**
 * PrerequisitePretest Component
 *
 * A screen component for taking the prerequisite pretest.
 * Shows one question at a time with progress indicator.
 *
 * Features:
 * - Reuses MCInput for multiple choice answers
 * - Progress bar showing question position
 * - Auto-advances after answer selection
 * - Tracks response time for each question
 * - Mobile-first design with 56px touch targets
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { MCInput } from '../question/MCInput';
import { QuestionCard } from '../question/QuestionCard';
import { Progress, Button, Card } from '../ui';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import type { PretestQuestion } from '../../types/prerequisite';

/**
 * Props for the PrerequisitePretest component
 */
export interface PrerequisitePretestProps {
  /** Array of pretest questions */
  questions: PretestQuestion[];
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Callback when user selects an answer */
  onAnswer: (selectedIndex: number, responseTimeMs: number) => void;
  /** Callback when all questions are answered */
  onComplete: () => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Delay before auto-advancing to next question (in ms)
 */
const AUTO_ADVANCE_DELAY = 800;

/**
 * PrerequisitePretest Component
 *
 * @example
 * ```tsx
 * <PrerequisitePretest
 *   questions={pretestQuestions}
 *   currentQuestionIndex={currentIndex}
 *   onAnswer={(index, time) => submitAnswer(index, time)}
 *   onComplete={() => completePretest()}
 * />
 * ```
 */
export function PrerequisitePretest({
  questions,
  currentQuestionIndex,
  onAnswer,
  onComplete,
  isLoading = false,
  testID = 'prerequisite-pretest',
}: PrerequisitePretestProps): React.ReactElement {
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const responseStartTimeRef = useRef<number>(Date.now());

  // Reset state when question changes
  useEffect(() => {
    setHasAnswered(false);
    setSelectedIndex(null);
    responseStartTimeRef.current = Date.now();
  }, [currentQuestionIndex]);

  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  /**
   * Handle answer selection
   */
  const handleAnswer = useCallback(
    (answer: string) => {
      if (hasAnswered || !currentQuestion) return;

      const answerIndex = currentQuestion.options.indexOf(answer);
      if (answerIndex === -1) return;

      const responseTimeMs = Date.now() - responseStartTimeRef.current;

      setHasAnswered(true);
      setSelectedIndex(answerIndex);

      // Submit the answer
      onAnswer(answerIndex, responseTimeMs);

      // Auto-advance after delay
      setTimeout(() => {
        if (isLastQuestion) {
          onComplete();
        }
      }, AUTO_ADVANCE_DELAY);
    },
    [hasAnswered, currentQuestion, onAnswer, isLastQuestion, onComplete]
  );

  // Handle case where there are no questions
  if (questions.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pretest questions available.</Text>
          <Button onPress={onComplete} variant="primary">
            Continue
          </Button>
        </View>
      </View>
    );
  }

  // Handle case where current question is invalid
  if (!currentQuestion) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Pretest complete!</Text>
          <Button onPress={onComplete} variant="primary" loading={isLoading}>
            See Results
          </Button>
        </View>
      </View>
    );
  }

  const isCorrect = selectedIndex === currentQuestion.correct_index;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
    >
      {/* Header with progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knowledge Check</Text>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Progress
          variant="bar"
          value={progress}
          testID={`${testID}-progress`}
          accessibilityLabel={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
        />
      </View>

      {/* Question card */}
      <Card style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
      </Card>

      {/* Answer options */}
      <View style={styles.optionsContainer}>
        <MCInput
          options={currentQuestion.options}
          onAnswer={handleAnswer}
          disabled={hasAnswered}
          testID={`${testID}-options`}
        />
      </View>

      {/* Feedback after answering */}
      {hasAnswered && (
        <View
          style={[
            styles.feedbackContainer,
            isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
          ]}
          testID={`${testID}-feedback`}
          accessible={true}
          accessibilityLabel={isCorrect ? 'Correct answer' : 'Incorrect answer'}
        >
          <Text style={styles.feedbackIcon}>
            {isCorrect ? 'V' : 'X'}
          </Text>
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackTitle}>
              {isCorrect ? 'Correct!' : 'Not quite'}
            </Text>
            {currentQuestion.explanation && (
              <Text style={styles.feedbackExplanation}>
                {currentQuestion.explanation}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Manual continue button (shown if auto-advance doesn't trigger) */}
      {hasAnswered && isLastQuestion && (
        <View style={styles.continueContainer}>
          <Button
            onPress={onComplete}
            variant="primary"
            size="large"
            loading={isLoading}
            testID={`${testID}-complete-button`}
          >
            See Results
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  } as ViewStyle,
  header: {
    marginBottom: spacing[4],
  } as ViewStyle,
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing[1],
  } as TextStyle,
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  } as TextStyle,
  progressContainer: {
    marginBottom: spacing[4],
  } as ViewStyle,
  questionCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  } as ViewStyle,
  questionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
    lineHeight: fontSize.lg * 1.5,
  } as TextStyle,
  optionsContainer: {
    marginBottom: spacing[4],
  } as ViewStyle,
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing[4],
    textAlign: 'center',
  } as TextStyle,
  feedbackContainer: {
    flexDirection: 'row',
    padding: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[4],
  } as ViewStyle,
  feedbackCorrect: {
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: colors.success,
  } as ViewStyle,
  feedbackIncorrect: {
    backgroundColor: `${colors.error}15`,
    borderWidth: 1,
    borderColor: colors.error,
  } as ViewStyle,
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 32,
    marginRight: spacing[3],
    overflow: 'hidden',
  } as TextStyle,
  feedbackContent: {
    flex: 1,
  } as ViewStyle,
  feedbackTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[1],
  } as TextStyle,
  feedbackExplanation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  } as TextStyle,
  continueContainer: {
    marginTop: spacing[4],
  } as ViewStyle,
});

export default PrerequisitePretest;
