/**
 * Rubric Evaluation Service
 *
 * AI-powered service for evaluating synthesis interactions using a 6-dimension rubric.
 * Makes a single AI call for batch evaluation to optimize costs.
 *
 * Dimensions:
 * - accuracy: Are the facts correct?
 * - completeness: Are all key points covered?
 * - depth: Surface vs deep understanding?
 * - reasoning: Can the user explain why?
 * - synthesis: Can the user connect concepts?
 * - transfer: Can the user apply to new situations?
 *
 * @example
 * ```ts
 * import { createRubricEvaluationService } from '@/src/lib/rubric-evaluation-service';
 *
 * const service = createRubricEvaluationService();
 * const result = await service.evaluateBatch({
 *   sourceId: 'source-1',
 *   interactions: [...],
 * });
 * ```
 */

import {
  type AIService,
  createAIService,
  sendStructuredMessage,
} from './ai-service';
import type {
  BatchEvaluationRequest,
  BatchEvaluationResponse,
  BatchInteraction,
  RubricEvaluation,
  DimensionEvaluation,
  RubricDimension,
  RubricScore,
} from '@/src/types/rubric';
import {
  INTERACTION_RUBRIC_DIMENSIONS,
  checkDimensionPassed,
} from '@/src/types/rubric';

// ============================================================================
// Error Codes and Error Class
// ============================================================================

/**
 * Error codes for rubric evaluation operations
 */
export type RubricEvaluationErrorCode =
  | 'AI_ERROR'
  | 'PARSE_ERROR'
  | 'EMPTY_BATCH';

/**
 * Custom error class for rubric evaluation operations
 */
