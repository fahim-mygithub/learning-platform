/**
 * Transcription Service Tests
 *
 * Tests for OpenAI Whisper API integration including:
 * - Starting transcription
 * - Status transitions
 * - Segment parsing
 * - Error handling
 * - Database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  Transcription,
  TranscriptionSegment,
  TranscriptionStatus,
} from '@/src/types/database';

// Mock OpenAI SDK
jest.mock('openai');

// Import after mocking
import {
  createTranscriptionService,
  TranscriptionService,
  TranscriptionError,
  WHISPER_MAX_FILE_SIZE,
} from '../transcription-service';

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('Transcription Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockStorage: {
    from: jest.Mock;
    download: jest.Mock;
  };
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockMaybeSingle: jest.Mock;

  // Mock OpenAI client
  let mockOpenAI: {
    audio: {
      transcriptions: {
        create: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Supabase mock chain
    mockMaybeSingle = jest.fn();
    mockSingle = jest.fn().mockReturnValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnValue({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    // Set up storage mock
    mockStorage = {
      from: jest.fn().mockReturnValue({
        download: jest.fn(),
      }),
      download: jest.fn(),
    };

    mockSupabase = {
      from: mockFrom,
      storage: mockStorage,
    } as unknown as jest.Mocked<SupabaseClient>;

    // Set up OpenAI mock
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
      },
    };

    MockedOpenAI.mockImplementation(() => mockOpenAI as unknown as OpenAI);
  });

  describe('createTranscriptionService', () => {
    it('creates service with valid API key', () => {
      const service = createTranscriptionService(mockSupabase, 'test-api-key');

      expect(service).toBeDefined();
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('throws error when API key is missing', () => {
      expect(() => createTranscriptionService(mockSupabase, '')).toThrow(
        TranscriptionError
      );
      expect(() => createTranscriptionService(mockSupabase, '')).toThrow(
        'OpenAI API key is required'
      );
    });

    it('throws error with correct code when API key is missing', () => {
      try {
        createTranscriptionService(mockSupabase, '');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptionError);
        expect((error as TranscriptionError).code).toBe('API_KEY_MISSING');
      }
    });
  });

  describe('startTranscription', () => {
    let service: TranscriptionService;

    beforeEach(() => {
      service = createTranscriptionService(mockSupabase, 'test-api-key');
    });

    it('creates pending transcription record in database', async () => {
      const sourceId = 'source-123';
      const transcriptionId = 'trans-456';

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert (pending status)
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: transcriptionId,
                source_id: sourceId,
                status: 'pending',
                full_text: '',
                segments: [],
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock status update to processing
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock Whisper API response
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Hello world',
        segments: [
          { start: 0, end: 1.5, text: 'Hello' },
          { start: 1.5, end: 3.0, text: 'world' },
        ],
      });

      // Mock final update with transcription result
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await service.startTranscription(sourceId);

      expect(result.transcriptionId).toBe(transcriptionId);
      // Verify insert was called with pending status
      expect(mockFrom).toHaveBeenCalledWith('transcriptions');
    });

    it('fetches source file from Supabase storage', async () => {
      const sourceId = 'source-123';
      const storagePath = 'sources/test-video.mp4';

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: storagePath,
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'trans-123', source_id: sourceId, status: 'pending' },
              error: null,
            }),
          }),
        }),
      });

      // Mock status updates
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock Whisper API
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Test transcription',
        segments: [],
      });

      await service.startTranscription(sourceId);

      expect(mockStorage.from).toHaveBeenCalledWith('sources');
    });

    it('calls Whisper API with correct audio data', async () => {
      const sourceId = 'source-123';

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
                name: 'video.mp4',
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'trans-123', source_id: sourceId, status: 'pending' },
              error: null,
            }),
          }),
        }),
      });

      // Mock status updates
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock Whisper API
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Test transcription',
        segments: [{ start: 0, end: 1, text: 'Test transcription' }],
      });

      await service.startTranscription(sourceId);

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper-1',
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        })
      );
    });

    it('transitions status from pending to processing to completed', async () => {
      const sourceId = 'source-123';
      const updateCalls: Array<{ status: TranscriptionStatus }> = [];

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert with pending status
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'trans-123', source_id: sourceId, status: 'pending' },
              error: null,
            }),
          }),
        }),
      });

      // Track update calls
      mockFrom.mockImplementation((table: string) => {
        if (table === 'transcriptions') {
          return {
            update: jest.fn().mockImplementation((data) => {
              if (data.status) {
                updateCalls.push({ status: data.status });
              }
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return { select: mockSelect };
      });

      // Mock Whisper API
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Test transcription',
        segments: [{ start: 0, end: 1, text: 'Test' }],
      });

      await service.startTranscription(sourceId);

      // Verify status transitions
      expect(updateCalls).toContainEqual({ status: 'processing' });
      expect(updateCalls).toContainEqual({ status: 'completed' });
    });

    it('parses segments correctly from Whisper response', async () => {
      const sourceId = 'source-123';
      let savedSegments: TranscriptionSegment[] = [];

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'trans-123', source_id: sourceId, status: 'pending' },
              error: null,
            }),
          }),
        }),
      });

      // Track update calls to capture segments
      mockFrom.mockImplementation((table: string) => {
        if (table === 'transcriptions') {
          return {
            update: jest.fn().mockImplementation((data) => {
              if (data.segments) {
                savedSegments = data.segments;
              }
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return { select: mockSelect };
      });

      // Mock Whisper API with detailed segments
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Hello world. This is a test.',
        segments: [
          { id: 0, start: 0.0, end: 1.5, text: ' Hello world.' },
          { id: 1, start: 1.5, end: 3.2, text: ' This is a test.' },
        ],
      });

      await service.startTranscription(sourceId);

      expect(savedSegments).toEqual([
        { start: 0.0, end: 1.5, text: 'Hello world.' },
        { start: 1.5, end: 3.2, text: 'This is a test.' },
      ]);
    });

    it('sets failed status with error message on Whisper API error', async () => {
      const sourceId = 'source-123';
      let savedError: string | null = null;
      let savedStatus: TranscriptionStatus | null = null;

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'trans-123', source_id: sourceId, status: 'pending' },
              error: null,
            }),
          }),
        }),
      });

      // Track update calls to capture error
      mockFrom.mockImplementation((table: string) => {
        if (table === 'transcriptions') {
          return {
            update: jest.fn().mockImplementation((data) => {
              if (data.error_message !== undefined) {
                savedError = data.error_message;
              }
              if (data.status) {
                savedStatus = data.status;
              }
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return { select: mockSelect };
      });

      // Mock Whisper API error
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('Audio processing failed')
      );

      await expect(service.startTranscription(sourceId)).rejects.toThrow(
        TranscriptionError
      );

      expect(savedStatus).toBe('failed');
      expect(savedError).toContain('Audio processing failed');
    });

    it('throws error for non-existent source', async () => {
      const sourceId = 'non-existent';

      // Mock source lookup returning null
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(service.startTranscription(sourceId)).rejects.toThrow(
        TranscriptionError
      );
      await expect(service.startTranscription(sourceId)).rejects.toThrow(
        'Source not found'
      );
    });

    it('throws error for source without storage path', async () => {
      const sourceId = 'source-123';

      // Mock source lookup with no storage_path (URL source)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: null,
                type: 'url',
              },
              error: null,
            }),
          }),
        }),
      });

      try {
        await service.startTranscription(sourceId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptionError);
        expect((error as TranscriptionError).message).toContain('Source has no storage path');
        expect((error as TranscriptionError).code).toBe('INVALID_SOURCE');
      }
    });

    it('throws error for file exceeding Whisper size limit', async () => {
      const sourceId = 'source-123';
      const largeFileSize = WHISPER_MAX_FILE_SIZE + 1;

      // Mock source lookup with large file
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/large-video.mp4',
                type: 'video',
                file_size: largeFileSize,
              },
              error: null,
            }),
          }),
        }),
      });

      try {
        await service.startTranscription(sourceId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptionError);
        expect((error as TranscriptionError).message).toContain('exceeds Whisper API limit');
        expect((error as TranscriptionError).code).toBe('FILE_TOO_LARGE');
      }
    });
  });

  describe('getStatus', () => {
    let service: TranscriptionService;

    beforeEach(() => {
      service = createTranscriptionService(mockSupabase, 'test-api-key');
    });

    it('returns current transcription status', async () => {
      const transcriptionId = 'trans-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: transcriptionId,
                status: 'processing',
                error_message: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await service.getStatus(transcriptionId);

      expect(status).toBe('processing');
    });

    it('returns completed status', async () => {
      const transcriptionId = 'trans-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: transcriptionId,
                status: 'completed',
                error_message: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await service.getStatus(transcriptionId);

      expect(status).toBe('completed');
    });

    it('throws error for non-existent transcription', async () => {
      const transcriptionId = 'non-existent';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(service.getStatus(transcriptionId)).rejects.toThrow(
        TranscriptionError
      );
      await expect(service.getStatus(transcriptionId)).rejects.toThrow(
        'Transcription not found'
      );
    });
  });

  describe('getTranscription', () => {
    let service: TranscriptionService;

    beforeEach(() => {
      service = createTranscriptionService(mockSupabase, 'test-api-key');
    });

    it('returns null for non-existent transcription', async () => {
      const sourceId = 'source-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getTranscription(sourceId);

      expect(result).toBeNull();
    });

    it('returns completed transcription with segments', async () => {
      const sourceId = 'source-123';
      const expectedTranscription: Transcription = {
        id: 'trans-123',
        source_id: sourceId,
        full_text: 'Hello world. This is a test.',
        segments: [
          { start: 0, end: 1.5, text: 'Hello world.' },
          { start: 1.5, end: 3.2, text: 'This is a test.' },
        ],
        language: 'en',
        confidence: 0.95,
        provider: 'openai-whisper',
        status: 'completed',
        error_message: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: expectedTranscription,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getTranscription(sourceId);

      expect(result).toEqual(expectedTranscription);
      expect(result?.full_text).toBe('Hello world. This is a test.');
      expect(result?.segments).toHaveLength(2);
      expect(result?.status).toBe('completed');
    });

    it('returns transcription with failed status', async () => {
      const sourceId = 'source-123';
      const failedTranscription: Transcription = {
        id: 'trans-123',
        source_id: sourceId,
        full_text: '',
        segments: [],
        language: 'en',
        confidence: null,
        provider: 'openai-whisper',
        status: 'failed',
        error_message: 'Audio processing failed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: failedTranscription,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getTranscription(sourceId);

      expect(result).toEqual(failedTranscription);
      expect(result?.status).toBe('failed');
      expect(result?.error_message).toBe('Audio processing failed');
    });
  });

  describe('cancelTranscription', () => {
    let service: TranscriptionService;

    beforeEach(() => {
      service = createTranscriptionService(mockSupabase, 'test-api-key');
    });

    it('updates status to failed with cancellation message', async () => {
      const transcriptionId = 'trans-123';
      let updatedData: { status?: string; error_message?: string } = {};

      // Mock lookup to verify transcription exists and is cancellable
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: transcriptionId,
                status: 'processing',
              },
              error: null,
            }),
          }),
        }),
      });

      // Track the update call
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockImplementation((data) => {
          updatedData = data;
          return {
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }),
      });

      await service.cancelTranscription(transcriptionId);

      expect(updatedData.status).toBe('failed');
      expect(updatedData.error_message).toContain('cancelled');
    });

    it('throws error for non-existent transcription', async () => {
      const transcriptionId = 'non-existent';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(service.cancelTranscription(transcriptionId)).rejects.toThrow(
        TranscriptionError
      );
      await expect(service.cancelTranscription(transcriptionId)).rejects.toThrow(
        'Transcription not found'
      );
    });

    it('throws error when trying to cancel completed transcription', async () => {
      const transcriptionId = 'trans-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: transcriptionId,
                status: 'completed',
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(service.cancelTranscription(transcriptionId)).rejects.toThrow(
        TranscriptionError
      );
      await expect(service.cancelTranscription(transcriptionId)).rejects.toThrow(
        'Cannot cancel'
      );
    });
  });

  describe('Error handling', () => {
    let service: TranscriptionService;

    beforeEach(() => {
      service = createTranscriptionService(mockSupabase, 'test-api-key');
    });

    it('handles storage download errors', async () => {
      const sourceId = 'source-123';

      // Mock source lookup - use mockReturnValue so it works for multiple calls
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download error
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        }),
      });

      try {
        await service.startTranscription(sourceId);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptionError);
        expect((error as TranscriptionError).message).toContain('download');
        expect((error as TranscriptionError).code).toBe('STORAGE_ERROR');
      }
    });

    it('handles database insert errors', async () => {
      const sourceId = 'source-123';

      // Mock source lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                storage_path: 'sources/video.mp4',
                type: 'video',
                file_size: 1000000,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock storage download success
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp4' });
      mockStorage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: audioBlob,
          error: null,
        }),
      });

      // Mock transcription insert error
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(service.startTranscription(sourceId)).rejects.toThrow(
        TranscriptionError
      );
    });
  });

  describe('TranscriptionError', () => {
    it('includes error code and message', () => {
      const error = new TranscriptionError('Test error', 'TRANSCRIPTION_FAILED');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TRANSCRIPTION_FAILED');
      expect(error.name).toBe('TranscriptionError');
    });

    it('includes optional details', () => {
      const error = new TranscriptionError('Test error', 'TRANSCRIPTION_FAILED', {
        sourceId: 'source-123',
        transcriptionId: 'trans-456',
      });

      expect(error.details).toEqual({
        sourceId: 'source-123',
        transcriptionId: 'trans-456',
      });
    });
  });
});
