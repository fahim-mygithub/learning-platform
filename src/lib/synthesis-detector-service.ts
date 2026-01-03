/**
 * Synthesis Detector Service
 *
 * Determines when to insert synthesis items in the learning feed.
 * Synthesis items connect multiple concepts the user has learned,
 * reinforcing retention and building deeper understanding.
 *
 * Features:
 * - Interval-based synthesis detection (every 5-6 chapters)
 * - Claude API integration for generating synthesis prompts
 * - Concept connection for meaningful synthesis experiences
 *
 * @example
 * ```ts
 * import { createSynthesisDetectorService } from '@/src/lib/synthesis-detector-service';
 *
 * const detector = createSynthesisDetectorService();
 * if (detector.shouldInsertSynthesis(12, 6)) {
 *   const prompt = await detector.generateSynthesisPrompt(recentConcepts);
 * }
 * ```
 */

import { getDefaultService, sendStructuredMessage, type AIService } from './ai-service';

/**
 * Error codes for synthesis detector operations
 */
export type SynthesisDetectorErrorCode =
  | 'GENERATION_FAILED'
  | 'INVALID_CONCEPTS'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for synthesis detector operations
 */
export class SynthesisDetectorError extends Error {
  constructor(
    message: string,
    public code: SynthesisDetectorErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SynthesisDetectorError';
  }
}

/**
 * Concept data for synthesis generation
 */
export interface SynthesisConcept {
  id: string;
  name: string;
  definition?: string;
  category?: string;
}

/**
 * Generated synthesis prompt result
 */
export interface SynthesisPromptResult {
  prompt: string;
  conceptsToConnect: string[];
  connectionExplanation: string;
}

/**
 * Synthesis detector service interface
 */
export interface SynthesisDetectorService {
  /**
   * Determine if a synthesis item should be inserted
   * Triggers every 5-6 chapters based on randomized interval
   */
  shouldInsertSynthesis(chaptersCompleted: number, lastSynthesisAt: number): boolean;

  /**
   * Generate a synthesis prompt connecting recent concepts
   * Uses Claude API to create meaningful connections
   */
  generateSynthesisPrompt(recentConcepts: SynthesisConcept[]): Promise<SynthesisPromptResult>;

  /**
   * Get the next synthesis interval (5 or 6 chapters)
   */
  getNextSynthesisInterval(): number;
}

/**
 * Configuration for synthesis detection
 */
const SYNTHESIS_CONFIG = {
  /** Minimum chapters between synthesis items */
  minInterval: 5,
  /** Maximum chapters between synthesis items */
  maxInterval: 6,
  /** Minimum concepts needed for synthesis (spec: 3-5 concepts) */
  minConceptsForSynthesis: 3,
  /** Maximum concepts to include in synthesis (spec: 3-5 concepts) */
  maxConceptsInSynthesis: 5,
};

/**
 * System prompt for synthesis generation
 */
const SYNTHESIS_SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating synthesis questions that help learners connect concepts.

Your task is to create a synthesis prompt that:
1. Connects 2-4 related concepts the learner has recently studied
2. Asks them to explain how these concepts relate
3. Encourages deeper understanding through comparison or application

Return JSON with this structure:
{
  "prompt": "The synthesis question/prompt for the learner",
  "conceptsToConnect": ["concept_id_1", "concept_id_2"],
  "connectionExplanation": "Brief explanation of why these concepts connect well"
}

