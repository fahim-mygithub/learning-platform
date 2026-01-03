/**
 * ConfettiAnimation Component
 *
 * Celebration effect triggered on level ups, synthesis completions, and achievements.
 * Uses react-native-reanimated for smooth particle animations.
 *
 * @example
 * ```tsx
 * <ConfettiAnimation
 *   visible={showCelebration}
 *   onComplete={() => setShowCelebration(false)}
 *   particleCount={50}
 * />
 * ```
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/src/theme';

/**
 * Props for the ConfettiAnimation component
 */
export interface ConfettiAnimationProps {
  /** Whether the animation is visible */
  visible: boolean;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Number of confetti particles */
  particleCount?: number;
  /** Duration of the animation (ms) */
  duration?: number;
  /** Custom colors for confetti */
  confettiColors?: string[];
  /** Origin point for explosion (relative to container) */
  origin?: { x: number; y: number };
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Screen dimensions
 */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Default confetti colors
 */
const DEFAULT_COLORS = [
  colors.xpGold,
  colors.primary,
  colors.secondary,
  colors.streakOrange,
  '#FF69B4', // Hot pink
  '#9B59B6', // Purple
  '#00CED1', // Dark turquoise
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  particleCount: 50,
  duration: 2000,
  origin: { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 3 },
};

/**
 * Particle data structure
 */
interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'rectangle';
  delay: number;
}

/**
 * Generate random particles
 */
function generateParticles(
  count: number,
  origin: { x: number; y: number },
  confettiColors: string[]
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    // Random velocity (explosion outward)
    const angle = Math.random() * Math.PI * 2;
    const speed = 300 + Math.random() * 400;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed - 400; // Initial upward boost

    particles.push({
      id: i,
      x: origin.x,
      y: origin.y,
      velocityX,
      velocityY,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720, // -360 to 360 degrees per second
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 6 + Math.random() * 8,
      shape: ['square', 'circle', 'rectangle'][Math.floor(Math.random() * 3)] as Particle['shape'],
      delay: Math.random() * 200, // Stagger start times
    });
  }

  return particles;
}

/**
 * ConfettiAnimation Component
 *
 * Displays an animated confetti explosion effect.
 */
export function ConfettiAnimation({
  visible,
  onComplete,
  particleCount = DEFAULT_CONFIG.particleCount,
  duration = DEFAULT_CONFIG.duration,
  confettiColors = DEFAULT_COLORS,
  origin = DEFAULT_CONFIG.origin,
  testID = 'confetti-animation',
}: ConfettiAnimationProps): React.ReactElement | null {
  const [particles, setParticles] = useState<Particle[]>([]);

  /**
   * Handle animation completion
   */
  const handleComplete = useCallback(() => {
    setParticles([]);
    onComplete?.();
  }, [onComplete]);

  /**
   * Initialize particles when visible
   */
  useEffect(() => {
    if (visible) {
      const newParticles = generateParticles(particleCount, origin, confettiColors);
      setParticles(newParticles);

      // Auto-dismiss after duration
      const timeout = setTimeout(() => {
        handleComplete();
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      setParticles([]);
    }
  }, [visible, particleCount, origin, confettiColors, duration, handleComplete]);

  if (!visible || particles.length === 0) return null;

  return (
    <View
      testID={testID}
      style={styles.container}
      pointerEvents="none"
    >
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          particle={particle}
          duration={duration}
          testID={`${testID}-particle-${particle.id}`}
        />
      ))}
    </View>
  );
}

/**
 * Props for ConfettiParticle
 */
interface ConfettiParticleProps {
  particle: Particle;
  duration: number;
  testID?: string;
}

/**
 * Individual confetti particle with animation
 */
