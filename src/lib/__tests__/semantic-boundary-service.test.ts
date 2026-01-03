/**
 * Semantic Boundary Service Tests
 *
 * Tests for finding topic shift boundaries using OpenAI embeddings.
 */

import OpenAI from 'openai';

// Mock the OpenAI SDK
jest.mock('openai');

// Import after mocking
import {
  createSemanticBoundaryService,
  getDefaultSemanticBoundaryService,
  SemanticBoundaryError,
  SemanticBoundaryService,
  cosineSimilarity,
  BoundaryResult,
} from '../semantic-boundary-service';

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('Semantic Boundary Service', () => {
  // Store original env value
  const originalApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set test API key
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-openai-api-key';

    // Setup mock
    mockCreate = jest.fn();
    MockedOpenAI.mockImplementation(
      () =>
        ({
          embeddings: {
            create: mockCreate,
          },
        }) as unknown as OpenAI
    );
  });

  afterEach(() => {
    // Restore original env
    if (originalApiKey !== undefined) {
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    }
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('returns -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1);
    });

    it('returns 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0);
    });

    it('calculates correct similarity for arbitrary vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      // Manual calculation:
      // dot product: 1*4 + 2*5 + 3*6 = 32
      // magnitude1: sqrt(1 + 4 + 9) = sqrt(14)
      // magnitude2: sqrt(16 + 25 + 36) = sqrt(77)
      // cosine: 32 / (sqrt(14) * sqrt(77)) ≈ 0.9746
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.9746, 3);
    });

    it('handles zero vectors by returning 0', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('throws error for vectors of different lengths', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow(SemanticBoundaryError);
      expect(() => cosineSimilarity(vec1, vec2)).toThrow(
        'Vectors must have the same length'
      );
    });

    it('throws error for empty vectors', () => {
      expect(() => cosineSimilarity([], [])).toThrow(SemanticBoundaryError);
      expect(() => cosineSimilarity([], [])).toThrow('Vectors cannot be empty');
    });
  });

  describe('createSemanticBoundaryService', () => {
    it('creates service with environment API key', () => {
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'env-api-key';

      const service = createSemanticBoundaryService();

      expect(service).toBeDefined();
      expect(service.findBoundaries).toBeInstanceOf(Function);
      expect(service.findBoundariesWithMetadata).toBeInstanceOf(Function);
    });

    it('creates service with provided API key', () => {
      const service = createSemanticBoundaryService({ apiKey: 'custom-key' });

      expect(service).toBeDefined();
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'custom-key' });
    });

    it('throws SemanticBoundaryError when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      expect(() => createSemanticBoundaryService()).toThrow(
        SemanticBoundaryError
      );
      expect(() => createSemanticBoundaryService()).toThrow(
        'OpenAI API key is required'
      );
    });

    it('throws error with correct code when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      try {
        createSemanticBoundaryService();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SemanticBoundaryError);
        expect((error as SemanticBoundaryError).code).toBe('API_KEY_MISSING');
      }
    });

    it('throws error for empty API key', () => {
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = '   ';

      expect(() => createSemanticBoundaryService()).toThrow(
        SemanticBoundaryError
      );
    });
  });

  describe('findBoundaries', () => {
    let service: SemanticBoundaryService;

    beforeEach(() => {
      service = createSemanticBoundaryService();
    });

    it('returns empty array for empty input', async () => {
      const result = await service.findBoundaries([]);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns empty array for single proposition', async () => {
      const result = await service.findBoundaries(['Only one proposition.']);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns empty array for propositions that are all empty', async () => {
      const result = await service.findBoundaries(['', '   ', '\t\n']);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('detects boundary between unrelated topics', async () => {
      const propositions = [
        'Machine learning uses algorithms to learn from data.',
        'Neural networks are inspired by the human brain.',
        'The French Revolution began in 1789.',
        'It led to major political changes in France.',
      ];

      // Mock embeddings: first two similar, topic shift, last two similar
      const embedding1 = [0.9, 0.1, 0.0]; // ML topic
      const embedding2 = [0.85, 0.15, 0.0]; // ML topic (similar)
      const embedding3 = [0.0, 0.1, 0.9]; // History topic (different)
      const embedding4 = [0.05, 0.05, 0.9]; // History topic (similar)

      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: embedding1 },
          { index: 1, embedding: embedding2 },
          { index: 2, embedding: embedding3 },
          { index: 3, embedding: embedding4 },
        ],
      });

      const result = await service.findBoundaries(propositions);

      // Should detect boundary at index 2 (between ML and History)
      expect(result).toContain(2);
    });

    it('returns no boundaries for highly similar propositions', async () => {
      const propositions = [
        'Python is a programming language.',
        'Python is known for its readability.',
        'Python supports multiple paradigms.',
      ];

      // All embeddings are similar
      const embedding1 = [0.9, 0.1, 0.0];
      const embedding2 = [0.88, 0.12, 0.0];
      const embedding3 = [0.87, 0.13, 0.0];

      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: embedding1 },
          { index: 1, embedding: embedding2 },
          { index: 2, embedding: embedding3 },
        ],
      });

      const result = await service.findBoundaries(propositions);

      // No boundaries - all similar
      expect(result).toEqual([]);
    });

    it('uses text-embedding-3-small model', async () => {
      const propositions = ['First.', 'Second.'];

      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.5, 0.5] },
          { index: 1, embedding: [0.5, 0.5] },
        ],
      });

      await service.findBoundaries(propositions);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: propositions,
      });
    });

    it('handles API error gracefully', async () => {
      const propositions = ['First.', 'Second.'];

      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(service.findBoundaries(propositions)).rejects.toThrow(
        SemanticBoundaryError
      );
      await expect(service.findBoundaries(propositions)).rejects.toMatchObject({
        code: 'EMBEDDING_FAILED',
      });
    });

    it('filters out empty propositions before processing', async () => {
      const propositions = ['Valid first.', '', 'Valid second.', '   '];

      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.5, 0.5] },
          { index: 1, embedding: [0.5, 0.5] },
        ],
      });

      await service.findBoundaries(propositions);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['Valid first.', 'Valid second.'],
      });
    });
  });

  describe('findBoundariesWithMetadata', () => {
    let service: SemanticBoundaryService;

    beforeEach(() => {
      service = createSemanticBoundaryService();
    });

    it('returns full metadata including similarities', async () => {
      const propositions = [
        'Machine learning is about patterns.',
        'Deep learning uses neural networks.',
        'The Renaissance was a cultural movement.',
      ];

      const embedding1 = [0.9, 0.1, 0.0];
      const embedding2 = [0.85, 0.15, 0.0];
      const embedding3 = [0.0, 0.1, 0.9];

      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: embedding1 },
          { index: 1, embedding: embedding2 },
          { index: 2, embedding: embedding3 },
        ],
      });

      const result = await service.findBoundariesWithMetadata(propositions);

      expect(result.similarities).toHaveLength(2);
      expect(result.meanSimilarity).toBeGreaterThan(0);
      expect(result.stdDevSimilarity).toBeGreaterThan(0);
      expect(result.threshold).toBeDefined();
    });

    it('returns empty result for empty input', async () => {
      const result = await service.findBoundariesWithMetadata([]);

      expect(result).toEqual({
        boundaries: [],
        similarities: [],
        meanSimilarity: 0,
        stdDevSimilarity: 0,
        threshold: 0,
      });
    });

    it('calculates correct similarity values', async () => {
      const propositions = ['First.', 'Second.', 'Third.'];

      // Orthogonal embeddings - similarity should be 0
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [1, 0, 0] },
          { index: 1, embedding: [0, 1, 0] },
          { index: 2, embedding: [0, 0, 1] },
        ],
      });

      const result = await service.findBoundariesWithMetadata(propositions);

      // Both consecutive pairs should have similarity ~0
      expect(result.similarities[0]).toBeCloseTo(0);
      expect(result.similarities[1]).toBeCloseTo(0);
    });
  });

  describe('batching behavior', () => {
    let service: SemanticBoundaryService;

    beforeEach(() => {
      // Create service with small batch size for testing
      service = createSemanticBoundaryService({ batchSize: 2 });
    });

    it('batches large numbers of propositions', async () => {
      const propositions = ['P1.', 'P2.', 'P3.', 'P4.', 'P5.'];

      // First batch (P1, P2)
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.5, 0.5] },
          { index: 1, embedding: [0.5, 0.5] },
        ],
      });

      // Second batch (P3, P4)
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.5, 0.5] },
          { index: 1, embedding: [0.5, 0.5] },
        ],
      });

      // Third batch (P5)
      mockCreate.mockResolvedValueOnce({
        data: [{ index: 0, embedding: [0.5, 0.5] }],
      });

      await service.findBoundaries(propositions);

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        model: 'text-embedding-3-small',
        input: ['P1.', 'P2.'],
      });
      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        model: 'text-embedding-3-small',
        input: ['P3.', 'P4.'],
      });
      expect(mockCreate).toHaveBeenNthCalledWith(3, {
        model: 'text-embedding-3-small',
        input: ['P5.'],
      });
    });
  });

  describe('threshold configuration', () => {
    it('respects custom threshold standard deviations', async () => {
      // Create service with stricter threshold (2 std devs)
      const service = createSemanticBoundaryService({ thresholdStdDevs: 2.0 });

      const propositions = ['Topic A.', 'Still A.', 'Topic B.'];

      // Moderate difference
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.9, 0.1] },
          { index: 1, embedding: [0.85, 0.15] },
          { index: 2, embedding: [0.3, 0.7] },
        ],
      });

      const result = await service.findBoundariesWithMetadata(propositions);

      // With stricter threshold, fewer boundaries detected
      expect(result.boundaries.length).toBeLessThanOrEqual(1);
    });

    it('respects minimum similarity drop setting', async () => {
      // Create service with high minimum drop requirement
      const service = createSemanticBoundaryService({ minSimilarityDrop: 0.5 });

      const propositions = ['Topic A.', 'Still A.', 'Topic B.'];

      // Small difference - shouldn't trigger boundary
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 0, embedding: [0.9, 0.1] },
          { index: 1, embedding: [0.85, 0.15] },
          { index: 2, embedding: [0.7, 0.3] },
        ],
      });

      const result = await service.findBoundaries(propositions);

      // With high minimum drop, small variations shouldn't be boundaries
      expect(result.length).toBe(0);
    });
  });

  describe('getDefaultSemanticBoundaryService', () => {
    it('returns a service instance', () => {
      const service = getDefaultSemanticBoundaryService();

      expect(service).toBeDefined();
      expect(service.findBoundaries).toBeInstanceOf(Function);
    });

    it('throws when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      expect(() => getDefaultSemanticBoundaryService()).toThrow(
        SemanticBoundaryError
      );
    });
  });

  describe('SemanticBoundaryError', () => {
    it('has correct name property', () => {
      const error = new SemanticBoundaryError(
        'Test error',
        'EMBEDDING_FAILED'
      );

      expect(error.name).toBe('SemanticBoundaryError');
    });

    it('has correct code property', () => {
      const error = new SemanticBoundaryError(
        'Test error',
        'VALIDATION_ERROR'
      );

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('stores details', () => {
      const error = new SemanticBoundaryError(
        'Test error',
        'EMBEDDING_FAILED',
        { key: 'value' }
      );

      expect(error.details).toEqual({ key: 'value' });
    });

    it('is instance of Error', () => {
      const error = new SemanticBoundaryError(
        'Test error',
        'API_KEY_MISSING'
      );

      expect(error).toBeInstanceOf(Error);
    });
  });
});
