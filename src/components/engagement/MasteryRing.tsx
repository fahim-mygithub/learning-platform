/**
 * MasteryRing Component
 *
 * Premium circular progress indicator with luminous glow effects.
 * Designed for the "Luminous Focus" aesthetic - deep blacks with
 * animated gradient glows that intensify with progress.
 *
 * Features:
 * - SVG-based circular ring with smooth animated fill
 * - Progress-based color tiers (unseen -> mastered)
 * - Outer glow effect that pulses subtly
 * - Theme-aware colors via useTypography
 * - Achievement badge feel for gamification
 *
 * @example
 * ```tsx
 * <MasteryRing
 *   progress={75}
 *   size={120}
 *   showLabel={true}
 * />
 * ```
 */

import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTypography } from '@/src/lib/typography-context';

/**
 * Create animated Circle component for progress arc
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Props for the MasteryRing component
 */
export interface MasteryRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring (diameter) - defaults to 64 */
  size?: number;
  /** Whether to show the percentage label in center */
  showLabel?: boolean;
  /** Width of the stroke - auto-calculated if not provided */
  strokeWidth?: number;
  /** Custom label to show below percentage */
  label?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Whether to show the pulsing glow effect */
  showGlow?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Color tier configuration based on mastery level
 * Each tier has a main color and glow color
 */
interface ColorTier {
  color: string;
  glowColor: string;
  glowOpacity: number;
}

/**
 * Get mastery color tier based on progress percentage
 * - 0-24%: zinc-600 (unseen) - muted, minimal glow
 * - 25-49%: blue-500 (developing) - cool, emerging
 * - 50-74%: amber-400 (solid) - warm, confident
 * - 75-100%: green-500 (mastered) - vibrant, achieved
 */