function ConfettiParticle({
  particle,
  duration,
  testID,
}: ConfettiParticleProps): React.ReactElement {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(particle.rotation);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Initial pop-in
    scale.value = withDelay(
      particle.delay,
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // Horizontal movement (deceleration)
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.velocityX * (duration / 1000), {
        duration: duration - particle.delay,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Vertical movement (gravity effect)
    translateY.value = withDelay(
      particle.delay,
      withTiming(particle.velocityY * (duration / 1000) + 500, {
        duration: duration - particle.delay,
        easing: Easing.in(Easing.quad),
      })
    );

    // Rotation
    rotation.value = withDelay(
      particle.delay,
      withTiming(particle.rotation + particle.rotationSpeed * (duration / 1000), {
        duration: duration - particle.delay,
        easing: Easing.linear,
      })
    );

    // Fade out near the end
    opacity.value = withDelay(
      particle.delay + duration * 0.6,
      withTiming(0, {
        duration: duration * 0.4,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [particle, duration, translateX, translateY, rotation, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  /**
   * Get particle shape style
   */
  const getShapeStyle = (): ViewStyle => {
    switch (particle.shape) {
      case 'circle':
        return {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
        };
      case 'rectangle':
        return {
          width: particle.size,
          height: particle.size * 0.5,
          borderRadius: 2,
        };
      default: // square
        return {
          width: particle.size,
          height: particle.size,
          borderRadius: 2,
        };
    }
  };

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.particle,
        {
          left: particle.x - particle.size / 2,
          top: particle.y - particle.size / 2,
          backgroundColor: particle.color,
        },
        getShapeStyle(),
        animatedStyle,
      ]}
    />
  );
}

/**
 * Burst confetti effect (single explosion)
 */
export interface ConfettiBurstProps {
  visible: boolean;
  position: { x: number; y: number };
  onComplete?: () => void;
  count?: number;
  testID?: string;
}

export function ConfettiBurst({
  visible,
  position,
  onComplete,
  count = 20,
  testID = 'confetti-burst',
}: ConfettiBurstProps): React.ReactElement | null {
  return (
    <ConfettiAnimation
      visible={visible}
      origin={position}
      particleCount={count}
      duration={1500}
      onComplete={onComplete}
      testID={testID}
    />
  );
}

/**
 * Continuous confetti rain effect
 */
export interface ConfettiRainProps {
  visible: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
  testID?: string;
}

export function ConfettiRain({
  visible,
  intensity = 'medium',
  testID = 'confetti-rain',
}: ConfettiRainProps): React.ReactElement | null {
  const [particles, setParticles] = useState<Particle[]>([]);

  const intensityConfig = {
    light: { count: 10, interval: 300 },
    medium: { count: 20, interval: 200 },
    heavy: { count: 30, interval: 100 },
  };

  const config = intensityConfig[intensity];

  useEffect(() => {
    if (!visible) {
      setParticles([]);
      return;
    }

    // Generate initial batch
    const initialParticles = generateRainParticles(config.count);
    setParticles(initialParticles);

    // Continue generating particles
    const interval = setInterval(() => {
      setParticles((prev) => {
        // Remove old particles and add new ones
        const filtered = prev.filter((p) => Date.now() - p.id < 3000);
        const newParticles = generateRainParticles(5);
        return [...filtered, ...newParticles];
      });
    }, config.interval);

    return () => clearInterval(interval);
  }, [visible, config.count, config.interval]);

  if (!visible) return null;

  return (
    <View testID={testID} style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <RainParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

/**
 * Generate rain particles (falling from top)
 */
function generateRainParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    particles.push({
      id: now + i,
      x: Math.random() * SCREEN_WIDTH,
      y: -20,
      velocityX: (Math.random() - 0.5) * 100,
      velocityY: 200 + Math.random() * 200,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 360,
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      size: 8 + Math.random() * 6,
      shape: ['square', 'rectangle'][Math.floor(Math.random() * 2)] as Particle['shape'],
      delay: 0,
    });
  }

  return particles;
}

/**
 * Rain particle with falling animation
 */
function RainParticle({ particle }: { particle: Particle }): React.ReactElement {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(particle.rotation);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(SCREEN_HEIGHT + 50, {
      duration: 3000,
      easing: Easing.linear,
    });
    translateX.value = withTiming(particle.velocityX, {
      duration: 3000,
      easing: Easing.out(Easing.quad),
    });
    rotation.value = withTiming(particle.rotation + particle.rotationSpeed * 3, {
      duration: 3000,
      easing: Easing.linear,
    });
    opacity.value = withDelay(2000, withTiming(0, { duration: 1000 }));
  }, [particle, translateY, translateX, rotation, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.shape === 'rectangle' ? particle.size * 0.5 : particle.size,
          borderRadius: 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  } as ViewStyle,
  particle: {
    position: 'absolute',
  } as ViewStyle,
});

export default ConfettiAnimation;
