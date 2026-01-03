/**
 * Streak Service
 *
 * Manages user streak tracking for habit formation in the learning platform.
 * Streaks are updated daily when users engage with learning content.
 *
 * Features:
 * - Streak retrieval and creation
 * - Activity recording with RPC function
 * - Streak health monitoring (active vs reset)
 *
 * @example
 * ```ts
 * import { StreakService, createStreakService } from '@/src/lib/streak-service';
 *
 * const streakService = createStreakService();
 * const streak = await streakService.getStreak('user-123');
 * await streakService.recordActivity('user-123');
 * ```
 */

import { supabase } from './supabase';
import type { UserStreak, StreakUpdateResult } from '@/src/types/engagement';

/**
 * Error codes for streak operations
 */
export type StreakServiceErrorCode =
  | 'FETCH_FAILED'
  | 'UPDATE_FAILED'
  | 'RPC_FAILED'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for streak service operations
 */
export class StreakServiceError extends Error {
  constructor(
    message: string,
    public code: StreakServiceErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StreakServiceError';
  }
}

/**
 * Streak service interface
 */
export interface StreakService {
  /**
   * Get the current streak data for a user
   * Creates a new streak record if none exists
   */
  getStreak(userId: string): Promise<UserStreak>;

  /**
   * Record user activity and update streak
   * Calls the update_streak RPC function
   */
  recordActivity(userId: string): Promise<StreakUpdateResult>;

  /**
   * Check if the user's streak is still active
   * Returns streak health status
   */
  checkStreakHealth(userId: string): Promise<{
    isActive: boolean;
    wasReset: boolean;
    daysUntilExpiry: number;
  }>;
}

/**
 * Time constants for date calculations
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Default streak data for new users
 */
const DEFAULT_STREAK: Omit<UserStreak, 'userId'> = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  streakFreezeAvailable: true,
};

/**
 * Get the start of day in UTC for consistent date comparisons
 */
function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string | null, date2: string): number {
  if (!date1) return Infinity;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / MS_PER_DAY);
}

/**
 * Create a streak service instance
 *
 * @returns StreakService instance
 *
 * @example
 * ```ts
 * const service = createStreakService();
 * const streak = await service.getStreak('user-123');
 * console.log(`Current streak: ${streak.currentStreak} days`);
 * ```
 */
export function createStreakService(): StreakService {
  return {
    /**
     * Get the current streak data for a user
     * Creates a default record if none exists
     */
    async getStreak(userId: string): Promise<UserStreak> {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no row exists, return default streak (will be created on first activity)
        if (error.code === 'PGRST116') {
          return {
            userId,
            ...DEFAULT_STREAK,
          };
        }

        throw new StreakServiceError(
          `Failed to fetch streak: ${error.message}`,
          'FETCH_FAILED',
          error
        );
      }

      return {
        userId: data.user_id,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActivityDate: data.last_activity_date,
        streakFreezeAvailable: data.streak_freeze_available ?? true,
      };
    },

    /**
     * Record user activity and update streak
     * Calls the database RPC function to handle streak logic
     */
    async recordActivity(userId: string): Promise<StreakUpdateResult> {
      // Call the update_streak RPC function
      const { data, error } = await supabase.rpc('update_streak', {
        p_user_id: userId,
      });

      if (error) {
        throw new StreakServiceError(
          `Failed to record activity: ${error.message}`,
          'RPC_FAILED',
          error
        );
      }

      // The RPC function returns the updated streak data
      // If data is null, fetch the current streak
      if (!data) {
        const streak = await this.getStreak(userId);
        return {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          isNewDay: false,
        };
      }

      return {
        currentStreak: data.current_streak ?? 0,
        longestStreak: data.longest_streak ?? 0,
        isNewDay: data.is_new_day ?? false,
      };
    },

    /**
     * Check if the user's streak is still active
     * A streak is active if activity was recorded today or yesterday
     */
    async checkStreakHealth(userId: string): Promise<{
      isActive: boolean;
      wasReset: boolean;
      daysUntilExpiry: number;
    }> {
      const streak = await this.getStreak(userId);
      const today = getUTCDateString();
      const lastActivity = streak.lastActivityDate;

      // If no activity, streak is not active but wasn't reset (never started)
      if (!lastActivity) {
        return {
          isActive: false,
          wasReset: false,
          daysUntilExpiry: 0,
        };
      }

      const daysSinceActivity = daysBetween(lastActivity, today);

      // Activity today means streak is active
      if (daysSinceActivity === 0) {
        // 2 more days of inactivity allowed (tomorrow + day after)
        const daysUntilExpiry = 2 - daysSinceActivity;
        return {
          isActive: true,
          wasReset: false,
          daysUntilExpiry,
        };
      }

      // Activity yesterday means streak is active but about to expire
      if (daysSinceActivity === 1) {
        return {
          isActive: true,
          wasReset: false,
          daysUntilExpiry: 1, // Must record activity today
        };
      }

      // More than 1 day since activity - streak was reset
      return {
        isActive: false,
        wasReset: streak.currentStreak > 0 || streak.longestStreak > 0,
        daysUntilExpiry: 0,
      };
    },
  };
}

/**
 * Default streak service instance (singleton)
 */
let defaultStreakService: StreakService | null = null;

/**
 * Get or create the default streak service instance
 *
 * @returns Default StreakService instance
 */
export function getDefaultStreakService(): StreakService {
  if (!defaultStreakService) {
    defaultStreakService = createStreakService();
  }
  return defaultStreakService;
}

/**
 * Reset the default service instance (primarily for testing)
 */
export function resetDefaultStreakService(): void {
  defaultStreakService = null;
}
