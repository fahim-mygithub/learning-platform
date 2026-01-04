/**
 * Text Chunking Pipeline Tests
 *
 * Tests for the orchestration of proposition decomposition and semantic boundary detection.
 */

import {
  createTextChunkingPipeline,
  getDefaultTextChunkingPipeline,
  TextChunkingPipelineError,
  TextChunkingPipeline,
  TextChunk,
} from '../text-chunking-pipeline';
import { PropositionChunkingService, PropositionChunkingError } from '../proposition-chunking-service';
import { SemanticBoundaryService, SemanticBoundaryError } from '../semantic-boundary-service';

describe('Text Chunking Pipeline', () => {
  // Store original env values
  const originalAnthropicKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const originalOpenAIKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  // Mock services
  let mockPropositionService: jest.Mocked<PropositionChunkingService>;
  let mockBoundaryService: jest.Mocked<SemanticBoundaryService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set test API keys
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-openai-key';

    // Create mock services
    mockPropositionService = {
      decomposeIntoPropositions: jest.fn(),
    };

    mockBoundaryService = {
      findBoundaries: jest.fn(),
      findBoundariesWithMetadata: jest.fn(),
    };
  });

  afterEach(() => {
    // Restore original env
    if (originalAnthropicKey !== undefined) {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = originalAnthropicKey;
    } else {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    }
    if (originalOpenAIKey !== undefined) {
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalOpenAIKey;
    } else {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    }
  });

  describe('createTextChunkingPipeline', () => {
    it('creates pipeline with provided services', () => {
      const pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });

      expect(pipeline).toBeDefined();
      expect(pipeline.chunkText).toBeInstanceOf(Function);
    });

    it('creates pipeline with custom chunk ID prefix', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'Single proposition.',
      ]);

      const pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
        chunkIdPrefix: 'custom-prefix',
      });

      const result = await pipeline.chunkText('Some text.');

      expect(result[0].id).toBe('custom-prefix-0');
    });

    it('throws TextChunkingPipelineError when Anthropic API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createTextChunkingPipeline()).toThrow(
        TextChunkingPipelineError
      );
      expect(() => createTextChunkingPipeline()).toThrow(
        /Failed to initialize proposition service/
      );
    });

    it('throws TextChunkingPipelineError when OpenAI API key is missing', () => {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      expect(() => createTextChunkingPipeline()).toThrow(
        TextChunkingPipelineError
      );
      expect(() => createTextChunkingPipeline()).toThrow(
        /Failed to initialize boundary service/
      );
    });

    it('throws error with API_KEY_MISSING code', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      try {
        createTextChunkingPipeline();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        expect((error as TextChunkingPipelineError).code).toBe('API_KEY_MISSING');
      }
    });
  });

  describe('chunkText', () => {
    let pipeline: TextChunkingPipeline;

    beforeEach(() => {
      pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });
    });

    it('returns empty array for empty input', async () => {
      const result = await pipeline.chunkText('');

      expect(result).toEqual([]);
      expect(mockPropositionService.decomposeIntoPropositions).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace-only input', async () => {
      const result = await pipeline.chunkText('   \n\t  ');

      expect(result).toEqual([]);
      expect(mockPropositionService.decomposeIntoPropositions).not.toHaveBeenCalled();
    });

    it('returns empty array when no propositions are extracted', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([]);

      const result = await pipeline.chunkText('Some text.');

      expect(result).toEqual([]);
    });

    it('returns single chunk for single proposition', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'Single proposition here.',
      ]);

      const result = await pipeline.chunkText('Some text.');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'chunk-0',
        text: 'Single proposition here.',
        propositions: ['Single proposition here.'],
        startIndex: 0,
        endIndex: 1,
      });
      expect(mockBoundaryService.findBoundaries).not.toHaveBeenCalled();
    });

    it('groups propositions without boundaries into single chunk', async () => {
      const propositions = [
        'Machine learning is a subset of AI.',
        'Machine learning uses algorithms to learn.',
        'Machine learning enables pattern recognition.',
      ];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([]);

      const result = await pipeline.chunkText('ML is a subset of AI that uses algorithms for pattern recognition.');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'chunk-0',
        text: propositions.join(' '),
        propositions: propositions,
        startIndex: 0,
        endIndex: 3,
      });
    });

    it('splits propositions at detected boundaries', async () => {
      const propositions = [
        'Machine learning is a subset of AI.',
        'Neural networks are used in ML.',
        'The French Revolution began in 1789.',
        'It led to major political changes.',
      ];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2]); // Boundary before index 2

      const result = await pipeline.chunkText('Some mixed content.');

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: 'chunk-0',
        text: 'Machine learning is a subset of AI. Neural networks are used in ML.',
        propositions: ['Machine learning is a subset of AI.', 'Neural networks are used in ML.'],
        startIndex: 0,
        endIndex: 2,
      });

      expect(result[1]).toEqual({
        id: 'chunk-1',
        text: 'The French Revolution began in 1789. It led to major political changes.',
        propositions: ['The French Revolution began in 1789.', 'It led to major political changes.'],
        startIndex: 2,
        endIndex: 4,
      });
    });

    it('handles multiple boundaries correctly', async () => {
      const propositions = [
        'Topic A first point.',
        'Topic A second point.',
        'Topic B first point.',
        'Topic B second point.',
        'Topic C first point.',
        'Topic C second point.',
      ];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2, 4]); // Boundaries at 2 and 4

      const result = await pipeline.chunkText('Content with multiple topics.');

      expect(result).toHaveLength(3);

      expect(result[0].startIndex).toBe(0);
      expect(result[0].endIndex).toBe(2);
      expect(result[0].propositions).toHaveLength(2);

      expect(result[1].startIndex).toBe(2);
      expect(result[1].endIndex).toBe(4);
      expect(result[1].propositions).toHaveLength(2);

      expect(result[2].startIndex).toBe(4);
      expect(result[2].endIndex).toBe(6);
      expect(result[2].propositions).toHaveLength(2);
    });

    it('handles unsorted boundaries correctly', async () => {
      const propositions = ['A.', 'B.', 'C.', 'D.', 'E.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([4, 2]); // Unsorted boundaries

      const result = await pipeline.chunkText('Content.');

      expect(result).toHaveLength(3);
      expect(result[0].propositions).toEqual(['A.', 'B.']);
      expect(result[1].propositions).toEqual(['C.', 'D.']);
      expect(result[2].propositions).toEqual(['E.']);
    });

    it('ignores invalid boundaries (at 0)', async () => {
      const propositions = ['A.', 'B.', 'C.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([0, 2]); // 0 is invalid

      const result = await pipeline.chunkText('Content.');

      expect(result).toHaveLength(2);
      expect(result[0].propositions).toEqual(['A.', 'B.']);
      expect(result[1].propositions).toEqual(['C.']);
    });

    it('ignores invalid boundaries (beyond proposition length)', async () => {
      const propositions = ['A.', 'B.', 'C.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2, 5, 10]); // 5 and 10 are invalid

      const result = await pipeline.chunkText('Content.');

      expect(result).toHaveLength(2);
      expect(result[0].propositions).toEqual(['A.', 'B.']);
      expect(result[1].propositions).toEqual(['C.']);
    });

    it('handles duplicate boundaries correctly', async () => {
      const propositions = ['A.', 'B.', 'C.', 'D.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2, 2, 2]); // Duplicate boundaries

      const result = await pipeline.chunkText('Content.');

      expect(result).toHaveLength(2);
      expect(result[0].propositions).toEqual(['A.', 'B.']);
      expect(result[1].propositions).toEqual(['C.', 'D.']);
    });

    it('generates unique sequential chunk IDs', async () => {
      const propositions = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2, 4]);

      const result = await pipeline.chunkText('Content.');

      expect(result[0].id).toBe('chunk-0');
      expect(result[1].id).toBe('chunk-1');
      expect(result[2].id).toBe('chunk-2');
    });

    it('calls proposition service with input text', async () => {
      const inputText = 'This is the input text to process.';

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'Single prop.',
      ]);

      await pipeline.chunkText(inputText);

      expect(mockPropositionService.decomposeIntoPropositions).toHaveBeenCalledWith(inputText);
    });

    it('calls boundary service with extracted propositions', async () => {
      const propositions = ['First.', 'Second.', 'Third.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([]);

      await pipeline.chunkText('Some text.');

      expect(mockBoundaryService.findBoundaries).toHaveBeenCalledWith(propositions);
    });
  });

  describe('error handling', () => {
    let pipeline: TextChunkingPipeline;

    beforeEach(() => {
      pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });
    });

    it('throws TextChunkingPipelineError on proposition service failure', async () => {
      mockPropositionService.decomposeIntoPropositions.mockRejectedValue(
        new PropositionChunkingError('API failed', 'DECOMPOSITION_FAILED')
      );

      await expect(pipeline.chunkText('Some text.')).rejects.toThrow(
        TextChunkingPipelineError
      );
    });

    it('throws with DECOMPOSITION_FAILED code on proposition service error', async () => {
      mockPropositionService.decomposeIntoPropositions.mockRejectedValue(
        new PropositionChunkingError('API failed', 'DECOMPOSITION_FAILED')
      );

      try {
        await pipeline.chunkText('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        expect((error as TextChunkingPipelineError).code).toBe('DECOMPOSITION_FAILED');
      }
    });

    it('throws TextChunkingPipelineError on boundary service failure', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'First.',
        'Second.',
      ]);
      mockBoundaryService.findBoundaries.mockRejectedValue(
        new SemanticBoundaryError('Embedding failed', 'EMBEDDING_FAILED')
      );

      await expect(pipeline.chunkText('Some text.')).rejects.toThrow(
        TextChunkingPipelineError
      );
    });

    it('throws with BOUNDARY_DETECTION_FAILED code on boundary service error', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'First.',
        'Second.',
      ]);
      mockBoundaryService.findBoundaries.mockRejectedValue(
        new SemanticBoundaryError('Embedding failed', 'EMBEDDING_FAILED')
      );

      try {
        await pipeline.chunkText('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        expect((error as TextChunkingPipelineError).code).toBe('BOUNDARY_DETECTION_FAILED');
      }
    });

    it('preserves original error in details', async () => {
      const originalError = new PropositionChunkingError(
        'Original error message',
        'DECOMPOSITION_FAILED',
        { extra: 'data' }
      );

      mockPropositionService.decomposeIntoPropositions.mockRejectedValue(originalError);

      try {
        await pipeline.chunkText('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        const pipelineError = error as TextChunkingPipelineError;
        expect(pipelineError.details).toBeDefined();
        expect(pipelineError.details?.cause).toBe(originalError);
        expect(pipelineError.details?.originalCode).toBe('DECOMPOSITION_FAILED');
      }
    });

    it('handles non-custom errors from proposition service', async () => {
      mockPropositionService.decomposeIntoPropositions.mockRejectedValue(
        new Error('Generic error')
      );

      try {
        await pipeline.chunkText('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        expect((error as TextChunkingPipelineError).code).toBe('DECOMPOSITION_FAILED');
        expect((error as TextChunkingPipelineError).message).toContain('Generic error');
      }
    });

    it('handles non-custom errors from boundary service', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'First.',
        'Second.',
      ]);
      mockBoundaryService.findBoundaries.mockRejectedValue(
        new Error('Network error')
      );

      try {
        await pipeline.chunkText('Some text.');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TextChunkingPipelineError);
        expect((error as TextChunkingPipelineError).code).toBe('BOUNDARY_DETECTION_FAILED');
        expect((error as TextChunkingPipelineError).message).toContain('Network error');
      }
    });
  });

  describe('getDefaultTextChunkingPipeline', () => {
    it('returns a pipeline instance with valid API keys', () => {
      const pipeline = getDefaultTextChunkingPipeline();

      expect(pipeline).toBeDefined();
      expect(pipeline.chunkText).toBeInstanceOf(Function);
    });

    it('throws when Anthropic API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => getDefaultTextChunkingPipeline()).toThrow(
        TextChunkingPipelineError
      );
    });

    it('throws when OpenAI API key is missing', () => {
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      expect(() => getDefaultTextChunkingPipeline()).toThrow(
        TextChunkingPipelineError
      );
    });
  });

  describe('TextChunkingPipelineError', () => {
    it('has correct name property', () => {
      const error = new TextChunkingPipelineError(
        'Test error',
        'DECOMPOSITION_FAILED'
      );

      expect(error.name).toBe('TextChunkingPipelineError');
    });

    it('has correct code property', () => {
      const error = new TextChunkingPipelineError(
        'Test error',
        'VALIDATION_ERROR'
      );

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('stores details', () => {
      const error = new TextChunkingPipelineError(
        'Test error',
        'BOUNDARY_DETECTION_FAILED',
        { key: 'value' }
      );

      expect(error.details).toEqual({ key: 'value' });
    });

    it('is instance of Error', () => {
      const error = new TextChunkingPipelineError(
        'Test error',
        'API_KEY_MISSING'
      );

      expect(error).toBeInstanceOf(Error);
    });

    it('supports all error codes', () => {
      const codes: Array<TextChunkingPipelineError['code']> = [
        'API_KEY_MISSING',
        'DECOMPOSITION_FAILED',
        'BOUNDARY_DETECTION_FAILED',
        'EMPTY_CONTENT',
        'VALIDATION_ERROR',
      ];

      codes.forEach((code) => {
        const error = new TextChunkingPipelineError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });

  describe('TextChunk interface', () => {
    it('contains all required properties', async () => {
      mockPropositionService.decomposeIntoPropositions.mockResolvedValue([
        'First proposition.',
        'Second proposition.',
      ]);
      mockBoundaryService.findBoundaries.mockResolvedValue([]);

      const pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });

      const chunks = await pipeline.chunkText('Some text.');
      const chunk = chunks[0];

      // Verify all properties exist and have correct types
      expect(typeof chunk.id).toBe('string');
      expect(typeof chunk.text).toBe('string');
      expect(Array.isArray(chunk.propositions)).toBe(true);
      expect(typeof chunk.startIndex).toBe('number');
      expect(typeof chunk.endIndex).toBe('number');
    });

    it('has text that combines all propositions', async () => {
      const propositions = ['First.', 'Second.', 'Third.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([]);

      const pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });

      const chunks = await pipeline.chunkText('Some text.');

      expect(chunks[0].text).toBe('First. Second. Third.');
    });

    it('has startIndex and endIndex that correctly slice propositions', async () => {
      const propositions = ['A.', 'B.', 'C.', 'D.'];

      mockPropositionService.decomposeIntoPropositions.mockResolvedValue(propositions);
      mockBoundaryService.findBoundaries.mockResolvedValue([2]);

      const pipeline = createTextChunkingPipeline({
        propositionService: mockPropositionService,
        boundaryService: mockBoundaryService,
      });

      const chunks = await pipeline.chunkText('Some text.');

      // Verify indices can be used to slice original array
      expect(propositions.slice(chunks[0].startIndex, chunks[0].endIndex)).toEqual(
        chunks[0].propositions
      );
      expect(propositions.slice(chunks[1].startIndex, chunks[1].endIndex)).toEqual(
        chunks[1].propositions
      );
    });
  });
});
