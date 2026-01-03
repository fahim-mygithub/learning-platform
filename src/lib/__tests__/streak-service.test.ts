/**
 * Streak Service Tests
 *
 * Tests for streak tracking operations with mocked Supabase client.
 */

import { supabase } from '../supabase';
import {
  createStreakService,
  getDefaultStreakService,
  resetDefaultStreakService,
  StreakServiceError,
  type StreakService,
} from '../streak-service';
import type { UserStreak } from '../../types/engagement';

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

// Mock streak data
const mockStreakRow = {
  user_id: 'user-123',
  current_streak: 5,
  longest_streak: 10,
  last_activity_date: '2024-01-15',
  streak_freeze_available: true,
};

const mockUserStreak: UserStreak = {
  userId: 'user-123',
  currentStreak: 5,
  longestStreak: 10,
  lastActivityDate: '2024-01-15',
  streakFreezeAvailable: true,
};

describe('streak-service', () => {
  let service: StreakService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultStreakService();
    service = createStreakService();
  });

  describe('createStreakService', () => {
    it('creates a service instance with required methods', () => {
      expect(service).toBeDefined();
      expect(typeof service.getStreak).toBe('function');
      expect(typeof service.recordActivity).toBe('function');
      expect(typeof service.checkStreakHealth).toBe('function');
    });
  });

  describe('getStreak', () => {
    it('returns streak data for existing user', async () => {
      const mockChain = createMockChain({ data: mockStreakRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getStreak('user-123');

      expect(supabase.from).toHaveBeenCalledWith('user_streaks');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result).toEqual(mockUserStreak);
    });

    it('returns default streak for new user (no row exists)', async () => {
      const noRowError = { code: 'PGRST116', message: 'No rows returned' };
      const mockChain = createMockChain({ data: null, error: noRowError as unknown as Error });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getStreak('new-user');

      expect(result).toEqual({
        userId: 'new-user',
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakFreezeAvailable: true,
      });
    });

    it('throws StreakServiceError on database error', async () => {
      const dbError = new Error('Database connection failed');
      const mockChain = createMockChain({ data: null, error: dbError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(service.getStreak('user-123')).rejects.toThrow(StreakServiceError);
      await expect(service.getStreak('user-123')).rejects.toThrow('Failed to fetch streak');
    });

    it('handles null streak_freeze_available', async () => {
      const mockChain = createMockChain({
        data: { ...mockStreakRow, streak_freeze_available: null },
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.getStreak('user-123');

      expect(result.streakFreezeAvailable).toBe(true);
    });
  });

  describe('recordActivity', () => {
    it('calls update_streak RPC and returns result', async () => {
      const mockRPCResult = {
        current_streak: 6,
        longest_streak: 10,
        is_new_day: true,
      };
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockRPCResult, error: null });

      const result = await service.recordActivity('user-123');

      expect(supabase.rpc).toHaveBeenCalledWith('update_streak', {
        p_user_id: 'user-123',
      });
      expect(result).toEqual({
        currentStreak: 6,
        longestStreak: 10,
        isNewDay: true,
      });
    });

    it('fetches streak when RPC returns null data', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

      const mockChain = createMockChain({ data: mockStreakRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.recordActivity('user-123');

      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 10,
        isNewDay: false,
      });
    });

    it('throws StreakServiceError on RPC failure', async () => {
      const rpcError = new Error('RPC function failed');
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: rpcError });

      await expect(service.recordActivity('user-123')).rejects.toThrow(StreakServiceError);
      await expect(service.recordActivity('user-123')).rejects.toThrow('Failed to record activity');
    });

    it('handles partial RPC response data', async () => {
      const partialResult = {
        current_streak: 3,
        // longest_streak and is_new_day are missing
      };
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: partialResult, error: null });

      const result = await service.recordActivity('user-123');

      expect(result).toEqual({
        currentStreak: 3,
        longestStreak: 0,
        isNewDay: false,
      });
    });
  });

  describe('checkStreakHealth', () => {
    beforeEach(() => {
      // Mock Date to a fixed date for consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns active streak for activity today', async () => {
      const todayStreak = { ...mockStreakRow, last_activity_date: '2024-01-15' };
      const mockChain = createMockChain({ data: todayStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result).toEqual({
        isActive: true,
        wasReset: false,
        daysUntilExpiry: 2,
      });
    });

    it('returns active streak for activity yesterday', async () => {
      const yesterdayStreak = { ...mockStreakRow, last_activity_date: '2024-01-14' };
      const mockChain = createMockChain({ data: yesterdayStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result).toEqual({
        isActive: true,
        wasReset: false,
        daysUntilExpiry: 1,
      });
    });

    it('returns inactive/reset for activity 2+ days ago', async () => {
      const oldStreak = { ...mockStreakRow, last_activity_date: '2024-01-13' };
      const mockChain = createMockChain({ data: oldStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result).toEqual({
        isActive: false,
        wasReset: true,
        daysUntilExpiry: 0,
      });
    });

    it('returns not active for null last activity date', async () => {
      const newUserStreak = { ...mockStreakRow, last_activity_date: null, current_streak: 0 };
      const mockChain = createMockChain({ data: newUserStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result).toEqual({
        isActive: false,
        wasReset: false,
        daysUntilExpiry: 0,
      });
    });

    it('wasReset is true only if user had a streak before', async () => {
      const noStreakUser = {
        ...mockStreakRow,
        last_activity_date: '2024-01-10',
        current_streak: 0,
        longest_streak: 0,
      };
      const mockChain = createMockChain({ data: noStreakUser, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result.wasReset).toBe(false);
    });
  });

  describe('getDefaultStreakService', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = getDefaultStreakService();
      const instance2 = getDefaultStreakService();

      expect(instance1).toBe(instance2);
    });

    it('returns new instance after reset', () => {
      const instance1 = getDefaultStreakService();
      resetDefaultStreakService();
      const instance2 = getDefaultStreakService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('StreakServiceError', () => {
    it('has correct name and properties', () => {
      const cause = new Error('Original error');
      const error = new StreakServiceError('Test error', 'FETCH_FAILED', cause);

      expect(error.name).toBe('StreakServiceError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('FETCH_FAILED');
      expect(error.cause).toBe(cause);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles timezone edge cases correctly', async () => {
      // Test with UTC midnight boundary
      jest.setSystemTime(new Date('2024-01-15T00:00:00.000Z'));

      const yesterdayStreak = { ...mockStreakRow, last_activity_date: '2024-01-14' };
      const mockChain = createMockChain({ data: yesterdayStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      // At UTC midnight, yesterday's activity should still count
      expect(result.isActive).toBe(true);
      expect(result.daysUntilExpiry).toBe(1);
    });

    it('handles late night edge case', async () => {
      // Test with UTC late night (23:59)
      jest.setSystemTime(new Date('2024-01-15T23:59:59.999Z'));

      const todayStreak = { ...mockStreakRow, last_activity_date: '2024-01-15' };
      const mockChain = createMockChain({ data: todayStreak, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await service.checkStreakHealth('user-123');

      expect(result.isActive).toBe(true);
      expect(result.daysUntilExpiry).toBe(2);
    });

    it('handles empty user id', async () => {
      const mockChain = createMockChain({ data: mockStreakRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await service.getStreak('');

      expect(mockChain.eq).toHaveBeenCalledWith('user_id', '');
    });
  });
});
