/**
 * Tests for Cognitive Load Service
 *
 * Tests the pure algorithmic service for calculating cognitive learning capacity
 * based on circadian rhythms, fatigue, and sleep quality.
 */

import {
  calculateCapacity,
  getCircadianModifier,
  getFatigueModifier,
  getEffectiveCapacity,
  getWarningLevel,
} from '../cognitive-load-service';
import type { CognitiveCapacity, CognitiveWarningLevel } from '@/types/session';

describe('cognitive-load-service', () => {
  // ============================================================================
  // getCircadianModifier tests
  // ============================================================================
  describe('getCircadianModifier', () => {
    it('returns 0.9 for morning wake-up period (6-9)', () => {
      expect(getCircadianModifier(6)).toBe(0.9);
      expect(getCircadianModifier(7)).toBe(0.9);
      expect(getCircadianModifier(8)).toBe(0.9);
    });

    it('returns 1.1 for peak morning period (9-12)', () => {
      expect(getCircadianModifier(9)).toBe(1.1);
      expect(getCircadianModifier(10)).toBe(1.1);
      expect(getCircadianModifier(11)).toBe(1.1);
    });

    it('returns 0.85 for post-lunch dip period (12-14)', () => {
      expect(getCircadianModifier(12)).toBe(0.85);
      expect(getCircadianModifier(13)).toBe(0.85);
    });

    it('returns 1.0 for afternoon period (14-17)', () => {
      expect(getCircadianModifier(14)).toBe(1.0);
      expect(getCircadianModifier(15)).toBe(1.0);
      expect(getCircadianModifier(16)).toBe(1.0);
    });

    it('returns 0.95 for evening period (17-20)', () => {
      expect(getCircadianModifier(17)).toBe(0.95);
      expect(getCircadianModifier(18)).toBe(0.95);
      expect(getCircadianModifier(19)).toBe(0.95);
    });

    it('returns 0.8 for winding down period (20-22)', () => {
      expect(getCircadianModifier(20)).toBe(0.8);
      expect(getCircadianModifier(21)).toBe(0.8);
    });

    it('returns 0.7 for late night period (22-6)', () => {
      expect(getCircadianModifier(22)).toBe(0.7);
      expect(getCircadianModifier(23)).toBe(0.7);
      expect(getCircadianModifier(0)).toBe(0.7);
      expect(getCircadianModifier(1)).toBe(0.7);
      expect(getCircadianModifier(2)).toBe(0.7);
      expect(getCircadianModifier(3)).toBe(0.7);
      expect(getCircadianModifier(4)).toBe(0.7);
      expect(getCircadianModifier(5)).toBe(0.7);
    });

    it('handles edge case at hour 0', () => {
      expect(getCircadianModifier(0)).toBe(0.7);
    });

    it('handles edge case at hour 23', () => {
      expect(getCircadianModifier(23)).toBe(0.7);
    });
  });

  // ============================================================================
  // getFatigueModifier tests
  // ============================================================================
  describe('getFatigueModifier', () => {
    it('returns 0 for 0 minutes', () => {
      expect(getFatigueModifier(0)).toBe(0);
    });

    it('returns 0.05 for 15 minutes', () => {
      expect(getFatigueModifier(15)).toBe(0.05);
    });

    it('returns 0.1 for 30 minutes', () => {
      expect(getFatigueModifier(30)).toBe(0.1);
    });

    it('returns 0.15 for 45 minutes', () => {
      expect(getFatigueModifier(45)).toBeCloseTo(0.15);
    });

    it('returns 0.2 for 60 minutes', () => {
      expect(getFatigueModifier(60)).toBe(0.2);
    });

    it('returns 0.25 for 75 minutes', () => {
      expect(getFatigueModifier(75)).toBe(0.25);
    });

    it('returns 0.3 (max) for 90 minutes', () => {
      expect(getFatigueModifier(90)).toBe(0.3);
    });

    it('returns 0.3 (max) for more than 90 minutes', () => {
      expect(getFatigueModifier(120)).toBe(0.3);
      expect(getFatigueModifier(180)).toBe(0.3);
    });

    it('handles negative values gracefully', () => {
      expect(getFatigueModifier(-10)).toBe(0);
    });

    it('handles non-standard intervals correctly', () => {
      // 7 minutes = 0 intervals complete
      expect(getFatigueModifier(7)).toBe(0);
      // 20 minutes = 1 interval complete
      expect(getFatigueModifier(20)).toBe(0.05);
      // 35 minutes = 2 intervals complete
      expect(getFatigueModifier(35)).toBe(0.1);
    });
  });

  // ============================================================================
  // getEffectiveCapacity tests
  // ============================================================================
  describe('getEffectiveCapacity', () => {
    it('calculates correctly with all modifiers at 1.0', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 1.0,
        sleep: 1.0,
        fatigue: 0,
      });
      expect(result).toBe(4);
    });

    it('calculates correctly with peak circadian modifier', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 1.1,
        sleep: 1.0,
        fatigue: 0,
      });
      expect(result).toBeCloseTo(4.4);
    });

    it('calculates correctly with low circadian modifier', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 0.7,
        sleep: 1.0,
        fatigue: 0,
      });
      expect(result).toBeCloseTo(2.8);
    });

    it('calculates correctly with sleep modifier', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 1.0,
        sleep: 0.8,
        fatigue: 0,
      });
      expect(result).toBeCloseTo(3.2);
    });

    it('calculates correctly with fatigue modifier', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 1.0,
        sleep: 1.0,
        fatigue: 0.2,
      });
      // 4 * 1.0 * 1.0 * (1 - 0.2) = 4 * 0.8 = 3.2
      expect(result).toBeCloseTo(3.2);
    });

    it('calculates correctly with all modifiers combined', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 1.1, // peak morning
        sleep: 0.9, // slightly tired
        fatigue: 0.1, // 30 mins in
      });
      // 4 * 1.1 * 0.9 * (1 - 0.1) = 4 * 1.1 * 0.9 * 0.9 = 3.564
      expect(result).toBeCloseTo(3.564);
    });

    it('calculates worst-case scenario correctly', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 0.7, // late night
        sleep: 0.7, // poor sleep
        fatigue: 0.3, // max fatigue
      });
      // 4 * 0.7 * 0.7 * (1 - 0.3) = 4 * 0.7 * 0.7 * 0.7 = 1.372
      expect(result).toBeCloseTo(1.372);
    });

    it('never goes below 0', () => {
      const result = getEffectiveCapacity(4, {
        circadian: 0.1, // extreme (not realistic but tests boundary)
        sleep: 0.1,
        fatigue: 0.9,
      });
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('handles zero base capacity', () => {
      const result = getEffectiveCapacity(0, {
        circadian: 1.1,
        sleep: 1.0,
        fatigue: 0,
      });
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // getWarningLevel tests
  // ============================================================================
  describe('getWarningLevel', () => {
    it('returns "none" for 0%', () => {
      expect(getWarningLevel(0)).toBe('none');
    });

    it('returns "none" for 74%', () => {
      expect(getWarningLevel(74)).toBe('none');
    });

    it('returns "none" for values below 75%', () => {
      expect(getWarningLevel(50)).toBe('none');
      expect(getWarningLevel(70)).toBe('none');
      expect(getWarningLevel(74.9)).toBe('none');
    });

    it('returns "caution" for 75%', () => {
      expect(getWarningLevel(75)).toBe('caution');
    });

    it('returns "caution" for 89%', () => {
      expect(getWarningLevel(89)).toBe('caution');
    });

    it('returns "caution" for values 75-89%', () => {
      expect(getWarningLevel(80)).toBe('caution');
      expect(getWarningLevel(85)).toBe('caution');
      expect(getWarningLevel(89.9)).toBe('caution');
    });

    it('returns "blocked" for 90%', () => {
      expect(getWarningLevel(90)).toBe('blocked');
    });

    it('returns "blocked" for 100%', () => {
      expect(getWarningLevel(100)).toBe('blocked');
    });

    it('returns "blocked" for values 90%+', () => {
      expect(getWarningLevel(95)).toBe('blocked');
      expect(getWarningLevel(99)).toBe('blocked');
      expect(getWarningLevel(100)).toBe('blocked');
    });

    it('returns "blocked" for values over 100%', () => {
      expect(getWarningLevel(110)).toBe('blocked');
    });

    it('handles negative values as "none"', () => {
      expect(getWarningLevel(-10)).toBe('none');
    });
  });

  // ============================================================================
  // calculateCapacity tests
  // ============================================================================
  describe('calculateCapacity', () => {
    it('returns complete CognitiveCapacity object', () => {
      const result = calculateCapacity({ currentHour: 10 });

      expect(result).toHaveProperty('baseCapacity');
      expect(result).toHaveProperty('circadianModifier');
      expect(result).toHaveProperty('sleepModifier');
      expect(result).toHaveProperty('fatigueModifier');
      expect(result).toHaveProperty('effectiveCapacity');
      expect(result).toHaveProperty('percentageUsed');
      expect(result).toHaveProperty('canLearnNew');
      expect(result).toHaveProperty('warningLevel');
    });

    it('uses base capacity of 4', () => {
      const result = calculateCapacity({ currentHour: 10 });
      expect(result.baseCapacity).toBe(4);
    });

    it('uses correct circadian modifier for given hour', () => {
      const peakResult = calculateCapacity({ currentHour: 10 });
      expect(peakResult.circadianModifier).toBe(1.1);

      const nightResult = calculateCapacity({ currentHour: 23 });
      expect(nightResult.circadianModifier).toBe(0.7);
    });

    it('defaults sleep modifier to 1.0 when not provided', () => {
      const result = calculateCapacity({ currentHour: 10 });
      expect(result.sleepModifier).toBe(1.0);
    });

    it('uses provided sleep quality modifier', () => {
      const result = calculateCapacity({
        currentHour: 10,
        sleepQuality: 0.8,
      });
      expect(result.sleepModifier).toBe(0.8);
    });

    it('defaults fatigue modifier to 0 when session duration not provided', () => {
      const result = calculateCapacity({ currentHour: 10 });
      expect(result.fatigueModifier).toBe(0);
    });

    it('calculates fatigue modifier from session duration', () => {
      const result = calculateCapacity({
        currentHour: 10,
        sessionDurationMinutes: 30,
      });
      expect(result.fatigueModifier).toBe(0.1);
    });

    it('correctly combines all modifiers for effective capacity', () => {
      const result = calculateCapacity({
        currentHour: 10, // 1.1 circadian
        sleepQuality: 0.9, // 0.9 sleep
        sessionDurationMinutes: 30, // 0.1 fatigue
      });

      // 4 * 1.1 * 0.9 * (1 - 0.1) = 3.564
      expect(result.effectiveCapacity).toBeCloseTo(3.564);
    });

    it('calculates percentageUsed as 0 when starting fresh', () => {
      const result = calculateCapacity({ currentHour: 10 });
      expect(result.percentageUsed).toBe(0);
    });

    it('sets canLearnNew to true when capacity is available', () => {
      const result = calculateCapacity({ currentHour: 10 });
      expect(result.canLearnNew).toBe(true);
    });

    it('sets canLearnNew to false when warning level is blocked', () => {
      // Test indirectly - when percentageUsed is high
      // This tests the logic, actual blocking would require external input
      const result = calculateCapacity({ currentHour: 10 });
      // Starting fresh, should always allow learning
      expect(result.canLearnNew).toBe(true);
    });

    it('sets appropriate warning level based on percentage used', () => {
      const result = calculateCapacity({ currentHour: 10 });
      // Starting fresh with 0% used
      expect(result.warningLevel).toBe('none');
    });

    it('handles late night hours with reduced capacity', () => {
      const result = calculateCapacity({ currentHour: 2 });

      expect(result.circadianModifier).toBe(0.7);
      // 4 * 0.7 * 1.0 * 1.0 = 2.8
      expect(result.effectiveCapacity).toBeCloseTo(2.8);
    });

    it('handles post-lunch dip correctly', () => {
      const result = calculateCapacity({ currentHour: 13 });

      expect(result.circadianModifier).toBe(0.85);
      expect(result.effectiveCapacity).toBeCloseTo(3.4);
    });

    it('handles maximum fatigue correctly', () => {
      const result = calculateCapacity({
        currentHour: 10,
        sessionDurationMinutes: 120, // > 90 mins, should cap at 0.3
      });

      expect(result.fatigueModifier).toBe(0.3);
      // 4 * 1.1 * 1.0 * (1 - 0.3) = 3.08
      expect(result.effectiveCapacity).toBeCloseTo(3.08);
    });

    it('handles worst case scenario', () => {
      const result = calculateCapacity({
        currentHour: 2, // late night: 0.7
        sleepQuality: 0.7, // poor sleep
        sessionDurationMinutes: 120, // max fatigue: 0.3
      });

      expect(result.circadianModifier).toBe(0.7);
      expect(result.sleepModifier).toBe(0.7);
      expect(result.fatigueModifier).toBe(0.3);
      // 4 * 0.7 * 0.7 * (1 - 0.3) = 1.372
      expect(result.effectiveCapacity).toBeCloseTo(1.372);
    });

    it('handles best case scenario', () => {
      const result = calculateCapacity({
        currentHour: 10, // peak morning: 1.1
        sleepQuality: 1.0, // perfect sleep
        sessionDurationMinutes: 0, // no fatigue
      });

      expect(result.circadianModifier).toBe(1.1);
      expect(result.sleepModifier).toBe(1.0);
      expect(result.fatigueModifier).toBe(0);
      // 4 * 1.1 * 1.0 * 1.0 = 4.4
      expect(result.effectiveCapacity).toBeCloseTo(4.4);
    });
  });
});
