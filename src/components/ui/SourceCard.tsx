/**
 * SourceCard Component
 *
 * A card component for displaying source information including:
 * - Source name and type icon
 * - Status indicator (pending, uploading, processing, completed, failed)
 * - Progress bar for uploading status
 * - Delete button with callback
 * - Error display for failed status
 * - Touch feedback on press
 *
 * Follows accessibility guidelines from the Base Component Library spec.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

import { Card } from './Card';
import { Progress } from './Progress';
import { colors } from '../../theme';
import type { Source, SourceType, SourceStatus } from '../../types/database';

/**
 * Props for the SourceCard component
 */
export interface SourceCardProps {
  /** The source data to display */
  source: Source;
  /** Callback when the card is pressed */
  onPress?: () => void;
  /** Callback when the delete button is pressed */
  onDelete?: () => void;
  /** Upload progress percentage (0-100) when status is 'uploading' */
  uploadProgress?: number;
  /** Optional custom styles to apply to the card container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Type icon mapping
 */
const TYPE_ICONS: Record<SourceType, string> = {
  video: '\uD83C\uDFAC', // Film clapper emoji
  pdf: '\uD83D\uDCC4', // Page facing up emoji
  url: '\uD83D\uDD17', // Link emoji
};

/**
 * Status display labels
 */
const STATUS_LABELS: Record<SourceStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * SourceCard Component
 *
 * Displays a source with its name, type icon, status indicator, and actions.
 *
 * @example
 * ```tsx
 * <SourceCard
 *   source={mySource}
 *   onPress={() => console.log('Card pressed')}
 *   onDelete={() => console.log('Delete pressed')}
 *   uploadProgress={50}
 * />
 * ```
 */
export function SourceCard({
  source,
  onPress,
  onDelete,
  uploadProgress = 0,
  style,
  testID = 'source-card',
}: SourceCardProps): React.ReactElement {
  const typeIcon = TYPE_ICONS[source.type];
  const statusLabel = STATUS_LABELS[source.status];

  const handlePress = () => {
    onPress?.();
  };

  const handleDelete = () => {
    onDelete?.();
  };

  const accessibilityLabel = `${source.name}, ${source.type}, ${statusLabel}`;

  return (
    <Card testID={testID} style={[styles.card, style]}>
      <Pressable
        testID={`${testID}-pressable`}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressableContent,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.mainContent}>
          {/* Type Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.typeIcon}>{typeIcon}</Text>
          </View>

          {/* Source Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.sourceName} numberOfLines={1}>
              {source.name}
            </Text>

            {/* Status Display */}
            <StatusDisplay
              status={source.status}
              uploadProgress={uploadProgress}
              testID={testID}
            />
          </View>

          {/* Delete Button */}
          <Pressable
            testID={`${testID}-delete-button`}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${source.name}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {/* Error Message */}
        {source.status === 'failed' && source.error_message && (
          <View testID={`${testID}-error-message`} style={styles.errorContainer}>
            <Text style={styles.errorText}>{source.error_message}</Text>
          </View>
        )}
      </Pressable>
    </Card>
  );
}

/**
 * Props for StatusDisplay internal component
 */
interface StatusDisplayProps {
  status: SourceStatus;
  uploadProgress: number;
  testID: string;
}

/**
 * Internal component for displaying status indicator
 */
function StatusDisplay({
  status,
  uploadProgress,
  testID,
}: StatusDisplayProps): React.ReactElement {
  switch (status) {
    case 'pending':
      return (
        <View style={styles.statusRow}>
          <View
            testID={`${testID}-status-indicator`}
            style={[styles.statusDot, styles.statusPending]}
          />
          <Text style={styles.statusText}>Pending</Text>
        </View>
      );

    case 'uploading':
      return (
        <View style={styles.uploadingContainer}>
          <View testID={`${testID}-progress`} style={styles.progressBarContainer}>
            <Progress
              variant="bar"
              value={uploadProgress}
              color={colors.primary}
            />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      );

    case 'processing':
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator
            testID={`${testID}-spinner`}
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
          <Text style={styles.statusText}>Processing</Text>
        </View>
      );

    case 'completed':
      return (
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusCompleted]}>
            <Text style={styles.checkmark}>{'\u2713'}</Text>
          </View>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      );

    case 'failed':
      return (
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusFailed]}>
            <Text style={styles.failedX}>{'\u2717'}</Text>
          </View>
          <Text style={styles.statusText}>Failed</Text>
        </View>
      );

    default:
      return (
        <View style={styles.statusRow}>
          <View
            testID={`${testID}-status-indicator`}
            style={[styles.statusDot, styles.statusPending]}
          />
          <Text style={styles.statusText}>Unknown</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  pressableContent: {
    padding: 16,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.backgroundSecondary,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 20,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statusPending: {
    backgroundColor: colors.disabled,
  },
  statusCompleted: {
    backgroundColor: colors.success,
  },
  statusFailed: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  failedX: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginRight: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  spinner: {
    marginRight: 6,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    backgroundColor: colors.error,
  },
  deleteIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: `${colors.error}15`,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
});

export default SourceCard;
