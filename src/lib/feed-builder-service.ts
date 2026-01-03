/**
 * Feed Builder Service
 *
 * Builds TikTok-style learning feeds by interleaving video chunks with
 * quizzes, facts, and synthesis activities.
 *
 * Feed pattern: Video -> Quiz -> Video -> Video -> Fact -> SYNTHESIS
 * Synthesis inserted every 5-6 chapters to consolidate learning.
 *
 * @example
 * ```ts
 * import { createFeedBuilderService } from '@/src/lib/feed-builder-service';
 *
 * const feedService = createFeedBuilderService();
 *
 * const feed = feedService.buildFeed(sourceId, concepts);
 * // Returns: [VideoChunkItem, QuizItem, VideoChunkItem, ...]
 * ```
 */

import { Concept } from '@/src/types/database';
import {
  FeedItem,
  VideoChunkItem,
  QuizItem,
  FactItem,
  SynthesisItem,
} from '@/src/types/engagement';

/**
 * Error codes for feed builder operations
 */
export type FeedBuilderErrorCode =
  | 'BUILD_FAILED'
  | 'NO_CHAPTERS'
  | 'INVALID_CONCEPTS';

/**
 * Custom error class for feed builder operations
 */
export class FeedBuilderError extends Error {
  code: FeedBuilderErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: FeedBuilderErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FeedBuilderError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Feed pattern configuration
 * Pattern repeats: Video -> Quiz -> Video -> Video -> Fact -> SYNTHESIS
 */
type FeedPatternItem = 'video' | 'quiz' | 'fact' | 'synthesis';

const FEED_PATTERN: FeedPatternItem[] = [
  'video',   // 1
  'quiz',    // 2
  'video',   // 3
  'video',   // 4
  'fact',    // 5
  'video',   // 6
];

/**
 * Number of chapters between synthesis activities
 */
const SYNTHESIS_INTERVAL = 5;

/**
 * Feed builder service interface
 */
export interface FeedBuilderService {
  /**
   * Build a learning feed from concepts with chapters
   *
   * @param sourceId - Source ID for the feed
   * @param concepts - Concepts with chapter_sequence and assessment_spec
   * @returns Array of feed items in interleaved order
   */
  buildFeed(sourceId: string, concepts: Concept[]): FeedItem[];
}

/**
 * Generate a unique ID for feed items
 */
function generateFeedItemId(prefix: string, sourceId: string, index: number): string {
  return `${prefix}-${sourceId}-${index}`;
}

/**
 * Get chapter concepts sorted by chapter_sequence
 */
function getChapterConcepts(concepts: Concept[]): Concept[] {
  return concepts
    .filter((c) => c.chapter_sequence !== null && c.chapter_sequence !== undefined)
    .sort((a, b) => (a.chapter_sequence ?? 0) - (b.chapter_sequence ?? 0));
}

/**
 * Create a VideoChunkItem from a concept
 */
function createVideoChunkItem(
  concept: Concept,
  sourceId: string,
  index: number
): VideoChunkItem {
  const mapping = concept.source_mapping;
  const startSec = mapping?.primary_segment?.start_sec ?? 0;
  const endSec = mapping?.primary_segment?.end_sec ?? 0;

  return {
    id: generateFeedItemId('video', sourceId, index),
    type: 'video_chunk',
    conceptId: concept.id,
    startSec,
    endSec,
    title: concept.name,
    openLoopTeaser: concept.open_loop_teaser ?? undefined,
  };
}

/**
 * Create a QuizItem from a concept
 */
function createQuizItem(
  concept: Concept,
  sourceId: string,
  index: number
): QuizItem | null {
  const assessmentSpec = concept.assessment_spec;

  // Need at least one sample question
  if (!assessmentSpec?.sample_questions?.length) {
    return null;
  }

  // Pick a random question from the sample questions
  const questionIndex = Math.floor(
    Math.random() * assessmentSpec.sample_questions.length
  );
  const question = assessmentSpec.sample_questions[questionIndex];

  return {
    id: generateFeedItemId('quiz', sourceId, index),
    type: 'quiz',
    conceptId: concept.id,
    question,
  };
}

/**
 * Create a FactItem from a concept
 */
function createFactItem(
  concept: Concept,
  sourceId: string,
  index: number
): FactItem {
  return {
    id: generateFeedItemId('fact', sourceId, index),
    type: 'fact',
    conceptId: concept.id,
    factText: concept.one_sentence_summary ?? concept.definition,
    whyItMatters: concept.why_it_matters ?? 'Understanding this concept is key to mastering the topic.',
  };
}

/**
 * Create a SynthesisItem connecting recent concepts
 */
function createSynthesisItem(
  recentConcepts: Concept[],
  sourceId: string,
  index: number,
  chaptersCompleted: number,
  totalChapters: number
): SynthesisItem {
  const conceptNames = recentConcepts.map((c) => c.name);

  // Generate a synthesis prompt connecting the concepts
  const synthesisPrompt = generateSynthesisPrompt(recentConcepts);

  return {
    id: generateFeedItemId('synthesis', sourceId, index),
    type: 'synthesis',
    conceptsToConnect: conceptNames,
    synthesisPrompt,
    chaptersCompleted,
    totalChapters,
  };
}

/**
 * Generate a synthesis prompt connecting concepts
 */
function generateSynthesisPrompt(concepts: Concept[]): string {
  if (concepts.length === 0) {
    return 'Reflect on what you have learned so far.';
  }

  if (concepts.length === 1) {
    return 'Review this key concept before continuing.';
  }

  if (concepts.length === 2) {
    return `How do ${concepts[0].name} and ${concepts[1].name} work together?`;
  }

  // 3+ concepts
  const lastConcept = concepts[concepts.length - 1];
  const otherConcepts = concepts.slice(0, -1).map((c) => c.name).join(', ');

  return `How do ${otherConcepts} and ${lastConcept.name} combine to create a complete picture?`;
}

/**
 * Create a feed builder service instance
 *
 * @returns Feed builder service instance
 */
export function createFeedBuilderService(): FeedBuilderService {
  return {
    buildFeed(sourceId: string, concepts: Concept[]): FeedItem[] {
      // Get chapter concepts sorted by sequence
      const chapterConcepts = getChapterConcepts(concepts);

      if (chapterConcepts.length === 0) {
        return [];
      }

      const feedItems: FeedItem[] = [];
      let patternIndex = 0;
      let chapterIndex = 0;
      let feedItemIndex = 0;
      let chaptersInCurrentCycle = 0;
      let recentConceptsForSynthesis: Concept[] = [];

      while (chapterIndex < chapterConcepts.length) {
        const currentConcept = chapterConcepts[chapterIndex];
        const patternItem = FEED_PATTERN[patternIndex % FEED_PATTERN.length];

        // Check if we need to insert a synthesis
        if (chaptersInCurrentCycle >= SYNTHESIS_INTERVAL) {
          const synthesisItem = createSynthesisItem(
            recentConceptsForSynthesis.slice(-SYNTHESIS_INTERVAL),
            sourceId,
            feedItemIndex++,
            chapterIndex,
            chapterConcepts.length
          );
          feedItems.push(synthesisItem);
          chaptersInCurrentCycle = 0;
          recentConceptsForSynthesis = [];
          continue; // Don't advance pattern, re-evaluate
        }

        switch (patternItem) {
          case 'video': {
            const videoItem = createVideoChunkItem(
              currentConcept,
              sourceId,
              feedItemIndex++
            );
            feedItems.push(videoItem);
            recentConceptsForSynthesis.push(currentConcept);
            chapterIndex++;
            chaptersInCurrentCycle++;
            patternIndex++;
            break;
          }

          case 'quiz': {
            // Use the most recent concept for the quiz
            const quizConcept = recentConceptsForSynthesis[
              recentConceptsForSynthesis.length - 1
            ] || currentConcept;

            const quizItem = createQuizItem(
              quizConcept,
              sourceId,
              feedItemIndex++
            );

            if (quizItem) {
              feedItems.push(quizItem);
              patternIndex++;
            } else {
              // Skip this pattern slot if quiz couldn't be created
              patternIndex++;
            }
            // Don't advance chapter index - quiz is interstitial
            break;
          }

          case 'fact': {
            // Use the most recent concept for the fact
            const factConcept = recentConceptsForSynthesis[
              recentConceptsForSynthesis.length - 1
            ] || currentConcept;

            const factItem = createFactItem(
              factConcept,
              sourceId,
              feedItemIndex++
            );
            feedItems.push(factItem);
            patternIndex++;
            // Don't advance chapter index - fact is interstitial
            break;
          }

          // Note: 'synthesis' is not in FEED_PATTERN - synthesis is triggered
          // by chaptersInCurrentCycle >= SYNTHESIS_INTERVAL above
        }
      }

      // Final synthesis if we have enough chapters since last synthesis
      if (recentConceptsForSynthesis.length > 0 && chaptersInCurrentCycle >= 2) {
        const finalSynthesis = createSynthesisItem(
          recentConceptsForSynthesis.slice(-chaptersInCurrentCycle),
          sourceId,
          feedItemIndex,
          chapterConcepts.length,
          chapterConcepts.length
        );
        feedItems.push(finalSynthesis);
      }

      return feedItems;
    },
  };
}
