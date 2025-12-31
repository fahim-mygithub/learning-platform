/**
 * Misconception Service
 *
 * Generates common misconceptions for extracted concepts to support:
 * - Targeted tutoring when learners make mistakes
 * - Quiz feedback generation
 * - Proactive learning support
 *
 * This service is called after Pass 2 (concept extraction) and before Pass 3
 * (roadmap building). It focuses on tier 2-3 concepts that are not merely
 * mentioned, as these are the concepts learners will actively study.
 *
 * @example
 * ```ts
 * import { createMisconceptionService } from '@/src/lib/misconception-service';
 * import { createAIService } from '@/src/lib/ai-service';
 *
 * const aiService = createAIService();
 * const misconceptionService = createMisconceptionService(aiService, supabase);
 *
 * // Generate misconceptions for extracted concepts
 * const misconceptionMap = await misconceptionService.generateMisconceptions(concepts);
 *
 * // Store misconceptions in database
 * for (const [conceptId, misconceptions] of misconceptionMap) {
 *   await misconceptionService.storeMisconceptions(conceptId, misconceptions);
 * }
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import {
  Misconception,
  EnhancedExtractedConcept,
} from '@/src/types/three-pass';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for misconception service operations
 */
export type MisconceptionServiceErrorCode =
  | 'GENERATION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_ELIGIBLE_CONCEPTS';

/**
 * Custom error class for misconception service operations
 */
export class MisconceptionServiceError extends Error {
  code: MisconceptionServiceErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: MisconceptionServiceErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MisconceptionServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Raw misconception response from AI
 */
interface RawMisconceptionResponse {
  concept_name: string;
  misconceptions: Misconception[];
}

/**
 * Misconception service interface
 */
export interface MisconceptionService {
  /**
   * Generate misconceptions for a set of concepts
   * Focuses on tier 2-3 concepts that are not mentioned_only
   *
   * @param concepts - Enhanced extracted concepts from Pass 2
   * @returns Map of concept name to array of misconceptions
   */
  generateMisconceptions(
    concepts: EnhancedExtractedConcept[]
  ): Promise<Map<string, Misconception[]>>;

  /**
   * Store misconceptions for a concept in the database
   *
   * @param conceptId - Database ID of the concept
   * @param misconceptions - Array of misconceptions to store
   */
  storeMisconceptions(
    conceptId: string,
    misconceptions: Misconception[]
  ): Promise<void>;

