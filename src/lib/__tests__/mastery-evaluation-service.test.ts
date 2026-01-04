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
} from '../mastery-evaluation-service';

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
});
