/**
 * Proposition Chunking Service Tests
 *
 * Tests for text decomposition into independent propositions.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIError, AI_MODEL_IDS } from '@/src/types/ai';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

// Import after mocking
import {
  createPropositionChunkingService,
  getDefaultPropositionChunkingService,
  PropositionChunkingError,
  PropositionChunkingService,
} from '../proposition-chunking-service';
import { createAIService, resetDefaultService } from '../ai-service';

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('Proposition Chunking Service', () => {
  // Store original env value
  const originalApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset default service cache
    resetDefaultService();

    // Set test API key
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Setup mock
    mockCreate = jest.fn();
    MockedAnthropic.mockImplementation(
      () =>
        ({
          messages: {
            create: mockCreate,
          },
        }) as unknown as Anthropic
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original env
    if (originalApiKey !== undefined) {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    }
  });

  describe('createPropositionChunkingService', () => {
    it('creates service with environment API key', () => {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'env-api-key';

      const service = createPropositionChunkingService();

      expect(service).toBeDefined();
      expect(service.decomposeIntoPropositions).toBeInstanceOf(Function);
    });

    it('creates service with provided AI service', () => {
      const aiService = createAIService({ apiKey: 'custom-key' });
      const service = createPropositionChunkingService(aiService);

      expect(service).toBeDefined();
      expect(service.decomposeIntoPropositions).toBeInstanceOf(Function);
    });

    it('throws PropositionChunkingError when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createPropositionChunkingService()).toThrow(
        PropositionChunkingError
      );
      expect(() => createPropositionChunkingService()).toThrow(
        'API key is required'
      );
    });

    it('throws error with correct code when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      try {
        createPropositionChunkingService();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PropositionChunkingError);
        expect((error as PropositionChunkingError).code).toBe('API_KEY_MISSING');
      }
    });
  });

  describe('decomposeIntoPropositions', () => {
    let service: PropositionChunkingService;

    beforeEach(() => {
      service = createPropositionChunkingService();
    });

    it('decomposes text into propositions', async () => {
      const propositions = [
        'Machine learning is a subset of artificial intelligence.',
        'Machine learning enables computers to learn from data.',
        'Machine learning uses algorithms to identify patterns.',
      ];

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(propositions) }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      });

      const result = await service.decomposeIntoPropositions(
        'Machine learning is a subset of AI that enables computers to learn from data using algorithms.'
      );

      expect(result).toEqual(propositions);
      expect(result).toHaveLength(3);
    });

    it('returns empty array for empty input', async () => {
      const result = await service.decomposeIntoPropositions('');

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace-only input', async () => {
      const result = await service.decomposeIntoPropositions('   \n\t  ');

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('uses claude-haiku model for cost efficiency', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '["Test proposition."]' }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await service.decomposeIntoPropositions('Test content.');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODEL_IDS['claude-haiku'],
        })
      );
    });

    it('uses low temperature for consistent output', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '["Test proposition."]' }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await service.decomposeIntoPropositions('Test content.');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        })
      );
    });

    it('handles JSON wrapped in markdown code blocks', async () => {
      const propositions = ['First proposition.', 'Second proposition.'];
      const wrappedResponse =
        '```json\n' + JSON.stringify(propositions) + '\n```';

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: wrappedResponse }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const result = await service.decomposeIntoPropositions('Some text.');

      expect(result).toEqual(propositions);
    });

    it('filters out empty propositions', async () => {
      const propositions = [
        'Valid proposition.',
        '',
        '   ',
        'Another valid one.',
      ];

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(propositions) }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const result = await service.decomposeIntoPropositions('Some text.');

      expect(result).toEqual(['Valid proposition.', 'Another valid one.']);
    });

    it('trims whitespace from propositions', async () => {
      const propositions = [
        '  Leading space.',
        'Trailing space.  ',
        '  Both spaces  ',
      ];

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(propositions) }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const result = await service.decomposeIntoPropositions('Some text.');

      expect(result).toEqual([
        'Leading space.',
        'Trailing space.',
        'Both spaces',
      ]);
    });

    it('throws PropositionChunkingError on AI service error', async () => {
      // Use 400 error which is not retryable
      const apiError = new Error('Bad Request');
      (apiError as unknown as { status: number }).status = 400;

      mockCreate.mockRejectedValue(apiError);

      await expect(
        service.decomposeIntoPropositions('Some text.')
      ).rejects.toThrow(PropositionChunkingError);
    });

    it('throws PropositionChunkingError with correct code on failure', async () => {
      // Use 400 error which is not retryable
      const apiError = new Error('Bad Request');
      (apiError as unknown as { status: number }).status = 400;

      mockCreate.mockRejectedValue(apiError);

      await expect(
        service.decomposeIntoPropositions('Some text.')
      ).rejects.toMatchObject({
        code: 'DECOMPOSITION_FAILED',
      });
    });

    it('throws PropositionChunkingError with details on failure', async () => {
      // Use 401 error which is not retryable
      const apiError = new Error('Unauthorized');
      (apiError as unknown as { status: number }).status = 401;

      mockCreate.mockRejectedValue(apiError);

      try {
        await service.decomposeIntoPropositions('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PropositionChunkingError);
        expect((error as PropositionChunkingError).code).toBe(
          'DECOMPOSITION_FAILED'
        );
        expect((error as PropositionChunkingError).details).toBeDefined();
      }
    });

    it('handles non-array response with validation error', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"not": "an array"}' }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      await expect(
        service.decomposeIntoPropositions('Some text.')
      ).rejects.toMatchObject({
        code: 'DECOMPOSITION_FAILED',
      });
    });
  });

  describe('chunking behavior', () => {
    let service: PropositionChunkingService;

    beforeEach(() => {
      service = createPropositionChunkingService();
    });

    it('processes large text in chunks', async () => {
      // Create text longer than MAX_CONTENT_LENGTH (30000 chars)
      const longText = 'A'.repeat(35000);

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '["Chunk 1 proposition."]' }],
          model: AI_MODEL_IDS['claude-haiku'],
          usage: { input_tokens: 1000, output_tokens: 10 },
          stop_reason: 'end_turn',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '["Chunk 2 proposition."]' }],
          model: AI_MODEL_IDS['claude-haiku'],
          usage: { input_tokens: 500, output_tokens: 10 },
          stop_reason: 'end_turn',
        });

      const result = await service.decomposeIntoPropositions(longText);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        'Chunk 1 proposition.',
        'Chunk 2 proposition.',
      ]);
    });

    it('combines propositions from multiple chunks', async () => {
      const longText = 'A'.repeat(35000);

      mockCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'text', text: '["Prop 1.", "Prop 2."]' },
          ],
          model: AI_MODEL_IDS['claude-haiku'],
          usage: { input_tokens: 1000, output_tokens: 10 },
          stop_reason: 'end_turn',
        })
        .mockResolvedValueOnce({
          content: [
            { type: 'text', text: '["Prop 3.", "Prop 4."]' },
          ],
          model: AI_MODEL_IDS['claude-haiku'],
          usage: { input_tokens: 500, output_tokens: 10 },
          stop_reason: 'end_turn',
        });

      const result = await service.decomposeIntoPropositions(longText);

      expect(result).toEqual(['Prop 1.', 'Prop 2.', 'Prop 3.', 'Prop 4.']);
    });
  });

  describe('getDefaultPropositionChunkingService', () => {
    it('returns a service instance', () => {
      const service = getDefaultPropositionChunkingService();

      expect(service).toBeDefined();
      expect(service.decomposeIntoPropositions).toBeInstanceOf(Function);
    });

    it('throws when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => getDefaultPropositionChunkingService()).toThrow(
        PropositionChunkingError
      );
    });
  });

  describe('PropositionChunkingError', () => {
    it('has correct name property', () => {
      const error = new PropositionChunkingError(
        'Test error',
        'DECOMPOSITION_FAILED'
      );

      expect(error.name).toBe('PropositionChunkingError');
    });

    it('has correct code property', () => {
      const error = new PropositionChunkingError(
        'Test error',
        'VALIDATION_ERROR'
      );

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('stores details', () => {
      const error = new PropositionChunkingError(
        'Test error',
        'DECOMPOSITION_FAILED',
        { key: 'value' }
      );

      expect(error.details).toEqual({ key: 'value' });
    });

    it('is instance of Error', () => {
      const error = new PropositionChunkingError(
        'Test error',
        'API_KEY_MISSING'
      );

      expect(error).toBeInstanceOf(Error);
    });
  });
});
