/**
 * Concept Extraction Service Tests
 *
 * Tests for Claude API-based concept extraction including:
 * - Extracting concepts from transcriptions with timestamps
 * - Extracting concepts from plain text
 * - Validation of cognitive types and difficulty scores
 * - Database storage operations
 * - Error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  CognitiveType,
  Transcription,
} from '@/src/types/database';
import { AIError } from '@/src/types/ai';

// Import the mock functions - Jest will use __mocks__/ai-service.ts automatically
import {
  configureMock,
  resetMock,
  getMockCallHistory,
  clearMockCallHistory,
} from '../__mocks__/ai-service';

// Mock the AI service module
jest.mock('../ai-service', () => require('../__mocks__/ai-service'));

// Import after mocking
import {
  createConceptExtractionService,
  ConceptExtractionService,
  ConceptExtractionError,
  ExtractedConcept,
  validateExtractedConcept,
  COGNITIVE_TYPES,
} from '../concept-extraction';

describe('Concept Extraction Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockEq: jest.Mock;

  // Sample test data
  const sampleTranscription: Transcription = {
    id: 'trans-123',
    source_id: 'source-456',
    full_text:
      'Machine learning is a subset of artificial intelligence. It uses algorithms to learn from data. Neural networks are a common approach.',
    segments: [
      { start: 0, end: 5, text: 'Machine learning is a subset of artificial intelligence.' },
      { start: 5, end: 10, text: 'It uses algorithms to learn from data.' },
      { start: 10, end: 15, text: 'Neural networks are a common approach.' },
    ],
    language: 'en',
    confidence: 0.95,
    provider: 'openai-whisper',
    status: 'completed',
    error_message: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const sampleExtractedConcepts: ExtractedConcept[] = [
    {
      name: 'Machine Learning',
      definition:
        'A subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
      key_points: [
        'Uses algorithms to learn from data',
        'Part of artificial intelligence field',
        'Improves through experience',
      ],
      cognitive_type: 'conceptual',
      difficulty: 6,
      source_timestamps: [{ start: 0, end: 10 }],
    },
    {
      name: 'Neural Networks',
      definition:
        'Computing systems inspired by biological neural networks that form the basis of many machine learning approaches.',
      key_points: [
        'Inspired by biological neurons',
        'Common machine learning approach',
        'Process information in layers',
      ],
      cognitive_type: 'conceptual',
      difficulty: 7,
      source_timestamps: [{ start: 10, end: 15 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createConceptExtractionService', () => {
    it('creates service with valid configuration', () => {
      const service = createConceptExtractionService(mockSupabase);

      expect(service).toBeDefined();
      expect(service.extractFromTranscription).toBeDefined();
      expect(service.extractFromText).toBeDefined();
      expect(service.getProjectConcepts).toBeDefined();
    });

    it('throws error when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createConceptExtractionService(mockSupabase)).toThrow(
        ConceptExtractionError
      );
      expect(() => createConceptExtractionService(mockSupabase)).toThrow(
        'API key'
      );
    });
  });

  describe('extractFromTranscription', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it('extracts concepts from transcription with timestamps', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';

      // Configure mock to return sample concepts
      configureMock({
        customStructuredResponses: new Map([
          [sampleTranscription.full_text, sampleExtractedConcepts],
        ]),
      });

      // Mock database insert for concepts
      const insertedConcepts: Concept[] = sampleExtractedConcepts.map(
        (c, i) => ({
          id: `concept-${i}`,
          project_id: projectId,
          source_id: sourceId,
          name: c.name,
          definition: c.definition,
          key_points: c.key_points,
          cognitive_type: c.cognitive_type,
          difficulty: c.difficulty,
          source_timestamps: c.source_timestamps || [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })
      );

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.extractFromTranscription(
        projectId,
        sourceId,
        sampleTranscription
      );

      expect(concepts).toHaveLength(2);
      expect(concepts[0].name).toBe('Machine Learning');
      expect(concepts[1].name).toBe('Neural Networks');
    });

    it('maps timestamps from transcription segments to concepts', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';

      configureMock({
        customStructuredResponses: new Map([
          [sampleTranscription.full_text, sampleExtractedConcepts],
        ]),
      });

      const insertedConcepts: Concept[] = sampleExtractedConcepts.map(
        (c, i) => ({
          id: `concept-${i}`,
          project_id: projectId,
          source_id: sourceId,
          name: c.name,
          definition: c.definition,
          key_points: c.key_points,
          cognitive_type: c.cognitive_type,
          difficulty: c.difficulty,
          source_timestamps: c.source_timestamps || [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })
      );

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.extractFromTranscription(
        projectId,
        sourceId,
        sampleTranscription
      );

      // Check that timestamps are present
      expect(concepts[0].source_timestamps).toBeDefined();
      expect(concepts[0].source_timestamps).toHaveLength(1);
      expect(concepts[0].source_timestamps[0]).toEqual({ start: 0, end: 10 });
    });

    it('sends correct prompt to AI service', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';

      configureMock({
        customStructuredResponses: new Map([
          [sampleTranscription.full_text, sampleExtractedConcepts],
        ]),
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      await service.extractFromTranscription(
        projectId,
        sourceId,
        sampleTranscription
      );

      const callHistory = getMockCallHistory();
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].message.systemPrompt).toContain('concept');
      expect(callHistory[0].message.userMessage).toContain(
        sampleTranscription.full_text
      );
    });

    it('stores concepts in database with correct fields', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      let insertedData: unknown[] = [];

      configureMock({
        customStructuredResponses: new Map([
          [sampleTranscription.full_text, sampleExtractedConcepts],
        ]),
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: Record<string, unknown>[]) => {
          insertedData = data;
          return {
            select: jest.fn().mockResolvedValue({
              data: data.map((d, i) => ({
                id: `concept-${i}`,
                ...d,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              })),
              error: null,
            }),
          };
        }),
      });

      await service.extractFromTranscription(
        projectId,
        sourceId,
        sampleTranscription
      );

      expect(mockFrom).toHaveBeenCalledWith('concepts');
      expect(insertedData).toHaveLength(2);
      expect((insertedData[0] as Record<string, unknown>).project_id).toBe(projectId);
      expect((insertedData[0] as Record<string, unknown>).source_id).toBe(sourceId);
      expect((insertedData[0] as Record<string, unknown>).name).toBe('Machine Learning');
    });

    it('handles empty transcription gracefully', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const emptyTranscription: Transcription = {
        ...sampleTranscription,
        full_text: '',
        segments: [],
      };

      configureMock({
        customStructuredResponses: new Map([['', []]]),
      });

      const concepts = await service.extractFromTranscription(
        projectId,
        sourceId,
        emptyTranscription
      );

      expect(concepts).toEqual([]);
    });
  });

  describe('extractFromText', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it('extracts concepts from plain text', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const text =
        'Machine learning is a subset of artificial intelligence that uses algorithms to learn from data.';

      const extractedConcepts: ExtractedConcept[] = [
        {
          name: 'Machine Learning',
          definition: 'A subset of AI that learns from data.',
          key_points: ['Uses algorithms', 'Learns from data', 'Part of AI'],
          cognitive_type: 'conceptual',
          difficulty: 5,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([[text, extractedConcepts]]),
      });

      const insertedConcepts: Concept[] = extractedConcepts.map((c, i) => ({
        id: `concept-${i}`,
        project_id: projectId,
        source_id: sourceId,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: [],
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.extractFromText(projectId, sourceId, text);

      expect(concepts).toHaveLength(1);
      expect(concepts[0].name).toBe('Machine Learning');
      expect(concepts[0].source_timestamps).toEqual([]);
    });

    it('does not include timestamps for plain text extraction', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const text = 'Simple text content.';

      const extractedConcepts: ExtractedConcept[] = [
        {
          name: 'Simple Concept',
          definition: 'A simple concept definition.',
          key_points: ['Point 1', 'Point 2', 'Point 3'],
          cognitive_type: 'declarative',
          difficulty: 3,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([[text, extractedConcepts]]),
      });

      const insertedConcepts: Concept[] = extractedConcepts.map((c, i) => ({
        id: `concept-${i}`,
        project_id: projectId,
        source_id: sourceId,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: [],
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.extractFromText(projectId, sourceId, text);

      expect(concepts[0].source_timestamps).toEqual([]);
    });

    it('handles empty text gracefully', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';

      configureMock({
        customStructuredResponses: new Map([['', []]]),
      });

      const concepts = await service.extractFromText(projectId, sourceId, '');

      expect(concepts).toEqual([]);
    });
  });

  describe('Cognitive type validation', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it.each([
      'declarative',
      'conceptual',
      'procedural',
      'conditional',
      'metacognitive',
    ] as CognitiveType[])(
      'accepts valid cognitive type: %s',
      async (cognitiveType) => {
        const projectId = 'project-123';
        const sourceId = 'source-456';
        const text = 'Test content for cognitive type validation.';

        const extractedConcepts: ExtractedConcept[] = [
          {
            name: 'Test Concept',
            definition: 'A test concept definition.',
            key_points: ['Point 1', 'Point 2', 'Point 3'],
            cognitive_type: cognitiveType,
            difficulty: 5,
          },
        ];

        configureMock({
          customStructuredResponses: new Map([[text, extractedConcepts]]),
        });

        const insertedConcepts: Concept[] = extractedConcepts.map((c, i) => ({
          id: `concept-${i}`,
          project_id: projectId,
          source_id: sourceId,
          name: c.name,
          definition: c.definition,
          key_points: c.key_points,
          cognitive_type: c.cognitive_type,
          difficulty: c.difficulty,
          source_timestamps: [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }));

        mockFrom.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: insertedConcepts,
              error: null,
            }),
          }),
        });

        const concepts = await service.extractFromText(
          projectId,
          sourceId,
          text
        );

        expect(concepts[0].cognitive_type).toBe(cognitiveType);
        expect(COGNITIVE_TYPES).toContain(concepts[0].cognitive_type);
      }
    );

    it('all cognitive types are valid CognitiveType enum values', () => {
      const validTypes: CognitiveType[] = [
        'declarative',
        'conceptual',
        'procedural',
        'conditional',
        'metacognitive',
      ];

      expect(COGNITIVE_TYPES).toEqual(validTypes);
    });
  });

  describe('Difficulty score validation', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
      'accepts valid difficulty score: %d',
      async (difficulty) => {
        const projectId = 'project-123';
        const sourceId = 'source-456';
        const text = 'Test content for difficulty validation.';

        const extractedConcepts: ExtractedConcept[] = [
          {
            name: 'Test Concept',
            definition: 'A test concept definition.',
            key_points: ['Point 1', 'Point 2', 'Point 3'],
            cognitive_type: 'conceptual',
            difficulty,
          },
        ];

        configureMock({
          customStructuredResponses: new Map([[text, extractedConcepts]]),
        });

        const insertedConcepts: Concept[] = extractedConcepts.map((c, i) => ({
          id: `concept-${i}`,
          project_id: projectId,
          source_id: sourceId,
          name: c.name,
          definition: c.definition,
          key_points: c.key_points,
          cognitive_type: c.cognitive_type,
          difficulty: c.difficulty,
          source_timestamps: [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }));

        mockFrom.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: insertedConcepts,
              error: null,
            }),
          }),
        });

        const concepts = await service.extractFromText(
          projectId,
          sourceId,
          text
        );

        expect(concepts[0].difficulty).toBe(difficulty);
        expect(concepts[0].difficulty).toBeGreaterThanOrEqual(1);
        expect(concepts[0].difficulty).toBeLessThanOrEqual(10);
      }
    );
  });

  describe('Key points validation', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it('key_points is an array of strings', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const text = 'Test content for key points validation.';

      const extractedConcepts: ExtractedConcept[] = [
        {
          name: 'Test Concept',
          definition: 'A test concept definition.',
          key_points: ['First point', 'Second point', 'Third point'],
          cognitive_type: 'conceptual',
          difficulty: 5,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([[text, extractedConcepts]]),
      });

      const insertedConcepts: Concept[] = extractedConcepts.map((c, i) => ({
        id: `concept-${i}`,
        project_id: projectId,
        source_id: sourceId,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: [],
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.extractFromText(projectId, sourceId, text);

      expect(Array.isArray(concepts[0].key_points)).toBe(true);
      concepts[0].key_points.forEach((point) => {
        expect(typeof point).toBe('string');
      });
    });

    it('validates key_points has 1-10 items', () => {
      const validConcept: ExtractedConcept = {
        name: 'Test',
        definition: 'Test definition',
        key_points: ['Point 1', 'Point 2', 'Point 3'],
        cognitive_type: 'conceptual',
        difficulty: 5,
      };

      expect(() => validateExtractedConcept(validConcept)).not.toThrow();

      const invalidConceptEmpty: ExtractedConcept = {
        ...validConcept,
        key_points: [],
      };

      expect(() => validateExtractedConcept(invalidConceptEmpty)).toThrow(
        ConceptExtractionError
      );

      const invalidConceptTooMany: ExtractedConcept = {
        ...validConcept,
        key_points: Array(11).fill('Point'),
      };

      expect(() => validateExtractedConcept(invalidConceptTooMany)).toThrow(
        ConceptExtractionError
      );
    });
  });

  describe('getProjectConcepts', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it('returns all concepts for a project', async () => {
      const projectId = 'project-123';
      const mockConcepts: Concept[] = [
        {
          id: 'concept-1',
          project_id: projectId,
          source_id: 'source-1',
          name: 'Concept 1',
          definition: 'Definition 1',
          key_points: ['Point 1'],
          cognitive_type: 'conceptual',
          difficulty: 5,
          source_timestamps: [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'concept-2',
          project_id: projectId,
          source_id: 'source-2',
          name: 'Concept 2',
          definition: 'Definition 2',
          key_points: ['Point 2'],
          cognitive_type: 'procedural',
          difficulty: 7,
          source_timestamps: [],
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockConcepts,
            error: null,
          }),
        }),
      });

      const concepts = await service.getProjectConcepts(projectId);

      expect(concepts).toHaveLength(2);
      expect(concepts[0].name).toBe('Concept 1');
      expect(concepts[1].name).toBe('Concept 2');
      expect(mockFrom).toHaveBeenCalledWith('concepts');
    });

    it('returns empty array for project with no concepts', async () => {
      const projectId = 'project-empty';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const concepts = await service.getProjectConcepts(projectId);

      expect(concepts).toEqual([]);
    });
  });

  describe('Error handling', () => {
    let service: ConceptExtractionService;

    beforeEach(() => {
      service = createConceptExtractionService(mockSupabase);
    });

    it('handles AI service failures', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const text = 'Test content that will fail.';

      configureMock({
        shouldError: true,
        errorToThrow: new AIError('AI service failed', 'SERVER_ERROR'),
      });

      await expect(
        service.extractFromText(projectId, sourceId, text)
      ).rejects.toThrow(ConceptExtractionError);
    });

    it('handles database insert errors', async () => {
      const projectId = 'project-123';
      const sourceId = 'source-456';
      const text = 'Test content for database error.';

      const extractedConcepts: ExtractedConcept[] = [
        {
          name: 'Test Concept',
          definition: 'A test concept definition.',
          key_points: ['Point 1', 'Point 2', 'Point 3'],
          cognitive_type: 'conceptual',
          difficulty: 5,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([[text, extractedConcepts]]),
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database insert failed' },
          }),
        }),
      });

      await expect(
        service.extractFromText(projectId, sourceId, text)
      ).rejects.toThrow(ConceptExtractionError);
    });

    it('handles database query errors in getProjectConcepts', async () => {
      const projectId = 'project-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database query failed' },
          }),
        }),
      });

      await expect(service.getProjectConcepts(projectId)).rejects.toThrow(
        ConceptExtractionError
      );
    });
  });

  describe('validateExtractedConcept', () => {
    it('validates name length (2-50 characters)', () => {
      const validConcept: ExtractedConcept = {
        name: 'Valid Name',
        definition: 'Valid definition',
        key_points: ['Point 1'],
        cognitive_type: 'conceptual',
        difficulty: 5,
      };

      expect(() => validateExtractedConcept(validConcept)).not.toThrow();

      const tooShort: ExtractedConcept = {
        ...validConcept,
        name: 'A',
      };

      expect(() => validateExtractedConcept(tooShort)).toThrow(
        ConceptExtractionError
      );

      const tooLong: ExtractedConcept = {
        ...validConcept,
        name: 'A'.repeat(51),
      };

      expect(() => validateExtractedConcept(tooLong)).toThrow(
        ConceptExtractionError
      );
    });

    it('validates definition is non-empty', () => {
      const validConcept: ExtractedConcept = {
        name: 'Valid Name',
        definition: 'Valid definition',
        key_points: ['Point 1'],
        cognitive_type: 'conceptual',
        difficulty: 5,
      };

      expect(() => validateExtractedConcept(validConcept)).not.toThrow();

      const emptyDefinition: ExtractedConcept = {
        ...validConcept,
        definition: '',
      };

      expect(() => validateExtractedConcept(emptyDefinition)).toThrow(
        ConceptExtractionError
      );
    });

    it('validates cognitive type is valid enum', () => {
      const validConcept: ExtractedConcept = {
        name: 'Valid Name',
        definition: 'Valid definition',
        key_points: ['Point 1'],
        cognitive_type: 'conceptual',
        difficulty: 5,
      };

      expect(() => validateExtractedConcept(validConcept)).not.toThrow();

      const invalidType = {
        ...validConcept,
        cognitive_type: 'invalid_type',
      } as unknown as ExtractedConcept;

      expect(() => validateExtractedConcept(invalidType)).toThrow(
        ConceptExtractionError
      );
    });

    it('validates difficulty is integer 1-10', () => {
      const validConcept: ExtractedConcept = {
        name: 'Valid Name',
        definition: 'Valid definition',
        key_points: ['Point 1'],
        cognitive_type: 'conceptual',
        difficulty: 5,
      };

      expect(() => validateExtractedConcept(validConcept)).not.toThrow();

      const tooLow: ExtractedConcept = {
        ...validConcept,
        difficulty: 0,
      };

      expect(() => validateExtractedConcept(tooLow)).toThrow(
        ConceptExtractionError
      );

      const tooHigh: ExtractedConcept = {
        ...validConcept,
        difficulty: 11,
      };

      expect(() => validateExtractedConcept(tooHigh)).toThrow(
        ConceptExtractionError
      );

      const notInteger: ExtractedConcept = {
        ...validConcept,
        difficulty: 5.5,
      };

      expect(() => validateExtractedConcept(notInteger)).toThrow(
        ConceptExtractionError
      );
    });
  });

  describe('ConceptExtractionError', () => {
    it('includes error code and message', () => {
      const error = new ConceptExtractionError(
        'Test error',
        'EXTRACTION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('EXTRACTION_FAILED');
      expect(error.name).toBe('ConceptExtractionError');
    });

    it('includes optional details', () => {
      const error = new ConceptExtractionError(
        'Test error',
        'EXTRACTION_FAILED',
        {
          projectId: 'project-123',
          sourceId: 'source-456',
        }
      );

      expect(error.details).toEqual({
        projectId: 'project-123',
        sourceId: 'source-456',
      });
    });
  });
});
