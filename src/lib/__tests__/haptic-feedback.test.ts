/**
 * Haptic Feedback Tests
 *
 * Tests for haptic feedback utility with mocked expo-haptics.
 */

import {
  haptics,
  isHapticsAvailable,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from '../haptic-feedback';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('haptic-feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to ios for most tests
    (Platform as { OS: string }).OS = 'ios';
  });

  describe('haptics.success', () => {
    it('calls notificationAsync with Success type', async () => {
      await haptics.success();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('handles errors silently', async () => {
      (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics unavailable')
      );

      // Should not throw
      await expect(haptics.success()).resolves.toBeUndefined();
    });
  });

  describe('haptics.error', () => {
    it('calls notificationAsync with Error type', async () => {
      await haptics.error();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });
  });

  describe('haptics.warning', () => {
    it('calls notificationAsync with Warning type', async () => {
      await haptics.warning();

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });
  });

  describe('haptics.light', () => {
    it('calls impactAsync with Light style', async () => {
      await haptics.light();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });

  describe('haptics.medium', () => {
    it('calls impactAsync with Medium style', async () => {
      await haptics.medium();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });
  });

  describe('haptics.heavy', () => {
    it('calls impactAsync with Heavy style', async () => {
      await haptics.heavy();

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });
  });

  describe('haptics.selection', () => {
    it('calls selectionAsync', async () => {
      await haptics.selection();

      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe('haptics.xpAward', () => {
    it('calls selectionAsync followed by impactAsync with Light style', async () => {
      await haptics.xpAward();

      // Selection should be called
      expect(Haptics.selectionAsync).toHaveBeenCalled();

      // Impact should be called after delay
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });

  describe('haptics.levelUp', () => {
    it('executes celebratory pattern with multiple haptics', async () => {
      await haptics.levelUp();

      // All impact styles should be called
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );

      // Success notification at the end
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('haptics.streakMilestone', () => {
    it('executes streak pattern with pulses and success notification', async () => {
      await haptics.streakMilestone();

      // Two medium impacts (pulses)
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);

      // Success notification at the end
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('isHapticsAvailable', () => {
    it('returns true for iOS', () => {
      (Platform as { OS: string }).OS = 'ios';

      // Note: Since the module is evaluated at import time,
      // we test the exported function behavior
      expect(isHapticsAvailable()).toBe(true);
    });
  });

  describe('re-exported constants', () => {
    it('exports ImpactFeedbackStyle from expo-haptics', () => {
      expect(ImpactFeedbackStyle).toBeDefined();
      expect(ImpactFeedbackStyle.Light).toBe('light');
      expect(ImpactFeedbackStyle.Medium).toBe('medium');
      expect(ImpactFeedbackStyle.Heavy).toBe('heavy');
    });

    it('exports NotificationFeedbackType from expo-haptics', () => {
      expect(NotificationFeedbackType).toBeDefined();
      expect(NotificationFeedbackType.Success).toBe('success');
      expect(NotificationFeedbackType.Warning).toBe('warning');
      expect(NotificationFeedbackType.Error).toBe('error');
    });
  });

  describe('error handling', () => {
    it('silently handles notificationAsync errors', async () => {
      (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Device haptics disabled')
      );

      await expect(haptics.success()).resolves.toBeUndefined();
      await expect(haptics.error()).resolves.toBeUndefined();
      await expect(haptics.warning()).resolves.toBeUndefined();
    });

    it('silently handles impactAsync errors', async () => {
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics not available')
      );

      await expect(haptics.light()).resolves.toBeUndefined();
      await expect(haptics.medium()).resolves.toBeUndefined();
      await expect(haptics.heavy()).resolves.toBeUndefined();
    });

    it('silently handles selectionAsync errors', async () => {
      (Haptics.selectionAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Selection haptics failed')
      );

      await expect(haptics.selection()).resolves.toBeUndefined();
    });
  });

  describe('HapticFeedback interface completeness', () => {
    it('has all required methods', () => {
      expect(typeof haptics.success).toBe('function');
      expect(typeof haptics.error).toBe('function');
      expect(typeof haptics.warning).toBe('function');
      expect(typeof haptics.light).toBe('function');
      expect(typeof haptics.medium).toBe('function');
      expect(typeof haptics.heavy).toBe('function');
      expect(typeof haptics.selection).toBe('function');
      expect(typeof haptics.xpAward).toBe('function');
      expect(typeof haptics.levelUp).toBe('function');
      expect(typeof haptics.streakMilestone).toBe('function');
    });

    it('all methods return promises', async () => {
      expect(haptics.success()).toBeInstanceOf(Promise);
      expect(haptics.error()).toBeInstanceOf(Promise);
      expect(haptics.warning()).toBeInstanceOf(Promise);
      expect(haptics.light()).toBeInstanceOf(Promise);
      expect(haptics.medium()).toBeInstanceOf(Promise);
      expect(haptics.heavy()).toBeInstanceOf(Promise);
      expect(haptics.selection()).toBeInstanceOf(Promise);
      expect(haptics.xpAward()).toBeInstanceOf(Promise);
      expect(haptics.levelUp()).toBeInstanceOf(Promise);
      expect(haptics.streakMilestone()).toBeInstanceOf(Promise);
    });
  });

  describe('concurrent haptic calls', () => {
    it('handles multiple rapid calls', async () => {
      const promises = [
        haptics.success(),
        haptics.light(),
        haptics.selection(),
        haptics.success(),
        haptics.light(),
      ];

      await Promise.all(promises);

      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });
});

describe('haptic-feedback on unsupported platform', () => {
  // This test needs to be in a separate describe block because
  // the isHapticsSupported check happens at module load time.
  // In a real scenario, you would need to use jest.isolateModules
  // or a different testing approach to test platform-specific behavior.

  it('should have platform-aware behavior', () => {
    // The module checks Platform.OS at import time
    // For now, we verify the function exists
    expect(typeof isHapticsAvailable).toBe('function');
  });
});
