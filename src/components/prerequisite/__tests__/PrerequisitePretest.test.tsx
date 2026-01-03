/**
 * PrerequisitePretest Tests
 *
 * Tests for the PrerequisitePretest component:
 * - Renders question text and options
 * - Shows progress indicator
 * - Calls onAnswer when option selected
 * - Shows feedback after answering
 * - Shows correct/incorrect feedback
 * - Shows complete button on last question
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PrerequisitePretest } from '../PrerequisitePretest';
import type { PretestQuestion } from '../../../types/prerequisite';

/**
 * Create mock question
 */
function createMockQuestion(overrides: Partial<PretestQuestion> = {}): PretestQuestion {
  return {
    id: 'question-1',
    prerequisite_id: 'prereq-1',
    question_text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct_index: 1,
    explanation: '2 + 2 equals 4',
    difficulty: 'basic',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('PrerequisitePretest', () => {
  const mockOnAnswer = jest.fn();
  const mockOnComplete = jest.fn();

  const defaultProps = {
    questions: [createMockQuestion()],
    currentQuestionIndex: 0,
    onAnswer: mockOnAnswer,
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders question text', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    expect(screen.getByText('What is 2 + 2?')).toBeTruthy();
  });

  it('renders all answer options', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('shows progress indicator', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
  });

  it('shows correct progress for multiple questions', () => {
    const questions = [
      createMockQuestion({ id: 'q1' }),
      createMockQuestion({ id: 'q2' }),
      createMockQuestion({ id: 'q3' }),
    ];

    render(
      <PrerequisitePretest
        {...defaultProps}
        questions={questions}
        currentQuestionIndex={1}
      />
    );

    expect(screen.getByText('Question 2 of 3')).toBeTruthy();
  });

  it('calls onAnswer when option is selected', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    const option = screen.getByText('4');
    fireEvent.press(option);

    expect(mockOnAnswer).toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('shows feedback after answering correctly', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    const correctOption = screen.getByText('4'); // Index 1 is correct
    fireEvent.press(correctOption);

    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(screen.getByText('2 + 2 equals 4')).toBeTruthy();
  });

  it('shows feedback after answering incorrectly', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    const wrongOption = screen.getByText('3'); // Index 0 is wrong
    fireEvent.press(wrongOption);

    expect(screen.getByText('Not quite')).toBeTruthy();
  });

  it('shows empty state when no questions', () => {
    render(
      <PrerequisitePretest {...defaultProps} questions={[]} />
    );

    expect(screen.getByText('No pretest questions available.')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('shows complete state when past last question', () => {
    render(
      <PrerequisitePretest
        {...defaultProps}
        questions={[createMockQuestion()]}
        currentQuestionIndex={1}
      />
    );

    expect(screen.getByText('Pretest complete!')).toBeTruthy();
    expect(screen.getByText('See Results')).toBeTruthy();
  });

  it('shows See Results button on last question after answering', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    const option = screen.getByText('4');
    fireEvent.press(option);

    // Should show See Results button
    expect(screen.getByTestId('prerequisite-pretest-complete-button')).toBeTruthy();
  });

  it('disables options after answering', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    const option = screen.getByText('4');
    fireEvent.press(option);

    // Try pressing another option
    const anotherOption = screen.getByText('3');
    fireEvent.press(anotherOption);

    // onAnswer should only be called once
    expect(mockOnAnswer).toHaveBeenCalledTimes(1);
  });

  it('has accessible header', () => {
    render(<PrerequisitePretest {...defaultProps} />);

    expect(screen.getByText('Knowledge Check')).toBeTruthy();
  });
});
