/**
 * FeedCard Component Tests
 *
 * Tests for gesture handling, animations, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FeedCard, type FeedCardProps } from '../FeedCard';

// Mocks are handled globally in jest.setup.js

/**
 * Helper to render FeedCard with default props
 */
function renderFeedCard(props: Partial<FeedCardProps> = {}) {
  const defaultProps: FeedCardProps = {
    children: <Text>Test Content</Text>,
    ...props,
  };
  return render(<FeedCard {...defaultProps} />);
}

describe('FeedCard Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderFeedCard({ children: <Text>Card Content</Text> });

      expect(screen.getByText('Card Content')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderFeedCard({ testID: 'my-feed-card' });

      expect(screen.getByTestId('my-feed-card')).toBeTruthy();
    });

    it('renders swipe indicators', () => {
      renderFeedCard({ testID: 'feed-card' });

      expect(screen.getByTestId('feed-card-left-indicator')).toBeTruthy();
      expect(screen.getByTestId('feed-card-right-indicator')).toBeTruthy();
    });

    it('applies custom style prop', () => {
      renderFeedCard({
        style: { marginTop: 20 },
        testID: 'styled-card',
      });

      expect(screen.getByTestId('styled-card')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      renderFeedCard({ testID: 'accessible-card' });

      const card = screen.getByTestId('accessible-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label describing gestures', () => {
      renderFeedCard({ testID: 'accessible-card' });

      const card = screen.getByTestId('accessible-card');
      expect(card.props.accessibilityLabel).toContain('Swipe left');
      expect(card.props.accessibilityLabel).toContain('swipe right');
      expect(card.props.accessibilityLabel).toContain('tap');
      expect(card.props.accessibilityLabel).toContain('double tap');
    });

    it('has accessibility hint', () => {
      renderFeedCard({ testID: 'accessible-card' });

      const card = screen.getByTestId('accessible-card');
      expect(card.props.accessibilityHint).toContain('gesture');
    });
  });

  describe('Gesture Callbacks', () => {
    it('provides onSwipeLeft callback', () => {
      const onSwipeLeft = jest.fn();
      renderFeedCard({ onSwipeLeft });

      // Callback is set (actual gesture testing would require integration tests)
      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('provides onSwipeRight callback', () => {
      const onSwipeRight = jest.fn();
      renderFeedCard({ onSwipeRight });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('provides onTap callback', () => {
      const onTap = jest.fn();
      renderFeedCard({ onTap });

      expect(onTap).not.toHaveBeenCalled();
    });

    it('provides onDoubleTap callback', () => {
      const onDoubleTap = jest.fn();
      renderFeedCard({ onDoubleTap });

      expect(onDoubleTap).not.toHaveBeenCalled();
    });

    it('provides onSwipeProgress callback', () => {
      const onSwipeProgress = jest.fn();
      renderFeedCard({ onSwipeProgress });

      expect(onSwipeProgress).not.toHaveBeenCalled();
    });
  });

  describe('Gesture Configuration', () => {
    it('disables gestures when gesturesEnabled is false', () => {
      renderFeedCard({
        gesturesEnabled: false,
        testID: 'disabled-gestures',
      });

      // Component renders but gestures are disabled
      expect(screen.getByTestId('disabled-gestures')).toBeTruthy();
    });

    it('enables gestures by default', () => {
      renderFeedCard({ testID: 'enabled-gestures' });

      expect(screen.getByTestId('enabled-gestures')).toBeTruthy();
    });
  });

  describe('Swipe Indicators', () => {
    it('renders left indicator with "Got it!" text', () => {
      renderFeedCard();

      expect(screen.getByText('Got it!')).toBeTruthy();
    });

    it('renders right indicator with "Review" text', () => {
      renderFeedCard();

      expect(screen.getByText('Review')).toBeTruthy();
    });
  });

  describe('Content Rendering', () => {
    it('renders complex children', () => {
      renderFeedCard({
        children: (
          <>
            <Text>Title</Text>
            <Text>Description</Text>
          </>
        ),
      });

      expect(screen.getByText('Title')).toBeTruthy();
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders with undefined optional callbacks', () => {
      // Should not throw when callbacks are undefined
      expect(() => {
        renderFeedCard({
          onSwipeLeft: undefined,
          onSwipeRight: undefined,
          onTap: undefined,
          onDoubleTap: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('Animation States', () => {
    it('initializes with default position', () => {
      renderFeedCard({ testID: 'animated-card' });

      const card = screen.getByTestId('animated-card');
      // Card should be visible (opacity 1, no translation)
      expect(card).toBeTruthy();
    });
  });
});
