/**
 * ConceptsList Component Tests
 *
 * Tests for the ConceptsList component covering:
 * - Renders list of concepts
 * - Empty state message
 * - Press handlers called correctly
 * - Timestamp press handlers
 * - Efficient rendering with FlatList
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConceptsList } from '../ConceptsList';
import type { Concept } from '../../../types';

const createMockConcept = (
  id: string,
  overrides?: Partial<Concept>
): Concept => ({
  id,
  project_id: 'project-1',
  source_id: 'source-1',
  name: `Concept ${id}`,
  definition: `Definition for concept ${id}`,
  key_points: ['Point 1', 'Point 2'],
  cognitive_type: 'conceptual',
  difficulty: 5,
  source_timestamps: [],
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ConceptsList Component', () => {
  describe('Rendering', () => {
    it('renders list of concepts', () => {
      const concepts = [
        createMockConcept('1', { name: 'First Concept' }),
        createMockConcept('2', { name: 'Second Concept' }),
        createMockConcept('3', { name: 'Third Concept' }),
      ];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      expect(screen.getByText('First Concept')).toBeTruthy();
      expect(screen.getByText('Second Concept')).toBeTruthy();
      expect(screen.getByText('Third Concept')).toBeTruthy();
    });

    it('renders each concept with its definition', () => {
      const concepts = [
        createMockConcept('1', {
          name: 'React',
          definition: 'A JavaScript library for building UIs',
        }),
      ];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      expect(screen.getByText('React')).toBeTruthy();
      expect(
        screen.getByText('A JavaScript library for building UIs')
      ).toBeTruthy();
    });

    it('renders concepts with cognitive type badges', () => {
      const concepts = [
        createMockConcept('1', { cognitive_type: 'declarative' }),
        createMockConcept('2', { cognitive_type: 'procedural' }),
      ];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      expect(screen.getByText('Declarative')).toBeTruthy();
      expect(screen.getByText('Procedural')).toBeTruthy();
    });

    it('renders concepts with difficulty indicators', () => {
      const concepts = [
        createMockConcept('1', { difficulty: 3 }),
        createMockConcept('2', { difficulty: 8 }),
      ];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      // Both concept cards should have difficulty indicators
      expect(
        screen.getByTestId('concepts-list-item-1-difficulty')
      ).toBeTruthy();
      expect(
        screen.getByTestId('concepts-list-item-2-difficulty')
      ).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows default empty message when concepts array is empty', () => {
      render(<ConceptsList concepts={[]} testID="concepts-list" />);

      expect(screen.getByText('No concepts found')).toBeTruthy();
    });

    it('shows custom empty message when provided', () => {
      render(
        <ConceptsList
          concepts={[]}
          emptyMessage="Start by adding some content"
          testID="concepts-list"
        />
      );

      expect(screen.getByText('Start by adding some content')).toBeTruthy();
      expect(screen.queryByText('No concepts found')).toBeNull();
    });

    it('renders empty state container with testID', () => {
      render(<ConceptsList concepts={[]} testID="concepts-list" />);

      expect(screen.getByTestId('concepts-list-empty')).toBeTruthy();
    });
  });

  describe('Press Handlers', () => {
    it('calls onConceptPress with concept when card is pressed', () => {
      const onConceptPress = jest.fn();
      const concepts = [
        createMockConcept('1', { name: 'Test Concept' }),
        createMockConcept('2', { name: 'Another Concept' }),
      ];

      render(
        <ConceptsList
          concepts={concepts}
          onConceptPress={onConceptPress}
          testID="concepts-list"
        />
      );

      const firstCard = screen.getByTestId('concepts-list-item-1');
      fireEvent.press(firstCard);

      expect(onConceptPress).toHaveBeenCalledTimes(1);
      expect(onConceptPress).toHaveBeenCalledWith(concepts[0]);
    });

    it('calls onConceptPress with correct concept for different items', () => {
      const onConceptPress = jest.fn();
      const concepts = [
        createMockConcept('1'),
        createMockConcept('2'),
        createMockConcept('3'),
      ];

      render(
        <ConceptsList
          concepts={concepts}
          onConceptPress={onConceptPress}
          testID="concepts-list"
        />
      );

      const secondCard = screen.getByTestId('concepts-list-item-2');
      fireEvent.press(secondCard);

      expect(onConceptPress).toHaveBeenCalledWith(concepts[1]);
    });

    it('does not call handler when onConceptPress is not provided', () => {
      const concepts = [createMockConcept('1')];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      const card = screen.getByTestId('concepts-list-item-1');
      // Should not throw when pressed without handler
      fireEvent.press(card);
    });
  });

  describe('Timestamp Press Handlers', () => {
    it('calls onTimestampPress with concept id and timestamp', () => {
      const onTimestampPress = jest.fn();
      const concepts = [
        createMockConcept('1', {
          source_timestamps: [{ start: 60, end: 120, label: 'Intro' }],
        }),
      ];

      render(
        <ConceptsList
          concepts={concepts}
          onTimestampPress={onTimestampPress}
          testID="concepts-list"
        />
      );

      const timestampLink = screen.getByTestId(
        'concepts-list-item-1-timestamp-0'
      );
      fireEvent.press(timestampLink);

      expect(onTimestampPress).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ start: 60, end: 120 })
      );
    });

    it('passes timestamp handler to each ConceptCard', () => {
      const onTimestampPress = jest.fn();
      const concepts = [
        createMockConcept('1', {
          source_timestamps: [{ start: 10, end: 20 }],
        }),
        createMockConcept('2', {
          source_timestamps: [{ start: 30, end: 40 }],
        }),
      ];

      render(
        <ConceptsList
          concepts={concepts}
          onTimestampPress={onTimestampPress}
          testID="concepts-list"
        />
      );

      // Press timestamp on first concept
      const firstTimestamp = screen.getByTestId(
        'concepts-list-item-1-timestamp-0'
      );
      fireEvent.press(firstTimestamp);
      expect(onTimestampPress).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ start: 10, end: 20 })
      );

      // Press timestamp on second concept
      const secondTimestamp = screen.getByTestId(
        'concepts-list-item-2-timestamp-0'
      );
      fireEvent.press(secondTimestamp);
      expect(onTimestampPress).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({ start: 30, end: 40 })
      );
    });
  });

  describe('FlatList Behavior', () => {
    it('uses FlatList for efficient rendering', () => {
      const concepts = [createMockConcept('1')];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      // FlatList should be present
      const list = screen.getByTestId('concepts-list');
      expect(list).toBeTruthy();
    });

    it('renders items with unique keys', () => {
      const concepts = [
        createMockConcept('1'),
        createMockConcept('2'),
        createMockConcept('3'),
      ];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      // Each item should have unique testID based on concept id
      expect(screen.getByTestId('concepts-list-item-1')).toBeTruthy();
      expect(screen.getByTestId('concepts-list-item-2')).toBeTruthy();
      expect(screen.getByTestId('concepts-list-item-3')).toBeTruthy();
    });

    it('is scrollable', () => {
      const concepts = Array.from({ length: 10 }, (_, i) =>
        createMockConcept(`${i + 1}`)
      );

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      const list = screen.getByTestId('concepts-list');
      // FlatList should have scroll enabled by default
      expect(list.props.scrollEnabled).not.toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('has accessible list container', () => {
      const concepts = [createMockConcept('1')];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      const list = screen.getByTestId('concepts-list');
      expect(list.props.accessible).toBe(true);
    });

    it('has accessibility label for list', () => {
      const concepts = [createMockConcept('1'), createMockConcept('2')];

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      const list = screen.getByTestId('concepts-list');
      expect(list.props.accessibilityLabel).toBe('Concepts list, 2 items');
    });

    it('has accessibility label for empty state', () => {
      render(<ConceptsList concepts={[]} testID="concepts-list" />);

      const emptyState = screen.getByTestId('concepts-list-empty');
      expect(emptyState.props.accessibilityLabel).toBe(
        'No concepts found'
      );
    });

    it('updates accessibility label based on custom empty message', () => {
      render(
        <ConceptsList
          concepts={[]}
          emptyMessage="Add content to see concepts"
          testID="concepts-list"
        />
      );

      const emptyState = screen.getByTestId('concepts-list-empty');
      expect(emptyState.props.accessibilityLabel).toBe(
        'Add content to see concepts'
      );
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      const concepts = [createMockConcept('1')];

      render(<ConceptsList concepts={concepts} />);

      expect(screen.getByTestId('concepts-list')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const concepts = [createMockConcept('1')];

      render(<ConceptsList concepts={concepts} testID="my-concepts" />);

      expect(screen.getByTestId('my-concepts')).toBeTruthy();
      expect(screen.queryByTestId('concepts-list')).toBeNull();
    });

    it('applies testID prefix to item cards', () => {
      const concepts = [
        createMockConcept('abc'),
        createMockConcept('xyz'),
      ];

      render(<ConceptsList concepts={concepts} testID="list" />);

      expect(screen.getByTestId('list-item-abc')).toBeTruthy();
      expect(screen.getByTestId('list-item-xyz')).toBeTruthy();
    });
  });

  describe('Large Lists', () => {
    it('handles large number of concepts', () => {
      const concepts = Array.from({ length: 100 }, (_, i) =>
        createMockConcept(`${i + 1}`)
      );

      render(<ConceptsList concepts={concepts} testID="concepts-list" />);

      // FlatList should render without crashing
      expect(screen.getByTestId('concepts-list')).toBeTruthy();
    });
  });
});
