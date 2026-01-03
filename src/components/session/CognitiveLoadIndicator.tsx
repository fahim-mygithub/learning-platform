/**
 * CognitiveLoadIndicator Component
 *
 * Visualizes cognitive capacity with:
 * - Progress bar showing % used
 * - Color changes: green (<75%), yellow (75-89%), red (>=90%)
 * - Text showing "X of Y concepts"
 * - Warning icon when at capacity
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CognitiveCapacity } from '../../types/session';
import { colors, spacing } from '../../theme';

/**
 * Props for the CognitiveLoadIndicator component
 */
export interface CognitiveLoadIndicatorProps {
  /** Cognitive capacity calculation result */
  capacity: CognitiveCapacity;
  /** Number of concepts currently used */
  conceptsUsed: number;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Get color based on percentage used
 * - Green (<75%): Safe to learn more
 * - Yellow (75-89%): Approaching capacity
 * - Red (>=90%): At or near capacity
 */
function getCapacityColor(percentageUsed: number): string {
  if (percentageUsed >= 90) {
    return colors.error;
  }
  if (percentageUsed >= 75) {
    return colors.warning;
  }
  return colors.success;
}

/**
 * Get status text based on warning level
 */
function getStatusText(capacity: CognitiveCapacity): string {
  switch (capacity.warningLevel) {
    case 'blocked':
      return 'At capacity';
    case 'caution':
      return 'Near capacity';
    case 'none':
    default:
      return 'Ready to learn';
  }
}

/**
 * CognitiveLoadIndicator Component
 *
 * Displays the current cognitive load status with a visual progress bar.
 *
 * @example
 * ```tsx
 * <CognitiveLoadIndicator
 *   capacity={{
 *     baseCapacity: 4,
 *     circadianModifier: 1.0,
 *     sleepModifier: 1.0,
 *     fatigueModifier: 0,
 *     effectiveCapacity: 4,
 *     percentageUsed: 50,
 *     canLearnNew: true,
 *     warningLevel: 'none',
 *   }}
 *   conceptsUsed={2}
 * />
 * ```
 */
export function CognitiveLoadIndicator({
  capacity,
  conceptsUsed,
  testID = 'cognitive-load-indicator',
}: CognitiveLoadIndicatorProps): React.ReactElement {
  const { percentageUsed, effectiveCapacity, warningLevel, canLearnNew } = capacity;
  const progressColor = getCapacityColor(percentageUsed);
  const statusText = getStatusText(capacity);
  const clampedPercentage = Math.min(100, Math.max(0, percentageUsed));
  const showWarningIcon = warningLevel !== 'none';

  const accessibilityLabel = `Cognitive load: ${conceptsUsed} of ${Math.round(effectiveCapacity)} concepts used, ${Math.round(percentageUsed)}% capacity. ${statusText}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedPercentage,
      }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cognitive Load</Text>
        <View style={styles.statusContainer}>
          {showWarningIcon && (
            <View
              style={[styles.warningIcon, { backgroundColor: progressColor }]}
              testID={`${testID}-warning-icon`}
            >
              <Text style={styles.warningIconText}>!</Text>
            </View>
          )}
          <Text
            style={[styles.statusText, { color: progressColor }]}
            testID={`${testID}-status`}
          >
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View
            testID={`${testID}-bar-fill`}
            style={[
              styles.barFill,
              {
                width: `${clampedPercentage}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.conceptsText} testID={`${testID}-concepts`}>
          {conceptsUsed} of {Math.round(effectiveCapacity)} concepts
        </Text>
        <Text style={styles.percentageText} testID={`${testID}-percentage`}>
          {Math.round(percentageUsed)}%
        </Text>
      </View>

      {!canLearnNew && (
        <View style={styles.blockedMessage} testID={`${testID}-blocked`}>
          <Text style={styles.blockedText}>
            Focus on reviews - new learning not recommended
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  warningIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIconText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barContainer: {
    marginBottom: spacing[2],
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conceptsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  blockedMessage: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.error + '15', // 15% opacity
    borderRadius: 6,
  },
  blockedText: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
});

export default CognitiveLoadIndicator;
