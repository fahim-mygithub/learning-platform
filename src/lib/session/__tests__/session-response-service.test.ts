/**
 * Session Response Service Tests
 *
 * Tests for saving session responses and updating mastery states.
 */

import { calculateSessionStats, type ResponseData } from '../session-response-service';

// Note: saveResponses, getSessionResponses are integration tests that require
// a Supabase connection. This file tests the pure functions.

describe('SessionResponseService', () => {
  describe('calculateSessionStats', () => {
    it('returns zero stats for empty responses', () => {
      const result = calculateSessionStats([]);

      expect(result.total).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.incorrect).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.averageTimeMs).toBe(0);
    });

    it('calculates correct accuracy', () => {
      const responses: ResponseData[] = [
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: false }),
        createResponse({ isCorrect: true }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.total).toBe(4);
      expect(result.correct).toBe(3);
      expect(result.incorrect).toBe(1);
      expect(result.accuracy).toBe(75); // 3/4 = 75%
    });

    it('calculates 100% accuracy for all correct', () => {
      const responses: ResponseData[] = [
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: true }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.accuracy).toBe(100);
    });

    it('calculates 0% accuracy for all incorrect', () => {
      const responses: ResponseData[] = [
        createResponse({ isCorrect: false }),
        createResponse({ isCorrect: false }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.accuracy).toBe(0);
    });

    it('calculates average response time', () => {
      const responses: ResponseData[] = [
        createResponse({ responseTimeMs: 1000 }),
        createResponse({ responseTimeMs: 2000 }),
        createResponse({ responseTimeMs: 3000 }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.averageTimeMs).toBe(2000); // (1000+2000+3000)/3 = 2000
    });

    it('counts responses by item type', () => {
      const responses: ResponseData[] = [
        createResponse({ itemType: 'pretest', isCorrect: true }),
        createResponse({ itemType: 'pretest', isCorrect: false }),
        createResponse({ itemType: 'new', isCorrect: true }),
        createResponse({ itemType: 'new', isCorrect: true }),
        createResponse({ itemType: 'new', isCorrect: false }),
        createResponse({ itemType: 'review', isCorrect: true }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.byType.pretest.total).toBe(2);
      expect(result.byType.pretest.correct).toBe(1);
      expect(result.byType.new.total).toBe(3);
      expect(result.byType.new.correct).toBe(2);
      expect(result.byType.review.total).toBe(1);
      expect(result.byType.review.correct).toBe(1);
    });

    it('handles single response', () => {
      const responses: ResponseData[] = [
        createResponse({ isCorrect: true, responseTimeMs: 5000 }),
      ];

      const result = calculateSessionStats(responses);

      expect(result.total).toBe(1);
      expect(result.correct).toBe(1);
      expect(result.accuracy).toBe(100);
      expect(result.averageTimeMs).toBe(5000);
    });

    it('rounds accuracy to nearest integer', () => {
      const responses: ResponseData[] = [
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: true }),
        createResponse({ isCorrect: false }),
      ];

      const result = calculateSessionStats(responses);

      // 2/3 = 66.666... should round to 67
      expect(result.accuracy).toBe(67);
    });

    it('rounds average time to nearest integer', () => {
      const responses: ResponseData[] = [
        createResponse({ responseTimeMs: 1000 }),
        createResponse({ responseTimeMs: 1500 }),
      ];

      const result = calculateSessionStats(responses);

      // (1000+1500)/2 = 1250
      expect(result.averageTimeMs).toBe(1250);
    });
  });

  describe('ResponseData structure', () => {
    it('accepts valid response data', () => {
      const response: ResponseData = {
        conceptId: 'concept-1',
        itemType: 'pretest',
        questionType: 'multiple_choice',
        questionText: 'What is X?',
        userResponse: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        responseTimeMs: 3000,
        confidenceLevel: 4,
        misconceptions: [],
      };

      expect(response.conceptId).toBe('concept-1');
      expect(response.itemType).toBe('pretest');
      expect(response.isCorrect).toBe(true);
    });

    it('accepts response with misconceptions', () => {
      const response: ResponseData = {
        conceptId: 'concept-1',
        itemType: 'review',
        questionType: 'free_text',
        questionText: 'Explain X',
        userResponse: 'Wrong explanation',
        correctAnswer: 'Correct explanation',
        isCorrect: false,
        responseTimeMs: 5000,
        misconceptions: [
          {
            misconception_id: 'misc-1',
            detected_at: new Date().toISOString(),
            trigger_response: 'Wrong explanation',
            confidence: 0.85,
          },
        ],
      };

      expect(response.misconceptions).toHaveLength(1);
      expect(response.misconceptions![0].confidence).toBe(0.85);
    });
  });
});

/**
 * Helper to create a test ResponseData with defaults
 */
function createResponse(overrides: Partial<ResponseData> = {}): ResponseData {
  return {
    conceptId: 'concept-1',
    itemType: 'review',
    questionType: 'multiple_choice',
    questionText: 'Test question',
    userResponse: 'A',
    correctAnswer: 'A',
    isCorrect: true,
    responseTimeMs: 2000,
    ...overrides,
  };
}
