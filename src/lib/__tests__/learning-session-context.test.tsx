/**
 * Learning Session Context Tests
 *
 * Tests for the learning session context provider:
 * - Provider renders children
 * - useLearningSession throws outside provider
 * - startSession initializes session correctly
 * - submitAnswer updates state and progress
 * - advanceToReveal transitions phase correctly
 * - advanceToNextItem moves to next item or completes session
 * - endSession resets all state
 * - getCurrentItem returns correct item
 * - isSessionActive returns correct status
 * - Progress tracking is accurate
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

import {
  LearningSessionProvider,
  useLearningSession,
  type LearningSessionContextValue,
} from '../learning-session-context';
import type { SessionItem } from '../../types/session';

/**
 * Helper to create mock session items
 */
function createMockItems(count: number = 3): SessionItem[] {
  return Array.from({ length: count }, (_, i) => ({
    type: i === 0 ? 'new' : 'review',
    concept_id: `concept-${i + 1}`,
    position: i,
  })) as SessionItem[];
}

/**
 * Wrapper component for testing hooks
 */
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <LearningSessionProvider>{children}</LearningSessionProvider>;
  };
}

describe('LearningSessionContext', () => {
  describe('LearningSessionProvider', () => {
    it('renders children correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      expect(result.current).toBeDefined();
    });

    it('provides initial state with null session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      expect(result.current.projectId).toBeNull();
      expect(result.current.items).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('question');
      expect(result.current.currentResponse).toBeNull();
      expect(result.current.responses).toEqual([]);
      expect(result.current.startTime).toBeNull();
      expect(result.current.progress).toEqual({
        current: 0,
        total: 0,
        newLearned: 0,
        reviewsCompleted: 0,
        correctCount: 0,
      });
    });
  });

  describe('useLearningSession hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLearningSession());
      }).toThrow('useLearningSession must be used within a LearningSessionProvider');

      consoleSpy.mockRestore();
    });

    it('provides context with expected shape', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      // State properties
      expect(result.current).toHaveProperty('projectId');
      expect(result.current).toHaveProperty('items');
      expect(result.current).toHaveProperty('currentIndex');
      expect(result.current).toHaveProperty('phase');
      expect(result.current).toHaveProperty('currentResponse');
      expect(result.current).toHaveProperty('responses');
      expect(result.current).toHaveProperty('startTime');
      expect(result.current).toHaveProperty('progress');

      // Action functions
      expect(typeof result.current.startSession).toBe('function');
      expect(typeof result.current.submitAnswer).toBe('function');
      expect(typeof result.current.advanceToReveal).toBe('function');
      expect(typeof result.current.advanceToNextItem).toBe('function');
      expect(typeof result.current.endSession).toBe('function');
      expect(typeof result.current.getCurrentItem).toBe('function');
      expect(typeof result.current.isSessionActive).toBe('function');
    });
  });

  describe('startSession', () => {
    it('initializes session with project ID and items', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.projectId).toBe('project-123');
      expect(result.current.items).toEqual(mockItems);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('question');
      expect(result.current.currentResponse).toBeNull();
      expect(result.current.responses).toEqual([]);
      expect(result.current.startTime).toBeInstanceOf(Date);
    });

    it('sets initial progress correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(5);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.progress).toEqual({
        current: 1,
        total: 5,
        newLearned: 0,
        reviewsCompleted: 0,
        correctCount: 0,
      });
    });

    it('resets previous session state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems1 = createMockItems(2);
      const mockItems2 = createMockItems(4);

      // Start first session and advance
      act(() => {
        result.current.startSession('project-1', mockItems1);
        result.current.submitAnswer('answer', true, 1000);
        result.current.advanceToNextItem();
      });

      // Start new session
      act(() => {
        result.current.startSession('project-2', mockItems2);
      });

      expect(result.current.projectId).toBe('project-2');
      expect(result.current.items).toEqual(mockItems2);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('question');
      expect(result.current.responses).toEqual([]);
      expect(result.current.progress.current).toBe(1);
      expect(result.current.progress.total).toBe(4);
    });
  });

  describe('submitAnswer', () => {
    it('sets current response with answer details', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      act(() => {
        result.current.submitAnswer('my answer', true, 1500);
      });

      expect(result.current.currentResponse).toEqual({
        answer: 'my answer',
        isCorrect: true,
        responseTimeMs: 1500,
      });
    });

    it('transitions to reveal phase', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.phase).toBe('question');

      act(() => {
        result.current.submitAnswer('my answer', true, 1500);
      });

      expect(result.current.phase).toBe('reveal');
    });

    it('increments correct count when answer is correct', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.progress.correctCount).toBe(0);

      act(() => {
        result.current.submitAnswer('correct answer', true, 1500);
      });

      expect(result.current.progress.correctCount).toBe(1);
    });

    it('does not increment correct count when answer is incorrect', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      act(() => {
        result.current.submitAnswer('wrong answer', false, 2000);
      });

      expect(result.current.progress.correctCount).toBe(0);
    });

    it('does nothing when no items in session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      act(() => {
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.currentResponse).toBeNull();
      expect(result.current.phase).toBe('question');
    });
  });

  describe('advanceToReveal', () => {
    it('transitions from question to reveal phase', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.phase).toBe('question');

      act(() => {
        result.current.advanceToReveal();
      });

      expect(result.current.phase).toBe('reveal');
    });

    it('does nothing when not in question phase', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.phase).toBe('reveal');

      act(() => {
        result.current.advanceToReveal();
      });

      // Should still be reveal, not changed
      expect(result.current.phase).toBe('reveal');
    });
  });

  describe('advanceToNextItem', () => {
    it('advances to next item and resets to question phase', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('reveal');

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.phase).toBe('question');
      expect(result.current.currentResponse).toBeNull();
    });

    it('updates progress current number', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.progress.current).toBe(1);

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.progress.current).toBe(2);
    });

    it('increments newLearned for new items', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems: SessionItem[] = [
        { type: 'new', concept_id: 'concept-1', position: 0 },
        { type: 'review', concept_id: 'concept-2', position: 1 },
      ];

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.progress.newLearned).toBe(0);

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.progress.newLearned).toBe(1);
    });

    it('increments reviewsCompleted for review items', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems: SessionItem[] = [
        { type: 'review', concept_id: 'concept-1', position: 0 },
        { type: 'new', concept_id: 'concept-2', position: 1 },
      ];

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.progress.reviewsCompleted).toBe(0);

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.progress.reviewsCompleted).toBe(1);
    });

    it('accumulates responses when advancing', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer 1', true, 1000);
      });

      expect(result.current.responses).toHaveLength(0);

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.responses).toHaveLength(1);
      expect(result.current.responses[0].user_response).toBe('answer 1');
      expect(result.current.responses[0].is_correct).toBe(true);
      expect(result.current.responses[0].concept_id).toBe('concept-1');
    });

    it('transitions to complete phase on last item', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(2);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer 1', true, 1000);
        result.current.advanceToNextItem();
        result.current.submitAnswer('answer 2', false, 2000);
      });

      expect(result.current.phase).toBe('reveal');

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.phase).toBe('complete');
      expect(result.current.responses).toHaveLength(2);
    });

    it('does nothing when no items', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('question');
    });
  });

  describe('endSession', () => {
    it('resets all state to initial values', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      // Build up some state
      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
        result.current.advanceToNextItem();
      });

      // Verify state was built up
      expect(result.current.projectId).toBe('project-123');
      expect(result.current.responses).toHaveLength(1);

      // End session
      act(() => {
        result.current.endSession();
      });

      // Verify reset
      expect(result.current.projectId).toBeNull();
      expect(result.current.items).toEqual([]);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.phase).toBe('question');
      expect(result.current.currentResponse).toBeNull();
      expect(result.current.responses).toEqual([]);
      expect(result.current.startTime).toBeNull();
      expect(result.current.progress).toEqual({
        current: 0,
        total: 0,
        newLearned: 0,
        reviewsCompleted: 0,
        correctCount: 0,
      });
    });
  });

  describe('getCurrentItem', () => {
    it('returns null when no session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      expect(result.current.getCurrentItem()).toBeNull();
    });

    it('returns current item during session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.getCurrentItem()).toEqual(mockItems[0]);
    });

    it('returns correct item after advancing', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
        result.current.advanceToNextItem();
      });

      expect(result.current.getCurrentItem()).toEqual(mockItems[1]);
    });
  });

  describe('isSessionActive', () => {
    it('returns false when no session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });

      expect(result.current.isSessionActive()).toBe(false);
    });

    it('returns true during active session', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.isSessionActive()).toBe(true);
    });

    it('returns true in reveal phase', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
      });

      expect(result.current.phase).toBe('reveal');
      expect(result.current.isSessionActive()).toBe(true);
    });

    it('returns false when session is complete', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(1);

      act(() => {
        result.current.startSession('project-123', mockItems);
        result.current.submitAnswer('answer', true, 1000);
        result.current.advanceToNextItem();
      });

      expect(result.current.phase).toBe('complete');
      expect(result.current.isSessionActive()).toBe(false);
    });

    it('returns false after endSession', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems = createMockItems(3);

      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.isSessionActive()).toBe(true);

      act(() => {
        result.current.endSession();
      });

      expect(result.current.isSessionActive()).toBe(false);
    });
  });

  describe('full session flow', () => {
    it('completes a full session with multiple items', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLearningSession(), { wrapper });
      const mockItems: SessionItem[] = [
        { type: 'new', concept_id: 'concept-1', position: 0 },
        { type: 'review', concept_id: 'concept-2', position: 1 },
        { type: 'new', concept_id: 'concept-3', position: 2 },
      ];

      // Start session
      act(() => {
        result.current.startSession('project-123', mockItems);
      });

      expect(result.current.isSessionActive()).toBe(true);
      expect(result.current.progress.total).toBe(3);

      // Answer first item (new - correct)
      act(() => {
        result.current.submitAnswer('answer 1', true, 1000);
      });
      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.progress.current).toBe(2);
      expect(result.current.progress.newLearned).toBe(1);
      expect(result.current.progress.correctCount).toBe(1);

      // Answer second item (review - incorrect)
      act(() => {
        result.current.submitAnswer('answer 2', false, 2000);
      });
      act(() => {
        result.current.advanceToNextItem();
      });

      expect(result.current.progress.current).toBe(3);
      expect(result.current.progress.reviewsCompleted).toBe(1);
      expect(result.current.progress.correctCount).toBe(1); // Still 1

      // Answer third item (new - correct)
      act(() => {
        result.current.submitAnswer('answer 3', true, 1500);
      });
      act(() => {
        result.current.advanceToNextItem();
      });

      // Session complete
      expect(result.current.phase).toBe('complete');
      expect(result.current.isSessionActive()).toBe(false);
      expect(result.current.progress.newLearned).toBe(2);
      expect(result.current.progress.reviewsCompleted).toBe(1);
      expect(result.current.progress.correctCount).toBe(2);
      expect(result.current.responses).toHaveLength(3);
    });
  });
});
