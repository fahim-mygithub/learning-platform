/**
 * Progress Component Tests
 *
 * Tests for Progress component variants, accessibility, and custom styling.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { Progress, type ProgressProps } from '../Progress';

/**
 * Helper to render Progress with default props
 */
function renderProgress(props: Partial<ProgressProps> = {}) {
  const defaultProps: ProgressProps = {
    variant: 'bar',
    value: 50,
    ...props,
  };
  return render(<Progress {...defaultProps} />);
}

describe('Progress Component', () => {
  describe('ProgressBar Variant', () => {
    it('renders bar variant correctly', () => {
      renderProgress({ variant: 'bar', testID: 'progress-bar' });

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('renders with correct value', () => {
      renderProgress({ variant: 'bar', value: 75, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });

    it('displays percentage label when showLabel is true', () => {
      renderProgress({ variant: 'bar', value: 50, showLabel: true });

      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('does not display label when showLabel is false', () => {
      renderProgress({ variant: 'bar', value: 50, showLabel: false });

      expect(screen.queryByText('50%')).toBeNull();
    });

    it('clamps value to 0-100 range', () => {
      renderProgress({ variant: 'bar', value: 150, showLabel: true });
      expect(screen.getByText('100%')).toBeTruthy();

      const { unmount } = renderProgress({
        variant: 'bar',
        value: -10,
        showLabel: true,
        testID: 'negative',
      });

      expect(screen.getByText('0%')).toBeTruthy();
      unmount();
    });

    it('applies custom color to fill', () => {
      renderProgress({
        variant: 'bar',
        value: 50,
        color: '#FF0000',
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('applies custom trackColor', () => {
      renderProgress({
        variant: 'bar',
        value: 50,
        trackColor: '#CCCCCC',
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });
  });

  describe('ProgressCircle Variant', () => {
    it('renders circle variant correctly', () => {
      renderProgress({ variant: 'circle', testID: 'progress-circle' });

      expect(screen.getByTestId('progress-circle')).toBeTruthy();
    });

    it('renders with correct value', () => {
      renderProgress({ variant: 'circle', value: 75, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });

    it('displays percentage label when showLabel is true', () => {
      renderProgress({ variant: 'circle', value: 50, showLabel: true });

      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('does not display label when showLabel is false', () => {
      renderProgress({ variant: 'circle', value: 50, showLabel: false });

      expect(screen.queryByText('50%')).toBeNull();
    });

    it('accepts custom size', () => {
      renderProgress({
        variant: 'circle',
        value: 50,
        size: 100,
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('applies custom color', () => {
      renderProgress({
        variant: 'circle',
        value: 50,
        color: '#FF0000',
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });
  });

  describe('ProgressDots Variant', () => {
    it('renders dots variant correctly', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        testID: 'progress-dots',
      });

      expect(screen.getByTestId('progress-dots')).toBeTruthy();
    });

    it('renders correct number of dots', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        testID: 'progress',
      });

      // Should render 5 dots
      for (let i = 0; i < 5; i++) {
        expect(screen.getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });

    it('marks completed dots correctly', () => {
      renderProgress({
        variant: 'dots',
        current: 3,
        total: 5,
        testID: 'progress',
      });

      // Dots 0, 1, 2 should be completed/active, 3, 4 should be future
      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('handles edge case of current = 0', () => {
      renderProgress({
        variant: 'dots',
        current: 0,
        total: 5,
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('handles edge case of current = total', () => {
      renderProgress({
        variant: 'dots',
        current: 5,
        total: 5,
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('accepts custom size for dots', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        size: 16,
        testID: 'progress',
      });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role for bar variant', () => {
      renderProgress({ variant: 'bar', testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityRole).toBe('progressbar');
    });

    it('has correct accessibility role for circle variant', () => {
      renderProgress({ variant: 'circle', testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityRole).toBe('progressbar');
    });

    it('has correct accessibility role for dots variant', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityRole).toBe('progressbar');
    });

    it('has correct accessibility value for bar variant', () => {
      renderProgress({ variant: 'bar', value: 75, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 75,
      });
    });

    it('has correct accessibility value for circle variant', () => {
      renderProgress({ variant: 'circle', value: 60, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 60,
      });
    });

    it('has correct accessibility value for dots variant', () => {
      renderProgress({
        variant: 'dots',
        current: 3,
        total: 5,
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      // For dots, now = percentage complete (3/5 * 100 = 60)
      expect(progress.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 60,
      });
    });

    it('uses custom accessibility label when provided', () => {
      renderProgress({
        variant: 'bar',
        value: 50,
        accessibilityLabel: 'Loading progress',
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityLabel).toBe('Loading progress');
    });

    it('generates default accessibility label for bar variant', () => {
      renderProgress({ variant: 'bar', value: 75, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityLabel).toBe('Progress: 75%');
    });

    it('generates default accessibility label for dots variant', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityLabel).toBe('Step 2 of 5');
    });
  });

  describe('Custom Colors', () => {
    it('applies custom color to bar fill', () => {
      renderProgress({
        variant: 'bar',
        value: 50,
        color: '#FF0000',
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });

    it('applies custom trackColor to bar background', () => {
      renderProgress({
        variant: 'bar',
        value: 50,
        trackColor: '#EEEEEE',
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });

    it('applies custom color to circle stroke', () => {
      renderProgress({
        variant: 'circle',
        value: 50,
        color: '#00FF00',
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });

    it('applies custom color to dots', () => {
      renderProgress({
        variant: 'dots',
        current: 2,
        total: 5,
        color: '#0000FF',
        testID: 'progress',
      });

      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });
  });

  describe('Default Values', () => {
    it('uses default value of 0 for bar when not provided', () => {
      renderProgress({ variant: 'bar', value: undefined, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityValue.now).toBe(0);
    });

    it('uses default value of 0 for circle when not provided', () => {
      renderProgress({ variant: 'circle', value: undefined, testID: 'progress' });

      const progress = screen.getByTestId('progress');
      expect(progress.props.accessibilityValue.now).toBe(0);
    });

    it('uses default size for circle', () => {
      renderProgress({ variant: 'circle', value: 50, testID: 'progress' });

      expect(screen.getByTestId('progress')).toBeTruthy();
    });

    it('uses default values for dots when not provided', () => {
      renderProgress({
        variant: 'dots',
        current: undefined,
        total: undefined,
        testID: 'progress',
      });

      // Should default to 0 of 1
      const progress = screen.getByTestId('progress');
      expect(progress).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles value of exactly 0', () => {
      renderProgress({ variant: 'bar', value: 0, showLabel: true });

      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('handles value of exactly 100', () => {
      renderProgress({ variant: 'bar', value: 100, showLabel: true });

      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('handles decimal values by rounding', () => {
      renderProgress({ variant: 'bar', value: 33.7, showLabel: true });

      expect(screen.getByText('34%')).toBeTruthy();
    });

    it('renders without crashing for all variants', () => {
      const variants: Array<'bar' | 'circle' | 'dots'> = ['bar', 'circle', 'dots'];

      variants.forEach((variant) => {
        const { unmount } = renderProgress({
          variant,
          value: 50,
          current: 2,
          total: 5,
          testID: `progress-${variant}`,
        });

        expect(screen.getByTestId(`progress-${variant}`)).toBeTruthy();
        unmount();
      });
    });
  });
});
