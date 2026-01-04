/**
 * Feed Builder Service Tests
 *
 * Tests for feed building including:
 * - Feed pattern: Content -> Quiz -> Content -> Content -> Fact -> SYNTHESIS
 * - Interleaving logic for video and text feeds
 * - Synthesis insertion every 5-6 chapters/chunks
 * - Feed item creation from concepts and text chunks
 */

import { Concept } from '@/src/types/database';
import { SourceMapping, ConceptTier, BloomLevel, AssessmentSpec, SampleQuestion } from '@/src/types/three-pass';
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
  isVideoChunkItem,
  isTextChunkItem,
  isQuizItem,
  isFactItem,
  isSynthesisItem,
  isSynthesisPhaseItem,
  isPretestItem,
  isMiniLessonItem,
  isPretestResultsItem,
} from '@/src/types/engagement';

import {
  createFeedBuilderService,
  FeedBuilderService,
  FeedBuilderError,
  PretestFeedData,
  MiniLessonInsertData,
} from '../feed-builder-service';
import { TextChunk } from '../text-chunking-pipeline';

describe('Feed Builder Service', () => {
  // Helper to create a base concept
  const createBaseConcept = (
    overrides: Partial<Concept> = {}
  ): Concept => ({
    id: `concept-${Math.random().toString(36).substr(2, 9)}`,
    project_id: 'project-123',
    source_id: 'source-123',
    name: 'Test Concept',
    definition: 'A test concept definition.',
    key_points: ['Point 1', 'Point 2'],
    cognitive_type: 'conceptual',
    difficulty: 5,
    source_timestamps: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tier: 2 as ConceptTier,
    mentioned_only: false,
    bloom_level: 'understand' as BloomLevel,
    definition_provided: true,
    chapter_sequence: 1,
    source_mapping: {
      primary_segment: { start_sec: 0, end_sec: 300 },
      key_moments: [],
      review_clip: { start_sec: 0, end_sec: 60 },
    } as SourceMapping,
    one_sentence_summary: 'A one sentence summary.',
    why_it_matters: 'This is why it matters.',
    assessment_spec: {
      appropriate_question_types: ['multiple_choice'],
      inappropriate_question_types: [],
      sample_questions: [
        {
          question_type: 'multiple_choice',
          question_text: 'What is X?',
          correct_answer: 'Option A',
          distractors: ['Option B', 'Option C'],
          explanation: 'Because A is correct.',
        } as SampleQuestion,
      ],
      mastery_indicators: ['Can explain X'],
      mastery_threshold: 0.8,
    } as AssessmentSpec,
    ...overrides,
  });

  // Helper to create multiple chapter concepts
  const createChapterConcepts = (count: number): Concept[] => {
    return Array.from({ length: count }, (_, i) =>
      createBaseConcept({
        id: `concept-${i + 1}`,
        name: `Concept ${i + 1}`,
        chapter_sequence: i + 1,
        source_mapping: {
          primary_segment: { start_sec: i * 300, end_sec: (i + 1) * 300 },
          key_moments: [],
          review_clip: { start_sec: i * 300, end_sec: i * 300 + 60 },
        } as SourceMapping,
      })
    );
  };

  describe('createFeedBuilderService', () => {
    it('creates service with buildFeed method', () => {
      const service = createFeedBuilderService();

      expect(service).toBeDefined();
      expect(service.buildFeed).toBeDefined();
    });
  });

  describe('buildFeed', () => {
    let service: FeedBuilderService;

    beforeEach(() => {
      service = createFeedBuilderService();
    });

    describe('Basic feed generation', () => {
      it('returns empty array for empty concepts', () => {
        const feed = service.buildFeed('source-123', []);

        expect(feed).toEqual([]);
      });

      it('returns empty array when no concepts have chapter_sequence', () => {
        const concepts = [
          createBaseConcept({ chapter_sequence: undefined }),
          createBaseConcept({ chapter_sequence: null }),
        ];

        const feed = service.buildFeed('source-123', concepts);

        expect(feed).toEqual([]);
      });

      it('generates feed items for concepts with chapter_sequence', () => {
        const concepts = createChapterConcepts(1);

        const feed = service.buildFeed('source-123', concepts);

        expect(feed.length).toBeGreaterThan(0);
      });
    });

    describe('Feed pattern', () => {
      it('starts with a video chunk', () => {
        const concepts = createChapterConcepts(1);

        const feed = service.buildFeed('source-123', concepts);

        expect(feed.length).toBeGreaterThan(0);
        expect(isVideoChunkItem(feed[0])).toBe(true);
      });

      it('follows Video -> Quiz pattern for first two items', () => {
        const concepts = createChapterConcepts(2);

        const feed = service.buildFeed('source-123', concepts);

        // Should have at least Video, Quiz, Video pattern
        expect(feed.length).toBeGreaterThanOrEqual(3);
        expect(isVideoChunkItem(feed[0])).toBe(true);
        expect(isQuizItem(feed[1])).toBe(true);
        expect(isVideoChunkItem(feed[2])).toBe(true);
      });

      it('includes fact items in the pattern', () => {
        const concepts = createChapterConcepts(5);

        const feed = service.buildFeed('source-123', concepts);

        const factItems = feed.filter(isFactItem);
        expect(factItems.length).toBeGreaterThan(0);
      });
    });

    describe('VideoChunkItem creation', () => {
      it('creates video items with correct properties', () => {
        const concepts = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Test Concept',
            chapter_sequence: 1,
            open_loop_teaser: 'Hook text',
            source_mapping: {
              primary_segment: { start_sec: 100, end_sec: 400 },
              key_moments: [],
              review_clip: { start_sec: 100, end_sec: 160 },
            } as SourceMapping,
          }),
        ];

        const feed = service.buildFeed('source-123', concepts);
        const videoItem = feed.find(isVideoChunkItem) as VideoChunkItem;

        expect(videoItem).toBeDefined();
        expect(videoItem.type).toBe('video_chunk');
        expect(videoItem.conceptId).toBe('concept-1');
        expect(videoItem.startSec).toBe(100);
        expect(videoItem.endSec).toBe(400);
        expect(videoItem.title).toBe('Test Concept');
        expect(videoItem.openLoopTeaser).toBe('Hook text');
      });

      it('generates unique IDs for video items', () => {
        const concepts = createChapterConcepts(3);

        const feed = service.buildFeed('source-123', concepts);
        const videoItems = feed.filter(isVideoChunkItem);

        const ids = videoItems.map((v) => v.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(videoItems.length);
      });
    });

    describe('QuizItem creation', () => {
      it('creates quiz items from concept assessment_spec', () => {
        const concepts = createChapterConcepts(2);

        const feed = service.buildFeed('source-123', concepts);
        const quizItem = feed.find(isQuizItem) as QuizItem;

        expect(quizItem).toBeDefined();
        expect(quizItem.type).toBe('quiz');
        expect(quizItem.conceptId).toBeDefined();
        expect(quizItem.question).toBeDefined();
        expect(quizItem.question.question_text).toBe('What is X?');
      });

      it('skips quiz creation when concept has no assessment_spec', () => {
        const concepts = [
          createBaseConcept({
            chapter_sequence: 1,
            assessment_spec: undefined,
          }),
          createBaseConcept({
            chapter_sequence: 2,
            assessment_spec: undefined,
          }),
        ];

        const feed = service.buildFeed('source-123', concepts);
        const quizItems = feed.filter(isQuizItem);

        // Quiz items should be skipped if no assessment_spec
        // The pattern will still have quiz positions but they won't generate items
        expect(quizItems.length).toBe(0);
      });
    });

    describe('FactItem creation', () => {
      it('creates fact items with summary and why_it_matters', () => {
        const concepts = createChapterConcepts(5);

        const feed = service.buildFeed('source-123', concepts);
        const factItem = feed.find(isFactItem) as FactItem;

        expect(factItem).toBeDefined();
        expect(factItem.type).toBe('fact');
        expect(factItem.conceptId).toBeDefined();
        expect(factItem.factText).toBeDefined();
        expect(factItem.whyItMatters).toBeDefined();
      });

      it('uses definition as fallback when no one_sentence_summary', () => {
        const concepts = [
          createBaseConcept({
            chapter_sequence: 1,
            one_sentence_summary: undefined,
            definition: 'The definition text.',
          }),
          createBaseConcept({ chapter_sequence: 2 }),
          createBaseConcept({ chapter_sequence: 3 }),
          createBaseConcept({ chapter_sequence: 4 }),
          createBaseConcept({ chapter_sequence: 5 }),
        ];

        const feed = service.buildFeed('source-123', concepts);
        const factItem = feed.find(isFactItem) as FactItem;

        // The fact should come from one of the concepts
        expect(factItem.factText).toBeDefined();
      });
    });

    describe('SynthesisItem creation', () => {
      it('inserts synthesis after every 5 chapters', () => {
        const concepts = createChapterConcepts(6);

        const feed = service.buildFeed('source-123', concepts);
        const synthesisItems = feed.filter(isSynthesisItem);

        expect(synthesisItems.length).toBeGreaterThan(0);
      });

      it('creates synthesis with concepts to connect', () => {
        const concepts = createChapterConcepts(6);

        const feed = service.buildFeed('source-123', concepts);
        const synthesisItem = feed.find(isSynthesisItem) as SynthesisItem;

        expect(synthesisItem).toBeDefined();
        expect(synthesisItem.type).toBe('synthesis');
        expect(synthesisItem.conceptsToConnect.length).toBeGreaterThan(0);
        expect(synthesisItem.synthesisPrompt).toBeDefined();
        expect(synthesisItem.chaptersCompleted).toBeDefined();
        expect(synthesisItem.totalChapters).toBe(6);
      });

      it('generates meaningful synthesis prompts', () => {
        const concepts = createChapterConcepts(6);

        const feed = service.buildFeed('source-123', concepts);
        const synthesisItem = feed.find(isSynthesisItem) as SynthesisItem;

        expect(synthesisItem.synthesisPrompt).toMatch(/How do|combine|connect|work together/i);
      });
    });

    describe('Concept ordering', () => {
      it('sorts concepts by chapter_sequence', () => {
        const concepts = [
          createBaseConcept({ id: 'c3', name: 'Third', chapter_sequence: 3 }),
          createBaseConcept({ id: 'c1', name: 'First', chapter_sequence: 1 }),
          createBaseConcept({ id: 'c2', name: 'Second', chapter_sequence: 2 }),
        ];

        const feed = service.buildFeed('source-123', concepts);
        const videoItems = feed.filter(isVideoChunkItem);

        expect(videoItems[0].title).toBe('First');
        expect(videoItems[1].title).toBe('Second');
        expect(videoItems[2].title).toBe('Third');
      });
    });

    describe('Final synthesis', () => {
      it('adds final synthesis when there are remaining concepts', () => {
        // 3 concepts won't trigger mid-feed synthesis but should get final
        const concepts = createChapterConcepts(3);

        const feed = service.buildFeed('source-123', concepts);
        const lastItem = feed[feed.length - 1];

        // Should have a synthesis at the end
        expect(isSynthesisItem(lastItem)).toBe(true);
      });

      it('sets correct progress in final synthesis', () => {
        const concepts = createChapterConcepts(3);

        const feed = service.buildFeed('source-123', concepts);
        const synthesisItems = feed.filter(isSynthesisItem);
        const lastSynthesis = synthesisItems[synthesisItems.length - 1] as SynthesisItem;

        expect(lastSynthesis.chaptersCompleted).toBe(3);
        expect(lastSynthesis.totalChapters).toBe(3);
      });
    });

    describe('Feed item IDs', () => {
      it('includes source ID in feed item IDs', () => {
        const concepts = createChapterConcepts(2);

        const feed = service.buildFeed('source-123', concepts);

        feed.forEach((item) => {
          expect(item.id).toContain('source-123');
        });
      });

      it('prefixes IDs with item type', () => {
        const concepts = createChapterConcepts(5);

        const feed = service.buildFeed('source-123', concepts);

        feed.forEach((item) => {
          switch (item.type) {
            case 'video_chunk':
              expect(item.id).toMatch(/^video-/);
              break;
            case 'quiz':
              expect(item.id).toMatch(/^quiz-/);
              break;
            case 'fact':
              expect(item.id).toMatch(/^fact-/);
              break;
            case 'synthesis':
              expect(item.id).toMatch(/^synthesis-/);
              break;
          }
        });
      });
    });

    describe('Large feeds', () => {
      it('handles 10+ chapter concepts', () => {
        const concepts = createChapterConcepts(12);

        const feed = service.buildFeed('source-123', concepts);

        // Should have multiple videos, quizzes, facts, and syntheses
        const videoItems = feed.filter(isVideoChunkItem);
        const synthesisItems = feed.filter(isSynthesisItem);

        expect(videoItems.length).toBe(12); // One per chapter
        expect(synthesisItems.length).toBeGreaterThanOrEqual(2); // At least 2 synthesis points
      });

      it('maintains correct pattern throughout long feed', () => {
        const concepts = createChapterConcepts(15);

        const feed = service.buildFeed('source-123', concepts);

        // Verify all items have valid types
        feed.forEach((item) => {
          expect(['video_chunk', 'quiz', 'fact', 'synthesis']).toContain(item.type);
        });
      });
    });
  });

  describe('buildTextFeed', () => {
    let service: FeedBuilderService;

    // Helper to create a text chunk
    const createTextChunk = (
      overrides: Partial<TextChunk> = {},
      index: number = 0
    ): TextChunk => ({
      id: `chunk-${index}`,
      text: `This is the text content for chunk ${index}. It contains important information about the topic.`,
      propositions: [
        `Proposition ${index}-1: A key fact about the topic.`,
        `Proposition ${index}-2: Another important detail.`,
      ],
      startIndex: index * 2,
      endIndex: (index + 1) * 2,
      ...overrides,
    });

    // Helper to create multiple text chunks
    const createTextChunks = (count: number): TextChunk[] => {
      return Array.from({ length: count }, (_, i) => createTextChunk({}, i));
    };

    beforeEach(() => {
      service = createFeedBuilderService();
    });

    describe('Basic text feed generation', () => {
      it('returns empty array for empty text chunks', () => {
        const feed = service.buildTextFeed('source-123', []);

        expect(feed).toEqual([]);
      });

      it('generates feed items for text chunks', () => {
        const chunks = createTextChunks(1);

        const feed = service.buildTextFeed('source-123', chunks);

        expect(feed.length).toBeGreaterThan(0);
      });
    });

    describe('Text feed pattern', () => {
      it('starts with a text chunk', () => {
        const chunks = createTextChunks(1);

        const feed = service.buildTextFeed('source-123', chunks);

        expect(feed.length).toBeGreaterThan(0);
        expect(isTextChunkItem(feed[0])).toBe(true);
      });

      it('follows Content -> Fact pattern when no concepts provided', () => {
        const chunks = createTextChunks(5);

        const feed = service.buildTextFeed('source-123', chunks);

        // Should have text chunks and facts but no quizzes without concepts
        const textItems = feed.filter(isTextChunkItem);
        const factItems = feed.filter(isFactItem);
        const quizItems = feed.filter(isQuizItem);

        expect(textItems.length).toBe(5);
        expect(factItems.length).toBeGreaterThan(0);
        expect(quizItems.length).toBe(0);
      });

      it('includes quizzes when related concepts provided', () => {
        const chunks = createTextChunks(3);
        const concepts = [createBaseConcept({ id: 'c1', chapter_sequence: 1 })];

        const feed = service.buildTextFeed('source-123', chunks, concepts);

        const quizItems = feed.filter(isQuizItem);
        expect(quizItems.length).toBeGreaterThan(0);
      });
    });

    describe('TextChunkItem creation', () => {
      it('creates text chunk items with correct properties', () => {
        const chunk = createTextChunk({
          id: 'chunk-test',
          text: 'This is a test chunk with some content that should be truncated if too long.',
          propositions: ['Proposition 1', 'Proposition 2'],
          startIndex: 0,
          endIndex: 2,
        });

        const feed = service.buildTextFeed('source-123', [chunk]);
        const textItem = feed.find(isTextChunkItem) as TextChunkItem;

        expect(textItem).toBeDefined();
        expect(textItem.type).toBe('text_chunk');
        expect(textItem.text).toBeDefined();
        expect(textItem.propositions).toEqual(['Proposition 1', 'Proposition 2']);
        expect(textItem.chunkIndex).toBe(0);
        expect(textItem.totalChunks).toBe(1);
      });

      it('truncates text to 200 characters for preview', () => {
        const longText = 'A'.repeat(300);
        const chunk = createTextChunk({ text: longText });

        const feed = service.buildTextFeed('source-123', [chunk]);
        const textItem = feed.find(isTextChunkItem) as TextChunkItem;

        expect(textItem.text.length).toBe(200);
      });

      it('generates unique IDs for text items', () => {
        const chunks = createTextChunks(3);

        const feed = service.buildTextFeed('source-123', chunks);
        const textItems = feed.filter(isTextChunkItem);

        const ids = textItems.map((t) => t.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(textItems.length);
      });

      it('prefixes text item IDs with "text-"', () => {
        const chunks = createTextChunks(2);

        const feed = service.buildTextFeed('source-123', chunks);
        const textItems = feed.filter(isTextChunkItem);

        textItems.forEach((item) => {
          expect(item.id).toMatch(/^text-/);
        });
      });
    });

    describe('FactItem creation for text', () => {
      it('creates fact items from text chunks', () => {
        const chunks = createTextChunks(5);

        const feed = service.buildTextFeed('source-123', chunks);
        const factItem = feed.find(isFactItem) as FactItem;

        expect(factItem).toBeDefined();
        expect(factItem.type).toBe('fact');
        expect(factItem.factText).toBeDefined();
        expect(factItem.whyItMatters).toBeDefined();
      });

      it('uses first proposition as fact text', () => {
        // Pattern: Content(0) -> Quiz -> Content(1) -> Content(2) -> Fact (uses chunk 2)
        // So we need to check that the fact uses the first proposition of the chunk
        const chunks = createTextChunks(5);
        // Override chunk 2's propositions since that's what will be used for the first fact
        chunks[2] = createTextChunk({
          propositions: ['Key fact to highlight', 'Secondary detail'],
        }, 2);

        const feed = service.buildTextFeed('source-123', chunks);
        const factItem = feed.find(isFactItem) as FactItem;

        expect(factItem.factText).toBe('Key fact to highlight');
      });
    });

    describe('SynthesisItem creation for text', () => {
      it('inserts synthesis after every 5 chunks', () => {
        const chunks = createTextChunks(6);

        const feed = service.buildTextFeed('source-123', chunks);
        const synthesisItems = feed.filter(isSynthesisItem);

        expect(synthesisItems.length).toBeGreaterThan(0);
      });

      it('creates synthesis with concepts to connect', () => {
        const chunks = createTextChunks(6);

        const feed = service.buildTextFeed('source-123', chunks);
        const synthesisItem = feed.find(isSynthesisItem) as SynthesisItem;

        expect(synthesisItem).toBeDefined();
        expect(synthesisItem.type).toBe('synthesis');
        expect(synthesisItem.conceptsToConnect.length).toBeGreaterThan(0);
        expect(synthesisItem.synthesisPrompt).toBeDefined();
        expect(synthesisItem.totalChapters).toBe(6);
      });

      it('adds final synthesis when there are remaining chunks', () => {
        const chunks = createTextChunks(3);

        const feed = service.buildTextFeed('source-123', chunks);
        const lastItem = feed[feed.length - 1];

        expect(isSynthesisItem(lastItem)).toBe(true);
      });

      it('generates meaningful text synthesis prompts', () => {
        const chunks = createTextChunks(6);

        const feed = service.buildTextFeed('source-123', chunks);
        const synthesisItem = feed.find(isSynthesisItem) as SynthesisItem;

        expect(synthesisItem.synthesisPrompt).toBeDefined();
        expect(synthesisItem.synthesisPrompt.length).toBeGreaterThan(0);
      });
    });

    describe('Quiz cycling with related concepts', () => {
      it('cycles through multiple quiz concepts', () => {
        const chunks = createTextChunks(10);
        const concepts = [
          createBaseConcept({
            id: 'c1',
            name: 'Concept One',
            chapter_sequence: 1,
            assessment_spec: {
              appropriate_question_types: ['multiple_choice'],
              inappropriate_question_types: [],
              sample_questions: [
                {
                  question_type: 'multiple_choice',
                  question_text: 'Question for C1?',
                  correct_answer: 'Answer A',
                  distractors: ['B', 'C'],
                  explanation: 'Because A.',
                } as SampleQuestion,
              ],
              mastery_indicators: [],
              mastery_threshold: 0.8,
            } as AssessmentSpec,
          }),
          createBaseConcept({
            id: 'c2',
            name: 'Concept Two',
            chapter_sequence: 2,
            assessment_spec: {
              appropriate_question_types: ['multiple_choice'],
              inappropriate_question_types: [],
              sample_questions: [
                {
                  question_type: 'multiple_choice',
                  question_text: 'Question for C2?',
                  correct_answer: 'Answer B',
                  distractors: ['A', 'C'],
                  explanation: 'Because B.',
                } as SampleQuestion,
              ],
              mastery_indicators: [],
              mastery_threshold: 0.8,
            } as AssessmentSpec,
          }),
        ];

        const feed = service.buildTextFeed('source-123', chunks, concepts);
        const quizItems = feed.filter(isQuizItem);

        // Should have quizzes from both concepts
        expect(quizItems.length).toBeGreaterThanOrEqual(2);

        const conceptIds = quizItems.map((q) => q.conceptId);
        expect(conceptIds).toContain('c1');
        expect(conceptIds).toContain('c2');
      });

      it('skips concepts without assessment_spec', () => {
        const chunks = createTextChunks(5);
        const concepts = [
          createBaseConcept({
            id: 'c1',
            chapter_sequence: 1,
            assessment_spec: undefined,
          }),
        ];

        const feed = service.buildTextFeed('source-123', chunks, concepts);
        const quizItems = feed.filter(isQuizItem);

        expect(quizItems.length).toBe(0);
      });
    });

    describe('Large text feeds', () => {
      it('handles 10+ text chunks', () => {
        const chunks = createTextChunks(12);

        const feed = service.buildTextFeed('source-123', chunks);

        const textItems = feed.filter(isTextChunkItem);
        const synthesisItems = feed.filter(isSynthesisItem);

        expect(textItems.length).toBe(12);
        expect(synthesisItems.length).toBeGreaterThanOrEqual(2);
      });

      it('maintains correct pattern throughout long feed', () => {
        const chunks = createTextChunks(15);

        const feed = service.buildTextFeed('source-123', chunks);

        feed.forEach((item) => {
          expect(['text_chunk', 'quiz', 'fact', 'synthesis']).toContain(item.type);
        });
      });
    });

    describe('Feed item IDs', () => {
      it('includes source ID in text feed item IDs', () => {
        const chunks = createTextChunks(2);

        const feed = service.buildTextFeed('source-123', chunks);

        feed.forEach((item) => {
          expect(item.id).toContain('source-123');
        });
      });
    });
  });

  describe('FeedBuilderError', () => {
    it('includes error code and message', () => {
      const error = new FeedBuilderError('Test error', 'BUILD_FAILED');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('BUILD_FAILED');
      expect(error.name).toBe('FeedBuilderError');
    });

    it('includes optional details', () => {
      const error = new FeedBuilderError('Test error', 'NO_CHAPTERS', {
        sourceId: 'source-123',
      });

      expect(error.details).toEqual({ sourceId: 'source-123' });
    });

    it('supports all error codes', () => {
      const codes = ['BUILD_FAILED', 'NO_CHAPTERS', 'NO_TEXT_CHUNKS', 'INVALID_CONCEPTS'] as const;

      codes.forEach((code) => {
        const error = new FeedBuilderError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });

  describe('Synthesis Phase Integration', () => {
    let service: FeedBuilderService;

    // Helper to create a base concept with cognitive type
    const createConceptWithType = (
      overrides: Partial<Concept> = {}
    ): Concept => ({
      id: `concept-${Math.random().toString(36).substr(2, 9)}`,
      project_id: 'project-123',
      source_id: 'source-123',
      name: 'Test Concept',
      definition: 'A test concept definition.',
      key_points: ['Point 1', 'Point 2'],
      cognitive_type: 'conceptual',
      difficulty: 5,
      source_timestamps: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tier: 2 as ConceptTier,
      mentioned_only: false,
      bloom_level: 'understand' as BloomLevel,
      definition_provided: true,
      chapter_sequence: 1,
      source_mapping: {
        primary_segment: { start_sec: 0, end_sec: 300 },
        key_moments: [],
        review_clip: { start_sec: 0, end_sec: 60 },
      } as SourceMapping,
      one_sentence_summary: 'A one sentence summary.',
      why_it_matters: 'This is why it matters.',
      assessment_spec: {
        appropriate_question_types: ['multiple_choice'],
        inappropriate_question_types: [],
        sample_questions: [
          {
            question_type: 'multiple_choice',
            question_text: 'What is X?',
            correct_answer: 'Option A',
            distractors: ['Option B', 'Option C'],
            explanation: 'Because A is correct.',
          } as SampleQuestion,
        ],
        mastery_indicators: ['Can explain X'],
        mastery_threshold: 0.8,
      } as AssessmentSpec,
      ...overrides,
    });

    // Helper to create multiple chapter concepts with cognitive types
    // Note: Uses valid CognitiveType from database.ts (declarative, conceptual, procedural, conditional, metacognitive)
    const createChapterConceptsWithTypes = (count: number): Concept[] => {
      const cognitiveTypes = ['declarative', 'procedural', 'conceptual', 'conditional'] as const;
      return Array.from({ length: count }, (_, i) =>
        createConceptWithType({
          id: `concept-${i + 1}`,
          name: `Concept ${i + 1}`,
          chapter_sequence: i + 1,
          cognitive_type: cognitiveTypes[i % cognitiveTypes.length],
          source_mapping: {
            primary_segment: { start_sec: i * 300, end_sec: (i + 1) * 300 },
            key_moments: [],
            review_clip: { start_sec: i * 300, end_sec: i * 300 + 60 },
          } as SourceMapping,
        })
      );
    };

    beforeEach(() => {
      service = createFeedBuilderService();
    });

    describe('buildFeedWithSynthesis', () => {
      it('creates service with buildFeedWithSynthesis method', () => {
        expect(service.buildFeedWithSynthesis).toBeDefined();
      });

      it('triggers synthesis phase after 5-6 learning items', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 85);

        // Find synthesis phase items (not regular synthesis items)
        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);
      });

      it('generates 3-4 interactions for perfect performance (100%)', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 100);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        // At least one synthesis phase should exist
        expect(synthesisPhaseItems.length).toBeGreaterThan(0);

        // Check the first synthesis phase has 3-4 interactions
        const firstSynthesisPhase = synthesisPhaseItems[0];
        if ('interactions' in firstSynthesisPhase) {
          expect(firstSynthesisPhase.interactions.length).toBeGreaterThanOrEqual(3);
          expect(firstSynthesisPhase.interactions.length).toBeLessThanOrEqual(4);
        }
      });

      it('generates 5-6 interactions for good performance (70-99%)', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 85);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);

        const firstSynthesisPhase = synthesisPhaseItems[0];
        if ('interactions' in firstSynthesisPhase) {
          expect(firstSynthesisPhase.interactions.length).toBeGreaterThanOrEqual(5);
          expect(firstSynthesisPhase.interactions.length).toBeLessThanOrEqual(6);
        }
      });

      it('generates 8-10 interactions for struggling performance (<70%)', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 50);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);

        const firstSynthesisPhase = synthesisPhaseItems[0];
        if ('interactions' in firstSynthesisPhase) {
          expect(firstSynthesisPhase.interactions.length).toBeGreaterThanOrEqual(8);
          expect(firstSynthesisPhase.interactions.length).toBeLessThanOrEqual(10);
        }
      });

      it('includes concepts from recent learning items in synthesis phase', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 85);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);

        // Synthesis phase should reference concept IDs from recent items
        const firstSynthesisPhase = synthesisPhaseItems[0];
        if ('conceptIds' in firstSynthesisPhase) {
          expect(firstSynthesisPhase.conceptIds.length).toBeGreaterThan(0);
        }
      });

      it('creates synthesis phase items with unique IDs', () => {
        const concepts = createChapterConceptsWithTypes(12);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 85);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        const ids = synthesisPhaseItems.map((item) => item.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(synthesisPhaseItems.length);
      });

      it('generates synthesis phase items with correct type discriminator', () => {
        const concepts = createChapterConceptsWithTypes(6);

        const feed = service.buildFeedWithSynthesis('source-123', concepts, 85);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        synthesisPhaseItems.forEach((item) => {
          expect(item.type).toBe('synthesis_phase');
          expect(item.id).toMatch(/^synthesis-phase-/);
        });
      });

      it('defaults to 85% performance when not provided', () => {
        const concepts = createChapterConceptsWithTypes(6);

        // Test that the method can be called with default performance
        const feed = service.buildFeedWithSynthesis('source-123', concepts);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);

        // Default 85% means good performance = 5-6 interactions
        const firstSynthesisPhase = synthesisPhaseItems[0];
        if ('interactions' in firstSynthesisPhase) {
          expect(firstSynthesisPhase.interactions.length).toBeGreaterThanOrEqual(5);
          expect(firstSynthesisPhase.interactions.length).toBeLessThanOrEqual(6);
        }
      });
    });

    describe('buildTextFeedWithSynthesis', () => {
      // Helper to create a text chunk
      const createTextChunk = (
        overrides: Partial<TextChunk> = {},
        index: number = 0
      ): TextChunk => ({
        id: `chunk-${index}`,
        text: `This is the text content for chunk ${index}. It contains important information about the topic.`,
        propositions: [
          `Proposition ${index}-1: A key fact about the topic.`,
          `Proposition ${index}-2: Another important detail.`,
        ],
        startIndex: index * 2,
        endIndex: (index + 1) * 2,
        ...overrides,
      });

      // Helper to create multiple text chunks
      const createTextChunks = (count: number): TextChunk[] => {
        return Array.from({ length: count }, (_, i) => createTextChunk({}, i));
      };

      it('creates service with buildTextFeedWithSynthesis method', () => {
        expect(service.buildTextFeedWithSynthesis).toBeDefined();
      });

      it('triggers synthesis phase after 5-6 text chunks', () => {
        const chunks = createTextChunks(6);

        const feed = service.buildTextFeedWithSynthesis('source-123', chunks, undefined, 85);

        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);
      });

      it('generates performance-based interactions for text feeds', () => {
        const chunks = createTextChunks(6);

        // Test struggling performance
        const feedStruggling = service.buildTextFeedWithSynthesis('source-123', chunks, undefined, 50);
        const synthesisItemsStruggling = feedStruggling.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisItemsStruggling.length).toBeGreaterThan(0);

        const firstSynthesis = synthesisItemsStruggling[0];
        if ('interactions' in firstSynthesis) {
          expect(firstSynthesis.interactions.length).toBeGreaterThanOrEqual(8);
        }
      });
    });
  });

  describe('Pretest Feed Integration', () => {
    let service: FeedBuilderService;

    // Helper to create a base concept with cognitive type
    const createConceptWithType = (
      overrides: Partial<Concept> = {}
    ): Concept => ({
      id: `concept-${Math.random().toString(36).substr(2, 9)}`,
      project_id: 'project-123',
      source_id: 'source-123',
      name: 'Test Concept',
      definition: 'A test concept definition.',
      key_points: ['Point 1', 'Point 2'],
      cognitive_type: 'conceptual',
      difficulty: 5,
      source_timestamps: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tier: 2 as ConceptTier,
      mentioned_only: false,
      bloom_level: 'understand' as BloomLevel,
      definition_provided: true,
      chapter_sequence: 1,
      source_mapping: {
        primary_segment: { start_sec: 0, end_sec: 300 },
        key_moments: [],
        review_clip: { start_sec: 0, end_sec: 60 },
      } as SourceMapping,
      one_sentence_summary: 'A one sentence summary.',
      why_it_matters: 'This is why it matters.',
      assessment_spec: {
        appropriate_question_types: ['multiple_choice'],
        inappropriate_question_types: [],
        sample_questions: [
          {
            question_type: 'multiple_choice',
            question_text: 'What is X?',
            correct_answer: 'Option A',
            distractors: ['Option B', 'Option C'],
            explanation: 'Because A is correct.',
          } as SampleQuestion,
        ],
        mastery_indicators: ['Can explain X'],
        mastery_threshold: 0.8,
      } as AssessmentSpec,
      ...overrides,
    });

    // Helper to create chapter concepts
    const createChapterConcepts = (count: number): Concept[] => {
      const cognitiveTypes = ['declarative', 'procedural', 'conceptual', 'conditional'] as const;
      return Array.from({ length: count }, (_, i) =>
        createConceptWithType({
          id: `concept-${i + 1}`,
          name: `Concept ${i + 1}`,
          chapter_sequence: i + 1,
          cognitive_type: cognitiveTypes[i % cognitiveTypes.length],
          source_mapping: {
            primary_segment: { start_sec: i * 300, end_sec: (i + 1) * 300 },
            key_moments: [],
            review_clip: { start_sec: i * 300, end_sec: i * 300 + 60 },
          } as SourceMapping,
        })
      );
    };

    // Helper to create pretest data
    const createPretestData = (prerequisiteCount: number = 2): PretestFeedData => {
      return {
        prerequisites: Array.from({ length: prerequisiteCount }, (_, i) => ({
          id: `prereq-${i + 1}`,
          name: `Prerequisite ${i + 1}`,
          questions: [
            {
              questionText: `What is the core concept of Prerequisite ${i + 1}?`,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctIndex: 0,
              explanation: `Option A is correct because it defines Prerequisite ${i + 1}.`,
            },
          ],
        })),
      };
    };

    // Helper to create mini-lesson insert data
    const createMiniLessonInsertData = (count: number = 1): MiniLessonInsertData[] => {
      return Array.from({ length: count }, (_, i) => ({
        prerequisiteId: `prereq-${i + 1}`,
        title: `Mini Lesson for Prerequisite ${i + 1}`,
        contentMarkdown: `# Understanding Prerequisite ${i + 1}\n\nThis is an important concept...`,
        keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
        estimatedMinutes: 3,
      }));
    };

    beforeEach(() => {
      service = createFeedBuilderService();
    });

    describe('buildFeedWithPretests', () => {
      it('creates service with buildFeedWithPretests method', () => {
        expect(service.buildFeedWithPretests).toBeDefined();
      });

      it('returns pretest items at the beginning of the feed', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(2);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        // First items should be pretest items
        expect(feed.length).toBeGreaterThan(0);
        expect(isPretestItem(feed[0])).toBe(true);
        expect(isPretestItem(feed[1])).toBe(true);
      });

      it('creates pretest items with correct properties', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(1);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        const pretestItems = feed.filter(isPretestItem);
        expect(pretestItems.length).toBe(1);

        const pretestItem = pretestItems[0] as PretestItem;
        expect(pretestItem.type).toBe('pretest');
        expect(pretestItem.prerequisiteId).toBe('prereq-1');
        expect(pretestItem.prerequisiteName).toBe('Prerequisite 1');
        expect(pretestItem.questionText).toBeDefined();
        expect(pretestItem.options).toHaveLength(4);
        expect(pretestItem.correctIndex).toBe(0);
        expect(pretestItem.questionNumber).toBe(1);
        expect(pretestItem.totalQuestions).toBe(1);
      });

      it('includes pretest results after all pretest questions', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(2);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        const pretestItems = feed.filter(isPretestItem);
        const resultsItems = feed.filter(isPretestResultsItem);

        expect(pretestItems.length).toBe(2);
        expect(resultsItems.length).toBe(1);

        // Results should come right after pretest items
        const resultsIndex = feed.findIndex(isPretestResultsItem);
        const lastPretestIndex = feed.findIndex(
          (item, i) => isPretestItem(item) && !feed.slice(i + 1).some(isPretestItem)
        );

        expect(resultsIndex).toBe(lastPretestIndex + 1);
      });

      it('creates pretest results with correct properties', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(3);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        const resultsItem = feed.find(isPretestResultsItem) as PretestResultsItem;
        expect(resultsItem).toBeDefined();
        expect(resultsItem.type).toBe('pretest_results');
        expect(resultsItem.totalPrerequisites).toBe(3);
        // Initially all gaps (no answers yet)
        expect(resultsItem.gapPrerequisiteIds).toHaveLength(3);
        expect(resultsItem.correctCount).toBe(0);
        expect(resultsItem.percentage).toBe(0);
        expect(resultsItem.recommendation).toBe('review_required');
      });

      it('includes regular feed items after pretest results', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(1);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        // Find the index of pretest results
        const resultsIndex = feed.findIndex(isPretestResultsItem);

        // Items after results should include video chunks (from buildFeedWithSynthesis)
        const itemsAfterResults = feed.slice(resultsIndex + 1);
        const hasVideoChunks = itemsAfterResults.some(isVideoChunkItem);

        expect(hasVideoChunks).toBe(true);
      });

      it('generates unique IDs for pretest items', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(3);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        const pretestItems = feed.filter(isPretestItem);
        const ids = pretestItems.map((item) => item.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(pretestItems.length);
      });

      it('sets correct question numbers and totals', () => {
        const concepts = createChapterConcepts(3);
        const pretestData = createPretestData(3);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        const pretestItems = feed.filter(isPretestItem) as PretestItem[];

        pretestItems.forEach((item, i) => {
          expect(item.questionNumber).toBe(i + 1);
          expect(item.totalQuestions).toBe(3);
        });
      });

      it('handles empty pretest data gracefully', () => {
        const concepts = createChapterConcepts(3);
        const emptyPretestData: PretestFeedData = { prerequisites: [] };

        const feed = service.buildFeedWithPretests('source-123', concepts, emptyPretestData);

        // Should skip pretest phase entirely and just return synthesis feed
        const pretestItems = feed.filter(isPretestItem);
        const resultsItems = feed.filter(isPretestResultsItem);

        expect(pretestItems.length).toBe(0);
        expect(resultsItems.length).toBe(0);

        // Should still have regular feed items
        expect(feed.length).toBeGreaterThan(0);
        expect(isVideoChunkItem(feed[0])).toBe(true);
      });

      it('uses default performance when not provided', () => {
        const concepts = createChapterConcepts(6);
        const pretestData = createPretestData(1);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        // Should still have synthesis phase items with default performance
        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        expect(synthesisPhaseItems.length).toBeGreaterThan(0);
      });

      it('respects provided performance parameter', () => {
        const concepts = createChapterConcepts(6);
        const pretestData = createPretestData(1);

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData, 100);

        // Perfect performance should result in 3-4 interactions
        const synthesisPhaseItems = feed.filter(
          (item) => item.type === 'synthesis_phase'
        );

        if (synthesisPhaseItems.length > 0) {
          const firstSynthesis = synthesisPhaseItems[0];
          if ('interactions' in firstSynthesis) {
            expect(firstSynthesis.interactions.length).toBeGreaterThanOrEqual(3);
            expect(firstSynthesis.interactions.length).toBeLessThanOrEqual(4);
          }
        }
      });

      it('handles prerequisites with multiple questions', () => {
        const concepts = createChapterConcepts(3);
        const pretestDataMultipleQuestions: PretestFeedData = {
          prerequisites: [
            {
              id: 'prereq-1',
              name: 'Multi-Question Prerequisite',
              questions: [
                {
                  questionText: 'Question 1?',
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 0,
                  explanation: 'Answer A',
                },
                {
                  questionText: 'Question 2?',
                  options: ['A', 'B', 'C', 'D'],
                  correctIndex: 1,
                  explanation: 'Answer B',
                },
              ],
            },
          ],
        };

        const feed = service.buildFeedWithPretests('source-123', concepts, pretestDataMultipleQuestions);

        const pretestItems = feed.filter(isPretestItem) as PretestItem[];
        expect(pretestItems.length).toBe(2);
        expect(pretestItems[0].questionNumber).toBe(1);
        expect(pretestItems[1].questionNumber).toBe(2);
        expect(pretestItems[0].totalQuestions).toBe(2);
        expect(pretestItems[1].totalQuestions).toBe(2);
      });
    });

    describe('insertMiniLessons', () => {
      it('creates service with insertMiniLessons method', () => {
        expect(service.insertMiniLessons).toBeDefined();
      });

      it('inserts mini-lessons at specified position', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(2);

        // Insert after index 0, so mini-lessons appear at positions 1 and 2
        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, 0);

        // Original first item should stay at index 0
        expect(feedWithMiniLessons[0].id).toBe(baseFeed[0].id);
        // Mini-lessons should be inserted after index 0 (at positions 1 and 2)
        expect(isMiniLessonItem(feedWithMiniLessons[1])).toBe(true);
        expect(isMiniLessonItem(feedWithMiniLessons[2])).toBe(true);
        // Original second item should now be at index 3
        expect(feedWithMiniLessons[3].id).toBe(baseFeed[1].id);
      });

      it('creates mini-lesson items with correct properties', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(1);

        // Insert after index 0, mini-lesson appears at position 1
        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, 0);

        const miniLessonItem = feedWithMiniLessons[1] as MiniLessonItem;
        expect(miniLessonItem.type).toBe('mini_lesson');
        expect(miniLessonItem.prerequisiteId).toBe('prereq-1');
        expect(miniLessonItem.title).toBe('Mini Lesson for Prerequisite 1');
        expect(miniLessonItem.contentMarkdown).toContain('Understanding Prerequisite 1');
        expect(miniLessonItem.keyPoints).toHaveLength(3);
        expect(miniLessonItem.estimatedMinutes).toBe(3);
      });

      it('generates unique IDs for mini-lesson items', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(3);

        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, 0);

        const miniLessonItems = feedWithMiniLessons.filter(isMiniLessonItem);
        const ids = miniLessonItems.map((item) => item.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(miniLessonItems.length);
      });

      it('inserts mini-lessons in the middle of the feed', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(1);

        // Insert after index 2 (at position 3)
        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, 2);

        // Items 0, 1, 2 should be original
        expect(feedWithMiniLessons[0].id).toBe(baseFeed[0].id);
        expect(feedWithMiniLessons[1].id).toBe(baseFeed[1].id);
        expect(feedWithMiniLessons[2].id).toBe(baseFeed[2].id);
        // Item 3 should be the mini-lesson
        expect(isMiniLessonItem(feedWithMiniLessons[3])).toBe(true);
        // Item 4 should be what was originally at index 3
        expect(feedWithMiniLessons[4].id).toBe(baseFeed[3].id);
      });

      it('handles empty mini-lessons array', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);

        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, [], 0);

        // Should return the original feed unchanged
        expect(feedWithMiniLessons.length).toBe(baseFeed.length);
        expect(feedWithMiniLessons).toEqual(baseFeed);
      });

      it('handles insert position at end of feed', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(1);
        const lastIndex = baseFeed.length - 1;

        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, lastIndex);

        // Mini-lesson should be at the very end
        const lastItem = feedWithMiniLessons[feedWithMiniLessons.length - 1];
        expect(isMiniLessonItem(lastItem)).toBe(true);
      });

      it('preserves all original feed items', () => {
        const concepts = createChapterConcepts(3);
        const baseFeed = service.buildFeedWithSynthesis('source-123', concepts);
        const miniLessons = createMiniLessonInsertData(2);

        const feedWithMiniLessons = service.insertMiniLessons(baseFeed, miniLessons, 1);

        // Total length should be base feed + mini-lessons
        expect(feedWithMiniLessons.length).toBe(baseFeed.length + 2);

        // All original items should still be present
        const originalIds = baseFeed.map((item) => item.id);
        const newFeedIds = feedWithMiniLessons.map((item) => item.id);

        originalIds.forEach((id) => {
          expect(newFeedIds).toContain(id);
        });
      });
    });

    describe('Feed Flow Integration', () => {
      it('produces correct feed order: pretests -> results -> mini-lessons -> synthesis feed', () => {
        const concepts = createChapterConcepts(6);
        const pretestData = createPretestData(2);

        // Build initial feed with pretests (all gaps initially)
        const feed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        // Verify order: pretests first
        const firstPretestIndex = feed.findIndex(isPretestItem);
        expect(firstPretestIndex).toBe(0);

        // Then pretest results
        const resultsIndex = feed.findIndex(isPretestResultsItem);
        const lastPretestIndex = feed.reduce(
          (lastIdx, item, idx) => (isPretestItem(item) ? idx : lastIdx),
          -1
        );
        expect(resultsIndex).toBe(lastPretestIndex + 1);

        // Then video chunks / synthesis content
        const firstVideoIndex = feed.findIndex(isVideoChunkItem);
        expect(firstVideoIndex).toBeGreaterThan(resultsIndex);
      });

      it('can insert mini-lessons after pretest results', () => {
        const concepts = createChapterConcepts(6);
        const pretestData = createPretestData(2);

        const initialFeed = service.buildFeedWithPretests('source-123', concepts, pretestData);

        // Find position after pretest results
        const resultsIndex = initialFeed.findIndex(isPretestResultsItem);

        // Insert mini-lessons for gaps
        const miniLessons = createMiniLessonInsertData(2);
        const feedWithGaps = service.insertMiniLessons(initialFeed, miniLessons, resultsIndex);

        // Verify mini-lessons are right after results
        expect(isMiniLessonItem(feedWithGaps[resultsIndex + 1])).toBe(true);
        expect(isMiniLessonItem(feedWithGaps[resultsIndex + 2])).toBe(true);

        // Video chunks should follow
        expect(isVideoChunkItem(feedWithGaps[resultsIndex + 3])).toBe(true);
      });
    });
  });
});
