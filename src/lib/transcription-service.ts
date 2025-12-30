/**
 * Transcription Service for Video/Audio Content
 *
 * Provides video/audio transcription using OpenAI Whisper API with:
 * - Status tracking (pending -> processing -> completed/failed)
 * - Database storage via Supabase
 * - Segment extraction with timestamps
 * - Error handling and recovery
 *
 * @example
 * ```ts
 * import { createTranscriptionService } from '@/src/lib/transcription-service';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const service = createTranscriptionService(supabase, 'openai-api-key');
 *
 * // Start transcription
 * const { transcriptionId } = await service.startTranscription(sourceId);
 *
 * // Check status
 * const status = await service.getStatus(transcriptionId);
 *
 * // Get completed transcription
 * const transcription = await service.getTranscription(sourceId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
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
  /**
   * Start transcription for a source
   * @param sourceId - ID of the source to transcribe
   * @returns Object containing the transcription ID
   */
  startTranscription(sourceId: string): Promise<{ transcriptionId: string }>;

  /**
   * Get transcription status
   * @param transcriptionId - ID of the transcription
   * @returns Current status of the transcription
   */
  getStatus(transcriptionId: string): Promise<TranscriptionStatus>;

  /**
   * Get completed transcription for a source
   * @param sourceId - ID of the source
   * @returns Transcription record or null if not found
   */
  getTranscription(sourceId: string): Promise<Transcription | null>;

  /**
   * Cancel an ongoing transcription
   * @param transcriptionId - ID of the transcription to cancel
   */
  cancelTranscription(transcriptionId: string): Promise<void>;
}

/**
 * Whisper API response segment type
 */
interface WhisperSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Whisper API verbose JSON response type
 */
interface WhisperVerboseResponse {
  text: string;
  segments?: WhisperSegment[];
  language?: string;
}

/**
 * Source record from database (subset of fields needed)
 */
interface SourceRecord {
  id: string;
  storage_path: string | null;
  type: string;
  file_size: number | null;
  name?: string;
}

/**
 * Parse Whisper segments into TranscriptionSegment format
 * @param segments - Raw segments from Whisper API
 * @returns Parsed segments with trimmed text
 */
function parseWhisperSegments(
  segments: WhisperSegment[] | undefined
): TranscriptionSegment[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  return segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }));
}

/**
 * Create a transcription service instance
 *
 * @param supabase - Supabase client instance
 * @param openaiApiKey - OpenAI API key for Whisper API
 * @returns Transcription service instance
 * @throws TranscriptionError if API key is missing
 */
