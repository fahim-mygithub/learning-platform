/**
 * Mock AI Service for Testing
 *
 * Provides predictable responses for testing other services that depend on the AI service.
 * Configurable to simulate errors, delays, and custom responses.
 */

import {
  AIError,
  AIMessage,
  AIResponse,
  AIServiceConfig,
  AIStructuredResponse,
  DEFAULT_AI_CONFIG,
} from '@/src/types/ai';

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockAIServiceConfig {
  /** Default response content when no custom response is set */
  defaultResponse?: string;
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: AIError | Error;
  /** Delay in milliseconds before responding */
  responseDelayMs?: number;
  /** Custom responses keyed by a pattern in the user message */
  customResponses?: Map<string, string>;
  /** Custom structured responses keyed by a pattern in the user message */
  customStructuredResponses?: Map<string, unknown>;
}

/**
 * Global mock configuration - modify this to control mock behavior
 */
let mockConfig: MockAIServiceConfig = {
  defaultResponse: 'Mock AI response',
  shouldError: false,
  responseDelayMs: 0,
};

/**
 * Configure the mock behavior
 *
 * @param config - Configuration options for the mock
 *
 * @example
 * ```ts
 * // Set up to return custom response
 * configureMock({ defaultResponse: 'Custom response' });
 *
 * // Set up to simulate errors
 * configureMock({
 *   shouldError: true,
 *   errorToThrow: new AIError('API Error', 'SERVER_ERROR')
 * });
 *
 * // Set up response delay for timeout tests
 * configureMock({ responseDelayMs: 5000 });
 * ```
 */
export function configureMock(config: Partial<MockAIServiceConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    defaultResponse: 'Mock AI response',
    shouldError: false,
    responseDelayMs: 0,
  };
}

/**
 * Get the current mock configuration (for assertions in tests)
 */
export function getMockConfig(): MockAIServiceConfig {
  return { ...mockConfig };
}

/**
 * Track calls for verification in tests
 */
interface MockCallRecord {
  timestamp: number;
  message: AIMessage;
  config?: AIServiceConfig;
}

const callHistory: MockCallRecord[] = [];

/**
 * Get all calls made to the mock service
 */
export function getMockCallHistory(): MockCallRecord[] {
  return [...callHistory];
}

/**
 * Clear the call history
 */
export function clearMockCallHistory(): void {
  callHistory.length = 0;
}

/**
 * Helper function to create a delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock AI service instance
 */
export interface MockAIService {
  config: Required<AIServiceConfig>;
}

/**
 * Create a mock AI service
 */
export function createAIService(config?: AIServiceConfig): MockAIService {
  // Simulate API key check
  const apiKey = config?.apiKey || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new AIError('API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY or provide apiKey in config.', 'API_KEY_MISSING');
  }

  return {
    config: {
      apiKey,
      defaultModel: config?.defaultModel ?? DEFAULT_AI_CONFIG.defaultModel,
      maxRetries: config?.maxRetries ?? DEFAULT_AI_CONFIG.maxRetries,
      initialDelayMs: config?.initialDelayMs ?? DEFAULT_AI_CONFIG.initialDelayMs,
      maxDelayMs: config?.maxDelayMs ?? DEFAULT_AI_CONFIG.maxDelayMs,
      timeoutMs: config?.timeoutMs ?? DEFAULT_AI_CONFIG.timeoutMs,
    },
  };
}

/**
 * Mock send message function
 */
export async function sendMessage(
  service: MockAIService,
  message: AIMessage
): Promise<AIResponse> {
  // Record the call
  callHistory.push({
    timestamp: Date.now(),
    message,
    config: service.config,
  });

  // Simulate delay if configured
  if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
    await delay(mockConfig.responseDelayMs);
  }

  // Simulate error if configured
  if (mockConfig.shouldError) {
    throw mockConfig.errorToThrow || new AIError('Mock error', 'UNKNOWN_ERROR');
  }

  // Check for custom response
  let content = mockConfig.defaultResponse || 'Mock AI response';
  if (mockConfig.customResponses) {
    for (const [pattern, response] of mockConfig.customResponses) {
      if (message.userMessage.includes(pattern)) {
        content = response;
        break;
      }
    }
  }

  return {
    content,
    model: 'mock-model',
    usage: {
      inputTokens: message.userMessage.length + (message.systemPrompt?.length || 0),
      outputTokens: content.length,
    },
    stopReason: 'end_turn',
  };
}

/**
 * Mock send structured message function
 */
export async function sendStructuredMessage<T>(
  service: MockAIService,
  message: AIMessage
): Promise<AIStructuredResponse<T>> {
  // Record the call
  callHistory.push({
    timestamp: Date.now(),
    message,
    config: service.config,
  });

  // Simulate delay if configured
  if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
    await delay(mockConfig.responseDelayMs);
  }

  // Simulate error if configured
  if (mockConfig.shouldError) {
    throw mockConfig.errorToThrow || new AIError('Mock error', 'UNKNOWN_ERROR');
  }

  // Check for custom structured response
  let data: T = {} as T;
  let content: string = '{}';

  if (mockConfig.customStructuredResponses) {
    for (const [pattern, response] of mockConfig.customStructuredResponses) {
      if (message.userMessage.includes(pattern)) {
        data = response as T;
        content = JSON.stringify(data);
        break;
      }
    }
  } else {
    // Default structured response if no custom responses configured
    data = {} as T;
    content = JSON.stringify(data);
  }

  return {
    content,
    data,
    model: 'mock-model',
    usage: {
      inputTokens: message.userMessage.length + (message.systemPrompt?.length || 0),
      outputTokens: content.length,
    },
    stopReason: 'end_turn',
  };
}

/**
 * Cached default service instance
 */
let defaultService: MockAIService | null = null;

/**
 * Get the default service instance (singleton)
 */
export function getDefaultService(): MockAIService {
  if (!defaultService) {
    defaultService = createAIService();
  }
  return defaultService;
}

/**
 * Reset the default service (for testing)
 */
export function resetDefaultService(): void {
  defaultService = null;
}

/**
 * Mock utility functions
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  const baseDelay = initialDelayMs * Math.pow(2, attempt);
  return Math.min(baseDelay, maxDelayMs);
}

export function isRetryableError(error: Error): boolean {
  const status = (error as unknown as { status?: number }).status;
  if (!status) return true; // Network errors are retryable
  return [429, 500, 502, 503, 504].includes(status);
}
