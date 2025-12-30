/**
 * DifficultyIndicator Component Tests
 *
 * Tests for the DifficultyIndicator component covering:
 * - Visual difficulty display (1-10)
 * - Filled vs unfilled indicators
 * - Boundary values (1, 5, 10)
 * - Null/undefined handling
 * - Accessibility
 * - Custom testID support
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { DifficultyIndicator } from '../DifficultyIndicator';

describe('DifficultyIndicator Component', () => {
  describe('Rendering', () => {
    it('renders difficulty indicator with value', () => {
      render(<DifficultyIndicator difficulty={5} testID="difficulty" />);

      expect(screen.getByTestId('difficulty')).toBeTruthy();
    });

    it('renders 10 dots for all difficulty values', () => {
      render(<DifficultyIndicator difficulty={5} testID="difficulty" />);

      // Should have 10 dot elements
      for (let i = 0; i < 10; i++) {
        expect(screen.getByTestId(`difficulty-dot-${i}`)).toBeTruthy();
      }
    });

    it('renders correct number of filled dots for difficulty 5', () => {
      render(<DifficultyIndicator difficulty={5} testID="difficulty" />);

      // First 5 dots should be filled
      for (let i = 0; i < 5; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
        );
      }

      // Last 5 dots should be unfilled
      for (let i = 5; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });

    it('renders minimum difficulty (1)', () => {
      render(<DifficultyIndicator difficulty={1} testID="difficulty" />);

      // First dot should be filled
      const firstDot = screen.getByTestId('difficulty-dot-0');
      expect(firstDot.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
      );

      // Rest should be unfilled
      for (let i = 1; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });

    it('renders maximum difficulty (10)', () => {
      render(<DifficultyIndicator difficulty={10} testID="difficulty" />);

      // All dots should be filled
      for (let i = 0; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
        );
      }
    });
  });

  describe('Null/Undefined Handling', () => {
    it('renders with null difficulty showing all unfilled', () => {
      render(<DifficultyIndicator difficulty={null} testID="difficulty" />);

      // All dots should be unfilled
      for (let i = 0; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });

    it('renders with undefined difficulty showing all unfilled', () => {
      render(<DifficultyIndicator difficulty={undefined} testID="difficulty" />);

      // All dots should be unfilled
      for (let i = 0; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });
  });

  describe('Boundary Values', () => {
    it('clamps difficulty below 1 to 0 filled dots', () => {
      render(<DifficultyIndicator difficulty={0} testID="difficulty" />);

      // All dots should be unfilled
      for (let i = 0; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });

    it('clamps difficulty above 10 to 10 filled dots', () => {
      render(<DifficultyIndicator difficulty={15} testID="difficulty" />);

      // All 10 dots should be filled
      for (let i = 0; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
        );
      }
    });

    it('rounds decimal difficulties', () => {
      render(<DifficultyIndicator difficulty={3.7} testID="difficulty" />);

      // Should round to 4, so first 4 dots filled
      for (let i = 0; i < 4; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
        );
      }

      // Rest should be unfilled
      for (let i = 4; i < 10; i++) {
        const dot = screen.getByTestId(`difficulty-dot-${i}`);
        expect(dot.props.style).toEqual(
          expect.arrayContaining([expect.objectContaining({ opacity: 0.3 })])
        );
      }
    });
  });

  describe('Color Indication', () => {
    it('uses green color for low difficulty (1-3)', () => {
      render(<DifficultyIndicator difficulty={2} testID="difficulty" />);

      const container = screen.getByTestId('difficulty');
      // The label or dots should indicate easy level
      expect(screen.getByText('Easy')).toBeTruthy();
    });

    it('uses yellow color for medium difficulty (4-6)', () => {
      render(<DifficultyIndicator difficulty={5} testID="difficulty" />);

      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('uses red color for high difficulty (7-10)', () => {
      render(<DifficultyIndicator difficulty={8} testID="difficulty" />);

      expect(screen.getByText('Hard')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label', () => {
      render(<DifficultyIndicator difficulty={7} testID="difficulty" />);

      const indicator = screen.getByTestId('difficulty');
      expect(indicator.props.accessibilityLabel).toBe('Difficulty: 7 out of 10');
    });

    it('has correct accessibility label for null difficulty', () => {
      render(<DifficultyIndicator difficulty={null} testID="difficulty" />);

      const indicator = screen.getByTestId('difficulty');
      expect(indicator.props.accessibilityLabel).toBe('Difficulty: Unknown');
    });

    it('is accessible', () => {
      render(<DifficultyIndicator difficulty={5} testID="difficulty" />);

      const indicator = screen.getByTestId('difficulty');
      expect(indicator.props.accessible).toBe(true);
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      render(<DifficultyIndicator difficulty={5} />);

      expect(screen.getByTestId('difficulty-indicator')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      render(<DifficultyIndicator difficulty={5} testID="custom-difficulty" />);

      expect(screen.getByTestId('custom-difficulty')).toBeTruthy();
      expect(screen.queryByTestId('difficulty-indicator')).toBeNull();
    });
  });
});
