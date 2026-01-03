/**
 * Bionic Reading Text Processing Utility
 *
 * Implements the Bionic Reading technique where the first portion of each word
 * is bolded to guide eye movement and improve reading speed/focus.
 *
 * The algorithm bolds approximately the first 40% of each word (minimum 1 character),
 * helping readers' eyes fixate on the bolded portion while their brain fills in the rest.
 */

/**
 * Represents a processed word segment with bold and regular parts
 */
export interface BionicTextSegment {
  /** The portion of the word to be displayed in bold */
  bold: string;
  /** The remaining portion of the word in regular weight */
  regular: string;
  /** The original full word/segment including any leading/trailing whitespace */
  original: string;
}

/**
 * Props for Bionic text components
 */
export interface BionicTextProps {
  /** The text to process */
  text: string;
  /** Whether bionic reading is enabled */
  enabled: boolean;
}

/**
 * Calculate how many characters should be bolded for a given word
 *
 * Uses approximately 40% of the word length, with a minimum of 1 character.
 * Only considers alphabetic characters for the calculation.
 *
 * @param word - The word to calculate bold length for
 * @returns The number of characters to bold
 */
export function getBoldLength(word: string): number {
  // Extract only alphabetic characters for length calculation
  const cleanWord = word.replace(/[^a-zA-Z]/g, '');

  if (cleanWord.length === 0) {
    return 0;
  }

  if (cleanWord.length === 1) {
    return 1;
  }

  // Bold approximately 40% of the word, minimum 1 character
  return Math.max(1, Math.ceil(cleanWord.length * 0.4));
}

/**
 * Check if a string contains only whitespace
 */
function isWhitespace(str: string): boolean {
  return /^\s+$/.test(str);
}

/**
 * Check if a string contains only punctuation/special characters
 */
function isPunctuation(str: string): boolean {
  return /^[^\w\s]+$/.test(str);
}

/**
 * Split a word into bold and regular portions for bionic reading
 *
 * Handles:
 * - Regular words: "Hello" -> { bold: "Hel", regular: "lo" }
 * - Words with leading punctuation: "'Hello" -> { bold: "'Hel", regular: "lo" }
 * - Words with trailing punctuation: "Hello!" -> { bold: "Hel", regular: "lo!" }
 * - Numbers: "123" -> { bold: "1", regular: "23" }
 *
 * @param word - The word to process
 * @returns Object with bold and regular portions
 */
export function splitWordForBionic(word: string): { bold: string; regular: string } {
  if (!word || word.length === 0) {
    return { bold: '', regular: '' };
  }

  // Handle pure whitespace
  if (isWhitespace(word)) {
    return { bold: '', regular: word };
  }

  // Handle pure punctuation
  if (isPunctuation(word)) {
    return { bold: '', regular: word };
  }

  // Find the start of alphabetic/numeric content
  const contentStart = word.search(/[a-zA-Z0-9]/);
  if (contentStart === -1) {
    return { bold: '', regular: word };
  }

  // Extract leading punctuation
  const leadingPunctuation = word.slice(0, contentStart);

  // Find the end of the alphabetic/numeric content
  const contentEnd = word.search(/[^a-zA-Z0-9]*$/);
  const trailingPunctuation = word.slice(contentEnd);

  // Extract the core word content
  const coreContent = word.slice(contentStart, contentEnd);

  // Calculate bold length based on the core content
  const boldLength = getBoldLength(coreContent);

  // Split the core content
  const boldPart = coreContent.slice(0, boldLength);
  const regularPart = coreContent.slice(boldLength);

  return {
    bold: leadingPunctuation + boldPart,
    regular: regularPart + trailingPunctuation,
  };
}

/**
 * Process text for bionic reading
 *
 * Splits text into segments where each word is divided into bold and regular portions.
 * Preserves whitespace between words.
 *
 * @param text - The input text to process
 * @returns Array of BionicTextSegment objects
 *
 * @example
 * ```typescript
 * const segments = applyBionicReading("Hello world!");
 * // Returns:
 * // [
 * //   { bold: "Hel", regular: "lo ", original: "Hello " },
 * //   { bold: "wor", regular: "ld!", original: "world!" }
 * // ]
 * ```
 */
export function applyBionicReading(text: string): BionicTextSegment[] {
  if (!text || text.length === 0) {
    return [];
  }

  const segments: BionicTextSegment[] = [];

  // Split by word boundaries while preserving whitespace
  // This regex captures: (word)(trailing whitespace)
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }

    if (isWhitespace(part)) {
      // Whitespace segments - attach to previous segment or create standalone
      if (segments.length > 0) {
        // Append whitespace to the previous segment's regular part
        segments[segments.length - 1].regular += part;
        segments[segments.length - 1].original += part;
      } else {
        // Leading whitespace - create standalone segment
        segments.push({
          bold: '',
          regular: part,
          original: part,
        });
      }
    } else {
      // Word segment
      const { bold, regular } = splitWordForBionic(part);
      segments.push({
        bold,
        regular,
        original: part,
      });
    }
  }

  return segments;
}

/**
 * Convert bionic segments to plain text (for accessibility/debugging)
 *
 * @param segments - Array of BionicTextSegment objects
 * @returns The original text reconstructed from segments
 */
export function segmentsToPlainText(segments: BionicTextSegment[]): string {
  return segments.map((segment) => segment.original).join('');
}

/**
 * Check if text should be processed (non-empty and has processable content)
 *
 * @param text - The text to check
 * @returns True if text can be processed for bionic reading
 */
export function isProcessableText(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Must contain at least one alphabetic character
  return /[a-zA-Z]/.test(text);
}
