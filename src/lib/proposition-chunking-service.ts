/**
 * Proposition Chunking Service
 *
 * Decomposes raw text from PDF/URL sources into independent, self-contained propositions.
 * Uses Claude API to rewrite paragraphs into atomic statements that preserve all factual information.
 *
 * Features:
 * - Breaks down complex text into independent propositions
 * - Each proposition is self-contained and makes sense on its own
 * - Preserves all factual information from the original text
 * - Uses Claude Haiku for cost-efficient processing
 *
 * @example
 * ```ts
 * import { createPropositionChunkingService } from '@/src/lib/proposition-chunking-service';
 *
 * const service = createPropositionChunkingService();
 *
 * const propositions = await service.decomposeIntoPropositions(
 *   "Machine learning is a subset of AI. It uses algorithms to learn from data. Neural networks are a key component."
 * );
 * // Returns:
 * // [
 * //   "Machine learning is a subset of artificial intelligence.",
 * //   "Machine learning uses algorithms to learn from data.",
 * //   "Neural networks are a key component of machine learning."
 * // ]
 * ```
 */

import { AIError } from '@/src/types/ai';
import {
  createAIService,
  sendStructuredMessage,
  AIService,
} from './ai-service';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for proposition chunking operations
 */
export type PropositionChunkingErrorCode =
  | 'API_KEY_MISSING'
  | 'DECOMPOSITION_FAILED'
  | 'EMPTY_CONTENT'
  | 'VALIDATION_ERROR';

/**
 * Custom error class for proposition chunking operations
 */
export class PropositionChunkingError extends Error {
  code: PropositionChunkingErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: PropositionChunkingErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PropositionChunkingError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Proposition chunking service interface
 */
export interface PropositionChunkingService {
  /**
   * Decompose text into independent, self-contained propositions
   * @param text - Raw text from PDF/URL sources
   * @returns Array of self-contained proposition statements
   */
  decomposeIntoPropositions(text: string): Promise<string[]>;
}

/**
 * System prompt for proposition decomposition
 */
const PROPOSITION_DECOMPOSITION_SYSTEM_PROMPT = `Rewrite this text as a series of independent, self-contained propositions.
Each proposition should make sense on its own without context.
Preserve all factual information. Output as JSON array of strings.

Guidelines:
- Each proposition should be a complete, atomic statement
- Include necessary context within each proposition (e.g., "Neural networks, which are part of machine learning, use..." rather than "They use...")
- Resolve pronouns and references to their full names
- Split compound sentences into separate propositions when they contain multiple facts
- Maintain the original meaning and accuracy
- Do not add information that isn't in the source text
- Keep propositions concise but complete

Example input:
"Machine learning is a subset of AI that enables computers to learn. It uses algorithms and neural networks."

Example output:
["Machine learning is a subset of artificial intelligence.", "Machine learning enables computers to learn from data.", "Machine learning uses algorithms to identify patterns.", "Neural networks are used in machine learning systems."]`;

/**
 * Maximum content length before chunking (in characters)
 */
const MAX_CONTENT_LENGTH = 30000;

/**
 * Chunk large content for processing
 */
function chunkContent(text: string, maxLength: number = MAX_CONTENT_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // Try to break at paragraph boundary first
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end);
      if (lastParagraph > start + maxLength / 2) {
        end = lastParagraph + 2;
      } else {
        // Fall back to sentence boundary
        const lastPeriod = text.lastIndexOf('.', end);
        if (lastPeriod > start + maxLength / 2) {
          end = lastPeriod + 1;
        }
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks;
}

/**
 * Validate propositions returned from AI
 */
function validatePropositions(propositions: unknown): string[] {
  if (!Array.isArray(propositions)) {
    throw new PropositionChunkingError(
      'Expected array of propositions from AI response',
      'VALIDATION_ERROR'
    );
  }

  const validated: string[] = [];
  for (const prop of propositions) {
    if (typeof prop === 'string' && prop.trim().length > 0) {
      validated.push(prop.trim());
    }
  }

  return validated;
}

/**
 * Create a proposition chunking service instance
 *
 * @param aiService - Optional AI service instance (uses default if not provided)
 * @returns Proposition chunking service instance
 * @throws PropositionChunkingError if API key is missing
 *
 * @example
 * ```ts
 * // Using default service
 * const service = createPropositionChunkingService();
 *
 * // With custom AI service
 * const customAI = createAIService({ apiKey: 'my-key' });
 * const service = createPropositionChunkingService(customAI);
 * ```
 */
export function createPropositionChunkingService(
  aiService?: AIService
): PropositionChunkingService {
  // Create or use provided AI service
  let service: AIService;
  try {
    service = aiService || createAIService();
  } catch (error) {
    throw new PropositionChunkingError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async decomposeIntoPropositions(text: string): Promise<string[]> {
      // Handle empty content
      if (!text || text.trim() === '') {
        return [];
      }

      // Log input
      logInput('proposition_chunking', 'decompose', {
        text_length: text.length,
      });

      const timer = startTimer();

      // Chunk content if too large
      const chunks = chunkContent(text);
      const allPropositions: string[] = [];

      for (const chunk of chunks) {
        try {
          const response = await sendStructuredMessage<string[]>(
            service,
            {
              systemPrompt: PROPOSITION_DECOMPOSITION_SYSTEM_PROMPT,
              userMessage: chunk,
              options: {
                model: 'claude-haiku', // Use Haiku for cost efficiency
                temperature: 0.1, // Low temperature for consistent output
              },
            }
          );

          const validated = validatePropositions(response.data);
          allPropositions.push(...validated);
        } catch (error) {
          logError('proposition_chunking', 'decompose', error as Error);

          // Re-throw AIError as-is
          if (error instanceof AIError) {
            throw new PropositionChunkingError(
              `Failed to decompose text: ${error.message}`,
              'DECOMPOSITION_FAILED',
              { cause: error, code: error.code }
            );
          }

          throw new PropositionChunkingError(
            `Failed to decompose text: ${(error as Error).message}`,
            'DECOMPOSITION_FAILED',
            { cause: error }
          );
        }
      }

      // Log output
      logOutput('proposition_chunking', 'decompose', {
        propositions_count: allPropositions.length,
        chunks_processed: chunks.length,
        sample_propositions: allPropositions.slice(0, 3),
      }, timer.stop());

      return allPropositions;
    },
  };
}

/**
 * Get the default proposition chunking service using environment variables
 *
 * @returns Proposition chunking service instance
 * @throws PropositionChunkingError if EXPO_PUBLIC_ANTHROPIC_API_KEY is not set
 */
export function getDefaultPropositionChunkingService(): PropositionChunkingService {
  return createPropositionChunkingService();
}
