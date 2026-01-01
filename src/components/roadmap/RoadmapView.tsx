/**
 * RoadmapView Component
 *
 * A complete view for displaying learning roadmaps with:
 * - Vertical timeline layout with levels
 * - Total time estimate at top
 * - Progress through levels shown
 * - Mastery gates displayed between levels
 * - Connection lines between levels
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, spacing } from '../../theme';
import type { Roadmap, RoadmapLevel as RoadmapLevelType, Concept } from '../../types';
import { RoadmapLevel } from './RoadmapLevel';
import { MasteryGate } from './MasteryGate';
import { TimeEstimate, formatMinutes } from './TimeEstimate';
import { EpitomeHighlight } from './EpitomeHighlight';

/**
 * Props for the RoadmapView component
 */
export interface RoadmapViewProps {
  /** The roadmap to display */
  roadmap: Roadmap;
  /** Optional concept details for showing in levels */
  concepts?: Concept[];
  /** Array of completed level numbers */
  completedLevels?: number[];
  /** Current active level number */
  currentLevel?: number;
  /** Callback when a level is pressed */
  onLevelPress?: (level: RoadmapLevelType, levelNumber: number) => void;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
}

/**
 * RoadmapView Component
 *
 * @example
 * ```tsx
 * <RoadmapView
 *   roadmap={roadmap}
 *   concepts={concepts}
 *   completedLevels={[1, 2]}
 *   currentLevel={3}
 *   onLevelPress={(level, number) => handleLevelPress(level, number)}
 * />
 * ```
 */
