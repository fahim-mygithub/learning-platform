/**
 * AI Service Tests
 *
 * Tests for Claude API integration including initialization,
 * message sending, retry logic, and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIError,
  AI_MODEL_IDS,
} from '@/src/types/ai';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

// Import after mocking
import {
  createAIService,
  sendMessage,
  sendStructuredMessage,
  getDefaultService,
  resetDefaultService,
  calculateBackoffDelay,
  isRetryableError,
} from '../ai-service';

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('AI Service', () => {
  // Store original env value
  const originalApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset default service cache
    resetDefaultService();

    // Set test API key
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';
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

  describe('createAIService', () => {
    it('initializes client with API key from environment', () => {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'env-api-key';

      const service = createAIService();

      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'env-api-key',
      });
      expect(service).toBeDefined();
    });

    it('initializes client with provided API key', () => {
      const service = createAIService({ apiKey: 'custom-api-key' });

      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'custom-api-key',
      });
      expect(service).toBeDefined();
    });

    it('throws AIError when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createAIService()).toThrow(AIError);
      expect(() => createAIService()).toThrow('API key is required');
    });

    it('throws AIError with correct code when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      try {
        createAIService();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).code).toBe('API_KEY_MISSING');
      }
    });

    it('throws AIError when API key is empty string', () => {
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = '';

      expect(() => createAIService()).toThrow(AIError);
      expect(() => createAIService()).toThrow('API key is required');
    });

    it('uses default configuration values', () => {
      const service = createAIService();

      expect(service.config.defaultModel).toBe('claude-sonnet');
      expect(service.config.maxRetries).toBe(3);
      expect(service.config.initialDelayMs).toBe(1000);
      expect(service.config.maxDelayMs).toBe(30000);
      expect(service.config.timeoutMs).toBe(60000);
    });

    it('allows overriding configuration values', () => {
      const service = createAIService({
        apiKey: 'test-key',
        defaultModel: 'claude-haiku',
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 60000,
        timeoutMs: 120000,
      });

      expect(service.config.defaultModel).toBe('claude-haiku');
      expect(service.config.maxRetries).toBe(5);
      expect(service.config.initialDelayMs).toBe(500);
      expect(service.config.maxDelayMs).toBe(60000);
      expect(service.config.timeoutMs).toBe(120000);
    });
  });

  describe('sendMessage', () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
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

    it('sends message with correct parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Hello, world!' }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      const response = await sendMessage(service, {
        systemPrompt: 'You are a helpful assistant.',
        userMessage: 'Hello!',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODEL_IDS['claude-sonnet'],
          max_tokens: 4096,
          system: 'You are a helpful assistant.',
          messages: [{ role: 'user', content: 'Hello!' }],
        })
      );
      expect(response.content).toBe('Hello, world!');
    });

    it('returns properly formatted response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Test response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 15, output_tokens: 8 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      const response = await sendMessage(service, {
        systemPrompt: 'System prompt',
        userMessage: 'User message',
      });

      expect(response).toEqual({
        content: 'Test response',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 15,
          outputTokens: 8,
        },
        stopReason: 'end_turn',
      });
    });

    it('uses specified model from options', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: AI_MODEL_IDS['claude-haiku'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      await sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
        options: { model: 'claude-haiku' },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODEL_IDS['claude-haiku'],
        })
      );
    });

    it('uses custom max tokens when specified', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      await sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
        options: { maxTokens: 1000 },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
        })
      );
    });

    it('uses custom temperature when specified', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Response' }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      await sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
        options: { temperature: 0.5 },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });
  });

  describe('Retry behavior', () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
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

    it('retries on rate limit error (429)', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as unknown as { status: number }).status = 429;

      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success after retry' }],
          model: AI_MODEL_IDS['claude-sonnet'],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        });

      const service = createAIService({ maxRetries: 3, initialDelayMs: 100 });

      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      });

      // Run all pending timers to allow retries to complete
      await jest.runAllTimersAsync();

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success after retry');
    });

    it('retries on server error (500)', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as unknown as { status: number }).status = 500;

      mockCreate
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
          model: AI_MODEL_IDS['claude-sonnet'],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        });

      const service = createAIService({ maxRetries: 3, initialDelayMs: 100 });

      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      });

      await jest.runAllTimersAsync();

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });

    it('retries on server error (502)', async () => {
      const serverError = new Error('Bad Gateway');
      (serverError as unknown as { status: number }).status = 502;

      mockCreate
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
          model: AI_MODEL_IDS['claude-sonnet'],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        });

      const service = createAIService({ maxRetries: 3, initialDelayMs: 100 });

      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      });

      await jest.runAllTimersAsync();

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });

    it('retries on server error (503)', async () => {
      const serverError = new Error('Service Unavailable');
      (serverError as unknown as { status: number }).status = 503;

      mockCreate
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
          model: AI_MODEL_IDS['claude-sonnet'],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        });

      const service = createAIService({ maxRetries: 3, initialDelayMs: 100 });

      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      });

      await jest.runAllTimersAsync();

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });

    it('retries on server error (504)', async () => {
      const serverError = new Error('Gateway Timeout');
      (serverError as unknown as { status: number }).status = 504;

      mockCreate
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success' }],
          model: AI_MODEL_IDS['claude-sonnet'],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        });

      const service = createAIService({ maxRetries: 3, initialDelayMs: 100 });

      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      });

      await jest.runAllTimersAsync();

      const response = await responsePromise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('Success');
    });

    it('throws error when max retries exceeded', async () => {
      const serverError = new Error('Service Unavailable');
      (serverError as unknown as { status: number }).status = 503;

      mockCreate.mockRejectedValue(serverError);

      const service = createAIService({
        maxRetries: 2,
        initialDelayMs: 100,
        maxDelayMs: 1000,
      });

      // Start the promise and let it run with timers
      let caughtError: unknown;
      const responsePromise = sendMessage(service, {
        systemPrompt: 'System',
        userMessage: 'User',
      }).catch((error) => {
        caughtError = error;
      });

      // Run all timers to exhaust all retry attempts
      await jest.runAllTimersAsync();
      await responsePromise;

      // Verify the error
      expect(caughtError).toBeInstanceOf(AIError);
      expect((caughtError as AIError).code).toBe('MAX_RETRIES_EXCEEDED');

      // 3 attempts total (initial + 2 retries)
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('does not retry on non-retryable errors (400)', async () => {
      const badRequestError = new Error('Bad Request');
      (badRequestError as unknown as { status: number }).status = 400;

      mockCreate.mockRejectedValue(badRequestError);

      const service = createAIService({ maxRetries: 3 });

      await expect(
        sendMessage(service, {
          systemPrompt: 'System',
          userMessage: 'User',
        })
      ).rejects.toThrow(AIError);

      // Should only try once, no retries
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('does not retry on authentication errors (401)', async () => {
      const authError = new Error('Unauthorized');
      (authError as unknown as { status: number }).status = 401;

      mockCreate.mockRejectedValue(authError);

      const service = createAIService({ maxRetries: 3 });

      try {
        await sendMessage(service, {
          systemPrompt: 'System',
          userMessage: 'User',
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).code).toBe('API_KEY_INVALID');
      }

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential backoff timing', () => {
    it('calculates correct delay for first retry', () => {
      const delay = calculateBackoffDelay(0, 1000, 30000);
      // With jitter, should be between 800 and 1200
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1200);
    });

    it('calculates correct delay for second retry', () => {
      const delay = calculateBackoffDelay(1, 1000, 30000);
      // 2000 * (0.8 to 1.2) = 1600 to 2400
      expect(delay).toBeGreaterThanOrEqual(1600);
      expect(delay).toBeLessThanOrEqual(2400);
    });

    it('calculates correct delay for third retry', () => {
      const delay = calculateBackoffDelay(2, 1000, 30000);
      // 4000 * (0.8 to 1.2) = 3200 to 4800
      expect(delay).toBeGreaterThanOrEqual(3200);
      expect(delay).toBeLessThanOrEqual(4800);
    });

    it('caps delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, 1000, 30000);
      // Should be capped at 30000 * (0.8 to 1.2) = 24000 to 36000
      expect(delay).toBeLessThanOrEqual(36000);
    });

    it('handles edge case with attempt 0 and small initial delay', () => {
      const delay = calculateBackoffDelay(0, 100, 5000);
      // 100 * (0.8 to 1.2) = 80 to 120
      expect(delay).toBeGreaterThanOrEqual(80);
      expect(delay).toBeLessThanOrEqual(120);
    });

    it('includes jitter within expected range', () => {
      // Run multiple times to verify jitter is applied
      const delays = Array.from({ length: 100 }, () =>
        calculateBackoffDelay(1, 1000, 30000)
      );

      // All delays should be close to 2000ms but with some variation due to jitter
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(1600); // 2000 * 0.8
        expect(delay).toBeLessThanOrEqual(2400); // 2000 * 1.2
      });
    });
  });

  describe('isRetryableError', () => {
    it('returns true for 429 status', () => {
      const error = new Error('Rate limited');
      (error as unknown as { status: number }).status = 429;
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 500 status', () => {
      const error = new Error('Server error');
      (error as unknown as { status: number }).status = 500;
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 502 status', () => {
      const error = new Error('Bad Gateway');
      (error as unknown as { status: number }).status = 502;
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 503 status', () => {
      const error = new Error('Service Unavailable');
      (error as unknown as { status: number }).status = 503;
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for 504 status', () => {
      const error = new Error('Gateway Timeout');
      (error as unknown as { status: number }).status = 504;
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for 400 status', () => {
      const error = new Error('Bad Request');
      (error as unknown as { status: number }).status = 400;
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 401 status', () => {
      const error = new Error('Unauthorized');
      (error as unknown as { status: number }).status = 401;
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns false for 403 status', () => {
      const error = new Error('Forbidden');
      (error as unknown as { status: number }).status = 403;
      expect(isRetryableError(error)).toBe(false);
    });

    it('returns true for network errors (no status)', () => {
      const error = new Error('Network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for timeout errors', () => {
      const error = new Error('Request timed out');
      error.name = 'TimeoutError';
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('sendStructuredMessage', () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
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

    it('parses JSON response correctly', async () => {
      const jsonResponse = { key: 'value', count: 42 };
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(jsonResponse) }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      const response = await sendStructuredMessage<{ key: string; count: number }>(
        service,
        {
          systemPrompt: 'Return JSON',
          userMessage: 'Give me data',
        }
      );

      expect(response.data).toEqual(jsonResponse);
      expect(response.content).toBe(JSON.stringify(jsonResponse));
    });

    it('handles JSON wrapped in markdown code blocks', async () => {
      const jsonResponse = { name: 'test' };
      const wrappedResponse = '```json\n' + JSON.stringify(jsonResponse) + '\n```';

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: wrappedResponse }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();
      const response = await sendStructuredMessage<{ name: string }>(service, {
        systemPrompt: 'Return JSON',
        userMessage: 'Give me data',
      });

      expect(response.data).toEqual(jsonResponse);
    });

    it('throws AIError for invalid JSON', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'not valid json' }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      const service = createAIService();

      await expect(
        sendStructuredMessage<{ key: string }>(service, {
          systemPrompt: 'Return JSON',
          userMessage: 'Give me data',
        })
      ).rejects.toMatchObject({
        code: 'JSON_PARSE_ERROR',
      });
    });

    it('parses complex nested JSON correctly', async () => {
      const complexJson = {
        concepts: [
          { id: '1', name: 'Concept 1', relations: ['2', '3'] },
          { id: '2', name: 'Concept 2', relations: [] },
        ],
        metadata: {
          total: 2,
          generated: true,
        },
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(complexJson) }],
        model: AI_MODEL_IDS['claude-sonnet'],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      });

      interface ComplexType {
        concepts: Array<{ id: string; name: string; relations: string[] }>;
        metadata: { total: number; generated: boolean };
      }

      const service = createAIService();
      const response = await sendStructuredMessage<ComplexType>(service, {
        systemPrompt: 'Return JSON',
        userMessage: 'Give me data',
      });

      expect(response.data).toEqual(complexJson);
      expect(response.data.concepts).toHaveLength(2);
      expect(response.data.metadata.total).toBe(2);
    });
  });

  describe('getDefaultService', () => {
    beforeEach(() => {
      resetDefaultService();
    });

    it('returns cached service instance', () => {
      const service1 = getDefaultService();
      const service2 = getDefaultService();

      expect(service1).toBe(service2);
    });

    it('throws when no API key is available', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => getDefaultService()).toThrow(AIError);
    });
  });
});
