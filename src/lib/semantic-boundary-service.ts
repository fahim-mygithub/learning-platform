/**
 * Semantic Boundary Service
 *
 * Uses OpenAI embeddings to find topic shifts in text by analyzing
 * cosine similarity between consecutive propositions.
 *
 * Features:
 * - Generates embeddings for propositions using text-embedding-3-small
 * - Calculates cosine similarity between consecutive propositions
 * - Identifies "valleys" (low similarity = topic shift)
 * - Returns chunk boundary indices
 *
 * @example
 * ```ts
 * import { createSemanticBoundaryService } from '@/src/lib/semantic-boundary-service';
 *
 * const service = createSemanticBoundaryService();
 *
 * const propositions = [
 *   "Machine learning uses algorithms to learn from data.",
 *   "Neural networks are inspired by the human brain.",
 *   "The French Revolution began in 1789.",
 *   "It led to major political changes in France."
 * ];
 *
 * const boundaries = await service.findBoundaries(propositions);
 * // Returns: [2] - indicating a topic shift before index 2 (French Revolution)
 * ```
 */

import OpenAI from 'openai';
import { env } from './env';

/**
 * Error codes for semantic boundary operations
 */
export type SemanticBoundaryErrorCode =
  | 'API_KEY_MISSING'
  | 'EMBEDDING_FAILED'
  | 'INSUFFICIENT_PROPOSITIONS'
  | 'VALIDATION_ERROR';

/**
 * Custom error class for semantic boundary operations
 */
export class SemanticBoundaryError extends Error {
  code: SemanticBoundaryErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: SemanticBoundaryErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SemanticBoundaryError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Configuration options for the semantic boundary service
 */
export interface SemanticBoundaryConfig {
  /**
   * OpenAI API key (uses environment variable if not provided)
   */
  apiKey?: string;

  /**
   * Threshold for detecting boundaries as standard deviations below mean
   * Default: 1.0 (boundaries where similarity < mean - 1 std dev)
   */
  thresholdStdDevs?: number;

  /**
   * Minimum similarity drop to consider as a boundary
   * Default: 0.1 (10% drop from average)
   */
  minSimilarityDrop?: number;

  /**
   * Maximum batch size for embedding requests
   * Default: 100
   */
  batchSize?: number;
}

/**
 * Semantic boundary detection result with metadata
 */
export interface BoundaryResult {
  /**
   * Indices where boundaries should be placed (topic shifts)
   */
  boundaries: number[];

  /**
   * Similarity scores between consecutive propositions
   */
  similarities: number[];

  /**
   * Mean similarity score
   */
  meanSimilarity: number;

  /**
   * Standard deviation of similarity scores
   */
  stdDevSimilarity: number;

  /**
   * Threshold used for boundary detection
   */
  threshold: number;
}

/**
 * Semantic boundary service interface
 */
export interface SemanticBoundaryService {
  /**
   * Find topic shift boundaries in a list of propositions
   * @param propositions - Array of proposition strings
   * @returns Array of indices where boundaries should be placed
   */
  findBoundaries(propositions: string[]): Promise<number[]>;

  /**
   * Find boundaries with detailed metadata
   * @param propositions - Array of proposition strings
   * @returns Detailed boundary result including similarity scores
   */
  findBoundariesWithMetadata(propositions: string[]): Promise<BoundaryResult>;
}

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (value between -1 and 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new SemanticBoundaryError(
      'Vectors must have the same length',
      'VALIDATION_ERROR',
      { lengthA: a.length, lengthB: b.length }
    );
  }

