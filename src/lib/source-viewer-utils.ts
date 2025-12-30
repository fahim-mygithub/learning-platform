/**
 * Source Viewer Utilities
 *
 * Utilities for determining the appropriate viewer type for a source.
 */

import type { Source } from '../types/database';

/**
 * Viewer types for different source content
 */
export type ViewerType = 'video' | 'youtube' | 'pdf' | 'web';

/**
 * YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Check if a URL is a YouTube video URL
 * @param url - The URL to check
 * @returns true if the URL is a YouTube video
 */
export function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false;
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Extract YouTube video ID from a URL
 * @param url - The YouTube URL
 * @returns The video ID or null if not found
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Check if a MIME type is a video type
 * @param mimeType - The MIME type to check
 * @returns true if the MIME type is video
 */
export function isVideoMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('video/');
}

/**
 * Check if a MIME type is a PDF
 * @param mimeType - The MIME type to check
 * @returns true if the MIME type is PDF
 */
export function isPdfMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType === 'application/pdf';
}

/**
 * Determine the appropriate viewer type for a source
 * @param source - The source to analyze
 * @returns The viewer type to use
 */
export function getViewerType(source: Source): ViewerType {
  // Check for YouTube URL first (takes precedence for URL sources)
  if (source.type === 'url' && isYouTubeUrl(source.url)) {
    return 'youtube';
  }

  // Check for video MIME type
  if (isVideoMimeType(source.mime_type)) {
    return 'video';
  }

  // Check for PDF MIME type
  if (isPdfMimeType(source.mime_type)) {
    return 'pdf';
  }

  // Default to web viewer for URLs and unknown types
  return 'web';
}
