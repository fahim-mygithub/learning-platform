/**
 * Video Segmentation Service
 *
 * Finds intelligent video cutoff points using semantic boundary detection.
 * Creates segments at natural topic transitions, targeting 5-7 minute chunks.
 *
 * Flow:
 * 1. Extract sentences from transcript segments with timestamps
 * 2. Run semantic boundary detection to find topic shifts
 * 3. Map boundary indices to video timestamps
 * 4. Optimize segments for target duration (5-7 min)
 */

import { TranscriptSegment } from './youtube-transcript-service';
import {
  createSemanticBoundaryService,
  SemanticBoundaryService,
  SemanticBoundaryError,
} from './semantic-boundary-service';

/**
 * Error codes for video segmentation operations
 */
export type VideoSegmentationErrorCode =
  | 'API_KEY_MISSING'
  | 'SEGMENTATION_FAILED'
  | 'EMPTY_TRANSCRIPT'
  | 'BOUNDARY_DETECTION_FAILED'
  | 'VALIDATION_ERROR';

/**
 * Custom error class for video segmentation operations
 */
export class VideoSegmentationError extends Error {
  code: VideoSegmentationErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: VideoSegmentationErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VideoSegmentationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * A video segment with timing and content
 */
export interface VideoSegment {
  /** Unique identifier */
  id: string;
  /** Start time in seconds */
  startSec: number;
  /** End time in seconds */
  endSec: number;
  /** Duration in seconds */
  durationSec: number;
  /** Combined text from all transcript segments in this video segment */
  text: string;
  /** Individual sentences/segments in this chunk */
  sentences: string[];
  /** Index in the segments array where this chunk starts */
  startIndex: number;
  /** Index in the segments array where this chunk ends (exclusive) */
  endIndex: number;
}

/**
 * Video segmentation service interface
 */
export interface VideoSegmentationService {
  /**
   * Segment a transcript into semantically coherent video chunks
   *
   * @param segments - Transcript segments with timestamps
   * @param videoDuration - Total video duration in seconds
   * @returns Array of video segments optimized for 5-7 minute duration
   */
  segmentTranscript(
    segments: TranscriptSegment[],
    videoDuration: number
  ): Promise<VideoSegment[]>;
}

/**
 * Configuration for video segmentation
 */
export interface VideoSegmentationConfig {
  /** Target segment duration in seconds (default: 360 = 6 minutes) */
  targetDurationSec?: number;
  /** Minimum segment duration in seconds (default: 240 = 4 minutes) */
  minDurationSec?: number;
  /** Maximum segment duration in seconds (default: 900 = 15 minutes) */
  maxDurationSec?: number;
  /** ID prefix for segments (default: "segment") */
  segmentIdPrefix?: string;
  /** Semantic boundary service (default: creates new instance) */
  boundaryService?: SemanticBoundaryService;
}

const DEFAULT_CONFIG: Required<Omit<VideoSegmentationConfig, 'boundaryService'>> = {
  targetDurationSec: 360, // 6 minutes (middle of 5-7)
  minDurationSec: 240, // 4 minutes
  maxDurationSec: 900, // 15 minutes (hard ceiling)
  segmentIdPrefix: 'segment',
};

/**
 * Create a video segmentation service instance
 */
export function createVideoSegmentationService(
  config: VideoSegmentationConfig = {}
): VideoSegmentationService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Create or use provided boundary service
  let boundaryService: SemanticBoundaryService;
  try {
    boundaryService = config.boundaryService ?? createSemanticBoundaryService();
  } catch (error) {
    if (error instanceof SemanticBoundaryError) {
      throw new VideoSegmentationError(
        `Failed to initialize boundary service: ${error.message}`,
        'API_KEY_MISSING',
        { cause: error }
      );
    }
    throw error;
  }

  /**
   * Map semantic boundaries to video segments
   */
  function mapBoundariesToSegments(
    segments: TranscriptSegment[],
    boundaries: number[],
    prefix: string
  ): VideoSegment[] {
    if (segments.length === 0) return [];

    // Create segment boundaries: [0, boundary1, boundary2, ..., segments.length]
    const segmentBoundaries = [
      0,
      ...boundaries.filter((b) => b > 0 && b < segments.length),
      segments.length,
    ];
    const uniqueBoundaries = [...new Set(segmentBoundaries)].sort(
      (a, b) => a - b
    );

    const videoSegments: VideoSegment[] = [];

    for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
      const startIdx = uniqueBoundaries[i];
      const endIdx = uniqueBoundaries[i + 1];

      if (startIdx >= endIdx) continue;

      const chunkSegments = segments.slice(startIdx, endIdx);
      const startSec = chunkSegments[0].start;
      const endSec = chunkSegments[chunkSegments.length - 1].end;

      videoSegments.push({
        id: `${prefix}-${videoSegments.length}`,
        startSec,
        endSec,
        durationSec: endSec - startSec,
        text: chunkSegments.map((s) => s.text).join(' '),
        sentences: chunkSegments.map((s) => s.text),
        startIndex: startIdx,
        endIndex: endIdx,
      });
    }

