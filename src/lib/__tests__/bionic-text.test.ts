/**
 * Bionic Text Utility Tests
 *
 * Tests for the bionic reading text processing functions.
 */

import {
  getBoldLength,
  splitWordForBionic,
  applyBionicReading,
  segmentsToPlainText,
  isProcessableText,
  type BionicTextSegment,
} from '../bionic-text';

describe('getBoldLength', () => {
  describe('standard words', () => {
    it('returns 1 for single character word', () => {
      expect(getBoldLength('a')).toBe(1);
    });

    it('returns 1 for two character word', () => {
      expect(getBoldLength('ab')).toBe(1);
    });

    it('returns 2 for three character word', () => {
      // 3 * 0.4 = 1.2, ceil = 2
      expect(getBoldLength('abc')).toBe(2);
    });

    it('returns 2 for four character word', () => {
      // 4 * 0.4 = 1.6, ceil = 2
      expect(getBoldLength('four')).toBe(2);
    });

    it('returns 2 for five character word', () => {
      // 5 * 0.4 = 2.0, ceil = 2
      expect(getBoldLength('hello')).toBe(2);
    });

    it('returns 3 for six character word', () => {
      // 6 * 0.4 = 2.4, ceil = 3
      expect(getBoldLength('python')).toBe(3);
    });

    it('returns 4 for ten character word', () => {
      // 10 * 0.4 = 4.0, ceil = 4
      expect(getBoldLength('javascript')).toBe(4);
    });
  });

  describe('words with punctuation', () => {
    it('ignores punctuation in length calculation', () => {
      // "hello" has 5 chars, 5 * 0.4 = 2
      expect(getBoldLength('hello!')).toBe(2);
    });

    it('ignores leading punctuation', () => {
      expect(getBoldLength("'hello")).toBe(2);
    });

    it('ignores multiple punctuation marks', () => {
      expect(getBoldLength('...hello...')).toBe(2);
    });

    it('handles word with only punctuation', () => {
      expect(getBoldLength('...')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for empty string', () => {
      expect(getBoldLength('')).toBe(0);
    });

    it('handles numbers mixed with letters', () => {
      // Only letters count: "abc" = 3 chars, 3 * 0.4 = 1.2, ceil = 2
      expect(getBoldLength('abc123')).toBe(2);
    });

    it('handles uppercase letters', () => {
      expect(getBoldLength('HELLO')).toBe(2);
    });

    it('handles mixed case', () => {
      expect(getBoldLength('HeLLo')).toBe(2);
    });
  });
});

describe('splitWordForBionic', () => {
  describe('basic word splitting', () => {
    it('splits "Hello" correctly', () => {
      const result = splitWordForBionic('Hello');
      expect(result.bold).toBe('He');
      expect(result.regular).toBe('llo');
    });

    it('splits "a" correctly (single char)', () => {
      const result = splitWordForBionic('a');
      expect(result.bold).toBe('a');
      expect(result.regular).toBe('');
    });

    it('splits "to" correctly (two chars)', () => {
      const result = splitWordForBionic('to');
      expect(result.bold).toBe('t');
      expect(result.regular).toBe('o');
    });

    it('splits "the" correctly (three chars)', () => {
      const result = splitWordForBionic('the');
      expect(result.bold).toBe('th');
      expect(result.regular).toBe('e');
    });
  });

  describe('words with punctuation', () => {
    it('handles trailing punctuation', () => {
      const result = splitWordForBionic('Hello!');
      expect(result.bold).toBe('He');
      expect(result.regular).toBe('llo!');
    });

    it('handles leading punctuation', () => {
      const result = splitWordForBionic("'Hello");
      expect(result.bold).toBe("'He");
      expect(result.regular).toBe('llo');
    });

    it('handles both leading and trailing punctuation', () => {
      const result = splitWordForBionic('"Hello,"');
      expect(result.bold).toBe('"He');
      expect(result.regular).toBe('llo,"');
    });

    it('handles multiple trailing punctuation', () => {
      const result = splitWordForBionic('What?!');
      expect(result.bold).toBe('Wh');
      expect(result.regular).toBe('at?!');
    });
  });

  describe('edge cases', () => {
    it('returns empty strings for empty input', () => {
      const result = splitWordForBionic('');
      expect(result.bold).toBe('');
      expect(result.regular).toBe('');
    });

    it('returns original for pure punctuation', () => {
      const result = splitWordForBionic('...');
      expect(result.bold).toBe('');
      expect(result.regular).toBe('...');
    });

    it('returns original for pure whitespace', () => {
      const result = splitWordForBionic('   ');
      expect(result.bold).toBe('');
      expect(result.regular).toBe('   ');
    });

    it('handles pure numbers as non-alphabetic content', () => {
      // Numbers without letters don't get bionic treatment
      // because getBoldLength only counts alphabetic characters
      const result = splitWordForBionic('123');
      expect(result.bold).toBe('');
      expect(result.regular).toBe('123');
    });
  });
});

describe('applyBionicReading', () => {
  describe('basic text processing', () => {
    it('processes single word', () => {
      const segments = applyBionicReading('Hello');
      expect(segments).toHaveLength(1);
      expect(segments[0].bold).toBe('He');
      expect(segments[0].regular).toBe('llo');
    });

    it('processes two words', () => {
      const segments = applyBionicReading('Hello world');
      expect(segments).toHaveLength(2);
      expect(segments[0].bold).toBe('He');
      expect(segments[0].regular).toBe('llo ');
      // "world" = 5 letters, 5 * 0.4 = 2.0, ceil = 2
      expect(segments[1].bold).toBe('wo');
      expect(segments[1].regular).toBe('rld');
    });

    it('preserves multiple spaces between words', () => {
      const segments = applyBionicReading('Hello  world');
      expect(segments).toHaveLength(2);
      expect(segments[0].regular).toBe('llo  ');
    });

    it('processes sentence with punctuation', () => {
      const segments = applyBionicReading('Hello, world!');
      expect(segments).toHaveLength(2);
      expect(segments[0].bold).toBe('He');
      expect(segments[0].regular).toBe('llo, ');
      // "world" = 5 letters, 5 * 0.4 = 2.0, ceil = 2
      expect(segments[1].bold).toBe('wo');
      expect(segments[1].regular).toBe('rld!');
    });
  });

  describe('whitespace handling', () => {
    it('handles leading whitespace', () => {
      const segments = applyBionicReading('  Hello');
      expect(segments).toHaveLength(2);
      expect(segments[0].bold).toBe('');
      expect(segments[0].regular).toBe('  ');
      expect(segments[1].bold).toBe('He');
    });

    it('handles trailing whitespace', () => {
      const segments = applyBionicReading('Hello  ');
      expect(segments).toHaveLength(1);
      expect(segments[0].regular).toBe('llo  ');
    });

    it('handles tabs', () => {
      const segments = applyBionicReading('Hello\tworld');
      expect(segments).toHaveLength(2);
      expect(segments[0].regular).toContain('\t');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      const segments = applyBionicReading('');
      expect(segments).toHaveLength(0);
    });

    it('returns empty array for null/undefined-like empty', () => {
      const segments = applyBionicReading('');
      expect(segments).toEqual([]);
    });

    it('handles single character words', () => {
      const segments = applyBionicReading('I a');
      expect(segments).toHaveLength(2);
      expect(segments[0].bold).toBe('I');
      expect(segments[0].regular).toBe(' ');
      expect(segments[1].bold).toBe('a');
      expect(segments[1].regular).toBe('');
    });

    it('handles long paragraph', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const segments = applyBionicReading(text);
      expect(segments.length).toBeGreaterThan(0);

      // Verify each segment has expected structure
      segments.forEach((segment) => {
        expect(segment).toHaveProperty('bold');
        expect(segment).toHaveProperty('regular');
        expect(segment).toHaveProperty('original');
      });
    });
  });

  describe('original text preservation', () => {
    it('stores original word in segment', () => {
      const segments = applyBionicReading('Hello');
      expect(segments[0].original).toBe('Hello');
    });

    it('stores original word with attached whitespace', () => {
      const segments = applyBionicReading('Hello world');
      expect(segments[0].original).toBe('Hello ');
    });
  });
});

