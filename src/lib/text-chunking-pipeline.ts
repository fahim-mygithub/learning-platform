/**
 * Text Chunking Pipeline
 *
 * Orchestrates proposition decomposition and semantic boundary detection to
 * create semantically coherent text chunks from raw content.
 *
 * The pipeline:
 * 1. Decomposes raw text into independent, self-contained propositions
 * 2. Uses embeddings to detect topic shift boundaries between propositions
 * 3. Groups propositions into semantic chunks based on detected boundaries
 *
 * This produces chunks that are:
 * - Semantically coherent (grouped by topic)
 * - Self-contained (each proposition makes sense on its own)
 * - Optimized for downstream processing (e.g., RAG, summarization)
 *
 * @example
 * ```ts
 * import { createTextChunkingPipeline } from '@/src/lib/text-chunking-pipeline';
 *
 * const pipeline = createTextChunkingPipeline();
 *
 * const chunks = await pipeline.chunkText(`
 *   Machine learning is a subset of AI. It uses algorithms to learn from data.
 *   The French Revolution began in 1789. It led to major political changes.
 * `);
 *
 * // Returns chunks grouped by topic:
 * // [
 * //   {
 * //     id: "chunk-0",
 * //     text: "Machine learning is a subset of artificial intelligence. Machine learning uses algorithms to learn from data.",
 * //     propositions: ["Machine learning is a subset of artificial intelligence.", "Machine learning uses algorithms to learn from data."],
 * //     startIndex: 0,
 * //     endIndex: 2
 * //   },
 * //   {
 * //     id: "chunk-1",
 * //     text: "The French Revolution began in 1789. The French Revolution led to major political changes in France.",
 * //     propositions: ["The French Revolution began in 1789.", "The French Revolution led to major political changes in France."],
 * //     startIndex: 2,
 * //     endIndex: 4
 * //   }
 * // ]
 * ```
 */

import {
  createPropositionChunkingService,
  PropositionChunkingService,
  PropositionChunkingError,
} from './proposition-chunking-service';
import {
  createSemanticBoundaryService,
  SemanticBoundaryService,
  SemanticBoundaryError,
} from './semantic-boundary-service';

/**
 * Error codes for text chunking pipeline operations
 */
export type TextChunkingErrorCode =
  | 'API_KEY_MISSING'
  | 'DECOMPOSITION_FAILED'
  | 'BOUNDARY_DETECTION_FAILED'
  | 'EMPTY_CONTENT'
  | 'VALIDATION_ERROR';

/**
 * Custom error class for text chunking pipeline operations
 */
export class TextChunkingPipelineError extends Error {
  code: TextChunkingErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: TextChunkingErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TextChunkingPipelineError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Represents a chunk of text containing related propositions
 */
export interface TextChunk {
  /**
   * Unique identifier for this chunk
   */
  id: string;

  /**
   * Combined text of all propositions in this chunk
   */
  text: string;

  /**
   * Individual propositions contained in this chunk
   */
  propositions: string[];

  /**
   * Start index in the original propositions array (inclusive)
   */
  startIndex: number;

  /**
   * End index in the original propositions array (exclusive)
   */
  endIndex: number;
}

/**
 * Text chunking pipeline interface
 */
export interface TextChunkingPipeline {
  /**
   * Process raw text into semantically coherent chunks
   *
   * @param text - Raw text to process
   * @returns Array of text chunks grouped by semantic boundaries
   * @throws TextChunkingPipelineError on processing failures
   */
  chunkText(text: string): Promise<TextChunk[]>;
}

/**
 * Configuration options for the text chunking pipeline
 */
export interface TextChunkingPipelineConfig {
  /**
   * Proposition chunking service instance
   * If not provided, a default service will be created
   */
  propositionService?: PropositionChunkingService;

  /**
   * Semantic boundary detection service instance
   * If not provided, a default service will be created
   */
  boundaryService?: SemanticBoundaryService;

  /**
   * Prefix for chunk IDs
   * @default "chunk"
   */
  chunkIdPrefix?: string;
}

/**
 * Generate a unique chunk ID
 *
 * @param prefix - ID prefix
 * @param index - Chunk index
 * @returns Unique chunk ID string
 */
function generateChunkId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/**
 * Group propositions by semantic boundaries into chunks
 *
 * @param propositions - Array of propositions
 * @param boundaries - Array of boundary indices
 * @param chunkIdPrefix - Prefix for chunk IDs
 * @returns Array of TextChunk objects
 */
function groupPropositionsIntoChunks(
  propositions: string[],
  boundaries: number[],
  chunkIdPrefix: string
): TextChunk[] {
  if (propositions.length === 0) {
    return [];
  }

  // Sort boundaries to ensure they're in order
  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);

  // Filter out invalid boundaries (outside proposition range)
  const validBoundaries = sortedBoundaries.filter(
    (b) => b > 0 && b < propositions.length
  );

  // Create chunk boundaries: [0, boundary1, boundary2, ..., propositions.length]
  const chunkBoundaries = [0, ...validBoundaries, propositions.length];

