/**
 * Mastery Evaluation Service
 *
 * Scores synthesis phase responses, identifies weak concepts, and returns
 * mastery summary for session complete card.
 *
 * Features:
 * - Score synthesis responses (correct/total/percentage)
 * - Identify weak concepts for spaced repetition
 * - Return mastery summary with XP recommendation
 * - AI-powered rubric-based evaluation with 6 dimensions
 *
 * Research-backed principles (d=1.52-4.19):
 * - First-attempt correct = mastered
 * - Required retry = needs reinforcement (reinforced)
 * - Never correct = needs review
 *
 * Component-based mastery (rubric evaluation):
 * - ALL dimensions must pass for mastery
 * - SOME passing = reinforced
 * - NONE passing = needs_review
 *
 * @example
 * ```ts
 * import { createMasteryEvaluationService } from '@/src/lib/mastery-evaluation-service';
 *
 * const service = createMasteryEvaluationService();
 * const summary = service.evaluate(completedInteractions);
 *
 * // With rubric evaluation
 * const rubricService = createRubricEvaluationService();
 * const serviceWithRubric = createMasteryEvaluationService(undefined, rubricService);
 * const rubricSummary = await serviceWithRubric.evaluateWithRubric(sourceId, interactions);
 * ```
 */

import type { RubricEvaluationService } from './rubric-evaluation-service';
import type {
  RubricEvaluation,
  RubricDimension,
  BatchInteraction,
} from '@/src/types/rubric';
import type { InteractionType } from './synthesis-phase-service';
import { RUBRIC_DIMENSIONS, checkDimensionPassed } from '@/src/types/rubric';

// ============================================================================
// Error Codes and Error Class
// ============================================================================

/**
 * Error codes for mastery evaluation operations
 */
export type MasteryEvaluationErrorCode = 'NO_INTERACTIONS' | 'EVALUATION_FAILED';

/**
 * Custom error class for mastery evaluation operations
 */
export class MasteryEvaluationError extends Error {
  readonly code: MasteryEvaluationErrorCode;

