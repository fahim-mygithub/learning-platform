/**
 * RoadmapLevel Component
 *
 * A card component displaying a single level in a learning roadmap with:
 * - Level number badge
 * - Level title
 * - Concept count
 * - Time estimate
 * - Progress indicator if in progress
 * - Lock icon if not unlocked
 * - Checkmark if completed
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, spacing } from '../../theme';
import type { RoadmapLevel as RoadmapLevelType, Concept } from '../../types';
import { Card } from '../ui';
import { TimeEstimate, formatMinutes } from './TimeEstimate';

/**
 * Props for the RoadmapLevel component
 */
export interface RoadmapLevelProps {
  /** The level data */
  level: RoadmapLevelType;
  /** The level number (1-indexed) */
  levelNumber: number;
  /** Optional concept details for this level */
  concepts?: Concept[];
  /** Whether this level is unlocked */
  isUnlocked?: boolean;
  /** Whether this level is completed */
  isCompleted?: boolean;
  /** Callback when the level is pressed */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
}

/**
 * RoadmapLevel Component
 *
 * @example
 * ```tsx
 * <RoadmapLevel
 *   level={level}
 *   levelNumber={1}
 *   isUnlocked={true}
 *   isCompleted={false}
 *   onPress={() => handleLevelPress(level)}
 * />
 * ```
 */
export function RoadmapLevel({
  level,
  levelNumber,
  concepts,
  isUnlocked = true,
  isCompleted = false,
  onPress,
  testID = 'roadmap-level',
  style,
}: RoadmapLevelProps): React.ReactElement {
  const conceptCount = level.concept_ids.length;
  const isInProgress = isUnlocked && !isCompleted;

  // Build accessibility label
  const accessibilityParts = [
    `Level ${levelNumber}`,
    level.title,
    `${conceptCount} concept${conceptCount === 1 ? '' : 's'}`,
    `approximately ${formatMinutes(level.estimated_minutes)}`,
  ];

  if (isCompleted) {
    accessibilityParts.push('completed');
  } else if (!isUnlocked) {
    accessibilityParts.push('locked');
  } else if (isInProgress) {
    accessibilityParts.push('in progress');
  }

  const accessibilityLabel = accessibilityParts.join(', ');

  const handlePress = useCallback(() => {
    if (isUnlocked && onPress) {
      onPress();
    }
  }, [isUnlocked, onPress]);

  const cardContent = (
    <>
      {/* Header with level badge and status icons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Level number badge */}
          <View
            style={[
              styles.levelBadge,
              isCompleted && styles.levelBadgeCompleted,
              !isUnlocked && styles.levelBadgeLocked,
            ]}
          >
            <Text
              style={[
                styles.levelNumber,
                isCompleted && styles.levelNumberCompleted,
                !isUnlocked && styles.levelNumberLocked,
              ]}
            >
              {levelNumber}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={[styles.title, !isUnlocked && styles.titleLocked]}
            numberOfLines={2}
          >
            {level.title}
          </Text>
        </View>

        {/* Status icons */}
        <View style={styles.statusContainer}>
          {isCompleted && (
            <View testID={`${testID}-checkmark`} style={styles.checkmark}>
              <Text style={styles.checkmarkText}>&#10003;</Text>
            </View>
          )}
          {!isUnlocked && (
            <View testID={`${testID}-lock-icon`} style={styles.lockIcon}>
              <Text style={styles.lockIconText}>&#128274;</Text>
            </View>
          )}
          {isInProgress && (
            <View testID={`${testID}-progress`} style={styles.progressIndicator}>
              <Text style={styles.progressText}>&#8226;</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info row: concept count and time estimate */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoText, !isUnlocked && styles.infoTextLocked]}>
          {conceptCount} concept{conceptCount === 1 ? '' : 's'}
        </Text>
        <Text style={[styles.infoDot, !isUnlocked && styles.infoTextLocked]}>
          &#8226;
        </Text>
        <Text style={[styles.infoText, !isUnlocked && styles.infoTextLocked]}>
          ~{formatMinutes(level.estimated_minutes)}
        </Text>
      </View>
    </>
  );

  // Wrapper styles for locked state
  const wrapperStyle: ViewStyle[] = [{ opacity: !isUnlocked ? 0.6 : 1 }];
  if (style) {
    wrapperStyle.push(style as ViewStyle);
  }

  // If onPress is provided and unlocked, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={handlePress}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint={
          isUnlocked
            ? 'Double tap to view level details'
            : 'Level is locked. Complete previous levels to unlock.'
        }
        style={({ pressed }) => [
          ...wrapperStyle,
          pressed && isUnlocked && styles.pressed,
        ]}
        disabled={!isUnlocked}
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
      style={wrapperStyle}
    >
      <Card style={styles.card}>{cardContent}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  card: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeCompleted: {
    backgroundColor: colors.secondary,
  },
  levelBadgeLocked: {
    backgroundColor: colors.disabled,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  levelNumberCompleted: {
    color: colors.white,
  },
  levelNumberLocked: {
    color: colors.white,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleLocked: {
    color: colors.textTertiary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  lockIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconText: {
    fontSize: 16,
  },
  progressIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginTop: -2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingLeft: 32 + spacing[3], // Align with title (badge width + gap)
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoTextLocked: {
    color: colors.textTertiary,
  },
  infoDot: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});

export default RoadmapLevel;
