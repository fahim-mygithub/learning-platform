/**
 * AI Service for Claude API Integration
 *
 * Provides a base service for interacting with the Anthropic Claude API.
 * Features:
 * - Model selection (Sonnet for complex tasks, Haiku for simple tasks)
 * - Retry logic with exponential backoff
 * - Structured JSON response parsing
 * - Proper error handling and classification
 *
 * @example
 * ```ts
 * import { createAIService, sendMessage, sendStructuredMessage } from '@/src/lib/ai-service';
 *
 * // Create a service instance
 * const aiService = createAIService();
 *
 * // Send a simple message
 * const response = await sendMessage(aiService, {
 *   systemPrompt: 'You are a helpful assistant.',
 *   userMessage: 'Explain quantum computing.',
 * });
 *
 * // Send a message expecting JSON response
 * interface Concept { name: string; description: string; }
 * const structured = await sendStructuredMessage<Concept[]>(aiService, {
 *   systemPrompt: 'Return a JSON array of concepts.',
 *   userMessage: 'Extract concepts from: Machine learning uses algorithms.',
 * });
 * ```
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIError,
  AIMessage,
  AIResponse,
  AIServiceConfig,
  AIStructuredResponse,
  AI_MODEL_IDS,
  DEFAULT_AI_CONFIG,
  RETRYABLE_STATUS_CODES,
} from '@/src/types/ai';

/**
 * AI Service instance containing the client and configuration
 */
export interface AIService {
  /** Anthropic client instance */
  client: Anthropic;
  /** Service configuration */
  config: Required<AIServiceConfig>;
}

/**
 * Calculate exponential backoff delay with jitter
 *
 * @param attempt - Zero-based attempt number
 * @param initialDelayMs - Initial delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @returns Delay in milliseconds with jitter applied
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  // Calculate base delay with exponential backoff
  const baseDelay = initialDelayMs * Math.pow(2, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(baseDelay, maxDelayMs);

  // Add jitter (+-20% randomness) to prevent thundering herd
  const jitter = 0.8 + Math.random() * 0.4; // Range: 0.8 to 1.2

  return Math.floor(cappedDelay * jitter);
}

/**
 * Check if an error is retryable based on status code
 *
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Check for timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return true;
  }

  // Check for HTTP status codes
  const status = (error as unknown as { status?: number }).status;

  // Network errors (no status) are typically retryable
  if (status === undefined) {
    return true;
  }

  // Check against retryable status codes
  return (RETRYABLE_STATUS_CODES as readonly number[]).includes(status);
}

/**
 * Get the appropriate error code for an API error
 *
 * @param error - The error to classify
 * @returns AIErrorCode for the error
 */
function getErrorCode(
  error: Error
): 'RATE_LIMITED' | 'SERVER_ERROR' | 'API_KEY_INVALID' | 'INVALID_REQUEST' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN_ERROR' {
  const status = (error as unknown as { status?: number }).status;

  if (status === 429) return 'RATE_LIMITED';
  if (status === 401) return 'API_KEY_INVALID';
  if (status === 400) return 'INVALID_REQUEST';
  if (status && status >= 500) return 'SERVER_ERROR';
  if (error.name === 'TimeoutError') return 'TIMEOUT';
  if (!status) return 'NETWORK_ERROR';

  return 'UNKNOWN_ERROR';
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an AI service instance
 *
 * @param config - Optional configuration overrides
 * @returns AI service instance
 * @throws AIError if API key is missing
 *
 * @example
 * ```ts
 * // Using environment variable
 * const service = createAIService();
 *
 * // With custom configuration
 * const service = createAIService({
 *   apiKey: 'custom-key',
 *   defaultModel: 'claude-haiku',
 *   maxRetries: 5,
 * });
 * ```
 */
export function createAIService(config?: AIServiceConfig): AIService {
  // Get API key from config or environment
  const apiKey = config?.apiKey || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new AIError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable or provide apiKey in config.',
      'API_KEY_MISSING'
    );
  }

  // Create Anthropic client
  const client = new Anthropic({
    apiKey,
  });

  // Merge config with defaults
  const fullConfig: Required<AIServiceConfig> = {
    apiKey,
    defaultModel: config?.defaultModel ?? DEFAULT_AI_CONFIG.defaultModel,
    maxRetries: config?.maxRetries ?? DEFAULT_AI_CONFIG.maxRetries,
    initialDelayMs: config?.initialDelayMs ?? DEFAULT_AI_CONFIG.initialDelayMs,
    maxDelayMs: config?.maxDelayMs ?? DEFAULT_AI_CONFIG.maxDelayMs,
    timeoutMs: config?.timeoutMs ?? DEFAULT_AI_CONFIG.timeoutMs,
  };

  return {
    client,
    config: fullConfig,
  };
}

