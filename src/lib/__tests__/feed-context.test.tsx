/**
 * Feed Context Tests
 *
 * Tests for the feed context provider, focusing on:
 * - completeSynthesis wiring to mastery evaluation and XP service
 * - Session state management (sessionComplete, masterySummary)
 */

import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { CompletedInteraction, MasterySummary } from '../mastery-evaluation-service';
import type { XPAwardResult } from '../../types/engagement';

// Create stable mock references before mocking modules
const mockMasterySummary: MasterySummary = {
  correctCount: 3,
  totalCount: 4,
  scorePercentage: 75,
  conceptsMastered: [
    { conceptId: 'concept-1', conceptName: 'Test Concept 1', status: 'mastered', attemptCount: 1 },
  ],
  conceptsNeedingReview: [
    { conceptId: 'concept-2', conceptName: 'Test Concept 2', status: 'reinforced', attemptCount: 2 },
  ],
  xpRecommendation: 125,
};

// XP Service mock functions
const mockAwardXP = jest.fn().mockResolvedValue({
  newTotalXp: 100,
  newLevel: 1,
  levelUp: false,
  amountAwarded: 75,
} as XPAwardResult);

const mockGetUserXP = jest.fn().mockResolvedValue({
  userId: 'user-123',
  totalXp: 25,
  weeklyXp: 25,
  level: 1,
});

// Mastery evaluation mock
const mockEvaluate = jest.fn().mockReturnValue(mockMasterySummary);

// Streak service mocks
const mockGetStreak = jest.fn().mockResolvedValue({
  userId: 'user-123',
  currentStreak: 5,
  longestStreak: 10,
  lastActivityDate: new Date().toISOString(),
  streakFreezeAvailable: true,
});

const mockRecordActivity = jest.fn().mockResolvedValue({
  currentStreak: 6,
  longestStreak: 10,
  isNewDay: true,
});

// Mock Supabase with stable chains
jest.mock('../supabase', () => {
  const createChain = () => {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'concept-1',
          name: 'Test Concept 1',
          chapter_sequence: 1,
          start_timestamp: 0,
          end_timestamp: 60,
        },
      ],
      error: null,
    });
    chain.single = jest.fn().mockResolvedValue({
      data: {
        project_id: 'project-1',
        url: 'https://youtube.com/watch?v=test',
        type: 'url',
        metadata: null,
      },
      error: null,
    });
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    return chain;
  };

  const chain = createChain();

  return {
    supabase: {
      from: jest.fn(() => chain),
      rpc: jest.fn().mockResolvedValue({
        data: { new_total_xp: 100, new_level: 1 },
        error: null,
      }),
    },
  };
});

// Mock auth context with stable user reference
const mockUser = { id: 'user-123' };
jest.mock('../auth-context', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
  })),
}));

// Mock XP service
jest.mock('../xp-service', () => ({
  createXPService: jest.fn(() => ({
    awardXP: mockAwardXP,
    getUserXP: mockGetUserXP,
    selectRandomXP: jest.fn().mockReturnValue(75),
    calculateLevel: jest.fn().mockReturnValue(1),
  })),
}));

// Mock mastery evaluation service
jest.mock('../mastery-evaluation-service', () => ({
  createMasteryEvaluationService: jest.fn(() => ({
    evaluate: mockEvaluate,
  })),
}));

// Mock streak service
jest.mock('../streak-service', () => ({
  createStreakService: jest.fn(() => ({
    getStreak: mockGetStreak,
    recordActivity: mockRecordActivity,
  })),
}));

// Mock session timer service
jest.mock('../session-timer-service', () => ({
  createSessionTimerService: jest.fn(() => ({
    getElapsedMinutes: jest.fn().mockReturnValue(5),
    shouldSuggestBreak: jest.fn().mockReturnValue(false),
    markBreakSuggested: jest.fn(),
    resetTimer: jest.fn(),
  })),
}));

