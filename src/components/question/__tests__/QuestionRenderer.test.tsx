/**
 * QuestionRenderer Component Tests
 *
 * Tests for question routing, input component selection, and callback handling.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { QuestionRenderer, type QuestionRendererProps } from '../QuestionRenderer';
import type { QuestionType } from '../../../types/three-pass';

/**
 * Helper to render QuestionRenderer with default props
 */
function renderQuestionRenderer(props: Partial<QuestionRendererProps> = {}) {
  const defaultProps: QuestionRendererProps = {
    questionType: 'multiple_choice',
    questionText: 'What is React?',
    options: ['A library', 'A framework', 'A language', 'An OS'],
    onAnswer: jest.fn(),
    ...props,
  };
  return render(<QuestionRenderer {...defaultProps} />);
}

describe('QuestionRenderer Component', () => {
  describe('Rendering', () => {
    it('renders with testID', () => {
      renderQuestionRenderer({ testID: 'q1' });

      expect(screen.getByTestId('q1')).toBeTruthy();
      expect(screen.getByTestId('q1-card')).toBeTruthy();
      expect(screen.getByTestId('q1-input')).toBeTruthy();
    });

    it('renders the question card with question text', () => {
      renderQuestionRenderer({
        questionText: 'What is the capital of France?',
        testID: 'q1',
      });

      expect(screen.getByText('What is the capital of France?')).toBeTruthy();
    });

    it('renders question type badge', () => {
      renderQuestionRenderer({
        questionType: 'multiple_choice',
        testID: 'q1',
      });

      expect(screen.getByTestId('q1-card-badge')).toBeTruthy();
    });
  });

  describe('Question Type Routing', () => {
    describe('multiple_choice', () => {
      it('renders MCInput for multiple_choice questions', () => {
        renderQuestionRenderer({
          questionType: 'multiple_choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          testID: 'mc-q',
        });

        // MCInput renders option letters
        expect(screen.getByText('A')).toBeTruthy();
        expect(screen.getByText('B')).toBeTruthy();
        expect(screen.getByText('C')).toBeTruthy();
        expect(screen.getByText('D')).toBeTruthy();
      });

      it('passes options to MCInput', () => {
        renderQuestionRenderer({
          questionType: 'multiple_choice',
          options: ['First', 'Second'],
          testID: 'mc-q',
        });

        expect(screen.getByText('First')).toBeTruthy();
        expect(screen.getByText('Second')).toBeTruthy();
      });

      it('calls onAnswer when option is selected', () => {
        const onAnswer = jest.fn();
        renderQuestionRenderer({
          questionType: 'multiple_choice',
          options: ['Option A', 'Option B'],
          onAnswer,
          testID: 'mc-q',
        });

        fireEvent.press(screen.getByTestId('mc-q-input-option-0'));

        expect(onAnswer).toHaveBeenCalledWith('Option A');
      });
    });

    describe('true_false', () => {
      it('renders TFInput for true_false questions', () => {
        renderQuestionRenderer({
          questionType: 'true_false',
          questionText: 'The sky is blue.',
          testID: 'tf-q',
        });

        expect(screen.getByText('True')).toBeTruthy();
        expect(screen.getByText('False')).toBeTruthy();
      });

      it('calls onAnswer with True when True is selected', () => {
        const onAnswer = jest.fn();
        renderQuestionRenderer({
          questionType: 'true_false',
          onAnswer,
          testID: 'tf-q',
        });

        fireEvent.press(screen.getByTestId('tf-q-input-true'));

        expect(onAnswer).toHaveBeenCalledWith('True');
      });

      it('calls onAnswer with False when False is selected', () => {
        const onAnswer = jest.fn();
        renderQuestionRenderer({
          questionType: 'true_false',
          onAnswer,
          testID: 'tf-q',
        });

        fireEvent.press(screen.getByTestId('tf-q-input-false'));

        expect(onAnswer).toHaveBeenCalledWith('False');
      });
    });

    describe('definition_recall', () => {
      it('renders TextInput for definition_recall questions', () => {
        renderQuestionRenderer({
          questionType: 'definition_recall',
          questionText: 'Define photosynthesis.',
          testID: 'def-q',
        });

        expect(screen.getByTestId('def-q-input-input')).toBeTruthy();
        expect(screen.getByTestId('def-q-input-submit')).toBeTruthy();
      });

      it('shows definition placeholder text', () => {
        renderQuestionRenderer({
          questionType: 'definition_recall',
          testID: 'def-q',
        });

        const input = screen.getByTestId('def-q-input-input');
        expect(input.props.placeholder).toBe('Type your definition...');
      });

      it('calls onAnswer when text is submitted', () => {
        const onAnswer = jest.fn();
        renderQuestionRenderer({
          questionType: 'definition_recall',
          onAnswer,
          testID: 'def-q',
        });

        const input = screen.getByTestId('def-q-input-input');
        fireEvent.changeText(input, 'My definition');
        fireEvent.press(screen.getByTestId('def-q-input-submit'));

        expect(onAnswer).toHaveBeenCalledWith('My definition');
      });
    });

    describe('comparison', () => {
      it('renders TextInput for comparison questions', () => {
        renderQuestionRenderer({
          questionType: 'comparison',
          questionText: 'Compare X and Y.',
          testID: 'comp-q',
        });

        expect(screen.getByTestId('comp-q-input-input')).toBeTruthy();
      });

      it('shows comparison placeholder text', () => {
        renderQuestionRenderer({
          questionType: 'comparison',
          testID: 'comp-q',
        });

        const input = screen.getByTestId('comp-q-input-input');
        expect(input.props.placeholder).toBe('Describe the comparison...');
      });
    });

    describe('cause_effect', () => {
      it('renders TextInput for cause_effect questions', () => {
        renderQuestionRenderer({
          questionType: 'cause_effect',
          questionText: 'Explain the cause and effect.',
          testID: 'ce-q',
        });

        expect(screen.getByTestId('ce-q-input-input')).toBeTruthy();
      });

      it('shows cause_effect placeholder text', () => {
        renderQuestionRenderer({
          questionType: 'cause_effect',
          testID: 'ce-q',
        });

        const input = screen.getByTestId('ce-q-input-input');
        expect(input.props.placeholder).toBe('Explain the cause and effect...');
      });
    });

    describe('application', () => {
      it('renders TextInput for application questions', () => {
        renderQuestionRenderer({
          questionType: 'application',
          questionText: 'How would you apply this?',
          testID: 'app-q',
        });

        expect(screen.getByTestId('app-q-input-input')).toBeTruthy();
      });

      it('shows application placeholder text', () => {
        renderQuestionRenderer({
          questionType: 'application',
          testID: 'app-q',
        });

        const input = screen.getByTestId('app-q-input-input');
        expect(input.props.placeholder).toBe('Describe how you would apply this...');
      });
    });

    describe('sequence', () => {
      it('renders DragList for sequence questions', () => {
        renderQuestionRenderer({
          questionType: 'sequence',
          options: ['Step 1', 'Step 2', 'Step 3'],
          testID: 'seq-q',
        });

        // DragList shows order numbers
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
      });

      it('renders sequence items', () => {
        renderQuestionRenderer({
          questionType: 'sequence',
          options: ['First step', 'Second step', 'Third step'],
          testID: 'seq-q',
        });

        expect(screen.getByText('First step')).toBeTruthy();
        expect(screen.getByText('Second step')).toBeTruthy();
        expect(screen.getByText('Third step')).toBeTruthy();
      });

      it('calls onAnswer with ordered items when submitted', () => {
        const onAnswer = jest.fn();
        renderQuestionRenderer({
          questionType: 'sequence',
          options: ['A', 'B', 'C'],
          onAnswer,
          testID: 'seq-q',
        });

        fireEvent.press(screen.getByTestId('seq-q-input-submit'));

        expect(onAnswer).toHaveBeenCalledWith('A,B,C');
      });
    });
  });

  describe('Disabled State', () => {
    it('passes disabled to MCInput', () => {
      const onAnswer = jest.fn();
      renderQuestionRenderer({
        questionType: 'multiple_choice',
        options: ['A', 'B'],
        onAnswer,
        disabled: true,
        testID: 'mc-q',
      });

      fireEvent.press(screen.getByTestId('mc-q-input-option-0'));

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('passes disabled to TFInput', () => {
      const onAnswer = jest.fn();
      renderQuestionRenderer({
        questionType: 'true_false',
        onAnswer,
        disabled: true,
        testID: 'tf-q',
      });

      fireEvent.press(screen.getByTestId('tf-q-input-true'));

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('passes disabled to TextInput', () => {
      renderQuestionRenderer({
        questionType: 'definition_recall',
        disabled: true,
        testID: 'def-q',
      });

      const input = screen.getByTestId('def-q-input-input');
      expect(input.props.editable).toBe(false);
    });

    it('passes disabled to DragList', () => {
      const onAnswer = jest.fn();
      renderQuestionRenderer({
        questionType: 'sequence',
        options: ['A', 'B', 'C'],
        onAnswer,
        disabled: true,
        testID: 'seq-q',
      });

      fireEvent.press(screen.getByTestId('seq-q-input-submit'));

      expect(onAnswer).not.toHaveBeenCalled();
    });
  });

  describe('All Question Types Coverage', () => {
    const questionTypes: QuestionType[] = [
      'multiple_choice',
      'true_false',
      'definition_recall',
      'comparison',
      'sequence',
      'cause_effect',
      'application',
    ];

    it.each(questionTypes)('renders correctly for %s question type', (questionType) => {
      const needsOptions = ['multiple_choice', 'sequence'].includes(questionType);

      renderQuestionRenderer({
        questionType,
        questionText: `Test question for ${questionType}`,
        options: needsOptions ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
        testID: 'test-q',
      });

      expect(screen.getByTestId('test-q')).toBeTruthy();
      expect(screen.getByTestId('test-q-card')).toBeTruthy();
      expect(screen.getByTestId('test-q-input')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('question card has correct accessibility label', () => {
      renderQuestionRenderer({
        questionType: 'multiple_choice',
        questionText: 'What is 2 + 2?',
        testID: 'q1',
      });

      const card = screen.getByTestId('q1-card');
      expect(card.props.accessibilityLabel).toContain('What is 2 + 2?');
    });
  });
});
