/**
 * AnalysisStatusBar Component
 *
 * A progress bar component for displaying analysis pipeline progress.
 *
 * Features:
 * - Animated fill based on progress value (0-100%)
 * - Color changes by stage (blue for progress, green for complete, red for failed)
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <AnalysisStatusBar
 *   progress={50}
 *   stage="extracting_concepts"
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/src/theme';
import type { PipelineStage } from '@/src/lib';

/**
 * Props for the AnalysisStatusBar component
 */
export interface AnalysisStatusBarProps {
  /** Progress value from 0-100 */
  progress: number;
  /** Current pipeline stage for color determination */
  stage: PipelineStage;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get fill color based on pipeline stage
 */
function getFillColor(stage: PipelineStage): string {
  switch (stage) {
    case 'completed':
      return colors.success;
    case 'failed':
      return colors.error;
    default:
      return colors.info;
  }
}

/**
 * AnalysisStatusBar Component
 *
 * Displays a horizontal progress bar with stage-based colors.
 */
export function AnalysisStatusBar({
  progress,
  stage,
  testID,
}: AnalysisStatusBarProps): React.ReactElement {
  // Clamp progress to valid range
  const clampedProgress = clamp(Math.round(progress), 0, 100);

  // Get color based on stage
  const fillColor = getFillColor(stage);

  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Progress: ${clampedProgress}%`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedProgress,
      }}
    >
      <View testID={testID ? `${testID}-track` : undefined} style={styles.track}>
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: fillColor,
            } as ViewStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    height: 8,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default AnalysisStatusBar;
