/**
 * MatchingInteraction Component
 *
 * A two-column matching interaction where users drag terms from the left
 * to match with definitions on the right.
 *
 * Cognitive Type: Factual (Remember)
 * Pattern: Left column (draggable terms) → Right column (droppable definitions)
 *
 * Features:
 * - Single capacity per zone
 * - Scaffold mode: Some pre-matched
 * - Visual feedback on correct/incorrect
 * - Console logging for debugging
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import type { SandboxInteraction, ScaffoldLevel } from '../../../types/sandbox';
import { useTypography } from '../../../lib/typography-context';
import { spacing } from '../../../theme';

/**
 * Matching pair definition
 */
export interface MatchingPair {
  id: string;
  term: string;
  definition: string;
}

/**
 * Props for MatchingInteraction
 */
export interface MatchingInteractionProps {
  /** Pairs to match */
  pairs: MatchingPair[];

  /** Scaffold level for fading scaffolding */
  scaffoldLevel: ScaffoldLevel;

  /** Pre-matched pairs for scaffold mode (pair IDs) */
  preMatchedIds?: string[];

  /** Called when state changes */
  onStateChange: (state: Record<string, string[]>) => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Drag data for matching terms
 */
interface MatchDragData {
  id: string;
  term: string;
  pairId: string;
}

/**
 * MatchingInteraction Component
 */
export function MatchingInteraction({
  pairs,
  scaffoldLevel,
  preMatchedIds = [],
  onStateChange,
  testID = 'matching-interaction',
}: MatchingInteractionProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  // Track which terms are in which zones
  // zoneContents: { [definitionId]: [termId] }
  const [zoneContents, setZoneContents] = useState<Record<string, string[]>>(() => {
    // Initialize with pre-matched pairs for scaffold mode
    const initial: Record<string, string[]> = {};

    // Initialize all zones as empty
    pairs.forEach((pair) => {
      initial[pair.id] = [];
    });

    // Pre-match for scaffold mode
    if (scaffoldLevel === 'scaffold') {
      preMatchedIds.forEach((pairId) => {
        initial[pairId] = [pairId];
      });
    }

    return initial;
  });

  // Track which terms have been placed
  const placedTermIds = useMemo(() => {
    const placed = new Set<string>();
    Object.values(zoneContents).forEach((termIds) => {
      termIds.forEach((id) => placed.add(id));
    });
    return placed;
  }, [zoneContents]);

  // Handle drop
  const handleDrop = useCallback(
    (zoneId: string, data: MatchDragData) => {
      console.log('[Matching] Match made:', data.pairId, '->', zoneId);

      setZoneContents((prev) => {
        const newState = { ...prev };

        // Remove from any previous zone
        Object.keys(newState).forEach((key) => {
          newState[key] = newState[key].filter((id) => id !== data.pairId);
        });

        // Add to new zone (single capacity)
        newState[zoneId] = [data.pairId];

        console.log('[Matching] State:', newState);
        onStateChange(newState);

        return newState;
      });
    },
    [onStateChange]
  );

  // Create styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          flexDirection: 'row',
          padding: spacing[4],
        } as ViewStyle,
        column: {
          flex: 1,
          gap: spacing[3],
        } as ViewStyle,
        columnHeader: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing[2],
        } as TextStyle,
        termContainer: {
          marginBottom: spacing[2],
        } as ViewStyle,
        term: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          borderRadius: 8,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
        } as ViewStyle,
        termPlaced: {
          opacity: 0.3,
        } as ViewStyle,
        termText: {
          color: colors.white,
          fontSize: 14,
          fontWeight: '500',
          textAlign: 'center',
        } as TextStyle,
        definitionZone: {
          backgroundColor: colors.backgroundSecondary,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: 'dashed',
          borderRadius: 8,
          minHeight: 60,
          paddingHorizontal: spacing[2],
          paddingVertical: spacing[2],
          marginBottom: spacing[2],
        } as ViewStyle,
        definitionZoneActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + '20',
        } as ViewStyle,
        definitionZoneFilled: {
          borderColor: colors.success,
          backgroundColor: colors.success + '10',
          borderStyle: 'solid',
        } as ViewStyle,
        definitionLabel: {
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: spacing[1],
        } as TextStyle,
        definitionText: {
          fontSize: 14,
          color: colors.text,
          lineHeight: 20,
        } as TextStyle,
        placedTerm: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing[2],
          paddingVertical: spacing[1],
          borderRadius: 4,
          marginTop: spacing[1],
        } as ViewStyle,
        placedTermText: {
          color: colors.white,
          fontSize: 12,
          fontWeight: '500',
        } as TextStyle,
        divider: {
          width: 1,
          backgroundColor: colors.border,
          marginHorizontal: spacing[3],
        } as ViewStyle,
      }),
    [colors]
  );

  // Get unplaced terms (for left column)
  const unplacedTerms = pairs.filter((pair) => !placedTermIds.has(pair.id));

  // Shuffle terms for display (but keep stable across renders)
  const shuffledTerms = useMemo(() => {
    return [...pairs].sort(() => Math.random() - 0.5);
  }, [pairs]);

  return (
    <GestureHandlerRootView style={styles.container} testID={testID}>
      <DropProvider>
        {/* Left column: Draggable terms */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Terms</Text>
          {shuffledTerms.map((pair) => {
            const isPlaced = placedTermIds.has(pair.id);
            const dragData: MatchDragData = {
              id: `term-${pair.id}`,
              term: pair.term,
              pairId: pair.id,
            };

            return (
              <View key={pair.id} style={styles.termContainer}>
                <Draggable
                  data={dragData}
                  dragDisabled={isPlaced}
                  onDragStart={() => {
                    console.log('[Matching] Drag started:', pair.term);
                  }}
                >
                  <View style={[styles.term, isPlaced && styles.termPlaced]}>
                    <Text style={styles.termText}>{pair.term}</Text>
                  </View>
                </Draggable>
              </View>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right column: Droppable definitions */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Definitions</Text>
          {pairs.map((pair) => {
            const termIds = zoneContents[pair.id] || [];
            const isFilled = termIds.length > 0;
            const placedPair = isFilled
              ? pairs.find((p) => p.id === termIds[0])
              : null;

            return (
              <Droppable
                key={pair.id}
                droppableId={pair.id}
                onDrop={(data: MatchDragData) => handleDrop(pair.id, data)}
                dropDisabled={isFilled}
                dropAlignment="center"
              >
                <View
                  style={[
                    styles.definitionZone,
                    isFilled && styles.definitionZoneFilled,
                  ]}
                >
                  <Text style={styles.definitionLabel}>Drop here:</Text>
                  <Text style={styles.definitionText}>{pair.definition}</Text>
                  {placedPair && (
                    <View style={styles.placedTerm}>
                      <Text style={styles.placedTermText}>
                        {placedPair.term}
                      </Text>
                    </View>
                  )}
                </View>
              </Droppable>
            );
          })}
        </View>
      </DropProvider>
    </GestureHandlerRootView>
  );
}

export default MatchingInteraction;
