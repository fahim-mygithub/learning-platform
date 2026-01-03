/**
 * Tests for Sleep-Aware Scheduler Service
 *
 * Tests the pure algorithmic service for sleep-aware session recommendations
 * based on circadian rhythms and user sleep schedule preferences.
 */

import {
  parseTimeString,
  isWithinSleepWindow,
  isPastBedtime,
  isWithinMorningWindow,
  getSessionRecommendation,
} from '../sleep-aware-scheduler';
import type { UserSchedulePreferences, SessionRecommendation } from '@/types/session';

describe('sleep-aware-scheduler', () => {
  // ============================================================================
  // parseTimeString tests
  // ============================================================================
  describe('parseTimeString', () => {
    it('parses "22:00" correctly', () => {
      const result = parseTimeString('22:00');
      expect(result).toEqual({ hours: 22, minutes: 0 });
    });

    it('parses "07:30" correctly', () => {
      const result = parseTimeString('07:30');
      expect(result).toEqual({ hours: 7, minutes: 30 });
    });

    it('handles "00:00" (midnight)', () => {
      const result = parseTimeString('00:00');
      expect(result).toEqual({ hours: 0, minutes: 0 });
    });

    it('parses "23:59" correctly', () => {
      const result = parseTimeString('23:59');
      expect(result).toEqual({ hours: 23, minutes: 59 });
    });

    it('parses "12:15" correctly', () => {
      const result = parseTimeString('12:15');
      expect(result).toEqual({ hours: 12, minutes: 15 });
    });
  });

  // ============================================================================
  // isWithinSleepWindow tests (2 hours before bedtime)
  // ============================================================================
  describe('isWithinSleepWindow', () => {
    it('returns true 1 hour before bedtime', () => {
      // Bedtime: 22:00, Current: 21:00
      const currentTime = new Date('2024-01-15T21:00:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });

    it('returns true 30 minutes before bedtime', () => {
      // Bedtime: 22:00, Current: 21:30
      const currentTime = new Date('2024-01-15T21:30:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });

    it('returns true exactly 2 hours before bedtime', () => {
      // Bedtime: 22:00, Current: 20:00
      const currentTime = new Date('2024-01-15T20:00:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });

    it('returns false 3 hours before bedtime', () => {
      // Bedtime: 22:00, Current: 19:00
      const currentTime = new Date('2024-01-15T19:00:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(false);
    });

    it('returns false 2 hours and 1 minute before bedtime', () => {
      // Bedtime: 22:00, Current: 19:59
      const currentTime = new Date('2024-01-15T19:59:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(false);
    });

    it('handles midnight crossing (bedtime: "01:00", current: 23:30)', () => {
      // Bedtime: 01:00, Current: 23:30 (1.5 hours before bedtime)
      const currentTime = new Date('2024-01-15T23:30:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '01:00' });
      expect(result).toBe(true);
    });

    it('handles midnight crossing (bedtime: "01:00", current: 22:00)', () => {
      // Bedtime: 01:00, Current: 22:00 (3 hours before bedtime)
      const currentTime = new Date('2024-01-15T22:00:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '01:00' });
      expect(result).toBe(false);
    });

    it('handles midnight crossing (bedtime: "00:30", current: 22:45)', () => {
      // Bedtime: 00:30, Current: 22:45 (1.75 hours before bedtime)
      const currentTime = new Date('2024-01-15T22:45:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '00:30' });
      expect(result).toBe(true);
    });

    it('returns false when past bedtime (not in sleep window)', () => {
      // Bedtime: 22:00, Current: 23:00 (past bedtime, not in sleep window)
      const currentTime = new Date('2024-01-15T23:00:00');
      const result = isWithinSleepWindow({ currentTime, bedtime: '22:00' });
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // isPastBedtime tests
  // ============================================================================
  describe('isPastBedtime', () => {
    it('returns true when past bedtime', () => {
      // Bedtime: 22:00, Current: 23:00
      const currentTime = new Date('2024-01-15T23:00:00');
      const result = isPastBedtime({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });

    it('returns true when exactly at bedtime', () => {
      // Bedtime: 22:00, Current: 22:00
      const currentTime = new Date('2024-01-15T22:00:00');
      const result = isPastBedtime({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });

    it('returns false when before bedtime', () => {
      // Bedtime: 22:00, Current: 21:00
      const currentTime = new Date('2024-01-15T21:00:00');
      const result = isPastBedtime({ currentTime, bedtime: '22:00' });
      expect(result).toBe(false);
    });

    it('handles midnight crossing - returns true past midnight bedtime', () => {
      // Bedtime: 01:00, Current: 01:30
      const currentTime = new Date('2024-01-15T01:30:00');
      const result = isPastBedtime({ currentTime, bedtime: '01:00' });
      expect(result).toBe(true);
    });

    it('handles midnight crossing - returns false in evening before midnight bedtime', () => {
      // Bedtime: 01:00, Current: 23:00 (before bedtime, crossing midnight)
      const currentTime = new Date('2024-01-15T23:00:00');
      const result = isPastBedtime({ currentTime, bedtime: '01:00' });
      expect(result).toBe(false);
    });

    it('handles midnight bedtime', () => {
      // Bedtime: 00:00, Current: 00:30
      const currentTime = new Date('2024-01-15T00:30:00');
      const result = isPastBedtime({ currentTime, bedtime: '00:00' });
      expect(result).toBe(true);
    });

    it('returns true 1 minute past bedtime', () => {
      // Bedtime: 22:00, Current: 22:01
      const currentTime = new Date('2024-01-15T22:01:00');
      const result = isPastBedtime({ currentTime, bedtime: '22:00' });
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // isWithinMorningWindow tests (2 hours after wake)
  // ============================================================================
  describe('isWithinMorningWindow', () => {
    it('returns true 1 hour after wake', () => {
      // Wake: 07:00, Current: 08:00
      const currentTime = new Date('2024-01-15T08:00:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(true);
    });

    it('returns true exactly at wake time', () => {
      // Wake: 07:00, Current: 07:00
      const currentTime = new Date('2024-01-15T07:00:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(true);
    });

    it('returns true 30 minutes after wake', () => {
      // Wake: 07:00, Current: 07:30
      const currentTime = new Date('2024-01-15T07:30:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(true);
    });

    it('returns false 3 hours after wake', () => {
      // Wake: 07:00, Current: 10:00
      const currentTime = new Date('2024-01-15T10:00:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(false);
    });

    it('returns false exactly 2 hours and 1 minute after wake', () => {
      // Wake: 07:00, Current: 09:01
      const currentTime = new Date('2024-01-15T09:01:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(false);
    });

    it('returns true exactly 2 hours after wake', () => {
      // Wake: 07:00, Current: 09:00
      const currentTime = new Date('2024-01-15T09:00:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(true);
    });

    it('returns false before wake time', () => {
      // Wake: 07:00, Current: 06:00
      const currentTime = new Date('2024-01-15T06:00:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '07:00' });
      expect(result).toBe(false);
    });

    it('handles early morning wake time', () => {
      // Wake: 05:30, Current: 06:30
      const currentTime = new Date('2024-01-15T06:30:00');
      const result = isWithinMorningWindow({ currentTime, wakeTime: '05:30' });
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // getSessionRecommendation tests
  // ============================================================================
  describe('getSessionRecommendation', () => {
    const createPreferences = (
      bedtime: string,
      wakeTime: string
    ): UserSchedulePreferences => ({
      user_id: 'test-user',
      bedtime,
      wake_time: wakeTime,
      timezone: 'America/New_York',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    it('returns "standard" when no preferences', () => {
      const currentTime = new Date('2024-01-15T14:00:00');
      const result = getSessionRecommendation({
        currentTime,
        preferences: null,
      });

      expect(result.type).toBe('standard');
      expect(result.reason).toBe('No schedule preferences set');
      expect(result.newConceptsAllowed).toBe(4);
      expect(result.suggestedDuration).toBeGreaterThan(0);
    });

    it('returns "review_only" within sleep window', () => {
      // Bedtime: 22:00, Current: 21:00 (1 hour before bedtime)
      const currentTime = new Date('2024-01-15T21:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('review_only');
      expect(result.reason).toBe('Close to bedtime - review only to help consolidation');
      expect(result.newConceptsAllowed).toBe(0);
    });

    it('returns "skip" past bedtime', () => {
      // Bedtime: 22:00, Current: 23:00
      const currentTime = new Date('2024-01-15T23:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('skip');
      expect(result.reason).toBe('Past bedtime - rest for better learning tomorrow');
      expect(result.newConceptsAllowed).toBe(0);
    });

    it('returns limited "standard" in morning window', () => {
      // Wake: 07:00, Current: 08:00 (1 hour after wake)
      const currentTime = new Date('2024-01-15T08:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('standard');
      expect(result.reason).toBe('Morning warmup session');
      expect(result.newConceptsAllowed).toBe(2);
    });

    it('returns full "standard" during normal hours', () => {
      // Bedtime: 22:00, Wake: 07:00, Current: 14:00 (normal hours)
      const currentTime = new Date('2024-01-15T14:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('standard');
      expect(result.reason).toBe('Good time for learning');
      expect(result.newConceptsAllowed).toBe(4);
    });

    it('returns full "standard" just outside morning window', () => {
      // Wake: 07:00, Current: 09:30 (2.5 hours after wake)
      const currentTime = new Date('2024-01-15T09:30:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('standard');
      expect(result.reason).toBe('Good time for learning');
      expect(result.newConceptsAllowed).toBe(4);
    });

    it('returns full "standard" just outside sleep window', () => {
      // Bedtime: 22:00, Current: 19:00 (3 hours before bedtime)
      const currentTime = new Date('2024-01-15T19:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('standard');
      expect(result.reason).toBe('Good time for learning');
      expect(result.newConceptsAllowed).toBe(4);
    });

    it('handles midnight crossing for bedtime', () => {
      // Bedtime: 01:00, Current: 23:30 (1.5 hours before bedtime)
      const currentTime = new Date('2024-01-15T23:30:00');
      const preferences = createPreferences('01:00', '09:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('review_only');
      expect(result.newConceptsAllowed).toBe(0);
    });

    it('includes suggested duration in response', () => {
      const currentTime = new Date('2024-01-15T14:00:00');
      const result = getSessionRecommendation({
        currentTime,
        preferences: null,
      });

      expect(result.suggestedDuration).toBeDefined();
      expect(typeof result.suggestedDuration).toBe('number');
      expect(result.suggestedDuration).toBeGreaterThan(0);
    });

    it('reduces suggested duration for review-only sessions', () => {
      const currentTime = new Date('2024-01-15T21:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const normalResult = getSessionRecommendation({
        currentTime: new Date('2024-01-15T14:00:00'),
        preferences,
      });

      const reviewResult = getSessionRecommendation({ currentTime, preferences });

      expect(reviewResult.suggestedDuration).toBeLessThanOrEqual(normalResult.suggestedDuration);
    });

    it('returns zero suggested duration for skip recommendation', () => {
      const currentTime = new Date('2024-01-15T23:00:00');
      const preferences = createPreferences('22:00', '07:00');

      const result = getSessionRecommendation({ currentTime, preferences });

      expect(result.type).toBe('skip');
      expect(result.suggestedDuration).toBe(0);
    });
  });
});
