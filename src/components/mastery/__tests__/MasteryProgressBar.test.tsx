/**
 * MasteryProgressBar Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MasteryProgressBar,
  MasteryDistribution,
  calculateMasteryProgress,
  getLowestState,
} from '../MasteryProgressBar';

// Helper to create default distribution
function createDistribution(
  overrides: Partial<MasteryDistribution> = {}
): MasteryDistribution {
  return {
    unseen: 0,
    exposed: 0,
    fragile: 0,
    developing: 0,
    solid: 0,
    mastered: 0,
    misconceived: 0,
    ...overrides,
  };
}

describe('MasteryProgressBar', () => {
  describe('calculateMasteryProgress', () => {
    it('returns 0 for all unseen', () => {
      const distribution = createDistribution({ unseen: 10 });
      expect(calculateMasteryProgress(distribution)).toBe(0);
    });

    it('returns 100 for all mastered', () => {
      const distribution = createDistribution({ mastered: 10 });
      expect(calculateMasteryProgress(distribution)).toBe(100);
    });

    it('calculates weighted average correctly', () => {
      const distribution = createDistribution({
        unseen: 2, // 0%
        exposed: 2, // 10%
        developing: 2, // 50%
        mastered: 2, // 100%
      });
      // (2*0 + 2*10 + 2*50 + 2*100) / 8 = 320/8 = 40
      expect(calculateMasteryProgress(distribution)).toBe(40);
    });

    it('returns 0 for empty distribution', () => {
      const distribution = createDistribution();
      expect(calculateMasteryProgress(distribution)).toBe(0);
    });

    it('handles misconceived state', () => {
      const distribution = createDistribution({
        misconceived: 5, // 20%
        mastered: 5, // 100%
      });
      // (5*20 + 5*100) / 10 = 600/10 = 60
      expect(calculateMasteryProgress(distribution)).toBe(60);
    });
  });

  describe('getLowestState', () => {
    it('returns misconceived if present', () => {
      const distribution = createDistribution({
        mastered: 5,
        misconceived: 1,
      });
      expect(getLowestState(distribution)).toBe('misconceived');
    });

    it('returns unseen if present', () => {
      const distribution = createDistribution({
        unseen: 1,
        mastered: 5,
      });
      expect(getLowestState(distribution)).toBe('unseen');
    });

    it('returns exposed if unseen is 0', () => {
      const distribution = createDistribution({
        exposed: 1,
        mastered: 5,
      });
      expect(getLowestState(distribution)).toBe('exposed');
    });

    it('returns fragile if exposed is 0', () => {
      const distribution = createDistribution({
        fragile: 2,
        solid: 3,
      });
      expect(getLowestState(distribution)).toBe('fragile');
    });

    it('returns mastered if all are mastered', () => {
      const distribution = createDistribution({
        mastered: 10,
      });
      expect(getLowestState(distribution)).toBe('mastered');
    });

    it('returns unseen for empty distribution', () => {
      const distribution = createDistribution();
      expect(getLowestState(distribution)).toBe('unseen');
    });
  });

  describe('component rendering', () => {
    it('renders with basic distribution', () => {
      const distribution = createDistribution({
        exposed: 3,
        developing: 2,
        mastered: 5,
      });

      const { getByTestId } = render(
        <MasteryProgressBar
          distribution={distribution}
          totalConcepts={10}
          testID="test-bar"
        />
      );

      expect(getByTestId('test-bar')).toBeTruthy();
    });

    it('renders segments for each non-zero state', () => {
      const distribution = createDistribution({
        exposed: 2,
        developing: 3,
        mastered: 5,
      });

      const { getByTestId, queryByTestId } = render(
        <MasteryProgressBar
          distribution={distribution}
          totalConcepts={10}
          testID="test-bar"
        />
      );

      expect(getByTestId('test-bar-segment-exposed')).toBeTruthy();
      expect(getByTestId('test-bar-segment-developing')).toBeTruthy();
      expect(getByTestId('test-bar-segment-mastered')).toBeTruthy();
      expect(queryByTestId('test-bar-segment-unseen')).toBeNull();
    });

    it('shows legend when showLegend is true', () => {
      const distribution = createDistribution({
        exposed: 5,
        mastered: 5,
      });

      const { getByTestId } = render(
        <MasteryProgressBar
          distribution={distribution}
          totalConcepts={10}
          showLegend
          testID="test-bar"
        />
      );

      expect(getByTestId('test-bar-legend')).toBeTruthy();
    });

    it('hides percentage when showPercentage is false', () => {
      const distribution = createDistribution({
        mastered: 10,
      });

      const { queryByText } = render(
        <MasteryProgressBar
          distribution={distribution}
          totalConcepts={10}
          showPercentage={false}
          testID="test-bar"
        />
      );

      expect(queryByText('100% mastery')).toBeNull();
    });

    it('has correct accessibility props', () => {
      const distribution = createDistribution({
        developing: 5,
        mastered: 5,
      });

      const { getByTestId } = render(
        <MasteryProgressBar
          distribution={distribution}
          totalConcepts={10}
          testID="test-bar"
        />
      );

      const bar = getByTestId('test-bar');
      expect(bar.props.accessibilityRole).toBe('progressbar');
      expect(bar.props.accessible).toBe(true);
    });
  });
});