  if (a.length === 0) {
    throw new SemanticBoundaryError(
      'Vectors cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));

  // Handle zero vectors
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate mean of an array of numbers
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<SemanticBoundaryConfig, 'apiKey'>> = {
  thresholdStdDevs: 1.0,
  minSimilarityDrop: 0.1,
  batchSize: 100,
};

/**
 * Create a semantic boundary service instance
 *
 * @param config - Optional configuration options
 * @returns Semantic boundary service instance
 * @throws SemanticBoundaryError if API key is missing
 *
 * @example
 * ```ts
 * // Using environment API key
 * const service = createSemanticBoundaryService();
 *
 * // With custom API key
 * const service = createSemanticBoundaryService({ apiKey: 'sk-...' });
 *
 * // With custom threshold
 * const service = createSemanticBoundaryService({ thresholdStdDevs: 1.5 });
 * ```
 */
export function createSemanticBoundaryService(
  config: SemanticBoundaryConfig = {}
): SemanticBoundaryService {
  // Get API key from config or environment
  let apiKey: string;
  try {
    apiKey = config.apiKey || env.openaiApiKey;
  } catch {
    throw new SemanticBoundaryError(
      'OpenAI API key is required. Set EXPO_PUBLIC_OPENAI_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  if (!apiKey || apiKey.trim() === '') {
    throw new SemanticBoundaryError(
      'OpenAI API key is required. Set EXPO_PUBLIC_OPENAI_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  // Merge with defaults
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey,
  };

  // Create OpenAI client
  const openai = new OpenAI({ apiKey: finalConfig.apiKey });

  /**
   * Generate embeddings for a batch of texts
   */
  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // Sort by index to ensure order matches input
      const sorted = response.data.sort((a, b) => a.index - b.index);
      return sorted.map((item) => item.embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new SemanticBoundaryError(
        `Failed to generate embeddings: ${message}`,
        'EMBEDDING_FAILED',
        { cause: error }
      );
    }
  }

  /**
   * Generate embeddings for all propositions with batching
   */
  async function embedAllPropositions(
    propositions: string[]
  ): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < propositions.length; i += finalConfig.batchSize) {
      const batch = propositions.slice(i, i + finalConfig.batchSize);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Calculate similarities between consecutive embeddings
   */
  function calculateConsecutiveSimilarities(embeddings: number[][]): number[] {
    const similarities: number[] = [];

    for (let i = 0; i < embeddings.length - 1; i++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[i + 1]);
      similarities.push(similarity);
    }

    return similarities;
  }

  /**
   * Detect boundaries based on similarity valleys
   */
  function detectBoundaries(
    similarities: number[],
    thresholdStdDevs: number,
    minSimilarityDrop: number
  ): { boundaries: number[]; mean: number; stdDev: number; threshold: number } {
    if (similarities.length === 0) {
      return { boundaries: [], mean: 0, stdDev: 0, threshold: 0 };
    }

    const mean = calculateMean(similarities);
    const stdDev = calculateStdDev(similarities, mean);

    // Calculate threshold: mean - (stdDevs * stdDev)
    // But ensure minimum drop is respected
    const stdDevThreshold = mean - thresholdStdDevs * stdDev;
    const dropThreshold = mean - minSimilarityDrop;
    const threshold = Math.min(stdDevThreshold, dropThreshold);

    // Find indices where similarity falls below threshold
    const boundaries: number[] = [];
    for (let i = 0; i < similarities.length; i++) {
      if (similarities[i] < threshold) {
        // Boundary is at index i+1 (after the low-similarity pair)
        boundaries.push(i + 1);
      }
    }

    return { boundaries, mean, stdDev, threshold };
  }

  return {
    async findBoundaries(propositions: string[]): Promise<number[]> {
      const result = await this.findBoundariesWithMetadata(propositions);
      return result.boundaries;
    },

    async findBoundariesWithMetadata(
      propositions: string[]
    ): Promise<BoundaryResult> {
      // Handle edge cases
      if (!propositions || propositions.length === 0) {
        return {
          boundaries: [],
          similarities: [],
          meanSimilarity: 0,
          stdDevSimilarity: 0,
          threshold: 0,
        };
      }

      if (propositions.length === 1) {
        return {
          boundaries: [],
          similarities: [],
          meanSimilarity: 0,
          stdDevSimilarity: 0,
          threshold: 0,
        };
      }

      // Filter out empty propositions
      const validPropositions = propositions.filter(
        (p) => p && p.trim().length > 0
      );

      if (validPropositions.length < 2) {
        return {
          boundaries: [],
          similarities: [],
          meanSimilarity: 0,
          stdDevSimilarity: 0,
          threshold: 0,
        };
      }

      // Generate embeddings for all propositions
      const embeddings = await embedAllPropositions(validPropositions);

      // Calculate similarities between consecutive propositions
      const similarities = calculateConsecutiveSimilarities(embeddings);

      // Detect boundaries
      const { boundaries, mean, stdDev, threshold } = detectBoundaries(
        similarities,
        finalConfig.thresholdStdDevs,
        finalConfig.minSimilarityDrop
      );

      return {
        boundaries,
        similarities,
        meanSimilarity: mean,
        stdDevSimilarity: stdDev,
        threshold,
      };
    },
  };
}

/**
 * Get the default semantic boundary service using environment variables
 *
 * @returns Semantic boundary service instance
 * @throws SemanticBoundaryError if EXPO_PUBLIC_OPENAI_API_KEY is not set
 */
export function getDefaultSemanticBoundaryService(): SemanticBoundaryService {
  return createSemanticBoundaryService();
}
