/**
 * Rubric Types for AI Mastery Evaluation
 *
 * Defines types for 6-dimension rubric-based evaluation of synthesis interactions.
 * Each interaction is evaluated on applicable dimensions with scores 0-3.
 *
 * Dimensions:
 * - accuracy: Are the facts correct?
 * - completeness: Are all key points covered?
 * - depth: Surface vs deep understanding?
 * - reasoning: Can the user explain why?
 * - synthesis: Can the user connect concepts?
 * - transfer: Can the user apply to new situations?
 */

import type { InteractionType } from '../lib/synthesis-phase-service';

// Re-export InteractionType for convenience
export type { InteractionType };

// ============================================================================
// Core Rubric Types
// ============================================================================

/**
 * The 6 dimensions used to evaluate synthesis interactions.
 * Each dimension assesses a different aspect of understanding.
 */
export type RubricDimension =
  | 'accuracy'
  | 'completeness'
  | 'depth'
  | 'reasoning'
  | 'synthesis'
  | 'transfer';

/**
 * Array of all rubric dimensions for iteration.
 */
export const RUBRIC_DIMENSIONS: readonly RubricDimension[] = [
  'accuracy',
  'completeness',
  'depth',
  'reasoning',
  'synthesis',
  'transfer',
] as const;

/**
 * Score for a single rubric dimension (0-3).
 * 0 = No evidence
 * 1 = Minimal evidence
 * 2 = Adequate evidence
 * 3 = Strong evidence
 */
export type RubricScore = 0 | 1 | 2 | 3;

/**
 * Evaluation result for a single dimension.
 */
export interface DimensionEvaluation {
  /** The dimension being evaluated */
  dimension: RubricDimension;
  /** Score for this dimension (0-3) */
  score: RubricScore;
  /** Specific feedback for this dimension */
  feedback: string;
}

/**
 * Complete rubric evaluation for a single interaction.
 */
export interface RubricEvaluation {
  /** ID of the interaction being evaluated */
  interactionId: string;
  /** ID of the concept being tested */
  conceptId: string;
  /** Individual dimension evaluations */
  dimensions: DimensionEvaluation[];
  /** Whether the interaction passed overall */
  passed: boolean;
  /** Summary feedback for the entire interaction */
  overallFeedback: string;
}

// ============================================================================
// Interaction Type to Dimension Mappings
// ============================================================================

/**
 * Maps each interaction type to its applicable rubric dimensions.
 *
 * | Interaction Type | Applicable Dimensions |
 * |------------------|----------------------|
 * | free_recall      | ALL 6 dimensions     |
 * | fill_in_blank    | accuracy, completeness |
 * | sequence         | accuracy, reasoning  |
 * | connect_dots     | synthesis, transfer  |
 * | mcq              | accuracy only        |
 */
export const INTERACTION_RUBRIC_DIMENSIONS: Record<InteractionType, readonly RubricDimension[]> = {
  free_recall: ['accuracy', 'completeness', 'depth', 'reasoning', 'synthesis', 'transfer'],
  fill_in_blank: ['accuracy', 'completeness'],
  sequence: ['accuracy', 'reasoning'],
  connect_dots: ['synthesis', 'transfer'],
  mcq: ['accuracy'],
} as const;

// ============================================================================
// Pass Thresholds
// ============================================================================

/**
 * Minimum score required to pass each dimension.
 * Higher thresholds for foundational dimensions (accuracy, completeness).
 * Lower thresholds for advanced dimensions (depth, reasoning, synthesis, transfer).
 */
export const RUBRIC_PASS_THRESHOLDS: Record<RubricDimension, RubricScore> = {
  accuracy: 2, // Requires adequate evidence
  completeness: 2, // Requires adequate evidence
  depth: 1, // Requires minimal evidence
  reasoning: 1, // Requires minimal evidence
  synthesis: 1, // Requires minimal evidence
  transfer: 1, // Requires minimal evidence
} as const;

/**
 * Checks if a score meets the pass threshold for a given dimension.
 *
 * @param dimension - The rubric dimension to check
 * @param score - The score achieved (0-3)
 * @returns true if the score meets or exceeds the threshold
 */
export function checkDimensionPassed(dimension: RubricDimension, score: RubricScore): boolean {
  return score >= RUBRIC_PASS_THRESHOLDS[dimension];
}

// ============================================================================
// Batch Evaluation Types
// ============================================================================

/**
 * Single interaction to be evaluated in a batch request.
 */
export interface BatchInteraction {
  /** Unique ID for this interaction */
  interactionId: string;
  /** ID of the concept being tested */
  conceptId: string;
  /** Human-readable name of the concept */
  conceptName: string;
  /** Type of interaction (determines applicable dimensions) */
  interactionType: InteractionType;
  /** The question/prompt shown to the user */
  prompt: string;
  /** The user's response */
  userAnswer: string;
  /** Expected answer for validation (optional for open-ended) */
  expectedAnswer?: string;
}

/**
 * Request for batch evaluation of multiple interactions.
 * Batching reduces API calls for cost efficiency.
 */
export interface BatchEvaluationRequest {
  /** ID of the source being evaluated */
  sourceId: string;
  /** Array of interactions to evaluate */
  interactions: BatchInteraction[];
}

/**
 * Response from batch evaluation.
 */
export interface BatchEvaluationResponse {
  /** Evaluation results for each interaction */
  evaluations: RubricEvaluation[];
  /** Total tokens used for the batch evaluation */
  totalTokens: number;
}
