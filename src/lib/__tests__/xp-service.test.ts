/**
 * XP Service Tests
 *
 * Tests for XP and leveling operations with mocked Supabase client.
 */

import { supabase } from '../supabase';
import {
  createXPService,
  getDefaultXPService,
  resetDefaultXPService,
  XPServiceError,
  type XPService,
} from '../xp-service';
import { selectXPAmount } from '../../types/engagement';
import { XP_REWARDS, calculateLevel } from '../../types/engagement';
import type { UserXP, XPReason } from '../../types/engagement';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Helper to create mock chain for from() queries
function createMockChain(finalResult: { data: unknown; error: Error | null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  };
  return chain;
}

// Mock XP data
const mockXPRow = {
  user_id: 'user-123',
  total_xp: 500,
  weekly_xp: 100,
  level: 3,
};

const mockUserXP: UserXP = {
  userId: 'user-123',
  totalXp: 500,
  weeklyXp: 100,
  level: 3,
};

describe('xp-service', () => {
  let service: XPService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultXPService();
    service = createXPService();
  });

  describe('selectXPAmount (from engagement.ts)', () => {
    it('returns values within the configured amounts for quiz_correct', () => {
      for (let i = 0; i < 100; i++) {
        const result = selectXPAmount('quiz_correct');
        expect(XP_REWARDS.quiz_correct.amounts).toContain(result);
      }
    });

    it('respects weight distribution (statistical test)', () => {
      // quiz_correct has [10, 15, 25, 50] with weights [60, 25, 10, 5]
      // So 10 should appear ~60% of the time
      const counts: Record<number, number> = { 10: 0, 15: 0, 25: 0, 50: 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = selectXPAmount('quiz_correct');
        counts[result]++;
      }

      // With 60% expected for 10, allow for statistical variance (50-70% range)
      const ratio10 = counts[10] / iterations;
      expect(ratio10).toBeGreaterThan(0.5);
      expect(ratio10).toBeLessThan(0.75);
    });

    it('returns values for all XP reasons', () => {
      const reasons: XPReason[] = [
        'quiz_correct',
        'synthesis_complete',
        'chapter_complete',
        'streak_bonus',
        'perfect_score',
      ];

      reasons.forEach((reason) => {
        const result = selectXPAmount(reason);
        expect(XP_REWARDS[reason].amounts).toContain(result);
      });
    });
  });

  describe('createXPService', () => {
    it('creates a service instance with required methods', () => {
      expect(service).toBeDefined();
      expect(typeof service.selectRandomXP).toBe('function');
      expect(typeof service.awardXP).toBe('function');
      expect(typeof service.getUserXP).toBe('function');
      expect(typeof service.calculateLevel).toBe('function');
    });
  });

  describe('selectRandomXP', () => {
    it('returns valid XP amount for quiz_correct', () => {
      const xp = service.selectRandomXP('quiz_correct');
      expect(XP_REWARDS.quiz_correct.amounts).toContain(xp);
    });

    it('returns valid XP amount for synthesis_complete', () => {
      const xp = service.selectRandomXP('synthesis_complete');
      expect(XP_REWARDS.synthesis_complete.amounts).toContain(xp);
    });

    it('returns valid XP amount for chapter_complete', () => {
      const xp = service.selectRandomXP('chapter_complete');
      expect(XP_REWARDS.chapter_complete.amounts).toContain(xp);
    });

    it('returns valid XP amount for streak_bonus', () => {
      const xp = service.selectRandomXP('streak_bonus');
      expect(XP_REWARDS.streak_bonus.amounts).toContain(xp);
    });

    it('returns valid XP amount for perfect_score', () => {
      const xp = service.selectRandomXP('perfect_score');
      expect(XP_REWARDS.perfect_score.amounts).toContain(xp);
    });

    it('throws error for invalid reason', () => {
      expect(() => service.selectRandomXP('invalid_reason' as XPReason)).toThrow(XPServiceError);
      expect(() => service.selectRandomXP('invalid_reason' as XPReason)).toThrow('Invalid XP reason');
    });
  });

  describe('getUserXP', () => {
    it('returns XP data for existing user', async () => {
      const mockChain = createMockChain({ data: mockXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getUserXP('user-123');

      expect(supabase.from).toHaveBeenCalledWith('user_xp');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result).toEqual(mockUserXP);
    });

    it('returns default XP for new user (no row exists)', async () => {
      const noRowError = { code: 'PGRST116', message: 'No rows returned' };
      const mockChain = createMockChain({ data: null, error: noRowError as unknown as Error });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getUserXP('new-user');

      expect(result).toEqual({
        userId: 'new-user',
        totalXp: 0,
        weeklyXp: 0,
        level: 1,
      });
    });

    it('throws XPServiceError on database error', async () => {
      const dbError = new Error('Database connection failed');
      const mockChain = createMockChain({ data: null, error: dbError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(service.getUserXP('user-123')).rejects.toThrow(XPServiceError);
      await expect(service.getUserXP('user-123')).rejects.toThrow('Failed to fetch XP');
    });

    it('handles null weekly_xp', async () => {
      const mockChain = createMockChain({
        data: { ...mockXPRow, weekly_xp: null },
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getUserXP('user-123');

      expect(result.weeklyXp).toBe(0);
    });

    it('calculates level if not provided', async () => {
      const mockChain = createMockChain({
        data: { ...mockXPRow, level: null, total_xp: 400 },
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getUserXP('user-123');

      // calculateLevel(400) = floor(sqrt(400/100)) + 1 = floor(2) + 1 = 3
      expect(result.level).toBe(3);
    });
  });

  describe('awardXP', () => {
    it('awards XP and returns result with level up detection', async () => {
      // Setup: user has 99 XP (level 1), about to get 10 XP (level 2 at 100)
      const currentXPRow = { ...mockXPRow, total_xp: 99, level: 1 };
      const mockChain = createMockChain({ data: currentXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      // Mock selectRandomXP to return 10
      jest.spyOn(service, 'selectRandomXP').mockReturnValue(10);

      // Mock RPC response
      const mockRPCResult = {
        new_total_xp: 109,
        new_level: 2,
      };
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockRPCResult, error: null });

      const result = await service.awardXP('user-123', 'quiz_correct', 'concept-456');

      expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
        p_user_id: 'user-123',
        p_amount: 10,
        p_reason: 'quiz_correct',
        p_concept_id: 'concept-456',
      });
      expect(result.amountAwarded).toBe(10);
      expect(result.newTotalXp).toBe(109);
      expect(result.newLevel).toBe(2);
      expect(result.levelUp).toBe(true);
    });

    it('detects no level up when staying at same level', async () => {
      const currentXPRow = { ...mockXPRow, total_xp: 150, level: 2 };
      const mockChain = createMockChain({ data: currentXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(15);

      const mockRPCResult = {
        new_total_xp: 165,
        new_level: 2,
      };
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockRPCResult, error: null });

      const result = await service.awardXP('user-123', 'chapter_complete');

      expect(result.levelUp).toBe(false);
    });

    it('handles null concept_id', async () => {
      const mockChain = createMockChain({ data: mockXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(10);
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: { new_total_xp: 510 }, error: null });

      await service.awardXP('user-123', 'quiz_correct');

      expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
        p_user_id: 'user-123',
        p_amount: 10,
        p_reason: 'quiz_correct',
        p_concept_id: null,
      });
    });

    it('throws XPServiceError on RPC failure', async () => {
      const mockChain = createMockChain({ data: mockXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(10);

      const rpcError = new Error('RPC function failed');
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: rpcError });

      await expect(service.awardXP('user-123', 'quiz_correct')).rejects.toThrow(XPServiceError);
      await expect(service.awardXP('user-123', 'quiz_correct')).rejects.toThrow('Failed to award XP');
    });

    it('calculates new XP locally when RPC returns null', async () => {
      const currentXPRow = { ...mockXPRow, total_xp: 500, level: 3 };
      const mockChain = createMockChain({ data: currentXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(25);
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const result = await service.awardXP('user-123', 'quiz_correct');

      // Should calculate locally: 500 + 25 = 525
      expect(result.newTotalXp).toBe(525);
      expect(result.amountAwarded).toBe(25);
    });

    it('uses customAmount when provided instead of random selection', async () => {
      const currentXPRow = { ...mockXPRow, total_xp: 500, level: 3 };
      const mockChain = createMockChain({ data: currentXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const selectRandomSpy = jest.spyOn(service, 'selectRandomXP');
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { new_total_xp: 625, new_level: 3 },
        error: null,
      });

      const customXP = 125; // From mastery evaluation xpRecommendation
      const result = await service.awardXP('user-123', 'synthesis_complete', undefined, customXP);

      expect(selectRandomSpy).not.toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
        p_user_id: 'user-123',
        p_amount: 125,
        p_reason: 'synthesis_complete',
        p_concept_id: null,
      });
      expect(result.amountAwarded).toBe(125);
      expect(result.newTotalXp).toBe(625);
    });

    it('falls back to random selection when customAmount is not provided', async () => {
      const currentXPRow = { ...mockXPRow, total_xp: 500, level: 3 };
      const mockChain = createMockChain({ data: currentXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(75);
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { new_total_xp: 575, new_level: 3 },
        error: null,
      });

      const result = await service.awardXP('user-123', 'synthesis_complete');

      expect(service.selectRandomXP).toHaveBeenCalledWith('synthesis_complete');
      expect(result.amountAwarded).toBe(75);
    });
  });

  describe('calculateLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(service.calculateLevel(0)).toBe(1);
    });

    it('returns level 1 for 99 XP', () => {
      expect(service.calculateLevel(99)).toBe(1);
    });

    it('returns level 2 for 100 XP', () => {
      expect(service.calculateLevel(100)).toBe(2);
    });

    it('returns level 2 for 399 XP', () => {
      expect(service.calculateLevel(399)).toBe(2);
    });

    it('returns level 3 for 400 XP', () => {
      expect(service.calculateLevel(400)).toBe(3);
    });

    it('returns level 4 for 900 XP', () => {
      expect(service.calculateLevel(900)).toBe(4);
    });

    it('matches the engagement.ts calculateLevel function', () => {
      const testValues = [0, 50, 99, 100, 200, 399, 400, 500, 899, 900, 1000, 5000, 10000];

      testValues.forEach((xp) => {
        expect(service.calculateLevel(xp)).toBe(calculateLevel(xp));
      });
    });

    it('handles zero XP edge case', () => {
      // Zero XP should still be level 1
      expect(service.calculateLevel(0)).toBe(1);
    });

    it('handles very large XP values', () => {
      // 1,000,000 XP should be level 101
      expect(service.calculateLevel(1000000)).toBe(101);
    });
  });

  describe('getDefaultXPService', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = getDefaultXPService();
      const instance2 = getDefaultXPService();

      expect(instance1).toBe(instance2);
    });

    it('returns new instance after reset', () => {
      const instance1 = getDefaultXPService();
      resetDefaultXPService();
      const instance2 = getDefaultXPService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('XPServiceError', () => {
    it('has correct name and properties', () => {
      const cause = new Error('Original error');
      const error = new XPServiceError('Test error', 'FETCH_FAILED', cause);

      expect(error.name).toBe('XPServiceError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('FETCH_FAILED');
      expect(error.cause).toBe(cause);
    });
  });

  describe('XP distribution verification', () => {
    it('quiz_correct has correct possible values', () => {
      expect(XP_REWARDS.quiz_correct.amounts).toEqual([10, 15, 25, 50]);
      expect(XP_REWARDS.quiz_correct.weights).toEqual([60, 25, 10, 5]);
    });

    it('synthesis_complete has correct possible values', () => {
      expect(XP_REWARDS.synthesis_complete.amounts).toEqual([50, 75, 100]);
      expect(XP_REWARDS.synthesis_complete.weights).toEqual([50, 35, 15]);
    });

    it('chapter_complete has correct possible values', () => {
      expect(XP_REWARDS.chapter_complete.amounts).toEqual([15, 20]);
      expect(XP_REWARDS.chapter_complete.weights).toEqual([70, 30]);
    });

    it('streak_bonus has correct possible values', () => {
      expect(XP_REWARDS.streak_bonus.amounts).toEqual([25, 50]);
      expect(XP_REWARDS.streak_bonus.weights).toEqual([70, 30]);
    });

    it('perfect_score has correct possible values', () => {
      expect(XP_REWARDS.perfect_score.amounts).toEqual([100]);
      expect(XP_REWARDS.perfect_score.weights).toEqual([100]);
    });
  });

  describe('edge cases', () => {
    it('handles concurrent XP awards', async () => {
      const mockChain = createMockChain({ data: mockXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(10);
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { new_total_xp: 510, new_level: 3 },
        error: null,
      });

      // Fire multiple awards simultaneously
      const results = await Promise.all([
        service.awardXP('user-123', 'quiz_correct'),
        service.awardXP('user-123', 'quiz_correct'),
        service.awardXP('user-123', 'quiz_correct'),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.amountAwarded).toBe(10);
      });
    });

    it('handles XP at level boundary', async () => {
      // User exactly at level boundary (400 XP = level 3)
      const boundaryXPRow = { ...mockXPRow, total_xp: 400, level: 3 };
      const mockChain = createMockChain({ data: boundaryXPRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      jest.spyOn(service, 'selectRandomXP').mockReturnValue(1);
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { new_total_xp: 401, new_level: 3 },
        error: null,
      });

      const result = await service.awardXP('user-123', 'quiz_correct');

      expect(result.levelUp).toBe(false);
      expect(result.newLevel).toBe(3);
    });
  });
});