  // Remove duplicates and ensure sorted
  const uniqueBoundaries = [...new Set(chunkBoundaries)].sort((a, b) => a - b);

  const chunks: TextChunk[] = [];

  for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
    const startIndex = uniqueBoundaries[i];
    const endIndex = uniqueBoundaries[i + 1];

    // Skip empty chunks
    if (startIndex >= endIndex) {
      continue;
    }

    const chunkPropositions = propositions.slice(startIndex, endIndex);

    chunks.push({
      id: generateChunkId(chunkIdPrefix, chunks.length),
      text: chunkPropositions.join(' '),
      propositions: chunkPropositions,
      startIndex,
      endIndex,
    });
  }

  return chunks;
}

/**
 * Create a text chunking pipeline instance
 *
 * @param config - Optional configuration options
 * @returns Text chunking pipeline instance
 * @throws TextChunkingPipelineError if required API keys are missing
 *
 * @example
 * ```ts
 * // Using default services
 * const pipeline = createTextChunkingPipeline();
 *
 * // With custom services for testing
 * const pipeline = createTextChunkingPipeline({
 *   propositionService: mockPropositionService,
 *   boundaryService: mockBoundaryService,
 * });
 *
 * // With custom chunk ID prefix
 * const pipeline = createTextChunkingPipeline({
 *   chunkIdPrefix: 'doc-chunk',
 * });
 * ```
 */
export function createTextChunkingPipeline(
  config: TextChunkingPipelineConfig = {}
): TextChunkingPipeline {
  const chunkIdPrefix = config.chunkIdPrefix ?? 'chunk';

  // Create or use provided proposition service
  let propositionService: PropositionChunkingService;
  try {
    propositionService =
      config.propositionService ?? createPropositionChunkingService();
  } catch (error) {
    if (error instanceof PropositionChunkingError) {
      throw new TextChunkingPipelineError(
        `Failed to initialize proposition service: ${error.message}`,
        'API_KEY_MISSING',
        { cause: error, originalCode: error.code }
      );
    }
    throw new TextChunkingPipelineError(
      `Failed to initialize proposition service: ${(error as Error).message}`,
      'API_KEY_MISSING',
      { cause: error }
    );
  }

  // Create or use provided boundary service
  let boundaryService: SemanticBoundaryService;
  try {
    boundaryService =
      config.boundaryService ?? createSemanticBoundaryService();
  } catch (error) {
    if (error instanceof SemanticBoundaryError) {
      throw new TextChunkingPipelineError(
        `Failed to initialize boundary service: ${error.message}`,
        'API_KEY_MISSING',
        { cause: error, originalCode: error.code }
      );
    }
    throw new TextChunkingPipelineError(
      `Failed to initialize boundary service: ${(error as Error).message}`,
      'API_KEY_MISSING',
      { cause: error }
    );
  }

  return {
    async chunkText(text: string): Promise<TextChunk[]> {
      // Handle empty input
      if (!text || text.trim() === '') {
        return [];
      }

      // Step 1: Decompose text into propositions
      let propositions: string[];
      try {
        propositions =
          await propositionService.decomposeIntoPropositions(text);
      } catch (error) {
        if (error instanceof PropositionChunkingError) {
          throw new TextChunkingPipelineError(
            `Proposition decomposition failed: ${error.message}`,
            'DECOMPOSITION_FAILED',
            { cause: error, originalCode: error.code }
          );
        }
        throw new TextChunkingPipelineError(
          `Proposition decomposition failed: ${(error as Error).message}`,
          'DECOMPOSITION_FAILED',
          { cause: error }
        );
      }

      // Handle case where no propositions were extracted
      if (propositions.length === 0) {
        return [];
      }

      // If only one proposition, return it as a single chunk
      if (propositions.length === 1) {
        return [
          {
            id: generateChunkId(chunkIdPrefix, 0),
            text: propositions[0],
            propositions: propositions,
            startIndex: 0,
            endIndex: 1,
          },
        ];
      }

      // Step 2: Find semantic boundaries
      let boundaries: number[];
      try {
        boundaries = await boundaryService.findBoundaries(propositions);
      } catch (error) {
        if (error instanceof SemanticBoundaryError) {
          throw new TextChunkingPipelineError(
            `Boundary detection failed: ${error.message}`,
            'BOUNDARY_DETECTION_FAILED',
            { cause: error, originalCode: error.code }
          );
        }
        throw new TextChunkingPipelineError(
          `Boundary detection failed: ${(error as Error).message}`,
          'BOUNDARY_DETECTION_FAILED',
          { cause: error }
        );
      }

      // Step 3: Group propositions into chunks
      const chunks = groupPropositionsIntoChunks(
        propositions,
        boundaries,
        chunkIdPrefix
      );

      return chunks;
    },
  };
}

/**
 * Get the default text chunking pipeline using environment variables
 *
 * @returns Text chunking pipeline instance
 * @throws TextChunkingPipelineError if required API keys are not set
 */
export function getDefaultTextChunkingPipeline(): TextChunkingPipeline {
  return createTextChunkingPipeline();
}
