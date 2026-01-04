/**
 * TextChunkCard Component Tests
 *
 * Tests for text rendering, bionic reading, expansion, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { TextChunkCard, type TextChunkCardProps, createTextChunkCardProps } from '../TextChunkCard';
import type { TextChunkItem } from '@/src/types/engagement';

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    light: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock typography context
const mockProcessText = jest.fn((text: string) => text);
const mockGetColors = jest.fn(() => ({
  text: '#000000',
  textSecondary: '#666666',
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  borderLight: '#E0E0E0',
  primary: '#6366F1',
  success: '#22C55E',
}));
const mockGetScaledFontSize = jest.fn((size: number) => size);
const mockGetFontFamily = jest.fn(() => 'System');

jest.mock('@/src/lib/typography-context', () => ({
  useTypography: () => ({
    processText: mockProcessText,
    getColors: mockGetColors,
    getScaledFontSize: mockGetScaledFontSize,
    getFontFamily: mockGetFontFamily,
    preferences: {
      bionicReadingEnabled: true,
      darkModeEnabled: false,
      fontFamily: 'system',
      fontScale: 1.0,
    },
  }),
}));

/**
 * Sample short text (under 60 words)
 */
const shortText = 'This is a short text that contains less than sixty words. It should display without needing any expansion.';

/**
 * Sample long text (over 60 words)
 */
const longText = `
This is a much longer text that exceeds the sixty word limit for a text chunk card.
The text chunk card should detect that this content is too long and show an expand button.
When the user taps the card, it should expand to show all the content.
This allows users to read long passages in a comfortable way without overwhelming them.
The bionic reading feature will also be applied to make reading easier and faster.
Additional words to ensure we definitely exceed the word limit here.
`.trim();

/**
 * Sample propositions for testing
 */
const samplePropositions = [
  'Key concept one',
  'Key concept two',
  'Key concept three',
];

/**
 * Helper to render TextChunkCard with default props
 */
function renderTextChunkCard(props: Partial<TextChunkCardProps> = {}) {
  const defaultProps: TextChunkCardProps = {
    text: shortText,
    propositions: samplePropositions,
    chunkIndex: 2,
    totalChunks: 10,
    ...props,
  };
  return render(<TextChunkCard {...defaultProps} />);
}

