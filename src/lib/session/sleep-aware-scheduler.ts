/**
 * Sleep-Aware Scheduler Service
 *
 * Pure algorithmic service for sleep-aware session recommendations.
 * Uses circadian rhythms and user sleep schedule preferences to optimize
 * learning session timing for better memory consolidation.
 *
 * Research basis: Sleep consolidation research shows 20-40% memory
 * improvement from proper sleep timing.
 */

import type { UserSchedulePreferences, SessionRecommendation } from '@/types/session';

// ============================================================================
// Constants
// ============================================================================

/** Hours before bedtime considered the "sleep window" (review only) */
const SLEEP_WINDOW_HOURS = 2;

/** Hours after wake time considered the "morning window" (limited learning) */
const MORNING_WINDOW_HOURS = 2;

/** Standard session duration in minutes */
const STANDARD_DURATION = 25;

/** Morning session duration in minutes */
const MORNING_DURATION = 15;

/** Review-only session duration in minutes */
const REVIEW_DURATION = 15;

/** Maximum new concepts for standard session */
const MAX_NEW_CONCEPTS = 4;

/** Reduced new concepts for morning session */
const MORNING_NEW_CONCEPTS = 2;

// ============================================================================
// Time Parsing
// ============================================================================

/**
 * Parse time string in "HH:MM" format to hours and minutes
 *
 * @param timeStr - Time string in "HH:MM" format
 * @returns Object with hours and minutes as numbers
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hoursStr, minutesStr] = timeStr.split(':');
  return {
    hours: parseInt(hoursStr, 10),
    minutes: parseInt(minutesStr, 10),
  };
}

/**
 * Convert a Date to minutes since midnight
 */
function dateToMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Convert hours and minutes to minutes since midnight
 */
function timeToMinutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Calculate the difference in minutes between two times, handling midnight crossing
 * Returns a positive value representing minutes from current time to target time,
 * accounting for the possibility of crossing midnight.
 */
function getMinutesUntil(currentMinutes: number, targetMinutes: number): number {
  if (targetMinutes > currentMinutes) {
    // Target is later today
    return targetMinutes - currentMinutes;
  } else if (targetMinutes < currentMinutes) {
    // Target is tomorrow (crossing midnight)
    return (24 * 60 - currentMinutes) + targetMinutes;
  }
  return 0; // Same time
}

/**
 * Calculate the difference in minutes since a target time, handling midnight crossing
 * Returns a positive value representing minutes elapsed since target time.
 */
function getMinutesSince(currentMinutes: number, targetMinutes: number): number {
  if (currentMinutes >= targetMinutes) {
    // Target was earlier today
    return currentMinutes - targetMinutes;
  } else {
    // Target was yesterday (crossing midnight)
    return currentMinutes + (24 * 60 - targetMinutes);
  }
}

// ============================================================================
// Sleep Window Detection
// ============================================================================

/**
 * Check if current time is within sleep window (2 hours before bedtime)
 *
 * The sleep window is the period where learning new concepts is discouraged
 * to allow for better sleep consolidation. Only review is recommended.
 *
 * @param options.currentTime - Current date/time
 * @param options.bedtime - Bedtime in "HH:MM" format
 * @returns true if within 2 hours before bedtime (but not past bedtime)
 */
export function isWithinSleepWindow(options: {
  currentTime: Date;
  bedtime: string;
}): boolean {
  const { currentTime, bedtime } = options;

  const currentMinutes = dateToMinutesSinceMidnight(currentTime);
  const { hours: bedHours, minutes: bedMinutes } = parseTimeString(bedtime);
  const bedtimeMinutes = timeToMinutesSinceMidnight(bedHours, bedMinutes);

  const minutesUntilBedtime = getMinutesUntil(currentMinutes, bedtimeMinutes);
  const sleepWindowMinutes = SLEEP_WINDOW_HOURS * 60;

  // Check if we're in the sleep window (0 < minutes until bedtime <= 2 hours)
  // If minutesUntilBedtime is 0, we're at bedtime (past, not in window)
  // If minutesUntilBedtime > 24*60 - sleepWindowMinutes, we're not in the window
  return minutesUntilBedtime > 0 && minutesUntilBedtime <= sleepWindowMinutes;
}

// ============================================================================
// Past Bedtime Detection
// ============================================================================

/**
 * Check if current time is past bedtime
 *
 * Past bedtime is determined relative to a typical sleep cycle:
 * - If bedtime is 22:00 and current is 23:00, we're past bedtime
 * - If bedtime is 01:00 and current is 02:00, we're past bedtime
 * - If bedtime is 01:00 and current is 23:00, we're NOT past bedtime (approaching it)
 *
 * @param options.currentTime - Current date/time
 * @param options.bedtime - Bedtime in "HH:MM" format
 * @returns true if at or past bedtime
 */
