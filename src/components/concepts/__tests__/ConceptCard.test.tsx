/**
 * ConceptCard Component Tests
 *
 * Tests for the ConceptCard component covering:
 * - Renders concept name and definition
 * - Displays cognitive type badge with correct color
 * - Shows difficulty indicator
 * - Key points displayed correctly
 * - Press handlers called correctly
 * - Timestamp links shown for video concepts
 * - Accessibility labels present
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConceptCard } from '../ConceptCard';
import type { Concept } from '../../../types';

const createMockConcept = (overrides?: Partial<Concept>): Concept => ({
  id: 'concept-1',
  project_id: 'project-1',
  source_id: 'source-1',
  name: 'React Hooks',
  definition: 'React Hooks are functions that let you use state and other React features in function components.',
  key_points: [
    'useState for state management',
    'useEffect for side effects',
    'Custom hooks for reusability',
  ],
  cognitive_type: 'conceptual',
  difficulty: 6,
  source_timestamps: [
    { start: 120, end: 180, label: 'Introduction' },
    { start: 300, end: 420, label: 'Examples' },
  ],
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ConceptCard Component', () => {
  describe('Rendering', () => {
    it('renders concept name as header', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByText('React Hooks')).toBeTruthy();
    });

    it('renders concept definition', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(
        screen.getByText(/React Hooks are functions that let you use state/)
      ).toBeTruthy();
    });

    it('renders cognitive type badge', () => {
      const concept = createMockConcept({ cognitive_type: 'procedural' });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByText('Procedural')).toBeTruthy();
    });

    it('renders difficulty indicator', () => {
      const concept = createMockConcept({ difficulty: 7 });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      // Check that difficulty indicator is present
      expect(screen.getByTestId('concept-card-difficulty')).toBeTruthy();
    });

    it('renders all key points', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByText('useState for state management')).toBeTruthy();
      expect(screen.getByText('useEffect for side effects')).toBeTruthy();
      expect(screen.getByText('Custom hooks for reusability')).toBeTruthy();
    });

    it('renders without key points when empty', () => {
      const concept = createMockConcept({ key_points: [] });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByTestId('concept-card')).toBeTruthy();
      // Should not have key points section
      expect(screen.queryByTestId('concept-card-key-points')).toBeNull();
    });
  });

  describe('Cognitive Type Badge Colors', () => {
    const typesToTest: Array<{
      type: Concept['cognitive_type'];
      expectedColor: string;
    }> = [
      { type: 'declarative', expectedColor: '#3B82F6' },
      { type: 'conceptual', expectedColor: '#8B5CF6' },
      { type: 'procedural', expectedColor: '#22C55E' },
      { type: 'conditional', expectedColor: '#F97316' },
      { type: 'metacognitive', expectedColor: '#EC4899' },
    ];

    it.each(typesToTest)(
      'displays $type badge with correct color',
      ({ type, expectedColor }) => {
        const concept = createMockConcept({ cognitive_type: type });
        render(<ConceptCard concept={concept} testID="concept-card" />);

        const badge = screen.getByTestId('concept-card-badge');
        const styles = badge.props.style;
        const flatStyles = Array.isArray(styles)
          ? styles.reduce((acc, s) => ({ ...acc, ...s }), {})
          : styles;

        expect(flatStyles.backgroundColor).toBe(expectedColor);
      }
    );
  });

  describe('Difficulty Indicator', () => {
    it('shows difficulty indicator with correct value', () => {
      const concept = createMockConcept({ difficulty: 8 });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const difficultyIndicator = screen.getByTestId('concept-card-difficulty');
      expect(difficultyIndicator.props.accessibilityLabel).toBe(
        'Difficulty: 8 out of 10'
      );
    });

    it('handles null difficulty', () => {
      const concept = createMockConcept({ difficulty: null });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const difficultyIndicator = screen.getByTestId('concept-card-difficulty');
      expect(difficultyIndicator.props.accessibilityLabel).toBe(
        'Difficulty: Unknown'
      );
    });
  });

  describe('Press Handlers', () => {
    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn();
      const concept = createMockConcept();
      render(
        <ConceptCard concept={concept} onPress={onPress} testID="concept-card" />
      );

      const card = screen.getByTestId('concept-card');
      fireEvent.press(card);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not render as pressable when onPress is not provided', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const card = screen.getByTestId('concept-card');
      // Should still be a View, not TouchableOpacity/Pressable
      expect(card.props.onPress).toBeUndefined();
    });
  });

  describe('Timestamp Links', () => {
    it('renders timestamp links for concepts with source_timestamps', () => {
      const concept = createMockConcept({
        source_timestamps: [
          { start: 120, end: 180, label: 'Introduction' },
          { start: 300, end: 420, label: 'Examples' },
        ],
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByTestId('concept-card-timestamps')).toBeTruthy();
      expect(screen.getByText('2:00 - 3:00')).toBeTruthy();
      expect(screen.getByText('5:00 - 7:00')).toBeTruthy();
    });

    it('calls onTimestampPress with correct timestamp data', () => {
      const onTimestampPress = jest.fn();
      const concept = createMockConcept({
        source_timestamps: [{ start: 120, end: 180, label: 'Introduction' }],
      });
      render(
        <ConceptCard
          concept={concept}
          onTimestampPress={onTimestampPress}
          testID="concept-card"
        />
      );

      const timestampLink = screen.getByTestId('concept-card-timestamp-0');
      fireEvent.press(timestampLink);

      expect(onTimestampPress).toHaveBeenCalledWith(
        expect.objectContaining({ start: 120, end: 180 })
      );
    });

    it('does not render timestamps section when source_timestamps is empty', () => {
      const concept = createMockConcept({ source_timestamps: [] });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.queryByTestId('concept-card-timestamps')).toBeNull();
    });

    it('does not render timestamps section when source_id is null', () => {
      const concept = createMockConcept({
        source_id: null,
        source_timestamps: [{ start: 120, end: 180 }],
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      // Timestamps should not be shown when there's no source
      expect(screen.queryByTestId('concept-card-timestamps')).toBeNull();
    });
  });

  describe('Key Points Collapsibility', () => {
    it('collapses key points when there are more than 3', () => {
      const concept = createMockConcept({
        key_points: [
          'Point 1',
          'Point 2',
          'Point 3',
          'Point 4',
          'Point 5',
        ],
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      // Should show first 3 and a "show more" option
      expect(screen.getByText('Point 1')).toBeTruthy();
      expect(screen.getByText('Point 2')).toBeTruthy();
      expect(screen.getByText('Point 3')).toBeTruthy();
      expect(screen.getByText(/Show \d+ more/)).toBeTruthy();
    });

    it('expands key points when "show more" is pressed', () => {
      const concept = createMockConcept({
        key_points: ['Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5'],
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const showMoreButton = screen.getByText(/Show \d+ more/);
      fireEvent.press(showMoreButton);

      expect(screen.getByText('Point 4')).toBeTruthy();
      expect(screen.getByText('Point 5')).toBeTruthy();
      expect(screen.getByText('Show less')).toBeTruthy();
    });

    it('shows all key points when 3 or fewer', () => {
      const concept = createMockConcept({
        key_points: ['Point 1', 'Point 2', 'Point 3'],
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      expect(screen.getByText('Point 1')).toBeTruthy();
      expect(screen.getByText('Point 2')).toBeTruthy();
      expect(screen.getByText('Point 3')).toBeTruthy();
      expect(screen.queryByText(/Show \d+ more/)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const card = screen.getByTestId('concept-card');
      expect(card.props.accessible).toBe(true);
    });

    it('has accessibility label describing the concept', () => {
      const concept = createMockConcept({
        name: 'Test Concept',
        cognitive_type: 'procedural',
        difficulty: 5,
      });
      render(<ConceptCard concept={concept} testID="concept-card" />);

      const card = screen.getByTestId('concept-card');
      expect(card.props.accessibilityLabel).toContain('Test Concept');
      expect(card.props.accessibilityLabel).toContain('procedural');
      expect(card.props.accessibilityLabel).toContain('difficulty 5');
    });

    it('has correct accessibility role when pressable', () => {
      const concept = createMockConcept();
      const onPress = jest.fn();
      render(
        <ConceptCard concept={concept} onPress={onPress} testID="concept-card" />
      );

      const card = screen.getByTestId('concept-card');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} />);

      expect(screen.getByTestId('concept-card')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="my-concept-card" />);

      expect(screen.getByTestId('my-concept-card')).toBeTruthy();
      expect(screen.queryByTestId('concept-card')).toBeNull();
    });

    it('applies testID prefix to child components', () => {
      const concept = createMockConcept();
      render(<ConceptCard concept={concept} testID="my-card" />);

      expect(screen.getByTestId('my-card-badge')).toBeTruthy();
      expect(screen.getByTestId('my-card-difficulty')).toBeTruthy();
    });
  });
});