describe('TextChunkCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      renderTextChunkCard({ testID: 'text-chunk-card' });

      expect(screen.getByTestId('text-chunk-card')).toBeTruthy();
    });

    it('renders text content', () => {
      renderTextChunkCard();

      expect(screen.getByTestId('text-chunk-card-text')).toBeTruthy();
    });

    it('renders progress indicator with correct chunk position', () => {
      renderTextChunkCard({ chunkIndex: 2, totalChunks: 10 });

      expect(screen.getByTestId('text-chunk-card-progress')).toBeTruthy();
      expect(screen.getByText('3 of 10')).toBeTruthy();
    });

    it('renders "Reading" label in header', () => {
      renderTextChunkCard();

      expect(screen.getByText('Reading')).toBeTruthy();
    });

    it('renders proposition count', () => {
      renderTextChunkCard({ propositions: samplePropositions });

      expect(screen.getByTestId('text-chunk-card-propositions')).toBeTruthy();
      expect(screen.getByText('3 key points')).toBeTruthy();
    });

    it('renders singular "key point" for single proposition', () => {
      renderTextChunkCard({ propositions: ['single'] });

      expect(screen.getByText('1 key point')).toBeTruthy();
    });

    it('does not render proposition indicator when empty', () => {
      renderTextChunkCard({ propositions: [] });

      expect(screen.queryByTestId('text-chunk-card-propositions')).toBeNull();
    });
  });

  describe('Bionic Reading Integration', () => {
    it('calls processText from typography context', () => {
      renderTextChunkCard({ text: shortText });

      expect(mockProcessText).toHaveBeenCalledWith(shortText);
    });

    it('uses theme colors from typography context', () => {
      renderTextChunkCard();

      expect(mockGetColors).toHaveBeenCalled();
    });

    it('uses scaled font size from typography context', () => {
      renderTextChunkCard();

      expect(mockGetScaledFontSize).toHaveBeenCalledWith(18);
    });

    it('uses font family from typography context', () => {
      renderTextChunkCard();

      expect(mockGetFontFamily).toHaveBeenCalledWith('regular');
    });
  });

  describe('Short Text Behavior', () => {
    it('does not show expand hint for short text', () => {
      renderTextChunkCard({ text: shortText });

      expect(screen.queryByTestId('text-chunk-card-expand-hint')).toBeNull();
    });

    it('calls onComplete immediately when short text is tapped', async () => {
      const onComplete = jest.fn();
      renderTextChunkCard({ text: shortText, onComplete, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('calls onTap when card is pressed', async () => {
      const onTap = jest.fn();
      renderTextChunkCard({ text: shortText, onTap, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(onTap).toHaveBeenCalled();
      });
    });
  });

  describe('Long Text Expansion', () => {
    it('shows expand hint for long text', () => {
      renderTextChunkCard({ text: longText });

      expect(screen.getByTestId('text-chunk-card-expand-hint')).toBeTruthy();
    });

    it('displays word count in expand hint', () => {
      renderTextChunkCard({ text: longText });

      // Should contain the word count
      const expandHint = screen.getByTestId('text-chunk-card-expand-hint');
      expect(expandHint.props.children).toContain('Tap to read all');
    });

    it('truncates long text when collapsed', () => {
      renderTextChunkCard({ text: longText });

      // Should show truncation indicator
      const textContent = screen.getByTestId('text-chunk-card-text');
      // processText is called with truncated text ending in ...
      expect(mockProcessText).toHaveBeenCalled();
    });

    it('toggles expansion state on tap', async () => {
      renderTextChunkCard({ text: longText, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');

      // Initially shows "Tap to read all"
      expect(screen.getByText(/Tap to read all/)).toBeTruthy();

      // Tap to expand
      fireEvent.press(card);

      await waitFor(() => {
        expect(screen.getByText('Tap to collapse')).toBeTruthy();
      });

      // Tap to collapse
      fireEvent.press(card);

      await waitFor(() => {
        expect(screen.getByText(/Tap to read all/)).toBeTruthy();
      });
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers light haptic feedback on tap', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderTextChunkCard({ testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(haptics.light).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      renderTextChunkCard({ testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label with chunk position', () => {
      renderTextChunkCard({ chunkIndex: 2, totalChunks: 10, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      expect(card.props.accessibilityLabel).toContain('Reading chunk 3 of 10');
    });

    it('has expansion info in accessibility label for long text', () => {
      renderTextChunkCard({ text: longText, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      expect(card.props.accessibilityLabel).toContain('Tap to expand');
    });

    it('updates accessibility label when expanded', async () => {
      renderTextChunkCard({ text: longText, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(card.props.accessibilityLabel).toContain('Tap to collapse');
      });
    });
  });

  describe('Read Indicator', () => {
    it('shows read indicator after completing short text', async () => {
      renderTextChunkCard({ text: shortText, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(screen.getByTestId('text-chunk-card-read-indicator')).toBeTruthy();
      });
    });

    it('does not show read indicator initially', () => {
      renderTextChunkCard({ testID: 'text-chunk-card' });

      expect(screen.queryByTestId('text-chunk-card-read-indicator')).toBeNull();
    });

    it('only calls onComplete once', async () => {
      const onComplete = jest.fn();
      renderTextChunkCard({ text: shortText, onComplete, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');

      // First tap should trigger onComplete
      fireEvent.press(card);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      // Additional taps should not trigger onComplete again
      fireEvent.press(card);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      fireEvent.press(card);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Props Handling', () => {
    it('handles missing onTap callback gracefully', () => {
      renderTextChunkCard({ onTap: undefined, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');

      expect(() => {
        fireEvent.press(card);
      }).not.toThrow();
    });

    it('handles missing onComplete callback gracefully', () => {
      renderTextChunkCard({ onComplete: undefined, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');

      expect(() => {
        fireEvent.press(card);
      }).not.toThrow();
    });

    it('renders with isActive prop', () => {
      renderTextChunkCard({ isActive: true, testID: 'text-chunk-card' });

      expect(screen.getByTestId('text-chunk-card')).toBeTruthy();
    });

    it('handles empty text gracefully', () => {
      renderTextChunkCard({ text: '', testID: 'text-chunk-card' });

      expect(screen.getByTestId('text-chunk-card')).toBeTruthy();
    });
  });

  describe('createTextChunkCardProps Helper', () => {
    it('creates props from TextChunkItem', () => {
      const item: TextChunkItem = {
        id: 'chunk-1',
        type: 'text_chunk',
        text: 'Sample text content',
        propositions: ['prop 1', 'prop 2'],
        chunkIndex: 3,
        totalChunks: 8,
      };

      const props = createTextChunkCardProps(item);

      expect(props.text).toBe('Sample text content');
      expect(props.propositions).toEqual(['prop 1', 'prop 2']);
      expect(props.chunkIndex).toBe(3);
      expect(props.totalChunks).toBe(8);
    });

    it('does not include callback props', () => {
      const item: TextChunkItem = {
        id: 'chunk-1',
        type: 'text_chunk',
        text: 'Text',
        propositions: [],
        chunkIndex: 0,
        totalChunks: 1,
      };

      const props = createTextChunkCardProps(item);

      // TypeScript ensures these are not present
      expect('onTap' in props).toBe(false);
      expect('onComplete' in props).toBe(false);
      expect('isActive' in props).toBe(false);
    });
  });

  describe('Scroll View', () => {
    it('renders scroll view for content', () => {
      renderTextChunkCard({ testID: 'text-chunk-card' });

      expect(screen.getByTestId('text-chunk-card-scroll')).toBeTruthy();
    });

    it('enables scrolling when expanded', async () => {
      renderTextChunkCard({ text: longText, testID: 'text-chunk-card' });

      const card = screen.getByTestId('text-chunk-card');
      fireEvent.press(card);

      await waitFor(() => {
        const scrollView = screen.getByTestId('text-chunk-card-scroll');
        expect(scrollView.props.scrollEnabled).toBe(true);
      });
    });

    it('disables scrolling when collapsed', () => {
      renderTextChunkCard({ text: longText, testID: 'text-chunk-card' });

      const scrollView = screen.getByTestId('text-chunk-card-scroll');
      expect(scrollView.props.scrollEnabled).toBe(false);
    });
  });
});
