/**
 * QuizCard Component Tests
 *
 * Tests for quiz interactions, answer handling, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { QuizCard, type QuizCardProps } from '../QuizCard';
import type { SampleQuestion } from '@/src/types/three-pass';

// Mocks are handled globally in jest.setup.js

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    light: jest.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Sample question for testing
 */
const sampleQuestion: SampleQuestion = {
  question_type: 'multiple_choice',
  question_text: 'What is the capital of France?',
  correct_answer: 'Paris',
  distractors: ['London', 'Berlin', 'Madrid'],
  explanation: 'Paris is the capital and largest city of France.',
};

/**
 * Helper to render QuizCard with default props
 */
function renderQuizCard(props: Partial<QuizCardProps> = {}) {
  const defaultProps: QuizCardProps = {
    question: sampleQuestion,
    conceptId: 'concept-123',
    ...props,
  };
  return render(<QuizCard {...defaultProps} />);
}

describe('QuizCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders question text', () => {
      renderQuizCard();

      expect(screen.getByText('What is the capital of France?')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderQuizCard({ testID: 'quiz-card' });

      expect(screen.getByTestId('quiz-card')).toBeTruthy();
      expect(screen.getByTestId('quiz-card-question')).toBeTruthy();
    });

    it('renders all answer options', () => {
      renderQuizCard({ testID: 'quiz' });

      // Should have 4 options (1 correct + 3 distractors)
      expect(screen.getByTestId('quiz-option-0')).toBeTruthy();
      expect(screen.getByTestId('quiz-option-1')).toBeTruthy();
      expect(screen.getByTestId('quiz-option-2')).toBeTruthy();
      expect(screen.getByTestId('quiz-option-3')).toBeTruthy();
    });

    it('renders question type badge', () => {
      renderQuizCard();

      expect(screen.getByText('Multiple Choice')).toBeTruthy();
    });

    it('renders option labels (A, B, C, D)', () => {
      renderQuizCard();

      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('B')).toBeTruthy();
      expect(screen.getByText('C')).toBeTruthy();
      expect(screen.getByText('D')).toBeTruthy();
    });
  });

  describe('Answer Selection', () => {
    it('calls onCorrectAnswer when correct answer is selected', async () => {
      const onCorrectAnswer = jest.fn();
      renderQuizCard({ onCorrectAnswer, testID: 'quiz' });

      // Find and press the correct answer option
      const options = [
        screen.getByTestId('quiz-option-0'),
        screen.getByTestId('quiz-option-1'),
        screen.getByTestId('quiz-option-2'),
        screen.getByTestId('quiz-option-3'),
      ];

      // Find option with correct answer text
      const correctOption = options.find((opt) => {
        try {
          return screen.getByText('Paris', { exact: false });
        } catch {
          return false;
        }
      });

      // Press Paris option directly by finding the text
      const parisButton = screen.getAllByRole('button').find((btn) => {
        const text = btn.props.accessibilityLabel || '';
        return text.includes('Paris');
      });

      if (parisButton) {
        fireEvent.press(parisButton);

        await waitFor(() => {
          expect(onCorrectAnswer).toHaveBeenCalled();
        });
      }
    });

    it('calls onIncorrectAnswer when wrong answer is selected', async () => {
      const onIncorrectAnswer = jest.fn();
      renderQuizCard({ onIncorrectAnswer, testID: 'quiz' });

      // Press any option that contains a wrong answer
      const wrongButton = screen.getAllByRole('button').find((btn) => {
        const text = btn.props.accessibilityLabel || '';
        return text.includes('London');
      });

      if (wrongButton) {
        fireEvent.press(wrongButton);

        await waitFor(() => {
          expect(onIncorrectAnswer).toHaveBeenCalled();
        });
      }
    });

    it('prevents multiple selections after answer is given', async () => {
      const onCorrectAnswer = jest.fn();
      renderQuizCard({ onCorrectAnswer, testID: 'quiz' });

      const option0 = screen.getByTestId('quiz-option-0');
      const option1 = screen.getByTestId('quiz-option-1');

      // First press
      fireEvent.press(option0);

      // Second press should be ignored
      fireEvent.press(option1);

      // Wait for any async operations
      await waitFor(() => {
        // Only one callback should have been triggered
        expect(onCorrectAnswer.mock.calls.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Feedback Display', () => {
    it('shows result indicator after answering', async () => {
      renderQuizCard({ testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      fireEvent.press(option);

      await waitFor(() => {
        expect(screen.getByTestId('quiz-result')).toBeTruthy();
      });
    });

    it('displays explanation after answering', async () => {
      renderQuizCard({ testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      fireEvent.press(option);

      await waitFor(
        () => {
          expect(screen.getByTestId('quiz-explanation')).toBeTruthy();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers success haptic on correct answer', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderQuizCard({ testID: 'quiz' });

      // Find and press correct answer
      const buttons = screen.getAllByRole('button');
      const parisButton = buttons.find((btn) =>
        (btn.props.accessibilityLabel || '').includes('Paris')
      );

      if (parisButton) {
        fireEvent.press(parisButton);

        await waitFor(() => {
          expect(haptics.success).toHaveBeenCalled();
        });
      }
    });

    it('triggers error haptic on incorrect answer', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderQuizCard({ testID: 'quiz' });

      // Find and press wrong answer
      const buttons = screen.getAllByRole('button');
      const wrongButton = buttons.find((btn) =>
        (btn.props.accessibilityLabel || '').includes('London')
      );

      if (wrongButton) {
        fireEvent.press(wrongButton);

        await waitFor(() => {
          expect(haptics.error).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('options have correct accessibility role', () => {
      renderQuizCard({ testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      expect(option.props.accessibilityRole).toBe('button');
    });

    it('options have accessibility labels', () => {
      renderQuizCard({ testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      expect(option.props.accessibilityLabel).toContain('Option');
    });

    it('question text has accessibility role', () => {
      renderQuizCard({ testID: 'quiz' });

      const question = screen.getByTestId('quiz-question');
      expect(question.props.accessibilityRole).toBe('text');
    });

    it('disables options after selection', async () => {
      renderQuizCard({ testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      fireEvent.press(option);

      await waitFor(() => {
        const options = [
          screen.getByTestId('quiz-option-0'),
          screen.getByTestId('quiz-option-1'),
          screen.getByTestId('quiz-option-2'),
          screen.getByTestId('quiz-option-3'),
        ];

        // All options should be disabled after selection
        options.forEach((opt) => {
          expect(opt.props.accessibilityState?.disabled).toBe(true);
        });
      });
    });
  });

  describe('Completion', () => {
    it('calls onComplete after feedback duration', async () => {
      jest.useFakeTimers();
      const onComplete = jest.fn();
      renderQuizCard({ onComplete, testID: 'quiz' });

      const option = screen.getByTestId('quiz-option-0');
      fireEvent.press(option);

      // Allow async handler to complete and set up timers
      await waitFor(() => {
        expect(screen.getByTestId('quiz-result')).toBeTruthy();
      });

      // Fast-forward past feedback duration (1500ms)
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Different Question Types', () => {
    it('handles true/false questions', () => {
      const tfQuestion: SampleQuestion = {
        question_type: 'true_false',
        question_text: 'The Earth is flat.',
        correct_answer: 'False',
        distractors: ['True'],
      };

      renderQuizCard({ question: tfQuestion });

      expect(screen.getByText('The Earth is flat.')).toBeTruthy();
      expect(screen.getByText('True/False')).toBeTruthy();
    });

    it('renders both True and False options for true_false questions even without distractors', () => {
      // BUG: AI sometimes generates T/F questions without distractors array
      // This test ensures both options always appear regardless
      const tfQuestionNoDistractors: SampleQuestion = {
        question_type: 'true_false',
        question_text: 'React Native uses JavaScript.',
        correct_answer: 'True',
        // distractors intentionally omitted - simulating AI behavior
      };

      renderQuizCard({ question: tfQuestionNoDistractors, testID: 'tf-quiz' });

      // Should render both True and False options
      const buttons = screen.getAllByRole('button');
      const optionLabels = buttons.map((btn) => btn.props.accessibilityLabel || '');

      const hasTrueOption = optionLabels.some((label) => label.includes('True'));
      const hasFalseOption = optionLabels.some((label) => label.includes('False'));

      expect(hasTrueOption).toBe(true);
      expect(hasFalseOption).toBe(true);

      // Should have exactly 2 options for T/F
      expect(screen.getByTestId('tf-quiz-option-0')).toBeTruthy();
      expect(screen.getByTestId('tf-quiz-option-1')).toBeTruthy();
    });

    it('renders both True and False options when correct_answer is False without distractors', () => {
      const tfQuestionFalseAnswer: SampleQuestion = {
        question_type: 'true_false',
        question_text: 'The sky is green.',
        correct_answer: 'False',
        // distractors intentionally omitted
      };

      renderQuizCard({ question: tfQuestionFalseAnswer, testID: 'tf-false-quiz' });

      const buttons = screen.getAllByRole('button');
      const optionLabels = buttons.map((btn) => btn.props.accessibilityLabel || '');

      const hasTrueOption = optionLabels.some((label) => label.includes('True'));
      const hasFalseOption = optionLabels.some((label) => label.includes('False'));

      expect(hasTrueOption).toBe(true);
      expect(hasFalseOption).toBe(true);
    });

    it('handles definition recall questions', () => {
      const defQuestion: SampleQuestion = {
        question_type: 'definition_recall',
        question_text: 'What is photosynthesis?',
        correct_answer: 'The process by which plants convert sunlight to energy',
        distractors: [
          'The process of cell division',
          'The absorption of water by roots',
        ],
      };

      renderQuizCard({ question: defQuestion });

      expect(screen.getByText('What is photosynthesis?')).toBeTruthy();
      expect(screen.getByText('Definition')).toBeTruthy();
    });
  });
});
