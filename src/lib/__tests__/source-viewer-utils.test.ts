/**
 * Source Viewer Utils Tests
 *
 * Tests for the source viewer utility functions:
 * - YouTube URL detection and video ID extraction
 * - Video MIME type detection
 * - PDF MIME type detection
 * - Viewer type determination
 */

import {
  isYouTubeUrl,
  extractYouTubeId,
  isVideoMimeType,
  isPdfMimeType,
  getViewerType,
} from '../source-viewer-utils';
import type { Source } from '../../types/database';

/**
 * Helper function to create a mock Source object
 */
function createMockSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'source-1',
    project_id: 'project-1',
    name: 'Test Source',
    type: 'url',
    url: null,
    storage_path: null,
    mime_type: null,
    status: 'ready',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('source-viewer-utils', () => {
  describe('isYouTubeUrl', () => {
    it('returns true for youtube.com watch URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('http://youtube.com/watch?v=abc12345678')).toBe(true);
    });

    it('returns true for youtu.be URLs', () => {
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('http://youtu.be/abc12345678')).toBe(true);
    });

    it('returns true for youtube.com/shorts URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    });

    it('returns true for youtube.com/embed URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('returns false for non-YouTube URLs', () => {
      expect(isYouTubeUrl('https://vimeo.com/123')).toBe(false);
      expect(isYouTubeUrl('https://example.com/video')).toBe(false);
      expect(isYouTubeUrl('https://google.com')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isYouTubeUrl(null)).toBe(false);
    });
  });

  describe('extractYouTubeId', () => {
    it('extracts video ID from standard watch URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('http://youtube.com/watch?v=abc12345678')).toBe('abc12345678');
    });

    it('extracts video ID from youtu.be URLs', () => {
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('http://youtu.be/abc12345678')).toBe('abc12345678');
    });

    it('extracts video ID from shorts URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from embed URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('handles URLs with additional parameters', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=120')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for non-YouTube URLs', () => {
      expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
      expect(extractYouTubeId('https://example.com')).toBeNull();
    });

    it('returns null for invalid YouTube URLs', () => {
      expect(extractYouTubeId('https://youtube.com')).toBeNull();
      expect(extractYouTubeId('https://youtube.com/watch')).toBeNull();
    });
  });

  describe('isVideoMimeType', () => {
    it('returns true for video MIME types', () => {
      expect(isVideoMimeType('video/mp4')).toBe(true);
      expect(isVideoMimeType('video/webm')).toBe(true);
      expect(isVideoMimeType('video/quicktime')).toBe(true);
      expect(isVideoMimeType('video/x-msvideo')).toBe(true);
    });

    it('returns false for non-video MIME types', () => {
      expect(isVideoMimeType('application/pdf')).toBe(false);
      expect(isVideoMimeType('image/jpeg')).toBe(false);
      expect(isVideoMimeType('text/html')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isVideoMimeType(null)).toBe(false);
    });
  });

  describe('isPdfMimeType', () => {
    it('returns true for PDF MIME type', () => {
      expect(isPdfMimeType('application/pdf')).toBe(true);
    });

    it('returns false for non-PDF MIME types', () => {
      expect(isPdfMimeType('video/mp4')).toBe(false);
      expect(isPdfMimeType('image/jpeg')).toBe(false);
      expect(isPdfMimeType('text/html')).toBe(false);
      expect(isPdfMimeType('application/json')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPdfMimeType(null)).toBe(false);
    });
  });

  describe('getViewerType', () => {
    it('returns "youtube" for YouTube URLs', () => {
      const source = createMockSource({
        type: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
      expect(getViewerType(source)).toBe('youtube');
    });

    it('returns "video" for video MIME types', () => {
      const source = createMockSource({
        type: 'video',
        mime_type: 'video/mp4',
      });
      expect(getViewerType(source)).toBe('video');
    });

    it('returns "pdf" for PDF MIME types', () => {
      const source = createMockSource({
        type: 'pdf',
        mime_type: 'application/pdf',
      });
      expect(getViewerType(source)).toBe('pdf');
    });

    it('returns "web" for other URL sources', () => {
      const source = createMockSource({
        type: 'url',
        url: 'https://example.com/article',
      });
      expect(getViewerType(source)).toBe('web');
    });

    it('returns "web" for sources without type indicators', () => {
      const source = createMockSource({
        type: 'url',
        url: null,
        mime_type: null,
      });
      expect(getViewerType(source)).toBe('web');
    });

    it('prioritizes YouTube detection over other types', () => {
      // Even if there's a video mime type, YouTube URL should take precedence
      const source = createMockSource({
        type: 'url',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mime_type: 'video/mp4',
      });
      expect(getViewerType(source)).toBe('youtube');
    });
  });
});
