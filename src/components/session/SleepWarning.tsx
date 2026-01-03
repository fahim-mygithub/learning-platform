/**
 * SleepWarning Component
 *
 * Shows sleep-aware warning when applicable:
 * - Icon (moon/clock)
 * - Message from SessionRecommendation.reason
 * - Time until bedtime (if available)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionRecommendation } from '../../types/session';
import { colors, spacing } from '../../theme';

/**
 * Props for the SleepWarning component
 */
export interface SleepWarningProps {
  /** Session recommendation with sleep-aware information */
  recommendation: SessionRecommendation;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Get icon based on recommendation type
 */
function getIcon(type: SessionRecommendation['type']): string {
  switch (type) {
    case 'skip':
      return '\u{1F319}'; // Crescent moon
    case 'review_only':
      return '\u{23F0}'; // Alarm clock
    case 'standard':
    default:
      return '\u{2705}'; // Check mark
  }
}

/**
 * Get background color based on recommendation type
 */
function getBackgroundColor(type: SessionRecommendation['type']): string {
  switch (type) {
    case 'skip':
      return colors.error + '15'; // 15% opacity red
    case 'review_only':
      return colors.warning + '20'; // 20% opacity yellow
    case 'standard':
    default:
      return colors.success + '15'; // 15% opacity green
  }
}

/**
 * Get text color based on recommendation type
 */
function getTextColor(type: SessionRecommendation['type']): string {
  switch (type) {
    case 'skip':
      return colors.error;
    case 'review_only':
      return colors.text;
    case 'standard':
    default:
      return colors.success;
  }
}

/**
 * SleepWarning Component
 *
 * Displays a sleep-aware recommendation message.
 *
 * @example
 * ```tsx
 * <SleepWarning
 *   recommendation={{
 *     type: 'review_only',
 *     reason: 'It is close to bedtime. Light review recommended.',
 *     suggestedDuration: 10,
 *     newConceptsAllowed: 0,
 *   }}
 * />
 * ```
 */
export function SleepWarning({
  recommendation,
  testID = 'sleep-warning',
}: SleepWarningProps): React.ReactElement {
  const { type, reason, suggestedDuration, newConceptsAllowed } = recommendation;
  const icon = getIcon(type);
  const backgroundColor = getBackgroundColor(type);
  const textColor = getTextColor(type);

  // Don't show component for standard sessions with no restrictions
  if (type === 'standard' && newConceptsAllowed > 0) {
    return (
      <View
        testID={testID}
        style={[styles.container, { backgroundColor }]}
        accessible={true}
        accessibilityLabel={`Session recommendation: ${reason}`}
      >
        <Text style={styles.icon} testID={`${testID}-icon`}>
          {icon}
        </Text>
        <View style={styles.content}>
          <Text
            style={[styles.message, { color: textColor }]}
            testID={`${testID}-message`}
          >
            {reason}
          </Text>
          {suggestedDuration > 0 && (
            <Text style={styles.details} testID={`${testID}-duration`}>
              Suggested duration: {suggestedDuration} minutes
            </Text>
          )}
        </View>
      </View>
    );
  }

  // For skip or review_only recommendations, show warning style
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor }]}
      accessible={true}
      accessibilityLabel={`Sleep warning: ${reason}. ${type === 'skip' ? 'Session not recommended.' : `Review only recommended. ${newConceptsAllowed} new concepts allowed.`}`}
    >
      <Text style={styles.icon} testID={`${testID}-icon`}>
        {icon}
      </Text>
      <View style={styles.content}>
        <Text
          style={[styles.message, { color: textColor }]}
          testID={`${testID}-message`}
        >
          {reason}
        </Text>
        <View style={styles.detailsRow}>
          {suggestedDuration > 0 && (
            <Text style={styles.details} testID={`${testID}-duration`}>
              {suggestedDuration} min suggested
            </Text>
          )}
          {type !== 'skip' && (
            <Text style={styles.details} testID={`${testID}-new-allowed`}>
              {newConceptsAllowed} new {newConceptsAllowed === 1 ? 'concept' : 'concepts'} allowed
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 8,
    marginVertical: spacing[2],
  },
  icon: {
    fontSize: 20,
    marginRight: spacing[3],
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  details: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
});

export default SleepWarning;
