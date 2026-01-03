/**
 * CognitiveLoadIndicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CognitiveLoadIndicator } from '../CognitiveLoadIndicator';
import { CognitiveCapacity } from '../../../types/session';
import { colors } from '../../../theme';

// Helper to create default capacity
function createCapacity(
  overrides: Partial<CognitiveCapacity> = {}
): CognitiveCapacity {
  return {
    baseCapacity: 4,
    circadianModifier: 1.0,
    sleepModifier: 1.0,
    fatigueModifier: 0,
    effectiveCapacity: 4,
    percentageUsed: 50,
    canLearnNew: true,
    warningLevel: 'none',
    ...overrides,
  };
}

describe('CognitiveLoadIndicator', () => {
  describe('rendering', () => {
    it('renders with default capacity', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity()}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator')).toBeTruthy();
    });

    it('shows correct concepts used count', () => {
      const { getByTestId, getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ effectiveCapacity: 4 })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator-concepts')).toBeTruthy();
      expect(getByText('2 of 4 concepts')).toBeTruthy();
    });

    it('shows correct percentage', () => {
      const { getByTestId, getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 75 })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator-percentage')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
    });

    it('rounds percentage to whole number', () => {
      const { getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 66.7 })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      expect(getByText('67%')).toBeTruthy();
    });
  });

  describe('color changes based on warning level', () => {
    it('shows green color for percentage < 75%', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 50, warningLevel: 'none' })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: colors.success }),
        ])
      );
    });

    it('shows yellow color for percentage 75-89%', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 80, warningLevel: 'caution' })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: colors.warning }),
        ])
      );
    });

    it('shows red color for percentage >= 90%', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 95, warningLevel: 'blocked' })}
          conceptsUsed={4}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: colors.error }),
        ])
      );
    });

    it('shows yellow at exactly 75%', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 75, warningLevel: 'caution' })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: colors.warning }),
        ])
      );
    });

    it('shows red at exactly 90%', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 90, warningLevel: 'blocked' })}
          conceptsUsed={4}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: colors.error }),
        ])
      );
    });
  });

  describe('warning icon', () => {
    it('shows warning icon when warningLevel is caution', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'caution' })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator-warning-icon')).toBeTruthy();
    });

    it('shows warning icon when warningLevel is blocked', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'blocked' })}
          conceptsUsed={4}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator-warning-icon')).toBeTruthy();
    });

    it('does not show warning icon when warningLevel is none', () => {
      const { queryByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'none' })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(queryByTestId('test-indicator-warning-icon')).toBeNull();
    });
  });

  describe('status text', () => {
    it('shows "Ready to learn" for warningLevel none', () => {
      const { getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'none' })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(getByText('Ready to learn')).toBeTruthy();
    });

    it('shows "Near capacity" for warningLevel caution', () => {
      const { getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'caution' })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      expect(getByText('Near capacity')).toBeTruthy();
    });

    it('shows "At capacity" for warningLevel blocked', () => {
      const { getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ warningLevel: 'blocked' })}
          conceptsUsed={4}
          testID="test-indicator"
        />
      );

      expect(getByText('At capacity')).toBeTruthy();
    });
  });

  describe('blocked message', () => {
    it('shows blocked message when canLearnNew is false', () => {
      const { getByTestId, getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ canLearnNew: false })}
          conceptsUsed={4}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator-blocked')).toBeTruthy();
      expect(getByText('Focus on reviews - new learning not recommended')).toBeTruthy();
    });

    it('does not show blocked message when canLearnNew is true', () => {
      const { queryByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ canLearnNew: true })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(queryByTestId('test-indicator-blocked')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('clamps percentage at 0', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: -10 })}
          conceptsUsed={0}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '0%' })])
      );
    });

    it('clamps percentage at 100', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 150 })}
          conceptsUsed={6}
          testID="test-indicator"
        />
      );

      const barFill = getByTestId('test-indicator-bar-fill');
      expect(barFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '100%' })])
      );
    });

    it('handles fractional effective capacity', () => {
      const { getByText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ effectiveCapacity: 3.5 })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      expect(getByText('2 of 4 concepts')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility role', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity()}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      const indicator = getByTestId('test-indicator');
      expect(indicator.props.accessibilityRole).toBe('progressbar');
    });

    it('has correct accessibility value', () => {
      const { getByTestId } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({ percentageUsed: 75 })}
          conceptsUsed={3}
          testID="test-indicator"
        />
      );

      const indicator = getByTestId('test-indicator');
      expect(indicator.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 75,
      });
    });

    it('has accessible label with all information', () => {
      const { getByLabelText } = render(
        <CognitiveLoadIndicator
          capacity={createCapacity({
            percentageUsed: 50,
            effectiveCapacity: 4,
            warningLevel: 'none',
          })}
          conceptsUsed={2}
          testID="test-indicator"
        />
      );

      const indicator = getByLabelText(/Cognitive load: 2 of 4 concepts used/);
      expect(indicator).toBeTruthy();
    });
  });
});
