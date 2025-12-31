/**
 * Rhetorical Router Service Tests
 *
 * Tests for Pass 1 content classification including:
 * - Content type classification (survey, conceptual, procedural)
 * - Multi-topic detection (3+ topics in short content = survey)
 * - Duration threshold enforcement (<10 min + 3+ topics = survey)
 * - Bloom's ceiling constraints by content type
 * - topic_count in Pass1Result
 * - Database storage operations
 * - Error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Pass1Result,
  ContentType,
  BloomLevel,
  getModeMultiplier,
  getDefaultBloomCeiling,
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
  createRhetoricalRouterService,
  RhetoricalRouterService,
  RhetoricalRouterError,
} from '../rhetorical-router';

describe('Rhetorical Router Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockLimit: jest.Mock;
  let mockSingle: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockLimit = jest.fn().mockReturnValue({ single: mockSingle });
    mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockResolvedValue({ error: null });
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

  describe('createRhetoricalRouterService', () => {
    it('creates service with AI service only', () => {
      const service = createRhetoricalRouterService({} as never);

      expect(service).toBeDefined();
      expect(service.classifyContent).toBeDefined();
      expect(service.storeClassification).toBeDefined();
      expect(service.getClassification).toBeDefined();
    });

    it('creates service with AI service and Supabase client', () => {
      const service = createRhetoricalRouterService({} as never, mockSupabase);

      expect(service).toBeDefined();
    });
  });

  describe('classifyContent', () => {
    let service: RhetoricalRouterService;

    beforeEach(() => {
      service = createRhetoricalRouterService({} as never);
    });

    it('classifies survey content correctly', async () => {
      const surveyText = 'This video covers the top 5 programming languages. First, we look at JavaScript...';

      configureMock({
        customStructuredResponses: new Map([
          [surveyText, {
            content_type: 'survey',
            thesis_statement: 'Overview of top programming languages',
            bloom_ceiling: 'understand',
            extraction_depth: 'mentions',
            topic_count: 5,
            reasoning: 'Content covers multiple topics briefly',
          }],
        ]),
      });

      const result = await service.classifyContent(surveyText);

      expect(result.contentType).toBe('survey');
      expect(result.bloomCeiling).toBe('understand');
      expect(result.modeMultiplier).toBe(1.5);
      expect(result.topicCount).toBe(5);
    });

    it('classifies conceptual content correctly', async () => {
      const conceptualText = 'In this deep dive, we explore why neural networks are effective. The key insight is...';

      configureMock({
        customStructuredResponses: new Map([
          [conceptualText, {
            content_type: 'conceptual',
            thesis_statement: 'Neural networks are effective due to their layered architecture',
            bloom_ceiling: 'analyze',
            extraction_depth: 'explanations',
            topic_count: 1,
            reasoning: 'Deep explanation of single topic with argument',
          }],
        ]),
      });

      const result = await service.classifyContent(conceptualText);

      expect(result.contentType).toBe('conceptual');
      expect(result.bloomCeiling).toBe('analyze');
      expect(result.modeMultiplier).toBe(2.5);
      expect(result.topicCount).toBe(1);
    });

    it('classifies procedural content correctly', async () => {
      const proceduralText = 'In this tutorial, you will learn how to build a REST API. Step 1: Set up your environment...';

      configureMock({
        customStructuredResponses: new Map([
          [proceduralText, {
            content_type: 'procedural',
            thesis_statement: null,
            bloom_ceiling: 'apply',
            extraction_depth: 'explanations',
            topic_count: 1,
            reasoning: 'Step-by-step tutorial with hands-on exercises',
          }],
        ]),
      });

      const result = await service.classifyContent(proceduralText);

      expect(result.contentType).toBe('procedural');
      expect(result.bloomCeiling).toBe('apply');
      expect(result.modeMultiplier).toBe(4.0);
    });

    describe('Multi-topic detection', () => {
      it('detects 3+ topics in short content as survey', async () => {
        const multiTopicShortContent = 'Quick overview: JavaScript, Python, and Rust explained in 5 minutes.';
        const durationSeconds = 300; // 5 minutes

        configureMock({
          customStructuredResponses: new Map([
            [multiTopicShortContent, {
              content_type: 'conceptual', // AI might incorrectly classify
              thesis_statement: null,
              bloom_ceiling: 'analyze',
              extraction_depth: 'mentions',
              topic_count: 3, // 3 topics
              reasoning: 'Covers multiple languages',
            }],
          ]),
        });

        const result = await service.classifyContent(multiTopicShortContent, durationSeconds);

        // Should be overridden to survey because <10 min + 3+ topics
        expect(result.contentType).toBe('survey');
        expect(result.bloomCeiling).toBe('understand'); // Survey max is understand
        expect(result.topicCount).toBe(3);
      });

      it('enforces survey for 4 topics in 8 minute content', async () => {
        const content = 'Four key concepts in 8 minutes: arrays, lists, maps, and sets.';
        const durationSeconds = 480; // 8 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'procedural', // AI incorrectly classifies
              thesis_statement: null,
              bloom_ceiling: 'apply',
              extraction_depth: 'mentions',
              topic_count: 4,
              reasoning: 'Covers data structures',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        // Should be overridden to survey
        expect(result.contentType).toBe('survey');
        expect(result.bloomCeiling).toBe('understand');
      });

      it('preserves conceptual classification for single-topic deep content', async () => {
        const deepContent = 'A 30-minute deep dive into React hooks and state management.';
        const durationSeconds = 1800; // 30 minutes

        configureMock({
          customStructuredResponses: new Map([
            [deepContent, {
              content_type: 'conceptual',
              thesis_statement: 'React hooks simplify state management',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 1,
              reasoning: 'Single topic with deep explanation',
            }],
          ]),
        });

        const result = await service.classifyContent(deepContent, durationSeconds);

        expect(result.contentType).toBe('conceptual');
        expect(result.bloomCeiling).toBe('analyze');
        expect(result.topicCount).toBe(1);
      });

      it('preserves classification when duration is over 10 minutes even with 3+ topics', async () => {
        const content = 'Three advanced topics explained in 15 minutes each.';
        const durationSeconds = 2700; // 45 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: null,
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 3,
              reasoning: 'Long-form content with detailed explanations',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        // Should preserve conceptual because duration > 10 minutes
        expect(result.contentType).toBe('conceptual');
        expect(result.bloomCeiling).toBe('analyze');
      });
    });

    describe('Duration thresholds', () => {
      it('handles content exactly at 10 minute threshold with 3+ topics', async () => {
        const content = 'Three frameworks compared.';
        const durationSeconds = 600; // Exactly 10 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: null,
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 3,
              reasoning: 'Framework comparison',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        // At exactly 10 minutes, should NOT be overridden (only <10 min triggers override)
        expect(result.contentType).toBe('conceptual');
      });

      it('handles content just under 10 minute threshold with 3+ topics', async () => {
        const content = 'Three frameworks compared quickly.';
        const durationSeconds = 599; // Just under 10 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: null,
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 3,
              reasoning: 'Quick framework comparison',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        // Should be overridden to survey
        expect(result.contentType).toBe('survey');
        expect(result.bloomCeiling).toBe('understand');
      });

      it('does not override with 2 topics regardless of duration', async () => {
        const content = 'React vs Vue comparison.';
        const durationSeconds = 300; // 5 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'React and Vue have different philosophies',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 2,
              reasoning: 'Two framework comparison',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        // Should NOT be overridden because only 2 topics
        expect(result.contentType).toBe('conceptual');
      });
    });

    describe('topic_count in Pass1Result', () => {
      it('includes topic_count in result when provided by AI', async () => {
        const content = 'Five design patterns explained.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'survey',
              thesis_statement: null,
              bloom_ceiling: 'understand',
              extraction_depth: 'mentions',
              topic_count: 5,
              reasoning: 'Multiple patterns covered briefly',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.topicCount).toBe(5);
      });

      it('handles missing topic_count gracefully', async () => {
        const content = 'Some content without topic count.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'Main argument',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              // topic_count not provided
              reasoning: 'Deep explanation',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.topicCount).toBeUndefined();
      });

      it('handles zero topic_count (treated as undefined)', async () => {
        const content = 'Abstract content.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: null,
              bloom_ceiling: 'understand',
              extraction_depth: 'explanations',
              topic_count: 0,
              reasoning: 'Very abstract',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        // Zero topic count should not trigger survey override
        expect(result.contentType).toBe('conceptual');
        // Note: Implementation treats 0 as falsy, so topicCount becomes undefined
        expect(result.topicCount).toBeUndefined();
      });
    });

    describe('Bloom ceiling constraints', () => {
      it('enforces survey Bloom ceiling at understand', async () => {
        const content = 'Survey content with analyze claimed.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'survey',
              thesis_statement: null,
              bloom_ceiling: 'analyze', // Too high for survey
              extraction_depth: 'mentions',
              topic_count: 4,
              reasoning: 'Survey content',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        // Should be capped at understand for survey
        expect(result.contentType).toBe('survey');
        expect(result.bloomCeiling).toBe('understand');
      });

      it('enforces procedural Bloom ceiling at apply', async () => {
        const content = 'Procedural content with analyze claimed.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'procedural',
              thesis_statement: null,
              bloom_ceiling: 'analyze', // Too high for procedural
              extraction_depth: 'explanations',
              topic_count: 1,
              reasoning: 'Step-by-step tutorial',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        // Should be capped at apply for procedural
        expect(result.contentType).toBe('procedural');
        expect(result.bloomCeiling).toBe('apply');
      });

      it('allows conceptual content to have analyze ceiling', async () => {
        const content = 'Conceptual deep dive content.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'Deep argument',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 1,
              reasoning: 'Deep explanation',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.contentType).toBe('conceptual');
        expect(result.bloomCeiling).toBe('analyze');
      });
    });

    describe('Extraction depth', () => {
      it('sets extraction depth to mentions for survey content', async () => {
        const content = 'Quick overview content.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'survey',
              thesis_statement: null,
              bloom_ceiling: 'understand',
              extraction_depth: 'mentions',
              topic_count: 3,
              reasoning: 'Brief coverage',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.extractionDepth).toBe('mentions');
      });

      it('sets extraction depth to explanations for procedural content', async () => {
        const content = 'Detailed tutorial content.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'procedural',
              thesis_statement: null,
              bloom_ceiling: 'apply',
              extraction_depth: 'explanations',
              topic_count: 1,
              reasoning: 'Step-by-step with practice',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.extractionDepth).toBe('explanations');
      });

      it('defaults to explanations for invalid extraction depth', async () => {
        const content = 'Content with invalid extraction depth.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'Main point',
              bloom_ceiling: 'analyze',
              extraction_depth: 'invalid_depth' as never,
              topic_count: 1,
              reasoning: 'Test content',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.extractionDepth).toBe('explanations');
      });
    });

    describe('Mode multiplier', () => {
      it.each([
        ['survey', 1.5],
        ['conceptual', 2.5],
        ['procedural', 4.0],
      ] as [ContentType, number][])(
        'returns correct mode multiplier for %s content',
        async (contentType, expectedMultiplier) => {
          const content = `${contentType} content test.`;

          configureMock({
            customStructuredResponses: new Map([
              [content, {
                content_type: contentType,
                thesis_statement: null,
                bloom_ceiling: getDefaultBloomCeiling(contentType),
                extraction_depth: 'explanations',
                topic_count: 1,
                reasoning: 'Test',
              }],
            ]),
          });

          const result = await service.classifyContent(content);

          expect(result.modeMultiplier).toBe(expectedMultiplier);
        }
      );
    });

    describe('Source duration handling', () => {
      it('includes source duration in result', async () => {
        const content = 'Content with duration.';
        const durationSeconds = 1200; // 20 minutes

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'Main argument',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 2,
              reasoning: 'Deep content',
            }],
          ]),
        });

        const result = await service.classifyContent(content, durationSeconds);

        expect(result.sourceDurationSeconds).toBe(1200);
      });

      it('handles missing duration', async () => {
        const content = 'Content without duration.';

        configureMock({
          customStructuredResponses: new Map([
            [content, {
              content_type: 'conceptual',
              thesis_statement: 'Main argument',
              bloom_ceiling: 'analyze',
              extraction_depth: 'explanations',
              topic_count: 1,
              reasoning: 'Deep content',
            }],
          ]),
        });

        const result = await service.classifyContent(content);

        expect(result.sourceDurationSeconds).toBeNull();
      });
    });
  });

  describe('storeClassification', () => {
    it('stores classification result in database', async () => {
      const service = createRhetoricalRouterService({} as never, mockSupabase);
      const sourceId = 'source-123';
      const projectId = 'project-456';
      const result: Pass1Result = {
        contentType: 'conceptual',
        thesisStatement: 'Main thesis',
        bloomCeiling: 'analyze',
        modeMultiplier: 2.5,
        extractionDepth: 'explanations',
        sourceDurationSeconds: 1200,
        conceptDensity: null,
        topicCount: 2,
      };

      await service.storeClassification(sourceId, projectId, result);

      expect(mockFrom).toHaveBeenCalledWith('content_analyses');
      expect(mockInsert).toHaveBeenCalledWith({
        source_id: sourceId,
        project_id: projectId,
        content_type: 'conceptual',
        thesis_statement: 'Main thesis',
        bloom_ceiling: 'analyze',
        mode_multiplier: 2.5,
        extraction_depth: 'explanations',
        source_duration_seconds: 1200,
        concept_density: null,
        topic_count: 2,
      });
    });

    it('throws error when Supabase client is not provided', async () => {
      const service = createRhetoricalRouterService({} as never);
      const result: Pass1Result = {
        contentType: 'survey',
        thesisStatement: null,
        bloomCeiling: 'understand',
        modeMultiplier: 1.5,
        extractionDepth: 'mentions',
        sourceDurationSeconds: null,
        conceptDensity: null,
      };

      await expect(
        service.storeClassification('source-123', 'project-456', result)
      ).rejects.toThrow(RhetoricalRouterError);
      await expect(
        service.storeClassification('source-123', 'project-456', result)
      ).rejects.toThrow('Supabase client required');
    });

    it('throws error on database failure', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Database error' },
      });

      const service = createRhetoricalRouterService({} as never, mockSupabase);
      const result: Pass1Result = {
        contentType: 'procedural',
        thesisStatement: null,
        bloomCeiling: 'apply',
        modeMultiplier: 4.0,
        extractionDepth: 'explanations',
        sourceDurationSeconds: 600,
        conceptDensity: null,
      };

      await expect(
        service.storeClassification('source-123', 'project-456', result)
      ).rejects.toThrow(RhetoricalRouterError);
      await expect(
        service.storeClassification('source-123', 'project-456', result)
      ).rejects.toThrow('Failed to store classification');
    });
  });

  describe('getClassification', () => {
    it('retrieves stored classification from database', async () => {
      const storedData = {
        id: 'analysis-123',
        source_id: 'source-456',
        project_id: 'project-789',
        content_type: 'conceptual',
        thesis_statement: 'Main thesis',
        bloom_ceiling: 'analyze',
        mode_multiplier: 2.5,
        extraction_depth: 'explanations',
        source_duration_seconds: 1200,
        concept_density: 0.8,
        topic_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({ data: storedData, error: null });

      const service = createRhetoricalRouterService({} as never, mockSupabase);
      const result = await service.getClassification('source-456');

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('conceptual');
      expect(result!.thesisStatement).toBe('Main thesis');
      expect(result!.bloomCeiling).toBe('analyze');
      expect(result!.topicCount).toBe(2);
    });

    it('returns null when no classification found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const service = createRhetoricalRouterService({} as never, mockSupabase);
      const result = await service.getClassification('nonexistent-source');

      expect(result).toBeNull();
    });

    it('returns null when Supabase client is not provided', async () => {
      const service = createRhetoricalRouterService({} as never);
      const result = await service.getClassification('source-123');

      expect(result).toBeNull();
    });

    it('handles missing topic_count in stored data', async () => {
      const storedData = {
        id: 'analysis-123',
        source_id: 'source-456',
        project_id: 'project-789',
        content_type: 'survey',
        thesis_statement: null,
        bloom_ceiling: 'understand',
        mode_multiplier: 1.5,
        extraction_depth: 'mentions',
        source_duration_seconds: 300,
        concept_density: null,
        topic_count: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSingle.mockResolvedValue({ data: storedData, error: null });

      const service = createRhetoricalRouterService({} as never, mockSupabase);
      const result = await service.getClassification('source-456');

      expect(result).not.toBeNull();
      expect(result!.topicCount).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('handles AI service failures', async () => {
      configureMock({
        shouldError: true,
        errorToThrow: new Error('AI service failed'),
      });

      const service = createRhetoricalRouterService({} as never);

      await expect(service.classifyContent('Test content')).rejects.toThrow(
        RhetoricalRouterError
      );
    });

    it('throws validation error for invalid content type', async () => {
      const content = 'Content with invalid type.';

      configureMock({
        customStructuredResponses: new Map([
          [content, {
            content_type: 'invalid_type' as never,
            thesis_statement: null,
            bloom_ceiling: 'understand',
            extraction_depth: 'mentions',
            topic_count: 1,
            reasoning: 'Test',
          }],
        ]),
      });

      const service = createRhetoricalRouterService({} as never);

      await expect(service.classifyContent(content)).rejects.toThrow(
        RhetoricalRouterError
      );
      await expect(service.classifyContent(content)).rejects.toThrow(
        'Invalid content type'
      );
    });

    it('throws validation error for invalid Bloom ceiling', async () => {
      const content = 'Content with invalid Bloom level.';

      configureMock({
        customStructuredResponses: new Map([
          [content, {
            content_type: 'conceptual',
            thesis_statement: null,
            bloom_ceiling: 'invalid_bloom' as never,
            extraction_depth: 'explanations',
            topic_count: 1,
            reasoning: 'Test',
          }],
        ]),
      });

      const service = createRhetoricalRouterService({} as never);

      await expect(service.classifyContent(content)).rejects.toThrow(
        RhetoricalRouterError
      );
      await expect(service.classifyContent(content)).rejects.toThrow(
        "Invalid Bloom's ceiling"
      );
    });
  });

  describe('RhetoricalRouterError', () => {
    it('includes error code and message', () => {
      const error = new RhetoricalRouterError(
        'Test error',
        'CLASSIFICATION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('CLASSIFICATION_FAILED');
      expect(error.name).toBe('RhetoricalRouterError');
    });

    it('includes optional details', () => {
      const error = new RhetoricalRouterError(
        'Test error',
        'DATABASE_ERROR',
        { sourceId: 'source-123' }
      );

      expect(error.details).toEqual({ sourceId: 'source-123' });
    });
  });

  describe('Utility function exports', () => {
    it('getModeMultiplier returns correct values', () => {
      expect(getModeMultiplier('survey')).toBe(1.5);
      expect(getModeMultiplier('conceptual')).toBe(2.5);
      expect(getModeMultiplier('procedural')).toBe(4.0);
    });

    it('getDefaultBloomCeiling returns correct values', () => {
      expect(getDefaultBloomCeiling('survey')).toBe('understand');
      expect(getDefaultBloomCeiling('conceptual')).toBe('analyze');
      expect(getDefaultBloomCeiling('procedural')).toBe('apply');
    });
  });
});
