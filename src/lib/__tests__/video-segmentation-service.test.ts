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

      const service = createVideoSegmentationService();
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
});
