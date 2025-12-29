/**
 * File Validation Utilities
 *
 * Provides validation for file types and sizes for video and PDF uploads.
 */

/**
 * Allowed MIME types for video files
 */
export const ALLOWED_VIDEO_TYPES: readonly string[] = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

/**
 * Allowed MIME types for PDF files
 */
export const ALLOWED_PDF_TYPES: readonly string[] = ['application/pdf'] as const;

/**
 * Maximum video file size: 2GB
 */
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Maximum PDF file size: 100MB
 */
export const MAX_PDF_SIZE = 100 * 1024 * 1024;

/**
 * All allowed file types combined
 */
const ALL_ALLOWED_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_PDF_TYPES];

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if a file type is allowed for upload
 * @param mimeType - The MIME type of the file
 * @param extension - The file extension (with or without leading dot)
 * @returns Validation result with error message if invalid
 */
export function validateFileType(mimeType: string, extension: string): ValidationResult {
  const normalizedMime = mimeType.toLowerCase();

  const isAllowed = ALL_ALLOWED_TYPES.some((type) => type.toLowerCase() === normalizedMime);

  if (!isAllowed) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALL_ALLOWED_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates if a file size is within limits for the given type
 * @param size - The file size in bytes
 * @param type - The file type ('video' or 'pdf')
 * @returns Validation result with error message if invalid
 */
export function validateFileSize(size: number, type: 'video' | 'pdf'): ValidationResult {
  if (size < 0) {
    return {
      valid: false,
      error: 'Invalid file size',
    };
  }

  let maxSize: number;
  let typeLabel: string;

  switch (type) {
    case 'video':
      maxSize = MAX_VIDEO_SIZE;
      typeLabel = 'Video';
      break;
    case 'pdf':
      maxSize = MAX_PDF_SIZE;
      typeLabel = 'PDF';
      break;
    default:
      return {
        valid: false,
        error: 'Unknown file type',
      };
  }

  if (size > maxSize) {
    return {
      valid: false,
      error: `${typeLabel} file size exceeds maximum allowed (${formatFileSize(maxSize)})`,
    };
  }

  return { valid: true };
}

/**
 * Determines the source type based on MIME type
 * @param mimeType - The MIME type of the file
 * @returns 'video' | 'pdf' | null
 */
export function getSourceTypeFromMime(mimeType: string): 'video' | 'pdf' | null {
  const normalizedMime = mimeType.toLowerCase();

  if (ALLOWED_VIDEO_TYPES.some((type) => type.toLowerCase() === normalizedMime)) {
    return 'video';
  }

  if (ALLOWED_PDF_TYPES.some((type) => type.toLowerCase() === normalizedMime)) {
    return 'pdf';
  }

  return null;
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes - The file size in bytes
 * @returns Human-readable string (e.g., "1.5 GB", "50 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = bytes / Math.pow(k, i);
  const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(2).replace(/\.?0+$/, '');

  return `${formattedSize} ${units[i]}`;
}
