/**
 * SessionPreviewCard Component
 *
 * Shows upcoming session preview with:
 * - Due reviews count
 * - New concepts available (respecting capacity)
 * - Session type badge (standard/review_only/morning_check)
 * - Estimated duration
 * - "Start Session" button
 * - Warning message if near bedtime
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LearningSessionType } from '../../types/session';
import { colors, spacing } from '../../theme';

/**
 * Props for the SessionPreviewCard component
 */
export interface SessionPreviewCardProps {
  /** Number of due reviews in this session */
  reviewCount: number;
  /** Number of new concepts to learn */
  newConceptCount: number;
  /** Estimated session duration in minutes */
  estimatedMinutes: number;
  /** Type of learning session */
  sessionType: LearningSessionType;
  /** Optional warning message (e.g., near bedtime) */
  warningMessage?: string;
  /** Callback when user starts the session */
  onStartSession: () => void;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Get display label for session type
 */
function getSessionTypeLabel(type: LearningSessionType): string {
  switch (type) {
    case 'standard':
      return 'Standard';
    case 'review_only':
      return 'Review Only';
    case 'morning_check':
      return 'Morning Check';
    default:
      return 'Session';
  }
}

/**
 * Get badge color for session type
 */
function getSessionTypeBadgeColor(type: LearningSessionType): string {
  switch (type) {
    case 'standard':
      return colors.primary;
    case 'review_only':
      return colors.secondary;
    case 'morning_check':
      return colors.accent;
    default:
      return colors.primary;
  }
}

/**
 * SessionPreviewCard Component
 *
 * Displays a preview of an upcoming learning session with key metrics.
 *
 * @example
 * ```tsx
 * <SessionPreviewCard
 *   reviewCount={5}
 *   newConceptCount={2}
 *   estimatedMinutes={15}
 *   sessionType="standard"
 *   onStartSession={() => router.push('/session')}
 * />
 * ```
 */
export function SessionPreviewCard({
  reviewCount,
  newConceptCount,
  estimatedMinutes,
  sessionType,
  warningMessage,
  onStartSession,
  testID = 'session-preview-card',
}: SessionPreviewCardProps): React.ReactElement {
  const totalItems = reviewCount + newConceptCount;
  const hasContent = totalItems > 0;
  const typeLabel = getSessionTypeLabel(sessionType);
  const badgeColor = getSessionTypeBadgeColor(sessionType);

  const accessibilityLabel = `${typeLabel} session: ${reviewCount} reviews, ${newConceptCount} new concepts, estimated ${estimatedMinutes} minutes${warningMessage ? `. Warning: ${warningMessage}` : ''}`;

  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Next Session</Text>
        <View
          style={[styles.typeBadge, { backgroundColor: badgeColor }]}
          testID={`${testID}-type-badge`}
          accessibilityLabel={`Session type: ${typeLabel}`}
        >
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
      </View>

      <View
        style={styles.statsContainer}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue} testID={`${testID}-review-count`}>
            {reviewCount}
          </Text>
          <Text style={styles.statLabel}>
            {reviewCount === 1 ? 'Review' : 'Reviews'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue} testID={`${testID}-new-count`}>
            {newConceptCount}
          </Text>
          <Text style={styles.statLabel}>
            {newConceptCount === 1 ? 'New Concept' : 'New Concepts'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue} testID={`${testID}-duration`}>
            {estimatedMinutes}
          </Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
      </View>

      {warningMessage && (
        <View style={styles.warningContainer} testID={`${testID}-warning`}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningText}>{warningMessage}</Text>
        </View>
      )}

      <Button
        testID={`${testID}-start-button`}
        onPress={onStartSession}
        disabled={!hasContent}
        style={styles.button}
        accessibilityLabel="Start learning session"
        accessibilityHint={
          hasContent
            ? `Starts a session with ${reviewCount} reviews and ${newConceptCount} new concepts`
            : 'No items available for this session'
        }
      >
        Start Session
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20', // 20% opacity
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
    marginBottom: spacing[4],
  },
  warningIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warning,
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: spacing[2],
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  button: {
    marginTop: spacing[1],
  },
});

export default SessionPreviewCard;
