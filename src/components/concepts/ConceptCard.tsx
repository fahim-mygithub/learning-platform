/**
 * ConceptCard Component
 *
 * A card component that displays an extracted concept with:
 * - Concept name as header
 * - Definition text
 * - Cognitive type badge (color-coded)
 * - Difficulty indicator
 * - Key points as bullet list (collapsible if many)
 * - Timestamp links for video sources
 * - Three-pass pedagogical metadata (tier, bloom level, mentioned_only)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { Concept } from '../../types';
import type { ConceptTier, BloomLevel } from '../../types/three-pass';
import { colors, spacing } from '../../theme';
import { Card } from '../ui';
import { CognitiveTypeBadge } from './CognitiveTypeBadge';
import { DifficultyIndicator } from './DifficultyIndicator';
import { TierBadge } from './TierBadge';
import { BloomLevelBadge } from './BloomLevelBadge';
import { MentionedOnlyWarning } from './MentionedOnlyWarning';
import { MasteryStateBadge } from '../mastery/MasteryStateBadge';
import type { MasteryState } from '../../lib/spaced-repetition';

/**
 * Timestamp structure for source references
 */
interface Timestamp {
  start: number;
  end: number;
  label?: string;
}

/**
 * Props for the ConceptCard component
 */
export interface ConceptCardProps {
  /** The concept to display */
  concept: Concept;
  /** Optional mastery state for spaced repetition display */
  masteryState?: MasteryState;
  /** Next review date (for display) */
  nextReviewDate?: Date | null;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Callback when a timestamp link is pressed */
  onTimestampPress?: (timestamp: Timestamp) => void;
  /** Test ID for testing purposes */
  testID?: string;
  /** Custom styles for the card */
  style?: StyleProp<ViewStyle>;
}

/**
 * Maximum number of key points to show before collapsing
 */
const MAX_VISIBLE_KEY_POINTS = 3;

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract timestamps from source_timestamps array
 */
function extractTimestamps(
  sourceTimestamps: Record<string, unknown>[]
): Timestamp[] {
  return sourceTimestamps
    .filter(
      (ts): ts is Timestamp & Record<string, unknown> =>
        typeof ts.start === 'number' && typeof ts.end === 'number'
    )
    .map((ts) => ({
      start: ts.start as number,
      end: ts.end as number,
      label: ts.label as string | undefined,
    }));
}

/**
 * ConceptCard Component
 *
 * @example
 * ```tsx
 * <ConceptCard
 *   concept={concept}
 *   onPress={() => handleConceptPress(concept)}
 *   onTimestampPress={(timestamp) => seekToTime(timestamp.start)}
 * />
 * ```
 */
/**
 * Format next review date for display
 */
function formatNextReview(date: Date | null | undefined): string | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return `In ${Math.ceil(diffDays / 30)} months`;
}

