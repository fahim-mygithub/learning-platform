/**
 * Misconception Service Tests
 *
 * Tests for misconception generation and storage including:
 * - generateMisconceptions - filtering tier 2-3 non-mentioned-only concepts
 * - Misconception structure validation
 * - storeMisconceptions - requires conceptId
 * - getMisconceptions - retrieval from database
 * - Error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  EnhancedExtractedConcept,
  Misconception,
  ConceptTier,
  BloomLevel,
} from '@/src/types/three-pass';
import { CognitiveType } from '@/src/types/database';

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
  createMisconceptionService,
  MisconceptionService,
  MisconceptionServiceError,
} from '../misconception-service';

describe('Misconception Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  // Sample test data
  const createBaseConcept = (
    overrides: Partial<EnhancedExtractedConcept> = {}
  ): EnhancedExtractedConcept => ({
    name: 'Test Concept',
    definition: 'A test concept definition.',
    key_points: ['Point 1', 'Point 2', 'Point 3'],
    cognitive_type: 'conceptual' as CognitiveType,
    difficulty: 5,
    tier: 2 as ConceptTier,
    mentioned_only: false,
    bloom_level: 'understand' as BloomLevel,
    definition_provided: true,
    time_allocation_percent: 10,
    ...overrides,
  });

  const sampleMisconception: Misconception = {
    misconception: 'Common error about the concept',
    reality: 'The correct understanding',
    trigger_detection: 'error phrase|wrong assumption',
    remediation: 'Explain why this is incorrect and provide the correct explanation',
  };

  const sampleMisconceptionResponse = {
    concept_name: 'Test Concept',
    misconceptions: [sampleMisconception],
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

  describe('createMisconceptionService', () => {
    it('creates service with AI service only', () => {
      const service = createMisconceptionService({} as never);

      expect(service).toBeDefined();
      expect(service.generateMisconceptions).toBeDefined();
      expect(service.storeMisconceptions).toBeDefined();
      expect(service.getMisconceptions).toBeDefined();
    });

    it('creates service with AI service and Supabase client', () => {
      const service = createMisconceptionService({} as never, mockSupabase);

      expect(service).toBeDefined();
    });
  });

  describe('generateMisconceptions', () => {
    let service: MisconceptionService;

    beforeEach(() => {
      service = createMisconceptionService({} as never);
    });

    describe('Filtering tier 2-3 non-mentioned-only concepts', () => {
      it('generates misconceptions for tier 2 non-mentioned-only concepts', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Tier 2 Concept',
            tier: 2,
            mentioned_only: false,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Tier 2 Concept', [
              {
                concept_name: 'Tier 2 Concept',
                misconceptions: [sampleMisconception],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(1);
        expect(result.get('Tier 2 Concept')).toBeDefined();
      });

      it('generates misconceptions for tier 3 non-mentioned-only concepts', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Tier 3 Concept',
            tier: 3,
            mentioned_only: false,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Tier 3 Concept', [
              {
                concept_name: 'Tier 3 Concept',
                misconceptions: [sampleMisconception],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(1);
        expect(result.get('Tier 3 Concept')).toBeDefined();
      });

      it('excludes tier 1 concepts (familiar/background)', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Tier 1 Concept',
            tier: 1,
            mentioned_only: false,
          }),
          createBaseConcept({
            name: 'Tier 2 Concept',
            tier: 2,
            mentioned_only: false,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Tier 2 Concept', [
              {
                concept_name: 'Tier 2 Concept',
                misconceptions: [sampleMisconception],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        // Should only include tier 2, not tier 1
        expect(result.size).toBe(1);
        expect(result.has('Tier 1 Concept')).toBe(false);
        expect(result.has('Tier 2 Concept')).toBe(true);
      });

      it('excludes mentioned_only concepts', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Mentioned Only Concept',
            tier: 2,
            mentioned_only: true, // Should be excluded
          }),
          createBaseConcept({
            name: 'Explained Concept',
            tier: 2,
            mentioned_only: false,
          }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Explained Concept', [
              {
                concept_name: 'Explained Concept',
                misconceptions: [sampleMisconception],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(1);
        expect(result.has('Mentioned Only Concept')).toBe(false);
        expect(result.has('Explained Concept')).toBe(true);
      });

      it('excludes tier 1 mentioned_only concepts', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Tier 1 Mentioned',
            tier: 1,
            mentioned_only: true,
          }),
        ];

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(0);
      });

      it('returns empty map when all concepts are filtered out', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({
            name: 'Tier 1',
            tier: 1,
            mentioned_only: false,
          }),
          createBaseConcept({
            name: 'Mentioned Only',
            tier: 2,
            mentioned_only: true,
          }),
        ];

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(0);
      });

      it('returns empty map for empty input', async () => {
        const result = await service.generateMisconceptions([]);

        expect(result.size).toBe(0);
      });
    });

    describe('Misconception structure validation', () => {
      it('validates and includes well-formed misconceptions', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({ name: 'Valid Concept' }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Valid Concept', [
              {
                concept_name: 'Valid Concept',
                misconceptions: [
                  {
                    misconception: 'Valid error description',
                    reality: 'Valid correct understanding',
                    trigger_detection: 'valid trigger',
                    remediation: 'Valid remediation strategy',
                  },
                ],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        expect(result.size).toBe(1);
        const misconceptions = result.get('Valid Concept')!;
        expect(misconceptions).toHaveLength(1);
        expect(misconceptions[0].misconception).toBe('Valid error description');
        expect(misconceptions[0].reality).toBe('Valid correct understanding');
        expect(misconceptions[0].trigger_detection).toBe('valid trigger');
        expect(misconceptions[0].remediation).toBe('Valid remediation strategy');
      });

      it('trims whitespace from misconception fields', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({ name: 'Concept' }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Concept', [
              {
                concept_name: 'Concept',
                misconceptions: [
                  {
                    misconception: '  Misconception with whitespace  ',
                    reality: '  Reality with whitespace  ',
                    trigger_detection: '  trigger  ',
                    remediation: '  Remediation  ',
                  },
                ],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);
        const misconceptions = result.get('Concept')!;

        expect(misconceptions[0].misconception).toBe('Misconception with whitespace');
        expect(misconceptions[0].reality).toBe('Reality with whitespace');
        expect(misconceptions[0].trigger_detection).toBe('trigger');
        expect(misconceptions[0].remediation).toBe('Remediation');
      });

      it('filters out misconceptions missing required fields', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({ name: 'Concept' }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Concept', [
              {
                concept_name: 'Concept',
                misconceptions: [
                  {
                    misconception: 'Valid',
                    reality: 'Valid',
                    trigger_detection: 'Valid',
                    remediation: 'Valid',
                  },
                  {
                    misconception: 'Missing fields',
                    // Missing reality, trigger_detection, remediation
                  } as Misconception,
                ],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);
        const misconceptions = result.get('Concept')!;

        // Only the valid one should be included
        expect(misconceptions).toHaveLength(1);
        expect(misconceptions[0].misconception).toBe('Valid');
      });

      it('filters out misconceptions with non-string fields', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({ name: 'Concept' }),
        ];

        configureMock({
          customStructuredResponses: new Map([
            ['Concept', [
              {
                concept_name: 'Concept',
                misconceptions: [
                  {
                    misconception: 123 as unknown as string, // Invalid type
                    reality: 'Valid',
                    trigger_detection: 'Valid',
                    remediation: 'Valid',
                  },
                ],
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);
        const misconceptions = result.get('Concept');

        // Should be filtered out
        expect(misconceptions).toBeUndefined();
      });

      it('limits to 3 misconceptions per concept', async () => {
        const concepts: EnhancedExtractedConcept[] = [
          createBaseConcept({ name: 'Concept' }),
        ];

        const manyMisconceptions = Array(5).fill(null).map((_, i) => ({
          misconception: `Error ${i + 1}`,
          reality: `Reality ${i + 1}`,
          trigger_detection: `trigger${i + 1}`,
          remediation: `Remediation ${i + 1}`,
        }));

        configureMock({
          customStructuredResponses: new Map([
            ['Concept', [
              {
                concept_name: 'Concept',
                misconceptions: manyMisconceptions,
              },
            ]],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);
        const misconceptions = result.get('Concept')!;

        expect(misconceptions).toHaveLength(3);
        expect(misconceptions[0].misconception).toBe('Error 1');
        expect(misconceptions[2].misconception).toBe('Error 3');
      });
    });

    describe('Batch processing', () => {
      it('processes concepts in batches of 5', async () => {
        const concepts = Array(7).fill(null).map((_, i) =>
          createBaseConcept({ name: `Concept ${i + 1}`, tier: 2, mentioned_only: false })
        );

        configureMock({
          customStructuredResponses: new Map([
            ['Concept 1', concepts.slice(0, 5).map(c => ({
              concept_name: c.name,
              misconceptions: [sampleMisconception],
            }))],
            ['Concept 6', concepts.slice(5).map(c => ({
              concept_name: c.name,
              misconceptions: [sampleMisconception],
            }))],
          ]),
        });

        const result = await service.generateMisconceptions(concepts);

        // Check that we made 2 API calls (batch of 5, then batch of 2)
        const callHistory = getMockCallHistory();
        expect(callHistory.length).toBe(2);
      });
    });
  });

  describe('storeMisconceptions', () => {
    it('stores misconceptions for a concept', async () => {
      const service = createMisconceptionService({} as never, mockSupabase);
      const conceptId = 'concept-123';
      const misconceptions: Misconception[] = [sampleMisconception];

      mockEq.mockResolvedValue({ error: null });

      await service.storeMisconceptions(conceptId, misconceptions);

      expect(mockFrom).toHaveBeenCalledWith('concepts');
      expect(mockUpdate).toHaveBeenCalledWith({ common_misconceptions: misconceptions });
      expect(mockEq).toHaveBeenCalledWith('id', conceptId);
    });

    it('throws error when Supabase client is not provided', async () => {
      const service = createMisconceptionService({} as never);

      await expect(
        service.storeMisconceptions('concept-123', [sampleMisconception])
      ).rejects.toThrow(MisconceptionServiceError);
      await expect(
        service.storeMisconceptions('concept-123', [sampleMisconception])
      ).rejects.toThrow('Supabase client required');
    });

    it('throws error when conceptId is missing', async () => {
      const service = createMisconceptionService({} as never, mockSupabase);

      await expect(
        service.storeMisconceptions('', [sampleMisconception])
      ).rejects.toThrow(MisconceptionServiceError);
      await expect(
        service.storeMisconceptions('', [sampleMisconception])
      ).rejects.toThrow('conceptId and misconceptions array required');
    });

    it('throws error when misconceptions is not an array', async () => {
      const service = createMisconceptionService({} as never, mockSupabase);

      await expect(
        service.storeMisconceptions('concept-123', null as unknown as Misconception[])
      ).rejects.toThrow(MisconceptionServiceError);
    });

    it('throws error on database failure', async () => {
      mockEq.mockResolvedValue({ error: { message: 'Database error' } });

      const service = createMisconceptionService({} as never, mockSupabase);

      await expect(
        service.storeMisconceptions('concept-123', [sampleMisconception])
      ).rejects.toThrow(MisconceptionServiceError);
      await expect(
        service.storeMisconceptions('concept-123', [sampleMisconception])
      ).rejects.toThrow('Failed to store misconceptions');
    });
  });

  describe('getMisconceptions', () => {
    it('retrieves stored misconceptions from database', async () => {
      const storedData = {
        common_misconceptions: [sampleMisconception],
      };

      mockSingle.mockResolvedValue({ data: storedData, error: null });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('concept-123');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].misconception).toBe(sampleMisconception.misconception);
    });

    it('returns null when Supabase client is not provided', async () => {
      const service = createMisconceptionService({} as never);
      const result = await service.getMisconceptions('concept-123');

      expect(result).toBeNull();
    });

    it('throws error when conceptId is missing', async () => {
      const service = createMisconceptionService({} as never, mockSupabase);

      await expect(service.getMisconceptions('')).rejects.toThrow(
        MisconceptionServiceError
      );
      await expect(service.getMisconceptions('')).rejects.toThrow(
        'conceptId is required'
      );
    });

    it('returns null when concept not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('nonexistent-concept');

      expect(result).toBeNull();
    });

    it('returns null when common_misconceptions is not an array', async () => {
      mockSingle.mockResolvedValue({
        data: { common_misconceptions: 'not an array' },
        error: null,
      });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('concept-123');

      expect(result).toBeNull();
    });

    it('returns null when common_misconceptions is null', async () => {
      mockSingle.mockResolvedValue({
        data: { common_misconceptions: null },
        error: null,
      });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('concept-123');

      expect(result).toBeNull();
    });

    it('filters out invalid misconceptions from stored data', async () => {
      mockSingle.mockResolvedValue({
        data: {
          common_misconceptions: [
            sampleMisconception,
            { misconception: 'Invalid', /* missing other fields */ },
          ],
        },
        error: null,
      });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('concept-123');

      expect(result).toHaveLength(1);
      expect(result![0].misconception).toBe(sampleMisconception.misconception);
    });

    it('returns null when all stored misconceptions are invalid', async () => {
      mockSingle.mockResolvedValue({
        data: {
          common_misconceptions: [
            { misconception: 'Only field' }, // Invalid
          ],
        },
        error: null,
      });

      const service = createMisconceptionService({} as never, mockSupabase);
      const result = await service.getMisconceptions('concept-123');

      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles AI service failures', async () => {
      configureMock({
        shouldError: true,
        errorToThrow: new Error('AI service failed'),
      });

      const service = createMisconceptionService({} as never);
      const concepts: EnhancedExtractedConcept[] = [
        createBaseConcept({ tier: 2, mentioned_only: false }),
      ];

      await expect(service.generateMisconceptions(concepts)).rejects.toThrow(
        MisconceptionServiceError
      );
    });
  });

  describe('MisconceptionServiceError', () => {
    it('includes error code and message', () => {
      const error = new MisconceptionServiceError(
        'Test error',
        'GENERATION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.name).toBe('MisconceptionServiceError');
    });

    it('includes optional details', () => {
      const error = new MisconceptionServiceError(
        'Test error',
        'DATABASE_ERROR',
        { conceptId: 'concept-123' }
      );

      expect(error.details).toEqual({ conceptId: 'concept-123' });
    });

    it('supports all error codes', () => {
      const codes = ['GENERATION_FAILED', 'DATABASE_ERROR', 'VALIDATION_ERROR', 'NO_ELIGIBLE_CONCEPTS'] as const;

      codes.forEach(code => {
        const error = new MisconceptionServiceError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });
});
