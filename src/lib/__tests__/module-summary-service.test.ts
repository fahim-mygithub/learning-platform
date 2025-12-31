/**
 * Module Summary Service Tests
 *
 * Tests for module summary generation and storage including:
 * - generateModuleSummary - returns all required fields
 * - ModuleSummary structure validation
 * - storeModuleSummary - requires roadmapId
 * - getModuleSummary - retrieval from database
 * - Error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Concept, CognitiveType } from '@/src/types/database';
import {
  ModuleSummary,
  TimeCalibration,
  DifficultyLevel,
  BloomLevel,
} from '@/src/types/three-pass';

// Import the mock functions - Jest will use __mocks__/ai-service.ts automatically
import {
  configureMock,
  resetMock,
  getMockCallHistory,
  clearMockCallHistory,
} from '../__mocks__/ai-service';

// Mock the AI service module
jest.mock('../ai-service', () => require('../__mocks__/ai-service'));

// Mock the debug logger to prevent console noise
jest.mock('../debug-logger', () => ({
  logInput: jest.fn(),
  logOutput: jest.fn(),
  logError: jest.fn(),
  startTimer: jest.fn(() => ({ stop: jest.fn(() => 100) })),
}));

// Import after mocking
import {
  createModuleSummaryService,
  ModuleSummaryService,
  ModuleSummaryServiceError,
} from '../module-summary-service';

describe('Module Summary Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  // Sample test data
  const createBaseConcept = (overrides: Partial<Concept> = {}): Concept => ({
    id: `concept-${Math.random().toString(36).substr(2, 9)}`,
    project_id: 'project-123',
    source_id: 'source-456',
    name: 'Test Concept',
    definition: 'A test concept definition.',
    key_points: ['Point 1', 'Point 2', 'Point 3'],
    cognitive_type: 'conceptual' as CognitiveType,
    difficulty: 5,
    source_timestamps: [],
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tier: 2,
    mentioned_only: false,
    bloom_level: 'understand' as BloomLevel,
    ...overrides,
  });

  const createTimeCalibration = (overrides: Partial<TimeCalibration> = {}): TimeCalibration => ({
    mode_multiplier: 2.5,
    density_modifier: 1.0,
    knowledge_type_factor: 1.0,
    source_duration_seconds: 1200, // 20 minutes
    calculated_learning_time_minutes: 50,
    ...overrides,
  });

  const sampleModuleSummary: ModuleSummary = {
    title: 'Introduction to Machine Learning',
    one_paragraph_summary: 'This module covers the fundamentals of machine learning, including key algorithms and applications.',
    learning_outcomes: [
      'Understand the core concepts of machine learning',
      'Apply basic ML algorithms to datasets',
      'Analyze model performance metrics',
    ],
    prerequisites: {
      required: ['Basic programming knowledge'],
      helpful: ['Statistics fundamentals'],
    },
    time_investment: {
      source_minutes: 20,
      review_minutes: 30,
      total_minutes: 50,
    },
    difficulty_level: 'intermediate',
    difficulty_explanation: 'This module is rated intermediate based on the complexity of concepts covered.',
    skills_gained: [
      'Data preprocessing',
      'Model training and evaluation',
      'Algorithm selection',
    ],
  };

  const sampleRawResponse = {
    title: 'Introduction to Machine Learning',
    one_paragraph_summary: 'This module covers the fundamentals of machine learning.',
    learning_outcomes: [
      'Understand the core concepts',
      'Apply basic algorithms',
      'Analyze model performance',
    ],
    prerequisites: {
      required: ['Basic programming'],
      helpful: ['Statistics'],
    },
    difficulty_level: 'intermediate',
    difficulty_explanation: 'Intermediate complexity.',
    skills_gained: ['Data preprocessing', 'Model training', 'Algorithm selection'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createModuleSummaryService', () => {
    it('creates service with AI service only', () => {
      const service = createModuleSummaryService({} as never);

      expect(service).toBeDefined();
      expect(service.generateModuleSummary).toBeDefined();
      expect(service.storeModuleSummary).toBeDefined();
      expect(service.getModuleSummary).toBeDefined();
    });

    it('creates service with AI service and Supabase client', () => {
      const service = createModuleSummaryService({} as never, mockSupabase);

      expect(service).toBeDefined();
    });
  });

  describe('generateModuleSummary', () => {
    let service: ModuleSummaryService;

    beforeEach(() => {
      service = createModuleSummaryService({} as never);
    });

    describe('Returns all required fields', () => {
      it('returns complete ModuleSummary with all fields', async () => {
        const concepts: Concept[] = [
          createBaseConcept({ tier: 2, mentioned_only: false }),
          createBaseConcept({ tier: 3, mentioned_only: false }),
        ];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', sampleRawResponse],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        // Check all required fields are present
        expect(result.title).toBeDefined();
        expect(result.one_paragraph_summary).toBeDefined();
        expect(result.learning_outcomes).toBeDefined();
        expect(result.prerequisites).toBeDefined();
        expect(result.prerequisites.required).toBeDefined();
        expect(result.prerequisites.helpful).toBeDefined();
        expect(result.time_investment).toBeDefined();
        expect(result.time_investment.source_minutes).toBeDefined();
        expect(result.time_investment.review_minutes).toBeDefined();
        expect(result.time_investment.total_minutes).toBeDefined();
        expect(result.difficulty_level).toBeDefined();
        expect(result.difficulty_explanation).toBeDefined();
        expect(result.skills_gained).toBeDefined();
      });

      it('calculates time investment from timeCalibration', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration({
          source_duration_seconds: 600, // 10 minutes
          calculated_learning_time_minutes: 30,
        });

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', sampleRawResponse],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.time_investment.source_minutes).toBe(10);
        expect(result.time_investment.total_minutes).toBe(30);
        expect(result.time_investment.review_minutes).toBe(20); // 30 - 10
      });

      it('handles null source_duration_seconds in timeCalibration', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration({
          source_duration_seconds: null,
          calculated_learning_time_minutes: 30,
        });

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', sampleRawResponse],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        // When source duration is null, source_minutes is estimated as 40% of total
        expect(result.time_investment.source_minutes).toBe(12); // 30 * 0.4
        expect(result.time_investment.total_minutes).toBe(30);
      });

      it('ensures review_minutes is never negative', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration({
          source_duration_seconds: 3600, // 60 minutes (longer than total)
          calculated_learning_time_minutes: 30,
        });

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', sampleRawResponse],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.time_investment.review_minutes).toBeGreaterThanOrEqual(0);
      });
    });

    describe('ModuleSummary structure validation', () => {
      it('validates title is required', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              title: '', // Empty title
            }],
          ]),
        });

        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow(ModuleSummaryServiceError);
        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow('title is required');
      });

      it('validates one_paragraph_summary is required', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              one_paragraph_summary: null,
            }],
          ]),
        });

        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow('one_paragraph_summary is required');
      });

      it('validates at least 3 learning outcomes are required', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              learning_outcomes: ['Only one', 'Only two'], // Less than 3
            }],
          ]),
        });

        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow('at least 3 learning outcomes required');
      });

      it('limits learning outcomes to 5', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              learning_outcomes: [
                'Outcome 1', 'Outcome 2', 'Outcome 3',
                'Outcome 4', 'Outcome 5', 'Outcome 6', 'Outcome 7',
              ],
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.learning_outcomes).toHaveLength(5);
      });

      it('trims whitespace from string fields', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              title: '  Title with whitespace  ',
              one_paragraph_summary: '  Summary with whitespace  ',
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.title).toBe('Title with whitespace');
        expect(result.one_paragraph_summary).toBe('Summary with whitespace');
      });

      it('validates difficulty_level is valid enum', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              difficulty_level: 'invalid' as DifficultyLevel,
            }],
          ]),
        });

        // Should fall back to calculated difficulty
        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(['beginner', 'intermediate', 'advanced']).toContain(result.difficulty_level);
      });

      it('provides default difficulty_explanation if missing', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              difficulty_explanation: null,
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.difficulty_explanation).toContain('rated');
        expect(result.difficulty_explanation).toContain(result.difficulty_level);
      });

      it('handles missing prerequisites gracefully', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              prerequisites: null,
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.prerequisites.required).toEqual([]);
        expect(result.prerequisites.helpful).toEqual([]);
      });

      it('limits prerequisites to 3 each', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              prerequisites: {
                required: ['Req 1', 'Req 2', 'Req 3', 'Req 4', 'Req 5'],
                helpful: ['Help 1', 'Help 2', 'Help 3', 'Help 4'],
              },
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.prerequisites.required).toHaveLength(3);
        expect(result.prerequisites.helpful).toHaveLength(3);
      });

      it('handles empty skills_gained array', async () => {
        const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Create a module summary', {
              ...sampleRawResponse,
              skills_gained: [],
            }],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        expect(result.skills_gained).toEqual([]);
      });
    });

    describe('Concept handling', () => {
      it('throws error when no core concepts available', async () => {
        const concepts: Concept[] = [
          createBaseConcept({ mentioned_only: true }), // All mentioned only
        ];
        const timeCalibration = createTimeCalibration();

        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow(ModuleSummaryServiceError);
        await expect(
          service.generateModuleSummary(concepts, timeCalibration)
        ).rejects.toThrow('No core concepts');
      });

      it('throws error for empty concepts array', async () => {
        const timeCalibration = createTimeCalibration();

        await expect(
          service.generateModuleSummary([], timeCalibration)
        ).rejects.toThrow('No core concepts');
      });

      it('filters out mentioned_only concepts', async () => {
        const concepts: Concept[] = [
          createBaseConcept({ name: 'Core Concept', tier: 2, mentioned_only: false }),
          createBaseConcept({ name: 'Mentioned Concept', tier: 2, mentioned_only: true }),
        ];
        const timeCalibration = createTimeCalibration();

        configureMock({
          customStructuredResponses: new Map([
            ['Core Concept', sampleRawResponse],
          ]),
        });

        const result = await service.generateModuleSummary(concepts, timeCalibration);

        // Should succeed with at least one core concept
        expect(result.title).toBeDefined();
      });
    });
  });

  describe('storeModuleSummary', () => {
    it('stores module summary in database', async () => {
      const service = createModuleSummaryService({} as never, mockSupabase);
      const roadmapId = 'roadmap-123';

      mockEq.mockResolvedValue({ error: null });

      await service.storeModuleSummary(roadmapId, sampleModuleSummary);

      expect(mockFrom).toHaveBeenCalledWith('roadmaps');
      expect(mockUpdate).toHaveBeenCalledWith({ module_summary: sampleModuleSummary });
      expect(mockEq).toHaveBeenCalledWith('id', roadmapId);
    });

    it('throws error when Supabase client is not provided', async () => {
      const service = createModuleSummaryService({} as never);

      await expect(
        service.storeModuleSummary('roadmap-123', sampleModuleSummary)
      ).rejects.toThrow(ModuleSummaryServiceError);
      await expect(
        service.storeModuleSummary('roadmap-123', sampleModuleSummary)
      ).rejects.toThrow('Supabase client required');
    });

    it('throws error when roadmapId is missing', async () => {
      const service = createModuleSummaryService({} as never, mockSupabase);

      await expect(
        service.storeModuleSummary('', sampleModuleSummary)
      ).rejects.toThrow(ModuleSummaryServiceError);
      await expect(
        service.storeModuleSummary('', sampleModuleSummary)
      ).rejects.toThrow('roadmapId is required');
    });

    it('throws error on database failure', async () => {
      mockEq.mockResolvedValue({ error: { message: 'Database error' } });

      const service = createModuleSummaryService({} as never, mockSupabase);

      await expect(
        service.storeModuleSummary('roadmap-123', sampleModuleSummary)
      ).rejects.toThrow(ModuleSummaryServiceError);
      await expect(
        service.storeModuleSummary('roadmap-123', sampleModuleSummary)
      ).rejects.toThrow('Failed to store module summary');
    });
  });

  describe('getModuleSummary', () => {
    it('retrieves stored module summary from database', async () => {
      mockSingle.mockResolvedValue({
        data: { module_summary: sampleModuleSummary },
        error: null,
      });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).not.toBeNull();
      expect(result!.title).toBe(sampleModuleSummary.title);
      expect(result!.learning_outcomes).toEqual(sampleModuleSummary.learning_outcomes);
    });

    it('returns null when Supabase client is not provided', async () => {
      const service = createModuleSummaryService({} as never);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).toBeNull();
    });

    it('throws error when roadmapId is missing', async () => {
      const service = createModuleSummaryService({} as never, mockSupabase);

      await expect(service.getModuleSummary('')).rejects.toThrow(
        ModuleSummaryServiceError
      );
      await expect(service.getModuleSummary('')).rejects.toThrow(
        'roadmapId is required'
      );
    });

    it('returns null when roadmap not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('nonexistent-roadmap');

      expect(result).toBeNull();
    });

    it('returns null when module_summary is null', async () => {
      mockSingle.mockResolvedValue({
        data: { module_summary: null },
        error: null,
      });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).toBeNull();
    });

    it('returns null when module_summary is not an object', async () => {
      mockSingle.mockResolvedValue({
        data: { module_summary: 'not an object' },
        error: null,
      });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).toBeNull();
    });

    it('returns null when module_summary is missing required fields', async () => {
      mockSingle.mockResolvedValue({
        data: {
          module_summary: {
            title: 'Only title', // Missing other required fields
          },
        },
        error: null,
      });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).toBeNull();
    });

    it('returns null when learning_outcomes is not an array', async () => {
      mockSingle.mockResolvedValue({
        data: {
          module_summary: {
            title: 'Title',
            one_paragraph_summary: 'Summary',
            learning_outcomes: 'not an array',
          },
        },
        error: null,
      });

      const service = createModuleSummaryService({} as never, mockSupabase);
      const result = await service.getModuleSummary('roadmap-123');

      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles AI service failures', async () => {
      configureMock({
        shouldError: true,
        errorToThrow: new Error('AI service failed'),
      });

      const service = createModuleSummaryService({} as never);
      const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
      const timeCalibration = createTimeCalibration();

      await expect(
        service.generateModuleSummary(concepts, timeCalibration)
      ).rejects.toThrow(ModuleSummaryServiceError);
    });

    it('preserves ModuleSummaryServiceError when thrown during validation', async () => {
      const service = createModuleSummaryService({} as never);
      const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
      const timeCalibration = createTimeCalibration();

      configureMock({
        customStructuredResponses: new Map([
          ['Create a module summary', {
            ...sampleRawResponse,
            title: null, // Will cause validation error
          }],
        ]),
      });

      await expect(
        service.generateModuleSummary(concepts, timeCalibration)
      ).rejects.toThrow(ModuleSummaryServiceError);
    });
  });

  describe('ModuleSummaryServiceError', () => {
    it('includes error code and message', () => {
      const error = new ModuleSummaryServiceError(
        'Test error',
        'GENERATION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.name).toBe('ModuleSummaryServiceError');
    });

    it('includes optional details', () => {
      const error = new ModuleSummaryServiceError(
        'Test error',
        'DATABASE_ERROR',
        { roadmapId: 'roadmap-123' }
      );

      expect(error.details).toEqual({ roadmapId: 'roadmap-123' });
    });

    it('supports all error codes', () => {
      const codes = ['GENERATION_FAILED', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'NO_CONCEPTS'] as const;

      codes.forEach(code => {
        const error = new ModuleSummaryServiceError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });
});
