/**
 * TimeEstimate Component
 *
 * A small component that displays time estimates with an icon.
 * Formats minutes nicely (e.g., "30 min", "1h 15min").
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

/**
 * Format minutes into a readable string
 * - Less than 60 minutes: "30 min"
 * - 60+ minutes: "1h 30min" or "2h" for exact hours
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Props for the TimeEstimate component
 */
export interface TimeEstimateProps {
  /** Time in minutes */
  minutes: number;
  /** Optional prefix (e.g., "~" for approximate) */
  prefix?: string;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Test ID for testing */
  testID?: string;
}

/**
 * TimeEstimate Component
 *
 * @example
 * ```tsx
 * <TimeEstimate minutes={30} prefix="~" />
 * // Renders: clock icon + "~30 min"
 *
 * <TimeEstimate minutes={90} />
 * // Renders: clock icon + "1h 30min"
 * ```
 */
export function TimeEstimate({
  minutes,
  prefix = '',
  size = 'small',
  testID = 'time-estimate',
}: TimeEstimateProps): React.ReactElement {
  const formattedTime = formatMinutes(minutes);
  const displayText = prefix ? `${prefix}${formattedTime}` : formattedTime;
  const isSmall = size === 'small';

  return (
    <View
      testID={testID}
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Estimated time: ${formattedTime}`}
      accessibilityRole="text"
    >
      {/* Clock icon using Unicode character */}
      <Text style={[styles.icon, isSmall && styles.iconSmall]}>&#128339;</Text>
      <Text style={[styles.text, isSmall && styles.textSmall]}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  icon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  iconSmall: {
    fontSize: 12,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 12,
  },
});

export default TimeEstimate;
