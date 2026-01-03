/**
 * QuestionCard Component
 *
 * A card component that displays a question with:
 * - Question text with proper typography and readable line height
 * - Optional question type badge (color-coded)
 * - Support for all question types from QuestionType
 *
 * Used in the Learning Session UI to display questions before the user answers.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { QuestionType } from '../../types/three-pass';
import { colors, spacing, fontSize, fontWeight, lineHeight } from '../../theme';
import { Card } from '../ui';

/**
 * Question type display configuration
 * Maps each question type to its display label and color
 */
const QUESTION_TYPE_CONFIG: Record<
  QuestionType,
  { label: string; color: string }
> = {
  definition_recall: {
    label: 'Definition',
    color: '#3B82F6', // Blue - factual recall
  },
  true_false: {
    label: 'True/False',
    color: '#8B5CF6', // Purple - binary choice
  },
  multiple_choice: {
    label: 'Multiple Choice',
    color: '#6366F1', // Indigo - selection
  },
  comparison: {
    label: 'Comparison',
    color: '#EC4899', // Pink - analytical
  },
  sequence: {
    label: 'Sequence',
    color: '#F97316', // Orange - ordering
  },
  cause_effect: {
    label: 'Cause & Effect',
    color: '#14B8A6', // Teal - relationships
  },
  application: {
    label: 'Application',
    color: '#22C55E', // Green - practical
  },
};

/**
 * Props for the QuestionCard component
 */
export interface QuestionCardProps {
  /** The question text to display */
  questionText: string;
  /** Optional question type to show as a badge */
  questionType?: QuestionType;
  /** Test ID for testing purposes */
  testID?: string;
  /** Optional custom styles for the card */
  style?: StyleProp<ViewStyle>;
}

/**
 * Get display configuration for a question type
 */
function getQuestionTypeConfig(type: QuestionType): { label: string; color: string } {
  return QUESTION_TYPE_CONFIG[type];
}

/**
 * QuestionTypeBadge Component
 *
 * A small badge that displays the question type with appropriate color coding
 */
function QuestionTypeBadge({
  type,
  testID,
}: {
  type: QuestionType;
  testID?: string;
}): React.ReactElement {
  const config = getQuestionTypeConfig(type);

  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: config.color }]}
      accessible={true}
      accessibilityLabel={`Question type: ${config.label}`}
      accessibilityRole="text"
    >
      <Text style={styles.badgeText}>{config.label}</Text>
    </View>
  );
}

/**
 * QuestionCard Component
 *
 * @example
 * ```tsx
 * <QuestionCard
 *   questionText="What is the primary purpose of React Hooks?"
 *   questionType="definition_recall"
 *   testID="question-1"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Without badge
 * <QuestionCard
 *   questionText="Explain the difference between useState and useReducer."
 * />
 * ```
 */
export function QuestionCard({
  questionText,
  questionType,
  testID = 'question-card',
  style,
}: QuestionCardProps): React.ReactElement {
  const accessibilityLabel = questionType
    ? `${getQuestionTypeConfig(questionType).label} question: ${questionText}`
    : `Question: ${questionText}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={style}
    >
      <Card style={styles.card}>
        {/* Question Type Badge (optional) */}
        {questionType && (
          <View style={styles.badgeContainer}>
            <QuestionTypeBadge
              type={questionType}
              testID={`${testID}-badge`}
            />
          </View>
        )}

        {/* Question Text */}
        <Text
          testID={`${testID}-text`}
          style={styles.questionText}
          accessibilityRole="text"
        >
          {questionText}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
  },
  badgeContainer: {
    marginBottom: spacing[3],
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
    lineHeight: fontSize.lg * lineHeight.relaxed,
  },
});

export default QuestionCard;
