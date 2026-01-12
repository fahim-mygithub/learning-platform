/**
 * useHaptics Hook
 *
 * Provides haptic feedback methods with platform detection.
 * Gracefully degrades on web where haptics are not available.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

const isHapticsAvailable = Platform.OS !== 'web';

/**
 * Map our simplified impact styles to expo-haptics styles
 */
const impactStyleMap: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/**
 * Map our notification types to expo-haptics types
 */
const notificationTypeMap: Record<
  NotificationType,
  Haptics.NotificationFeedbackType
> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export interface UseHapticsReturn {
  /** Light tap for selections, toggles */
  selection: () => Promise<void>;
  /** Impact feedback for button presses */
  impact: (style?: ImpactStyle) => Promise<void>;
  /** Notification feedback for success/error states */
  notification: (type: NotificationType) => Promise<void>;
  /** Whether haptics are available on this platform */
  isAvailable: boolean;
}

/**
 * Hook providing haptic feedback methods
 *
 * @example
 * ```tsx
 * const { selection, impact, notification } = useHaptics();
 *
 * // Tab press
 * onPress={() => {
 *   selection();
 *   navigate();
 * }}
 *
 * // Button press
 * onPressIn={() => impact('light')}
 *
 * // Form submit success
 * onSuccess={() => notification('success')}
 * ```
 */
export function useHaptics(): UseHapticsReturn {
  const selection = useCallback(async () => {
    if (!isHapticsAvailable) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Silently fail if haptics unavailable
    }
  }, []);

  const impact = useCallback(async (style: ImpactStyle = 'medium') => {
    if (!isHapticsAvailable) return;
    try {
      await Haptics.impactAsync(impactStyleMap[style]);
    } catch {
      // Silently fail if haptics unavailable
    }
  }, []);

  const notification = useCallback(async (type: NotificationType) => {
    if (!isHapticsAvailable) return;
    try {
      await Haptics.notificationAsync(notificationTypeMap[type]);
    } catch {
      // Silently fail if haptics unavailable
    }
  }, []);

  return {
    selection,
    impact,
    notification,
    isAvailable: isHapticsAvailable,
  };
}

export default useHaptics;
