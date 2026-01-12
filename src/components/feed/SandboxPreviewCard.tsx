/**
 * SandboxPreviewCard Component
 *
 * Preview card for sandbox interactions in the learning feed.
 * Shown in TikTok-style feed to introduce an interactive learning activity.
 *
 * Features:
 * - Concept name header
 * - Interaction type badge
 * - "Start Interaction" button
 * - Estimated time indicator
 * - Scaffold level badge
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import type { SandboxItem } from '../../types/engagement';
import type { SandboxInteractionType, ScaffoldLevel } from '../../types/sandbox';
import { useTypography } from '../../lib/typography-context';
import { spacing } from '../../theme';

/**
 * Props for SandboxPreviewCard
 */
export interface SandboxPreviewCardProps {
  /** The sandbox feed item */
  item: SandboxItem;

  /** Called when user taps "Start Interaction" */
  onStart: () => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Get human-readable interaction type label
 */
function getInteractionTypeLabel(type: SandboxInteractionType): string {
  switch (type) {
    case 'matching':
      return 'Matching';
    case 'fill_in_blank':
      return 'Fill in Blank';
    case 'sequencing':
      return 'Sequencing';
    case 'diagram_build':
      return 'Build Diagram';
    case 'branching':
      return 'Decision Tree';
    default:
      return 'Interactive';
  }
}

/**
 * Get scaffold level label
 */
function getScaffoldLabel(level: ScaffoldLevel): string {
  switch (level) {
    case 'worked':
      return 'Guided';
    case 'scaffold':
      return 'Assisted';
    case 'faded':
      return 'Practice';
  }
}

/**
 * Format time in minutes/seconds
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remaining}s`;
}

/**
 * SandboxPreviewCard Component
 */
export function SandboxPreviewCard({
  item,
  onStart,
  testID = 'sandbox-preview-card',
}: SandboxPreviewCardProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  console.log('[SandboxPreview] Render:', item.status, item.interaction?.interactionId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[6],
        } as ViewStyle,
        card: {
          backgroundColor: colors.backgroundSecondary,
          borderRadius: 16,
          padding: spacing[6],
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
          // Shadow
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        } as ViewStyle,
        iconContainer: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing[4],
        } as ViewStyle,
        iconText: {
          fontSize: 28,
        } as TextStyle,
        conceptName: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing[2],
        } as TextStyle,
        description: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing[4],
          lineHeight: 20,
        } as TextStyle,
        badgesRow: {
          flexDirection: 'row',
          gap: spacing[2],
          marginBottom: spacing[5],
        } as ViewStyle,
        badge: {
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderRadius: 12,
          backgroundColor: colors.primary + '20',
        } as ViewStyle,
        scaffoldBadge: {
          backgroundColor: colors.success + '20',
        } as ViewStyle,
        timeBadge: {
          backgroundColor: colors.warning + '20',
        } as ViewStyle,
        badgeText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.primary,
        } as TextStyle,
        scaffoldBadgeText: {
          color: colors.success,
        } as TextStyle,
        timeBadgeText: {
          color: colors.warning,
        } as TextStyle,
        startButton: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          borderRadius: 12,
          width: '100%',
          alignItems: 'center',
        } as ViewStyle,
        startButtonText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.white,
        } as TextStyle,
        instructions: {
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing[3],
        } as TextStyle,
        loadingContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
        } as ViewStyle,
        loadingText: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: spacing[3],
          textAlign: 'center',
        } as TextStyle,
        errorContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
        } as ViewStyle,
        errorText: {
          fontSize: 14,
          color: colors.error,
          textAlign: 'center',
          marginBottom: spacing[3],
        } as TextStyle,
        disabledButton: {
          backgroundColor: colors.textSecondary,
          opacity: 0.5,
        } as ViewStyle,
      }),
    [colors]
  );

  // Check status for loading/error states
  const isLoading = item.status === 'pending' || item.status === 'generating';
  const isError = item.status === 'error';
  const isReady = item.status === 'ready' && item.interaction !== null;

  // Get interaction type label and icon (only available when ready)
  const typeLabel = item.interaction
    ? getInteractionTypeLabel(item.interaction.interactionType)
    : 'Interactive';
  const scaffoldLabel = getScaffoldLabel(item.scaffoldLevel);
  const timeLabel = formatTime(item.estimatedTimeSeconds);

  // Get icon based on interaction type
  const getIcon = (): string => {
    if (!item.interaction) {
      return '🎮';
    }
    switch (item.interaction.interactionType) {
      case 'matching':
        return '🔗';
      case 'fill_in_blank':
        return '✏️';
      case 'sequencing':
        return '📋';
      case 'diagram_build':
        return '🔧';
      case 'branching':
        return '🌳';
      default:
        return '🎮';
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={styles.iconText}>{getIcon()}</Text>
          )}
        </View>

        {/* Concept name */}
        <Text style={styles.conceptName}>{item.conceptName}</Text>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {item.status === 'pending'
                ? 'Preparing interaction...'
                : 'Generating interaction...'}
            </Text>
          </View>
        )}

        {/* Error state */}
        {isError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {item.errorMessage || 'Failed to generate interaction'}
            </Text>
          </View>
        )}

        {/* Ready state - show full content */}
        {isReady && (
          <>
            {/* Description */}
            <Text style={styles.description}>
              Test your understanding with an interactive {typeLabel.toLowerCase()} activity.
            </Text>

            {/* Badges */}
            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{typeLabel}</Text>
              </View>
              <View style={[styles.badge, styles.scaffoldBadge]}>
                <Text style={[styles.badgeText, styles.scaffoldBadgeText]}>
                  {scaffoldLabel}
                </Text>
              </View>
              <View style={[styles.badge, styles.timeBadge]}>
                <Text style={[styles.badgeText, styles.timeBadgeText]}>
                  {timeLabel}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Start button - only enabled when ready */}
        <Pressable
          style={[
            styles.startButton,
            !isReady && styles.disabledButton,
          ]}
          onPress={() => {
            if (isReady && item.interaction) {
              console.log('[SandboxPreview] Start pressed:', item.interaction.interactionId);
              onStart();
            }
          }}
          disabled={!isReady}
          accessibilityLabel={
            isReady
              ? `Start ${typeLabel} interaction for ${item.conceptName}`
              : isLoading
                ? 'Loading interaction'
                : 'Interaction unavailable'
          }
          accessibilityRole="button"
          testID="sandbox-start-button"
        >
          <Text style={styles.startButtonText}>
            {isLoading ? 'Loading...' : isError ? 'Unavailable' : 'Start Interaction'}
          </Text>
        </Pressable>

        {/* Instructions hint - only when ready */}
        {isReady && (
          <Text style={styles.instructions}>
            Tap to begin the interactive activity
          </Text>
        )}
      </View>
    </View>
  );
}

export default SandboxPreviewCard;