function getMasteryTier(progress: number, isDarkMode: boolean): ColorTier {
  if (progress >= 75) {
    return {
      color: '#22c55e', // green-500
      glowColor: 'rgba(34, 197, 94, 0.6)',
      glowOpacity: isDarkMode ? 0.8 : 0.5,
    };
  }
  if (progress >= 50) {
    return {
      color: '#fbbf24', // amber-400
      glowColor: 'rgba(251, 191, 36, 0.5)',
      glowOpacity: isDarkMode ? 0.7 : 0.4,
    };
  }
  if (progress >= 25) {
    return {
      color: '#3b82f6', // blue-500
      glowColor: 'rgba(59, 130, 246, 0.4)',
      glowOpacity: isDarkMode ? 0.6 : 0.35,
    };
  }
  return {
    color: '#52525b', // zinc-600
    glowColor: 'rgba(82, 82, 91, 0.2)',
    glowOpacity: isDarkMode ? 0.3 : 0.15,
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  size: 64,
  animationDuration: 800,
  strokeWidthRatio: 0.1, // stroke width as percentage of size
  glowSizeRatio: 1.3, // glow container size relative to ring
};

/**
 * Animation configuration
 */
const ANIMATION_CONFIG = {
  /** Glow pulse animation */
  glowPulse: {
    minScale: 0.95,
    maxScale: 1.05,
    duration: 2000,
  },
  /** Progress fill timing */
  progressTiming: {
    duration: 800,
    easing: Easing.out(Easing.cubic),
  },
  /** Empty ring pulse - draws attention to unfilled rings */
  emptyPulse: {
    minOpacity: 0.3,
    maxOpacity: 0.6,
    duration: 2000,
  },
};

/**
 * MasteryRing Component
 *
 * Premium circular progress indicator with luminous glow effect.
 * Designed to feel like an achievement badge in a gamified learning context.
 */
export function MasteryRing({
  progress,
  size = DEFAULT_CONFIG.size,
  showLabel = true,
  strokeWidth,
  label,
  animationDuration = DEFAULT_CONFIG.animationDuration,
  showGlow = true,
  testID = 'mastery-ring',
}: MasteryRingProps): React.ReactElement {
  const { getColors, isDarkMode, getScaledFontSize } = useTypography();
  const colors = getColors();

  /**
   * Calculate ring dimensions
   */
  const calculatedStrokeWidth = strokeWidth ?? Math.max(4, size * DEFAULT_CONFIG.strokeWidthRatio);
  const radius = (size - calculatedStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  /**
   * Get color tier based on progress
   */
  const colorTier = useMemo(
    () => getMasteryTier(progress, isDarkMode),
    [progress, isDarkMode]
  );

  /**
   * Animated values
   */
  const animatedProgress = useSharedValue(0);
  const glowPulse = useSharedValue(1);
  const emptyPulse = useSharedValue(ANIMATION_CONFIG.emptyPulse.minOpacity);

  /**
   * Animate progress on change
   */
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: animationDuration,
      easing: ANIMATION_CONFIG.progressTiming.easing,
    });
  }, [progress, animationDuration, animatedProgress]);

  /**
   * Continuous subtle glow pulse for visual interest
   */
  useEffect(() => {
    if (showGlow && progress > 0) {
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(ANIMATION_CONFIG.glowPulse.maxScale, {
            duration: ANIMATION_CONFIG.glowPulse.duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(ANIMATION_CONFIG.glowPulse.minScale, {
            duration: ANIMATION_CONFIG.glowPulse.duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        true // Reverse on each iteration
      );
    } else {
      glowPulse.value = withTiming(1);
    }
  }, [showGlow, progress, glowPulse]);

  /**
   * Empty ring pulse animation - draws attention to unfilled rings
   * Pulses opacity from 0.3 to 0.6 when progress is 0
   */
  useEffect(() => {
    if (progress === 0) {
      emptyPulse.value = withRepeat(
        withSequence(
          withTiming(ANIMATION_CONFIG.emptyPulse.maxOpacity, {
            duration: ANIMATION_CONFIG.emptyPulse.duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(ANIMATION_CONFIG.emptyPulse.minOpacity, {
            duration: ANIMATION_CONFIG.emptyPulse.duration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        false // Don't reverse, use explicit min/max
      );
    } else {
      // Reset to static opacity when there's progress
      emptyPulse.value = withTiming(0.6);
    }
  }, [progress, emptyPulse]);

  /**
   * Animated props for the progress circle
   */
  const animatedProgressProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference - (animatedProgress.value / 100) * circumference;
    return {
      strokeDashoffset,
    };
  });

  /**
   * Animated props for the track circle (empty state pulse)
   */
  const animatedTrackProps = useAnimatedProps(() => {
    return {
      opacity: progress === 0 ? emptyPulse.value : 0.6,
    };
  });

  /**
   * Animated glow container style
   */
  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedProgress.value,
      [0, 25, 50, 75, 100],
      [0.1, 0.3, 0.5, 0.7, 0.9]
    );
    return {
      transform: [{ scale: glowPulse.value }],
      opacity: opacity * colorTier.glowOpacity,
    };
  });

  /**
   * Animated glow style for empty state (progress === 0)
   * Subtle pulsing glow to invite interaction
   */
  const animatedEmptyGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 1 }],
      opacity: emptyPulse.value * 0.5, // More subtle than filled state
    };
  });

  /**
   * Calculate display percentage
   */
  const displayProgress = Math.round(progress);

  /**
   * Font size for percentage - scales with ring size
   */
  const percentageFontSize = getScaledFontSize(size * 0.22);
  const labelFontSize = getScaledFontSize(size * 0.12);

  /**
   * Background track color
   */
  const trackColor = isDarkMode
    ? 'rgba(63, 63, 70, 0.6)' // zinc-700 with opacity
    : 'rgba(228, 228, 231, 0.8)'; // zinc-200 with opacity

  /**
   * Glow size
   */
  const glowSize = size * DEFAULT_CONFIG.glowSizeRatio;

  return (
    <View
      testID={testID}
      style={[styles.container, { width: glowSize, height: glowSize }]}
    >
      {/* Outer glow effect - shows for progress > 0, or pulses subtly for empty rings */}
      {showGlow && (
        <Animated.View
          testID={`${testID}-glow`}
          style={[
            styles.glowContainer,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: progress === 0
                ? 'rgba(113, 113, 122, 0.15)' // zinc-500 subtle glow for empty state
                : colorTier.glowColor,
            },
            progress === 0 ? animatedEmptyGlowStyle : animatedGlowStyle,
          ]}
        />
      )}

      {/* SVG Ring */}
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            {/* Radial gradient for premium glow on stroke */}
            <RadialGradient
              id="progressGlow"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <Stop offset="0%" stopColor={colorTier.color} stopOpacity="1" />
              <Stop offset="100%" stopColor={colorTier.color} stopOpacity="0.7" />
            </RadialGradient>
          </Defs>

          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background track - pulses when empty to draw attention */}
            <AnimatedCircle
              testID={`${testID}-track`}
              cx={center}
              cy={center}
              r={radius}
              stroke={trackColor}
              strokeWidth={calculatedStrokeWidth}
              fill="none"
              animatedProps={animatedTrackProps}
            />

            {/* Progress arc */}
            <AnimatedCircle
              testID={`${testID}-progress`}
              cx={center}
              cy={center}
              r={radius}
              stroke={colorTier.color}
              strokeWidth={calculatedStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}, ${circumference}`}
              animatedProps={animatedProgressProps}
            />

            {/* Inner glow arc (subtle) */}
            {progress > 0 && (
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                stroke={colorTier.color}
                strokeWidth={calculatedStrokeWidth * 0.3}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference}, ${circumference}`}
                animatedProps={animatedProgressProps}
                opacity={0.3}
              />
            )}
          </G>
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          {showLabel && (
            <>
              <Text
                style={[
                  styles.percentage,
                  {
                    color: colorTier.color,
                    fontSize: percentageFontSize,
                    textShadowColor: colorTier.glowColor,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: isDarkMode ? 8 : 4,
                  },
                ]}
                testID={`${testID}-percentage`}
              >
                {displayProgress}%
              </Text>
              {label && (
                <Text
                  style={[
                    styles.label,
                    {
                      color: colors.textSecondary,
                      fontSize: labelFontSize,
                    },
                  ]}
                  testID={`${testID}-label`}
                >
                  {label}
                </Text>
              )}
            </>
          )}
        </View>
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
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();

  const trackColor = isDarkMode
    ? 'rgba(63, 63, 70, 0.6)'
    : 'rgba(228, 228, 231, 0.8)';

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {rings.map((ring, index) => {
            const gap = 4;
            const ringRadius = (size - strokeWidth) / 2 - index * (strokeWidth + gap);
            const circumference = 2 * Math.PI * ringRadius;
            const strokeDashoffset = circumference - (ring.progress / 100) * circumference;
            const ringColor = ring.color || getMasteryTier(ring.progress, isDarkMode).color;

            return (
              <G key={ring.label}>
                {/* Background */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  stroke={trackColor}
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
        {rings.map((ring) => {
          const ringColor = ring.color || getMasteryTier(ring.progress, isDarkMode).color;
          return (
            <View key={ring.label} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: ringColor },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {ring.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Mastery arc for showing partial progress (gauge style)
 */
export interface MasteryArcProps {
  progress: number;
  startAngle?: number;
  endAngle?: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  testID?: string;
}

export function MasteryArc({
  progress,
  startAngle = -135,
  endAngle = 135,
  size = 100,
  strokeWidth = 8,
  showLabel = true,
  testID = 'mastery-arc',
}: MasteryArcProps): React.ReactElement {
  const { getColors, isDarkMode, getScaledFontSize } = useTypography();
  const colors = getColors();

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate arc length
  const totalAngle = endAngle - startAngle;
  const progressAngle = (progress / 100) * totalAngle;

  const colorTier = getMasteryTier(progress, isDarkMode);

  const trackColor = isDarkMode
    ? 'rgba(63, 63, 70, 0.6)'
    : 'rgba(228, 228, 231, 0.8)';

  const percentageFontSize = getScaledFontSize(size * 0.25);

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
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
            stroke={colorTier.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${(progressAngle / 360) * 2 * Math.PI * radius}, ${2 * Math.PI * radius}`}
            transform={`rotate(${startAngle} ${center} ${center})`}
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Center content */}
      {showLabel && (
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.percentage,
              {
                color: colorTier.color,
                fontSize: percentageFontSize,
                textShadowColor: colorTier.glowColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: isDarkMode ? 8 : 4,
              },
            ]}
          >
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Compact mastery indicator for lists and cards
 */
export interface CompactMasteryProps {
  progress: number;
  size?: number;
  testID?: string;
}

export function CompactMastery({
  progress,
  size = 32,
  testID = 'compact-mastery',
}: CompactMasteryProps): React.ReactElement {
  const { isDarkMode, getScaledFontSize } = useTypography();

  const colorTier = getMasteryTier(progress, isDarkMode);
  const strokeWidth = Math.max(2, size * 0.12);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  const trackColor = isDarkMode
    ? 'rgba(63, 63, 70, 0.6)'
    : 'rgba(228, 228, 231, 0.8)';

  const fontSize = getScaledFontSize(size * 0.3);

  return (
    <View testID={testID} style={[styles.compactContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colorTier.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}, ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
      <View style={styles.centerContent}>
        <Text
          style={[
            styles.compactText,
            { color: colorTier.color, fontSize },
          ]}
        >
          {Math.round(progress)}
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
  glowContainer: {
    position: 'absolute',
  } as ViewStyle,
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  percentage: {
    fontWeight: '800',
    letterSpacing: -0.5,
  } as TextStyle,
  label: {
    marginTop: 2,
    fontWeight: '500',
  } as TextStyle,
  legend: {
    position: 'absolute',
    bottom: -30,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  } as ViewStyle,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  } as ViewStyle,
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  } as TextStyle,
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  compactText: {
    fontWeight: '700',
  } as TextStyle,
});

export default MasteryRing;
