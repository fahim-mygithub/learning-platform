/**
 * AI Service Type Definitions
 *
 * Types for Claude API integration, including configuration,
 * messages, responses, and error handling.
 */

/**
 * Available Claude models
 * - sonnet: For complex analysis tasks (concept extraction, relationship mapping)
 * - haiku: For simple tasks (quick summaries, classifications)
 */
export type AIModel = 'claude-sonnet' | 'claude-haiku';

/**
 * Model identifiers for the Anthropic API
 */
export const AI_MODEL_IDS: Record<AIModel, string> = {
  'claude-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-haiku': 'claude-3-haiku-20240307',
} as const;

/**
 * AI Service configuration options
 */
export interface AIServiceConfig {
  /** API key for Anthropic (defaults to EXPO_PUBLIC_ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Default model to use (defaults to claude-sonnet) */
  defaultModel?: AIModel;
  /** Maximum number of retry attempts (defaults to 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds for exponential backoff (defaults to 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds for exponential backoff (defaults to 30000) */
  maxDelayMs?: number;
  /** Request timeout in milliseconds (defaults to 60000) */
  timeoutMs?: number;
}

/**
 * Options for sending messages to the AI
 */
export interface AIMessageOptions {
  /** Model to use for this request */
  model?: AIModel;
  /** Maximum tokens in the response */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Input message structure for AI requests
 */
export interface AIMessage {
  /** System prompt to guide the AI's behavior */
  systemPrompt: string;
  /** User message/query */
  userMessage: string;
  /** Optional options for this request */
  options?: AIMessageOptions;
}

/**
 * Response from the AI service
 */
export interface AIResponse {
  /** The text content of the response */
  content: string;
  /** Model that generated the response */
  model: string;
  /** Token usage statistics */
  usage: {
    /** Tokens in the input */
    inputTokens: number;
    /** Tokens in the output */
    outputTokens: number;
  };
  /** Reason the response ended */
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | string;
}

/**
 * Response with parsed JSON content
 */
export interface AIStructuredResponse<T> extends AIResponse {
  /** Parsed JSON data from the response */
  data: T;
}

/**
 * Error codes for AI service errors
 */
export type AIErrorCode =
  | 'API_KEY_MISSING'
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'JSON_PARSE_ERROR'
  | 'MAX_RETRIES_EXCEEDED'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for AI service errors
 */
export class AIError extends Error {
  /** Error code for programmatic handling */
  readonly code: AIErrorCode;
  /** HTTP status code if applicable */
  readonly statusCode?: number;
  /** Whether this error is retryable */
  readonly retryable: boolean;
  /** Original error if this wraps another error */
  readonly cause?: Error;

  constructor(
    message: string,
    code: AIErrorCode,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.cause = options?.cause;

    // Maintain proper stack trace for where error was thrown (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }
}

/**
 * Retry configuration derived from service config
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * HTTP status codes that are retryable
 */
export const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504] as const;

/**
 * Default configuration values
 */
export const DEFAULT_AI_CONFIG: Required<AIServiceConfig> = {
  apiKey: '',
  defaultModel: 'claude-sonnet',
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
} as const;
