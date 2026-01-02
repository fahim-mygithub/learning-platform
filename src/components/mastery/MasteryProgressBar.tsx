/**
 * MasteryProgressBar Component
 *
 * Shows aggregated mastery across concepts with:
 * - Color gradient based on state distribution
 * - Progress percentage
 * - State breakdown visualization
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MasteryState, STATE_METADATA, MASTERY_STATES } from '../../lib/spaced-repetition';
import { colors, spacing } from '../../theme';

/**
 * Distribution of concepts across mastery states
 */
export interface MasteryDistribution {
  unseen: number;
  exposed: number;
  fragile: number;
  developing: number;
  solid: number;
  mastered: number;
  misconceived: number;
}

/**
 * Props for the MasteryProgressBar component
 */
export interface MasteryProgressBarProps {
  /** Distribution of concepts across mastery states */
  distribution: MasteryDistribution;
  /** Total number of concepts */
  totalConcepts: number;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Whether to show percentage text */
  showPercentage?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Calculate overall progress percentage based on distribution
 * Weights each state by its progress percent
 */
export function calculateMasteryProgress(distribution: MasteryDistribution): number {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  let weightedSum = 0;
  for (const state of Object.keys(distribution) as MasteryState[]) {
    const count = distribution[state];
    const progressPercent = STATE_METADATA[state].progressPercent;
    weightedSum += count * progressPercent;
  }

  return Math.round(weightedSum / total);
}

/**
 * Get the lowest (worst) non-zero state in the distribution
 */
export function getLowestState(distribution: MasteryDistribution): MasteryState {
  // Check misconceived first (special case - always worst)
  if (distribution.misconceived > 0) return 'misconceived';

  // Check states in order from lowest to highest
  const orderedStates: MasteryState[] = ['unseen', 'exposed', 'fragile', 'developing', 'solid', 'mastered'];
  for (const state of orderedStates) {
    if (distribution[state] > 0) return state;
  }

  return 'unseen';
}

/**
 * MasteryProgressBar Component
 *
 * Displays aggregated mastery progress with colored segments.
 *
 * @example
 * ```tsx
 * <MasteryProgressBar
 *   distribution={{ unseen: 2, exposed: 3, fragile: 1, developing: 2, solid: 1, mastered: 1, misconceived: 0 }}
 *   totalConcepts={10}
 *   showLegend
 * />
 * ```
 */
export function MasteryProgressBar({
  distribution,
  totalConcepts,
  showLegend = false,
  showPercentage = true,
  testID = 'mastery-progress-bar',
}: MasteryProgressBarProps): React.ReactElement {
  const progress = calculateMasteryProgress(distribution);
  const lowestState = getLowestState(distribution);

  // Calculate segment widths as percentages
  const segments: { state: MasteryState; width: number; color: string }[] = [];
  const displayStates: MasteryState[] = ['unseen', 'exposed', 'fragile', 'developing', 'solid', 'mastered', 'misconceived'];

  for (const state of displayStates) {
    const count = distribution[state];
    if (count > 0 && totalConcepts > 0) {
      segments.push({
        state,
        width: (count / totalConcepts) * 100,
        color: STATE_METADATA[state].color,
      });
    }
  }

  const accessibilityLabel = `Mastery progress: ${progress}%, ${distribution.mastered} mastered, ${distribution.solid} solid, ${distribution.developing} developing, ${distribution.fragile} fragile, ${distribution.exposed} exposed, ${distribution.unseen} unseen${distribution.misconceived > 0 ? `, ${distribution.misconceived} misconceived` : ''}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: progress }}
    >
      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View style={styles.bar}>
          {segments.map((segment, index) => (
            <View
              key={segment.state}
              testID={`${testID}-segment-${segment.state}`}
              style={[
                styles.segment,
                {
                  width: `${segment.width}%`,
                  backgroundColor: segment.color,
                },
                index === 0 && styles.firstSegment,
                index === segments.length - 1 && styles.lastSegment,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Percentage and state indicator */}
      {showPercentage && (
        <View style={styles.infoRow}>
          <Text style={styles.percentageText}>{progress}% mastery</Text>
          <View style={styles.stateIndicator}>
            <View
              style={[styles.stateColor, { backgroundColor: STATE_METADATA[lowestState].color }]}
            />
            <Text style={styles.stateText}>{STATE_METADATA[lowestState].label}</Text>
          </View>
        </View>
      )}

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend} testID={`${testID}-legend`}>
          {displayStates.filter(s => distribution[s] > 0).map((state) => (
            <View key={state} style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: STATE_METADATA[state].color }]}
              />
              <Text style={styles.legendText}>
                {distribution[state]} {STATE_METADATA[state].label.toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    marginBottom: spacing[2],
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  firstSegment: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  lastSegment: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  stateColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default MasteryProgressBar;
