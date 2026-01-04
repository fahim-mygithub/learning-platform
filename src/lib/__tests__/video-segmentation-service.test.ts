/**
 * Video Segmentation Service Tests
 *
 * Tests for finding intelligent video cutoff points using semantic boundary detection.
 */

jest.mock('../semantic-boundary-service');

import {
  createVideoSegmentationService,
  VideoSegmentationService,
  VideoSegment,
  VideoSegmentationError,
} from '../video-segmentation-service';
import { TranscriptSegment } from '../youtube-transcript-service';
import {
  createSemanticBoundaryService,
  SemanticBoundaryService,
} from '../semantic-boundary-service';

const mockBoundaryService = {
  findBoundaries: jest.fn(),
  findBoundariesWithMetadata: jest.fn(),
};

(createSemanticBoundaryService as jest.Mock).mockReturnValue(mockBoundaryService);

describe('VideoSegmentationService', () => {
  describe('createVideoSegmentationService', () => {
    it('creates service with default config', () => {
      const service = createVideoSegmentationService();

      expect(service).toBeDefined();
      expect(service.segmentTranscript).toBeInstanceOf(Function);
    });
  });

  describe('segmentTranscript', () => {
    let service: VideoSegmentationService;

    beforeEach(() => {
      service = createVideoSegmentationService();
    });

    it('returns empty array for empty segments', async () => {
      const result = await service.segmentTranscript([], 600);

      expect(result).toEqual([]);
    });

    it('returns single segment for short transcript', async () => {
      const segments: TranscriptSegment[] = [
        { text: 'Hello world.', start: 0, end: 30 },
      ];

      const result = await service.segmentTranscript(segments, 30);

      expect(result).toHaveLength(1);
      expect(result[0].startSec).toBe(0);
      expect(result[0].endSec).toBe(30);
      expect(result[0].text).toBe('Hello world.');
    });
  });

  describe('semantic boundary detection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls SemanticBoundaryService with segment texts', async () => {
      // Use timestamps that exceed minDurationSec (240 seconds)
      const segments: TranscriptSegment[] = [
        { text: 'Machine learning is about patterns.', start: 0, end: 100 },
        { text: 'Neural networks model the brain.', start: 100, end: 200 },
        { text: 'The French Revolution began in 1789.', start: 200, end: 300 },
        { text: 'It changed European politics.', start: 300, end: 400 },
      ];

      // Boundary at index 2 (topic shift from ML to history)
      mockBoundaryService.findBoundaries.mockResolvedValue([2]);

      // Use minDurationSec: 100 to prevent merging (each segment is 200 sec)
      const service = createVideoSegmentationService({ minDurationSec: 100 });
      const result = await service.segmentTranscript(segments, 400);

      expect(mockBoundaryService.findBoundaries).toHaveBeenCalledWith([
        'Machine learning is about patterns.',
        'Neural networks model the brain.',
        'The French Revolution began in 1789.',
        'It changed European politics.',
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].endSec).toBe(200); // First segment ends at boundary
      expect(result[1].startSec).toBe(200); // Second segment starts at boundary
    });
  });

  describe('duration optimization', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('merges segments shorter than minDuration', async () => {
      const segments: TranscriptSegment[] = [
        { text: 'Topic A part 1.', start: 0, end: 60 },
        { text: 'Topic A part 2.', start: 60, end: 120 },
        { text: 'Topic B.', start: 120, end: 180 }, // Too short alone
        { text: 'Topic C part 1.', start: 180, end: 420 },
        { text: 'Topic C part 2.', start: 420, end: 600 },
      ];

      // Boundaries at 2 and 3 would create a 60-second segment
      mockBoundaryService.findBoundaries.mockResolvedValue([2, 3]);

      const service = createVideoSegmentationService({
        minDurationSec: 180, // 3 minutes minimum
      });

      const result = await service.segmentTranscript(segments, 600);

      // Short segment should be merged with adjacent
      const allDurations = result.map(s => s.durationSec);
      expect(allDurations.every(d => d >= 180)).toBe(true);
    });

    it('respects maxDuration ceiling', async () => {
      const segments: TranscriptSegment[] = Array.from({ length: 20 }, (_, i) => ({
        text: `Sentence ${i}.`,
        start: i * 60,
        end: (i + 1) * 60,
      }));

      // No boundaries = 20 minute single segment
      mockBoundaryService.findBoundaries.mockResolvedValue([]);

      const service = createVideoSegmentationService({
        maxDurationSec: 900, // 15 minutes max
      });

      const result = await service.segmentTranscript(segments, 1200);

      // Should split to respect max duration
      const allDurations = result.map(s => s.durationSec);
      expect(allDurations.every(d => d <= 900)).toBe(true);
    });

    it('merges first segment if too short with next segment', async () => {
      const segments: TranscriptSegment[] = [
        { text: 'Short intro.', start: 0, end: 60 }, // Too short - first segment
        { text: 'Main topic part 1.', start: 60, end: 300 },
        { text: 'Main topic part 2.', start: 300, end: 600 },
      ];

      // Boundary at 1 would make first segment only 60 seconds
      mockBoundaryService.findBoundaries.mockResolvedValue([1]);

      const service = createVideoSegmentationService({
        minDurationSec: 180, // 3 minutes minimum
      });

      const result = await service.segmentTranscript(segments, 600);

      // First segment should be merged with next
      expect(result.length).toBeLessThanOrEqual(2);
      expect(result[0].startSec).toBe(0);
      expect(result[0].durationSec).toBeGreaterThanOrEqual(180);
    });
  });
});
