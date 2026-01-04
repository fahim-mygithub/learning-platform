/**
 * Mastery Evaluation Service Tests
 *
 * Tests for the mastery evaluation service that scores synthesis phase responses,
 * identifies weak concepts, and returns mastery summary for session complete card.
 */

import {
  createMasteryEvaluationService,
  MasteryEvaluationError,
  type MasteryEvaluationService,
  type CompletedInteraction,
  type MasterySummary,
  type ConceptMastery,
  type RubricCompletedInteraction,
  type RubricConceptMastery,
  type RubricMasterySummary,
} from '../mastery-evaluation-service';
import type { RubricEvaluationService } from '../rubric-evaluation-service';
import type { RubricEvaluation, RubricDimension } from '@/src/types/rubric';

// Helper to create mock completed interactions
const createMockInteraction = (
  overrides: Partial<CompletedInteraction> = {}
): CompletedInteraction => ({
  id: `interaction-${Math.random().toString(36).substring(7)}`,
  conceptId: 'concept-1',
  conceptName: 'Test Concept',
  isCorrect: true,
  attemptCount: 1,
  ...overrides,
});

// Helper to create mock rubric completed interactions
const createMockRubricInteraction = (
  overrides: Partial<RubricCompletedInteraction> = {}
): RubricCompletedInteraction => ({
  id: `interaction-${Math.random().toString(36).substring(7)}`,
  conceptId: 'concept-1',
  conceptName: 'Test Concept',
  isCorrect: true,
  attemptCount: 1,
  userAnswer: 'The user provided this answer',
  interactionType: 'free_recall',
  prompt: 'Explain the concept',
  ...overrides,
});

// Helper to create mock rubric evaluation
const createMockRubricEvaluation = (
  overrides: Partial<RubricEvaluation> = {}
): RubricEvaluation => ({
  interactionId: `interaction-${Math.random().toString(36).substring(7)}`,
  conceptId: 'concept-1',
  dimensions: [
    { dimension: 'accuracy', score: 2, feedback: 'Good accuracy' },
    { dimension: 'completeness', score: 2, feedback: 'Good completeness' },
  ],
  passed: true,
  overallFeedback: 'Good overall performance',
  ...overrides,
});

// Helper to create mock rubric evaluation service
const createMockRubricService = (
  evaluations: RubricEvaluation[] = []
): RubricEvaluationService => ({
  evaluateBatch: jest.fn().mockResolvedValue({
    evaluations,
    totalTokens: 100,
  }),
});

