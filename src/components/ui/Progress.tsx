/**
 * Progress Component
 *
 * A versatile progress indicator component with three variants:
 * - bar: Horizontal progress bar with fill percentage
 * - circle: Circular/ring progress indicator
 * - dots: Step indicator for wizards/multi-step flows
 *
 * Features:
 * - Full accessibility support with screen reader announcements
 * - Customizable colors via theme or props
 * - Optional percentage/step labels
 * - Minimum 44px touch targets for dots variant (WCAG 2.1 AAA)
 * - Pure React Native implementation (no SVG dependency)
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

/**
 * Progress variant types
 */
export type ProgressVariant = 'bar' | 'circle' | 'dots';

/**
 * Props for the Progress component
 */
export interface ProgressProps {
  /** Visual variant of the progress indicator */
  variant: ProgressVariant;
  /** Progress value from 0-100 (for bar/circle variants) */
  value?: number;
  /** Current step (for dots variant) */
  current?: number;
  /** Total steps (for dots variant) */
  total?: number;
  /** Size in pixels (for circle/dots variants) */
  size?: number;
  /** Show percentage or step label */
  showLabel?: boolean;
  /** Override fill/stroke color */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Default sizes for variants
 */
const DEFAULTS = {
  circleSize: 64,
  circleStrokeWidth: 8,
  barHeight: 8,
  dotSize: 12,
  dotTouchTarget: 44,
} as const;

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Progress Component
 *
 * @example
 * ```tsx
 * // Bar variant
 * <Progress variant="bar" value={75} showLabel />
 *
 * // Circle variant
 * <Progress variant="circle" value={50} size={80} />
 *
 * // Dots variant for wizard steps
 * <Progress variant="dots" current={2} total={5} />
 * ```
 */
export function Progress({
  variant,
  value = 0,
  current = 0,
  total = 1,
  size,
  showLabel = false,
  color = colors.primary,
  trackColor = colors.backgroundTertiary,
  testID,
  accessibilityLabel,
}: ProgressProps): React.ReactElement {
  // Clamp value to valid range
  const clampedValue = clamp(Math.round(value), 0, 100);

  // Calculate percentage for dots variant
  const dotsPercentage =
    variant === 'dots' ? Math.round((current / Math.max(total, 1)) * 100) : clampedValue;

  // Generate accessibility label
  const defaultLabel =
    variant === 'dots'
      ? `Step ${current} of ${total}`
      : `Progress: ${clampedValue}%`;

  const accessibilityProps = {
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: accessibilityLabel ?? defaultLabel,
    accessibilityValue: {
      min: 0,
      max: 100,
      now: variant === 'dots' ? dotsPercentage : clampedValue,
    },
  };

  switch (variant) {
    case 'bar':
      return (
        <ProgressBar
          value={clampedValue}
          showLabel={showLabel}
          color={color}
          trackColor={trackColor}
          testID={testID}
          {...accessibilityProps}
        />
      );
    case 'circle':
      return (
        <ProgressCircle
          value={clampedValue}
          size={size ?? DEFAULTS.circleSize}
          showLabel={showLabel}
          color={color}
          trackColor={trackColor}
          testID={testID}
          {...accessibilityProps}
        />
      );
    case 'dots':
      return (
        <ProgressDots
          current={current}
          total={total}
          size={size ?? DEFAULTS.dotSize}
          color={color}
          trackColor={trackColor}
          testID={testID}
          {...accessibilityProps}
        />
      );
    default:
      return (
        <ProgressBar
          value={clampedValue}
          showLabel={showLabel}
          color={color}
          trackColor={trackColor}
          testID={testID}
          {...accessibilityProps}
        />
      );
  }
}

/**
 * Shared accessibility props interface
 */
interface AccessibilityProps {
  accessibilityRole: 'progressbar';
  accessibilityLabel: string;
  accessibilityValue: {
    min: number;
    max: number;
    now: number;
  };
}

/**
 * ProgressBar internal component
 */
interface ProgressBarProps extends AccessibilityProps {
  value: number;
  showLabel: boolean;
  color: string;
  trackColor: string;
  testID?: string;
}

function ProgressBar({
  value,
  showLabel,
  color,
  trackColor,
  testID,
  ...accessibilityProps
}: ProgressBarProps): React.ReactElement {
  return (
    <View testID={testID} style={styles.barContainer} {...accessibilityProps}>
      <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: `${value}%`,
            } as ViewStyle,
          ]}
        />
      </View>
      {showLabel && <Text style={styles.barLabel}>{value}%</Text>}
    </View>
  );
}

