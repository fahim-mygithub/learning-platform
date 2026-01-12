/**
 * Animation constants for LearnFlow
 *
 * Centralized animation timings, spring configs, and scale values
 * to ensure consistent motion throughout the application.
 */

/**
 * Timing durations in milliseconds
 */
export const timing = {
  /** Button press feedback */
  buttonPress: 100,
  /** Input focus transition */
  inputFocus: 200,
  /** Button loading morph animation */
  buttonMorph: 400,
  /** Logo entrance animation */
  logoEntrance: 600,
  /** XP count-up animation */
  xpCountUp: 1000,
  /** Mastery ring fill animation */
  masteryRingFill: 1500,
  /** Empty ring pulse cycle */
  emptyRingPulse: 2000,
  /** Glow breathing effect */
  glowBreathing: 4000,
} as const;

/**
 * Spring configurations for react-native-reanimated
 * Using physics-based animations for natural feel
 */
export const spring = {
  /** Tab bar sliding pill - "magnetic" feel */
  tabBarPill: {
    damping: 18,
    stiffness: 140,
    mass: 1,
  },
  /** Button press scale animation */
  buttonPress: {
    damping: 15,
    stiffness: 150,
  },
  /** Card entrance animation */
  cardEntrance: {
    damping: 12,
    stiffness: 100,
  },
  /** Card press scale animation */
  cardPress: {
    damping: 15,
    stiffness: 150,
  },
} as const;

/**
 * Scale transform values
 */
export const scale = {
  /** Button pressed state */
  buttonPressed: 0.96,
  /** Card pressed state */
  cardPressed: 0.98,
} as const;

/**
 * Stagger delays for list animations
 */
export const stagger = {
  /** Form element stagger */
  formElements: 100,
  /** Grid item stagger */
  gridItems: 50,
  /** List item stagger */
  listItems: 80,
} as const;

/**
 * Entrance animation durations
 */
export const entrance = {
  /** Primary element (logo, hero) */
  primary: 600,
  /** Secondary elements (form fields) */
  secondary: 400,
  /** Tertiary elements (buttons, links) */
  tertiary: 300,
} as const;

/**
 * Opacity values for animations
 */
export const opacity = {
  /** Empty ring pulse minimum */
  pulseMin: 0.3,
  /** Empty ring pulse maximum */
  pulseMax: 0.6,
} as const;

/**
 * Combined animations export
 */
export const animations = {
  timing,
  spring,
  scale,
  stagger,
  entrance,
  opacity,
} as const;

export type AnimationConfig = typeof animations;