export function RoadmapView({
  roadmap,
  concepts = [],
  completedLevels = [],
  currentLevel,
  onLevelPress,
  testID = 'roadmap-view',
  style,
}: RoadmapViewProps): React.ReactElement {
  // Sort levels by level number
  const sortedLevels = useMemo(
    () => [...roadmap.levels].sort((a, b) => a.level - b.level),
    [roadmap.levels]
  );

  // Create a map of concept_id to concept for quick lookup
  const conceptMap = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts]
  );

  // Get concepts for a specific level
  const getConceptsForLevel = useCallback(
    (level: RoadmapLevelType): Concept[] => {
      return level.concept_ids
        .map((id) => conceptMap.get(id))
        .filter((c): c is Concept => c !== undefined);
    },
    [conceptMap]
  );

  // Find mastery gate after a specific level
  const getGateAfterLevel = useCallback(
    (levelNumber: number) => {
      return roadmap.mastery_gates.find((g) => g.after_level === levelNumber);
    },
    [roadmap.mastery_gates]
  );

  // Check if a level is unlocked (Level 0 is always unlocked)
  const isLevelUnlocked = useCallback(
    (levelNumber: number): boolean => {
      if (levelNumber === 0 || levelNumber === 1) return true;
      if (currentLevel !== undefined && levelNumber <= currentLevel) return true;
      return completedLevels.includes(levelNumber - 1);
    },
    [completedLevels, currentLevel]
  );

  // Get epitome concept if available
  const epitomeConcept = useMemo(() => {
    if (roadmap.epitome_concept_id) {
      return conceptMap.get(roadmap.epitome_concept_id);
    }
    return undefined;
  }, [roadmap.epitome_concept_id, conceptMap]);

  // Check if a level is completed
  const isLevelCompleted = useCallback(
    (levelNumber: number): boolean => {
      return completedLevels.includes(levelNumber);
    },
    [completedLevels]
  );

  // Handle level press
  const handleLevelPress = useCallback(
    (level: RoadmapLevelType, levelNumber: number) => {
      onLevelPress?.(level, levelNumber);
    },
    [onLevelPress]
  );

  // Build accessibility label
  const completedCount = completedLevels.length;
  const totalLevels = sortedLevels.length;
  const accessibilityLabel = `${roadmap.title}, ${totalLevels} level${totalLevels === 1 ? '' : 's'}, ${completedCount} of ${totalLevels} completed`;

  // Empty state
  if (sortedLevels.length === 0) {
    return (
      <View
        testID={testID}
        accessible={true}
        accessibilityLabel={`${roadmap.title}, no levels available`}
        accessibilityRole="none"
        style={[styles.container, style]}
      >
        <View testID={`${testID}-empty`} style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No levels available</Text>
          <Text style={styles.emptySubtext}>
            This roadmap doesn&apos;t have any levels yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
      style={[styles.container, style]}
    >
      {/* Header with total time */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{roadmap.title}</Text>
        {roadmap.total_estimated_minutes && (
          <View testID={`${testID}-total-time`} style={styles.totalTime}>
            <Text style={styles.totalTimeLabel}>Total time:</Text>
            <Text style={styles.totalTimeValue}>
              {formatMinutes(roadmap.total_estimated_minutes)}
            </Text>
          </View>
        )}
        {/* Show calibration info if available */}
        {roadmap.time_calibration && (
          <View testID={`${testID}-calibration`} style={styles.calibrationInfo}>
            <Text style={styles.calibrationText}>
              {/* Derive content type from mode_multiplier: survey=1.5, conceptual=2.5, procedural=4.0 */}
              {roadmap.time_calibration.mode_multiplier <= 1.5 && 'Overview content'}
              {roadmap.time_calibration.mode_multiplier > 1.5 && roadmap.time_calibration.mode_multiplier <= 2.5 && 'Deep explanation'}
              {roadmap.time_calibration.mode_multiplier > 2.5 && 'Hands-on tutorial'}
              {' '}&bull;{' '}
              {roadmap.time_calibration.mode_multiplier.toFixed(1)}x learning ratio
            </Text>
          </View>
        )}
      </View>

      {/* Timeline with levels */}
      <ScrollView
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedLevels.map((level, index) => {
          const levelNumber = level.level;
          const isUnlocked = isLevelUnlocked(levelNumber);
          const isCompleted = isLevelCompleted(levelNumber);
          const levelConcepts = getConceptsForLevel(level);
          const gate = getGateAfterLevel(levelNumber);
          const nextLevel = sortedLevels[index + 1];
          const isEpitome = levelNumber === 0;

          return (
            <View key={level.level} style={styles.levelContainer}>
              {/* Level card - use EpitomeHighlight for Level 0 */}
              {isEpitome ? (
                <EpitomeHighlight
                  level={level}
                  concept={epitomeConcept}
                  testID={`${testID}-epitome`}
                />
              ) : (
                <RoadmapLevel
                  level={level}
                  levelNumber={levelNumber}
                  concepts={levelConcepts}
                  isUnlocked={isUnlocked}
                  isCompleted={isCompleted}
                  onPress={
                    onLevelPress
                      ? () => handleLevelPress(level, levelNumber)
                      : undefined
                  }
                  testID={`${testID}-level-${levelNumber}`}
                />
              )}

              {/* Connection line to next level */}
              {nextLevel && (
                <View
                  testID={`${testID}-connection-${levelNumber}-${nextLevel.level}`}
                  style={styles.connectionContainer}
                >
                  <View
                    style={[
                      styles.connectionLine,
                      isCompleted && styles.connectionLineCompleted,
                    ]}
                  />
                </View>
              )}

              {/* Mastery gate after this level (if exists) */}
              {gate && (
                <MasteryGate
                  gate={gate}
                  isUnlocked={isCompleted}
                  testID={`${testID}-gate-${levelNumber}`}
                />
              )}

              {/* Another connection line after gate (if exists) */}
              {gate && nextLevel && (
                <View style={styles.connectionContainer}>
                  <View
                    style={[
                      styles.connectionLine,
                      isCompleted && styles.connectionLineCompleted,
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[2],
  },
  totalTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  totalTimeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  calibrationInfo: {
    marginTop: spacing[1],
  },
  calibrationText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  levelContainer: {
    marginBottom: spacing[2],
  },
  connectionContainer: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  connectionLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
  },
  connectionLineCompleted: {
    backgroundColor: colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[2],
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

export default RoadmapView;
