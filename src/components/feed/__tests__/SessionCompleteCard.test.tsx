/**
 * SessionCompleteCard Component Tests
 *
 * Tests for session completion display, mastery summary, and CTA buttons.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { SessionCompleteCard, type SessionCompleteCardProps } from '../SessionCompleteCard';
import type {
  MasterySummary,
  ConceptMastery,
  RubricMasterySummary,
  RubricConceptMastery,
} from '@/src/lib/mastery-evaluation-service';
import type { RubricEvaluation, RubricDimension } from '@/src/types/rubric';

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    light: jest.fn().mockResolvedValue(undefined),
    medium: jest.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Sample mastery summary for testing
 */
const sampleMasterySummary: MasterySummary = {
  correctCount: 8,
  totalCount: 10,
  scorePercentage: 80,
  conceptsMastered: [
    { conceptId: 'c1', conceptName: 'Variables', status: 'mastered', attemptCount: 1 },
    { conceptId: 'c2', conceptName: 'Functions', status: 'mastered', attemptCount: 1 },
    { conceptId: 'c3', conceptName: 'Loops', status: 'mastered', attemptCount: 1 },
  ],
  conceptsNeedingReview: [
    { conceptId: 'c4', conceptName: 'Recursion', status: 'needs_review', attemptCount: 2 },
    { conceptId: 'c5', conceptName: 'Closures', status: 'reinforced', attemptCount: 2 },
  ],
  xpRecommendation: 130,
};

/**
 * Helper to render SessionCompleteCard with default props
 */
function renderSessionCompleteCard(props: Partial<SessionCompleteCardProps> = {}) {
  const defaultProps: SessionCompleteCardProps = {
    masterySummary: sampleMasterySummary,
    xpEarned: 150,
    onEndSession: jest.fn(),
    onContinue: jest.fn(),
    ...props,
  };
  return render(<SessionCompleteCard {...defaultProps} />);
}