export function isPastBedtime(options: {
  currentTime: Date;
  bedtime: string;
}): boolean {
  const { currentTime, bedtime } = options;

  const currentMinutes = dateToMinutesSinceMidnight(currentTime);
  const { hours: bedHours, minutes: bedMinutes } = parseTimeString(bedtime);
  const bedtimeMinutes = timeToMinutesSinceMidnight(bedHours, bedMinutes);

  // Assume bedtime is in the evening (typically 20:00 - 02:00)
  // We consider "past bedtime" as the period from bedtime until wake time
  // This is tricky because we need to determine if current time is in the
  // "post-bedtime" window

  // For bedtimes after 12:00 (noon), if current > bedtime, we're past
  // For bedtimes before 12:00 (early morning like 01:00):
  //   - If current is in the early morning (after midnight but before bedtime): not past
  //   - If current is after bedtime: past

  if (bedtimeMinutes >= 12 * 60) {
    // Bedtime is in afternoon/evening (e.g., 22:00)
    // Past bedtime if: current >= bedtime OR current is very early morning
    return currentMinutes >= bedtimeMinutes || currentMinutes < 6 * 60;
  } else {
    // Bedtime is in early morning (e.g., 01:00)
    // Past bedtime if: current >= bedtime AND current < some reasonable wake time (6 AM)
    return currentMinutes >= bedtimeMinutes && currentMinutes < 6 * 60;
  }
}

// ============================================================================
// Morning Window Detection
// ============================================================================

/**
 * Check if current time is within morning window (2 hours after wake)
 *
 * The morning window is the period right after waking where cognitive
 * capacity is still ramping up. Limited new concept learning is recommended.
 *
 * @param options.currentTime - Current date/time
 * @param options.wakeTime - Wake time in "HH:MM" format
 * @returns true if within 2 hours after wake time
 */
export function isWithinMorningWindow(options: {
  currentTime: Date;
  wakeTime: string;
}): boolean {
  const { currentTime, wakeTime } = options;

  const currentMinutes = dateToMinutesSinceMidnight(currentTime);
  const { hours: wakeHours, minutes: wakeMinutes } = parseTimeString(wakeTime);
  const wakeTimeMinutes = timeToMinutesSinceMidnight(wakeHours, wakeMinutes);

  const minutesSinceWake = getMinutesSince(currentMinutes, wakeTimeMinutes);
  const morningWindowMinutes = MORNING_WINDOW_HOURS * 60;

  // Check if we're in the morning window (0 <= minutes since wake <= 2 hours)
  // Also ensure we're not more than 12 hours after wake (would wrap to next day)
  return minutesSinceWake >= 0 && minutesSinceWake <= morningWindowMinutes && minutesSinceWake < 12 * 60;
}

// ============================================================================
// Session Recommendation
// ============================================================================

/**
 * Get session recommendation based on current time and user preferences
 *
 * Scheduling Rules:
 * 1. Within 2 hours of bedtime: Review only, no new concepts
 * 2. Past bedtime: Suggest skipping
 * 3. Within 2 hours of wake time: Light morning session (limited new concepts)
 * 4. No preferences set: Standard session
 * 5. Normal hours: Standard session
 *
 * @param options.currentTime - Current date/time
 * @param options.preferences - User schedule preferences or null
 * @returns Session recommendation with type, reason, duration, and allowed concepts
 */
export function getSessionRecommendation(options: {
  currentTime: Date;
  preferences: UserSchedulePreferences | null;
}): SessionRecommendation {
  const { currentTime, preferences } = options;

  // No preferences: default to standard session
  if (!preferences) {
    return {
      type: 'standard',
      reason: 'No schedule preferences set',
      suggestedDuration: STANDARD_DURATION,
      newConceptsAllowed: MAX_NEW_CONCEPTS,
    };
  }

  const { bedtime, wake_time: wakeTime } = preferences;

  // Check if past bedtime first (highest priority - should skip)
  if (isPastBedtime({ currentTime, bedtime })) {
    return {
      type: 'skip',
      reason: 'Past bedtime - rest for better learning tomorrow',
      suggestedDuration: 0,
      newConceptsAllowed: 0,
    };
  }

  // Check if within sleep window (2 hours before bedtime)
  if (isWithinSleepWindow({ currentTime, bedtime })) {
    return {
      type: 'review_only',
      reason: 'Close to bedtime - review only to help consolidation',
      suggestedDuration: REVIEW_DURATION,
      newConceptsAllowed: 0,
    };
  }

  // Check if within morning window (2 hours after wake)
  if (isWithinMorningWindow({ currentTime, wakeTime })) {
    return {
      type: 'standard',
      reason: 'Morning warmup session',
      suggestedDuration: MORNING_DURATION,
      newConceptsAllowed: MORNING_NEW_CONCEPTS,
    };
  }

  // Normal hours: full standard session
  return {
    type: 'standard',
    reason: 'Good time for learning',
    suggestedDuration: STANDARD_DURATION,
    newConceptsAllowed: MAX_NEW_CONCEPTS,
  };
}