  /**
   * Retrieve stored misconceptions for a concept
   *
   * @param conceptId - Database ID of the concept
   * @returns Array of misconceptions or null if not found
   */
  getMisconceptions(conceptId: string): Promise<Misconception[] | null>;
}

/**
 * System prompt for misconception generation
 * Uses nuanced domain reasoning to identify common learner errors
 */
const MISCONCEPTION_SYSTEM_PROMPT = `You are an expert educational psychologist and subject matter expert. Your task is to identify common misconceptions that learners typically have about specific concepts.

For each concept provided, generate 1-3 misconceptions that:
1. Represent REAL errors that learners commonly make
2. Are specific and actionable (not vague generalizations)
3. Include detection patterns and remediation strategies

For each misconception, provide:
1. **misconception**: What learners commonly get wrong (1-2 sentences)
2. **reality**: The correct understanding (1-2 sentences)
3. **trigger_detection**: A pattern or phrase that would indicate this misconception in a quiz response or explanation (for automated detection)
4. **remediation**: A specific strategy to correct this misconception (1-2 sentences)

GUIDELINES:
- Focus on conceptual errors, not just factual mistakes
- Consider common prior knowledge that leads to errors
- Think about overgeneralizations and undergeneralizations
- Include misconceptions from confusing similar concepts
- The trigger_detection should be a keyword, phrase, or pattern that suggests the misconception

EXAMPLE for "Photosynthesis":
{
  "concept_name": "Photosynthesis",
  "misconceptions": [
    {
      "misconception": "Plants only perform photosynthesis during the day and only respiration at night",
      "reality": "Plants perform respiration continuously, day and night. Photosynthesis occurs only when light is available, but respiration never stops.",
      "trigger_detection": "plants breathe at night|respiration only at night|switch between",
      "remediation": "Emphasize that respiration is a constant process for energy, while photosynthesis is an additional process that requires light. Use a timeline diagram showing both processes running."
    }
  ]
}

Return a JSON array of objects, one for each concept provided.`;

/**
 * Build user message for misconception generation
 */
function buildUserMessage(concepts: EnhancedExtractedConcept[]): string {
  let message = 'Generate common misconceptions for the following concepts:\n\n';

  concepts.forEach((concept, index) => {
    message += `${index + 1}. **${concept.name}**\n`;
    message += `   Definition: ${concept.definition}\n`;
    if (concept.key_points && concept.key_points.length > 0) {
      message += `   Key points: ${concept.key_points.slice(0, 3).join('; ')}\n`;
    }
    message += `   Cognitive type: ${concept.cognitive_type}\n`;
    message += `   Bloom's level: ${concept.bloom_level}\n\n`;
  });

  message += '\nGenerate 1-3 misconceptions for each concept, focusing on errors that learners commonly make.';

  return message;
}

/**
 * Filter concepts eligible for misconception generation
 * Only tier 2-3 concepts that are not mentioned_only
 */
function filterEligibleConcepts(
  concepts: EnhancedExtractedConcept[]
): EnhancedExtractedConcept[] {
  return concepts.filter((concept) => {
    // Skip tier 1 (familiar/background) concepts
    if (concept.tier === 1) {
      return false;
    }

    // Skip concepts that are only mentioned, not explained
    if (concept.mentioned_only) {
      return false;
    }

    return true;
  });
}

/**
 * Validate and normalize a misconception
 */
function validateMisconception(raw: Partial<Misconception>): Misconception | null {
  // Validate required fields
  if (!raw.misconception || typeof raw.misconception !== 'string') {
    return null;
  }
  if (!raw.reality || typeof raw.reality !== 'string') {
    return null;
  }
  if (!raw.trigger_detection || typeof raw.trigger_detection !== 'string') {
    return null;
  }
  if (!raw.remediation || typeof raw.remediation !== 'string') {
    return null;
  }

  return {
    misconception: raw.misconception.trim(),
    reality: raw.reality.trim(),
    trigger_detection: raw.trigger_detection.trim(),
    remediation: raw.remediation.trim(),
  };
}

/**
 * Batch concepts for API calls to avoid token limits
 * Processes up to 5 concepts per batch
 */
const BATCH_SIZE = 5;

/**
 * Create a misconception service instance
 *
 * @param aiService - AI service instance for misconception generation
 * @param supabase - Optional Supabase client for persistence
 * @returns Misconception service instance
 */
export function createMisconceptionService(
  aiService: AIService,
  supabase?: SupabaseClient
): MisconceptionService {
  return {
    async generateMisconceptions(
      concepts: EnhancedExtractedConcept[]
    ): Promise<Map<string, Misconception[]>> {
      const logId = `misconception-${Date.now()}`;
      const result = new Map<string, Misconception[]>();

      // Filter to eligible concepts only
      const eligibleConcepts = filterEligibleConcepts(concepts);

      logInput('misconception_generation', logId, {
        total_concepts: concepts.length,
        eligible_concepts: eligibleConcepts.length,
        filtered_out: {
          tier_1: concepts.filter((c) => c.tier === 1).length,
          mentioned_only: concepts.filter((c) => c.mentioned_only).length,
        },
      });

      if (eligibleConcepts.length === 0) {
        logOutput('misconception_generation', logId, {
          message: 'No eligible concepts for misconception generation',
          generated_count: 0,
        }, 0);
        return result;
      }

      const timer = startTimer();

      try {
        // Process concepts in batches
        for (let i = 0; i < eligibleConcepts.length; i += BATCH_SIZE) {
          const batch = eligibleConcepts.slice(i, i + BATCH_SIZE);

          const response = await sendStructuredMessage<RawMisconceptionResponse[]>(
            aiService,
            {
              systemPrompt: MISCONCEPTION_SYSTEM_PROMPT,
              userMessage: buildUserMessage(batch),
              options: {
                model: 'claude-sonnet', // Nuanced domain reasoning needed
                temperature: 0.4, // Consistent but creative output
              },
            }
          );

          // Process response
          if (Array.isArray(response.data)) {
            for (const item of response.data) {
              if (item.concept_name && Array.isArray(item.misconceptions)) {
                const validMisconceptions: Misconception[] = [];

                for (const rawMisconception of item.misconceptions.slice(0, 3)) {
                  const validated = validateMisconception(rawMisconception);
                  if (validated) {
                    validMisconceptions.push(validated);
                  }
                }

                if (validMisconceptions.length > 0) {
                  result.set(item.concept_name, validMisconceptions);
                }
              }
            }
          }
        }

        // Log output
        const totalMisconceptions = Array.from(result.values()).reduce(
          (sum, arr) => sum + arr.length,
          0
        );

        logOutput('misconception_generation', logId, {
          concepts_processed: eligibleConcepts.length,
          concepts_with_misconceptions: result.size,
          total_misconceptions: totalMisconceptions,
          average_per_concept: result.size > 0
            ? (totalMisconceptions / result.size).toFixed(1)
            : 0,
        }, timer.stop());

        return result;
      } catch (error) {
        logError('misconception_generation', logId, error as Error);

        throw new MisconceptionServiceError(
          `Misconception generation failed: ${(error as Error).message}`,
          'GENERATION_FAILED',
          { cause: error }
        );
      }
    },

    async storeMisconceptions(
      conceptId: string,
      misconceptions: Misconception[]
    ): Promise<void> {
      if (!supabase) {
        throw new MisconceptionServiceError(
          'Supabase client required for storage',
          'DATABASE_ERROR'
        );
      }

      if (!conceptId || !Array.isArray(misconceptions)) {
        throw new MisconceptionServiceError(
          'Invalid parameters: conceptId and misconceptions array required',
          'VALIDATION_ERROR'
        );
      }

      const { error } = await supabase
        .from('concepts')
        .update({ common_misconceptions: misconceptions })
        .eq('id', conceptId);

      if (error) {
        throw new MisconceptionServiceError(
          `Failed to store misconceptions: ${error.message}`,
          'DATABASE_ERROR',
          { conceptId }
        );
      }
    },

    async getMisconceptions(conceptId: string): Promise<Misconception[] | null> {
      if (!supabase) {
        return null;
      }

      if (!conceptId) {
        throw new MisconceptionServiceError(
          'conceptId is required',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase
        .from('concepts')
        .select('common_misconceptions')
        .eq('id', conceptId)
        .single();

      if (error || !data) {
        return null;
      }

      // Validate and return misconceptions
      const raw = data.common_misconceptions;

      if (!Array.isArray(raw)) {
        return null;
      }

      const validated: Misconception[] = [];
      for (const item of raw) {
        const misconception = validateMisconception(item);
        if (misconception) {
          validated.push(misconception);
        }
      }

      return validated.length > 0 ? validated : null;
    },
  };
}
