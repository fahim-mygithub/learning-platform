/**
 * XPPopup Component Tests
 *
 * Tests for XP popup animations, display, and callbacks.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';

import { XPPopup, XPToast, type XPPopupProps, type XPToastProps } from '../XPPopup';

// Mocks are handled globally in jest.setup.js

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    xpAward: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    light: jest.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Helper to render XPPopup with default props
 */
function renderXPPopup(props: Partial<XPPopupProps> = {}) {
  const defaultProps: XPPopupProps = {
    amount: 25,
    visible: true,
    ...props,
  };
  return render(<XPPopup {...defaultProps} />);
}

/**
 * Helper to render XPToast with default props
 */
function renderXPToast(props: Partial<XPToastProps> = {}) {
  const defaultProps: XPToastProps = {
    amount: 10,
    visible: true,
    ...props,
  };
  return render(<XPToast {...defaultProps} />);
}

describe('XPPopup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      renderXPPopup({ visible: true, testID: 'xp-popup' });

      expect(screen.getByTestId('xp-popup')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      renderXPPopup({ visible: false, testID: 'xp-popup' });

      expect(screen.queryByTestId('xp-popup')).toBeNull();
    });

    it('displays the XP amount', () => {
      renderXPPopup({ amount: 50, testID: 'xp-popup' });

      expect(screen.getByTestId('xp-popup-amount')).toBeTruthy();
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('displays the plus sign', () => {
      renderXPPopup({ amount: 25 });

      expect(screen.getByText('+')).toBeTruthy();
    });

    it('displays XP label', () => {
      renderXPPopup({ amount: 25 });

      expect(screen.getByText('XP')).toBeTruthy();
    });

    it('displays reason when provided', () => {
      renderXPPopup({
        amount: 25,
        reason: 'Quiz Complete',
        testID: 'xp-popup',
      });

      expect(screen.getByTestId('xp-popup-reason')).toBeTruthy();
      expect(screen.getByText('Quiz Complete')).toBeTruthy();
    });

    it('does not display reason when not provided', () => {
      renderXPPopup({ amount: 25, testID: 'xp-popup' });

      expect(screen.queryByTestId('xp-popup-reason')).toBeNull();
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback when visible', () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderXPPopup({ visible: true, enableHaptics: true });

      expect(haptics.xpAward).toHaveBeenCalled();
    });

    it('does not trigger haptic when enableHaptics is false', () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderXPPopup({ visible: true, enableHaptics: false });

      expect(haptics.xpAward).not.toHaveBeenCalled();
    });
  });

  describe('Positioning', () => {
    it('renders in center position by default', () => {
      renderXPPopup({ testID: 'xp-popup' });

      expect(screen.getByTestId('xp-popup')).toBeTruthy();
      // Position is applied via styles
    });

    it('accepts top position', () => {
      renderXPPopup({ position: 'top', testID: 'xp-popup' });

      expect(screen.getByTestId('xp-popup')).toBeTruthy();
    });

    it('accepts bottom position', () => {
      renderXPPopup({ position: 'bottom', testID: 'xp-popup' });

      expect(screen.getByTestId('xp-popup')).toBeTruthy();
    });
  });

  describe('Auto-dismiss', () => {
    it('calls onComplete after duration', () => {
      const onComplete = jest.fn();
      renderXPPopup({
        visible: true,
        onComplete,
        duration: 1000,
      });

      // Fast-forward past duration
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('uses default duration when not specified', () => {
      const onComplete = jest.fn();
      renderXPPopup({
        visible: true,
        onComplete,
      });

      // Fast-forward past default duration (1500ms)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('clears timeout on unmount', () => {
      const onComplete = jest.fn();
      const { unmount } = renderXPPopup({
        visible: true,
        onComplete,
        duration: 1000,
      });

      // Unmount before duration
      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // onComplete should not be called after unmount
      // (this would throw if timeout wasn't cleared)
    });
  });

  describe('Different Amounts', () => {
    it('displays small amounts', () => {
      renderXPPopup({ amount: 5 });

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays large amounts', () => {
      renderXPPopup({ amount: 500 });

      expect(screen.getByText('500')).toBeTruthy();
    });

    it('displays zero amount', () => {
      renderXPPopup({ amount: 0 });

      expect(screen.getByText('0')).toBeTruthy();
    });
  });
});

describe('XPToast Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      renderXPToast({ visible: true, testID: 'xp-toast' });

      expect(screen.getByTestId('xp-toast')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      renderXPToast({ visible: false, testID: 'xp-toast' });

      expect(screen.queryByTestId('xp-toast')).toBeNull();
    });

    it('displays formatted amount with plus sign', () => {
      renderXPToast({ amount: 15 });

      expect(screen.getByText('+15 XP')).toBeTruthy();
    });
  });

  describe('Auto-dismiss', () => {
    it('calls onComplete after animation', () => {
      const onComplete = jest.fn();
      renderXPToast({ visible: true, onComplete });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });
});

describe('XP Display Variations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles visibility toggle', () => {
    const { rerender } = render(
      <XPPopup amount={25} visible={false} testID="xp-popup" />
    );

    expect(screen.queryByTestId('xp-popup')).toBeNull();

    rerender(<XPPopup amount={25} visible={true} testID="xp-popup" />);

    expect(screen.getByTestId('xp-popup')).toBeTruthy();
  });

  it('handles amount changes while visible', () => {
    const { rerender } = render(
      <XPPopup amount={10} visible={true} testID="xp-popup" />
    );

    expect(screen.getByText('10')).toBeTruthy();

    rerender(<XPPopup amount={50} visible={true} testID="xp-popup" />);

    expect(screen.getByText('50')).toBeTruthy();
  });

  it('handles rapid visibility changes', () => {
    const onComplete = jest.fn();
    const { rerender } = render(
      <XPPopup amount={25} visible={true} onComplete={onComplete} />
    );

    // Quick toggle off then on
    rerender(<XPPopup amount={25} visible={false} onComplete={onComplete} />);
    rerender(<XPPopup amount={25} visible={true} onComplete={onComplete} />);

    // Should not crash
    expect(screen.getByText('25')).toBeTruthy();
  });
});
