/**
 * Question Weighting Service
 *
 * Pure algorithmic service for determining which question type to show based on
 * learning phase and adaptive context. Uses weighted random selection to vary
 * question types while respecting phase-appropriate defaults.
 *
 * Phase-Based Defaults:
 * - pretest: 100% MC (quick assessment)
 * - learning: 30% MC, 10% T/F, 40% free-text, 20% interactive
 * - review: 40% MC, 10% T/F, 40% free-text, 10% interactive
 *
 * Adaptive Adjustments:
 * - Low accuracy (<50%): +20% MC (easier questions)
 * - High mastery (SOLID+): +20% application weight (harder questions)
 * - Low cognitive capacity (<50%): +20% simple types
 * - High Bloom level (analyze+): +20% free-text weight
 */

import type {
  QuestionPhase,
  QuestionWeights,
  WeightingContext,
  CognitiveCapacity,
} from '@/types/session';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base weights for each phase (sum to 1.0)
 */
const PHASE_WEIGHTS: Record<QuestionPhase, QuestionWeights> = {
  pretest: {
    multiple_choice: 1.0,
    true_false: 0,
    free_text: 0,
    interactive: 0,
  },
  learning: {
    multiple_choice: 0.3,
    true_false: 0.1,
    free_text: 0.4,
    interactive: 0.2,
  },
  review: {
    multiple_choice: 0.4,
    true_false: 0.1,
    free_text: 0.4,
    interactive: 0.1,
  },
};

/**
 * Accuracy threshold for applying easier question adjustments
 */
const LOW_ACCURACY_THRESHOLD = 0.5;

/**
 * Weight adjustment amount (20%)
 */
const ADJUSTMENT_AMOUNT = 0.2;

/**
 * Cognitive capacity threshold for applying simple question adjustments
 */
const LOW_CAPACITY_THRESHOLD = 50;

/**
 * Mastery states that qualify as "solid" (higher mastery)
 */
const SOLID_MASTERY_STATES = ['reviewing', 'mastered'];

/**
 * Bloom levels that qualify as higher-order thinking
 */
const HIGHER_ORDER_BLOOM_LEVELS = ['analyze', 'evaluate', 'create'];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get base weights for a question phase.
 *
 * Each phase has different weight distributions optimized for its purpose:
 * - pretest: Quick assessment using only multiple choice
 * - learning: Balanced with emphasis on free-text for deeper engagement
 * - review: Slightly more MC for efficient review with free-text for retention
 *
 * @param phase - The question phase
 * @returns Base question weights for the phase
 */
export function getPhaseWeights(phase: QuestionPhase): QuestionWeights {
  return { ...PHASE_WEIGHTS[phase] };
}

/**
 * Normalize weights to sum to 1.0.
 *
 * Ensures all weights are proportionally scaled so they can be used
 * for weighted random selection.
 *
 * @param weights - Raw weights that may not sum to 1
 * @returns Normalized weights summing to 1.0
 */
export function normalizeWeights(weights: QuestionWeights): QuestionWeights {
  const total =
    weights.multiple_choice +
    weights.true_false +
    weights.free_text +
    weights.interactive;

  // Avoid division by zero
  if (total === 0) {
    // Return equal weights if all are zero
    return {
      multiple_choice: 0.25,
      true_false: 0.25,
      free_text: 0.25,
      interactive: 0.25,
    };
  }

  return {
    multiple_choice: weights.multiple_choice / total,
    true_false: weights.true_false / total,
    free_text: weights.free_text / total,
    interactive: weights.interactive / total,
  };
}

/**
 * Apply adaptive adjustments to base weights based on learning context.
 *
 * Adjustments are applied additively, then normalized:
 * - Low accuracy (<50%): +20% to MC (easier questions)
 * - High mastery (reviewing/mastered): +20% to interactive (application)
 * - Low cognitive capacity (<50%): +20% to MC + T/F (simple types)
 * - High Bloom level (analyze+): +20% to free-text (deeper thinking)
 *
 * @param weights - Base weights to adjust
 * @param context - Context factors for adaptation
 * @returns Adjusted and normalized weights
 */
export function applyAdaptiveAdjustments(
  weights: QuestionWeights,
  context: WeightingContext
): QuestionWeights {
  // Start with a copy of the input weights
  const adjusted: QuestionWeights = { ...weights };

  // Adjustment 1: Low accuracy -> favor easier question types (MC)
  if (
    context.recentAccuracy !== undefined &&
    context.recentAccuracy < LOW_ACCURACY_THRESHOLD
  ) {
    adjusted.multiple_choice += ADJUSTMENT_AMOUNT;
  }

  // Adjustment 2: High mastery -> favor application/interactive questions
  if (
    context.masteryState !== undefined &&
    SOLID_MASTERY_STATES.includes(context.masteryState)
  ) {
    adjusted.interactive += ADJUSTMENT_AMOUNT;
  }

  // Adjustment 3: Low cognitive capacity -> favor simple types (MC + T/F)
  if (context.cognitiveCapacity !== undefined) {
    const capacityPercentageAvailable =
      100 - context.cognitiveCapacity.percentageUsed;
    if (capacityPercentageAvailable < LOW_CAPACITY_THRESHOLD) {
      // Split the adjustment between MC and T/F
      adjusted.multiple_choice += ADJUSTMENT_AMOUNT / 2;
      adjusted.true_false += ADJUSTMENT_AMOUNT / 2;
    }
  }

  // Adjustment 4: High Bloom level -> favor free-text for deeper thinking
  if (
    context.bloomLevel !== undefined &&
    HIGHER_ORDER_BLOOM_LEVELS.includes(context.bloomLevel)
  ) {
    adjusted.free_text += ADJUSTMENT_AMOUNT;
  }

  // Normalize to ensure weights sum to 1.0
  return normalizeWeights(adjusted);
}

/**
 * Select a question type using weighted random selection.
 *
 * Uses the context to determine weights, then performs weighted random
 * selection to choose a question type. This provides variety while
 * respecting the phase-appropriate defaults and adaptive adjustments.
 *
 * @param context - The weighting context
 * @param randomValue - Optional random value (0-1) for testing, defaults to Math.random()
 * @returns Selected question type
 */
export function selectQuestionType(
  context: WeightingContext,
  randomValue?: number
): 'multiple_choice' | 'true_false' | 'free_text' | 'interactive' {
  // Get base weights for the phase
  const baseWeights = getPhaseWeights(context.phase);

  // Apply adaptive adjustments
  const adjustedWeights = applyAdaptiveAdjustments(baseWeights, context);

  // Perform weighted random selection
  const random = randomValue ?? Math.random();

  // Cumulative distribution for weighted selection
  let cumulative = 0;

  cumulative += adjustedWeights.multiple_choice;
  if (random < cumulative) {
    return 'multiple_choice';
  }

  cumulative += adjustedWeights.true_false;
  if (random < cumulative) {
    return 'true_false';
  }

  cumulative += adjustedWeights.free_text;
  if (random < cumulative) {
    return 'free_text';
  }

  // Default to interactive for any remaining probability
  return 'interactive';
}

/**
 * Get weights for display/debugging purposes.
 *
 * Returns the final adjusted weights that would be used for selection,
 * useful for UI display or debugging.
 *
 * @param context - The weighting context
 * @returns Final adjusted weights
 */
export function getAdjustedWeights(context: WeightingContext): QuestionWeights {
  const baseWeights = getPhaseWeights(context.phase);
  return applyAdaptiveAdjustments(baseWeights, context);
}
