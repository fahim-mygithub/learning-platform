/**
 * CognitiveTypeBadge Component Tests
 *
 * Tests for the CognitiveTypeBadge component covering:
 * - Rendering for all cognitive types
 * - Correct color coding for each type
 * - Accessibility labels
 * - Custom testID support
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { CognitiveTypeBadge } from '../CognitiveTypeBadge';
import type { CognitiveType } from '../../../types';

describe('CognitiveTypeBadge Component', () => {
  describe('Rendering', () => {
    it('renders declarative type with correct text', () => {
      render(<CognitiveTypeBadge type="declarative" testID="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge).toBeTruthy();
      expect(screen.getByText('Declarative')).toBeTruthy();
    });

    it('renders conceptual type with correct text', () => {
      render(<CognitiveTypeBadge type="conceptual" testID="badge" />);

      expect(screen.getByText('Conceptual')).toBeTruthy();
    });

    it('renders procedural type with correct text', () => {
      render(<CognitiveTypeBadge type="procedural" testID="badge" />);

      expect(screen.getByText('Procedural')).toBeTruthy();
    });

    it('renders conditional type with correct text', () => {
      render(<CognitiveTypeBadge type="conditional" testID="badge" />);

      expect(screen.getByText('Conditional')).toBeTruthy();
    });

    it('renders metacognitive type with correct text', () => {
      render(<CognitiveTypeBadge type="metacognitive" testID="badge" />);

      expect(screen.getByText('Metacognitive')).toBeTruthy();
    });
  });

  describe('Color Coding', () => {
    const typeColorMap: Record<CognitiveType, string> = {
      declarative: '#3B82F6', // blue
      conceptual: '#8B5CF6', // purple
      procedural: '#22C55E', // green
      conditional: '#F97316', // orange
      metacognitive: '#EC4899', // pink
    };

    it.each(Object.entries(typeColorMap))(
      'renders %s type with correct background color',
      (type, expectedColor) => {
        render(
          <CognitiveTypeBadge type={type as CognitiveType} testID="badge" />
        );

        const badge = screen.getByTestId('badge');
        const styles = badge.props.style;

        // Check that the background color is applied
        const flatStyles = Array.isArray(styles)
          ? styles.reduce((acc, s) => ({ ...acc, ...s }), {})
          : styles;

        expect(flatStyles.backgroundColor).toBe(expectedColor);
      }
    );
  });

  describe('Accessibility', () => {
    it('has accessible role', () => {
      render(<CognitiveTypeBadge type="declarative" testID="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.props.accessible).toBe(true);
    });

    it('has correct accessibility label for declarative type', () => {
      render(<CognitiveTypeBadge type="declarative" testID="badge" />);

      const badge = screen.getByTestId('badge');
      expect(badge.props.accessibilityLabel).toBe(
        'Cognitive type: Declarative'
      );
    });

    it('has correct accessibility label for each type', () => {
      const types: CognitiveType[] = [
        'declarative',
        'conceptual',
        'procedural',
        'conditional',
        'metacognitive',
      ];

      types.forEach((type) => {
        const { unmount } = render(
          <CognitiveTypeBadge type={type} testID="badge" />
        );

        const badge = screen.getByTestId('badge');
        const expectedLabel = `Cognitive type: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        expect(badge.props.accessibilityLabel).toBe(expectedLabel);

        unmount();
      });
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      render(<CognitiveTypeBadge type="declarative" />);

      expect(screen.getByTestId('cognitive-type-badge')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      render(<CognitiveTypeBadge type="declarative" testID="custom-badge" />);

      expect(screen.getByTestId('custom-badge')).toBeTruthy();
      expect(screen.queryByTestId('cognitive-type-badge')).toBeNull();
    });
  });
});