export function ConceptCard({
  concept,
  masteryState,
  nextReviewDate,
  onPress,
  onTimestampPress,
  testID = 'concept-card',
  style,
}: ConceptCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const timestamps = extractTimestamps(concept.source_timestamps);
  const hasTimestamps =
    timestamps.length > 0 && concept.source_id !== null;
  const hasKeyPoints = concept.key_points.length > 0;
  const showCollapseToggle =
    concept.key_points.length > MAX_VISIBLE_KEY_POINTS;
  const visibleKeyPoints = isExpanded
    ? concept.key_points
    : concept.key_points.slice(0, MAX_VISIBLE_KEY_POINTS);
  const hiddenCount = concept.key_points.length - MAX_VISIBLE_KEY_POINTS;

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleTimestampPress = useCallback(
    (timestamp: Timestamp) => {
      onTimestampPress?.(timestamp);
    },
    [onTimestampPress]
  );

  // Check for three-pass pedagogical metadata
  const hasTier = concept.tier !== undefined;
  const hasBloomLevel = concept.bloom_level !== undefined;
  const isMentionedOnly = concept.mentioned_only === true;
  const isLegacy = concept.is_legacy === true;

  const accessibilityLabel = `${concept.name}, ${concept.cognitive_type} concept, difficulty ${concept.difficulty ?? 'unknown'} out of 10${isMentionedOnly ? ', mentioned only' : ''}`;

  const cardContent = (
    <>
      {/* Mentioned Only Warning (if applicable) */}
      {isMentionedOnly && (
        <View style={styles.mentionedOnlyContainer}>
          <MentionedOnlyWarning
            isMentionedOnly={true}
            showFullText
            testID={`${testID}-mentioned-only`}
          />
        </View>
      )}

      {/* Header with name and badges */}
      <View style={styles.header}>
        <Text style={[styles.name, isMentionedOnly && styles.nameMentionedOnly]} numberOfLines={2}>
          {concept.name}
        </Text>
        <View style={styles.badgesContainer}>
          {masteryState && (
            <MasteryStateBadge
              state={masteryState}
              compact
              testID={`${testID}-mastery`}
            />
          )}
          {hasTier && (
            <TierBadge
              tier={concept.tier as ConceptTier}
              testID={`${testID}-tier`}
            />
          )}
          <CognitiveTypeBadge
            type={concept.cognitive_type}
            testID={`${testID}-badge`}
          />
        </View>
      </View>

      {/* Definition */}
      <Text style={styles.definition}>{concept.definition}</Text>

      {/* Pedagogical metadata row */}
      {(hasBloomLevel || hasTier) && !isLegacy && (
        <View style={styles.pedagogicalRow}>
          {hasBloomLevel && (
            <BloomLevelBadge
              level={concept.bloom_level as BloomLevel}
              testID={`${testID}-bloom`}
            />
          )}
        </View>
      )}

      {/* Legacy badge */}
      {isLegacy && (
        <View style={styles.legacyBadge}>
          <Text style={styles.legacyText}>Legacy</Text>
        </View>
      )}

      {/* Difficulty indicator */}
      <View style={styles.difficultyContainer}>
        <DifficultyIndicator
          difficulty={concept.difficulty}
          testID={`${testID}-difficulty`}
        />
      </View>

      {/* Key points */}
      {hasKeyPoints && (
        <View
          style={styles.keyPointsContainer}
          testID={`${testID}-key-points`}
        >
          <Text style={styles.keyPointsLabel}>Key Points:</Text>
          {visibleKeyPoints.map((point, index) => (
            <View key={index} style={styles.keyPointRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.keyPointText}>{point}</Text>
            </View>
          ))}
          {showCollapseToggle && (
            <Pressable onPress={handleToggleExpand} style={styles.toggleButton}>
              <Text style={styles.toggleText}>
                {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Timestamps */}
      {hasTimestamps && (
        <View style={styles.timestampsContainer} testID={`${testID}-timestamps`}>
          <Text style={styles.timestampsLabel}>Video timestamps:</Text>
          <View style={styles.timestampLinks}>
            {timestamps.map((timestamp, index) => (
              <Pressable
                key={index}
                testID={`${testID}-timestamp-${index}`}
                onPress={() => handleTimestampPress(timestamp)}
                style={styles.timestampLink}
              >
                <Text style={styles.timestampText}>
                  {formatTime(timestamp.start)} - {formatTime(timestamp.end)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Next review date (for spaced repetition) */}
      {masteryState && masteryState !== 'unseen' && masteryState !== 'mastered' && (
        <View style={styles.nextReviewContainer} testID={`${testID}-next-review`}>
          <Text style={styles.nextReviewText}>
            Next review: {formatNextReview(nextReviewDate) || 'Not scheduled'}
          </Text>
        </View>
      )}
    </>
  );

  // If onPress is provided, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="Double tap to view concept details"
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
          style,
        ]}
      >
        <Card style={styles.card}>{cardContent}</Card>
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
      style={style}
    >
      <Card style={styles.card}>{cardContent}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    padding: spacing[4],
  },
  mentionedOnlyContainer: {
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  nameMentionedOnly: {
    color: colors.textSecondary,
  },
  pedagogicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  legacyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: spacing[2],
  },
  legacyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  definition: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  difficultyContainer: {
    marginBottom: spacing[3],
  },
  keyPointsContainer: {
    marginBottom: spacing[3],
  },
  keyPointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
    paddingLeft: spacing[1],
  },
  bullet: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing[1],
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  toggleButton: {
    marginTop: spacing[1],
    paddingVertical: spacing[1],
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  timestampsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[3],
  },
  timestampsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
    marginBottom: spacing[1],
  },
  timestampLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timestampLink: {
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  nextReviewContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[2],
    marginTop: spacing[2],
  },
  nextReviewText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});

export default ConceptCard;
