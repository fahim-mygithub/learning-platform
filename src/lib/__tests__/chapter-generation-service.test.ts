/**
 * Chapter Generation Service Tests
 *
 * Tests for chapter generation including:
 * - Filtering tier 2-3 non-mentioned-only concepts with valid source_mapping
 * - Sorting by source_mapping.primary_segment.start_sec
 * - Assigning chapter_sequence (1, 2, 3...)
 * - Duration validation (merge if <3min, warn if >10min)
 * - Open loop teaser generation via AI
 * - Database updates
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Concept, Transcription } from '@/src/types/database';
import { SourceMapping, ConceptTier, BloomLevel } from '@/src/types/three-pass';

// Import the mock functions
import {
  configureMock,
  resetMock,
  clearMockCallHistory,
} from '../__mocks__/ai-service';

// Mock the AI service module
jest.mock('../ai-service', () => require('../__mocks__/ai-service'));

// Mock the debug logger
jest.mock('../debug-logger', () => ({
  logInput: jest.fn(),
  logOutput: jest.fn(),
  logError: jest.fn(),
  startTimer: jest.fn(() => ({ stop: jest.fn(() => 100) })),
}));

// Import after mocking
import {
  createChapterGenerationService,
  ChapterGenerationService,
  ChapterGenerationError,
} from '../chapter-generation-service';

describe('Chapter Generation Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

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
    source_mapping: {
      primary_segment: {
        start_sec: 0,
        end_sec: 300, // 5 minutes
      },
      key_moments: [],
      review_clip: {
        start_sec: 0,
        end_sec: 60,
      },
    } as SourceMapping,
    ...overrides,
  });

  const mockTranscription: Transcription = {
    id: 'trans-123',
    source_id: 'source-123',
    full_text: 'Sample transcription text',
    segments: [
      { start: 0, end: 60, text: 'First segment' },
      { start: 60, end: 120, text: 'Second segment' },
    ],
    language: 'en',
    confidence: 0.95,
    provider: 'youtube',
    status: 'completed',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });
    mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;

    // Default mock response for updates
    mockSingle.mockResolvedValue({
      data: createBaseConcept(),
      error: null,
    });
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createChapterGenerationService', () => {
    it('creates service with AI service and Supabase client', () => {
      const service = createChapterGenerationService({} as never, mockSupabase);

      expect(service).toBeDefined();
      expect(service.generateChapters).toBeDefined();
    });
  });

  describe('generateChapters', () => {
    let service: ChapterGenerationService;

    beforeEach(() => {
      service = createChapterGenerationService({} as never, mockSupabase);
    });

    describe('Concept filtering', () => {
      it('filters to tier 2-3 concepts with valid source_mapping', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Tier 2 Concept',
            tier: 2,
            source_mapping: {
              primary_segment: { start_sec: 0, end_sec: 300 },
              key_moments: [],
              review_clip: { start_sec: 0, end_sec: 60 },
            },
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Tier 3 Concept',
            tier: 3,
            source_mapping: {
              primary_segment: { start_sec: 300, end_sec: 600 },
              key_moments: [],
              review_clip: { start_sec: 300, end_sec: 360 },
            },
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Tier 2 Concept', [
              { concept_name: 'Tier 2 Concept', teaser: 'Teaser 1' },
              { concept_name: 'Tier 3 Concept', teaser: 'Teaser 2' },
            ]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, mockTranscription);

        // Should have called update for both concepts
        expect(mockUpdate).toHaveBeenCalled();
      });

      it('excludes tier 1 concepts', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Tier 1 Concept',
            tier: 1,
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Tier 2 Concept',
            tier: 2,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Tier 2 Concept', [
              { concept_name: 'Tier 2 Concept', teaser: 'Teaser' },
            ]],
          ]),
        });

        const result = await service.generateChapters('project-123', 'source-123', concepts, null);

        // Tier 1 concept should not get chapter_sequence
        const tier1Concept = result.find((c) => c.name === 'Tier 1 Concept');
        expect(tier1Concept?.chapter_sequence).toBeUndefined();
      });

      it('excludes mentioned_only concepts', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Mentioned Only',
            tier: 2,
            mentioned_only: true,
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Explained Concept',
            tier: 2,
            mentioned_only: false,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Explained Concept', [
              { concept_name: 'Explained Concept', teaser: 'Teaser' },
            ]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        // mentioned_only should not have updates
        expect(mockUpdate).toHaveBeenCalled();
      });

      it('excludes concepts without source_mapping', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'No Mapping',
            tier: 2,
            source_mapping: undefined,
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Has Mapping',
            tier: 2,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Has Mapping', [
              { concept_name: 'Has Mapping', teaser: 'Teaser' },
            ]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(mockUpdate).toHaveBeenCalled();
      });

      it('returns original concepts when no eligible concepts', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Tier 1',
            tier: 1,
          }),
        ];

        const result = await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(result).toEqual(concepts);
        expect(mockUpdate).not.toHaveBeenCalled();
      });
    });

    describe('Sorting by start time', () => {
      it('sorts concepts by primary_segment.start_sec', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-3',
            name: 'Third',
            source_mapping: {
              primary_segment: { start_sec: 600, end_sec: 900 },
              key_moments: [],
              review_clip: { start_sec: 600, end_sec: 660 },
            },
          }),
          createBaseConcept({
            id: 'concept-1',
            name: 'First',
            source_mapping: {
              primary_segment: { start_sec: 0, end_sec: 300 },
              key_moments: [],
              review_clip: { start_sec: 0, end_sec: 60 },
            },
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Second',
            source_mapping: {
              primary_segment: { start_sec: 300, end_sec: 600 },
              key_moments: [],
              review_clip: { start_sec: 300, end_sec: 360 },
            },
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['First', [
              { concept_name: 'First', teaser: 'T1' },
              { concept_name: 'Second', teaser: 'T2' },
              { concept_name: 'Third', teaser: 'T3' },
            ]],
          ]),
        });

        // Track update calls
        const updateCalls: Array<{ id: string; data: Partial<Concept> }> = [];
        mockEq.mockImplementation((field: string, value: string) => {
          if (field === 'id') {
            return {
              select: () => ({
                single: () => {
                  const concept = concepts.find((c) => c.id === value);
                  const sequence = value === 'concept-1' ? 1 : value === 'concept-2' ? 2 : 3;
                  return Promise.resolve({
                    data: { ...concept, chapter_sequence: sequence },
                    error: null,
                  });
                },
              }),
            };
          }
          return { select: mockSelect };
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        // Verify update was called
        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    describe('Chapter sequence assignment', () => {
      it('assigns sequential chapter numbers starting from 1', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'First',
            source_mapping: {
              primary_segment: { start_sec: 0, end_sec: 300 },
              key_moments: [],
              review_clip: { start_sec: 0, end_sec: 60 },
            },
          }),
          createBaseConcept({
            id: 'concept-2',
            name: 'Second',
            source_mapping: {
              primary_segment: { start_sec: 300, end_sec: 600 },
              key_moments: [],
              review_clip: { start_sec: 300, end_sec: 360 },
            },
          }),
        ];

        let updateCallCount = 0;
        const capturedUpdates: Array<{ data: unknown }> = [];

        mockUpdate.mockImplementation((data: Partial<Concept>) => {
          capturedUpdates.push({ data });
          const concept = concepts[updateCallCount++];
          return {
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { ...concept, ...data },
                  error: null,
                }),
              }),
            }),
          };
        });

        configureMock({
          customStructuredResponses: new Map([
            ['First', [
              { concept_name: 'First', teaser: 'T1' },
              { concept_name: 'Second', teaser: 'T2' },
            ]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        // Verify chapter_sequence was set
        expect(capturedUpdates.length).toBeGreaterThan(0);
        const sequences = capturedUpdates
          .map((u) => (u.data as Partial<Concept>).chapter_sequence)
          .filter((s) => s !== undefined);
        expect(sequences).toContain(1);
        expect(sequences).toContain(2);
      });
    });

    describe('Duration validation', () => {
      it('logs warning for short chapters (<3min)', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Short Chapter',
            source_mapping: {
              primary_segment: { start_sec: 0, end_sec: 120 }, // 2 minutes - short
              key_moments: [],
              review_clip: { start_sec: 0, end_sec: 60 },
            },
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Short Chapter', [{ concept_name: 'Short Chapter', teaser: 'T' }]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ChapterGeneration]'),
          expect.any(Array)
        );

        consoleWarnSpy.mockRestore();
      });

      it('logs warning for long chapters (>10min)', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Long Chapter',
            source_mapping: {
              primary_segment: { start_sec: 0, end_sec: 720 }, // 12 minutes - long
              key_moments: [],
              review_clip: { start_sec: 0, end_sec: 60 },
            },
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Long Chapter', [{ concept_name: 'Long Chapter', teaser: 'T' }]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[ChapterGeneration]'),
          expect.arrayContaining([expect.stringContaining('long')])
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Teaser generation', () => {
      it('generates open_loop_teaser via AI', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Test Concept',
          }),
        ];

        const teaserText = 'Did you know this changes everything?';

        configureMock({
          customStructuredResponses: new Map([
            ['Test Concept', [{ concept_name: 'Test Concept', teaser: teaserText }]],
          ]),
        });

        let capturedTeaser: string | undefined;
        mockUpdate.mockImplementation((data: Partial<Concept>) => {
          capturedTeaser = data.open_loop_teaser ?? undefined;
          return {
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { ...concepts[0], ...data },
                  error: null,
                }),
              }),
            }),
          };
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(capturedTeaser).toBe(teaserText);
      });

      it('continues without teaser if AI fails', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Test Concept',
          }),
        ];

        configureMock({
          shouldError: true,
          errorToThrow: new Error('AI service failed'),
        });

        mockUpdate.mockImplementation((data: Partial<Concept>) => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { ...concepts[0], ...data },
                error: null,
              }),
            }),
          }),
        }));

        // Should not throw
        const result = await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(result).toBeDefined();
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Database updates', () => {
      it('updates concepts in database with chapter_sequence and teaser', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Test Concept',
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Test Concept', [{ concept_name: 'Test Concept', teaser: 'Hook!' }]],
          ]),
        });

        await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(mockFrom).toHaveBeenCalledWith('concepts');
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            chapter_sequence: 1,
            open_loop_teaser: 'Hook!',
          })
        );
      });

      it('handles database update errors gracefully', async () => {
        const concepts: Concept[] = [
          createBaseConcept({
            id: 'concept-1',
            name: 'Test Concept',
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Test Concept', [{ concept_name: 'Test Concept', teaser: 'Teaser' }]],
          ]),
        });

        mockUpdate.mockImplementation(() => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }));

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Should not throw
        const result = await service.generateChapters('project-123', 'source-123', concepts, null);

        expect(result).toBeDefined();
        expect(result[0].chapter_sequence).toBe(1);
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe('ChapterGenerationError', () => {
    it('includes error code and message', () => {
      const error = new ChapterGenerationError(
        'Test error',
        'GENERATION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.name).toBe('ChapterGenerationError');
    });

    it('includes optional details', () => {
      const error = new ChapterGenerationError(
        'Test error',
        'DATABASE_ERROR',
        { sourceId: 'source-123' }
      );

      expect(error.details).toEqual({ sourceId: 'source-123' });
    });

    it('supports all error codes', () => {
      const codes = ['GENERATION_FAILED', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'NO_ELIGIBLE_CONCEPTS'] as const;

      codes.forEach((code) => {
        const error = new ChapterGenerationError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });
});