describe('segmentsToPlainText', () => {
  it('reconstructs original text from segments', () => {
    const segments = applyBionicReading('Hello world!');
    const text = segmentsToPlainText(segments);
    expect(text).toBe('Hello world!');
  });

  it('handles empty segments array', () => {
    const text = segmentsToPlainText([]);
    expect(text).toBe('');
  });

  it('preserves whitespace in reconstruction', () => {
    const segments = applyBionicReading('Hello   world');
    const text = segmentsToPlainText(segments);
    expect(text).toBe('Hello   world');
  });

  it('preserves leading and trailing whitespace', () => {
    const segments = applyBionicReading('  Hello world  ');
    const text = segmentsToPlainText(segments);
    expect(text).toBe('  Hello world  ');
  });
});

describe('isProcessableText', () => {
  describe('processable text', () => {
    it('returns true for simple word', () => {
      expect(isProcessableText('Hello')).toBe(true);
    });

    it('returns true for sentence', () => {
      expect(isProcessableText('Hello world')).toBe(true);
    });

    it('returns true for text with numbers', () => {
      expect(isProcessableText('Hello123')).toBe(true);
    });

    it('returns true for text with punctuation', () => {
      expect(isProcessableText('Hello, world!')).toBe(true);
    });
  });

  describe('non-processable text', () => {
    it('returns false for empty string', () => {
      expect(isProcessableText('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(isProcessableText('   ')).toBe(false);
    });

    it('returns false for tabs only', () => {
      expect(isProcessableText('\t\t')).toBe(false);
    });

    it('returns false for numbers only', () => {
      expect(isProcessableText('12345')).toBe(false);
    });

    it('returns false for punctuation only', () => {
      expect(isProcessableText('...')).toBe(false);
    });

    it('returns false for numbers and punctuation only', () => {
      expect(isProcessableText('123...')).toBe(false);
    });
  });
});

describe('integration: round-trip processing', () => {
  it('processes and reconstructs complex text', () => {
    const original = 'The "quick" brown fox, jumps over 5 lazy dogs!';
    const segments = applyBionicReading(original);
    const reconstructed = segmentsToPlainText(segments);
    expect(reconstructed).toBe(original);
  });

  it('processes multi-line text', () => {
    const original = 'Line one.\nLine two.';
    const segments = applyBionicReading(original);
    const reconstructed = segmentsToPlainText(segments);
    expect(reconstructed).toBe(original);
  });

  it('handles mixed content correctly', () => {
    const original = "It's a test-case with hyphens and contractions.";
    const segments = applyBionicReading(original);
    const reconstructed = segmentsToPlainText(segments);
    expect(reconstructed).toBe(original);
  });
});
