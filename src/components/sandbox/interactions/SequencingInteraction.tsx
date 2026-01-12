/**
 * SequencingInteraction Component
 *
 * A step sequencing interaction where users drag steps into the correct order.
 *
 * Cognitive Type: Procedural (Apply)
 * Pattern: Vertical list of steps, drag to reorder
 *
 * Features:
 * - Initially shuffled steps
 * - Real-time step number updates
 * - Smooth reorder animations
 * - Levenshtein-based evaluation
 * - Console logging for debugging
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle, PanResponder } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import type { ScaffoldLevel } from '../../../types/sandbox';
import { useTypography } from '../../../lib/typography-context';
import { spacing } from '../../../theme';

/**
 * Step definition
 */
export interface StepDefinition {
  id: string;
  text: string;
  correctPosition: number; // 0-indexed position in correct sequence
}

/**
 * Props for SequencingInteraction
 */
export interface SequencingInteractionProps {
  /** Steps to sequence */
  steps: StepDefinition[];

  /** Scaffold level for fading scaffolding */
  scaffoldLevel: ScaffoldLevel;

  /** Pre-positioned steps for scaffold mode (stepIds in order) */
  prePositioned?: string[];

  /** Called when state changes */
  onStateChange: (sequence: string[]) => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Drag data for steps
 */
interface StepDragData {
  id: string;
  stepId: string;
  text: string;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * SequencingInteraction Component
 */
export function SequencingInteraction({
  steps,
  scaffoldLevel,
  prePositioned,
  onStateChange,
  testID = 'sequencing-interaction',
}: SequencingInteractionProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  // Current sequence order (step IDs)
  const [sequence, setSequence] = useState<string[]>(() => {
    // For worked/scaffold mode, use pre-positioned or correct order
    if (scaffoldLevel === 'worked') {
      return [...steps].sort((a, b) => a.correctPosition - b.correctPosition).map((s) => s.id);
    }

    if (scaffoldLevel === 'scaffold' && prePositioned) {
      // Some steps pre-positioned correctly
      const correctOrder = [...steps].sort((a, b) => a.correctPosition - b.correctPosition);
      const preSet = new Set(prePositioned);
      const remaining = steps.filter((s) => !preSet.has(s.id));
      const shuffledRemaining = shuffleArray(remaining);

      // Build sequence with pre-positioned in place
      const result: string[] = [];
      let remainingIndex = 0;

      correctOrder.forEach((step) => {
        if (preSet.has(step.id)) {
          result.push(step.id);
        } else if (shuffledRemaining[remainingIndex]) {
          result.push(shuffledRemaining[remainingIndex].id);
          remainingIndex++;
        }
      });

      return result;
    }

    // Fully shuffled for faded mode
    console.log('[Sequencing] Initial order:', shuffleArray(steps.map((s) => s.id)));
    return shuffleArray(steps.map((s) => s.id));
  });

  // Get step by ID
  const getStep = useCallback(
    (stepId: string) => steps.find((s) => s.id === stepId),
    [steps]
  );

  // Handle drop at a position
  const handleDrop = useCallback(
    (targetIndex: number, data: StepDragData) => {
      const sourceIndex = sequence.indexOf(data.stepId);
      if (sourceIndex === targetIndex || sourceIndex === -1) return;

      console.log('[Sequencing] Reorder:', { from: sourceIndex, to: targetIndex });

      setSequence((prev) => {
        const newSequence = [...prev];

        // Remove from source position
        newSequence.splice(sourceIndex, 1);

        // Insert at target position
        const insertIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
        newSequence.splice(insertIndex, 0, data.stepId);

        console.log('[Sequencing] Submit:', newSequence);
        onStateChange(newSequence);

        return newSequence;
      });
    },
    [sequence, onStateChange]
  );

  // Create styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: spacing[4],
        } as ViewStyle,
        header: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: spacing[3],
          textAlign: 'center',
        } as TextStyle,
        stepsContainer: {
          flex: 1,
        } as ViewStyle,
        dropZone: {
          height: 8,
          marginVertical: spacing[1],
          borderRadius: 4,
          backgroundColor: 'transparent',
        } as ViewStyle,
        dropZoneActive: {
          backgroundColor: colors.primary + '40',
        } as ViewStyle,
        stepItem: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.backgroundSecondary,
          borderRadius: 8,
          padding: spacing[3],
          marginBottom: spacing[2],
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 56,
        } as ViewStyle,
        stepItemLocked: {
          borderColor: colors.success,
          backgroundColor: colors.success + '10',
        } as ViewStyle,
        stepNumber: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing[3],
        } as ViewStyle,
        stepNumberText: {
          color: colors.white,
          fontSize: 14,
          fontWeight: '600',
        } as TextStyle,
        stepText: {
          flex: 1,
          fontSize: 14,
          color: colors.text,
          lineHeight: 20,
        } as TextStyle,
        dragHandle: {
          width: 24,
          height: 24,
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: spacing[2],
        } as ViewStyle,
        dragHandleBar: {
          width: 16,
          height: 2,
          backgroundColor: colors.textSecondary,
          borderRadius: 1,
          marginVertical: 1,
        } as ViewStyle,
        workedLabel: {
          fontSize: 12,
          color: colors.success,
          fontWeight: '500',
          textAlign: 'center',
          marginTop: spacing[4],
        } as TextStyle,
      }),
    [colors]
  );

  // Check if step is pre-positioned (locked)
  const isLocked = useCallback(
    (stepId: string) => {
      if (scaffoldLevel !== 'scaffold' || !prePositioned) return false;
      return prePositioned.includes(stepId);
    },
    [scaffoldLevel, prePositioned]
  );

  return (
    <GestureHandlerRootView style={styles.container} testID={testID}>
      <DropProvider>
        <Text style={styles.header}>
          {scaffoldLevel === 'worked'
            ? 'Observe the correct order:'
            : 'Drag steps into the correct order:'}
        </Text>

        <View style={styles.stepsContainer}>
          {sequence.map((stepId, index) => {
            const step = getStep(stepId);
            if (!step) return null;

            const locked = isLocked(stepId);
            const dragData: StepDragData = {
              id: `step-${stepId}`,
              stepId: step.id,
              text: step.text,
            };

            return (
              <View key={stepId}>
                {/* Drop zone above step */}
                <Droppable
                  droppableId={`zone-${index}`}
                  onDrop={(data: StepDragData) => handleDrop(index, data)}
                  dropDisabled={scaffoldLevel === 'worked'}
                  dropAlignment="center"
                >
                  <View style={styles.dropZone} />
                </Droppable>

                {/* Step item */}
                <Draggable
                  data={dragData}
                  dragDisabled={locked || scaffoldLevel === 'worked'}
                  onDragStart={() => {
                    console.log('[Sequencing] Drag started:', step.text);
                  }}
                >
                  <View style={[styles.stepItem, locked && styles.stepItemLocked]}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step.text}</Text>
                    {!locked && scaffoldLevel !== 'worked' && (
                      <View style={styles.dragHandle}>
                        <View style={styles.dragHandleBar} />
                        <View style={styles.dragHandleBar} />
                        <View style={styles.dragHandleBar} />
                      </View>
                    )}
                  </View>
                </Draggable>
              </View>
            );
          })}

          {/* Final drop zone */}
          <Droppable
            droppableId={`zone-${sequence.length}`}
            onDrop={(data: StepDragData) => handleDrop(sequence.length, data)}
            dropDisabled={scaffoldLevel === 'worked'}
            dropAlignment="center"
          >
            <View style={styles.dropZone} />
          </Droppable>
        </View>

        {scaffoldLevel === 'worked' && (
          <Text style={styles.workedLabel}>
            This is the correct sequence. Memorize it!
          </Text>
        )}
      </DropProvider>
    </GestureHandlerRootView>
  );
}

export default SequencingInteraction;