/**
 * ProgressCircle internal component
 *
 * Uses a technique with two half-circles and rotation to create the
 * circular progress effect without SVG.
 */
interface ProgressCircleProps extends AccessibilityProps {
  value: number;
  size: number;
  showLabel: boolean;
  color: string;
  trackColor: string;
  testID?: string;
}

function ProgressCircle({
  value,
  size,
  showLabel,
  color,
  trackColor,
  testID,
  ...accessibilityProps
}: ProgressCircleProps): React.ReactElement {
  const strokeWidth = DEFAULTS.circleStrokeWidth;
  const halfSize = size / 2;

  // Calculate rotation for progress arcs
  // For values 0-50, only the right half rotates
  // For values 50-100, the left half also rotates
  const rightRotation = value <= 50 ? (value / 50) * 180 : 180;
  const leftRotation = value <= 50 ? 0 : ((value - 50) / 50) * 180;

  return (
    <View
      testID={testID}
      style={[styles.circleContainer, { width: size, height: size }]}
      {...accessibilityProps}
    >
      {/* Background track circle */}
      <View
        style={[
          styles.circleTrack,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Progress indicator using two half-circles */}
      {/* Right half (0-50%) */}
      <View style={[styles.circleHalfContainer, { width: halfSize, height: size, left: halfSize }]}>
        <View
          style={[
            styles.circleHalf,
            {
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              borderLeftColor: colors.transparent,
              borderBottomColor: colors.transparent,
              left: -halfSize,
              transform: [{ rotate: `${rightRotation - 45}deg` }],
            },
          ]}
        />
      </View>

      {/* Left half (50-100%) */}
      {value > 50 && (
        <View style={[styles.circleHalfContainer, styles.circleHalfLeft, { width: halfSize, height: size }]}>
          <View
            style={[
              styles.circleHalf,
              styles.circleHalfLeftInner,
              {
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRightColor: colors.transparent,
                borderTopColor: colors.transparent,
                transform: [{ rotate: `${leftRotation + 135}deg` }],
              },
            ]}
          />
        </View>
      )}

      {/* Center label */}
      {showLabel && (
        <View style={styles.circleLabelContainer}>
          <Text style={styles.circleLabel}>{value}%</Text>
        </View>
      )}
    </View>
  );
}

/**
 * ProgressDots internal component
 */
interface ProgressDotsProps extends AccessibilityProps {
  current: number;
  total: number;
  size: number;
  color: string;
  trackColor: string;
  testID?: string;
}

function ProgressDots({
  current,
  total,
  size,
  color,
  trackColor,
  testID,
  ...accessibilityProps
}: ProgressDotsProps): React.ReactElement {
  // Ensure minimum touch target
  const touchTargetSize = Math.max(size, DEFAULTS.dotTouchTarget);

  return (
    <View testID={testID} style={styles.dotsContainer} {...accessibilityProps}>
      {Array.from({ length: Math.max(total, 1) }, (_, index) => {
        const isCompleted = index < current;
        const isFuture = index >= current;

        return (
          <View
            key={index}
            testID={testID ? `${testID}-dot-${index}` : undefined}
            style={[
              styles.dotTouchTarget,
              {
                width: touchTargetSize,
                height: touchTargetSize,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
                isCompleted && {
                  backgroundColor: color,
                  borderColor: color,
                },
                isFuture && [
                  styles.dotFuture,
                  {
                    backgroundColor: colors.transparent,
                    borderColor: trackColor === colors.backgroundTertiary ? colors.border : trackColor,
                  },
                ],
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bar styles
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  barTrack: {
    flex: 1,
    height: DEFAULTS.barHeight,
    borderRadius: DEFAULTS.barHeight / 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: DEFAULTS.barHeight / 2,
  },
  barLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Circle styles
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTrack: {
    position: 'absolute',
  },
  circleHalfContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  circleHalfLeft: {
    left: 0,
  },
  circleHalf: {
    position: 'absolute',
  },
  circleHalfLeftInner: {
    left: 0,
  },
  circleLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Dots styles
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderWidth: 0,
  },
  dotFuture: {
    borderWidth: 2,
  },
});

export default Progress;
