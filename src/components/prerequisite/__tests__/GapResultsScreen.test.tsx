/**
 * GapResultsScreen Tests
 *
 * Tests for the GapResultsScreen component:
 * - Shows score circle with percentage
 * - Shows recommendation based on score
 * - Lists knowledge gaps
 * - Shows Learn button for each gap
 * - Shows completed badge for addressed gaps
 * - Calls onLearnGap when Learn is pressed
 * - Calls onContinue when Continue is pressed
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { GapResultsScreen } from '../GapResultsScreen';
import type { Prerequisite } from '../../../types/prerequisite';
import type { GapAnalysisResult } from '../../../lib/prerequisite-assessment-service';

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
 * Create mock gap analysis
 */
function createMockGapAnalysis(overrides: Partial<GapAnalysisResult> = {}): GapAnalysisResult {
  return {
    totalPrerequisites: 3,
    correct: 2,
    percentage: 67,
    gaps: [createMockPrerequisite()],
    recommendation: 'review_suggested',
    ...overrides,
  };
}

describe('GapResultsScreen', () => {
  const mockOnLearnGap = jest.fn();
  const mockOnContinue = jest.fn();

  const defaultProps = {
    gapAnalysis: createMockGapAnalysis(),
    completedMiniLessons: new Set<string>(),
    onLearnGap: mockOnLearnGap,
    onContinue: mockOnContinue,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('Your Results')).toBeTruthy();
  });

  it('shows score with correct/total', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('2 of 3 correct')).toBeTruthy();
  });

  it('shows recommendation for review_suggested', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('Almost there!')).toBeTruthy();
    expect(screen.getByText('We recommend reviewing a few topics before continuing.')).toBeTruthy();
  });

  it('shows recommendation for proceed', () => {
    render(
      <GapResultsScreen
        {...defaultProps}
        gapAnalysis={createMockGapAnalysis({
          percentage: 100,
          correct: 3,
          gaps: [],
          recommendation: 'proceed',
        })}
      />
    );

    expect(screen.getByText('Great job!')).toBeTruthy();
    expect(screen.getByText('You have a solid foundation for this content.')).toBeTruthy();
  });

  it('shows recommendation for review_required', () => {
    render(
      <GapResultsScreen
        {...defaultProps}
        gapAnalysis={createMockGapAnalysis({
          percentage: 33,
          correct: 1,
          recommendation: 'review_required',
        })}
      />
    );

    expect(screen.getByText("Let's build your foundation")).toBeTruthy();
  });

  it('lists knowledge gaps', () => {
    const gaps = [
      createMockPrerequisite({ id: 'gap-1', name: 'Algebra' }),
      createMockPrerequisite({ id: 'gap-2', name: 'Calculus' }),
    ];

    render(
      <GapResultsScreen
        {...defaultProps}
        gapAnalysis={createMockGapAnalysis({ gaps })}
      />
    );

    expect(screen.getByText('Knowledge Gaps (2)')).toBeTruthy();
    expect(screen.getByText('Algebra')).toBeTruthy();
    expect(screen.getByText('Calculus')).toBeTruthy();
  });

  it('shows Learn button for unaddressed gaps', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('Learn')).toBeTruthy();
  });

  it('calls onLearnGap when Learn is pressed', () => {
    render(<GapResultsScreen {...defaultProps} />);

    const gapItem = screen.getByTestId('gap-results-screen-gap-prereq-1');
    fireEvent.press(gapItem);

    expect(mockOnLearnGap).toHaveBeenCalledWith('prereq-1');
  });

  it('shows completed state for addressed gaps', () => {
    const completedSet = new Set(['prereq-1']);

    render(
      <GapResultsScreen
        {...defaultProps}
        completedMiniLessons={completedSet}
      />
    );

    // Learn button should not be visible for completed gaps
    expect(screen.queryByText('Learn')).toBeNull();
  });

  it('shows Continue Anyway button when gaps exist', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('Continue Anyway')).toBeTruthy();
  });

  it('shows Start Learning button when no gaps or all addressed', () => {
    const completedSet = new Set(['prereq-1']);

    render(
      <GapResultsScreen
        {...defaultProps}
        completedMiniLessons={completedSet}
      />
    );

    expect(screen.getByText('Start Learning')).toBeTruthy();
  });

  it('shows Start Learning button when 100% correct', () => {
    render(
      <GapResultsScreen
        {...defaultProps}
        gapAnalysis={createMockGapAnalysis({
          percentage: 100,
          correct: 3,
          gaps: [],
          recommendation: 'proceed',
        })}
      />
    );

    expect(screen.getByText('Start Learning')).toBeTruthy();
  });

  it('calls onContinue when continue button is pressed', () => {
    render(<GapResultsScreen {...defaultProps} />);

    const continueButton = screen.getByTestId('gap-results-screen-continue-button');
    fireEvent.press(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('shows warning message when continuing with unaddressed gaps', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText(/may find some concepts harder/)).toBeTruthy();
  });

  it('does not show warning when all gaps addressed', () => {
    const completedSet = new Set(['prereq-1']);

    render(
      <GapResultsScreen
        {...defaultProps}
        completedMiniLessons={completedSet}
      />
    );

    expect(screen.queryByText(/may find some concepts harder/)).toBeNull();
  });

  it('shows gap description when available', () => {
    render(<GapResultsScreen {...defaultProps} />);

    expect(screen.getByText('Understanding of algebraic operations')).toBeTruthy();
  });
});
