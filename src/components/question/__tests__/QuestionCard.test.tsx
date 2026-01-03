/**
 * QuestionCard Component Tests
 *
 * Tests for the QuestionCard component covering:
 * - Renders question text with proper styling
 * - Displays question type badge when provided
 * - Supports all question types from QuestionType
 * - testID props work correctly
 * - Accessibility labels present
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { QuestionCard } from '../QuestionCard';
import type { QuestionType } from '../../../types/three-pass';

describe('QuestionCard Component', () => {
  describe('Rendering', () => {
    it('renders question text', () => {
      render(
        <QuestionCard
          questionText="What is the primary purpose of React Hooks?"
          testID="question-card"
        />
      );

      expect(
        screen.getByText('What is the primary purpose of React Hooks?')
      ).toBeTruthy();
    });

    it('renders with default testID', () => {
      render(
        <QuestionCard questionText="Sample question text" />
      );

      expect(screen.getByTestId('question-card')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      render(
        <QuestionCard
          questionText="Sample question text"
          testID="my-question"
        />
      );

      expect(screen.getByTestId('my-question')).toBeTruthy();
      expect(screen.queryByTestId('question-card')).toBeNull();
    });

    it('renders without badge when questionType is not provided', () => {
      render(
        <QuestionCard
          questionText="Sample question text"
          testID="question-card"
        />
      );

      expect(screen.queryByTestId('question-card-badge')).toBeNull();
    });

    it('renders badge when questionType is provided', () => {
      render(
        <QuestionCard
          questionText="Sample question text"
          questionType="definition_recall"
          testID="question-card"
        />
      );

      expect(screen.getByTestId('question-card-badge')).toBeTruthy();
      expect(screen.getByText('Definition')).toBeTruthy();
    });
  });

  describe('Question Type Badge', () => {
    const questionTypesToTest: Array<{
      type: QuestionType;
      expectedLabel: string;
      expectedColor: string;
    }> = [
      { type: 'definition_recall', expectedLabel: 'Definition', expectedColor: '#3B82F6' },
      { type: 'true_false', expectedLabel: 'True/False', expectedColor: '#8B5CF6' },
      { type: 'multiple_choice', expectedLabel: 'Multiple Choice', expectedColor: '#6366F1' },
      { type: 'comparison', expectedLabel: 'Comparison', expectedColor: '#EC4899' },
      { type: 'sequence', expectedLabel: 'Sequence', expectedColor: '#F97316' },
      { type: 'cause_effect', expectedLabel: 'Cause & Effect', expectedColor: '#14B8A6' },
      { type: 'application', expectedLabel: 'Application', expectedColor: '#22C55E' },
    ];

    it.each(questionTypesToTest)(
      'displays $type badge with correct label "$expectedLabel"',
      ({ type, expectedLabel }) => {
        render(
          <QuestionCard
            questionText="Sample question"
            questionType={type}
            testID="question-card"
          />
        );

        expect(screen.getByText(expectedLabel)).toBeTruthy();
      }
    );

    it.each(questionTypesToTest)(
      'displays $type badge with correct color',
      ({ type, expectedColor }) => {
        render(
          <QuestionCard
            questionText="Sample question"
            questionType={type}
            testID="question-card"
          />
        );

        const badge = screen.getByTestId('question-card-badge');
        const styles = badge.props.style;
        const flatStyles = Array.isArray(styles)
          ? styles.reduce((acc: Record<string, unknown>, s: Record<string, unknown>) => ({ ...acc, ...s }), {})
          : styles;

        expect(flatStyles.backgroundColor).toBe(expectedColor);
      }
    );
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      render(
        <QuestionCard
          questionText="Sample question text"
          testID="question-card"
        />
      );

      const card = screen.getByTestId('question-card');
      expect(card.props.accessible).toBe(true);
    });

    it('has accessibility label for question without type', () => {
      render(
        <QuestionCard
          questionText="What is React?"
          testID="question-card"
        />
      );

      const card = screen.getByTestId('question-card');
      expect(card.props.accessibilityLabel).toBe('Question: What is React?');
    });

    it('has accessibility label including question type when provided', () => {
      render(
        <QuestionCard
          questionText="What is React?"
          questionType="definition_recall"
          testID="question-card"
        />
      );

      const card = screen.getByTestId('question-card');
      expect(card.props.accessibilityLabel).toBe(
        'Definition question: What is React?'
      );
    });

    it('badge has accessibility label', () => {
      render(
        <QuestionCard
          questionText="Sample question"
          questionType="true_false"
          testID="question-card"
        />
      );

      const badge = screen.getByTestId('question-card-badge');
      expect(badge.props.accessibilityLabel).toBe('Question type: True/False');
    });

    it('has correct accessibility role', () => {
      render(
        <QuestionCard
          questionText="Sample question text"
          testID="question-card"
        />
      );

      const card = screen.getByTestId('question-card');
      expect(card.props.accessibilityRole).toBe('text');
    });
  });

  describe('Test ID Propagation', () => {
    it('applies testID prefix to text element', () => {
      render(
        <QuestionCard
          questionText="Sample question"
          testID="my-question"
        />
      );

      expect(screen.getByTestId('my-question-text')).toBeTruthy();
    });

    it('applies testID prefix to badge element', () => {
      render(
        <QuestionCard
          questionText="Sample question"
          questionType="multiple_choice"
          testID="my-question"
        />
      );

      expect(screen.getByTestId('my-question-badge')).toBeTruthy();
    });
  });

  describe('Question Text Typography', () => {
    it('renders question text element', () => {
      render(
        <QuestionCard
          questionText="This is a test question with proper typography?"
          testID="question-card"
        />
      );

      const textElement = screen.getByTestId('question-card-text');
      expect(textElement).toBeTruthy();
    });

    it('displays long question text correctly', () => {
      const longQuestion =
        'This is a very long question that tests the typography and line height of the QuestionCard component to ensure it displays properly with readable text formatting and wrapping behavior on multiple lines?';

      render(
        <QuestionCard
          questionText={longQuestion}
          testID="question-card"
        />
      );

      expect(screen.getByText(longQuestion)).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('accepts custom style prop', () => {
      render(
        <QuestionCard
          questionText="Sample question"
          testID="question-card"
          style={{ marginBottom: 20 }}
        />
      );

      const card = screen.getByTestId('question-card');
      const styles = card.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce((acc: Record<string, unknown>, s: Record<string, unknown>) => ({ ...acc, ...s }), {})
        : styles;

      expect(flatStyles.marginBottom).toBe(20);
    });
  });
});
