/**
 * File Validation Utilities Tests
 *
 * Tests for file type, size validation, and helper utilities.
 */

import {
  ALLOWED_VIDEO_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_VIDEO_SIZE,
  MAX_PDF_SIZE,
  validateFileType,
  validateFileSize,
  getSourceTypeFromMime,
  formatFileSize,
} from '../file-validation';

describe('file validation constants', () => {
  describe('ALLOWED_VIDEO_TYPES', () => {
    it('includes video/mp4', () => {
      expect(ALLOWED_VIDEO_TYPES).toContain('video/mp4');
    });

    it('includes video/quicktime', () => {
      expect(ALLOWED_VIDEO_TYPES).toContain('video/quicktime');
    });

    it('includes video/webm', () => {
      expect(ALLOWED_VIDEO_TYPES).toContain('video/webm');
    });

    it('contains exactly 3 video types', () => {
      expect(ALLOWED_VIDEO_TYPES).toHaveLength(3);
    });
  });

  describe('ALLOWED_PDF_TYPES', () => {
    it('includes application/pdf', () => {
      expect(ALLOWED_PDF_TYPES).toContain('application/pdf');
    });

    it('contains exactly 1 PDF type', () => {
      expect(ALLOWED_PDF_TYPES).toHaveLength(1);
    });
  });

  describe('MAX_VIDEO_SIZE', () => {
    it('equals 2GB (2 * 1024 * 1024 * 1024)', () => {
      expect(MAX_VIDEO_SIZE).toBe(2 * 1024 * 1024 * 1024);
    });
  });

  describe('MAX_PDF_SIZE', () => {
    it('equals 100MB (100 * 1024 * 1024)', () => {
      expect(MAX_PDF_SIZE).toBe(100 * 1024 * 1024);
    });
  });
});

describe('validateFileType', () => {
  describe('valid video types', () => {
    it('accepts video/mp4 with .mp4 extension', () => {
      const result = validateFileType('video/mp4', '.mp4');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts video/quicktime with .mov extension', () => {
      const result = validateFileType('video/quicktime', '.mov');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts video/webm with .webm extension', () => {
      const result = validateFileType('video/webm', '.webm');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('valid PDF types', () => {
    it('accepts application/pdf with .pdf extension', () => {
      const result = validateFileType('application/pdf', '.pdf');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid file types', () => {
    it('rejects unsupported video types', () => {
      const result = validateFileType('video/avi', '.avi');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('rejects image types', () => {
      const result = validateFileType('image/png', '.png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('rejects text files', () => {
      const result = validateFileType('text/plain', '.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('provides allowed types in error message', () => {
      const result = validateFileType('video/avi', '.avi');
      expect(result.error).toContain('video/mp4');
      expect(result.error).toContain('application/pdf');
    });
  });

  describe('edge cases', () => {
    it('handles empty mime type', () => {
      const result = validateFileType('', '.mp4');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('handles mime type case-insensitively', () => {
      const result = validateFileType('VIDEO/MP4', '.mp4');
      expect(result.valid).toBe(true);
    });

    it('handles extension without dot', () => {
      const result = validateFileType('video/mp4', 'mp4');
      expect(result.valid).toBe(true);
    });
  });
});

describe('validateFileSize', () => {
  describe('video file size validation', () => {
    it('accepts video file under limit', () => {
      const size = 1 * 1024 * 1024 * 1024; // 1GB
      const result = validateFileSize(size, 'video');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts video file at exactly the limit', () => {
      const size = MAX_VIDEO_SIZE;
      const result = validateFileSize(size, 'video');
      expect(result.valid).toBe(true);
    });

    it('rejects video file over limit', () => {
      const size = MAX_VIDEO_SIZE + 1;
      const result = validateFileSize(size, 'video');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(result.error).toContain('2 GB');
    });
  });

  describe('PDF file size validation', () => {
    it('accepts PDF file under limit', () => {
      const size = 50 * 1024 * 1024; // 50MB
      const result = validateFileSize(size, 'pdf');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts PDF file at exactly the limit', () => {
      const size = MAX_PDF_SIZE;
      const result = validateFileSize(size, 'pdf');
      expect(result.valid).toBe(true);
    });

    it('rejects PDF file over limit', () => {
      const size = MAX_PDF_SIZE + 1;
      const result = validateFileSize(size, 'pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(result.error).toContain('100 MB');
    });
  });

  describe('edge cases', () => {
    it('accepts zero size file', () => {
      const result = validateFileSize(0, 'video');
      expect(result.valid).toBe(true);
    });

    it('rejects negative size', () => {
      const result = validateFileSize(-1, 'video');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file size');
    });

    it('handles unknown type with default limit', () => {
      const result = validateFileSize(1024, 'unknown' as 'video' | 'pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown file type');
    });
  });
});

describe('getSourceTypeFromMime', () => {
  describe('video types', () => {
    it('returns "video" for video/mp4', () => {
      expect(getSourceTypeFromMime('video/mp4')).toBe('video');
    });

    it('returns "video" for video/quicktime', () => {
      expect(getSourceTypeFromMime('video/quicktime')).toBe('video');
    });

    it('returns "video" for video/webm', () => {
      expect(getSourceTypeFromMime('video/webm')).toBe('video');
    });
  });

  describe('PDF types', () => {
    it('returns "pdf" for application/pdf', () => {
      expect(getSourceTypeFromMime('application/pdf')).toBe('pdf');
    });
  });

  describe('unknown types', () => {
    it('returns null for unsupported mime types', () => {
      expect(getSourceTypeFromMime('image/png')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getSourceTypeFromMime('')).toBeNull();
    });

    it('returns null for undefined-like input', () => {
      expect(getSourceTypeFromMime('undefined')).toBeNull();
    });
  });

  describe('case handling', () => {
    it('handles uppercase mime types', () => {
      expect(getSourceTypeFromMime('VIDEO/MP4')).toBe('video');
    });

    it('handles mixed case mime types', () => {
      expect(getSourceTypeFromMime('Application/PDF')).toBe('pdf');
    });
  });
});

describe('formatFileSize', () => {
  describe('bytes', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats small byte values', () => {
      expect(formatFileSize(512)).toBe('512 Bytes');
    });
  });

  describe('kilobytes', () => {
    it('formats 1 KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats KB with decimals', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('megabytes', () => {
    it('formats 1 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('formats 50 MB', () => {
      expect(formatFileSize(50 * 1024 * 1024)).toBe('50 MB');
    });

    it('formats 100 MB', () => {
      expect(formatFileSize(100 * 1024 * 1024)).toBe('100 MB');
    });
  });

  describe('gigabytes', () => {
    it('formats 1 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('formats 2 GB', () => {
      expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2 GB');
    });

    it('formats 1.5 GB', () => {
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });
  });

  describe('edge cases', () => {
    it('handles very large sizes (TB)', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('rounds to reasonable decimal places', () => {
      // 1.234 KB should round to 1.23 KB
      const result = formatFileSize(1263);
      expect(result).toMatch(/1\.2\d? KB/);
    });
  });
});
