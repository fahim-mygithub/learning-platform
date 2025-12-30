/**
 * Mock Transcription Service for Testing
 *
 * Provides predictable responses for testing components that depend on the transcription service.
 * Configurable to simulate errors, delays, and custom transcription results.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Transcription,
  TranscriptionSegment,
  TranscriptionStatus,
} from '@/src/types/database';

/**
 * Maximum file size for Whisper API (25MB)
 */
export const WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Error codes for transcription operations
 */
export type TranscriptionErrorCode =
  | 'API_KEY_MISSING'
  | 'SOURCE_NOT_FOUND'
  | 'STORAGE_ERROR'
  | 'DATABASE_ERROR'
  | 'TRANSCRIPTION_FAILED'
  | 'TRANSCRIPTION_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_SOURCE'
  | 'CANCELLED';

/**
 * Custom error class for transcription operations
 */
export class TranscriptionError extends Error {
  code: TranscriptionErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: TranscriptionErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Transcription service interface
 */
export interface TranscriptionService {
  startTranscription(sourceId: string): Promise<{ transcriptionId: string }>;
  getStatus(transcriptionId: string): Promise<TranscriptionStatus>;
  getTranscription(sourceId: string): Promise<Transcription | null>;
  cancelTranscription(transcriptionId: string): Promise<void>;
}

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockTranscriptionServiceConfig {
  /** Default transcription result */
  defaultTranscription?: Partial<Transcription>;
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: TranscriptionError | Error;
  /** Delay in milliseconds before responding */
  responseDelayMs?: number;
  /** Custom transcriptions keyed by source ID */
  customTranscriptions?: Map<string, Transcription>;
  /** Custom statuses keyed by transcription ID */
  customStatuses?: Map<string, TranscriptionStatus>;
}

/**
 * Global mock configuration
 */
let mockConfig: MockTranscriptionServiceConfig = {
  defaultTranscription: {
    full_text: 'This is a mock transcription for testing purposes.',
    segments: [
      { start: 0, end: 2.5, text: 'This is a mock transcription' },
      { start: 2.5, end: 4.0, text: 'for testing purposes.' },
    ],
    language: 'en',
    confidence: 0.95,
    provider: 'openai-whisper',
    status: 'completed',
  },
  shouldError: false,
  responseDelayMs: 0,
};

/**
 * Track calls for verification in tests
 */
interface MockCallRecord {
  method: string;
  timestamp: number;
  args: unknown[];
}

const callHistory: MockCallRecord[] = [];

/**
 * Internal state for mock transcriptions
 */
const transcriptionState = new Map<
  string,
  { status: TranscriptionStatus; sourceId: string }
>();
let transcriptionIdCounter = 1;

/**
 * Configure the mock behavior
 */
export function configureMock(
  config: Partial<MockTranscriptionServiceConfig>
): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    defaultTranscription: {
      full_text: 'This is a mock transcription for testing purposes.',
      segments: [
        { start: 0, end: 2.5, text: 'This is a mock transcription' },
        { start: 2.5, end: 4.0, text: 'for testing purposes.' },
      ],
      language: 'en',
      confidence: 0.95,
      provider: 'openai-whisper',
      status: 'completed',
    },
    shouldError: false,
    responseDelayMs: 0,
  };
  callHistory.length = 0;
  transcriptionState.clear();
  transcriptionIdCounter = 1;
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockTranscriptionServiceConfig {
  return { ...mockConfig };
}

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
 * Create a mock transcription service
 */