export class RubricEvaluationError extends Error {
  constructor(
    message: string,
    public readonly code: RubricEvaluationErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RubricEvaluationError';

    // Maintain proper stack trace for where error was thrown (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RubricEvaluationError);
    }
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Rubric evaluation service interface
 */
export interface RubricEvaluationService {
  /**
   * Evaluate a batch of interactions using the AI rubric evaluator
   *
   * @param request - Batch evaluation request containing interactions
   * @returns Batch evaluation response with rubric evaluations
   * @throws {RubricEvaluationError} On AI failures or parsing errors
   */
  evaluateBatch(request: BatchEvaluationRequest): Promise<BatchEvaluationResponse>;
}

/**
 * AI response structure for batch evaluation
 */
interface AIEvaluationResponse {
  evaluations: Array<{
    interactionId: string;
    dimensions: Array<{
      dimension: string;
      score: number;
      feedback: string;
    }>;
    overallFeedback: string;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * System prompt for the AI rubric evaluator
 */
const SYSTEM_PROMPT = `You are evaluating student learning responses using a rubric-based assessment system.

For each interaction, evaluate the student's response on the applicable dimensions using scores 0-3:

SCORING GUIDE:
- 0: No evidence of understanding - Response is missing, irrelevant, or shows no comprehension
- 1: Minimal understanding - Shows some recognition but significant errors or gaps
- 2: Adequate/partial understanding - Covers main points with minor errors or omissions
- 3: Full/excellent understanding - Comprehensive, accurate, and demonstrates mastery

DIMENSIONS (evaluate only those specified for each interaction):
- accuracy: Are the facts and information correct? Check for errors and misconceptions.
- completeness: Are all key points covered? Look for missing essential information.
- depth: Does the response show surface vs deep understanding? Look for nuance and detail.
- reasoning: Can the student explain why/how? Look for logical explanations and cause-effect.
- synthesis: Can the student connect concepts? Look for integration of multiple ideas.
- transfer: Can the student apply knowledge to new situations? Look for creative application.

RESPONSE FORMAT:
Return your evaluation as JSON with this structure:
{
  "evaluations": [
    {
      "interactionId": "interaction-id-here",
      "dimensions": [
        { "dimension": "accuracy", "score": 2, "feedback": "Brief specific feedback" },
        { "dimension": "completeness", "score": 3, "feedback": "Brief specific feedback" }
      ],
      "overallFeedback": "1-2 sentence summary of performance and suggestions"
    }
  ]
}

IMPORTANT:
- Only evaluate on the dimensions specified for each interaction
- Provide constructive, encouraging feedback
- Be fair but rigorous in scoring
- Focus feedback on what was done well and specific improvements`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build the user message containing all interactions to evaluate
 */
function buildUserMessage(interactions: BatchInteraction[]): string {
  const interactionDescriptions = interactions.map((interaction, index) => {
    const applicableDimensions = INTERACTION_RUBRIC_DIMENSIONS[interaction.interactionType];

    return `
## Interaction ${index + 1}
- **ID**: ${interaction.interactionId}
- **Concept**: ${interaction.conceptName}
- **Type**: ${interaction.interactionType}
- **Applicable Dimensions**: ${applicableDimensions.join(', ')}
- **Question/Prompt**: ${interaction.prompt}
- **Student's Answer**: ${interaction.userAnswer}
${interaction.expectedAnswer ? `- **Expected Answer Guidance**: ${interaction.expectedAnswer}` : ''}
`;
  }).join('\n---\n');

  return `Please evaluate the following ${interactions.length} student interaction(s):

${interactionDescriptions}

Evaluate each interaction on its applicable dimensions and return your assessment as JSON.`;
}

/**
 * Parse and validate the AI response
 */
function parseAIResponse(
  data: unknown,
  interactions: BatchInteraction[]
): RubricEvaluation[] {
  // Validate the response structure
  if (!data || typeof data !== 'object') {
    throw new RubricEvaluationError(
      'Invalid AI response: expected an object',
      'PARSE_ERROR'
    );
  }

  const response = data as AIEvaluationResponse;

  if (!response.evaluations || !Array.isArray(response.evaluations)) {
    throw new RubricEvaluationError(
      'Invalid AI response: missing evaluations array',
      'PARSE_ERROR'
    );
  }

  // Create a lookup map for interactions by ID
  const interactionMap = new Map<string, BatchInteraction>();
  for (const interaction of interactions) {
    interactionMap.set(interaction.interactionId, interaction);
  }

  // Parse each evaluation
  const evaluations: RubricEvaluation[] = response.evaluations.map((evalData) => {
    const interaction = interactionMap.get(evalData.interactionId);

    if (!interaction) {
      throw new RubricEvaluationError(
        `Unknown interaction ID in AI response: ${evalData.interactionId}`,
        'PARSE_ERROR'
      );
    }

    // Parse dimension evaluations
    const dimensions: DimensionEvaluation[] = evalData.dimensions.map((dimData) => {
      // Validate and clamp score to 0-3 range
      const rawScore = typeof dimData.score === 'number' ? dimData.score : 0;
      const score = Math.max(0, Math.min(3, Math.round(rawScore))) as RubricScore;

      return {
        dimension: dimData.dimension as RubricDimension,
        score,
        feedback: dimData.feedback || '',
      };
    });

    // Calculate passed status: all applicable dimensions must meet their thresholds
    const passed = dimensions.every((dim) =>
      checkDimensionPassed(dim.dimension, dim.score)
    );

    return {
      interactionId: evalData.interactionId,
      conceptId: interaction.conceptId,
      dimensions,
      passed,
      overallFeedback: evalData.overallFeedback || '',
    };
  });

  return evaluations;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a rubric evaluation service instance
 *
 * @param aiService - Optional AI service instance (creates default if not provided)
 * @returns RubricEvaluationService instance
 *
 * @example
 * ```ts
 * // Use default AI service
 * const service = createRubricEvaluationService();
 *
 * // Use custom AI service
 * const customAI = createAIService({ model: 'claude-haiku' });
 * const service = createRubricEvaluationService(customAI);
 *
 * // Evaluate batch
 * const result = await service.evaluateBatch(request);
 * ```
 */
export function createRubricEvaluationService(
  aiService?: AIService
): RubricEvaluationService {
  // Use provided AI service or create default
  let resolvedAIService: AIService | null = aiService ?? null;

  const getAIService = (): AIService => {
    if (!resolvedAIService) {
      resolvedAIService = createAIService();
    }
    return resolvedAIService;
  };

  return {
    async evaluateBatch(
      request: BatchEvaluationRequest
    ): Promise<BatchEvaluationResponse> {
      const { interactions } = request;

      // Validate input
      if (!interactions || interactions.length === 0) {
        throw new RubricEvaluationError(
          'Cannot evaluate empty batch: no interactions provided',
          'EMPTY_BATCH'
        );
      }

      // Build the user message with all interactions
      const userMessage = buildUserMessage(interactions);

      try {
        // Make single AI call for cost efficiency
        const service = getAIService();

        // Check if service has sendStructuredMessage method (for mocking)
        const sendFn = (service as unknown as { sendStructuredMessage?: typeof sendStructuredMessage })
          .sendStructuredMessage;

        const response = sendFn
          ? await sendFn(service, {
              systemPrompt: SYSTEM_PROMPT,
              userMessage,
              options: {
                model: 'claude-sonnet',
                temperature: 0.3, // Lower temperature for more consistent evaluation
              },
            })
          : await sendStructuredMessage<AIEvaluationResponse>(service, {
              systemPrompt: SYSTEM_PROMPT,
              userMessage,
              options: {
                model: 'claude-sonnet',
                temperature: 0.3,
              },
            });

        // Parse the AI response
        const evaluations = parseAIResponse(response.data, interactions);

        // Calculate total tokens
        const totalTokens = response.usage.inputTokens + response.usage.outputTokens;

        return {
          evaluations,
          totalTokens,
        };
      } catch (error) {
        // Re-throw RubricEvaluationError as-is
        if (error instanceof RubricEvaluationError) {
          throw error;
        }

        // Wrap other errors
        throw new RubricEvaluationError(
          `AI evaluation failed: ${(error as Error).message}`,
          'AI_ERROR',
          error as Error
        );
      }
    },
  };
}
