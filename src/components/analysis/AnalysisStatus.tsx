/**
 * AnalysisStatus Component
 *
 * Displays the current status of the content analysis pipeline.
 *
 * Features:
 * - Stage indicator showing current step name
 * - Progress bar (0-100%)
 * - Stage-specific descriptions
 * - Error state with retry button
 * - Completed state with checkmark
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <AnalysisStatus
 *   stage="transcribing"
 *   progress={25}
 *   testID="analysis-status"
 * />
 *
 * // With error and retry
 * <AnalysisStatus
 *   stage="failed"
 *   progress={25}
 *   error="Network error"
 *   onRetry={() => console.log('Retrying...')}
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { colors, spacing } from '@/src/theme';
import type { PipelineStage } from '@/src/lib';
import { AnalysisStatusBar } from './AnalysisStatusBar';

/**
 * Props for the AnalysisStatus component
 */
export interface AnalysisStatusProps {
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Progress value from 0-100 */
  progress: number;
  /** Error message (when stage is 'failed') */
  error?: string;
  /** Callback when retry button is pressed */
  onRetry?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Stage descriptions for display (three-pass architecture with new stages)
 */
const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  pending: 'Preparing analysis...',
  transcribing: 'Transcribing audio...',
  routing_content: 'Classifying content type...',           // Pass 1
  extracting_concepts: 'Extracting concepts...',            // Pass 2
  generating_misconceptions: 'Generating misconceptions...', // After Pass 2
  building_graph: 'Building knowledge graph...',
  architecting_roadmap: 'Architecting learning roadmap...', // Pass 3
  generating_summary: 'Generating module summary...',       // After Pass 3
  validating: 'Validating analysis results...',
  completed: 'Analysis complete!',
  failed: 'Analysis failed',
};

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * AnalysisStatus Component
 *
 * Shows the current analysis pipeline status with progress bar and stage description.
 */
export function AnalysisStatus({
  stage,
  progress,
  error,
  onRetry,
  testID,
}: AnalysisStatusProps): React.ReactElement {
  const description = STAGE_DESCRIPTIONS[stage];
  const isCompleted = stage === 'completed';
  const isFailed = stage === 'failed';

  // Generate accessibility label
  const accessibilityLabel = isFailed && error
    ? `Analysis failed: ${error}. ${progress}% complete.`
    : `${description} ${progress}% complete.`;

  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Stage Icon and Description */}
      <View style={styles.header}>
        {isCompleted && (
          <View
            testID={testID ? `${testID}-checkmark` : undefined}
            style={styles.checkmarkContainer}
          >
            <Text style={styles.checkmark}>&#10003;</Text>
          </View>
        )}
        {isFailed && (
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
        )}
        <Text
          style={[
            styles.description,
            isCompleted && styles.descriptionCompleted,
            isFailed && styles.descriptionFailed,
          ]}
        >
          {description}
        </Text>
      </View>

      {/* Progress Bar */}
      <AnalysisStatusBar
        testID={testID ? `${testID}-progress-bar` : undefined}
        progress={progress}
        stage={stage}
      />

      {/* Error Message */}
      {isFailed && error && (
        <Text style={styles.errorMessage}>{error}</Text>
      )}

      {/* Retry Button */}
      {isFailed && onRetry && (
        <Pressable
          testID={testID ? `${testID}-retry-button` : undefined}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry analysis"
          accessibilityHint="Double tap to retry the failed analysis"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  errorIcon: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  descriptionCompleted: {
    color: colors.success,
  },
  descriptionFailed: {
    color: colors.error,
  },
  errorMessage: {
    marginTop: spacing[3],
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing[3],
    minHeight: MIN_TOUCH_TARGET_SIZE,
    minWidth: MIN_TOUCH_TARGET_SIZE,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AnalysisStatus;
