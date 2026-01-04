/**
 * Synthesis Phase Orchestrator Service
 *
 * Generates 3-10 assessment interactions for the synthesis phase
 * based on research principles (desirable difficulties, free recall, interleaving).
 *
 * The synthesis phase triggers after 5-6 learning items to verify the user
 * grasped the material through a comprehensive assessment.
 *
 * Research-backed principles:
 * - Free recall has highest effect size (g=0.81) vs MCQ
 * - Interleaving improves long-term retention
 * - Desirable difficulties enhance learning
 *
 * @example
 * ```ts
 * import { createSynthesisPhaseService } from '@/src/lib/synthesis-phase-service';
 *
 * const service = createSynthesisPhaseService();
 * const interactions = service.generateSynthesisPhase(concepts, userPerformance);
 * ```
 */

// ============================================================================
// Error Codes and Error Class
// ============================================================================

/**
 * Error codes for synthesis phase operations
 */
export type SynthesisPhaseErrorCode =
  | 'INSUFFICIENT_CONCEPTS'
  | 'INVALID_PERFORMANCE';

/**
 * Custom error class for synthesis phase operations
 */
export class SynthesisPhaseError extends Error {
  constructor(
    message: string,
    public readonly code: SynthesisPhaseErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SynthesisPhaseError';
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Types of interactions in the synthesis phase
 */
export type InteractionType =
  | 'free_recall'
  | 'fill_in_blank'
  | 'sequence'
  | 'connect_dots'
  | 'mcq';

/**
 * Types of concepts based on cognitive classification
 */
export type ConceptType = 'factual' | 'procedural' | 'conceptual' | 'applied';

/**
 * Concept data for synthesis phase generation
 */
export interface SynthesisConcept {
  id: string;
  name: string;
  type: ConceptType;
  description?: string;
}

/**
 * A single interaction in the synthesis phase
 */
export interface SynthesisInteraction {
  /** Unique identifier for this interaction */
  id: string;
  /** ID of the concept this interaction tests */
  conceptId: string;
  /** Human-readable name of the concept */
  conceptName: string;
  /** Type of interaction */
  type: InteractionType;
  /** The question/instruction for the user */
  prompt: string;
  /** Expected answer for validation (optional for open-ended) */
  expectedAnswer?: string;
  /** Number of attempts made (starts at 0) */
  attemptCount: number;
  /** Explanation shown after failed attempt */
  feedbackOnIncorrect?: string;
}

/**
 * Configuration for the synthesis phase service
 */
export interface SynthesisPhaseConfig {
  /** Minimum number of interactions (default: 3) */
  minInteractions?: number;
  /** Maximum number of interactions (default: 10) */
  maxInteractions?: number;
}

/**
 * Synthesis phase service interface
 */
export interface SynthesisPhaseService {
  /**
   * Generate synthesis phase interactions based on concepts and performance
   *
   * @param concepts - Array of concepts covered in the session
   * @param performance - User's performance percentage (0-100)
   * @returns Array of synthesis interactions
   */
  generateSynthesisPhase(
    concepts: SynthesisConcept[],
    performance: number
  ): SynthesisInteraction[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<SynthesisPhaseConfig> = {
  minInteractions: 3,
  maxInteractions: 10,
};

/**
 * Performance thresholds for determining interaction count
 */
const PERFORMANCE_THRESHOLDS = {
  /** Perfect performance threshold (100%) */
  perfect: 100,
  /** Good performance threshold (70-99%) */
  good: 70,
};

/**
 * Interaction count ranges based on performance
 */
const INTERACTION_COUNTS = {
  /** For perfect performance (100%) */
  perfect: { min: 3, max: 4 },
  /** For good performance (70-99%) */
  good: { min: 5, max: 6 },
  /** For struggling performance (<70%) */
  struggling: { min: 8, max: 10 },
};

/**
 * Probability of preferred interaction type per concept type
 * Based on research showing free recall has g=0.81 effect size
 */
const CONCEPT_TYPE_PREFERENCES: Record<
  ConceptType,
  { preferred: InteractionType[]; probability: number }
> = {
  factual: { preferred: ['fill_in_blank', 'free_recall'], probability: 0.7 },
  procedural: { preferred: ['sequence'], probability: 0.6 },
  conceptual: { preferred: ['connect_dots'], probability: 0.6 },
  applied: { preferred: ['free_recall'], probability: 0.7 },
};

/**
 * Prompt templates for each interaction type
 */
const PROMPT_TEMPLATES: Record<ConceptType, Record<InteractionType, string>> = {
  factual: {
    free_recall: 'Explain what {conceptName} is and why it matters.',
    fill_in_blank: 'Complete the definition: {conceptName} is _______.',
    sequence: 'Arrange the key aspects of {conceptName} in logical order.',
    connect_dots: 'How does {conceptName} relate to what you learned earlier?',
    mcq: 'Which of the following best describes {conceptName}?',
  },
  procedural: {
    free_recall: 'Describe the steps involved in {conceptName}.',
    fill_in_blank: 'The first step in {conceptName} is to _______.',
    sequence: 'Put the steps of {conceptName} in the correct order.',
    connect_dots: 'How does {conceptName} build on previous concepts?',
    mcq: 'What is the correct order for {conceptName}?',
  },
  conceptual: {
    free_recall: 'Explain the underlying principle behind {conceptName}.',
    fill_in_blank: 'The key principle of {conceptName} is _______.',
    sequence: 'Order the concepts that build up to understanding {conceptName}.',
    connect_dots: 'Explain how {conceptName} connects to other concepts you learned.',
    mcq: 'Which principle best explains {conceptName}?',
  },
  applied: {
    free_recall: 'Give an example of how you would apply {conceptName} in practice.',
    fill_in_blank: 'When applying {conceptName}, you would first _______.',
    sequence: 'Order the steps to apply {conceptName} in a real scenario.',
    connect_dots: 'How would you combine {conceptName} with other techniques?',
    mcq: 'In which scenario would {conceptName} be most useful?',
  },
};

/**
 * Feedback templates for incorrect answers
 */
const FEEDBACK_TEMPLATES: Record<InteractionType, string> = {
  free_recall:
    "Take a moment to recall what you learned about {conceptName}. Think about its definition and key characteristics.",
  fill_in_blank:
    'Review the definition of {conceptName}. What are its essential components?',
  sequence:
    'Consider the logical flow of {conceptName}. What needs to happen first? What depends on what?',
  connect_dots:
    'Think about how {conceptName} relates to other concepts. What similarities or dependencies exist?',
  mcq: 'Review the key points about {conceptName}. What distinguishes it from similar concepts?',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Determine the number of interactions based on performance
 */
function getInteractionCount(
  performance: number,
  config: Required<SynthesisPhaseConfig>
): number {
  let range: { min: number; max: number };

  if (performance === PERFORMANCE_THRESHOLDS.perfect) {
    range = INTERACTION_COUNTS.perfect;
  } else if (performance >= PERFORMANCE_THRESHOLDS.good) {
    range = INTERACTION_COUNTS.good;
  } else {
    range = INTERACTION_COUNTS.struggling;
  }

  // Apply config bounds - config limits always take precedence
  // Clamp range to config boundaries
  const min = Math.max(range.min, config.minInteractions);
  const max = Math.min(range.max, config.maxInteractions);

  // If min > max due to config constraints, use max (config.maxInteractions wins)
  if (min > max) {
    return max;
  }

  return randomInt(min, max);
}

/**
 * Select interaction type based on concept type and research-backed probabilities
 */
function selectInteractionType(conceptType: ConceptType): InteractionType {
  const preference = CONCEPT_TYPE_PREFERENCES[conceptType];

  if (Math.random() < preference.probability) {
    // Select from preferred types
    const preferredIndex = Math.floor(Math.random() * preference.preferred.length);
    return preference.preferred[preferredIndex];
  }

  // Fallback to MCQ
  return 'mcq';
}

/**
 * Generate prompt text for an interaction
 */
function generatePrompt(conceptName: string, conceptType: ConceptType, interactionType: InteractionType): string {
  const template = PROMPT_TEMPLATES[conceptType][interactionType];
  return template.replace('{conceptName}', conceptName);
}

/**
 * Generate feedback text for incorrect answers
 */
function generateFeedback(conceptName: string, interactionType: InteractionType): string {
  const template = FEEDBACK_TEMPLATES[interactionType];
  return template.replace('{conceptName}', conceptName);
}

/**
 * Interleave concepts to avoid consecutive same-concept interactions
 * Uses a greedy algorithm to distribute concepts evenly
 */
function interleaveInteractions(
  concepts: SynthesisConcept[],
  count: number
): SynthesisConcept[] {
  // Shuffle concepts first
  const shuffled = shuffle(concepts);

  const result: SynthesisConcept[] = [];
  let lastConceptId: string | null = null;

  // Create a working copy of available concepts for each round
  let available = [...shuffled];

  for (let i = 0; i < count; i++) {
    // Filter out last used concept if possible
    let candidates = available.filter((c) => c.id !== lastConceptId);

    // If no candidates (only one concept type), allow repetition
    if (candidates.length === 0) {
      candidates = available;
    }

    // Select a random concept from candidates
    const selectedIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[selectedIndex];

    result.push(selected);
    lastConceptId = selected.id;

    // If we've used all concepts, refill the pool
    if (result.length % concepts.length === 0) {
      available = shuffle([...concepts]);
    }
  }

  return result;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a synthesis phase service instance
 *
 * @param config - Optional configuration overrides
 * @returns SynthesisPhaseService instance
 *
 * @example
 * ```ts
 * const service = createSynthesisPhaseService();
 * const interactions = service.generateSynthesisPhase(concepts, 85);
 *
 * // With custom config
 * const customService = createSynthesisPhaseService({
 *   minInteractions: 4,
 *   maxInteractions: 8,
 * });
 * ```
 */
export function createSynthesisPhaseService(
  config?: SynthesisPhaseConfig
): SynthesisPhaseService {
  // Merge config with defaults
  const mergedConfig: Required<SynthesisPhaseConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    generateSynthesisPhase(
      concepts: SynthesisConcept[],
      performance: number
    ): SynthesisInteraction[] {
      // Validate inputs
      if (concepts.length < 3) {
        throw new SynthesisPhaseError(
          `Synthesis phase requires at least 3 concepts, got ${concepts.length}`,
          'INSUFFICIENT_CONCEPTS'
        );
      }

      if (performance < 0 || performance > 100) {
        throw new SynthesisPhaseError(
          `Performance must be between 0 and 100, got ${performance}`,
          'INVALID_PERFORMANCE'
        );
      }

      // Determine number of interactions based on performance
      const interactionCount = getInteractionCount(performance, mergedConfig);

      // Interleave concepts to avoid consecutive same-concept
      const interleavedConcepts = interleaveInteractions(concepts, interactionCount);

      // Generate interactions
      const interactions: SynthesisInteraction[] = interleavedConcepts.map(
        (concept, index) => {
          const interactionType = selectInteractionType(concept.type);

          return {
            id: `synthesis-interaction-${index}`,
            conceptId: concept.id,
            conceptName: concept.name,
            type: interactionType,
            prompt: generatePrompt(concept.name, concept.type, interactionType),
            expectedAnswer: undefined, // Would be generated by AI in production
            attemptCount: 0,
            feedbackOnIncorrect: generateFeedback(concept.name, interactionType),
          };
        }
      );

      return interactions;
    },
  };
}
