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
 *
 * Research-backed principles (d=1.52-4.19):
 * - First-attempt correct = mastered
 * - Required retry = needs reinforcement (reinforced)
 * - Never correct = needs review
 *
 * @example
 * ```ts
 * import { createMasteryEvaluationService } from '@/src/lib/mastery-evaluation-service';
 *
 * const service = createMasteryEvaluationService();
 * const summary = service.evaluate(completedInteractions);
 * ```
 */

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

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a mastery evaluation service instance
 *
 * @param config - Optional configuration overrides
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
 * ```
 */
export function createMasteryEvaluationService(
  config?: MasteryEvaluationConfig
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
  };
}