/**
 * Send a message to the Claude API with retry logic
 *
 * @param service - AI service instance
 * @param message - Message to send
 * @returns AI response
 * @throws AIError on failure
 *
 * @example
 * ```ts
 * const response = await sendMessage(service, {
 *   systemPrompt: 'You are an educational assistant.',
 *   userMessage: 'What is photosynthesis?',
 *   options: {
 *     model: 'claude-haiku',
 *     temperature: 0.7,
 *   },
 * });
 * console.log(response.content);
 * ```
 */
export async function sendMessage(
  service: AIService,
  message: AIMessage
): Promise<AIResponse> {
  const { client, config } = service;
  const { systemPrompt, userMessage, options } = message;

  // Determine model to use
  const model = options?.model ?? config.defaultModel;
  const modelId = AI_MODEL_IDS[model];

  // Build request parameters
  const requestParams: Anthropic.MessageCreateParams = {
    model: modelId,
    max_tokens: options?.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  // Add optional parameters
  if (options?.temperature !== undefined) {
    requestParams.temperature = options.temperature;
  }

  // Retry loop
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await client.messages.create(requestParams);

      // Extract text content from response
      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        throw new AIError(
          'No text content in response',
          'INVALID_REQUEST'
        );
      }

      return {
        content: textContent.text,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        stopReason: response.stop_reason ?? 'end_turn',
      };
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        // Non-retryable error, throw immediately
        const code = getErrorCode(lastError);
        throw new AIError(lastError.message, code, {
          statusCode: (lastError as unknown as { status?: number }).status,
          retryable: false,
          cause: lastError,
        });
      }

      // Check if we have retries left
      if (attempt < config.maxRetries) {
        // Calculate delay and wait
        const delay = calculateBackoffDelay(
          attempt,
          config.initialDelayMs,
          config.maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  // Max retries exceeded
  throw new AIError(
    `Max retries (${config.maxRetries}) exceeded. Last error: ${lastError?.message}`,
    'MAX_RETRIES_EXCEEDED',
    {
      statusCode: (lastError as unknown as { status?: number })?.status,
      retryable: false,
      cause: lastError ?? undefined,
    }
  );
}

/**
 * Extract JSON from a response that may be wrapped in markdown code blocks
 *
 * @param content - Response content
 * @returns Extracted JSON string
 */
function extractJSON(content: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Return as-is if no code block found
  return content.trim();
}

/**
 * Send a message expecting a structured JSON response
 *
 * @param service - AI service instance
 * @param message - Message to send
 * @returns AI response with parsed JSON data
 * @throws AIError on failure or if JSON parsing fails
 *
 * @example
 * ```ts
 * interface Concepts {
 *   concepts: Array<{ name: string; definition: string }>;
 * }
 *
 * const response = await sendStructuredMessage<Concepts>(service, {
 *   systemPrompt: 'Extract concepts and return as JSON with a "concepts" array.',
 *   userMessage: 'Text to analyze...',
 * });
 *
 * response.data.concepts.forEach(c => console.log(c.name));
 * ```
 */
export async function sendStructuredMessage<T>(
  service: AIService,
  message: AIMessage
): Promise<AIStructuredResponse<T>> {
  // Get the raw response
  const response = await sendMessage(service, message);

  // Extract and parse JSON
  try {
    const jsonString = extractJSON(response.content);
    const data = JSON.parse(jsonString) as T;

    return {
      ...response,
      data,
    };
  } catch (error) {
    throw new AIError(
      `Failed to parse JSON response: ${(error as Error).message}. Content: ${response.content.substring(0, 200)}...`,
      'JSON_PARSE_ERROR',
      {
        retryable: false,
        cause: error as Error,
      }
    );
  }
}

/**
 * Cached default service instance
 */
let defaultService: AIService | null = null;

/**
 * Get or create the default AI service instance
 *
 * Uses the environment variable EXPO_PUBLIC_ANTHROPIC_API_KEY.
 * The instance is cached for reuse.
 *
 * @returns Default AI service instance
 * @throws AIError if API key is not configured
 *
 * @example
 * ```ts
 * const service = getDefaultService();
 * const response = await sendMessage(service, { ... });
 * ```
 */
export function getDefaultService(): AIService {
  if (!defaultService) {
    defaultService = createAIService();
  }
  return defaultService;
}

/**
 * Reset the default service instance (primarily for testing)
 */
export function resetDefaultService(): void {
  defaultService = null;
}
