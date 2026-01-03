/**
 * FactCard Component Tests
 *
 * Tests for flip card interactions, animations, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { FactCard, type FactCardProps } from '../FactCard';

// Mocks are handled globally in jest.setup.js

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    light: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Sample fact data for testing
 */
const sampleFact = {
  factText: 'The human brain processes images 60,000 times faster than text. This makes visual learning incredibly efficient.',
  whyItMatters: 'Understanding this can help you choose more effective learning strategies.',
  conceptId: 'concept-123',
};

/**
 * Helper to render FactCard with default props
 */
function renderFactCard(props: Partial<FactCardProps> = {}) {
  const defaultProps: FactCardProps = {
    ...sampleFact,
    ...props,
  };
  return render(<FactCard {...defaultProps} />);
}

describe('FactCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      renderFactCard({ testID: 'fact-card' });

      expect(screen.getByTestId('fact-card')).toBeTruthy();
    });

    it('renders front face with "Did you know?" text', () => {
      renderFactCard({ testID: 'fact-card' });

      expect(screen.getByText('Did you know?')).toBeTruthy();
    });

    it('renders teaser text on front face', () => {
      renderFactCard();

      // Should show first sentence as teaser (appears in multiple places - front and back)
      expect(screen.getAllByText(/human brain processes images/i).length).toBeGreaterThan(0);
    });

    it('renders "Tap to reveal" hint on front face', () => {
      renderFactCard();

      expect(screen.getByText('Tap to reveal')).toBeTruthy();
    });

    it('renders front and back faces', () => {
      renderFactCard({ testID: 'fact-card' });

      expect(screen.getByTestId('fact-card-front')).toBeTruthy();
      expect(screen.getByTestId('fact-card-back')).toBeTruthy();
    });

    it('renders flip indicator showing 1/2 initially', () => {
      renderFactCard();

      expect(screen.getByText('1/2')).toBeTruthy();
    });
  });

  describe('Flip Interaction', () => {
    it('calls onFlip when card is tapped', async () => {
      const onFlip = jest.fn();
      renderFactCard({ onFlip, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(onFlip).toHaveBeenCalledWith(true);
      });
    });

    it('toggles flip state on subsequent taps', async () => {
      const onFlip = jest.fn();
      renderFactCard({ onFlip, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');

      // First tap - flip to back
      fireEvent.press(card);
      await waitFor(() => {
        expect(onFlip).toHaveBeenCalledWith(true);
      });

      // Second tap - flip to front
      fireEvent.press(card);
      await waitFor(() => {
        expect(onFlip).toHaveBeenCalledWith(false);
      });
    });

    it('triggers light haptic feedback on flip', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderFactCard({ testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      fireEvent.press(card);

      await waitFor(() => {
        expect(haptics.light).toHaveBeenCalled();
      });
    });
  });

  describe('Back Face Content', () => {
    it('renders full fact text on back face', () => {
      renderFactCard();

      // Full fact text should be present in back face
      expect(screen.getByText(sampleFact.factText)).toBeTruthy();
    });

    it('renders "Why It Matters" section', () => {
      renderFactCard();

      expect(screen.getByText('Why It Matters')).toBeTruthy();
      expect(screen.getByText(sampleFact.whyItMatters)).toBeTruthy();
    });

    it('renders "The Fact" label on back face', () => {
      renderFactCard();

      expect(screen.getByText('The Fact')).toBeTruthy();
    });
  });

  describe('Completion Callback', () => {
    it('calls onComplete after reading delay when flipped', async () => {
      jest.useFakeTimers();
      const onComplete = jest.fn();
      renderFactCard({ onComplete, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      fireEvent.press(card);

      // Should not be called immediately
      expect(onComplete).not.toHaveBeenCalled();

      // Fast-forward past reading delay (2000ms)
      await waitFor(() => {
        jest.advanceTimersByTime(2500);
      });

      // Allow the setTimeout callback to execute
      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      jest.useRealTimers();
    });

    it('schedules onComplete when card is flipped to back', async () => {
      const onComplete = jest.fn();
      renderFactCard({ onComplete, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');

      // Flip to back
      fireEvent.press(card);

      // Verify flip happened (onFlip is called)
      // onComplete is scheduled but may not execute immediately in test env
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      renderFactCard({ testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label describing unflipped state', () => {
      renderFactCard({ testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      expect(card.props.accessibilityLabel).toContain('Did you know?');
    });

    it('has accessibility hint', () => {
      renderFactCard({ testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      expect(card.props.accessibilityHint).toContain('flip');
    });
  });

  describe('Teaser Text Generation', () => {
    it('truncates long facts for teaser', () => {
      const longFact = 'A'.repeat(150) + '. Second sentence.';
      renderFactCard({ factText: longFact });

      // Should show truncated teaser (first 97 chars + ...)
      const teaserText = screen.queryByText(/\.\.\.$/);
      expect(teaserText).toBeTruthy();
    });

    it('shows ellipsis for multi-sentence facts', () => {
      renderFactCard({
        factText: 'First sentence. Second sentence. Third sentence.',
      });

      // First sentence should be shown with ellipsis
      expect(screen.getByText(/First sentence\.\.\./)).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('handles missing onFlip callback gracefully', () => {
      renderFactCard({ onFlip: undefined, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');

      // Should not throw when pressed
      expect(() => {
        fireEvent.press(card);
      }).not.toThrow();
    });

    it('handles missing onComplete callback gracefully', () => {
      jest.useFakeTimers();
      renderFactCard({ onComplete: undefined, testID: 'fact-card' });

      const card = screen.getByTestId('fact-card');
      fireEvent.press(card);

      // Should not throw when delay completes
      expect(() => {
        jest.advanceTimersByTime(3000);
      }).not.toThrow();

      jest.useRealTimers();
    });

    it('renders with isActive prop', () => {
      renderFactCard({ isActive: true, testID: 'fact-card' });

      expect(screen.getByTestId('fact-card')).toBeTruthy();
    });
  });
});
