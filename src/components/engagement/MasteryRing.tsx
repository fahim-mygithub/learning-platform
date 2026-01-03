/**
 * MasteryRing Component
 *
 * Circular progress indicator showing mastery percentage using react-native-svg.
 * Animates smoothly when progress changes.
 *
 * @example
 * ```tsx
 * <MasteryRing
 *   progress={75}
 *   size={120}
 *   strokeWidth={10}
 *   label="Mastery"
 * />
 * ```
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';

/**
 * Create animated Circle component
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Props for the MasteryRing component
 */
export interface MasteryRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring (diameter) */
  size?: number;
  /** Width of the stroke */
  strokeWidth?: number;
  /** Label text to show below percentage */
  label?: string;
  /** Color of the progress arc */
  progressColor?: string;
  /** Color of the background arc */
  backgroundColor?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Whether to show the percentage text */
  showPercentage?: boolean;
  /** Custom content to render in the center */
  centerContent?: React.ReactNode;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  size: 100,
  strokeWidth: 8,
  animationDuration: 500,
};

/**
 * Get mastery color based on percentage
 */
function getMasteryColor(progress: number): string {
  if (progress >= 90) return colors.mastery.mastered;
  if (progress >= 70) return colors.mastery.solid;
  if (progress >= 50) return colors.mastery.developing;
  if (progress >= 30) return colors.mastery.fragile;
  if (progress > 0) return colors.mastery.exposed;
  return colors.mastery.unseen;
}

/**
 * MasteryRing Component
 *
 * Circular progress indicator with smooth animations.
 */
export function MasteryRing({
  progress,
  size = DEFAULT_CONFIG.size,
  strokeWidth = DEFAULT_CONFIG.strokeWidth,
  label,
  progressColor,
  backgroundColor = colors.borderLight,
  animationDuration = DEFAULT_CONFIG.animationDuration,
  showPercentage = true,
  centerContent,
  testID = 'mastery-ring',
}: MasteryRingProps): React.ReactElement {
  /**
   * Calculate ring dimensions
   */
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  /**
   * Animated progress value
   */
  const animatedProgress = useSharedValue(0);

  /**
   * Determine progress color
   */
  const finalProgressColor = progressColor || getMasteryColor(progress);

  /**
   * Animate progress on change
   */
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animationDuration, animatedProgress]);

  /**
   * Animated props for the progress circle
   */
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  /**
   * Calculate display percentage
   */
  const displayProgress = Math.round(progress);

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            testID={`${testID}-background`}
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <AnimatedCircle
            testID={`${testID}-progress`}
            cx={center}
            cy={center}
            r={radius}
            stroke={finalProgressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}, ${circumference}`}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {centerContent || (
          <>
            {showPercentage && (
              <Text
                style={[styles.percentage, { color: finalProgressColor }]}
                testID={`${testID}-percentage`}
              >
                {displayProgress}%
              </Text>
            )}
            {label && (
              <Text style={styles.label} testID={`${testID}-label`}>
                {label}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Multi-ring mastery display showing multiple metrics
 */
export interface MultiRingProps {
  rings: Array<{
    progress: number;
    label: string;
    color?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  testID?: string;
}

export function MultiRing({
  rings,
  size = 120,
  strokeWidth = 6,
  testID = 'multi-ring',
}: MultiRingProps): React.ReactElement {
  const ringCount = rings.length;
  const gap = 4;
  const totalStrokeSpace = ringCount * strokeWidth + (ringCount - 1) * gap;

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {rings.map((ring, index) => {
            const ringRadius = (size - strokeWidth) / 2 - index * (strokeWidth + gap);
            const circumference = 2 * Math.PI * ringRadius;
            const strokeDashoffset = circumference - (ring.progress / 100) * circumference;
            const ringColor = ring.color || getMasteryColor(ring.progress);

            return (
              <G key={ring.label}>
                {/* Background */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  stroke={colors.borderLight}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  stroke={ringColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference}, ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                />
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {rings.map((ring) => (
          <View key={ring.label} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: ring.color || getMasteryColor(ring.progress) },
              ]}
            />
            <Text style={styles.legendText}>{ring.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Mastery arc for showing partial progress
 */
export interface MasteryArcProps {
  progress: number;
  startAngle?: number;
  endAngle?: number;
  size?: number;
  strokeWidth?: number;
  showEndCaps?: boolean;
  testID?: string;
}

export function MasteryArc({
  progress,
  startAngle = -135,
  endAngle = 135,
  size = 100,
  strokeWidth = 8,
  showEndCaps = true,
  testID = 'mastery-arc',
}: MasteryArcProps): React.ReactElement {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate arc length
  const totalAngle = endAngle - startAngle;
  const progressAngle = (progress / 100) * totalAngle;

  // Convert to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + progressAngle) * Math.PI) / 180;
  const fullEndRad = (endAngle * Math.PI) / 180;

  // Calculate arc points
  const x1 = center + radius * Math.cos(startRad);
  const y1 = center + radius * Math.sin(startRad);
  const x2 = center + radius * Math.cos(endRad);
  const y2 = center + radius * Math.sin(endRad);
  const x3 = center + radius * Math.cos(fullEndRad);
  const y3 = center + radius * Math.sin(fullEndRad);

  // Determine if arc is large
  const largeArcFlag = progressAngle > 180 ? 1 : 0;
  const fullLargeArcFlag = totalAngle > 180 ? 1 : 0;

  // Create path
  const backgroundPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${fullLargeArcFlag} 1 ${x3} ${y3}`;
  const progressPath = progress > 0 ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}` : '';

  const progressColor = getMasteryColor(progress);

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${(totalAngle / 360) * 2 * Math.PI * radius}, ${2 * Math.PI * radius}`}
          transform={`rotate(${startAngle} ${center} ${center})`}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {progress > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${(progressAngle / 360) * 2 * Math.PI * radius}, ${2 * Math.PI * radius}`}
            transform={`rotate(${startAngle} ${center} ${center})`}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.percentage, { color: progressColor, fontSize: size * 0.25 }]}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  percentage: {
    fontSize: 24,
    fontWeight: '700',
  } as TextStyle,
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  } as TextStyle,
  legend: {
    position: 'absolute',
    bottom: -30,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
  } as ViewStyle,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[1],
  } as ViewStyle,
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
  } as TextStyle,
});

export default MasteryRing;
