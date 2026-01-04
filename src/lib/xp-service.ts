/**
 * XP Service
 *
 * Manages XP (experience points) and leveling for user progression.
 * Implements variable ratio reinforcement with weighted random XP rewards.
 *
 * Features:
 * - Weighted random XP selection for dopamine-driven engagement
 * - XP awarding with audit trail via RPC function
 * - Level calculation using logarithmic curve
 * - XP retrieval and progress tracking
 *
 * @example
 * ```ts
 * import { createXPService, XPService } from '@/src/lib/xp-service';
 *
 * const xpService = createXPService();
 * const result = await xpService.awardXP('user-123', 'quiz_correct', 'concept-456');
 * console.log(`Awarded ${result.amountAwarded} XP! Level: ${result.newLevel}`);
 * ```
 */

import { supabase } from './supabase';
import {
  XPReason,
  XP_REWARDS,
  UserXP,
  XPAwardResult,
  calculateLevel as calculateLevelFromXP,
  selectXPAmount,
} from '@/src/types/engagement';

/**
 * Error codes for XP operations
 */
export type XPServiceErrorCode =
  | 'FETCH_FAILED'
  | 'AWARD_FAILED'
  | 'RPC_FAILED'
  | 'INVALID_REASON'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for XP service operations
 */
export class XPServiceError extends Error {
  constructor(
    message: string,
    public code: XPServiceErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'XPServiceError';
  }
}

/**
 * XP service interface
 */
export interface XPService {
  /**
   * Select a random XP amount for a given reason using weighted random selection
   * Implements variable ratio reinforcement schedule
   */
  selectRandomXP(reason: XPReason): number;

  /**
   * Award XP to a user for a specific reason
   * Calls the award_xp RPC function
   * @param customAmount Optional custom XP amount to award (overrides random selection)
   */
  awardXP(userId: string, reason: XPReason, conceptId?: string, customAmount?: number): Promise<XPAwardResult>;

  /**
   * Get current XP data for a user
   */
  getUserXP(userId: string): Promise<UserXP>;

  /**
   * Calculate level from total XP
   * Uses formula: floor(sqrt(xp / 100)) + 1
   */
  calculateLevel(totalXP: number): number;
}

/**
 * Default XP data for new users
 */
const DEFAULT_USER_XP: Omit<UserXP, 'userId'> = {
  totalXp: 0,
  weeklyXp: 0,
  level: 1,
};

/**
 * Create an XP service instance
 *
 * @returns XPService instance
 *
 * @example
 * ```ts
 * const service = createXPService();
 * const result = await service.awardXP('user-123', 'quiz_correct');
 * if (result.levelUp) {
 *   console.log(`Level up! Now level ${result.newLevel}`);
 * }
 * ```
 */
export function createXPService(): XPService {
  return {
    /**
     * Select a random XP amount for a given reason using weighted random selection
     * Delegates to selectXPAmount from engagement.ts to avoid duplication
     */
    selectRandomXP(reason: XPReason): number {
      const reward = XP_REWARDS[reason];
      if (!reward) {
        throw new XPServiceError(
          `Invalid XP reason: ${reason}`,
          'INVALID_REASON'
        );
      }
      return selectXPAmount(reason);
    },

    /**
     * Award XP to a user for a specific reason
     */
    async awardXP(
      userId: string,
      reason: XPReason,
      conceptId?: string,
      customAmount?: number
    ): Promise<XPAwardResult> {
      // Use custom amount if provided, otherwise select random XP amount based on reason
      const amount = customAmount ?? this.selectRandomXP(reason);

      // Get current XP before awarding (for level up detection)
      const currentXP = await this.getUserXP(userId);
      const previousLevel = this.calculateLevel(currentXP.totalXp);

      // Call the award_xp RPC function
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_concept_id: conceptId ?? null,
      });

      if (error) {
        throw new XPServiceError(
          `Failed to award XP: ${error.message}`,
          'RPC_FAILED',
          error
        );
      }

      // Calculate new totals
      const newTotalXp = currentXP.totalXp + amount;
      const newLevel = this.calculateLevel(newTotalXp);

      return {
        newTotalXp: data?.new_total_xp ?? newTotalXp,
        newLevel: data?.new_level ?? newLevel,
        levelUp: newLevel > previousLevel,
        amountAwarded: amount,
      };
    },

    /**
     * Get current XP data for a user
     */
    async getUserXP(userId: string): Promise<UserXP> {
      const { data, error } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no row exists, return default XP (will be created on first award)
        if (error.code === 'PGRST116') {
          return {
            userId,
            ...DEFAULT_USER_XP,
          };
        }

        throw new XPServiceError(
          `Failed to fetch XP: ${error.message}`,
          'FETCH_FAILED',
          error
        );
      }

      return {
        userId: data.user_id,
        totalXp: data.total_xp,
        weeklyXp: data.weekly_xp ?? 0,
        level: data.level ?? this.calculateLevel(data.total_xp),
      };
    },

    /**
     * Calculate level from total XP
     * Uses formula: floor(sqrt(xp / 100)) + 1
     * Level 1: 0-99 XP
     * Level 2: 100-399 XP
     * Level 3: 400-899 XP
     * etc.
     */
    calculateLevel(totalXP: number): number {
      return calculateLevelFromXP(totalXP);
    },
  };
}

/**
 * Default XP service instance (singleton)
 */
let defaultXPService: XPService | null = null;

/**
 * Get or create the default XP service instance
 *
 * @returns Default XPService instance
 */
export function getDefaultXPService(): XPService {
  if (!defaultXPService) {
    defaultXPService = createXPService();
  }
  return defaultXPService;
}

/**
 * Reset the default service instance (primarily for testing)
 */
export function resetDefaultXPService(): void {
  defaultXPService = null;
}
