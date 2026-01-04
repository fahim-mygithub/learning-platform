/**
 * Video Segmentation Service Tests
 *
 * Tests for finding intelligent video cutoff points using semantic boundary detection.
 */

import {
  createVideoSegmentationService,
  VideoSegmentationService,
  VideoSegment,
  VideoSegmentationError,
} from '../video-segmentation-service';
import { TranscriptSegment } from '../youtube-transcript-service';

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
});
