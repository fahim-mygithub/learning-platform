/**
 * Rubric Types Tests
 *
 * TDD tests for rubric-based AI mastery evaluation types.
 * Tests verify type definitions, constants, and helper functions.
 */

import {
  RubricDimension,
  RubricScore,
  DimensionEvaluation,
  RubricEvaluation,
  BatchEvaluationRequest,
  BatchEvaluationResponse,
  RUBRIC_DIMENSIONS,
  INTERACTION_RUBRIC_DIMENSIONS,
  RUBRIC_PASS_THRESHOLDS,
  checkDimensionPassed,
} from '../rubric';
import type { InteractionType } from '../../lib/synthesis-phase-service';

describe('Rubric Types', () => {
  describe('RubricDimension', () => {
    it('should have all 6 dimensions defined', () => {
      const expectedDimensions: RubricDimension[] = [
        'accuracy',
        'completeness',
        'depth',
        'reasoning',
        'synthesis',
        'transfer',
      ];

      expect(RUBRIC_DIMENSIONS).toHaveLength(6);
      expectedDimensions.forEach((dimension) => {
        expect(RUBRIC_DIMENSIONS).toContain(dimension);
      });
    });
  });

  describe('RubricScore', () => {
    it('should accept valid scores 0-3', () => {
      const validScores: RubricScore[] = [0, 1, 2, 3];
      validScores.forEach((score) => {
        // TypeScript compile-time check - if this compiles, the type is correct
        const testScore: RubricScore = score;
        expect(testScore).toBeGreaterThanOrEqual(0);
        expect(testScore).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('DimensionEvaluation interface', () => {
    it('should have required properties', () => {
      const evaluation: DimensionEvaluation = {
        dimension: 'accuracy',
        score: 2,
        feedback: 'Good accuracy in the response',
      };

      expect(evaluation.dimension).toBe('accuracy');
      expect(evaluation.score).toBe(2);
      expect(evaluation.feedback).toBe('Good accuracy in the response');
    });
  });

  describe('RubricEvaluation interface', () => {
    it('should have all required properties', () => {
      const rubricEval: RubricEvaluation = {
        interactionId: 'int-123',
        conceptId: 'concept-456',
        dimensions: [
          { dimension: 'accuracy', score: 2, feedback: 'Accurate' },
          { dimension: 'completeness', score: 3, feedback: 'Complete' },
        ],
        passed: true,
        overallFeedback: 'Great job!',
      };

      expect(rubricEval.interactionId).toBe('int-123');
      expect(rubricEval.conceptId).toBe('concept-456');
      expect(rubricEval.dimensions).toHaveLength(2);
      expect(rubricEval.passed).toBe(true);
      expect(rubricEval.overallFeedback).toBe('Great job!');
    });
  });

  describe('INTERACTION_RUBRIC_DIMENSIONS', () => {
    it('should map free_recall to all 6 dimensions', () => {
      const freeRecallDimensions = INTERACTION_RUBRIC_DIMENSIONS.free_recall;
      expect(freeRecallDimensions).toHaveLength(6);
      expect(freeRecallDimensions).toContain('accuracy');
      expect(freeRecallDimensions).toContain('completeness');
      expect(freeRecallDimensions).toContain('depth');
      expect(freeRecallDimensions).toContain('reasoning');
      expect(freeRecallDimensions).toContain('synthesis');
      expect(freeRecallDimensions).toContain('transfer');
    });

    it('should map fill_in_blank to accuracy and completeness', () => {
      const dimensions = INTERACTION_RUBRIC_DIMENSIONS.fill_in_blank;
      expect(dimensions).toHaveLength(2);
      expect(dimensions).toContain('accuracy');
      expect(dimensions).toContain('completeness');
    });

    it('should map sequence to accuracy and reasoning', () => {
      const dimensions = INTERACTION_RUBRIC_DIMENSIONS.sequence;
      expect(dimensions).toHaveLength(2);
      expect(dimensions).toContain('accuracy');
      expect(dimensions).toContain('reasoning');
    });

    it('should map connect_dots to synthesis and transfer', () => {
      const dimensions = INTERACTION_RUBRIC_DIMENSIONS.connect_dots;
      expect(dimensions).toHaveLength(2);
      expect(dimensions).toContain('synthesis');
      expect(dimensions).toContain('transfer');
    });

    it('should map mcq to accuracy only', () => {
      const dimensions = INTERACTION_RUBRIC_DIMENSIONS.mcq;
      expect(dimensions).toHaveLength(1);
      expect(dimensions).toContain('accuracy');
    });

    it('should have mappings for all interaction types', () => {
      const interactionTypes: InteractionType[] = [
        'free_recall',
        'fill_in_blank',
        'sequence',
        'connect_dots',
        'mcq',
      ];

      interactionTypes.forEach((type) => {
        expect(INTERACTION_RUBRIC_DIMENSIONS[type]).toBeDefined();
        expect(Array.isArray(INTERACTION_RUBRIC_DIMENSIONS[type])).toBe(true);
        expect(INTERACTION_RUBRIC_DIMENSIONS[type].length).toBeGreaterThan(0);
      });
    });
  });

  describe('RUBRIC_PASS_THRESHOLDS', () => {
    it('should have correct threshold for accuracy (>= 2)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.accuracy).toBe(2);
    });

    it('should have correct threshold for completeness (>= 2)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.completeness).toBe(2);
    });

    it('should have correct threshold for depth (>= 1)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.depth).toBe(1);
    });

    it('should have correct threshold for reasoning (>= 1)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.reasoning).toBe(1);
    });

    it('should have correct threshold for synthesis (>= 1)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.synthesis).toBe(1);
    });

    it('should have correct threshold for transfer (>= 1)', () => {
      expect(RUBRIC_PASS_THRESHOLDS.transfer).toBe(1);
    });

    it('should have thresholds for all dimensions', () => {
      RUBRIC_DIMENSIONS.forEach((dimension) => {
        expect(RUBRIC_PASS_THRESHOLDS[dimension]).toBeDefined();
        expect(typeof RUBRIC_PASS_THRESHOLDS[dimension]).toBe('number');
      });
    });
  });

  describe('checkDimensionPassed', () => {
    describe('accuracy dimension (threshold: 2)', () => {
      it('should return false for score 0', () => {
        expect(checkDimensionPassed('accuracy', 0)).toBe(false);
      });

      it('should return false for score 1', () => {
        expect(checkDimensionPassed('accuracy', 1)).toBe(false);
      });

      it('should return true for score 2', () => {
        expect(checkDimensionPassed('accuracy', 2)).toBe(true);
      });

      it('should return true for score 3', () => {
        expect(checkDimensionPassed('accuracy', 3)).toBe(true);
      });
    });

    describe('completeness dimension (threshold: 2)', () => {
      it('should return false for score 1', () => {
        expect(checkDimensionPassed('completeness', 1)).toBe(false);
      });

      it('should return true for score 2', () => {
        expect(checkDimensionPassed('completeness', 2)).toBe(true);
      });
    });

    describe('depth dimension (threshold: 1)', () => {
      it('should return false for score 0', () => {
        expect(checkDimensionPassed('depth', 0)).toBe(false);
      });

      it('should return true for score 1', () => {
        expect(checkDimensionPassed('depth', 1)).toBe(true);
      });

      it('should return true for score 2', () => {
        expect(checkDimensionPassed('depth', 2)).toBe(true);
      });
    });

    describe('reasoning dimension (threshold: 1)', () => {
      it('should return false for score 0', () => {
        expect(checkDimensionPassed('reasoning', 0)).toBe(false);
      });

      it('should return true for score 1', () => {
        expect(checkDimensionPassed('reasoning', 1)).toBe(true);
      });
    });

    describe('synthesis dimension (threshold: 1)', () => {
      it('should return false for score 0', () => {
        expect(checkDimensionPassed('synthesis', 0)).toBe(false);
      });

      it('should return true for score 1', () => {
        expect(checkDimensionPassed('synthesis', 1)).toBe(true);
      });
    });

    describe('transfer dimension (threshold: 1)', () => {
      it('should return false for score 0', () => {
        expect(checkDimensionPassed('transfer', 0)).toBe(false);
      });

      it('should return true for score 1', () => {
        expect(checkDimensionPassed('transfer', 1)).toBe(true);
      });
    });
  });

  describe('BatchEvaluationRequest interface', () => {
    it('should have required properties', () => {
      const request: BatchEvaluationRequest = {
        sourceId: 'source-123',
        interactions: [
          {
            interactionId: 'int-1',
            conceptId: 'concept-1',
            conceptName: 'Test Concept',
            interactionType: 'free_recall',
            prompt: 'What is the concept?',
            userAnswer: 'This is the concept explanation',
          },
          {
            interactionId: 'int-2',
            conceptId: 'concept-2',
            conceptName: 'Another Concept',
            interactionType: 'mcq',
            prompt: 'Select the correct answer',
            userAnswer: 'A',
            expectedAnswer: 'A',
          },
        ],
      };

      expect(request.sourceId).toBe('source-123');
      expect(request.interactions).toHaveLength(2);
      expect(request.interactions[0].interactionId).toBe('int-1');
      expect(request.interactions[0].interactionType).toBe('free_recall');
      expect(request.interactions[1].expectedAnswer).toBe('A');
    });
  });

  describe('BatchEvaluationResponse interface', () => {
    it('should have required properties', () => {
      const response: BatchEvaluationResponse = {
        evaluations: [
          {
            interactionId: 'int-1',
            conceptId: 'concept-1',
            dimensions: [{ dimension: 'accuracy', score: 3, feedback: 'Perfect!' }],
            passed: true,
            overallFeedback: 'Excellent understanding',
          },
        ],
        totalTokens: 1500,
      };

      expect(response.evaluations).toHaveLength(1);
      expect(response.totalTokens).toBe(1500);
    });
  });
});
