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
  TextChunkItem,
  QuizItem,
  FactItem,
  SynthesisItem,
  SynthesisPhaseItem,
  PretestItem,
  MiniLessonItem,
  PretestResultsItem,
  SandboxItem,
} from '@/src/types/engagement';
import type {
  SandboxInteraction,
  SandboxInteractionType,
  ScaffoldLevel,
  SandboxElement,
} from '@/src/types/sandbox';
import { TextChunk } from './text-chunking-pipeline';
import {
  createSynthesisPhaseService,
  SynthesisConcept,
  ConceptType,
} from './synthesis-phase-service';

/**
 * Error codes for feed builder operations
 */
export type FeedBuilderErrorCode =
  | 'BUILD_FAILED'
  | 'NO_CHAPTERS'
  | 'NO_TEXT_CHUNKS'
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
 * Data structure for pretest questions within a prerequisite
 */
export interface PretestQuestionData {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

/**
 * Data structure for a prerequisite with its pretest questions
 */
export interface PrerequisiteData {
  id: string;
  name: string;
  questions: PretestQuestionData[];
}

/**
 * Input data for building a feed with pretests
 */
export interface PretestFeedData {
  prerequisites: PrerequisiteData[];
}

/**
 * Data for inserting mini-lessons into the feed
 */
export interface MiniLessonInsertData {
  prerequisiteId: string;
  title: string;
  contentMarkdown: string;
  keyPoints: string[];
  estimatedMinutes: number;
}

/**
 * Feed pattern configuration
 * Pattern repeats: Content -> Quiz -> Content -> Content -> Fact -> SYNTHESIS
 * 'content' can be either video_chunk or text_chunk depending on source type
 */
type FeedPatternItem = 'content' | 'quiz' | 'fact' | 'synthesis';

const FEED_PATTERN: FeedPatternItem[] = [
  'content', // 1 - video or text chunk
  'quiz',    // 2
  'content', // 3
  'content', // 4
  'fact',    // 5
  'content', // 6
];

/**
 * Number of chapters between synthesis activities
 */
const SYNTHESIS_INTERVAL = 5;

/**
 * Default performance percentage for synthesis phase generation
 */
const DEFAULT_PERFORMANCE = 85;

/**
 * Feed builder service interface
 */
export interface FeedBuilderService {
  /**
   * Build a learning feed from concepts with chapters (for video sources)
   *
   * @param sourceId - Source ID for the feed
   * @param concepts - Concepts with chapter_sequence and assessment_spec
   * @returns Array of feed items in interleaved order
   */
  buildFeed(sourceId: string, concepts: Concept[]): FeedItem[];

  /**
   * Build a learning feed from text chunks (for text/article sources)
   *
   * @param sourceId - Source ID for the feed
   * @param textChunks - Text chunks from the text chunking pipeline
   * @param relatedConcepts - Optional concepts for quiz generation
   * @returns Array of feed items in interleaved order
   */
  buildTextFeed(
    sourceId: string,
    textChunks: TextChunk[],
    relatedConcepts?: Concept[]
  ): FeedItem[];

  /**
   * Build a learning feed with synthesis phase integration (for video sources)
   * Uses SynthesisPhaseService to generate performance-based interactions
   *
   * @param sourceId - Source ID for the feed
   * @param concepts - Concepts with chapter_sequence and assessment_spec
   * @param performance - User performance percentage (0-100), defaults to 85
   * @returns Array of feed items with synthesis phase items
   */
  buildFeedWithSynthesis(
    sourceId: string,
    concepts: Concept[],
    performance?: number
  ): FeedItem[];

  /**
   * Build a learning feed with synthesis phase integration (for text sources)
   * Uses SynthesisPhaseService to generate performance-based interactions
   *
   * @param sourceId - Source ID for the feed
   * @param textChunks - Text chunks from the text chunking pipeline
   * @param relatedConcepts - Optional concepts for quiz generation
   * @param performance - User performance percentage (0-100), defaults to 85
   * @returns Array of feed items with synthesis phase items
   */
  buildTextFeedWithSynthesis(
    sourceId: string,
    textChunks: TextChunk[],
    relatedConcepts?: Concept[],
    performance?: number
  ): FeedItem[];

