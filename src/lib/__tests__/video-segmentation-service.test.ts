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
});
