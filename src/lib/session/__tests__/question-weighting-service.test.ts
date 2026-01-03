/**
 * Tests for Question Weighting Service
 *
 * Tests the pure algorithmic service for determining question types based on
 * learning phase and adaptive context factors.
 */

import {
  getPhaseWeights,
  normalizeWeights,
  applyAdaptiveAdjustments,
  selectQuestionType,
  getAdjustedWeights,
} from '../question-weighting-service';
import type {
  QuestionPhase,
  QuestionWeights,
  WeightingContext,
  CognitiveCapacity,
} from '@/types/session';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a mock CognitiveCapacity object
 */
function createMockCapacity(percentageUsed: number): CognitiveCapacity {
  return {
    baseCapacity: 4,
    circadianModifier: 1.0,
    sleepModifier: 1.0,
    fatigueModifier: 0,
    effectiveCapacity: 4,
    percentageUsed,
    canLearnNew: percentageUsed < 90,
    warningLevel: percentageUsed >= 90 ? 'blocked' : percentageUsed >= 75 ? 'caution' : 'none',
  };
}

/**
 * Helper to sum all weights
 */
function sumWeights(weights: QuestionWeights): number {
  return (
    weights.multiple_choice +
    weights.true_false +
    weights.free_text +
    weights.interactive
  );
}

// ============================================================================
// getPhaseWeights tests
// ============================================================================