  /**
   * Build a learning feed with pretest phase at the beginning
   * Creates a feed starting with pretest questions, followed by results,
   * then the regular synthesis-based learning feed.
   *
   * Feed order: [Pretest Items] -> [Pretest Results] -> [Synthesis Feed]
   *
   * @param sourceId - Source ID for the feed
   * @param concepts - Concepts with chapter_sequence and assessment_spec
   * @param pretestData - Prerequisite pretest data
   * @param performance - User performance percentage (0-100), defaults to 85
   * @returns Array of feed items starting with pretest phase
   */
  buildFeedWithPretests(
    sourceId: string,
    concepts: Concept[],
    pretestData: PretestFeedData,
    performance?: number
  ): FeedItem[];

  /**
   * Insert mini-lessons into an existing feed at a specified position
   * Used to add remediation content for knowledge gaps after pretest results
   *
   * @param feed - Existing feed items
   * @param gaps - Mini-lesson data for prerequisites with knowledge gaps
   * @param insertAfterIndex - Index after which to insert mini-lessons
   * @returns New feed array with mini-lessons inserted
   */
  insertMiniLessons(
    feed: FeedItem[],
    gaps: MiniLessonInsertData[],
    insertAfterIndex: number
  ): FeedItem[];

  /**
   * Create a sandbox item for a concept
   * Generates an interactive sandbox activity based on concept's cognitive type
   *
   * @param concept - The concept to create a sandbox for
   * @param sourceId - Source ID for the feed
   * @param index - Index for unique ID generation
   * @param scaffoldLevel - Level of scaffolding (worked, scaffold, faded)
   * @returns SandboxItem for feed insertion
   */
  createSandboxItem(
    concept: Concept,
    sourceId: string,
    index: number,
    scaffoldLevel?: ScaffoldLevel
  ): SandboxItem;
}

/**
 * Generate a unique ID for feed items
 */
function generateFeedItemId(prefix: string, sourceId: string, index: number): string {
  return `${prefix}-${sourceId}-${index}`;
}

/**
 * Get chapter concepts sorted by chapter_sequence
 * Falls back to sorting by created_at if chapter_sequence is not populated
 */
function getChapterConcepts(concepts: Concept[]): Concept[] {
  const withSequence = concepts
    .filter((c) => c.chapter_sequence !== null && c.chapter_sequence !== undefined);

  // If concepts have chapter_sequence, use it
  if (withSequence.length > 0) {
    return withSequence.sort((a, b) => (a.chapter_sequence ?? 0) - (b.chapter_sequence ?? 0));
  }

  // Fallback: use all concepts sorted by created_at (oldest first for learning order)
  if (concepts.length > 0) {
    return [...concepts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  }

  return [];
}

/**
 * Create a VideoChunkItem from a concept
 * Includes segment-specific question for VideoQuestionCard display
 */
function createVideoChunkItem(
  concept: Concept,
  sourceId: string,
  index: number
): VideoChunkItem {
  const mapping = concept.source_mapping;
  const startSec = mapping?.primary_segment?.start_sec ?? 0;
  const endSec = mapping?.primary_segment?.end_sec ?? 0;

  // Get segment-specific question, fallback to first sample question
  const question = mapping?.segment_question
    ?? concept.assessment_spec?.sample_questions?.[0];

  return {
    id: generateFeedItemId('video', sourceId, index),
    type: 'video_chunk',
    conceptId: concept.id,
    startSec,
    endSec,
    title: concept.name,
    openLoopTeaser: concept.open_loop_teaser ?? undefined,
    question,
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
 * Create a TextChunkItem from a text chunk
 *
 * @param chunk - The text chunk from the chunking pipeline
 * @param sourceId - Source ID for the feed
 * @param index - Index in the feed for unique ID generation
 * @param totalChunks - Total number of chunks in the source
 * @returns TextChunkItem with preview text (max 200 chars for ~60 word limit)
 */
function createTextChunkItem(
  chunk: TextChunk,
  sourceId: string,
  index: number,
  totalChunks: number
): TextChunkItem {
  return {
    id: generateFeedItemId('text', sourceId, index),
    type: 'text_chunk',
    // First 200 chars for preview (60 words ~= 300 chars, use 200 to be safe)
    text: chunk.text.substring(0, 200),
    propositions: chunk.propositions,
    chunkIndex: chunk.startIndex,
    totalChunks,
  };
}

/**
 * Generate a synthesis prompt for text chunks
 *
 * @param propositionSamples - Sample propositions from recent chunks
 * @returns Synthesis prompt string
 */
function generateTextSynthesisPrompt(propositionSamples: string[]): string {
  if (propositionSamples.length === 0) {
    return 'Reflect on what you have read so far.';
  }

  if (propositionSamples.length === 1) {
    return 'Review the key ideas from this section before continuing.';
  }

  if (propositionSamples.length === 2) {
    return 'How do these two ideas connect and build on each other?';
  }

  return 'How do the concepts from these sections work together to form a complete understanding?';
}

/**
 * Create a SynthesisItem for text feeds
 *
 * @param recentChunks - Recent text chunks to synthesize
 * @param sourceId - Source ID for the feed
 * @param index - Index in the feed
 * @param chunksCompleted - Number of chunks processed so far
 * @param totalChunks - Total number of chunks
 * @returns SynthesisItem connecting recent chunk concepts
 */
function createTextSynthesisItem(
  recentChunks: TextChunk[],
  sourceId: string,
  index: number,
  chunksCompleted: number,
  totalChunks: number
): SynthesisItem {
  // Extract first proposition from each chunk as representative concepts
  const conceptsToConnect = recentChunks
    .map((chunk) => chunk.propositions[0] || chunk.text.substring(0, 50))
    .slice(0, 5); // Limit to 5 for readability

  const synthesisPrompt = generateTextSynthesisPrompt(conceptsToConnect);

  return {
    id: generateFeedItemId('synthesis', sourceId, index),
    type: 'synthesis',
    conceptsToConnect,
    synthesisPrompt,
    chaptersCompleted: chunksCompleted,
    totalChapters: totalChunks,
  };
}

/**
 * Create a FactItem from a text chunk
 *
 * @param chunk - The text chunk to extract fact from
 * @param sourceId - Source ID for the feed
 * @param index - Index in the feed
 * @returns FactItem with key proposition and context
 */
function createTextFactItem(
  chunk: TextChunk,
  sourceId: string,
  index: number
): FactItem {
  // Use first proposition as the key fact, or truncated text if no propositions
  const factText = chunk.propositions[0] || chunk.text.substring(0, 150);

  return {
    id: generateFeedItemId('fact', sourceId, index),
    type: 'fact',
    conceptId: chunk.id,
    factText,
    whyItMatters: 'This idea is central to understanding the content.',
  };
}

/**
 * Create a PretestItem from prerequisite data and question
 */
function createPretestItem(
  prereq: PrerequisiteData,
  question: PretestQuestionData,
  sourceId: string,
  questionIndex: number,
  totalQuestions: number
): PretestItem {
  return {
    id: generateFeedItemId('pretest', sourceId, questionIndex),
    type: 'pretest',
    prerequisiteId: prereq.id,
    prerequisiteName: prereq.name,
    questionText: question.questionText,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    questionNumber: questionIndex + 1,
    totalQuestions,
  };
}

/**
 * Create a PretestResultsItem from pretest data
 * Initially sets all prerequisites as gaps (user hasn't answered yet)
 */
function createPretestResultsItem(
  sourceId: string,
  pretestData: PretestFeedData,
  index: number
): PretestResultsItem {
  const totalPrerequisites = pretestData.prerequisites.length;
  const gapPrerequisiteIds = pretestData.prerequisites.map((p) => p.id);

  // Initially all are gaps (0% correct)
  return {
    id: generateFeedItemId('pretest-results', sourceId, index),
    type: 'pretest_results',
    totalPrerequisites,
    correctCount: 0,
    percentage: 0,
    recommendation: 'review_required',
    gapPrerequisiteIds,
  };
}

/**
 * Create a MiniLessonItem from insert data
 */
function createMiniLessonItem(
  data: MiniLessonInsertData,
  sourceId: string,
  index: number
): MiniLessonItem {
  return {
    id: generateFeedItemId('mini-lesson', sourceId, index),
    type: 'mini_lesson',
    prerequisiteId: data.prerequisiteId,
    title: data.title,
    contentMarkdown: data.contentMarkdown,
    keyPoints: data.keyPoints,
    estimatedMinutes: data.estimatedMinutes,
  };
}

/**
 * Determine sandbox interaction type based on cognitive type
 */
function getInteractionTypeForCognitive(cognitiveType: string | null | undefined): SandboxInteractionType {
  switch (cognitiveType) {
    case 'declarative':
      return 'matching';
    case 'procedural':
      return 'sequencing';
    case 'conceptual':
      return 'fill_in_blank';
    case 'conditional':
      return 'branching';
    case 'metacognitive':
      return 'fill_in_blank';
    default:
      return 'matching';
  }
}

/**
 * Create a basic sandbox interaction for a concept
 * Generates a simple matching or sequencing interaction based on cognitive type
 */
function createBasicSandboxInteraction(
  concept: Concept,
  scaffoldLevel: ScaffoldLevel
): SandboxInteraction {
  const interactionType = getInteractionTypeForCognitive(concept.cognitive_type);
  const interactionId = `sandbox-${concept.id}-${Date.now()}`;

  // Create basic elements based on interaction type
  const elements: SandboxElement[] = [];
  const zoneContents: Record<string, string[]> = {};

  if (interactionType === 'matching') {
    // Create a simple matching interaction with term -> definition
    const termElement: SandboxElement = {
      id: `term-${concept.id}`,
      type: 'draggable',
      position: { x: 50, y: 100 },
      dimensions: { width: 150, height: 50 },
      content: concept.name,
      style: { backgroundColor: '#E3F2FD', borderRadius: 8 },
      draggable: true,
      snapTargets: [`zone-${concept.id}`],
    };

    const zoneElement: SandboxElement = {
      id: `zone-${concept.id}`,
      type: 'dropzone',
      position: { x: 250, y: 100 },
      dimensions: { width: 200, height: 60 },
      content: concept.definition?.substring(0, 50) || 'Definition',
      style: { backgroundColor: '#F5F5F5', borderRadius: 8 },
      draggable: false,
      capacity: 1,
    };

    elements.push(termElement, zoneElement);
    zoneContents[`zone-${concept.id}`] = [`term-${concept.id}`];
  } else if (interactionType === 'sequencing') {
    // Create a simple sequencing interaction
    const steps = ['Step 1', 'Step 2', 'Step 3'];
    steps.forEach((step, i) => {
      elements.push({
        id: `step-${i}`,
        type: 'draggable',
        position: { x: 50 + Math.random() * 200, y: 50 + i * 70 },
        dimensions: { width: 200, height: 50 },
        content: step,
        style: { backgroundColor: '#E8F5E9', borderRadius: 8 },
        draggable: true,
      });
    });
  }

  return {
    interactionId,
    conceptId: concept.id,
    cognitiveType: (concept.cognitive_type as 'declarative' | 'procedural' | 'conceptual' | 'conditional' | 'metacognitive') || 'declarative',
    bloomLevel: (concept.bloom_level as 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create') || 'remember',
    interactionType,
    canvasConfig: {
      width: 400,
      height: 300,
      backgroundColor: '#FFFFFF',
    },
    elements,
    correctState: {
      zoneContents,
      minCorrectPercentage: 0.8,
    },
    evaluationMode: 'deterministic',
    scaffoldLevel,
    hints: [`Think about what ${concept.name} means.`, 'Try matching related items.'],
    estimatedTimeSeconds: 60,
    difficultyModifier: 1.0,
    instructions: `Match the term with its definition for ${concept.name}.`,
  };
}

/**
 * Create a SandboxItem for the feed
 */
function createSandboxItem(
  concept: Concept,
  sourceId: string,
  index: number,
  scaffoldLevel: ScaffoldLevel = 'scaffold'
): SandboxItem {
  console.log('[FeedBuilder] Creating sandbox item for concept:', concept.name);

  const interaction = createBasicSandboxInteraction(concept, scaffoldLevel);

  return {
    id: generateFeedItemId('sandbox', sourceId, index),
    type: 'sandbox',
    conceptId: concept.id,
    conceptName: concept.name,
    status: 'ready',  // Phase 1: synchronous, always ready
    interaction,
    scaffoldLevel,
    estimatedTimeSeconds: interaction.estimatedTimeSeconds,
  };
}

/**
 * Map cognitive type from Concept to SynthesisConcept ConceptType
 * Ensures compatibility between database concept types and synthesis service
 */
function mapCognitiveType(cognitiveType: string | null | undefined): ConceptType {
  const typeMap: Record<string, ConceptType> = {
    factual: 'factual',
    procedural: 'procedural',
    conceptual: 'conceptual',
    applied: 'applied',
  };

  return typeMap[cognitiveType ?? ''] || 'conceptual';
}

/**
 * Convert Concept to SynthesisConcept format for synthesis phase service
 */
function conceptToSynthesisConcept(concept: Concept): SynthesisConcept {
  return {
    id: concept.id,
    name: concept.name,
    type: mapCognitiveType(concept.cognitive_type),
    description: concept.definition ?? undefined,
  };
}

/**
 * Create a SynthesisPhaseItem using the synthesis phase service
 *
 * @param concepts - Concepts to include in synthesis phase
 * @param sourceId - Source ID for the feed
 * @param index - Index in the feed for unique ID generation
 * @param performance - User performance percentage (0-100)
 * @param itemsCompleted - Number of learning items completed
 * @param totalItems - Total number of items in the feed
 * @returns SynthesisPhaseItem with generated interactions
 */
function createSynthesisPhaseItem(
  concepts: Concept[],
  sourceId: string,
  index: number,
  performance: number,
  itemsCompleted: number,
  totalItems: number
): SynthesisPhaseItem {
  // Clamp performance to valid range (0-100)
  const clampedPerformance = Math.max(0, Math.min(100, performance));

  // Need at least 3 concepts for synthesis phase service
  // If less, we duplicate concepts to meet minimum
  let synthesisConcepts = concepts.map(conceptToSynthesisConcept);

  if (synthesisConcepts.length < 3) {
    // Duplicate concepts to meet minimum of 3
    while (synthesisConcepts.length < 3) {
      synthesisConcepts = [
        ...synthesisConcepts,
        ...concepts.map(conceptToSynthesisConcept),
      ];
    }
    synthesisConcepts = synthesisConcepts.slice(0, 3);
  }

  // Create synthesis phase service and generate interactions
  const synthesisService = createSynthesisPhaseService();
  const interactions = synthesisService.generateSynthesisPhase(
    synthesisConcepts,
    clampedPerformance
  );

  return {
    id: generateFeedItemId('synthesis-phase', sourceId, index),
    type: 'synthesis_phase',
    conceptIds: concepts.map((c) => c.id),
    interactions,
    performance: clampedPerformance,
    itemsCompleted,
    totalItems,
  };
}

/**
 * Create a SynthesisPhaseItem for text feeds using propositions as concepts
 *
 * @param chunks - Text chunks to synthesize
 * @param sourceId - Source ID for the feed
 * @param index - Index in the feed
 * @param performance - User performance percentage (0-100)
 * @param itemsCompleted - Number of items completed
 * @param totalItems - Total number of items
 * @returns SynthesisPhaseItem with generated interactions
 */
function createTextSynthesisPhaseItem(
  chunks: TextChunk[],
  sourceId: string,
  index: number,
  performance: number,
  itemsCompleted: number,
  totalItems: number
): SynthesisPhaseItem {
  // Clamp performance to valid range (0-100)
  const clampedPerformance = Math.max(0, Math.min(100, performance));

  // Convert text chunks to synthesis concepts using propositions
  let synthesisConcepts: SynthesisConcept[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    name: chunk.propositions[0] || `Section ${i + 1}`,
    type: 'conceptual' as ConceptType, // Text chunks default to conceptual
    description: chunk.text.substring(0, 100),
  }));

  // Need at least 3 concepts for synthesis phase service
  if (synthesisConcepts.length < 3) {
    while (synthesisConcepts.length < 3) {
      synthesisConcepts = [...synthesisConcepts, ...synthesisConcepts];
    }
    synthesisConcepts = synthesisConcepts.slice(0, 3);
  }

  // Create synthesis phase service and generate interactions
  const synthesisService = createSynthesisPhaseService();
  const interactions = synthesisService.generateSynthesisPhase(
    synthesisConcepts,
    clampedPerformance
  );

  return {
    id: generateFeedItemId('synthesis-phase', sourceId, index),
    type: 'synthesis_phase',
    conceptIds: chunks.map((c) => c.id),
    interactions,
    performance: clampedPerformance,
    itemsCompleted,
    totalItems,
  };
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
          case 'content': {
            // For video feeds, content items are video chunks
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

    buildTextFeed(
      sourceId: string,
      textChunks: TextChunk[],
      relatedConcepts?: Concept[]
    ): FeedItem[] {
      if (textChunks.length === 0) {
        return [];
      }

      const totalChunks = textChunks.length;
      const feedItems: FeedItem[] = [];
      let patternIndex = 0;
      let chunkIndex = 0;
      let feedItemIndex = 0;
      let chunksInCurrentCycle = 0;
      let recentChunksForSynthesis: TextChunk[] = [];

      // Build a list of concepts with quiz questions for interleaving
      const quizConcepts = (relatedConcepts || []).filter(
        (c) => c.assessment_spec?.sample_questions?.length
      );
      let quizConceptIndex = 0;

      while (chunkIndex < textChunks.length) {
        const currentChunk = textChunks[chunkIndex];
        const patternItem = FEED_PATTERN[patternIndex % FEED_PATTERN.length];

        // Check if we need to insert a synthesis
        if (chunksInCurrentCycle >= SYNTHESIS_INTERVAL) {
          const synthesisItem = createTextSynthesisItem(
            recentChunksForSynthesis.slice(-SYNTHESIS_INTERVAL),
            sourceId,
            feedItemIndex++,
            chunkIndex,
            totalChunks
          );
          feedItems.push(synthesisItem);
          chunksInCurrentCycle = 0;
          recentChunksForSynthesis = [];
          continue; // Don't advance pattern, re-evaluate
        }

        switch (patternItem) {
          case 'content': {
            // For text feeds, content items are text chunks
            const textItem = createTextChunkItem(
              currentChunk,
              sourceId,
              feedItemIndex++,
              totalChunks
            );
            feedItems.push(textItem);
            recentChunksForSynthesis.push(currentChunk);
            chunkIndex++;
            chunksInCurrentCycle++;
            patternIndex++;
            break;
          }

          case 'quiz': {
            // Use available quiz concepts, skip if none available
            if (quizConcepts.length > 0) {
              const quizConcept = quizConcepts[quizConceptIndex % quizConcepts.length];
              const quizItem = createQuizItem(
                quizConcept,
                sourceId,
                feedItemIndex++
              );

              if (quizItem) {
                feedItems.push(quizItem);
                quizConceptIndex++;
              }
            }
            patternIndex++;
            // Don't advance chunk index - quiz is interstitial
            break;
          }

          case 'fact': {
            // Use the most recent chunk for the fact
            const factChunk = recentChunksForSynthesis[
              recentChunksForSynthesis.length - 1
            ] || currentChunk;

            const factItem = createTextFactItem(
              factChunk,
              sourceId,
              feedItemIndex++
            );
            feedItems.push(factItem);
            patternIndex++;
            // Don't advance chunk index - fact is interstitial
            break;
          }

          // Note: 'synthesis' is not in FEED_PATTERN - synthesis is triggered
          // by chunksInCurrentCycle >= SYNTHESIS_INTERVAL above
        }
      }

      // Final synthesis if we have enough chunks since last synthesis
      if (recentChunksForSynthesis.length > 0 && chunksInCurrentCycle >= 2) {
        const finalSynthesis = createTextSynthesisItem(
          recentChunksForSynthesis.slice(-chunksInCurrentCycle),
          sourceId,
          feedItemIndex,
          totalChunks,
          totalChunks
        );
        feedItems.push(finalSynthesis);
      }

      return feedItems;
    },

    buildFeedWithSynthesis(
      sourceId: string,
      concepts: Concept[],
      performance: number = DEFAULT_PERFORMANCE
    ): FeedItem[] {
      // Get chapter concepts sorted by sequence
      const chapterConcepts = getChapterConcepts(concepts);

      if (chapterConcepts.length === 0) {
        return [];
      }

      const feedItems: FeedItem[] = [];
      let patternIndex = 0;
      let chapterIndex = 0;
      let feedItemIndex = 0;
      let learningItemsInCurrentCycle = 0;
      let recentConceptsForSynthesis: Concept[] = [];
      let synthesisPhaseIndex = 0;

      // Count total learning items for progress tracking
      // Learning items are: video chunks (1 per chapter) + quizzes + facts
      // Estimate based on pattern: each chapter produces ~1.5 items on average
      const estimatedTotalItems = Math.ceil(chapterConcepts.length * 1.5);

      while (chapterIndex < chapterConcepts.length) {
        const currentConcept = chapterConcepts[chapterIndex];
        const patternItem = FEED_PATTERN[patternIndex % FEED_PATTERN.length];

        // Check if we need to insert a synthesis phase
        if (learningItemsInCurrentCycle >= SYNTHESIS_INTERVAL) {
          const synthesisPhaseItem = createSynthesisPhaseItem(
            recentConceptsForSynthesis.slice(-SYNTHESIS_INTERVAL),
            sourceId,
            synthesisPhaseIndex++,
            performance,
            feedItems.length,
            estimatedTotalItems
          );
          feedItems.push(synthesisPhaseItem);
          learningItemsInCurrentCycle = 0;
          recentConceptsForSynthesis = [];
          continue; // Don't advance pattern, re-evaluate
        }

        switch (patternItem) {
          case 'content': {
            // For video feeds, content items are video chunks
            const videoItem = createVideoChunkItem(
              currentConcept,
              sourceId,
              feedItemIndex++
            );
            feedItems.push(videoItem);
            recentConceptsForSynthesis.push(currentConcept);
            chapterIndex++;
            learningItemsInCurrentCycle++;
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
              learningItemsInCurrentCycle++;
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
            learningItemsInCurrentCycle++;
            patternIndex++;
            // Don't advance chapter index - fact is interstitial
            break;
          }
        }
      }

      // Final synthesis phase if we have enough items since last synthesis
      if (recentConceptsForSynthesis.length > 0 && learningItemsInCurrentCycle >= 2) {
        const finalSynthesisPhase = createSynthesisPhaseItem(
          recentConceptsForSynthesis.slice(-learningItemsInCurrentCycle),
          sourceId,
          synthesisPhaseIndex,
          performance,
          feedItems.length,
          feedItems.length + 1
        );
        feedItems.push(finalSynthesisPhase);
      }

      return feedItems;
    },

    buildTextFeedWithSynthesis(
      sourceId: string,
      textChunks: TextChunk[],
      relatedConcepts?: Concept[],
      performance: number = DEFAULT_PERFORMANCE
    ): FeedItem[] {
      if (textChunks.length === 0) {
        return [];
      }

      const totalChunks = textChunks.length;
      const feedItems: FeedItem[] = [];
      let patternIndex = 0;
      let chunkIndex = 0;
      let feedItemIndex = 0;
      let learningItemsInCurrentCycle = 0;
      let recentChunksForSynthesis: TextChunk[] = [];
      let synthesisPhaseIndex = 0;

      // Build a list of concepts with quiz questions for interleaving
      const quizConcepts = (relatedConcepts || []).filter(
        (c) => c.assessment_spec?.sample_questions?.length
      );
      let quizConceptIndex = 0;

      // Estimate total items for progress tracking
      const estimatedTotalItems = Math.ceil(totalChunks * 1.5);

      while (chunkIndex < textChunks.length) {
        const currentChunk = textChunks[chunkIndex];
        const patternItem = FEED_PATTERN[patternIndex % FEED_PATTERN.length];

        // Check if we need to insert a synthesis phase
        if (learningItemsInCurrentCycle >= SYNTHESIS_INTERVAL) {
          const synthesisPhaseItem = createTextSynthesisPhaseItem(
            recentChunksForSynthesis.slice(-SYNTHESIS_INTERVAL),
            sourceId,
            synthesisPhaseIndex++,
            performance,
            feedItems.length,
            estimatedTotalItems
          );
          feedItems.push(synthesisPhaseItem);
          learningItemsInCurrentCycle = 0;
          recentChunksForSynthesis = [];
          continue; // Don't advance pattern, re-evaluate
        }

        switch (patternItem) {
          case 'content': {
            // For text feeds, content items are text chunks
            const textItem = createTextChunkItem(
              currentChunk,
              sourceId,
              feedItemIndex++,
              totalChunks
            );
            feedItems.push(textItem);
            recentChunksForSynthesis.push(currentChunk);
            chunkIndex++;
            learningItemsInCurrentCycle++;
            patternIndex++;
            break;
          }

          case 'quiz': {
            // Use available quiz concepts, skip if none available
            if (quizConcepts.length > 0) {
              const quizConcept = quizConcepts[quizConceptIndex % quizConcepts.length];
              const quizItem = createQuizItem(
                quizConcept,
                sourceId,
                feedItemIndex++
              );

              if (quizItem) {
                feedItems.push(quizItem);
                learningItemsInCurrentCycle++;
                quizConceptIndex++;
              }
            }
            patternIndex++;
            // Don't advance chunk index - quiz is interstitial
            break;
          }

          case 'fact': {
            // Use the most recent chunk for the fact
            const factChunk = recentChunksForSynthesis[
              recentChunksForSynthesis.length - 1
            ] || currentChunk;

            const factItem = createTextFactItem(
              factChunk,
              sourceId,
              feedItemIndex++
            );
            feedItems.push(factItem);
            learningItemsInCurrentCycle++;
            patternIndex++;
            // Don't advance chunk index - fact is interstitial
            break;
          }
        }
      }

      // Final synthesis phase if we have enough items since last synthesis
      if (recentChunksForSynthesis.length > 0 && learningItemsInCurrentCycle >= 2) {
        const finalSynthesisPhase = createTextSynthesisPhaseItem(
          recentChunksForSynthesis.slice(-learningItemsInCurrentCycle),
          sourceId,
          synthesisPhaseIndex,
          performance,
          feedItems.length,
          feedItems.length + 1
        );
        feedItems.push(finalSynthesisPhase);
      }

      return feedItems;
    },

    buildFeedWithPretests(
      sourceId: string,
      concepts: Concept[],
      pretestData: PretestFeedData,
      performance: number = DEFAULT_PERFORMANCE
    ): FeedItem[] {
      // If no prerequisites, skip pretest phase entirely
      if (pretestData.prerequisites.length === 0) {
        return this.buildFeedWithSynthesis(sourceId, concepts, performance);
      }

      const feedItems: FeedItem[] = [];

      // Count total questions across all prerequisites
      let totalQuestions = 0;
      for (const prereq of pretestData.prerequisites) {
        totalQuestions += prereq.questions.length;
      }

      // 1. Add pretest items - one per question across all prerequisites
      let questionIndex = 0;
      for (const prereq of pretestData.prerequisites) {
        for (const question of prereq.questions) {
          const pretestItem = createPretestItem(
            prereq,
            question,
            sourceId,
            questionIndex,
            totalQuestions
          );
          feedItems.push(pretestItem);
          questionIndex++;
        }
      }

      // 2. Add pretest results item
      const resultsItem = createPretestResultsItem(sourceId, pretestData, 0);
      feedItems.push(resultsItem);

      // 3. Add the regular synthesis feed after pretest phase
      const synthesisFeed = this.buildFeedWithSynthesis(sourceId, concepts, performance);
      feedItems.push(...synthesisFeed);

      return feedItems;
    },

    insertMiniLessons(
      feed: FeedItem[],
      gaps: MiniLessonInsertData[],
      insertAfterIndex: number
    ): FeedItem[] {
      // If no gaps, return the original feed unchanged
      if (gaps.length === 0) {
        return feed;
      }

      // Create mini-lesson items
      const miniLessonItems: MiniLessonItem[] = gaps.map((gap, index) =>
        createMiniLessonItem(gap, 'mini-lesson', index)
      );

      // Split the feed at the insert point and combine with mini-lessons
      const beforeInsert = feed.slice(0, insertAfterIndex + 1);
      const afterInsert = feed.slice(insertAfterIndex + 1);

      return [...beforeInsert, ...miniLessonItems, ...afterInsert];
    },

    createSandboxItem(
      concept: Concept,
      sourceId: string,
      index: number,
      scaffoldLevel: ScaffoldLevel = 'scaffold'
    ): SandboxItem {
      return createSandboxItem(concept, sourceId, index, scaffoldLevel);
    },
  };
}
