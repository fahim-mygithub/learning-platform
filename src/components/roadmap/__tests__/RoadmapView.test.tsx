/**
 * RoadmapView Component Tests
 *
 * Tests for the RoadmapView component covering:
 * - Renders roadmap with all levels
 * - Shows total time estimate
 * - Mastery gates displayed between levels
 * - Level press handlers work
 * - Empty roadmap state
 * - Progress through levels shown
 * - Connection lines between levels
 * - Accessibility labels present
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { RoadmapView } from '../RoadmapView';
import type { Roadmap, RoadmapLevel, MasteryGate, Concept } from '../../../types';

const createMockLevel = (
  level: number,
  title: string,
  conceptIds: string[] = [],
  estimatedMinutes: number = 30
): RoadmapLevel => ({
  level,
  title,
  concept_ids: conceptIds,
  estimated_minutes: estimatedMinutes,
});

const createMockRoadmap = (overrides?: Partial<Roadmap>): Roadmap => ({
  id: 'roadmap-1',
  project_id: 'project-1',
  title: 'React Learning Path',
  description: 'A comprehensive path to learn React',
  levels: [
    createMockLevel(1, 'React Basics', ['c1', 'c2'], 30),
    createMockLevel(2, 'Hooks Deep Dive', ['c3', 'c4', 'c5'], 45),
    createMockLevel(3, 'Advanced Patterns', ['c6', 'c7'], 60),
  ],
  total_estimated_minutes: 135,
  mastery_gates: [
    {
      after_level: 1,
      required_score: 80,
      quiz_concept_ids: ['c1', 'c2'],
    },
    {
      after_level: 2,
      required_score: 85,
      quiz_concept_ids: ['c3', 'c4', 'c5'],
    },
  ],
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockConcept = (id: string, name: string): Concept => ({
  id,
  project_id: 'project-1',
  source_id: 'source-1',
  name,
  definition: `Definition of ${name}`,
  key_points: ['Point 1'],
  cognitive_type: 'conceptual',
  difficulty: 5,
  source_timestamps: [],
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

describe('RoadmapView Component', () => {
  describe('Rendering', () => {
    it('renders all levels in the roadmap', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      expect(screen.getByText('React Basics')).toBeTruthy();
      expect(screen.getByText('Hooks Deep Dive')).toBeTruthy();
      expect(screen.getByText('Advanced Patterns')).toBeTruthy();
    });

    it('renders levels in correct order', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      // Verify level numbers are present
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('displays total time estimate at top', () => {
      const roadmap = createMockRoadmap({ total_estimated_minutes: 135 });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      // Should display formatted total time (2h 15min)
      expect(screen.getByTestId('roadmap-view-total-time')).toBeTruthy();
      expect(screen.getByText(/2h 15min/)).toBeTruthy();
    });

    it('displays total time in minutes for short durations', () => {
      const roadmap = createMockRoadmap({
        total_estimated_minutes: 45,
        levels: [createMockLevel(1, 'Level 1', ['c1'], 20)], // Use different time
      });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      // Check within the total time container specifically
      const totalTimeContainer = screen.getByTestId('roadmap-view-total-time');
      expect(totalTimeContainer).toBeTruthy();
      expect(screen.getByText('45 min')).toBeTruthy();
    });

    it('renders connection lines between levels', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      // Should have connection lines between levels (one less than number of levels)
      expect(screen.getByTestId('roadmap-view-connection-1-2')).toBeTruthy();
      expect(screen.getByTestId('roadmap-view-connection-2-3')).toBeTruthy();
    });
  });

  describe('Mastery Gates', () => {
    it('displays mastery gates between levels', () => {
      const roadmap = createMockRoadmap({
        mastery_gates: [
          { after_level: 1, required_score: 80, quiz_concept_ids: ['c1'] },
        ],
      });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      expect(screen.getByTestId('roadmap-view-gate-1')).toBeTruthy();
    });

    it('shows required score on mastery gate', () => {
      const roadmap = createMockRoadmap({
        mastery_gates: [
          { after_level: 1, required_score: 80, quiz_concept_ids: ['c1'] },
        ],
      });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      expect(screen.getByText(/80% mastery required/)).toBeTruthy();
    });

    it('shows gate as unlocked when previous level is completed', () => {
      const roadmap = createMockRoadmap({
        mastery_gates: [
          { after_level: 1, required_score: 80, quiz_concept_ids: ['c1'] },
        ],
      });
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[1]}
          testID="roadmap-view"
        />
      );

      const gate = screen.getByTestId('roadmap-view-gate-1');
      // Gate should show unlocked state
      expect(gate.props.accessibilityLabel).toContain('unlocked');
    });

    it('shows gate as locked when previous level not completed', () => {
      const roadmap = createMockRoadmap({
        mastery_gates: [
          { after_level: 1, required_score: 80, quiz_concept_ids: ['c1'] },
        ],
      });
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[]}
          testID="roadmap-view"
        />
      );

      const gate = screen.getByTestId('roadmap-view-gate-1');
      expect(gate.props.accessibilityLabel).toContain('locked');
    });
  });

  describe('Progress', () => {
    it('marks completed levels', () => {
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[1]}
          testID="roadmap-view"
        />
      );

      // First level should show completed state
      expect(screen.getByTestId('roadmap-view-level-1-checkmark')).toBeTruthy();
    });

    it('marks current level as in progress', () => {
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[1]}
          currentLevel={2}
          testID="roadmap-view"
        />
      );

      expect(screen.getByTestId('roadmap-view-level-2-progress')).toBeTruthy();
    });

    it('shows future levels as locked', () => {
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[]}
          currentLevel={1}
          testID="roadmap-view"
        />
      );

      // Levels 2 and 3 should be locked
      expect(screen.getByTestId('roadmap-view-level-2-lock-icon')).toBeTruthy();
      expect(screen.getByTestId('roadmap-view-level-3-lock-icon')).toBeTruthy();
    });

    it('unlocks next level after completing previous', () => {
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[1]}
          currentLevel={2}
          testID="roadmap-view"
        />
      );

      // Level 2 should not have lock icon
      expect(screen.queryByTestId('roadmap-view-level-2-lock-icon')).toBeNull();
    });
  });

  describe('Press Handlers', () => {
    it('calls onLevelPress when level is pressed', () => {
      const onLevelPress = jest.fn();
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          onLevelPress={onLevelPress}
          currentLevel={1}
          testID="roadmap-view"
        />
      );

      const level1 = screen.getByTestId('roadmap-view-level-1');
      fireEvent.press(level1);

      expect(onLevelPress).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'React Basics' }),
        1
      );
    });

    it('does not call onLevelPress for locked levels', () => {
      const onLevelPress = jest.fn();
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          onLevelPress={onLevelPress}
          completedLevels={[]}
          currentLevel={1}
          testID="roadmap-view"
        />
      );

      const level2 = screen.getByTestId('roadmap-view-level-2');
      fireEvent.press(level2);

      expect(onLevelPress).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when roadmap has no levels', () => {
      const roadmap = createMockRoadmap({ levels: [] });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      expect(screen.getByTestId('roadmap-view-empty')).toBeTruthy();
      expect(screen.getByText(/No levels available/)).toBeTruthy();
    });

    it('does not render connection lines for empty roadmap', () => {
      const roadmap = createMockRoadmap({ levels: [] });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      expect(screen.queryByTestId('roadmap-view-connection-1-2')).toBeNull();
    });
  });

  describe('Concept Details', () => {
    it('passes concept details to level components', () => {
      const roadmap = createMockRoadmap({
        levels: [createMockLevel(1, 'Level 1', ['c1', 'c2'], 30)],
      });
      const concepts = [
        createMockConcept('c1', 'Concept 1'),
        createMockConcept('c2', 'Concept 2'),
      ];
      render(
        <RoadmapView
          roadmap={roadmap}
          concepts={concepts}
          testID="roadmap-view"
        />
      );

      // Should show concept count
      expect(screen.getByText('2 concepts')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      const container = screen.getByTestId('roadmap-view');
      expect(container.props.accessible).toBe(true);
    });

    it('has accessibility label for roadmap', () => {
      const roadmap = createMockRoadmap({ title: 'React Learning Path' });
      render(<RoadmapView roadmap={roadmap} testID="roadmap-view" />);

      const container = screen.getByTestId('roadmap-view');
      expect(container.props.accessibilityLabel).toContain('React Learning Path');
      expect(container.props.accessibilityLabel).toContain('3 levels');
    });

    it('includes progress in accessibility label', () => {
      const roadmap = createMockRoadmap();
      render(
        <RoadmapView
          roadmap={roadmap}
          completedLevels={[1, 2]}
          testID="roadmap-view"
        />
      );

      const container = screen.getByTestId('roadmap-view');
      expect(container.props.accessibilityLabel).toContain('2 of 3 completed');
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} />);

      expect(screen.getByTestId('roadmap-view')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="my-roadmap" />);

      expect(screen.getByTestId('my-roadmap')).toBeTruthy();
      expect(screen.queryByTestId('roadmap-view')).toBeNull();
    });

    it('applies testID prefix to child components', () => {
      const roadmap = createMockRoadmap();
      render(<RoadmapView roadmap={roadmap} testID="my-roadmap" />);

      expect(screen.getByTestId('my-roadmap-level-1')).toBeTruthy();
      expect(screen.getByTestId('my-roadmap-total-time')).toBeTruthy();
    });
  });
});
