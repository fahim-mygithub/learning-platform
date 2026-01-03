/**
 * QuestionRenderer Component
 *
 * Routes to appropriate input component based on question type.
 * Combines QuestionCard (to display the question) with the appropriate input component:
 * - multiple_choice -> MCInput
 * - true_false -> TFInput
 * - definition_recall, comparison, cause_effect, application -> TextInput
 * - sequence -> DragList
 */

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { QuestionType } from '../../types/three-pass';
import { spacing } from '../../theme';
import { QuestionCard } from './QuestionCard';
import { MCInput } from './MCInput';
import { TFInput } from './TFInput';
import { TextInput } from './TextInput';
import { DragList } from './DragList';

/**
 * Props for the QuestionRenderer component
 */
export interface QuestionRendererProps {
  /** The type of question, determines which input component to render */
  questionType: QuestionType;
  /** The question text to display */
  questionText: string;
  /** Options for multiple choice and sequence questions */
  options?: string[];
  /** Callback when the user answers the question */
  onAnswer: (answer: string) => void;
  /** Whether the input is disabled (e.g., after answering) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Custom style for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Question types that use free-text TextInput
 */
const TEXT_INPUT_TYPES: QuestionType[] = [
  'definition_recall',
  'comparison',
  'cause_effect',
  'application',
];

/**
 * Get placeholder text based on question type
 */
function getPlaceholderText(questionType: QuestionType): string {
  switch (questionType) {
    case 'definition_recall':
      return 'Type your definition...';
    case 'comparison':
      return 'Describe the comparison...';
    case 'cause_effect':
      return 'Explain the cause and effect...';
    case 'application':
      return 'Describe how you would apply this...';
    default:
      return 'Type your answer...';
  }
}

/**
 * QuestionRenderer Component
 *
 * Displays a question card with the appropriate input component based on question type.
 *
 * @example
 * ```tsx
 * // Multiple choice question
 * <QuestionRenderer
 *   questionType="multiple_choice"
 *   questionText="What is the primary benefit of React Hooks?"
 *   options={['Better performance', 'Cleaner code', 'Easier testing', 'All of the above']}
 *   onAnswer={(answer) => console.log('Selected:', answer)}
 * />
 *
 * // True/False question
 * <QuestionRenderer
 *   questionType="true_false"
 *   questionText="React is a JavaScript framework."
 *   onAnswer={(answer) => console.log('Answer:', answer)}
 * />
 *
 * // Definition recall (free text)
 * <QuestionRenderer
 *   questionType="definition_recall"
 *   questionText="Define the term 'closure' in JavaScript."
 *   onAnswer={(answer) => console.log('Definition:', answer)}
 * />
 *
 * // Sequence question
 * <QuestionRenderer
 *   questionType="sequence"
 *   questionText="Arrange the React lifecycle methods in order."
 *   options={['componentDidMount', 'render', 'constructor', 'componentWillUnmount']}
 *   onAnswer={(order) => console.log('Order:', order)}
 * />
 * ```
 */
export function QuestionRenderer({
  questionType,
  questionText,
  options = [],
  onAnswer,
  disabled = false,
  testID = 'question-renderer',
  style,
}: QuestionRendererProps): React.ReactElement {
  /**
   * Render the appropriate input component based on question type
   */
  const renderInput = (): React.ReactElement => {
    const inputTestID = `${testID}-input`;

    switch (questionType) {
      case 'multiple_choice':
        return (
          <MCInput
            options={options}
            onAnswer={onAnswer}
            disabled={disabled}
            testID={inputTestID}
          />
        );

      case 'true_false':
        return (
          <TFInput
            onAnswer={onAnswer}
            disabled={disabled}
            testID={inputTestID}
          />
        );

      case 'sequence':
        return (
          <DragList
            options={options}
            onAnswer={onAnswer}
            disabled={disabled}
            testID={inputTestID}
          />
        );

      default:
        // All other types use TextInput (definition_recall, comparison, cause_effect, application)
        if (TEXT_INPUT_TYPES.includes(questionType)) {
          return (
            <TextInput
              onAnswer={onAnswer}
              disabled={disabled}
              placeholder={getPlaceholderText(questionType)}
              testID={inputTestID}
            />
          );
        }
        // Fallback for any unknown question type
        return (
          <TextInput
            onAnswer={onAnswer}
            disabled={disabled}
            placeholder="Type your answer..."
            testID={inputTestID}
          />
        );
    }
  };

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Question Card */}
      <QuestionCard
        questionText={questionText}
        questionType={questionType}
        testID={`${testID}-card`}
        style={styles.questionCard}
      />

      {/* Input Component */}
      <View style={styles.inputContainer}>
        {renderInput()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  questionCard: {
    marginBottom: spacing[4],
  },
  inputContainer: {
    width: '100%',
  },
});

export default QuestionRenderer;