describe('question-weighting-service', () => {
  describe('getPhaseWeights', () => {
    it('returns 100% MC for pretest phase', () => {
      const weights = getPhaseWeights('pretest');

      expect(weights.multiple_choice).toBe(1.0);
      expect(weights.true_false).toBe(0);
      expect(weights.free_text).toBe(0);
      expect(weights.interactive).toBe(0);
    });

    it('returns balanced weights for learning phase', () => {
      const weights = getPhaseWeights('learning');

      expect(weights.multiple_choice).toBe(0.3);
      expect(weights.true_false).toBe(0.1);
      expect(weights.free_text).toBe(0.4);
      expect(weights.interactive).toBe(0.2);
    });

    it('returns review-optimized weights for review phase', () => {
      const weights = getPhaseWeights('review');

      expect(weights.multiple_choice).toBe(0.4);
      expect(weights.true_false).toBe(0.1);
      expect(weights.free_text).toBe(0.4);
      expect(weights.interactive).toBe(0.1);
    });

    it('returns weights that sum to 1.0 for all phases', () => {
      const phases: QuestionPhase[] = ['pretest', 'learning', 'review'];

      for (const phase of phases) {
        const weights = getPhaseWeights(phase);
        expect(sumWeights(weights)).toBeCloseTo(1.0);
      }
    });

    it('returns a copy of weights (not the original reference)', () => {
      const weights1 = getPhaseWeights('learning');
      const weights2 = getPhaseWeights('learning');

      weights1.multiple_choice = 0.99;

      expect(weights2.multiple_choice).toBe(0.3);
    });
  });

  // ============================================================================
  // normalizeWeights tests
  // ============================================================================

  describe('normalizeWeights', () => {
    it('returns weights unchanged if already summing to 1', () => {
      const weights: QuestionWeights = {
        multiple_choice: 0.4,
        true_false: 0.1,
        free_text: 0.4,
        interactive: 0.1,
      };

      const normalized = normalizeWeights(weights);

      expect(normalized.multiple_choice).toBeCloseTo(0.4);
      expect(normalized.true_false).toBeCloseTo(0.1);
      expect(normalized.free_text).toBeCloseTo(0.4);
      expect(normalized.interactive).toBeCloseTo(0.1);
    });

    it('normalizes weights that sum to more than 1', () => {
      const weights: QuestionWeights = {
        multiple_choice: 0.6,
        true_false: 0.2,
        free_text: 0.6,
        interactive: 0.2,
      };
      // Sum = 1.6

      const normalized = normalizeWeights(weights);

      expect(normalized.multiple_choice).toBeCloseTo(0.375); // 0.6/1.6
      expect(normalized.true_false).toBeCloseTo(0.125); // 0.2/1.6
      expect(normalized.free_text).toBeCloseTo(0.375); // 0.6/1.6
      expect(normalized.interactive).toBeCloseTo(0.125); // 0.2/1.6
      expect(sumWeights(normalized)).toBeCloseTo(1.0);
    });

    it('normalizes weights that sum to less than 1', () => {
      const weights: QuestionWeights = {
        multiple_choice: 0.2,
        true_false: 0.05,
        free_text: 0.2,
        interactive: 0.05,
      };
      // Sum = 0.5

      const normalized = normalizeWeights(weights);

      expect(normalized.multiple_choice).toBeCloseTo(0.4); // 0.2/0.5
      expect(normalized.true_false).toBeCloseTo(0.1); // 0.05/0.5
      expect(normalized.free_text).toBeCloseTo(0.4); // 0.2/0.5
      expect(normalized.interactive).toBeCloseTo(0.1); // 0.05/0.5
      expect(sumWeights(normalized)).toBeCloseTo(1.0);
    });

    it('handles all zeros by returning equal weights', () => {
      const weights: QuestionWeights = {
        multiple_choice: 0,
        true_false: 0,
        free_text: 0,
        interactive: 0,
      };

      const normalized = normalizeWeights(weights);

      expect(normalized.multiple_choice).toBe(0.25);
      expect(normalized.true_false).toBe(0.25);
      expect(normalized.free_text).toBe(0.25);
      expect(normalized.interactive).toBe(0.25);
      expect(sumWeights(normalized)).toBe(1.0);
    });

    it('preserves proportions when normalizing', () => {
      const weights: QuestionWeights = {
        multiple_choice: 4,
        true_false: 1,
        free_text: 4,
        interactive: 1,
      };
      // Sum = 10

      const normalized = normalizeWeights(weights);

      // Check proportions are preserved
      expect(normalized.multiple_choice / normalized.true_false).toBeCloseTo(4);
      expect(normalized.free_text / normalized.interactive).toBeCloseTo(4);
    });
  });

  // ============================================================================
  // applyAdaptiveAdjustments tests
  // ============================================================================

  describe('applyAdaptiveAdjustments', () => {
    const baseWeights = getPhaseWeights('learning');

    describe('low accuracy adjustment', () => {
      it('increases MC weight when accuracy < 50%', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.4, // 40% accuracy
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // MC should be higher than base after normalization
        // Base: 0.3, Adjusted: 0.3 + 0.2 = 0.5 (before normalization)
        expect(adjusted.multiple_choice).toBeGreaterThan(baseWeights.multiple_choice);
      });

      it('does not adjust when accuracy >= 50%', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.6, // 60% accuracy
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // Should be the same as base weights (normalized)
        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
      });

      it('does not adjust when accuracy is exactly 50%', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.5,
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
      });

      it('does not adjust when accuracy is undefined', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: undefined,
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
      });
    });

    describe('high mastery adjustment', () => {
      it('increases interactive weight when mastery is "reviewing"', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: 'reviewing',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.interactive).toBeGreaterThan(baseWeights.interactive);
      });

      it('increases interactive weight when mastery is "mastered"', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: 'mastered',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.interactive).toBeGreaterThan(baseWeights.interactive);
      });

      it('does not adjust when mastery is "new"', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: 'new',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.interactive).toBeCloseTo(baseWeights.interactive);
      });

      it('does not adjust when mastery is "learning"', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: 'learning',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.interactive).toBeCloseTo(baseWeights.interactive);
      });

      it('does not adjust when mastery is undefined', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: undefined,
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.interactive).toBeCloseTo(baseWeights.interactive);
      });
    });

    describe('low cognitive capacity adjustment', () => {
      it('increases MC and T/F weight when capacity is low (<50% available)', () => {
        const context: WeightingContext = {
          phase: 'learning',
          cognitiveCapacity: createMockCapacity(60), // 40% available
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // Both MC and T/F should be higher
        expect(adjusted.multiple_choice).toBeGreaterThan(baseWeights.multiple_choice);
        expect(adjusted.true_false).toBeGreaterThan(baseWeights.true_false);
      });

      it('does not adjust when capacity is high (>=50% available)', () => {
        const context: WeightingContext = {
          phase: 'learning',
          cognitiveCapacity: createMockCapacity(30), // 70% available
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
        expect(adjusted.true_false).toBeCloseTo(baseWeights.true_false);
      });

      it('does not adjust when capacity is undefined', () => {
        const context: WeightingContext = {
          phase: 'learning',
          cognitiveCapacity: undefined,
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
      });

      it('adjusts at the boundary (exactly 50% used)', () => {
        const context: WeightingContext = {
          phase: 'learning',
          cognitiveCapacity: createMockCapacity(50), // 50% available (exactly at threshold)
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // 50% available = not below threshold, so no adjustment
        expect(adjusted.multiple_choice).toBeCloseTo(baseWeights.multiple_choice);
      });

      it('adjusts when exactly at 51% used (49% available)', () => {
        const context: WeightingContext = {
          phase: 'learning',
          cognitiveCapacity: createMockCapacity(51), // 49% available
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // Below 50% available, should adjust
        expect(adjusted.multiple_choice).toBeGreaterThan(baseWeights.multiple_choice);
      });
    });

    describe('high Bloom level adjustment', () => {
      it('increases free-text weight for "analyze" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'analyze',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeGreaterThan(baseWeights.free_text);
      });

      it('increases free-text weight for "evaluate" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'evaluate',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeGreaterThan(baseWeights.free_text);
      });

      it('increases free-text weight for "create" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'create',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeGreaterThan(baseWeights.free_text);
      });

      it('does not adjust for "remember" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'remember',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeCloseTo(baseWeights.free_text);
      });

      it('does not adjust for "understand" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'understand',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeCloseTo(baseWeights.free_text);
      });

      it('does not adjust for "apply" level', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: 'apply',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeCloseTo(baseWeights.free_text);
      });

      it('does not adjust when bloomLevel is undefined', () => {
        const context: WeightingContext = {
          phase: 'learning',
          bloomLevel: undefined,
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(adjusted.free_text).toBeCloseTo(baseWeights.free_text);
      });
    });

    describe('combined adjustments', () => {
      it('applies multiple adjustments correctly', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.3, // Low accuracy -> +MC
          masteryState: 'mastered', // High mastery -> +interactive
          bloomLevel: 'analyze', // High Bloom -> +free_text
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        // Calculate expected adjusted weights before normalization:
        // MC: 0.3 + 0.2 = 0.5
        // T/F: 0.1
        // FT: 0.4 + 0.2 = 0.6
        // INT: 0.2 + 0.2 = 0.4
        // Total: 1.6
        // After normalization: MC=0.3125, T/F=0.0625, FT=0.375, INT=0.25

        // MC, interactive should be higher than base after normalization
        // (note: free_text was 0.4 base, adjusted to 0.6, normalized to 0.375 < 0.4)
        expect(adjusted.multiple_choice).toBeGreaterThan(baseWeights.multiple_choice);
        expect(adjusted.interactive).toBeGreaterThan(baseWeights.interactive);

        // Free text gets +0.2 but after normalization it's 0.375 (slightly less than 0.4)
        // This is expected because all three adjustments increase the total, diluting each
        expect(adjusted.free_text).toBeCloseTo(0.375);

        // Weights should still sum to 1
        expect(sumWeights(adjusted)).toBeCloseTo(1.0);
      });

      it('always returns normalized weights summing to 1', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.2,
          masteryState: 'mastered',
          cognitiveCapacity: createMockCapacity(80),
          bloomLevel: 'create',
        };

        const adjusted = applyAdaptiveAdjustments(baseWeights, context);

        expect(sumWeights(adjusted)).toBeCloseTo(1.0);
      });
    });
  });

  // ============================================================================
  // selectQuestionType tests
  // ============================================================================

  describe('selectQuestionType', () => {
    describe('pretest phase', () => {
      it('always returns multiple_choice for pretest', () => {
        const context: WeightingContext = { phase: 'pretest' };

        // Test with different random values
        expect(selectQuestionType(context, 0)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.5)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.99)).toBe('multiple_choice');
      });
    });

    describe('learning phase selection', () => {
      const context: WeightingContext = { phase: 'learning' };
      // Weights: MC=0.3, T/F=0.1, FT=0.4, INT=0.2
      // Cumulative: MC=0.3, T/F=0.4, FT=0.8, INT=1.0

      it('selects multiple_choice for random < 0.3', () => {
        expect(selectQuestionType(context, 0)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.15)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.29)).toBe('multiple_choice');
      });

      it('selects true_false for random >= 0.3 and < 0.4', () => {
        expect(selectQuestionType(context, 0.3)).toBe('true_false');
        expect(selectQuestionType(context, 0.35)).toBe('true_false');
        expect(selectQuestionType(context, 0.39)).toBe('true_false');
      });

      it('selects free_text for random >= 0.4 and < 0.8', () => {
        expect(selectQuestionType(context, 0.4)).toBe('free_text');
        expect(selectQuestionType(context, 0.6)).toBe('free_text');
        expect(selectQuestionType(context, 0.79)).toBe('free_text');
      });

      it('selects interactive for random >= 0.8', () => {
        expect(selectQuestionType(context, 0.8)).toBe('interactive');
        expect(selectQuestionType(context, 0.9)).toBe('interactive');
        expect(selectQuestionType(context, 0.99)).toBe('interactive');
      });
    });

    describe('review phase selection', () => {
      const context: WeightingContext = { phase: 'review' };
      // Weights: MC=0.4, T/F=0.1, FT=0.4, INT=0.1
      // Cumulative: MC=0.4, T/F=0.5, FT=0.9, INT=1.0

      it('selects multiple_choice for random < 0.4', () => {
        expect(selectQuestionType(context, 0)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.2)).toBe('multiple_choice');
        expect(selectQuestionType(context, 0.39)).toBe('multiple_choice');
      });

      it('selects true_false for random >= 0.4 and < 0.5', () => {
        expect(selectQuestionType(context, 0.4)).toBe('true_false');
        expect(selectQuestionType(context, 0.45)).toBe('true_false');
        expect(selectQuestionType(context, 0.49)).toBe('true_false');
      });

      it('selects free_text for random >= 0.5 and < 0.9', () => {
        expect(selectQuestionType(context, 0.5)).toBe('free_text');
        expect(selectQuestionType(context, 0.7)).toBe('free_text');
        expect(selectQuestionType(context, 0.89)).toBe('free_text');
      });

      it('selects interactive for random >= 0.9', () => {
        expect(selectQuestionType(context, 0.9)).toBe('interactive');
        expect(selectQuestionType(context, 0.95)).toBe('interactive');
        expect(selectQuestionType(context, 0.99)).toBe('interactive');
      });
    });

    describe('with adaptive adjustments', () => {
      it('selects MC more often when accuracy is low', () => {
        const context: WeightingContext = {
          phase: 'learning',
          recentAccuracy: 0.3,
        };

        // With low accuracy, MC weight increases from 0.3 to 0.5 (before normalization)
        // After normalization: MC = 0.5/1.2 = 0.417
        // So random values up to ~0.417 should select MC
        expect(selectQuestionType(context, 0.4)).toBe('multiple_choice');
      });

      it('respects all adjustments in selection', () => {
        const context: WeightingContext = {
          phase: 'learning',
          masteryState: 'mastered',
        };

        // With high mastery, interactive weight increases
        // More likely to hit interactive with random values near 1.0
        const adjusted = getAdjustedWeights(context);
        expect(adjusted.interactive).toBeGreaterThan(0.2); // Base is 0.2
      });
    });

    describe('edge cases', () => {
      it('handles random value of exactly 0', () => {
        const context: WeightingContext = { phase: 'learning' };
        const result = selectQuestionType(context, 0);
        expect(['multiple_choice', 'true_false', 'free_text', 'interactive']).toContain(result);
      });

      it('handles random value very close to 1', () => {
        const context: WeightingContext = { phase: 'learning' };
        const result = selectQuestionType(context, 0.9999);
        expect(result).toBe('interactive');
      });

      it('handles random value of exactly 1', () => {
        const context: WeightingContext = { phase: 'learning' };
        const result = selectQuestionType(context, 1);
        expect(result).toBe('interactive');
      });
    });

    describe('distribution over many calls', () => {
      it('produces varied results when called without fixed random', () => {
        const context: WeightingContext = { phase: 'learning' };
        const results: Record<string, number> = {
          multiple_choice: 0,
          true_false: 0,
          free_text: 0,
          interactive: 0,
        };

        // Run 1000 selections
        for (let i = 0; i < 1000; i++) {
          const type = selectQuestionType(context);
          results[type]++;
        }

        // With learning phase weights (MC=30%, T/F=10%, FT=40%, INT=20%),
        // we should see a roughly similar distribution
        // Allow for statistical variance (within 10% of expected)
        expect(results.multiple_choice).toBeGreaterThan(200); // ~300 expected
        expect(results.multiple_choice).toBeLessThan(400);
        expect(results.true_false).toBeGreaterThan(50); // ~100 expected
        expect(results.true_false).toBeLessThan(200);
        expect(results.free_text).toBeGreaterThan(300); // ~400 expected
        expect(results.free_text).toBeLessThan(500);
        expect(results.interactive).toBeGreaterThan(100); // ~200 expected
        expect(results.interactive).toBeLessThan(300);
      });
    });
  });

  // ============================================================================
  // getAdjustedWeights tests
  // ============================================================================

  describe('getAdjustedWeights', () => {
    it('returns base weights when no adjustments apply', () => {
      const context: WeightingContext = { phase: 'learning' };
      const weights = getAdjustedWeights(context);

      expect(weights.multiple_choice).toBeCloseTo(0.3);
      expect(weights.true_false).toBeCloseTo(0.1);
      expect(weights.free_text).toBeCloseTo(0.4);
      expect(weights.interactive).toBeCloseTo(0.2);
    });

    it('returns adjusted weights when context factors apply', () => {
      const context: WeightingContext = {
        phase: 'learning',
        recentAccuracy: 0.3,
      };
      const weights = getAdjustedWeights(context);

      // MC should be higher than base 0.3
      expect(weights.multiple_choice).toBeGreaterThan(0.3);
    });

    it('returns normalized weights summing to 1', () => {
      const context: WeightingContext = {
        phase: 'learning',
        recentAccuracy: 0.2,
        masteryState: 'mastered',
        bloomLevel: 'analyze',
      };
      const weights = getAdjustedWeights(context);

      expect(sumWeights(weights)).toBeCloseTo(1.0);
    });

    it('is consistent with selectQuestionType behavior', () => {
      const context: WeightingContext = {
        phase: 'review',
        recentAccuracy: 0.4,
      };
      const weights = getAdjustedWeights(context);

      // Selection at threshold should match weight boundaries
      // If random < MC weight, should select MC
      expect(selectQuestionType(context, weights.multiple_choice - 0.01)).toBe(
        'multiple_choice'
      );
    });
  });

  // ============================================================================
  // Integration tests
  // ============================================================================

  describe('integration', () => {
    it('full workflow: pretest with no adjustments', () => {
      const context: WeightingContext = {
        phase: 'pretest',
        recentAccuracy: 0.3, // Should be ignored for pretest
        masteryState: 'new',
      };

      const weights = getAdjustedWeights(context);
      const selection = selectQuestionType(context, 0.5);

      expect(weights.multiple_choice).toBeCloseTo(1.0);
      expect(selection).toBe('multiple_choice');
    });

    it('full workflow: learning with struggling student', () => {
      const context: WeightingContext = {
        phase: 'learning',
        recentAccuracy: 0.25, // Struggling
        masteryState: 'learning',
        cognitiveCapacity: createMockCapacity(70), // 30% capacity available
      };

      const weights = getAdjustedWeights(context);

      // Should favor easier question types
      expect(weights.multiple_choice).toBeGreaterThan(0.3); // Base is 0.3
      expect(weights.true_false).toBeGreaterThan(0.1); // Base is 0.1
    });

    it('full workflow: review with mastered concept at high Bloom level', () => {
      const context: WeightingContext = {
        phase: 'review',
        recentAccuracy: 0.9, // Doing well
        masteryState: 'mastered',
        bloomLevel: 'evaluate',
      };

      const weights = getAdjustedWeights(context);

      // Should favor more challenging question types
      expect(weights.interactive).toBeGreaterThan(0.1); // Base is 0.1
      expect(weights.free_text).toBeGreaterThan(0.4); // Base is 0.4
    });

    it('weights always remain valid after any combination of adjustments', () => {
      const phases: QuestionPhase[] = ['pretest', 'learning', 'review'];
      const accuracies = [0.1, 0.5, 0.9, undefined];
      const masteries: Array<'new' | 'learning' | 'reviewing' | 'mastered' | undefined> = [
        'new',
        'learning',
        'reviewing',
        'mastered',
        undefined,
      ];
      const capacities = [0, 50, 80, 100, undefined];
      const bloomLevels: Array<
        'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' | undefined
      > = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', undefined];

      // Test a sampling of combinations
      for (const phase of phases) {
        for (const accuracy of [0.1, 0.9, undefined]) {
          for (const mastery of ['new', 'mastered', undefined] as const) {
            for (const capacity of [0, 100, undefined]) {
              const context: WeightingContext = {
                phase,
                recentAccuracy: accuracy,
                masteryState: mastery,
                cognitiveCapacity:
                  capacity !== undefined ? createMockCapacity(capacity) : undefined,
              };

              const weights = getAdjustedWeights(context);

              // All weights should be non-negative
              expect(weights.multiple_choice).toBeGreaterThanOrEqual(0);
              expect(weights.true_false).toBeGreaterThanOrEqual(0);
              expect(weights.free_text).toBeGreaterThanOrEqual(0);
              expect(weights.interactive).toBeGreaterThanOrEqual(0);

              // Should sum to 1
              expect(sumWeights(weights)).toBeCloseTo(1.0);
            }
          }
        }
      }
    });
  });
});