  constructor(message: string, code: MasteryEvaluationErrorCode) {
    super(message);
    this.name = 'MasteryEvaluationError';
    this.code = code;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * A completed interaction from the synthesis phase with user's answer result
 */
export interface CompletedInteraction {
  /** Unique identifier for the interaction */
  id: string;
  /** ID of the concept tested */
  conceptId: string;
  /** Human-readable name of the concept */
  conceptName: string;
  /** Whether the user answered correctly */
  isCorrect: boolean;
  /** Number of attempts (1 = first attempt, 2+ = retried) */
  attemptCount: number;
}

/**
 * Extended CompletedInteraction for rubric-based AI evaluation.
 * Includes the user's actual answer text needed for AI evaluation.
 */
export interface RubricCompletedInteraction extends CompletedInteraction {
  /** The user's answer text (required for AI evaluation) */
  userAnswer: string;
  /** The type of interaction (determines applicable rubric dimensions) */
  interactionType: InteractionType;
  /** The question/prompt shown to the user */
  prompt: string;
  /** Optional hints about the expected answer for AI guidance */
  expectedAnswerHints?: string;
}

/**
 * Mastery status for a concept based on performance
 * - mastered: First-attempt correct
 * - reinforced: Required retry but eventually correct
 * - needs_review: Never answered correctly
 */
export type MasteryStatus = 'mastered' | 'reinforced' | 'needs_review';

/**
 * Mastery evaluation result for a single concept
 */
export interface ConceptMastery {
  /** ID of the concept */
  conceptId: string;
  /** Human-readable name of the concept */
  conceptName: string;
  /** Mastery status based on performance */
  status: MasteryStatus;
  /** Number of attempts made */
  attemptCount: number;
}

/**
 * Dimension summary tracking passed/total for each rubric dimension
 */
export type DimensionSummary = Record<RubricDimension, { passed: number; total: number }>;

/**
 * Extended ConceptMastery for rubric-based evaluation.
 * Includes detailed rubric evaluations and dimension summaries.
 */
export interface RubricConceptMastery extends ConceptMastery {
  /** All rubric evaluations for this concept */
  rubricEvaluations: RubricEvaluation[];
  /** Summary of passed/total for each dimension */
  dimensionSummary: DimensionSummary;
}

/**
 * Summary of mastery evaluation for a synthesis phase session
 */
export interface MasterySummary {
  /** Number of correct answers */
  correctCount: number;
  /** Total number of interactions */
  totalCount: number;
  /** Score as percentage (0-100) */
  scorePercentage: number;
  /** Concepts that were mastered (first-attempt correct) */
  conceptsMastered: ConceptMastery[];
  /** Concepts needing review (reinforced or needs_review) */
  conceptsNeedingReview: ConceptMastery[];
  /** XP recommendation based on performance (50-150 by default) */
  xpRecommendation: number;
}

/**
 * Extended MasterySummary for rubric-based evaluation.
 * Includes all rubric evaluations and detailed concept masteries.
 */
export interface RubricMasterySummary extends MasterySummary {
  /** All rubric concept masteries with dimension details */
  conceptMasteries: RubricConceptMastery[];
  /** All rubric evaluations from the batch */
  rubricEvaluations: RubricEvaluation[];
}

/**
 * Configuration for the mastery evaluation service
 */
export interface MasteryEvaluationConfig {
  /** Minimum XP awarded (default: 50) */
  minXP?: number;
  /** Maximum XP awarded (default: 150) */
  maxXP?: number;
}

/**
 * Mastery evaluation service interface
 */
export interface MasteryEvaluationService {
  /**
   * Evaluate completed interactions and return mastery summary
   *
   * @param interactions - Array of completed synthesis interactions
   * @returns Mastery summary with scores and concept classifications
   * @throws MasteryEvaluationError if interactions array is empty
   */
  evaluate(interactions: CompletedInteraction[]): MasterySummary;

  /**
   * Evaluate completed interactions using AI-powered rubric evaluation.
   * Uses the 6-dimension rubric system for component-based mastery assessment.
   *
   * @param sourceId - ID of the source being evaluated
   * @param interactions - Array of rubric-enabled interactions with user answers
   * @returns Rubric mastery summary with dimension details
   * @throws MasteryEvaluationError if interactions array is empty or rubric service not configured
   */
  evaluateWithRubric(
    sourceId: string,
    interactions: RubricCompletedInteraction[]
  ): Promise<RubricMasterySummary>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<MasteryEvaluationConfig> = {
  minXP: 50,
  maxXP: 150,
};

/**
 * Priority order for mastery statuses (higher = worse)
 * Used to determine the worst status when a concept has multiple interactions
 */
const STATUS_PRIORITY: Record<MasteryStatus, number> = {
  mastered: 0,
  reinforced: 1,
  needs_review: 2,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the mastery status for a single interaction
 */
function getInteractionStatus(interaction: CompletedInteraction): MasteryStatus {
  if (!interaction.isCorrect) {
    return 'needs_review';
  }

  if (interaction.attemptCount === 1) {
    return 'mastered';
  }

  return 'reinforced';
}

/**
 * Consolidate multiple interactions for the same concept
 * Takes the worst status and highest attempt count
 */
function consolidateConcepts(
  interactions: CompletedInteraction[]
): Map<string, ConceptMastery> {
  const conceptMap = new Map<string, ConceptMastery>();

  for (const interaction of interactions) {
    const status = getInteractionStatus(interaction);
    const existing = conceptMap.get(interaction.conceptId);

    if (!existing) {
      // First interaction for this concept
      conceptMap.set(interaction.conceptId, {
        conceptId: interaction.conceptId,
        conceptName: interaction.conceptName,
        status,
        attemptCount: interaction.attemptCount,
      });
    } else {
      // Compare and take worst status
      const existingPriority = STATUS_PRIORITY[existing.status];
      const newPriority = STATUS_PRIORITY[status];

      if (newPriority > existingPriority) {
        existing.status = status;
      }

      // Take highest attempt count
      if (interaction.attemptCount > existing.attemptCount) {
        existing.attemptCount = interaction.attemptCount;
      }
    }
  }

  return conceptMap;
}

/**
 * Calculate XP using linear interpolation
 */
function calculateXP(
  scorePercentage: number,
  minXP: number,
  maxXP: number
): number {
  const xpRange = maxXP - minXP;
  const xp = minXP + (xpRange * scorePercentage) / 100;
  return Math.round(xp);
}

/**
 * Create an empty dimension summary with all dimensions initialized to zero
 */
function createEmptyDimensionSummary(): DimensionSummary {
  const summary: Partial<DimensionSummary> = {};
  for (const dimension of RUBRIC_DIMENSIONS) {
    summary[dimension] = { passed: 0, total: 0 };
  }
  return summary as DimensionSummary;
}

/**
 * Build BatchInteraction array from RubricCompletedInteraction array
 */
function buildBatchInteractions(
  interactions: RubricCompletedInteraction[]
): BatchInteraction[] {
  return interactions.map((interaction) => ({
    interactionId: interaction.id,
    conceptId: interaction.conceptId,
    conceptName: interaction.conceptName,
    interactionType: interaction.interactionType,
    prompt: interaction.prompt,
    userAnswer: interaction.userAnswer,
    expectedAnswer: interaction.expectedAnswerHints,
  }));
}

/**
 * Determine mastery status based on rubric evaluation results.
 * Component-based: ALL must pass for mastery.
 */
function getRubricMasteryStatus(evaluations: RubricEvaluation[]): MasteryStatus {
  if (evaluations.length === 0) {
    return 'needs_review';
  }

  const passedCount = evaluations.filter((e) => e.passed).length;

  if (passedCount === evaluations.length) {
    return 'mastered';
  }

  if (passedCount > 0) {
    return 'reinforced';
  }

  return 'needs_review';
}

/**
 * Calculate dimension summary from rubric evaluations
 */
function calculateDimensionSummary(evaluations: RubricEvaluation[]): DimensionSummary {
  const summary = createEmptyDimensionSummary();

  for (const evaluation of evaluations) {
    for (const dimEval of evaluation.dimensions) {
      const dim = dimEval.dimension;
      summary[dim].total += 1;
      if (checkDimensionPassed(dim, dimEval.score)) {
        summary[dim].passed += 1;
      }
    }
  }

  return summary;
}

/**
 * Consolidate rubric evaluations by concept into RubricConceptMastery objects
 */
function consolidateRubricConcepts(
  interactions: RubricCompletedInteraction[],
  evaluations: RubricEvaluation[]
): Map<string, RubricConceptMastery> {
  const conceptMap = new Map<string, RubricConceptMastery>();

  // Create a lookup map for evaluations by interaction ID
  const evalMap = new Map<string, RubricEvaluation>();
  for (const evaluation of evaluations) {
    evalMap.set(evaluation.interactionId, evaluation);
  }

  // Group evaluations by concept
  const conceptEvaluations = new Map<string, RubricEvaluation[]>();
  const conceptInfo = new Map<string, { name: string; attemptCount: number }>();

  for (const interaction of interactions) {
    const evaluation = evalMap.get(interaction.id);
    if (!evaluation) continue;

    // Get or create concept evaluations array
    if (!conceptEvaluations.has(interaction.conceptId)) {
      conceptEvaluations.set(interaction.conceptId, []);
      conceptInfo.set(interaction.conceptId, {
        name: interaction.conceptName,
        attemptCount: interaction.attemptCount,
      });
    }

    conceptEvaluations.get(interaction.conceptId)!.push(evaluation);

    // Track max attempt count
    const info = conceptInfo.get(interaction.conceptId)!;
    if (interaction.attemptCount > info.attemptCount) {
      info.attemptCount = interaction.attemptCount;
    }
  }

  // Build RubricConceptMastery for each concept
  for (const [conceptId, evals] of conceptEvaluations) {
    const info = conceptInfo.get(conceptId)!;
    const status = getRubricMasteryStatus(evals);
    const dimensionSummary = calculateDimensionSummary(evals);

    conceptMap.set(conceptId, {
      conceptId,
      conceptName: info.name,
      status,
      attemptCount: info.attemptCount,
      rubricEvaluations: evals,
      dimensionSummary,
    });
  }

  return conceptMap;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a mastery evaluation service instance
 *
 * @param config - Optional configuration overrides
 * @param rubricService - Optional rubric evaluation service for AI-powered evaluation
 * @returns MasteryEvaluationService instance
 *
 * @example
 * ```ts
 * const service = createMasteryEvaluationService();
 * const summary = service.evaluate(interactions);
 *
 * // With custom XP range
 * const customService = createMasteryEvaluationService({
 *   minXP: 25,
 *   maxXP: 200,
 * });
 *
 * // With rubric evaluation
 * const rubricEvalService = createRubricEvaluationService();
 * const serviceWithRubric = createMasteryEvaluationService(undefined, rubricEvalService);
 * const rubricSummary = await serviceWithRubric.evaluateWithRubric(sourceId, interactions);
 * ```
 */
export function createMasteryEvaluationService(
  config?: MasteryEvaluationConfig,
  rubricService?: RubricEvaluationService
): MasteryEvaluationService {
  // Merge config with defaults
  const mergedConfig: Required<MasteryEvaluationConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    evaluate(interactions: CompletedInteraction[]): MasterySummary {
      // Validate inputs
      if (interactions.length === 0) {
        throw new MasteryEvaluationError(
          'No interactions to evaluate',
          'NO_INTERACTIONS'
        );
      }

      // Calculate basic scores
      const correctCount = interactions.filter((i) => i.isCorrect).length;
      const totalCount = interactions.length;
      const scorePercentage = Math.round((correctCount / totalCount) * 100);

      // Consolidate concepts (handle multiple interactions for same concept)
      const conceptMap = consolidateConcepts(interactions);

      // Separate mastered from needing review
      const conceptsMastered: ConceptMastery[] = [];
      const conceptsNeedingReview: ConceptMastery[] = [];

      for (const concept of conceptMap.values()) {
        if (concept.status === 'mastered') {
          conceptsMastered.push(concept);
        } else {
          conceptsNeedingReview.push(concept);
        }
      }

      // Calculate XP recommendation
      const xpRecommendation = calculateXP(
        scorePercentage,
        mergedConfig.minXP,
        mergedConfig.maxXP
      );

      return {
        correctCount,
        totalCount,
        scorePercentage,
        conceptsMastered,
        conceptsNeedingReview,
        xpRecommendation,
      };
    },

    async evaluateWithRubric(
      sourceId: string,
      interactions: RubricCompletedInteraction[]
    ): Promise<RubricMasterySummary> {
      // Validate rubric service is available
      if (!rubricService) {
        throw new MasteryEvaluationError(
          'Rubric evaluation service not configured',
          'EVALUATION_FAILED'
        );
      }

      // Validate inputs
      if (interactions.length === 0) {
        throw new MasteryEvaluationError(
          'No interactions to evaluate',
          'NO_INTERACTIONS'
        );
      }

      // Build batch request for rubric evaluation
      const batchInteractions = buildBatchInteractions(interactions);

      // Call AI rubric evaluation service
      const { evaluations } = await rubricService.evaluateBatch({
        sourceId,
        interactions: batchInteractions,
      });

      // Calculate basic scores based on passed evaluations
      const correctCount = evaluations.filter((e) => e.passed).length;
      const totalCount = evaluations.length;
      const scorePercentage = Math.round((correctCount / totalCount) * 100);

      // Consolidate concepts with rubric data
      const conceptMap = consolidateRubricConcepts(interactions, evaluations);

      // Separate mastered from needing review
      const conceptsMastered: RubricConceptMastery[] = [];
      const conceptsNeedingReview: RubricConceptMastery[] = [];
      const conceptMasteries: RubricConceptMastery[] = [];

      for (const concept of conceptMap.values()) {
        conceptMasteries.push(concept);
        if (concept.status === 'mastered') {
          conceptsMastered.push(concept);
        } else {
          conceptsNeedingReview.push(concept);
        }
      }

      // Calculate XP recommendation
      const xpRecommendation = calculateXP(
        scorePercentage,
        mergedConfig.minXP,
        mergedConfig.maxXP
      );

      return {
        correctCount,
        totalCount,
        scorePercentage,
        conceptsMastered,
        conceptsNeedingReview,
        xpRecommendation,
        conceptMasteries,
        rubricEvaluations: evaluations,
      };
    },
  };
}
