/**
 * Chapter Generation Service
 *
 * Generates video chapters from extracted concepts for TikTok-style learning feeds.
 *
 * Key responsibilities:
 * - Filter tier 2-3 concepts with valid source_mapping
 * - Sort by source_mapping.primary_segment.start_sec
 * - Assign chapter_sequence (1, 2, 3...)
 * - Validate chapter durations (merge if <3min, warn if >10min)
 * - Generate open_loop_teaser hooks via Claude API
 *
 * @example
 * ```ts
 * import { createChapterGenerationService } from '@/src/lib/chapter-generation-service';
 * import { createAIService } from '@/src/lib/ai-service';
 *
 * const aiService = createAIService();
 * const chapterService = createChapterGenerationService(aiService, supabase);
 *
 * const conceptsWithChapters = await chapterService.generateChapters(
 *   projectId,
 *   sourceId,
 *   concepts,
 *   transcription
 * );
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import { Concept, Transcription } from '@/src/types/database';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for chapter generation operations
 */
export type ChapterGenerationErrorCode =
  | 'GENERATION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_ELIGIBLE_CONCEPTS';

/**
 * Custom error class for chapter generation operations
 */
export class ChapterGenerationError extends Error {
  code: ChapterGenerationErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ChapterGenerationErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChapterGenerationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Minimum chapter duration in seconds (3 minutes)
 */
const MIN_CHAPTER_DURATION_SEC = 180;

/**
 * Maximum chapter duration in seconds before warning (10 minutes)
 */
const MAX_CHAPTER_DURATION_SEC = 600;

/**
 * Chapter metadata for sorting and merging decisions
 */
interface ChapterCandidate {
  concept: Concept;
  startSec: number;
  endSec: number;
  durationSec: number;
}

/**
 * Open loop teaser response from AI
 */
interface TeaserResponse {
  concept_name: string;
  teaser: string;
}

/**
 * Chapter generation service interface
 */
export interface ChapterGenerationService {
  /**
   * Generate chapters for concepts from a source
   *
   * @param projectId - Project ID
   * @param sourceId - Source ID
   * @param concepts - Extracted concepts from Pass 2
   * @param transcription - Source transcription (optional, for context)
   * @returns Updated concepts with chapter_sequence and open_loop_teaser
   */
  generateChapters(
    projectId: string,
    sourceId: string,
    concepts: Concept[],
    transcription?: Transcription | null
  ): Promise<Concept[]>;
}

/**
 * System prompt for open loop teaser generation
 */
const TEASER_SYSTEM_PROMPT = `You are an expert educational content creator specializing in attention-grabbing hooks for learning content.

Your task is to generate "open loop" teasers - curiosity hooks that make learners want to watch/read the next chapter.

For each concept provided, generate a short teaser (1-2 sentences) that:
1. Creates curiosity by hinting at what they'll learn without giving it away
2. Uses a question, surprising fact, or intriguing statement
3. Connects to the learner's interests or goals
4. Is conversational and engaging (not academic)

GUIDELINES:
- Keep teasers under 20 words
- Use active voice and present tense
- Create genuine curiosity, not clickbait
- Reference the value they'll get from learning this

EXAMPLES:
- "Most people get this wrong about recursion. Here's the mental model that makes it click."
- "What if I told you there's a pattern that predicts 80% of user behavior?"
- "The one concept that separates junior from senior developers..."

Return a JSON array with objects containing concept_name and teaser.`;

/**
 * Filter concepts eligible for chapter generation
 * Only tier 2-3 concepts with valid source_mapping
 */
function filterEligibleConcepts(concepts: Concept[]): Concept[] {
  return concepts.filter((concept) => {
    // Skip tier 1 (familiar/background) concepts
    if (concept.tier === 1) {
      return false;
    }

    // Skip concepts that are only mentioned, not explained
    if (concept.mentioned_only) {
      return false;
    }

    // Must have source_mapping with primary_segment
    const sourceMapping = concept.source_mapping;
    if (!sourceMapping?.primary_segment) {
      return false;
    }

    // Must have valid start and end times
    const { start_sec, end_sec } = sourceMapping.primary_segment;
    if (typeof start_sec !== 'number' || typeof end_sec !== 'number') {
      return false;
    }

    if (start_sec < 0 || end_sec <= start_sec) {
      return false;
    }

    return true;
  });
}

/**
 * Sort concepts by their primary segment start time
 */
function sortByStartTime(concepts: Concept[]): ChapterCandidate[] {
  return concepts
    .map((concept) => {
      const mapping = concept.source_mapping!;
      const startSec = mapping.primary_segment.start_sec;
      const endSec = mapping.primary_segment.end_sec;
      return {
        concept,
        startSec,
        endSec,
        durationSec: endSec - startSec,
      };
    })
    .sort((a, b) => a.startSec - b.startSec);
}

/**
 * Validate chapter durations and log warnings
 */
function validateChapterDurations(
  candidates: ChapterCandidate[],
  sourceId: string
): { candidates: ChapterCandidate[]; warnings: string[] } {
  const warnings: string[] = [];
  const processed: ChapterCandidate[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const current = candidates[i];

    // Check for short chapters that could be merged
    if (current.durationSec < MIN_CHAPTER_DURATION_SEC) {
      const prevIndex = processed.length - 1;
      const nextIndex = i + 1;

      // Try to merge with adjacent chapter
      if (prevIndex >= 0 && nextIndex < candidates.length) {
        // Check which adjacent is closer
        const prevEnd = processed[prevIndex].endSec;
        const nextStart = candidates[nextIndex].startSec;
        const distToPrev = current.startSec - prevEnd;
        const distToNext = nextStart - current.endSec;

        if (distToPrev <= distToNext) {
          // Merge with previous
          processed[prevIndex].endSec = current.endSec;
          processed[prevIndex].durationSec =
            processed[prevIndex].endSec - processed[prevIndex].startSec;
          warnings.push(
            `Chapter "${current.concept.name}" (<${MIN_CHAPTER_DURATION_SEC / 60}min) ` +
            `merged with previous chapter "${processed[prevIndex].concept.name}"`
          );
          continue;
        }
      } else if (prevIndex >= 0) {
        // Only previous exists, merge with it
        processed[prevIndex].endSec = current.endSec;
        processed[prevIndex].durationSec =
          processed[prevIndex].endSec - processed[prevIndex].startSec;
        warnings.push(
          `Chapter "${current.concept.name}" (<${MIN_CHAPTER_DURATION_SEC / 60}min) ` +
          `merged with previous chapter "${processed[prevIndex].concept.name}"`
        );
        continue;
      }
      // If only next exists or no adjacent, keep as-is with warning
      warnings.push(
        `Chapter "${current.concept.name}" is short (${Math.round(current.durationSec / 60)}min < ${MIN_CHAPTER_DURATION_SEC / 60}min minimum)`
      );
    }

    // Check for long chapters
    if (current.durationSec > MAX_CHAPTER_DURATION_SEC) {
      warnings.push(
        `Chapter "${current.concept.name}" is long (${Math.round(current.durationSec / 60)}min > ${MAX_CHAPTER_DURATION_SEC / 60}min recommended)`
      );
    }

    processed.push(current);
  }

  return { candidates: processed, warnings };
}

/**
 * Build user message for teaser generation
 */
function buildTeaserUserMessage(concepts: Concept[]): string {
  let message = 'Generate open loop teasers for the following video chapters:\n\n';

  concepts.forEach((concept, index) => {
    message += `${index + 1}. **${concept.name}**\n`;
    message += `   Definition: ${concept.definition}\n`;
    if (concept.one_sentence_summary) {
      message += `   Summary: ${concept.one_sentence_summary}\n`;
    }
    if (concept.why_it_matters) {
      message += `   Why it matters: ${concept.why_it_matters}\n`;
    }
    message += '\n';
  });

  message += 'Generate a curiosity-inducing teaser for each concept.';

  return message;
}

/**
 * Batch size for teaser generation
 */
const TEASER_BATCH_SIZE = 5;

/**
 * Create a chapter generation service instance
 *
 * @param aiService - AI service for teaser generation
 * @param supabase - Supabase client for persistence
 * @returns Chapter generation service instance
 */
export function createChapterGenerationService(
  aiService: AIService,
  supabase: SupabaseClient
): ChapterGenerationService {
  return {
    async generateChapters(
      projectId: string,
      sourceId: string,
      concepts: Concept[],
      transcription?: Transcription | null
    ): Promise<Concept[]> {
      const logId = `chapter-gen-${sourceId}`;
      const timer = startTimer();

      logInput('chapter_generation', logId, {
        projectId,
        sourceId,
        totalConcepts: concepts.length,
        hasTranscription: !!transcription,
      });

      try {
        // Step 1: Filter eligible concepts
        const eligibleConcepts = filterEligibleConcepts(concepts);

        if (eligibleConcepts.length === 0) {
          logOutput('chapter_generation', logId, {
            message: 'No eligible concepts for chapter generation',
            filtered: {
              tier1: concepts.filter((c) => c.tier === 1).length,
              mentionedOnly: concepts.filter((c) => c.mentioned_only).length,
              noSourceMapping: concepts.filter((c) => !c.source_mapping?.primary_segment).length,
            },
          }, timer.stop());

          return concepts; // Return original concepts unchanged
        }

        // Step 2: Sort by start time
        const sortedCandidates = sortByStartTime(eligibleConcepts);

        // Step 3: Validate durations
        const { candidates: validatedCandidates, warnings } = validateChapterDurations(
          sortedCandidates,
          sourceId
        );

        // Log warnings
        if (warnings.length > 0) {
          console.warn('[ChapterGeneration] Duration warnings:', warnings);
        }

        // Step 4: Assign chapter sequences
        const chapterConceptIds = new Set<string>();
        const chapterSequenceMap = new Map<string, number>();

        validatedCandidates.forEach((candidate, index) => {
          chapterSequenceMap.set(candidate.concept.id, index + 1);
          chapterConceptIds.add(candidate.concept.id);
        });

        // Step 5: Generate open loop teasers via AI
        const teaserMap = new Map<string, string>();
        const conceptsForTeasers = validatedCandidates.map((c) => c.concept);

        // Process in batches
        for (let i = 0; i < conceptsForTeasers.length; i += TEASER_BATCH_SIZE) {
          const batch = conceptsForTeasers.slice(i, i + TEASER_BATCH_SIZE);

          try {
            const response = await sendStructuredMessage<TeaserResponse[]>(
              aiService,
              {
                systemPrompt: TEASER_SYSTEM_PROMPT,
                userMessage: buildTeaserUserMessage(batch),
                options: {
                  model: 'claude-haiku', // Fast model for simple generation
                  temperature: 0.7, // Creative but consistent
                },
              }
            );

            if (Array.isArray(response.data)) {
              for (const item of response.data) {
                if (item.concept_name && item.teaser) {
                  teaserMap.set(item.concept_name, item.teaser.trim());
                }
              }
            }
          } catch (error) {
            console.warn('[ChapterGeneration] Teaser generation failed for batch:', error);
            // Continue without teasers for this batch
          }
        }

        // Step 6: Update concepts in database
        const updatedConcepts: Concept[] = [];

        for (const concept of concepts) {
          const chapterSequence = chapterSequenceMap.get(concept.id);
          const teaser = teaserMap.get(concept.name);

          if (chapterSequence !== undefined || teaser) {
            const updateData: Partial<Concept> = {};

            if (chapterSequence !== undefined) {
              updateData.chapter_sequence = chapterSequence;
            }

            if (teaser) {
              updateData.open_loop_teaser = teaser;
            }

            // Update in database
            const { data, error } = await supabase
              .from('concepts')
              .update(updateData)
              .eq('id', concept.id)
              .select()
              .single();

            if (error) {
              console.warn(`[ChapterGeneration] Failed to update concept ${concept.id}:`, error.message);
              updatedConcepts.push({
                ...concept,
                chapter_sequence: chapterSequence ?? concept.chapter_sequence,
                open_loop_teaser: teaser ?? concept.open_loop_teaser,
              });
            } else {
              updatedConcepts.push(data as Concept);
            }
          } else {
            updatedConcepts.push(concept);
          }
        }

        // Log output
        logOutput('chapter_generation', logId, {
          eligibleConcepts: eligibleConcepts.length,
          chaptersGenerated: validatedCandidates.length,
          teasersGenerated: teaserMap.size,
          warnings: warnings.length,
        }, timer.stop());

        return updatedConcepts;
      } catch (error) {
        timer.stop();
        logError('chapter_generation', logId, error as Error);

        throw new ChapterGenerationError(
          `Chapter generation failed: ${(error as Error).message}`,
          'GENERATION_FAILED',
          { projectId, sourceId, cause: error }
        );
      }
    },
  };
}