// Mock feed builder service with stable result
const mockFeedItems = [
  {
    id: 'video-1',
    type: 'video_chunk',
    conceptId: 'concept-1',
    startSec: 0,
    endSec: 60,
    title: 'Test Concept 1',
  },
  {
    id: 'quiz-1',
    type: 'quiz',
    conceptId: 'concept-1',
    question: {
      question_text: 'Test question?',
      question_type: 'mcq',
      correct_answer: 'A',
      options: ['A', 'B', 'C', 'D'],
    },
  },
];

jest.mock('../feed-builder-service', () => ({
  createFeedBuilderService: jest.fn(() => ({
    buildFeed: jest.fn().mockReturnValue(mockFeedItems),
    buildTextFeed: jest.fn().mockReturnValue([]),
  })),
}));

// Import after all mocks are set up
import { FeedProvider, useFeed } from '../feed-context';

// Helper to create wrapper component
const createWrapper = (sourceId: string) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <FeedProvider sourceId={sourceId}>{children}</FeedProvider>;
  };
};

describe('feed-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('FeedContextValue interface', () => {
    it('includes completeSynthesis that accepts CompletedInteraction array', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      // Advance timers to allow effects to run
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Verify completeSynthesis exists and is a function
      expect(typeof result.current.completeSynthesis).toBe('function');
    });

    it('includes sessionComplete boolean initialized to false', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.sessionComplete).toBe(false);
    });

    it('includes masterySummary initialized to null', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.masterySummary).toBeNull();
    });
  });

  describe('completeSynthesis with interactions', () => {
    it('calls mastery evaluation service with completed interactions', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
        {
          id: 'int-2',
          conceptId: 'concept-2',
          conceptName: 'Test Concept 2',
          isCorrect: true,
          attemptCount: 2,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      expect(mockEvaluate).toHaveBeenCalledWith(mockInteractions);
    });

    it('sets sessionComplete to true after completion', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.sessionComplete).toBe(true);
    });

    it('sets masterySummary from evaluation result', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.masterySummary).toEqual(mockMasterySummary);
    });

    it('awards XP based on synthesis completion', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      // Verify XP service was called with synthesis_complete reason
      expect(mockAwardXP).toHaveBeenCalledWith('user-123', 'synthesis_complete');
    });

    it('updates session stats with XP earned', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const initialXpEarned = result.current.sessionStats.xpEarned;

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      // XP should be increased (mockAwardXP returns 75 XP)
      expect(result.current.sessionStats.xpEarned).toBeGreaterThan(initialXpEarned);
    });

    it('increments synthesisCount in session stats', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      const initialSynthesisCount = result.current.sessionStats.synthesisCount || 0;

      const mockInteractions: CompletedInteraction[] = [
        {
          id: 'int-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept 1',
          isCorrect: true,
          attemptCount: 1,
        },
      ];

      await act(async () => {
        await result.current.completeSynthesis(mockInteractions);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.sessionStats.synthesisCount).toBe(initialSynthesisCount + 1);
    });

    it('handles evaluation error gracefully', async () => {
      // Mock evaluate to throw for this test
      mockEvaluate.mockImplementationOnce(() => {
        throw new Error('No interactions to evaluate');
      });

      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Should not throw, just handle gracefully
      await act(async () => {
        await result.current.completeSynthesis([]);
        jest.advanceTimersByTime(100);
      });

      // Session should not be marked complete on error
      expect(result.current.sessionComplete).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('still supports legacy completeSynthesis(itemId, response) signature', async () => {
      const wrapper = createWrapper('source-1');
      const { result } = renderHook(() => useFeed(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Clear previous calls
      mockAwardXP.mockClear();

      // Legacy call should still work (calls with itemId and response)
      await act(async () => {
        // Type assertion for legacy signature
        const legacyCall = result.current.completeSynthesis as unknown as (
          itemId: string,
          response: string
        ) => Promise<void>;
        await legacyCall('item-1', 'some response');
        jest.advanceTimersByTime(100);
      });

      // Should still award XP
      expect(mockAwardXP).toHaveBeenCalled();
    });
  });
});
