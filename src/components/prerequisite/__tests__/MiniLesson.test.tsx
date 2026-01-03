/**
 * MiniLesson Tests
 *
 * Tests for the MiniLesson component:
 * - Renders lesson title and content
 * - Shows key points
 * - Shows estimated reading time
 * - Calls onComplete when Got It button pressed
 * - Shows loading state
 * - Shows error state
 * - Shows empty state
 * - Calls onBack when back button pressed
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { MiniLesson } from '../MiniLesson';
import type { MiniLesson as MiniLessonType, Prerequisite } from '../../../types/prerequisite';

/**
 * Create mock prerequisite
 */
function createMockPrerequisite(overrides: Partial<Prerequisite> = {}): Prerequisite {
  return {
    id: 'prereq-1',
    project_id: 'project-1',
    name: 'Basic Algebra',
    description: 'Understanding of algebraic operations',
    source: 'ai_inferred',
    confidence: 0.9,
    domain: 'mathematics',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock mini-lesson
 */
function createMockMiniLesson(overrides: Partial<MiniLessonType> = {}): MiniLessonType {
  return {
    id: 'lesson-1',
    prerequisite_id: 'prereq-1',
    title: 'Introduction to Algebra',
    content_markdown: 'Algebra is a branch of mathematics that deals with symbols and rules for manipulating those symbols. It allows us to represent unknown values with variables and solve equations to find those values.',
    key_points: [
      'Variables represent unknown values',
      'Equations can be solved step by step',
      'Balance must be maintained on both sides',
    ],
    estimated_minutes: 3,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('MiniLesson', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  const defaultProps = {
    prerequisite: createMockPrerequisite(),
    miniLesson: createMockMiniLesson(),
    onComplete: mockOnComplete,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lesson title', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('Introduction to Algebra')).toBeTruthy();
  });

  it('renders lesson content', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText(/Algebra is a branch of mathematics/)).toBeTruthy();
  });

  it('shows Mini-Lesson label', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('Mini-Lesson')).toBeTruthy();
  });

  it('shows estimated reading time', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('3 min read')).toBeTruthy();
  });

  it('shows key points section', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('Key Takeaways')).toBeTruthy();
    expect(screen.getByText('Variables represent unknown values')).toBeTruthy();
    expect(screen.getByText('Equations can be solved step by step')).toBeTruthy();
    expect(screen.getByText('Balance must be maintained on both sides')).toBeTruthy();
  });

  it('shows numbered bullets for key points', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('calls onComplete when Got It button is pressed', () => {
    render(<MiniLesson {...defaultProps} />);

    const completeButton = screen.getByTestId('mini-lesson-complete-button');
    fireEvent.press(completeButton);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows Back to Results button when onBack provided', () => {
    render(<MiniLesson {...defaultProps} />);

    expect(screen.getByText('Back to Results')).toBeTruthy();
  });

  it('calls onBack when Back button is pressed', () => {
    render(<MiniLesson {...defaultProps} />);

    const backButton = screen.getByTestId('mini-lesson-back-button');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('does not show Back button when onBack not provided', () => {
    render(<MiniLesson {...defaultProps} onBack={undefined} />);

    expect(screen.queryByText('Back to Results')).toBeNull();
  });

  describe('loading state', () => {
    it('shows loading indicator', () => {
      render(
        <MiniLesson
          {...defaultProps}
          miniLesson={null}
          isLoading={true}
        />
      );

      expect(screen.getByText(/Generating lesson/)).toBeTruthy();
      expect(screen.getByText(/This may take a few seconds/)).toBeTruthy();
    });

    it('shows prerequisite name in loading message', () => {
      render(
        <MiniLesson
          {...defaultProps}
          miniLesson={null}
          isLoading={true}
        />
      );

      expect(screen.getByText(/Basic Algebra/)).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      render(
        <MiniLesson
          {...defaultProps}
          miniLesson={null}
          error="Failed to generate lesson"
        />
      );

      expect(screen.getByText('Failed to generate lesson')).toBeTruthy();
    });

    it('shows Go Back button in error state', () => {
      render(
        <MiniLesson
          {...defaultProps}
          miniLesson={null}
          error="Failed to generate lesson"
        />
      );

      expect(screen.getByText('Go Back')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no lesson', () => {
      render(
        <MiniLesson
          {...defaultProps}
          miniLesson={null}
        />
      );

      expect(screen.getByText('No lesson content available.')).toBeTruthy();
    });
  });

  it('handles lesson without key points', () => {
    render(
      <MiniLesson
        {...defaultProps}
        miniLesson={createMockMiniLesson({ key_points: [] })}
      />
    );

    // Should not crash and should not show Key Takeaways section
    expect(screen.queryByText('Key Takeaways')).toBeNull();
    expect(screen.getByText('Introduction to Algebra')).toBeTruthy();
  });

  it('has accessible complete button', () => {
    render(<MiniLesson {...defaultProps} />);

    const completeButton = screen.getByTestId('mini-lesson-complete-button');
    expect(completeButton.props.accessibilityLabel).toBe('Mark lesson as complete');
  });
});