    return videoSegments;
  }

  /**
   * Merge segments that are too short with adjacent segments
   */
  function optimizeShortSegments(
    videoSegments: VideoSegment[],
    minDurationSec: number
  ): VideoSegment[] {
    if (videoSegments.length <= 1) return videoSegments;

    const result: VideoSegment[] = [];

    for (let i = 0; i < videoSegments.length; i++) {
      const current = videoSegments[i];

      if (current.durationSec < minDurationSec && result.length > 0) {
        // Merge with previous segment
        const prev = result[result.length - 1];
        result[result.length - 1] = {
          ...prev,
          endSec: current.endSec,
          durationSec: current.endSec - prev.startSec,
          text: prev.text + ' ' + current.text,
          sentences: [...prev.sentences, ...current.sentences],
          endIndex: current.endIndex,
        };
      } else if (current.durationSec < minDurationSec && i < videoSegments.length - 1) {
        // Merge with next segment (modify next in place)
        const next = videoSegments[i + 1];
        videoSegments[i + 1] = {
          ...next,
          startSec: current.startSec,
          durationSec: next.endSec - current.startSec,
          text: current.text + ' ' + next.text,
          sentences: [...current.sentences, ...next.sentences],
          startIndex: current.startIndex,
        };
      } else {
        result.push(current);
      }
    }

    return result;
  }

  /**
   * Split segments that exceed maxDuration at roughly equal intervals
   */
  function splitLongSegments(
    videoSegments: VideoSegment[],
    maxDurationSec: number,
    prefix: string
  ): VideoSegment[] {
    const result: VideoSegment[] = [];

    for (const segment of videoSegments) {
      if (segment.durationSec <= maxDurationSec) {
        result.push({ ...segment, id: `${prefix}-${result.length}` });
        continue;
      }

      // Split at roughly equal intervals
      const numSplits = Math.ceil(segment.durationSec / maxDurationSec);
      const sentencesPerSplit = Math.ceil(segment.sentences.length / numSplits);

      for (let i = 0; i < numSplits; i++) {
        const startSentenceIdx = i * sentencesPerSplit;
        const endSentenceIdx = Math.min((i + 1) * sentencesPerSplit, segment.sentences.length);

        if (startSentenceIdx >= segment.sentences.length) break;

        const splitSentences = segment.sentences.slice(startSentenceIdx, endSentenceIdx);

        // Calculate time based on proportion
        const proportion = splitSentences.length / segment.sentences.length;
        const splitDuration = segment.durationSec * proportion;
        const splitStart = segment.startSec + (i * segment.durationSec / numSplits);
        const splitEnd = splitStart + splitDuration;

        result.push({
          id: `${prefix}-${result.length}`,
          startSec: Math.round(splitStart),
          endSec: Math.round(splitEnd),
          durationSec: Math.round(splitDuration),
          text: splitSentences.join(' '),
          sentences: splitSentences,
          startIndex: segment.startIndex + startSentenceIdx,
          endIndex: segment.startIndex + endSentenceIdx,
        });
      }
    }

    return result;
  }

  return {
    async segmentTranscript(
      segments: TranscriptSegment[],
      videoDuration: number
    ): Promise<VideoSegment[]> {
      // Handle empty input
      if (!segments || segments.length === 0) {
        return [];
      }

      // For very short transcripts (under minDuration), return as single segment
      const totalDuration = videoDuration || segments[segments.length - 1].end;

      if (totalDuration <= finalConfig.minDurationSec || segments.length === 1) {
        const allText = segments.map((s) => s.text).join(' ');
        return [
          {
            id: `${finalConfig.segmentIdPrefix}-0`,
            startSec: segments[0].start,
            endSec: segments[segments.length - 1].end,
            durationSec: segments[segments.length - 1].end - segments[0].start,
            text: allText,
            sentences: segments.map((s) => s.text),
            startIndex: 0,
            endIndex: segments.length,
          },
        ];
      }

      // Extract text from segments for boundary detection
      const texts = segments.map((s) => s.text);

      // Find semantic boundaries
      let boundaries: number[];
      try {
        boundaries = await boundaryService.findBoundaries(texts);
      } catch (error) {
        throw new VideoSegmentationError(
          `Boundary detection failed: ${(error as Error).message}`,
          'BOUNDARY_DETECTION_FAILED',
          { cause: error }
        );
      }

      // Map boundaries to video segments
      let videoSegments = mapBoundariesToSegments(
        segments,
        boundaries,
        finalConfig.segmentIdPrefix
      );

      // Optimize: merge short segments
      videoSegments = optimizeShortSegments(videoSegments, finalConfig.minDurationSec);

      // Optimize: split long segments
      videoSegments = splitLongSegments(
        videoSegments,
        finalConfig.maxDurationSec,
        finalConfig.segmentIdPrefix
      );

      // Re-number IDs sequentially
      videoSegments = videoSegments.map((seg, idx) => ({
        ...seg,
        id: `${finalConfig.segmentIdPrefix}-${idx}`,
      }));

      return videoSegments;
    },
  };
}
