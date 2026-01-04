/**
 * Rubric Evaluation Service Tests
 *
 * Tests for the AI-powered rubric evaluation service that evaluates
 * synthesis interactions using a 6-dimension rubric system.
 */

import type { AIService } from '../ai-service';
import type {
  BatchEvaluationRequest,
  BatchEvaluationResponse,
  BatchInteraction,
  RubricEvaluation,
  DimensionEvaluation,
  RubricDimension,
} from '@/src/types/rubric';
import {
  INTERACTION_RUBRIC_DIMENSIONS,
  RUBRIC_PASS_THRESHOLDS,
  checkDimensionPassed,
} from '@/src/types/rubric';
import {
  createRubricEvaluationService,
  RubricEvaluationError,
  type RubricEvaluationService,
} from '../rubric-evaluation-service';

// ============================================================================
// Mock AI Service
// ============================================================================

/**
 * Create a mock AI service that returns a predefined response
 */
function createMockAIService(
  mockResponse?: {
    evaluations: Array<{
      interactionId: string;
      dimensions: Array<{ dimension: string; score: number; feedback: string }>;
      overallFeedback: string;
    }>;
  },
  shouldThrow?: Error
): AIService {
  return {
    client: {} as AIService['client'],
    config: {} as AIService['config'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendStructuredMessage: jest.fn().mockImplementation(async () => {
      if (shouldThrow) {
        throw shouldThrow;
      }
      return {
        content: JSON.stringify(mockResponse),
        model: 'claude-sonnet-4-5-20250929',
        usage: { inputTokens: 100, outputTokens: 200 },
        stopReason: 'end_turn',
        data: mockResponse,
      };
    }),
  } as unknown as AIService;
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock batch interaction
 */
function createMockInteraction(
  overrides: Partial<BatchInteraction> = {}
): BatchInteraction {
  return {
    interactionId: `interaction-${Math.random().toString(36).substring(7)}`,
    conceptId: 'concept-1',
    conceptName: 'Test Concept',
    interactionType: 'free_recall',
    prompt: 'Explain the concept',
    userAnswer: 'This is my answer about the concept.',
    expectedAnswer: 'Expected answer',
    ...overrides,
  };
}

/**
 * Create a mock batch evaluation request
 */
function createMockRequest(
  interactions: BatchInteraction[] = [createMockInteraction()]
): BatchEvaluationRequest {
  return {
    sourceId: 'source-1',
    interactions,
  };
}

/**
 * Create a mock AI evaluation response for a single interaction
 */
function createMockEvaluationResponse(
  interactionId: string,
  dimensions: RubricDimension[],
  scores: Record<RubricDimension, number> = {} as Record<RubricDimension, number>
): {
  interactionId: string;
  dimensions: Array<{ dimension: string; score: number; feedback: string }>;
  overallFeedback: string;
} {
  return {
    interactionId,
    dimensions: dimensions.map((dim) => ({
      dimension: dim,
      score: scores[dim] ?? 2, // Default to passing score
      feedback: `Feedback for ${dim}`,
    })),
    overallFeedback: 'Overall feedback for the interaction',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('rubric-evaluation-service', () => {
  describe('createRubricEvaluationService', () => {
    it('creates a service instance with evaluateBatch method', () => {
      const service = createRubricEvaluationService();
      expect(service).toBeDefined();
      expect(typeof service.evaluateBatch).toBe('function');
    });

    it('accepts optional AI service', () => {
      const mockAIService = createMockAIService({ evaluations: [] });
      const service = createRubricEvaluationService(mockAIService);
      expect(service).toBeDefined();
    });
  });

  describe('evaluateBatch', () => {
    it('returns BatchEvaluationResponse with evaluations array', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      expect(result).toBeDefined();
      expect(result.evaluations).toBeDefined();
      expect(Array.isArray(result.evaluations)).toBe(true);
      expect(result.evaluations.length).toBe(1);
    });

    it('returns totalTokens in the response', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      expect(typeof result.totalTokens).toBe('number');
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('makes a single AI call for multiple interactions', async () => {
      const interactions = [
        createMockInteraction({ interactionId: 'int-1' }),
        createMockInteraction({ interactionId: 'int-2' }),
        createMockInteraction({ interactionId: 'int-3' }),
      ];
      const request = createMockRequest(interactions);

      const mockResponse = {
        evaluations: interactions.map((i) =>
          createMockEvaluationResponse(
            i.interactionId,
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          )
        ),
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      // Verify only one AI call was made
      expect(
        (mockAIService as unknown as { sendStructuredMessage: jest.Mock }).sendStructuredMessage
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('evaluation structure', () => {
    it('returns evaluations with correct RubricEvaluation structure', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        conceptId: 'concept-123',
      });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);
      const evaluation = result.evaluations[0];

      // Check RubricEvaluation structure
      expect(evaluation.interactionId).toBe('int-1');
      expect(evaluation.conceptId).toBe('concept-123');
      expect(Array.isArray(evaluation.dimensions)).toBe(true);
      expect(typeof evaluation.passed).toBe('boolean');
      expect(typeof evaluation.overallFeedback).toBe('string');
    });

    it('returns evaluations with correct DimensionEvaluation structure', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        interactionType: 'mcq', // Only accuracy dimension
      });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse('int-1', ['accuracy'] as RubricDimension[]),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);
      const dimension = result.evaluations[0].dimensions[0];

      // Check DimensionEvaluation structure
      expect(dimension.dimension).toBe('accuracy');
      expect(typeof dimension.score).toBe('number');
      expect([0, 1, 2, 3]).toContain(dimension.score);
      expect(typeof dimension.feedback).toBe('string');
    });

    it('evaluates on applicable dimensions based on interaction type', async () => {
      // Test free_recall (all 6 dimensions)
      const freeRecallInteraction = createMockInteraction({
        interactionId: 'free-recall-1',
        interactionType: 'free_recall',
      });

      // Test mcq (only accuracy)
      const mcqInteraction = createMockInteraction({
        interactionId: 'mcq-1',
        interactionType: 'mcq',
      });

      const request = createMockRequest([freeRecallInteraction, mcqInteraction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'free-recall-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
          createMockEvaluationResponse(
            'mcq-1',
            INTERACTION_RUBRIC_DIMENSIONS.mcq as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      // free_recall should have 6 dimensions
      const freeRecallEval = result.evaluations.find(
        (e) => e.interactionId === 'free-recall-1'
      );
      expect(freeRecallEval?.dimensions.length).toBe(6);

      // mcq should have 1 dimension
      const mcqEval = result.evaluations.find((e) => e.interactionId === 'mcq-1');
      expect(mcqEval?.dimensions.length).toBe(1);
      expect(mcqEval?.dimensions[0].dimension).toBe('accuracy');
    });
  });

  describe('pass/fail calculation', () => {
    it('calculates passed as true when all dimensions meet thresholds', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        interactionType: 'fill_in_blank', // accuracy (threshold 2), completeness (threshold 2)
      });
      const request = createMockRequest([interaction]);

      // All scores at or above thresholds
      const mockResponse = {
        evaluations: [
          {
            interactionId: 'int-1',
            dimensions: [
              { dimension: 'accuracy', score: 2, feedback: 'Accurate' },
              { dimension: 'completeness', score: 3, feedback: 'Complete' },
            ],
            overallFeedback: 'Good job',
          },
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      expect(result.evaluations[0].passed).toBe(true);
    });

    it('calculates passed as false when any dimension fails threshold', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        interactionType: 'fill_in_blank', // accuracy (threshold 2), completeness (threshold 2)
      });
      const request = createMockRequest([interaction]);

      // accuracy below threshold
      const mockResponse = {
        evaluations: [
          {
            interactionId: 'int-1',
            dimensions: [
              { dimension: 'accuracy', score: 1, feedback: 'Inaccurate' }, // Below threshold of 2
              { dimension: 'completeness', score: 3, feedback: 'Complete' },
            ],
            overallFeedback: 'Needs improvement',
          },
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      expect(result.evaluations[0].passed).toBe(false);
    });

    it('uses RUBRIC_PASS_THRESHOLDS for each dimension', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        interactionType: 'free_recall', // All 6 dimensions
      });
      const request = createMockRequest([interaction]);

      // Set scores at exactly the thresholds
      const mockResponse = {
        evaluations: [
          {
            interactionId: 'int-1',
            dimensions: [
              { dimension: 'accuracy', score: RUBRIC_PASS_THRESHOLDS.accuracy, feedback: '' },
              {
                dimension: 'completeness',
                score: RUBRIC_PASS_THRESHOLDS.completeness,
                feedback: '',
              },
              { dimension: 'depth', score: RUBRIC_PASS_THRESHOLDS.depth, feedback: '' },
              { dimension: 'reasoning', score: RUBRIC_PASS_THRESHOLDS.reasoning, feedback: '' },
              { dimension: 'synthesis', score: RUBRIC_PASS_THRESHOLDS.synthesis, feedback: '' },
              { dimension: 'transfer', score: RUBRIC_PASS_THRESHOLDS.transfer, feedback: '' },
            ],
            overallFeedback: 'Pass at threshold',
          },
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      const result = await service.evaluateBatch(request);

      // Should pass when all dimensions are at exactly their thresholds
      expect(result.evaluations[0].passed).toBe(true);
    });

    it('checkDimensionPassed helper works correctly', () => {
      // accuracy threshold is 2
      expect(checkDimensionPassed('accuracy', 0)).toBe(false);
      expect(checkDimensionPassed('accuracy', 1)).toBe(false);
      expect(checkDimensionPassed('accuracy', 2)).toBe(true);
      expect(checkDimensionPassed('accuracy', 3)).toBe(true);

      // depth threshold is 1
      expect(checkDimensionPassed('depth', 0)).toBe(false);
      expect(checkDimensionPassed('depth', 1)).toBe(true);
      expect(checkDimensionPassed('depth', 2)).toBe(true);
      expect(checkDimensionPassed('depth', 3)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws RubricEvaluationError when AI service fails', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const aiError = new Error('AI service unavailable');
      const mockAIService = createMockAIService(undefined, aiError);
      const service = createRubricEvaluationService(mockAIService);

      await expect(service.evaluateBatch(request)).rejects.toThrow(
        RubricEvaluationError
      );
    });

    it('throws RubricEvaluationError with AI_ERROR code for AI failures', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const aiError = new Error('Rate limited');
      const mockAIService = createMockAIService(undefined, aiError);
      const service = createRubricEvaluationService(mockAIService);

      try {
        await service.evaluateBatch(request);
        fail('Expected RubricEvaluationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RubricEvaluationError);
        expect((error as RubricEvaluationError).code).toBe('AI_ERROR');
      }
    });

    it('throws RubricEvaluationError with EMPTY_BATCH code for empty interactions', async () => {
      const request = createMockRequest([]);
      const service = createRubricEvaluationService();

      try {
        await service.evaluateBatch(request);
        fail('Expected RubricEvaluationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RubricEvaluationError);
        expect((error as RubricEvaluationError).code).toBe('EMPTY_BATCH');
      }
    });

    it('throws RubricEvaluationError with PARSE_ERROR code for invalid JSON response', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      // Create a mock that returns invalid structure
      const mockAIService = {
        client: {},
        config: {},
        sendStructuredMessage: jest.fn().mockResolvedValue({
          content: 'invalid json',
          model: 'test',
          usage: { inputTokens: 100, outputTokens: 200 },
          stopReason: 'end_turn',
          data: { invalid: 'structure' }, // Missing evaluations array
        }),
      } as unknown as AIService;

      const service = createRubricEvaluationService(mockAIService);

      try {
        await service.evaluateBatch(request);
        fail('Expected RubricEvaluationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RubricEvaluationError);
        expect((error as RubricEvaluationError).code).toBe('PARSE_ERROR');
      }
    });

    it('includes original error as cause', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const originalError = new Error('Original error message');
      const mockAIService = createMockAIService(undefined, originalError);
      const service = createRubricEvaluationService(mockAIService);

      try {
        await service.evaluateBatch(request);
        fail('Expected RubricEvaluationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RubricEvaluationError);
        expect((error as RubricEvaluationError).cause).toBe(originalError);
      }
    });
  });

  describe('RubricEvaluationError', () => {
    it('has correct name and properties', () => {
      const error = new RubricEvaluationError('Test error', 'AI_ERROR');

      expect(error.name).toBe('RubricEvaluationError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('AI_ERROR');
    });

    it('is an instance of Error', () => {
      const error = new RubricEvaluationError('Test error', 'PARSE_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RubricEvaluationError);
    });

    it('supports cause property', () => {
      const originalError = new Error('Original');
      const error = new RubricEvaluationError('Wrapped', 'AI_ERROR', originalError);

      expect(error.cause).toBe(originalError);
    });
  });

  describe('system prompt', () => {
    it('includes 6-dimension rubric description in prompt', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      // Check that sendStructuredMessage was called with a system prompt
      const sendStructuredMessage = (
        mockAIService as unknown as { sendStructuredMessage: jest.Mock }
      ).sendStructuredMessage;

      expect(sendStructuredMessage).toHaveBeenCalled();
      // The mock is called with (service, message), so message is the second argument
      const callArgs = sendStructuredMessage.mock.calls[0][1];

      // Verify system prompt includes rubric dimensions
      expect(callArgs.systemPrompt).toContain('accuracy');
      expect(callArgs.systemPrompt).toContain('completeness');
      expect(callArgs.systemPrompt).toContain('depth');
      expect(callArgs.systemPrompt).toContain('reasoning');
      expect(callArgs.systemPrompt).toContain('synthesis');
      expect(callArgs.systemPrompt).toContain('transfer');
    });

    it('includes scoring guidance (0-3) in prompt', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      const sendStructuredMessage = (
        mockAIService as unknown as { sendStructuredMessage: jest.Mock }
      ).sendStructuredMessage;

      // The mock is called with (service, message), so message is the second argument
      const callArgs = sendStructuredMessage.mock.calls[0][1];

      // Verify system prompt includes scoring guidance
      expect(callArgs.systemPrompt).toMatch(/0.*no.*evidence/i);
      expect(callArgs.systemPrompt).toMatch(/1.*minimal/i);
      expect(callArgs.systemPrompt).toMatch(/2.*adequate|partial/i);
      expect(callArgs.systemPrompt).toMatch(/3.*full|excellent/i);
    });

    it('includes JSON output format specification in prompt', async () => {
      const interaction = createMockInteraction({ interactionId: 'int-1' });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      const sendStructuredMessage = (
        mockAIService as unknown as { sendStructuredMessage: jest.Mock }
      ).sendStructuredMessage;

      // The mock is called with (service, message), so message is the second argument
      const callArgs = sendStructuredMessage.mock.calls[0][1];

      // Verify system prompt includes JSON format specification
      expect(callArgs.systemPrompt).toContain('JSON');
      expect(callArgs.systemPrompt).toContain('evaluations');
    });
  });

  describe('interaction data in user message', () => {
    it('includes interaction details in user message', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        conceptName: 'Machine Learning',
        prompt: 'Explain ML',
        userAnswer: 'ML is AI that learns',
        interactionType: 'free_recall',
      });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.free_recall as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      const sendStructuredMessage = (
        mockAIService as unknown as { sendStructuredMessage: jest.Mock }
      ).sendStructuredMessage;

      // The mock is called with (service, message), so message is the second argument
      const callArgs = sendStructuredMessage.mock.calls[0][1];

      // Verify user message includes interaction details
      expect(callArgs.userMessage).toContain('Machine Learning');
      expect(callArgs.userMessage).toContain('Explain ML');
      expect(callArgs.userMessage).toContain('ML is AI that learns');
      expect(callArgs.userMessage).toContain('int-1');
    });

    it('includes applicable dimensions for each interaction type', async () => {
      const interaction = createMockInteraction({
        interactionId: 'int-1',
        interactionType: 'connect_dots', // synthesis, transfer
      });
      const request = createMockRequest([interaction]);

      const mockResponse = {
        evaluations: [
          createMockEvaluationResponse(
            'int-1',
            INTERACTION_RUBRIC_DIMENSIONS.connect_dots as unknown as RubricDimension[]
          ),
        ],
      };

      const mockAIService = createMockAIService(mockResponse);
      const service = createRubricEvaluationService(mockAIService);

      await service.evaluateBatch(request);

      const sendStructuredMessage = (
        mockAIService as unknown as { sendStructuredMessage: jest.Mock }
      ).sendStructuredMessage;

      // The mock is called with (service, message), so message is the second argument
      const callArgs = sendStructuredMessage.mock.calls[0][1];

      // Verify user message includes applicable dimensions
      expect(callArgs.userMessage).toContain('synthesis');
      expect(callArgs.userMessage).toContain('transfer');
    });
  });
});
