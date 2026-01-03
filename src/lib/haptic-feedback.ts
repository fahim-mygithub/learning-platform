/**
 * Haptic Feedback Utility
 *
 * Wrapper for expo-haptics providing semantic haptic feedback methods.
 * Haptics enhance the learning experience by providing tactile feedback
 * for important actions like correct answers, level ups, and achievements.
 *
 * Features:
 * - Semantic method names (success, error, light, medium, selection)
 * - Safe fallback for unsupported platforms
 * - Consistent haptic patterns throughout the app
 *
 * @example
 * ```ts
 * import { haptics } from '@/src/lib/haptic-feedback';
 *
 * // On correct answer
 * haptics.success();
 *
 * // On wrong answer
 * haptics.error();
 *
 * // On button press
 * haptics.light();
 * ```
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Timing constants for haptic feedback sequences (in milliseconds)
 */
const HAPTIC_TIMING = {
  XP_AWARD_DELAY: 50,
  LEVEL_UP_SHORT_DELAY: 100,
  LEVEL_UP_LONG_DELAY: 150,
  STREAK_PULSE_DELAY: 80,
  STREAK_FINAL_DELAY: 100,
} as const;

/**
 * Check if haptics are supported on the current platform
 */
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Haptic feedback interface
 */
export interface HapticFeedback {
  /**
   * Success feedback - for correct answers, achievements, level ups
   * Uses notification success pattern
   */
  success: () => Promise<void>;

  /**
   * Error feedback - for wrong answers, validation failures
   * Uses notification error pattern
   */
  error: () => Promise<void>;

  /**
   * Warning feedback - for streak about to expire, low time
   * Uses notification warning pattern
   */
  warning: () => Promise<void>;

  /**
   * Light feedback - for button presses, minor interactions
   * Uses light impact
   */
  light: () => Promise<void>;

  /**
   * Medium feedback - for confirming selections, completing chapters
   * Uses medium impact
   */
  medium: () => Promise<void>;

  /**
   * Heavy feedback - for major achievements, level ups
   * Uses heavy impact
   */
  heavy: () => Promise<void>;

  /**
   * Selection feedback - for picker changes, toggle switches
   * Uses selection changed pattern
   */
  selection: () => Promise<void>;

  /**
   * XP award feedback - custom pattern for XP rewards
   * Combines selection + light for satisfying feedback
   */
  xpAward: () => Promise<void>;

  /**
   * Level up feedback - celebratory pattern
   * Multiple haptics in sequence
   */
  levelUp: () => Promise<void>;

  /**
   * Streak milestone feedback - for reaching streak milestones
   * Uses notification success + impact
   */
  streakMilestone: () => Promise<void>;
}

/**
 * No-op function for unsupported platforms
 */
async function noop(): Promise<void> {
  // Intentionally empty - haptics not supported
}

/**
 * Create haptic feedback methods that safely fall back on unsupported platforms
 */
function createHapticMethod(
  hapticFn: () => Promise<void>
): () => Promise<void> {
  if (!isHapticsSupported) {
    return noop;
  }

  return async (): Promise<void> => {
    try {
      await hapticFn();
    } catch {
      // Silently fail if haptics unavailable
      // This can happen on simulators or devices with haptics disabled
    }
  };
}

/**
 * Haptic feedback utility object
 *
 * Provides semantic methods for haptic feedback throughout the app.
 * Safe to call on all platforms - will no-op where not supported.
 *
 * @example
 * ```ts
 * // Correct quiz answer
 * await haptics.success();
 *
 * // Wrong answer
 * await haptics.error();
 *
 * // Complete a chapter
 * await haptics.medium();
 *
 * // Level up celebration
 * await haptics.levelUp();
 * ```
 */
export const haptics: HapticFeedback = {
  success: createHapticMethod(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  ),

  error: createHapticMethod(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  ),

  warning: createHapticMethod(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  ),

  light: createHapticMethod(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  ),

  medium: createHapticMethod(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  ),

  heavy: createHapticMethod(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  ),

  selection: createHapticMethod(() => Haptics.selectionAsync()),

  xpAward: createHapticMethod(async () => {
    // Quick selection followed by light impact
    await Haptics.selectionAsync();
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.XP_AWARD_DELAY));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }),

  levelUp: createHapticMethod(async () => {
    // Celebratory pattern: light -> medium -> heavy
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.LEVEL_UP_SHORT_DELAY));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.LEVEL_UP_SHORT_DELAY));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.LEVEL_UP_LONG_DELAY));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }),

  streakMilestone: createHapticMethod(async () => {
    // Two pulses + success notification
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.STREAK_PULSE_DELAY));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((resolve) => setTimeout(resolve, HAPTIC_TIMING.STREAK_FINAL_DELAY));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }),
};

/**
 * Check if haptics are available on the current device
 *
 * @returns true if haptics are supported and can be triggered
 */
export function isHapticsAvailable(): boolean {
  return isHapticsSupported;
}

/**
 * Impact feedback style options (re-exported for convenience)
 */
export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;

/**
 * Notification feedback type options (re-exported for convenience)
 */
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;