export function createTranscriptionService(
  supabase: SupabaseClient,
  openaiApiKey: string
): TranscriptionService {
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new TranscriptionError(
      'OpenAI API key is required',
      'API_KEY_MISSING'
    );
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  /**
   * Fetch source record from database
   */
  async function fetchSource(sourceId: string): Promise<SourceRecord> {
    const { data, error } = await supabase
      .from('sources')
      .select('id, storage_path, type, file_size, name')
      .eq('id', sourceId)
      .single();

    if (error) {
      throw new TranscriptionError(
        `Failed to fetch source: ${error.message}`,
        'DATABASE_ERROR',
        { sourceId }
      );
    }

    if (!data) {
      throw new TranscriptionError('Source not found', 'SOURCE_NOT_FOUND', {
        sourceId,
      });
    }

    return data as SourceRecord;
  }

  /**
   * Download file from Supabase storage
   */
  async function downloadFile(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('sources')
      .download(storagePath);

    if (error || !data) {
      throw new TranscriptionError(
        `Failed to download file: ${error?.message || 'Unknown error'}`,
        'STORAGE_ERROR',
        { storagePath }
      );
    }

    return data;
  }

  /**
   * Create a pending transcription record
   */
  async function createPendingTranscription(
    sourceId: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        source_id: sourceId,
        full_text: '',
        segments: [],
        language: 'en',
        provider: 'openai-whisper',
        status: 'pending' as TranscriptionStatus,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new TranscriptionError(
        `Failed to create transcription record: ${error?.message || 'Unknown error'}`,
        'DATABASE_ERROR',
        { sourceId }
      );
    }

    return data.id;
  }

  /**
   * Update transcription status
   */
  async function updateStatus(
    transcriptionId: string,
    status: TranscriptionStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: {
      status: TranscriptionStatus;
      error_message?: string | null;
    } = { status };

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('transcriptions')
      .update(updateData)
      .eq('id', transcriptionId);

    if (error) {
      console.error('Failed to update transcription status:', error);
    }
  }

  /**
   * Save completed transcription result
   */
  async function saveTranscriptionResult(
    transcriptionId: string,
    fullText: string,
    segments: TranscriptionSegment[],
    language: string
  ): Promise<void> {
    const { error } = await supabase
      .from('transcriptions')
      .update({
        full_text: fullText,
        segments,
        language,
        status: 'completed' as TranscriptionStatus,
        error_message: null,
      })
      .eq('id', transcriptionId);

    if (error) {
      throw new TranscriptionError(
        `Failed to save transcription result: ${error.message}`,
        'DATABASE_ERROR',
        { transcriptionId }
      );
    }
  }

  /**
   * Call Whisper API to transcribe audio
   */
  async function transcribeWithWhisper(
    audioBlob: Blob,
    fileName: string
  ): Promise<WhisperVerboseResponse> {
    // Create a File object from the Blob
    const file = new File([audioBlob], fileName, { type: audioBlob.type });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return response as unknown as WhisperVerboseResponse;
  }

  return {
    async startTranscription(
      sourceId: string
    ): Promise<{ transcriptionId: string }> {
      // 1. Fetch source record
      const source = await fetchSource(sourceId);

      // 2. Validate source has storage path
      if (!source.storage_path) {
        throw new TranscriptionError(
          'Source has no storage path',
          'INVALID_SOURCE',
          { sourceId }
        );
      }

      // 3. Validate file size
      if (source.file_size && source.file_size > WHISPER_MAX_FILE_SIZE) {
        throw new TranscriptionError(
          `File size (${source.file_size} bytes) exceeds Whisper API limit (${WHISPER_MAX_FILE_SIZE} bytes)`,
          'FILE_TOO_LARGE',
          { sourceId, fileSize: source.file_size }
        );
      }

      // 4. Download file from storage
      const audioBlob = await downloadFile(source.storage_path);

      // 5. Create pending transcription record
      const transcriptionId = await createPendingTranscription(sourceId);

      // 6. Update status to processing
      await updateStatus(transcriptionId, 'processing');

      try {
        // 7. Call Whisper API
        const fileName = source.name || 'audio.mp4';
        const whisperResponse = await transcribeWithWhisper(audioBlob, fileName);

        // 8. Parse segments
        const segments = parseWhisperSegments(whisperResponse.segments);

        // 9. Save result
        await saveTranscriptionResult(
          transcriptionId,
          whisperResponse.text,
          segments,
          whisperResponse.language || 'en'
        );

        return { transcriptionId };
      } catch (error) {
        // Update status to failed with error message
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        await updateStatus(transcriptionId, 'failed', errorMessage);

        throw new TranscriptionError(
          `Transcription failed: ${errorMessage}`,
          'TRANSCRIPTION_FAILED',
          { sourceId, transcriptionId }
        );
      }
    },

    async getStatus(transcriptionId: string): Promise<TranscriptionStatus> {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('status')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        throw new TranscriptionError(
          `Failed to get transcription status: ${error.message}`,
          'DATABASE_ERROR',
          { transcriptionId }
        );
      }

      if (!data) {
        throw new TranscriptionError(
          'Transcription not found',
          'TRANSCRIPTION_NOT_FOUND',
          { transcriptionId }
        );
      }

      return data.status as TranscriptionStatus;
    },

    async getTranscription(sourceId: string): Promise<Transcription | null> {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('source_id', sourceId)
        .maybeSingle();

      if (error) {
        throw new TranscriptionError(
          `Failed to get transcription: ${error.message}`,
          'DATABASE_ERROR',
          { sourceId }
        );
      }

      return data as Transcription | null;
    },

    async cancelTranscription(transcriptionId: string): Promise<void> {
      // First, check if transcription exists and can be cancelled
      const { data, error } = await supabase
        .from('transcriptions')
        .select('id, status')
        .eq('id', transcriptionId)
        .single();

      if (error) {
        throw new TranscriptionError(
          `Failed to get transcription: ${error.message}`,
          'DATABASE_ERROR',
          { transcriptionId }
        );
      }

      if (!data) {
        throw new TranscriptionError(
          'Transcription not found',
          'TRANSCRIPTION_NOT_FOUND',
          { transcriptionId }
        );
      }

      // Check if transcription can be cancelled
      if (data.status === 'completed' || data.status === 'failed') {
        throw new TranscriptionError(
          `Cannot cancel transcription with status: ${data.status}`,
          'CANCELLED',
          { transcriptionId, currentStatus: data.status }
        );
      }

      // Update status to failed with cancellation message
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({
          status: 'failed' as TranscriptionStatus,
          error_message: 'Transcription cancelled by user',
        })
        .eq('id', transcriptionId);

      if (updateError) {
        throw new TranscriptionError(
          `Failed to cancel transcription: ${updateError.message}`,
          'DATABASE_ERROR',
          { transcriptionId }
        );
      }
    },
  };
}

/**
 * Get the default transcription service using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Transcription service instance
 * @throws TranscriptionError if EXPO_PUBLIC_OPENAI_API_KEY is not set
 */
export function getDefaultTranscriptionService(
  supabase: SupabaseClient
): TranscriptionService {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new TranscriptionError(
      'EXPO_PUBLIC_OPENAI_API_KEY environment variable is required',
      'API_KEY_MISSING'
    );
  }

  return createTranscriptionService(supabase, apiKey);
}