export function createTranscriptionService(
  _supabase: SupabaseClient,
  openaiApiKey: string
): TranscriptionService {
  // Simulate API key check
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new TranscriptionError(
      'OpenAI API key is required',
      'API_KEY_MISSING'
    );
  }

  return {
    async startTranscription(
      sourceId: string
    ): Promise<{ transcriptionId: string }> {
      callHistory.push({
        method: 'startTranscription',
        timestamp: Date.now(),
        args: [sourceId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Simulate error if configured
      if (mockConfig.shouldError) {
        throw (
          mockConfig.errorToThrow ||
          new TranscriptionError('Mock transcription error', 'TRANSCRIPTION_FAILED')
        );
      }

      // Generate mock transcription ID
      const transcriptionId = `mock-trans-${transcriptionIdCounter++}`;

      // Store state
      transcriptionState.set(transcriptionId, {
        status: 'completed',
        sourceId,
      });

      return { transcriptionId };
    },

    async getStatus(transcriptionId: string): Promise<TranscriptionStatus> {
      callHistory.push({
        method: 'getStatus',
        timestamp: Date.now(),
        args: [transcriptionId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Simulate error if configured
      if (mockConfig.shouldError) {
        throw (
          mockConfig.errorToThrow ||
          new TranscriptionError('Mock status error', 'DATABASE_ERROR')
        );
      }

      // Check for custom status
      if (mockConfig.customStatuses?.has(transcriptionId)) {
        return mockConfig.customStatuses.get(transcriptionId)!;
      }

      // Check internal state
      const state = transcriptionState.get(transcriptionId);
      if (state) {
        return state.status;
      }

      // Default: return completed
      return 'completed';
    },

    async getTranscription(sourceId: string): Promise<Transcription | null> {
      callHistory.push({
        method: 'getTranscription',
        timestamp: Date.now(),
        args: [sourceId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Simulate error if configured
      if (mockConfig.shouldError) {
        throw (
          mockConfig.errorToThrow ||
          new TranscriptionError('Mock get error', 'DATABASE_ERROR')
        );
      }

      // Check for custom transcription
      if (mockConfig.customTranscriptions?.has(sourceId)) {
        return mockConfig.customTranscriptions.get(sourceId)!;
      }

      // Return default mock transcription
      if (mockConfig.defaultTranscription) {
        return {
          id: `mock-trans-${sourceId}`,
          source_id: sourceId,
          full_text: mockConfig.defaultTranscription.full_text || '',
          segments: mockConfig.defaultTranscription.segments || [],
          language: mockConfig.defaultTranscription.language || 'en',
          confidence: mockConfig.defaultTranscription.confidence || null,
          provider: mockConfig.defaultTranscription.provider || 'openai-whisper',
          status: mockConfig.defaultTranscription.status || 'completed',
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      return null;
    },

    async cancelTranscription(transcriptionId: string): Promise<void> {
      callHistory.push({
        method: 'cancelTranscription',
        timestamp: Date.now(),
        args: [transcriptionId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Simulate error if configured
      if (mockConfig.shouldError) {
        throw (
          mockConfig.errorToThrow ||
          new TranscriptionError('Mock cancel error', 'DATABASE_ERROR')
        );
      }

      // Check if transcription exists in state
      const state = transcriptionState.get(transcriptionId);
      if (state) {
        if (state.status === 'completed' || state.status === 'failed') {
          throw new TranscriptionError(
            `Cannot cancel transcription with status: ${state.status}`,
            'CANCELLED'
          );
        }
        state.status = 'failed';
      }
    },
  };
}

/**
 * Mock default transcription segments for common test scenarios
 */
export const MOCK_TRANSCRIPTION_SEGMENTS: TranscriptionSegment[] = [
  { start: 0, end: 2.5, text: 'Welcome to this educational video.' },
  { start: 2.5, end: 5.0, text: 'Today we will learn about testing.' },
  { start: 5.0, end: 8.2, text: 'Testing is an important part of software development.' },
  { start: 8.2, end: 11.0, text: 'It helps ensure your code works correctly.' },
  { start: 11.0, end: 14.5, text: 'Let us begin with unit testing concepts.' },
];

/**
 * Mock full transcription text
 */
export const MOCK_FULL_TEXT =
  'Welcome to this educational video. Today we will learn about testing. ' +
  'Testing is an important part of software development. ' +
  'It helps ensure your code works correctly. ' +
  'Let us begin with unit testing concepts.';

/**
 * Create a complete mock transcription for testing
 */
export function createMockTranscription(
  sourceId: string,
  overrides?: Partial<Transcription>
): Transcription {
  return {
    id: `mock-trans-${sourceId}`,
    source_id: sourceId,
    full_text: MOCK_FULL_TEXT,
    segments: MOCK_TRANSCRIPTION_SEGMENTS,
    language: 'en',
    confidence: 0.95,
    provider: 'openai-whisper',
    status: 'completed',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Get the default transcription service (mock version)
 */
export function getDefaultTranscriptionService(
  supabase: SupabaseClient
): TranscriptionService {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || 'mock-api-key';
  return createTranscriptionService(supabase, apiKey);
}
