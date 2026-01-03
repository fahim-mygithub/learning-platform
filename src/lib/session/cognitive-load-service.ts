/**
 * Cognitive Load Service
 *
 * Pure algorithmic service for calculating cognitive learning capacity.
 * Based on Cognitive Load Theory (Miller's Law: 4+-1 chunks) and circadian rhythm research.
 *
 * This service has no database dependencies - it's purely computational.
 */

import type { CognitiveCapacity, CognitiveWarningLevel } from '@/types/session';

/**
 * Base cognitive capacity based on Miller's Law (4+-1 chunks in working memory)
 */
const BASE_CAPACITY = 4;

/**
 * Fatigue reduction per 15-minute interval
 */
const FATIGUE_PER_INTERVAL = 0.05;

/**
 * Duration of each fatigue interval in minutes
 */
const FATIGUE_INTERVAL_MINUTES = 15;

/**
 * Maximum fatigue modifier (caps out after ~90 minutes)
 */
const MAX_FATIGUE = 0.3;

/**
 * Warning level thresholds (percentage used)
 */
const CAUTION_THRESHOLD = 75;
const BLOCKED_THRESHOLD = 90;

/**
 * Get circadian rhythm modifier based on time of day.
 *
 * Research shows cognitive performance varies throughout the day:
 * - Peak performance in late morning (9-12)
 * - Post-lunch dip (12-14)
 * - Secondary peak in afternoon (14-17)
 * - Declining performance in evening/night
 *
 * @param hour - Hour of day (0-23)
 * @returns Circadian modifier (0.7-1.1)
 */
export function getCircadianModifier(hour: number): number {
  // Late night (22:00 - 05:59)
  if (hour >= 22 || hour < 6) {
    return 0.7;
  }
  // Waking up (06:00 - 08:59)
  if (hour >= 6 && hour < 9) {
    return 0.9;
  }
  // Peak morning (09:00 - 11:59)
  if (hour >= 9 && hour < 12) {
    return 1.1;
  }
  // Post-lunch dip (12:00 - 13:59)
  if (hour >= 12 && hour < 14) {
    return 0.85;
  }
  // Afternoon (14:00 - 16:59)
  if (hour >= 14 && hour < 17) {
    return 1.0;
  }
  // Evening (17:00 - 19:59)
  if (hour >= 17 && hour < 20) {
    return 0.95;
  }
  // Winding down (20:00 - 21:59)
  return 0.8;
}

/**
 * Get fatigue modifier based on session duration.
 *
 * Mental fatigue accumulates during learning sessions.
 * Reduction is 0.05 per 15-minute interval, capped at 0.3.
 *
 * @param sessionDurationMinutes - Duration of current session in minutes
 * @returns Fatigue modifier (0-0.3)
 */
export function getFatigueModifier(sessionDurationMinutes: number): number {
  // Handle negative values
  if (sessionDurationMinutes < 0) {
    return 0;
  }

  // Calculate number of complete 15-minute intervals
  const intervals = Math.floor(sessionDurationMinutes / FATIGUE_INTERVAL_MINUTES);

  // Calculate fatigue (0.05 per interval, max 0.3)
  const fatigue = intervals * FATIGUE_PER_INTERVAL;

  return Math.min(fatigue, MAX_FATIGUE);
}

/**
 * Calculate effective capacity from base capacity and all modifiers.
 *
 * Formula: Base x Circadian x Sleep x (1 - Fatigue)
 *
 * @param baseCapacity - Base cognitive capacity (typically 4)
 * @param modifiers - Object containing circadian, sleep, and fatigue modifiers
 * @returns Effective cognitive capacity (never below 0)
 */
export function getEffectiveCapacity(
  baseCapacity: number,
  modifiers: {
    circadian: number;
    sleep: number;
    fatigue: number;
  }
): number {
  const { circadian, sleep, fatigue } = modifiers;

  // Calculate effective capacity
  // Fatigue is subtracted, not multiplied, so we use (1 - fatigue)
  const effective = baseCapacity * circadian * sleep * (1 - fatigue);

  // Never return negative capacity
  return Math.max(0, effective);
}

/**
 * Get warning level based on percentage of cognitive capacity used.
 *
 * @param percentageUsed - Percentage of capacity used (0-100+)
 * @returns Warning level: 'none' (<75%), 'caution' (75-89%), 'blocked' (>=90%)
 */
export function getWarningLevel(percentageUsed: number): CognitiveWarningLevel {
  if (percentageUsed >= BLOCKED_THRESHOLD) {
    return 'blocked';
  }
  if (percentageUsed >= CAUTION_THRESHOLD) {
    return 'caution';
  }
  return 'none';
}

/**
 * Calculate full cognitive capacity with all modifiers.
 *
 * This is the main entry point for cognitive capacity calculations.
 * It combines circadian rhythms, sleep quality, and fatigue to
 * determine how much cognitive capacity is available for learning.
 *
 * @param options - Calculation options
 * @param options.currentHour - Current hour (0-23)
 * @param options.sessionDurationMinutes - Optional session duration in minutes
 * @param options.sleepQuality - Optional sleep quality modifier (0.7-1.0)
 * @returns Complete CognitiveCapacity object
 */
export function calculateCapacity(options: {
  currentHour: number;
  sessionDurationMinutes?: number;
  sleepQuality?: number;
}): CognitiveCapacity {
  const { currentHour, sessionDurationMinutes = 0, sleepQuality = 1.0 } = options;

  // Calculate individual modifiers
  const circadianModifier = getCircadianModifier(currentHour);
  const sleepModifier = sleepQuality;
  const fatigueModifier = getFatigueModifier(sessionDurationMinutes);

  // Calculate effective capacity
  const effectiveCapacity = getEffectiveCapacity(BASE_CAPACITY, {
    circadian: circadianModifier,
    sleep: sleepModifier,
    fatigue: fatigueModifier,
  });

  // When starting fresh, percentage used is 0
  // In actual usage, this would be calculated from existing session load
  const percentageUsed = 0;

  // Determine warning level
  const warningLevel = getWarningLevel(percentageUsed);

  // Can learn new concepts if not blocked
  const canLearnNew = warningLevel !== 'blocked';

  return {
    baseCapacity: BASE_CAPACITY,
    circadianModifier,
    sleepModifier,
    fatigueModifier,
    effectiveCapacity,
    percentageUsed,
    canLearnNew,
    warningLevel,
  };
}