Make the prompt:
- Open-ended but focused
- Accessible for learners at various levels
- Encouraging rather than intimidating
- Focused on understanding, not rote memorization`;

/**
 * Create a synthesis detector service instance
 *
 * @param aiService - Optional AI service instance (defaults to getDefaultService)
 * @returns SynthesisDetectorService instance
 *
 * @example
 * ```ts
 * const detector = createSynthesisDetectorService();
 *
 * // Check if synthesis should be inserted
 * if (detector.shouldInsertSynthesis(currentChapter, lastSynthesisChapter)) {
 *   const synthesis = await detector.generateSynthesisPrompt(concepts);
 *   // Insert synthesis item into feed
 * }
 * ```
 */
export function createSynthesisDetectorService(
  aiService?: AIService
): SynthesisDetectorService {
  // Store the current synthesis interval (randomized between 5-6)
  let currentInterval = SYNTHESIS_CONFIG.minInterval;

  /**
   * Randomize the synthesis interval
   */
  function randomizeInterval(): number {
    return Math.random() < 0.5
      ? SYNTHESIS_CONFIG.minInterval
      : SYNTHESIS_CONFIG.maxInterval;
  }

  // Initialize with random interval
  currentInterval = randomizeInterval();

  return {
    /**
     * Determine if a synthesis item should be inserted
     */
    shouldInsertSynthesis(chaptersCompleted: number, lastSynthesisAt: number): boolean {
      // Handle edge case: no chapters completed yet
      if (chaptersCompleted <= 0) {
        return false;
      }

      // Calculate chapters since last synthesis
      const chaptersSinceLastSynthesis = chaptersCompleted - lastSynthesisAt;

      // Check if we've reached the current interval
      if (chaptersSinceLastSynthesis >= currentInterval) {
        // Randomize interval for next synthesis
        currentInterval = randomizeInterval();
        return true;
      }

      return false;
    },

    /**
     * Generate a synthesis prompt connecting recent concepts
     */
    async generateSynthesisPrompt(
      recentConcepts: SynthesisConcept[]
    ): Promise<SynthesisPromptResult> {
      // Validate input
      if (recentConcepts.length < SYNTHESIS_CONFIG.minConceptsForSynthesis) {
        throw new SynthesisDetectorError(
          `Need at least ${SYNTHESIS_CONFIG.minConceptsForSynthesis} concepts for synthesis, got ${recentConcepts.length}`,
          'INVALID_CONCEPTS'
        );
      }

      // Select concepts for synthesis (up to max)
      const conceptsForSynthesis = recentConcepts.slice(
        0,
        SYNTHESIS_CONFIG.maxConceptsInSynthesis
      );

      // Build the user message with concept details
      const conceptList = conceptsForSynthesis
        .map((c) => {
          let entry = `- ${c.name} (id: ${c.id})`;
          if (c.definition) {
            entry += `\n  Definition: ${c.definition}`;
          }
          if (c.category) {
            entry += `\n  Category: ${c.category}`;
          }
          return entry;
        })
        .join('\n');

      const userMessage = `Create a synthesis prompt connecting these concepts the learner has studied:

${conceptList}

Generate a thoughtful question that helps the learner see how these concepts relate and reinforce each other.`;

      try {
        const service = aiService ?? getDefaultService();

        const response = await sendStructuredMessage<SynthesisPromptResult>(
          service,
          {
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
            userMessage,
            options: {
              model: 'claude-haiku', // Use Haiku for speed and cost
              temperature: 0.7, // Some creativity for varied prompts
            },
          }
        );

        return response.data;
      } catch (error) {
        throw new SynthesisDetectorError(
          `Failed to generate synthesis prompt: ${(error as Error).message}`,
          'GENERATION_FAILED',
          error as Error
        );
      }
    },

    /**
     * Get the next synthesis interval
     */
    getNextSynthesisInterval(): number {
      return currentInterval;
    },
  };
}

/**
 * Default synthesis detector service instance (singleton)
 */
let defaultSynthesisDetectorService: SynthesisDetectorService | null = null;

/**
 * Get or create the default synthesis detector service instance
 *
 * @returns Default SynthesisDetectorService instance
 */
export function getDefaultSynthesisDetectorService(): SynthesisDetectorService {
  if (!defaultSynthesisDetectorService) {
    defaultSynthesisDetectorService = createSynthesisDetectorService();
  }
  return defaultSynthesisDetectorService;
}

/**
 * Reset the default service instance (primarily for testing)
 */
export function resetDefaultSynthesisDetectorService(): void {
  defaultSynthesisDetectorService = null;
}