describe('mastery-evaluation-service', () => {
  let service: MasteryEvaluationService;

  beforeEach(() => {
    service = createMasteryEvaluationService();
  });

  describe('createMasteryEvaluationService', () => {
    it('creates a service instance with evaluate method', () => {
      expect(service).toBeDefined();
      expect(typeof service.evaluate).toBe('function');
    });

    it('accepts optional configuration', () => {
      const customService = createMasteryEvaluationService({
        minXP: 25,
        maxXP: 200,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws NO_INTERACTIONS error when empty interactions array', () => {
      expect(() => service.evaluate([])).toThrow(MasteryEvaluationError);
      expect(() => service.evaluate([])).toThrow('No interactions to evaluate');

      try {
        service.evaluate([]);
      } catch (error) {
        expect((error as MasteryEvaluationError).code).toBe('NO_INTERACTIONS');
      }
    });
  });

  describe('basic scoring', () => {
    it('calculates correctCount correctly', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.correctCount).toBe(2);
    });

    it('calculates totalCount correctly', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.totalCount).toBe(4);
    });

    it('calculates scorePercentage correctly', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.scorePercentage).toBe(50);
    });

    it('calculates 100% score when all correct', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
      ];

      const result = service.evaluate(interactions);
      expect(result.scorePercentage).toBe(100);
    });

    it('calculates 0% score when all incorrect', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.scorePercentage).toBe(0);
    });

    it('rounds scorePercentage to nearest integer', () => {
      // 1 out of 3 = 33.33%
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.scorePercentage).toBe(33);
    });
  });

  describe('concept mastery classification', () => {
    it('classifies first-attempt correct as mastered', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Concept 1',
          isCorrect: true,
          attemptCount: 1,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsMastered).toHaveLength(1);
      expect(result.conceptsMastered[0].status).toBe('mastered');
      expect(result.conceptsMastered[0].conceptId).toBe('c1');
      expect(result.conceptsMastered[0].attemptCount).toBe(1);
    });

    it('classifies retry-correct as reinforced (needs review list)', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Concept 1',
          isCorrect: true,
          attemptCount: 2,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsNeedingReview).toHaveLength(1);
      expect(result.conceptsNeedingReview[0].status).toBe('reinforced');
      expect(result.conceptsNeedingReview[0].attemptCount).toBe(2);
    });

    it('classifies incorrect as needs_review', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Concept 1',
          isCorrect: false,
          attemptCount: 3,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsNeedingReview).toHaveLength(1);
      expect(result.conceptsNeedingReview[0].status).toBe('needs_review');
      expect(result.conceptsNeedingReview[0].attemptCount).toBe(3);
    });

    it('includes conceptId and conceptName in ConceptMastery', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'unique-id-123',
          conceptName: 'Machine Learning Basics',
          isCorrect: true,
          attemptCount: 1,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsMastered[0].conceptId).toBe('unique-id-123');
      expect(result.conceptsMastered[0].conceptName).toBe('Machine Learning Basics');
    });

    it('separates mastered concepts from concepts needing review', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Mastered Concept',
          isCorrect: true,
          attemptCount: 1,
        }),
        createMockInteraction({
          conceptId: 'c2',
          conceptName: 'Reinforced Concept',
          isCorrect: true,
          attemptCount: 2,
        }),
        createMockInteraction({
          conceptId: 'c3',
          conceptName: 'Needs Review Concept',
          isCorrect: false,
          attemptCount: 1,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsMastered).toHaveLength(1);
      expect(result.conceptsMastered[0].conceptId).toBe('c1');

      expect(result.conceptsNeedingReview).toHaveLength(2);
      const needingReviewIds = result.conceptsNeedingReview.map((c) => c.conceptId);
      expect(needingReviewIds).toContain('c2');
      expect(needingReviewIds).toContain('c3');
    });
  });

  describe('multiple interactions for same concept', () => {
    it('takes worst status when same concept has multiple interactions', () => {
      // Same concept with one mastered and one needs_review should result in needs_review
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: true,
          attemptCount: 1,
        }),
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: false,
          attemptCount: 2,
        }),
      ];

      const result = service.evaluate(interactions);

      // Should be in needs review since one was incorrect
      expect(result.conceptsMastered).toHaveLength(0);
      expect(result.conceptsNeedingReview).toHaveLength(1);
      expect(result.conceptsNeedingReview[0].status).toBe('needs_review');
    });

    it('takes worst status: reinforced worse than mastered', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: true,
          attemptCount: 1, // mastered
        }),
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: true,
          attemptCount: 2, // reinforced
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsMastered).toHaveLength(0);
      expect(result.conceptsNeedingReview).toHaveLength(1);
      expect(result.conceptsNeedingReview[0].status).toBe('reinforced');
    });

    it('tracks highest attempt count for consolidated concept', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: true,
          attemptCount: 1,
        }),
        createMockInteraction({
          conceptId: 'c1',
          conceptName: 'Same Concept',
          isCorrect: true,
          attemptCount: 3,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsNeedingReview[0].attemptCount).toBe(3);
    });
  });

  describe('XP calculation', () => {
    it('returns maxXP (150) for 100% score', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
      ];

      const result = service.evaluate(interactions);
      expect(result.xpRecommendation).toBe(150);
    });

    it('returns minXP (50) for 0% score', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.xpRecommendation).toBe(50);
    });

    it('returns 100 XP for 50% score (linear interpolation)', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.xpRecommendation).toBe(100);
    });

    it('uses linear interpolation for intermediate scores', () => {
      // 75% score should give 50 + (100 * 0.75) = 125 XP
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.xpRecommendation).toBe(125);
    });

    it('rounds XP to nearest integer', () => {
      // 33.33% score -> 50 + (100 * 0.3333) = 83.33 -> 83
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = service.evaluate(interactions);
      expect(result.xpRecommendation).toBe(83);
    });

    it('respects custom minXP configuration', () => {
      const customService = createMasteryEvaluationService({ minXP: 25 });

      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: false }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = customService.evaluate(interactions);
      expect(result.xpRecommendation).toBe(25);
    });

    it('respects custom maxXP configuration', () => {
      const customService = createMasteryEvaluationService({ maxXP: 200 });

      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: true }),
      ];

      const result = customService.evaluate(interactions);
      expect(result.xpRecommendation).toBe(200);
    });

    it('respects custom minXP and maxXP configuration together', () => {
      const customService = createMasteryEvaluationService({
        minXP: 0,
        maxXP: 100,
      });

      // 50% score with range 0-100 should give 50
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
        createMockInteraction({ isCorrect: false }),
      ];

      const result = customService.evaluate(interactions);
      expect(result.xpRecommendation).toBe(50);
    });
  });

  describe('MasteryEvaluationError', () => {
    it('has correct name and properties', () => {
      const error = new MasteryEvaluationError('Test error', 'EVALUATION_FAILED');

      expect(error.name).toBe('MasteryEvaluationError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('EVALUATION_FAILED');
    });

    it('is an instance of Error', () => {
      const error = new MasteryEvaluationError('Test error', 'NO_INTERACTIONS');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MasteryEvaluationError);
    });
  });

  describe('edge cases', () => {
    it('handles single interaction correctly', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true, attemptCount: 1 }),
      ];

      const result = service.evaluate(interactions);

      expect(result.correctCount).toBe(1);
      expect(result.totalCount).toBe(1);
      expect(result.scorePercentage).toBe(100);
      expect(result.xpRecommendation).toBe(150);
      expect(result.conceptsMastered).toHaveLength(1);
      expect(result.conceptsNeedingReview).toHaveLength(0);
    });

    it('handles many interactions correctly', () => {
      const interactions: CompletedInteraction[] = Array.from(
        { length: 100 },
        (_, i) =>
          createMockInteraction({
            conceptId: `concept-${i}`,
            conceptName: `Concept ${i}`,
            isCorrect: i % 2 === 0, // 50% correct
            attemptCount: 1,
          })
      );

      const result = service.evaluate(interactions);

      expect(result.correctCount).toBe(50);
      expect(result.totalCount).toBe(100);
      expect(result.scorePercentage).toBe(50);
      expect(result.conceptsMastered).toHaveLength(50);
      expect(result.conceptsNeedingReview).toHaveLength(50);
    });

    it('handles attemptCount > 2', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({
          isCorrect: true,
          attemptCount: 5,
        }),
      ];

      const result = service.evaluate(interactions);

      expect(result.conceptsNeedingReview).toHaveLength(1);
      expect(result.conceptsNeedingReview[0].status).toBe('reinforced');
      expect(result.conceptsNeedingReview[0].attemptCount).toBe(5);
    });

    it('returns valid MasterySummary structure', () => {
      const interactions: CompletedInteraction[] = [
        createMockInteraction({ isCorrect: true }),
      ];

      const result = service.evaluate(interactions);

      expect(typeof result.correctCount).toBe('number');
      expect(typeof result.totalCount).toBe('number');
      expect(typeof result.scorePercentage).toBe('number');
      expect(Array.isArray(result.conceptsMastered)).toBe(true);
      expect(Array.isArray(result.conceptsNeedingReview)).toBe(true);
      expect(typeof result.xpRecommendation).toBe('number');
    });
  });

  // ============================================================================
  // Rubric-Based Evaluation Tests
  // ============================================================================

  describe('RubricCompletedInteraction type', () => {
    it('extends CompletedInteraction with userAnswer field', () => {
      const rubricInteraction: RubricCompletedInteraction = createMockRubricInteraction();

      // Should have all CompletedInteraction fields
      expect(rubricInteraction.id).toBeDefined();
      expect(rubricInteraction.conceptId).toBeDefined();
      expect(rubricInteraction.conceptName).toBeDefined();
      expect(rubricInteraction.isCorrect).toBeDefined();
      expect(rubricInteraction.attemptCount).toBeDefined();

      // Should have new rubric-specific fields
      expect(rubricInteraction.userAnswer).toBeDefined();
      expect(typeof rubricInteraction.userAnswer).toBe('string');
    });

    it('includes interactionType and prompt fields', () => {
      const rubricInteraction: RubricCompletedInteraction = createMockRubricInteraction({
        interactionType: 'mcq',
        prompt: 'What is the answer?',
      });

      expect(rubricInteraction.interactionType).toBe('mcq');
      expect(rubricInteraction.prompt).toBe('What is the answer?');
    });

    it('allows optional expectedAnswerHints field', () => {
      const rubricInteraction: RubricCompletedInteraction = createMockRubricInteraction({
        expectedAnswerHints: 'The answer should include X and Y',
      });

      expect(rubricInteraction.expectedAnswerHints).toBe('The answer should include X and Y');
    });
  });

  describe('evaluateWithRubric method', () => {
    it('exists on the service interface', () => {
      const mockRubricService = createMockRubricService([]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      expect(typeof serviceWithRubric.evaluateWithRubric).toBe('function');
    });

    it('throws error when rubric service is not provided', async () => {
      const serviceWithoutRubric = createMasteryEvaluationService();

      const interactions: RubricCompletedInteraction[] = [
        createMockRubricInteraction(),
      ];

      await expect(
        serviceWithoutRubric.evaluateWithRubric('source-1', interactions)
      ).rejects.toThrow('Rubric evaluation service not configured');
    });

    it('throws error for empty interactions array', async () => {
      const mockRubricService = createMockRubricService([]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      await expect(
        serviceWithRubric.evaluateWithRubric('source-1', [])
      ).rejects.toThrow(MasteryEvaluationError);
    });

    it('calls rubric service evaluateBatch with correct request', async () => {
      const interaction1 = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Concept 1',
        interactionType: 'free_recall',
        prompt: 'Explain X',
        userAnswer: 'X is about...',
        expectedAnswerHints: 'Should mention Y',
      });

      const mockEvaluation = createMockRubricEvaluation({
        interactionId: 'int-1',
        conceptId: 'c1',
        passed: true,
      });

      const mockRubricService = createMockRubricService([mockEvaluation]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      await serviceWithRubric.evaluateWithRubric('source-1', [interaction1]);

      expect(mockRubricService.evaluateBatch).toHaveBeenCalledWith({
        sourceId: 'source-1',
        interactions: [
          {
            interactionId: 'int-1',
            conceptId: 'c1',
            conceptName: 'Concept 1',
            interactionType: 'free_recall',
            prompt: 'Explain X',
            userAnswer: 'X is about...',
            expectedAnswer: 'Should mention Y',
          },
        ],
      });
    });

    it('returns RubricMasterySummary with rubric evaluations', async () => {
      const interaction = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
      });

      const mockEvaluation = createMockRubricEvaluation({
        interactionId: 'int-1',
        conceptId: 'c1',
        passed: true,
      });

      const mockRubricService = createMockRubricService([mockEvaluation]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [interaction]);

      expect(result.rubricEvaluations).toBeDefined();
      expect(result.rubricEvaluations).toHaveLength(1);
      expect(result.rubricEvaluations[0].interactionId).toBe('int-1');
    });

    it('returns RubricConceptMastery with dimension summary', async () => {
      const interaction = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Test Concept',
      });

      const mockEvaluation = createMockRubricEvaluation({
        interactionId: 'int-1',
        conceptId: 'c1',
        dimensions: [
          { dimension: 'accuracy', score: 2, feedback: 'Good' },
          { dimension: 'completeness', score: 3, feedback: 'Excellent' },
          { dimension: 'depth', score: 1, feedback: 'Okay' },
        ],
        passed: true,
      });

      const mockRubricService = createMockRubricService([mockEvaluation]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [interaction]);

      expect(result.conceptMasteries).toBeDefined();
      expect(result.conceptMasteries).toHaveLength(1);
      expect(result.conceptMasteries[0].dimensionSummary).toBeDefined();
      expect(result.conceptMasteries[0].dimensionSummary.accuracy).toEqual({ passed: 1, total: 1 });
      expect(result.conceptMasteries[0].dimensionSummary.completeness).toEqual({ passed: 1, total: 1 });
      expect(result.conceptMasteries[0].dimensionSummary.depth).toEqual({ passed: 1, total: 1 });
    });
  });

  describe('component-based mastery calculation', () => {
    it('marks concept as mastered when ALL evaluations pass', async () => {
      const interaction1 = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });
      const interaction2 = createMockRubricInteraction({
        id: 'int-2',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: true }),
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c1', passed: true }),
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [
        interaction1,
        interaction2,
      ]);

      const conceptMastery = result.conceptMasteries.find((c) => c.conceptId === 'c1');
      expect(conceptMastery?.status).toBe('mastered');
    });

    it('marks concept as reinforced when SOME evaluations pass', async () => {
      const interaction1 = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });
      const interaction2 = createMockRubricInteraction({
        id: 'int-2',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: true }),
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c1', passed: false }),
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [
        interaction1,
        interaction2,
      ]);

      const conceptMastery = result.conceptMasteries.find((c) => c.conceptId === 'c1');
      expect(conceptMastery?.status).toBe('reinforced');
    });

    it('marks concept as needs_review when NO evaluations pass', async () => {
      const interaction1 = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });
      const interaction2 = createMockRubricInteraction({
        id: 'int-2',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: false }),
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c1', passed: false }),
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [
        interaction1,
        interaction2,
      ]);

      const conceptMastery = result.conceptMasteries.find((c) => c.conceptId === 'c1');
      expect(conceptMastery?.status).toBe('needs_review');
    });

    it('handles multiple concepts correctly', async () => {
      const interactions = [
        createMockRubricInteraction({ id: 'int-1', conceptId: 'c1', conceptName: 'Concept 1' }),
        createMockRubricInteraction({ id: 'int-2', conceptId: 'c2', conceptName: 'Concept 2' }),
        createMockRubricInteraction({ id: 'int-3', conceptId: 'c3', conceptName: 'Concept 3' }),
      ];

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: true }), // mastered
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c2', passed: false }), // needs_review
        createMockRubricEvaluation({ interactionId: 'int-3', conceptId: 'c3', passed: true }), // mastered
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', interactions);

      expect(result.conceptsMastered).toHaveLength(2);
      expect(result.conceptsNeedingReview).toHaveLength(1);

      const masteredIds = result.conceptsMastered.map((c) => c.conceptId);
      expect(masteredIds).toContain('c1');
      expect(masteredIds).toContain('c3');

      expect(result.conceptsNeedingReview[0].conceptId).toBe('c2');
    });

    it('includes rubricEvaluations in each RubricConceptMastery', async () => {
      const interaction = createMockRubricInteraction({
        id: 'int-1',
        conceptId: 'c1',
        conceptName: 'Concept 1',
      });

      const mockEvaluation = createMockRubricEvaluation({
        interactionId: 'int-1',
        conceptId: 'c1',
        passed: true,
        overallFeedback: 'Great job!',
      });

      const mockRubricService = createMockRubricService([mockEvaluation]);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', [interaction]);

      expect(result.conceptMasteries[0].rubricEvaluations).toHaveLength(1);
      expect(result.conceptMasteries[0].rubricEvaluations[0].overallFeedback).toBe('Great job!');
    });
  });

  describe('rubric evaluation error handling', () => {
    it('handles AI service errors gracefully', async () => {
      const mockRubricService: RubricEvaluationService = {
        evaluateBatch: jest.fn().mockRejectedValue(new Error('AI service unavailable')),
      };
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const interaction = createMockRubricInteraction();

      await expect(
        serviceWithRubric.evaluateWithRubric('source-1', [interaction])
      ).rejects.toThrow('AI service unavailable');
    });

    it('propagates MasteryEvaluationError correctly', async () => {
      const mockRubricService: RubricEvaluationService = {
        evaluateBatch: jest.fn().mockRejectedValue(
          new MasteryEvaluationError('Custom error', 'EVALUATION_FAILED')
        ),
      };
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const interaction = createMockRubricInteraction();

      try {
        await serviceWithRubric.evaluateWithRubric('source-1', [interaction]);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MasteryEvaluationError);
        expect((error as MasteryEvaluationError).code).toBe('EVALUATION_FAILED');
      }
    });
  });

  describe('score calculation with rubrics', () => {
    it('calculates correctCount based on passed evaluations', async () => {
      const interactions = [
        createMockRubricInteraction({ id: 'int-1', conceptId: 'c1' }),
        createMockRubricInteraction({ id: 'int-2', conceptId: 'c2' }),
        createMockRubricInteraction({ id: 'int-3', conceptId: 'c3' }),
      ];

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: true }),
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c2', passed: false }),
        createMockRubricEvaluation({ interactionId: 'int-3', conceptId: 'c3', passed: true }),
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', interactions);

      expect(result.correctCount).toBe(2);
      expect(result.totalCount).toBe(3);
      expect(result.scorePercentage).toBe(67); // 2/3 = 66.67% rounded
    });

    it('calculates XP based on score percentage', async () => {
      const interactions = [
        createMockRubricInteraction({ id: 'int-1', conceptId: 'c1' }),
        createMockRubricInteraction({ id: 'int-2', conceptId: 'c2' }),
      ];

      const mockEvaluations = [
        createMockRubricEvaluation({ interactionId: 'int-1', conceptId: 'c1', passed: true }),
        createMockRubricEvaluation({ interactionId: 'int-2', conceptId: 'c2', passed: true }),
      ];

      const mockRubricService = createMockRubricService(mockEvaluations);
      const serviceWithRubric = createMasteryEvaluationService(undefined, mockRubricService);

      const result = await serviceWithRubric.evaluateWithRubric('source-1', interactions);

      expect(result.scorePercentage).toBe(100);
      expect(result.xpRecommendation).toBe(150); // Max XP for 100%
    });
  });
});