describe('SessionCompleteCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      renderSessionCompleteCard({ testID: 'session-complete' });

      expect(screen.getByTestId('session-complete')).toBeTruthy();
    });

    it('renders session complete header', () => {
      renderSessionCompleteCard();

      expect(screen.getByText('Session Complete')).toBeTruthy();
    });
  });

  describe('Score Display', () => {
    it('displays correct score (X/Y format)', () => {
      renderSessionCompleteCard({ testID: 'session' });

      expect(screen.getByText('8/10')).toBeTruthy();
    });

    it('displays score percentage', () => {
      renderSessionCompleteCard();

      expect(screen.getByText('80%')).toBeTruthy();
    });

    it('handles perfect score', () => {
      const perfectSummary: MasterySummary = {
        correctCount: 10,
        totalCount: 10,
        scorePercentage: 100,
        conceptsMastered: [
          { conceptId: 'c1', conceptName: 'Variables', status: 'mastered', attemptCount: 1 },
        ],
        conceptsNeedingReview: [],
        xpRecommendation: 150,
      };

      renderSessionCompleteCard({ masterySummary: perfectSummary });

      expect(screen.getByText('10/10')).toBeTruthy();
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('handles zero score', () => {
      const zeroSummary: MasterySummary = {
        correctCount: 0,
        totalCount: 5,
        scorePercentage: 0,
        conceptsMastered: [],
        conceptsNeedingReview: [
          { conceptId: 'c1', conceptName: 'Variables', status: 'needs_review', attemptCount: 1 },
        ],
        xpRecommendation: 50,
      };

      renderSessionCompleteCard({ masterySummary: zeroSummary });

      expect(screen.getByText('0/5')).toBeTruthy();
      expect(screen.getByText('0%')).toBeTruthy();
    });
  });

  describe('Concepts Mastered vs Needs Review', () => {
    it('displays concepts mastered count', () => {
      renderSessionCompleteCard();

      // Should show 3 concepts mastered
      expect(screen.getByText('3')).toBeTruthy();
      // Multiple "Mastered" texts exist (section header + concept labels)
      expect(screen.getAllByText(/mastered/i).length).toBeGreaterThan(0);
    });

    it('displays concepts needing review count', () => {
      renderSessionCompleteCard();

      // Should show 2 concepts needing review
      expect(screen.getByText('2')).toBeTruthy();
      // Multiple "Needs Review" texts exist (section header + stat label)
      expect(screen.getAllByText(/needs review/i).length).toBeGreaterThan(0);
    });

    it('lists mastered concept names', () => {
      renderSessionCompleteCard();

      expect(screen.getByText('Variables')).toBeTruthy();
      expect(screen.getByText('Functions')).toBeTruthy();
      expect(screen.getByText('Loops')).toBeTruthy();
    });

    it('lists concepts needing review', () => {
      renderSessionCompleteCard();

      expect(screen.getByText('Recursion')).toBeTruthy();
      expect(screen.getByText('Closures')).toBeTruthy();
    });

    it('handles no concepts needing review', () => {
      const allMasteredSummary: MasterySummary = {
        correctCount: 5,
        totalCount: 5,
        scorePercentage: 100,
        conceptsMastered: [
          { conceptId: 'c1', conceptName: 'Variables', status: 'mastered', attemptCount: 1 },
          { conceptId: 'c2', conceptName: 'Functions', status: 'mastered', attemptCount: 1 },
        ],
        conceptsNeedingReview: [],
        xpRecommendation: 150,
      };

      renderSessionCompleteCard({ masterySummary: allMasteredSummary });

      expect(screen.getByText('Variables')).toBeTruthy();
      expect(screen.getByText('Functions')).toBeTruthy();
      // Should show 0 for needs review
      expect(screen.getByText('0')).toBeTruthy();
    });
  });

  describe('XP Display', () => {
    it('displays XP earned this session', () => {
      renderSessionCompleteCard({ xpEarned: 150 });

      expect(screen.getByText('+150 XP')).toBeTruthy();
    });

    it('displays different XP amounts', () => {
      renderSessionCompleteCard({ xpEarned: 75 });

      expect(screen.getByText('+75 XP')).toBeTruthy();
    });
  });

  describe('Streak Display', () => {
    it('displays streak when provided', () => {
      renderSessionCompleteCard({ streak: 7 });

      expect(screen.getByText('7')).toBeTruthy();
      expect(screen.getByText(/day streak/i)).toBeTruthy();
    });

    it('does not display streak section when not provided', () => {
      renderSessionCompleteCard({ streak: undefined });

      expect(screen.queryByText(/day streak/i)).toBeNull();
    });

    it('handles streak of 1', () => {
      renderSessionCompleteCard({ streak: 1 });

      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText(/day streak/i)).toBeTruthy();
    });
  });

  describe('End Session Button', () => {
    it('renders End Session button', () => {
      renderSessionCompleteCard({ testID: 'session' });

      expect(screen.getByTestId('session-end-button')).toBeTruthy();
      expect(screen.getByText('End Session')).toBeTruthy();
    });

    it('calls onEndSession when pressed', async () => {
      const onEndSession = jest.fn();
      renderSessionCompleteCard({ onEndSession, testID: 'session' });

      const endButton = screen.getByTestId('session-end-button');
      fireEvent.press(endButton);

      await waitFor(() => {
        expect(onEndSession).toHaveBeenCalledTimes(1);
      });
    });

    it('has correct accessibility properties', () => {
      renderSessionCompleteCard({ testID: 'session' });

      const endButton = screen.getByTestId('session-end-button');
      expect(endButton.props.accessibilityRole).toBe('button');
      expect(endButton.props.accessibilityLabel).toContain('End');
    });
  });

  describe('Keep Going Button', () => {
    it('renders Keep Going button with -50% XP indicator', () => {
      renderSessionCompleteCard({ testID: 'session' });

      expect(screen.getByTestId('session-continue-button')).toBeTruthy();
      expect(screen.getByText(/keep going/i)).toBeTruthy();
      expect(screen.getByText(/-50% XP/i)).toBeTruthy();
    });

    it('calls onContinue when pressed', async () => {
      const onContinue = jest.fn();
      renderSessionCompleteCard({ onContinue, testID: 'session' });

      const continueButton = screen.getByTestId('session-continue-button');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(onContinue).toHaveBeenCalledTimes(1);
      });
    });

    it('has correct accessibility properties', () => {
      renderSessionCompleteCard({ testID: 'session' });

      const continueButton = screen.getByTestId('session-continue-button');
      expect(continueButton.props.accessibilityRole).toBe('button');
      expect(continueButton.props.accessibilityLabel).toContain('Continue');
    });
  });

  describe('Accessibility', () => {
    it('container is accessible', () => {
      renderSessionCompleteCard({ testID: 'session' });

      const container = screen.getByTestId('session');
      expect(container.props.accessible).toBe(true);
    });

    it('score display is accessible', () => {
      renderSessionCompleteCard({ testID: 'session' });

      const scoreSection = screen.getByTestId('session-score');
      expect(scoreSection.props.accessibilityLabel).toContain('8 out of 10');
    });
  });

  describe('Visual States', () => {
    it('shows celebratory styling for high scores', () => {
      const highScoreSummary: MasterySummary = {
        ...sampleMasterySummary,
        scorePercentage: 90,
      };

      renderSessionCompleteCard({ masterySummary: highScoreSummary, testID: 'session' });

      // Component should render (visual styling tested through snapshot or visual regression)
      expect(screen.getByTestId('session')).toBeTruthy();
    });

    it('shows encouraging styling for lower scores', () => {
      const lowScoreSummary: MasterySummary = {
        ...sampleMasterySummary,
        scorePercentage: 40,
        correctCount: 4,
      };

      renderSessionCompleteCard({ masterySummary: lowScoreSummary, testID: 'session' });

      // Component should render
      expect(screen.getByTestId('session')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty concepts arrays', () => {
      const emptySummary: MasterySummary = {
        correctCount: 0,
        totalCount: 0,
        scorePercentage: 0,
        conceptsMastered: [],
        conceptsNeedingReview: [],
        xpRecommendation: 50,
      };

      // Should not throw
      expect(() => renderSessionCompleteCard({ masterySummary: emptySummary })).not.toThrow();
    });

    it('handles very long concept names', () => {
      const longNameSummary: MasterySummary = {
        ...sampleMasterySummary,
        conceptsMastered: [
          {
            conceptId: 'c1',
            conceptName: 'Very Long Concept Name That Should Be Handled Properly',
            status: 'mastered',
            attemptCount: 1,
          },
        ],
      };

      renderSessionCompleteCard({ masterySummary: longNameSummary });

      expect(
        screen.getByText('Very Long Concept Name That Should Be Handled Properly')
      ).toBeTruthy();
    });

    it('handles zero XP earned', () => {
      renderSessionCompleteCard({ xpEarned: 0 });

      expect(screen.getByText('+0 XP')).toBeTruthy();
    });
  });

  // ============================================================================
  // Rubric Mastery Display Tests
  // ============================================================================

  describe('Rubric Mastery Display', () => {
    /**
     * Sample rubric evaluation for a mastered concept
     */
    const masteredRubricEvaluation: RubricEvaluation = {
      interactionId: 'int-1',
      conceptId: 'c1',
      dimensions: [
        { dimension: 'accuracy', score: 3, feedback: 'Excellent accuracy!' },
        { dimension: 'completeness', score: 2, feedback: 'Good coverage.' },
        { dimension: 'depth', score: 2, feedback: 'Good depth.' },
      ],
      passed: true,
      overallFeedback: 'Excellent understanding!',
    };

    /**
     * Sample rubric evaluation for a concept needing review
     * Note: reasoning threshold is 1, synthesis threshold is 1
     * So reasoning=0 and synthesis=0 will fail
     */
    const needsReviewRubricEvaluation: RubricEvaluation = {
      interactionId: 'int-2',
      conceptId: 'c2',
      dimensions: [
        { dimension: 'accuracy', score: 2, feedback: 'Mostly correct.' },
        { dimension: 'reasoning', score: 0, feedback: 'Need to explain why.' },
        { dimension: 'synthesis', score: 0, feedback: 'Try connecting concepts.' },
      ],
      passed: false,
      overallFeedback: 'Focus on explaining the why...',
    };

    /**
     * Create dimension summary helper
     */
    function createDimensionSummary(
      dims: Partial<Record<RubricDimension, { passed: number; total: number }>>
    ): Record<RubricDimension, { passed: number; total: number }> {
      const defaultDim = { passed: 0, total: 0 };
      return {
        accuracy: dims.accuracy ?? defaultDim,
        completeness: dims.completeness ?? defaultDim,
        depth: dims.depth ?? defaultDim,
        reasoning: dims.reasoning ?? defaultDim,
        synthesis: dims.synthesis ?? defaultDim,
        transfer: dims.transfer ?? defaultDim,
      };
    }

    /**
     * Sample RubricConceptMastery for a mastered concept
     */
    const masteredConceptMastery: RubricConceptMastery = {
      conceptId: 'c1',
      conceptName: 'Photosynthesis',
      status: 'mastered',
      attemptCount: 1,
      rubricEvaluations: [masteredRubricEvaluation],
      dimensionSummary: createDimensionSummary({
        accuracy: { passed: 1, total: 1 },
        completeness: { passed: 1, total: 1 },
        depth: { passed: 1, total: 1 },
      }),
    };

    /**
     * Sample RubricConceptMastery for a concept needing review
     */
    const needsReviewConceptMastery: RubricConceptMastery = {
      conceptId: 'c2',
      conceptName: 'Cell Respiration',
      status: 'needs_review',
      attemptCount: 2,
      rubricEvaluations: [needsReviewRubricEvaluation],
      dimensionSummary: createDimensionSummary({
        accuracy: { passed: 1, total: 1 },
        reasoning: { passed: 0, total: 1 },
        synthesis: { passed: 0, total: 1 },
      }),
    };

    /**
     * Sample RubricConceptMastery for a reinforced concept
     */
    const reinforcedConceptMastery: RubricConceptMastery = {
      conceptId: 'c3',
      conceptName: 'ATP Synthesis',
      status: 'reinforced',
      attemptCount: 2,
      rubricEvaluations: [
        {
          interactionId: 'int-3',
          conceptId: 'c3',
          dimensions: [
            { dimension: 'accuracy', score: 2, feedback: 'Mostly accurate.' },
            { dimension: 'depth', score: 1, feedback: 'Could go deeper.' },
          ],
          passed: true,
          overallFeedback: 'Good, but room to improve.',
        },
      ],
      dimensionSummary: createDimensionSummary({
        accuracy: { passed: 1, total: 1 },
        depth: { passed: 1, total: 1 },
      }),
    };

    /**
     * Sample RubricMasterySummary
     */
    const sampleRubricMasterySummary: RubricMasterySummary = {
      correctCount: 2,
      totalCount: 3,
      scorePercentage: 67,
      conceptsMastered: [masteredConceptMastery],
      conceptsNeedingReview: [needsReviewConceptMastery, reinforcedConceptMastery],
      xpRecommendation: 100,
      conceptMasteries: [
        masteredConceptMastery,
        needsReviewConceptMastery,
        reinforcedConceptMastery,
      ],
      rubricEvaluations: [
        masteredRubricEvaluation,
        needsReviewRubricEvaluation,
      ],
    };

    describe('Component accepts rubricMastery prop', () => {
      it('renders without error when rubricMastery is provided', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        expect(screen.getByTestId('session')).toBeTruthy();
      });

      it('renders without error when rubricMastery is undefined (fallback)', () => {
        renderSessionCompleteCard({
          rubricMastery: undefined,
          testID: 'session',
        });

        expect(screen.getByTestId('session')).toBeTruthy();
      });
    });

    describe('Displays rubric-based mastery per concept', () => {
      it('shows concept names from rubric mastery data', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        expect(screen.getByText('Photosynthesis')).toBeTruthy();
        expect(screen.getByText('Cell Respiration')).toBeTruthy();
      });

      it('displays mastery status indicator for mastered concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Look for mastered indicator testID
        expect(screen.getByTestId('rubric-concept-c1-mastered')).toBeTruthy();
      });

      it('displays mastery status indicator for needs_review concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Look for needs_review indicator testID
        expect(screen.getByTestId('rubric-concept-c2-needs_review')).toBeTruthy();
      });

      it('displays mastery status indicator for reinforced concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Look for reinforced indicator testID
        expect(screen.getByTestId('rubric-concept-c3-reinforced')).toBeTruthy();
      });
    });

    describe('Shows dimension scores for each concept', () => {
      it('displays dimension labels', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Should show dimension labels for evaluated dimensions
        expect(screen.getAllByText(/accuracy/i).length).toBeGreaterThan(0);
      });

      it('displays dimension scores (0-3 scale)', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Should show score indicators (e.g., "3/3", "2/3", etc.)
        expect(screen.getAllByText(/\/3/).length).toBeGreaterThan(0);
      });

      it('shows dimension progress bars with correct testIDs', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Should have dimension progress indicators (accuracy appears in multiple concepts)
        expect(screen.getAllByTestId('dimension-accuracy-score').length).toBeGreaterThan(0);
      });
    });

    describe('Displays failed dimensions with warning styling', () => {
      it('highlights failed dimensions', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Should have warning indicator for failed dimensions
        expect(screen.getByTestId('dimension-reasoning-warning')).toBeTruthy();
        expect(screen.getByTestId('dimension-synthesis-warning')).toBeTruthy();
      });

      it('shows feedback for failed dimensions', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Should show the feedback text for failed dimensions
        expect(screen.getByText(/Need to explain why/i)).toBeTruthy();
        expect(screen.getByText(/Try connecting concepts/i)).toBeTruthy();
      });
    });

    describe('Shows overall feedback per concept', () => {
      it('displays overall feedback for concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        expect(screen.getByText(/Excellent understanding/i)).toBeTruthy();
        expect(screen.getByText(/Focus on explaining the why/i)).toBeTruthy();
      });
    });

    describe('Graceful fallback without rubric data', () => {
      it('falls back to simple display when rubricMastery is undefined', () => {
        renderSessionCompleteCard({
          masterySummary: sampleMasterySummary,
          rubricMastery: undefined,
          testID: 'session',
        });

        // Should still show the basic mastery summary
        expect(screen.getByText('Variables')).toBeTruthy();
        expect(screen.getByText('Functions')).toBeTruthy();
        expect(screen.getByText('8/10')).toBeTruthy();
      });

      it('does not show dimension scores when rubricMastery is undefined', () => {
        renderSessionCompleteCard({
          masterySummary: sampleMasterySummary,
          rubricMastery: undefined,
          testID: 'session',
        });

        // Should not have rubric-specific testIDs
        expect(screen.queryByTestId('rubric-concept-c1-mastered')).toBeNull();
        expect(screen.queryByTestId('dimension-accuracy-score')).toBeNull();
      });

      it('handles empty conceptMasteries array gracefully', () => {
        const emptyRubricSummary: RubricMasterySummary = {
          ...sampleRubricMasterySummary,
          conceptMasteries: [],
          rubricEvaluations: [],
        };

        renderSessionCompleteCard({
          rubricMastery: emptyRubricSummary,
          testID: 'session',
        });

        // Should not throw and should still render
        expect(screen.getByTestId('session')).toBeTruthy();
      });
    });

    describe('Visual indicators for mastery status', () => {
      it('shows green styling for mastered concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        const masteredIndicator = screen.getByTestId('rubric-concept-c1-mastered');
        expect(masteredIndicator).toBeTruthy();
        // Visual styling verified through testID presence
      });

      it('shows amber/yellow styling for reinforced concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        const reinforcedIndicator = screen.getByTestId('rubric-concept-c3-reinforced');
        expect(reinforcedIndicator).toBeTruthy();
      });

      it('shows red/orange styling for needs_review concepts', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        const needsReviewIndicator = screen.getByTestId('rubric-concept-c2-needs_review');
        expect(needsReviewIndicator).toBeTruthy();
      });
    });

    describe('Accessibility for rubric display', () => {
      it('rubric section is accessible', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        const rubricSection = screen.getByTestId('rubric-mastery-section');
        expect(rubricSection.props.accessible).toBe(true);
      });

      it('dimension scores have accessibility labels', () => {
        renderSessionCompleteCard({
          rubricMastery: sampleRubricMasterySummary,
          testID: 'session',
        });

        // Use getAllByTestId since accuracy appears in multiple concepts
        const dimensionScores = screen.getAllByTestId('dimension-accuracy-score');
        expect(dimensionScores.length).toBeGreaterThan(0);
        expect(dimensionScores[0].props.accessibilityLabel).toBeTruthy();
      });
    });
  });
});
