/**
 * RoadmapLevel Component Tests
 *
 * Tests for the RoadmapLevel component covering:
 * - Renders level with correct information
 * - Shows concept count
 * - Shows time estimate
 * - Lock icon when not unlocked
 * - Checkmark when completed
 * - Press handlers work
 * - Accessibility labels present
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { RoadmapLevel } from '../RoadmapLevel';
import type { RoadmapLevel as RoadmapLevelType, Concept } from '../../../types';
import type { MasteryDistribution } from '../../mastery';

const createMockLevel = (overrides?: Partial<RoadmapLevelType>): RoadmapLevelType => ({
  level: 1,
  title: 'Getting Started with React',
  concept_ids: ['concept-1', 'concept-2', 'concept-3'],
  estimated_minutes: 30,
  ...overrides,
});

const createMockConcept = (id: string, name: string): Concept => ({
  id,
  project_id: 'project-1',
  source_id: 'source-1',
  name,
  definition: `Definition of ${name}`,
  key_points: ['Point 1', 'Point 2'],
  cognitive_type: 'conceptual',
  difficulty: 5,
  source_timestamps: [],
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const createMockDistribution = (overrides?: Partial<MasteryDistribution>): MasteryDistribution => ({
  unseen: 0,
  exposed: 0,
  fragile: 0,
  developing: 0,
  solid: 0,
  mastered: 0,
  misconceived: 0,
  ...overrides,
});

describe('RoadmapLevel Component', () => {
  describe('Rendering', () => {
    it('renders level number badge', () => {
      const level = createMockLevel();
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('1')).toBeTruthy();
    });

    it('renders level title', () => {
      const level = createMockLevel({ title: 'Introduction to Hooks' });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('Introduction to Hooks')).toBeTruthy();
    });

    it('renders concept count', () => {
      const level = createMockLevel({
        concept_ids: ['c1', 'c2', 'c3', 'c4', 'c5'],
      });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('5 concepts')).toBeTruthy();
    });

    it('renders singular concept count for single concept', () => {
      const level = createMockLevel({
        concept_ids: ['c1'],
      });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('1 concept')).toBeTruthy();
    });

    it('renders time estimate', () => {
      const level = createMockLevel({ estimated_minutes: 45 });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('~45 min')).toBeTruthy();
    });

    it('formats time estimate with hours for long durations', () => {
      const level = createMockLevel({ estimated_minutes: 90 });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      expect(screen.getByText('~1h 30min')).toBeTruthy();
    });

    it('renders with concept details when provided', () => {
      const level = createMockLevel({ concept_ids: ['c1', 'c2'] });
      const concepts = [
        createMockConcept('c1', 'useState Hook'),
        createMockConcept('c2', 'useEffect Hook'),
      ];
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          concepts={concepts}
          testID="roadmap-level"
        />
      );

      expect(screen.getByText('2 concepts')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('shows lock icon when not unlocked', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={2}
          isUnlocked={false}
          testID="roadmap-level"
        />
      );

      expect(screen.getByTestId('roadmap-level-lock-icon')).toBeTruthy();
    });

    it('does not show lock icon when unlocked', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          testID="roadmap-level"
        />
      );

      expect(screen.queryByTestId('roadmap-level-lock-icon')).toBeNull();
    });

    it('shows checkmark when completed', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isCompleted={true}
          testID="roadmap-level"
        />
      );

      expect(screen.getByTestId('roadmap-level-checkmark')).toBeTruthy();
    });

    it('does not show checkmark when not completed', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isCompleted={false}
          testID="roadmap-level"
        />
      );

      expect(screen.queryByTestId('roadmap-level-checkmark')).toBeNull();
    });

    it('shows progress indicator when in progress (unlocked but not completed)', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          isCompleted={false}
          testID="roadmap-level"
        />
      );

      expect(screen.getByTestId('roadmap-level-progress')).toBeTruthy();
    });

    it('applies locked styling when not unlocked', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={2}
          isUnlocked={false}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      // Check that opacity style is applied for locked state
      const flatStyles = Array.isArray(card.props.style)
        ? card.props.style.reduce((acc: object, s: object) => ({ ...acc, ...s }), {})
        : card.props.style;
      expect(flatStyles.opacity).toBeLessThan(1);
    });
  });

  describe('Press Handlers', () => {
    it('calls onPress when level is pressed', () => {
      const onPress = jest.fn();
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          onPress={onPress}
          isUnlocked={true}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      fireEvent.press(card);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when level is locked', () => {
      const onPress = jest.fn();
      const level = createMockLevel();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={2}
          onPress={onPress}
          isUnlocked={false}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      fireEvent.press(card);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not render as pressable when onPress is not provided', () => {
      const level = createMockLevel();
      render(
        <RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />
      );

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.onPress).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      const level = createMockLevel();
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessible).toBe(true);
    });

    it('has accessibility label describing the level', () => {
      const level = createMockLevel({
        title: 'React Basics',
        concept_ids: ['c1', 'c2', 'c3'],
        estimated_minutes: 30,
      });
      render(<RoadmapLevel level={level} levelNumber={1} testID="roadmap-level" />);

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessibilityLabel).toContain('Level 1');
      expect(card.props.accessibilityLabel).toContain('React Basics');
      expect(card.props.accessibilityLabel).toContain('3 concepts');
    });

    it('includes locked state in accessibility label', () => {
      const level = createMockLevel({ title: 'Advanced Topics' });
      render(
        <RoadmapLevel
          level={level}
          levelNumber={2}
          isUnlocked={false}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessibilityLabel).toContain('locked');
    });

    it('includes completed state in accessibility label', () => {
      const level = createMockLevel({ title: 'Intro' });
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isCompleted={true}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessibilityLabel).toContain('completed');
    });

    it('has correct accessibility role when pressable', () => {
      const level = createMockLevel();
      const onPress = jest.fn();
      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          onPress={onPress}
          isUnlocked={true}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      const level = createMockLevel();
      render(<RoadmapLevel level={level} levelNumber={1} />);

      expect(screen.getByTestId('roadmap-level')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const level = createMockLevel();
      render(<RoadmapLevel level={level} levelNumber={1} testID="my-level" />);

      expect(screen.getByTestId('my-level')).toBeTruthy();
      expect(screen.queryByTestId('roadmap-level')).toBeNull();
    });
  });

  describe('Mastery Distribution', () => {
    it('shows mastery progress bar when distribution is provided', () => {
      const level = createMockLevel();
      const distribution = createMockDistribution({
        developing: 2,
        mastered: 3,
      });

      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          masteryDistribution={distribution}
          testID="roadmap-level"
        />
      );

      expect(screen.getByTestId('roadmap-level-mastery')).toBeTruthy();
    });

    it('does not show mastery progress bar when level is locked', () => {
      const level = createMockLevel();
      const distribution = createMockDistribution({
        developing: 2,
        mastered: 3,
      });

      render(
        <RoadmapLevel
          level={level}
          levelNumber={2}
          isUnlocked={false}
          masteryDistribution={distribution}
          testID="roadmap-level"
        />
      );

      expect(screen.queryByTestId('roadmap-level-mastery')).toBeNull();
    });

    it('does not show mastery progress bar when distribution is not provided', () => {
      const level = createMockLevel();

      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          testID="roadmap-level"
        />
      );

      expect(screen.queryByTestId('roadmap-level-mastery')).toBeNull();
    });

    it('includes mastery percentage in accessibility label', () => {
      const level = createMockLevel({ title: 'React Hooks' });
      const distribution = createMockDistribution({
        mastered: 5, // 100% mastery
      });

      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          masteryDistribution={distribution}
          testID="roadmap-level"
        />
      );

      const card = screen.getByTestId('roadmap-level');
      expect(card.props.accessibilityLabel).toContain('100% mastery');
    });

    it('shows percentage text when mastery distribution provided', () => {
      const level = createMockLevel();
      const distribution = createMockDistribution({
        developing: 5, // 50% progress each
        mastered: 5, // 100% progress each
      });
      // (5*50 + 5*100) / 10 = 750/10 = 75%

      render(
        <RoadmapLevel
          level={level}
          levelNumber={1}
          isUnlocked={true}
          masteryDistribution={distribution}
          testID="roadmap-level"
        />
      );

      expect(screen.getByText('75%')).toBeTruthy();
    });
  });
});
