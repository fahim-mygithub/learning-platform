/**
 * Feed Builder Service Tests
 *
 * Tests for feed building including:
 * - Feed pattern: Video -> Quiz -> Video -> Video -> Fact -> SYNTHESIS
 * - Interleaving logic
 * - Synthesis insertion every 5-6 chapters
 * - Feed item creation from concepts
 */

import { Concept } from '@/src/types/database';
import { SourceMapping, ConceptTier, BloomLevel, AssessmentSpec, SampleQuestion } from '@/src/types/three-pass';
import {
  FeedItem,
  VideoChunkItem,
  QuizItem,
  FactItem,
  SynthesisItem,
  isVideoChunkItem,
  isQuizItem,
  isFactItem,
  isSynthesisItem,
} from '@/src/types/engagement';

import {
  createFeedBuilderService,
  FeedBuilderService,
  FeedBuilderError,
} from '../feed-builder-service';

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
      const codes = ['BUILD_FAILED', 'NO_CHAPTERS', 'INVALID_CONCEPTS'] as const;

      codes.forEach((code) => {
        const error = new FeedBuilderError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });
});
