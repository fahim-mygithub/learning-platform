/**
 * Prerequisite Context Tests
 *
 * Tests for the prerequisite context provider:
 * - Provider renders children
 * - usePrerequisite throws outside provider
 * - checkPrerequisites loads prerequisites
 * - startPretest generates questions and sets status
 * - skipPretest sets status and skip flag
 * - submitAnswer records response
 * - completePretest analyzes gaps
 * - startMiniLesson loads/caches lesson
 * - completeMiniLesson marks as done
 * - proceedToLearning clears current lesson
 * - reset clears all state
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import {
  PrerequisiteProvider,
  usePrerequisite,
  type PrerequisiteService,
  type PrerequisiteContextValue,
} from '../prerequisite-context';
import type { Prerequisite, PretestQuestion, MiniLesson } from '../../types/prerequisite';
import type { GapAnalysisResult } from '../prerequisite-assessment-service';

/**
 * Mock data factories
 */
function createMockPrerequisite(overrides: Partial<Prerequisite> = {}): Prerequisite {
  return {
    id: 'prereq-1',
    project_id: 'project-1',
    name: 'Basic Algebra',
    description: 'Understanding of algebraic operations',
    source: 'ai_inferred',
    confidence: 0.9,
    domain: 'mathematics',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockQuestion(overrides: Partial<PretestQuestion> = {}): PretestQuestion {
  return {
    id: 'question-1',
    prerequisite_id: 'prereq-1',
    question_text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct_index: 1,
    explanation: '2 + 2 equals 4',
    difficulty: 'basic',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockMiniLesson(overrides: Partial<MiniLesson> = {}): MiniLesson {
  return {
    id: 'lesson-1',
    prerequisite_id: 'prereq-1',
    title: 'Introduction to Algebra',
    content_markdown: 'Algebra is a branch of mathematics...',
    key_points: ['Variables represent unknown values', 'Equations can be solved'],
    estimated_minutes: 3,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockGapAnalysis(overrides: Partial<GapAnalysisResult> = {}): GapAnalysisResult {
  return {
    totalPrerequisites: 2,
    correct: 1,
    percentage: 50,
    gaps: [createMockPrerequisite({ id: 'prereq-2', name: 'Basic Calculus' })],
    recommendation: 'review_suggested',
    ...overrides,
  };
}

/**
 * Create mock service
 */
function createMockService(overrides: Partial<PrerequisiteService> = {}): PrerequisiteService {
  return {
    getPrerequisites: jest.fn().mockResolvedValue([createMockPrerequisite()]),
    generatePretestQuestions: jest.fn().mockResolvedValue([createMockQuestion()]),
    analyzeGaps: jest.fn().mockResolvedValue(createMockGapAnalysis()),
    generateMiniLesson: jest.fn().mockResolvedValue(createMockMiniLesson()),
    ...overrides,
  };
}

/**
 * Wrapper component for testing hooks
 */
function createWrapper(service?: PrerequisiteService) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PrerequisiteProvider service={service}>
        {children}
      </PrerequisiteProvider>
    );
  };
}

describe('PrerequisiteContext', () => {
  describe('PrerequisiteProvider', () => {
    it('renders children correctly', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      expect(result.current).toBeDefined();
    });

    it('provides initial state', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      expect(result.current.projectId).toBeNull();
      expect(result.current.prerequisites).toEqual([]);
      expect(result.current.questions).toEqual([]);
      expect(result.current.pretestStatus).toBe('not_started');
      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.answers).toEqual([]);
      expect(result.current.gaps).toEqual([]);
      expect(result.current.gapAnalysis).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.didSkipPretest).toBe(false);
    });
  });

  describe('usePrerequisite hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePrerequisite());
      }).toThrow('usePrerequisite must be used within a PrerequisiteProvider');

      consoleSpy.mockRestore();
    });

    it('provides context with expected shape', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // State properties
      expect(result.current).toHaveProperty('projectId');
      expect(result.current).toHaveProperty('prerequisites');
      expect(result.current).toHaveProperty('questions');
      expect(result.current).toHaveProperty('pretestStatus');
      expect(result.current).toHaveProperty('currentQuestionIndex');
      expect(result.current).toHaveProperty('answers');
      expect(result.current).toHaveProperty('gaps');
      expect(result.current).toHaveProperty('gapAnalysis');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('didSkipPretest');

      // Action functions
      expect(typeof result.current.checkPrerequisites).toBe('function');
      expect(typeof result.current.startPretest).toBe('function');
      expect(typeof result.current.skipPretest).toBe('function');
      expect(typeof result.current.submitAnswer).toBe('function');
      expect(typeof result.current.completePretest).toBe('function');
      expect(typeof result.current.startMiniLesson).toBe('function');
      expect(typeof result.current.completeMiniLesson).toBe('function');
      expect(typeof result.current.proceedToLearning).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.hasPrerequisites).toBe('function');
      expect(typeof result.current.getCurrentQuestion).toBe('function');
      expect(typeof result.current.allGapsAddressed).toBe('function');
    });
  });

  describe('checkPrerequisites', () => {
    it('loads prerequisites for a project', async () => {
      const mockPrereqs = [createMockPrerequisite()];
      const mockService = createMockService({
        getPrerequisites: jest.fn().mockResolvedValue(mockPrereqs),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      expect(mockService.getPrerequisites).toHaveBeenCalledWith('project-123');
      expect(result.current.projectId).toBe('project-123');
      expect(result.current.prerequisites).toEqual(mockPrereqs);
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: Prerequisite[]) => void;
      const promise = new Promise<Prerequisite[]>((resolve) => {
        resolvePromise = resolve;
      });

      const mockService = createMockService({
        getPrerequisites: jest.fn().mockReturnValue(promise),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      act(() => {
        result.current.checkPrerequisites('project-123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!([createMockPrerequisite()]);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('handles error during fetch', async () => {
      const mockService = createMockService({
        getPrerequisites: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('startPretest', () => {
    it('generates questions and sets status to in_progress', async () => {
      const mockQuestions = [createMockQuestion()];
      const mockService = createMockService({
        generatePretestQuestions: jest.fn().mockResolvedValue(mockQuestions),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // First check prerequisites to set projectId
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      await act(async () => {
        await result.current.startPretest();
      });

      expect(mockService.generatePretestQuestions).toHaveBeenCalledWith('project-123');
      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.pretestStatus).toBe('in_progress');
      expect(result.current.currentQuestionIndex).toBe(0);
    });
  });

  describe('skipPretest', () => {
    it('sets status to skipped and sets skip flag', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      act(() => {
        result.current.skipPretest();
      });

      expect(result.current.pretestStatus).toBe('skipped');
      expect(result.current.didSkipPretest).toBe(true);
    });
  });

  describe('submitAnswer', () => {
    it('records answer and advances question index', async () => {
      const mockQuestions = [
        createMockQuestion({ id: 'q1', prerequisite_id: 'p1', correct_index: 1 }),
        createMockQuestion({ id: 'q2', prerequisite_id: 'p2', correct_index: 0 }),
      ];
      const mockService = createMockService({
        generatePretestQuestions: jest.fn().mockResolvedValue(mockQuestions),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest in a separate act
      await act(async () => {
        await result.current.startPretest();
      });

      act(() => {
        result.current.submitAnswer(1, 1500); // Correct answer
      });

      expect(result.current.answers).toHaveLength(1);
      expect(result.current.answers[0]).toEqual({
        questionId: 'q1',
        prerequisiteId: 'p1',
        selectedIndex: 1,
        correctIndex: 1,
        isCorrect: true,
        responseTimeMs: 1500,
      });
      expect(result.current.currentQuestionIndex).toBe(1);
    });

    it('marks incorrect answers correctly', async () => {
      const mockQuestions = [createMockQuestion({ correct_index: 1 })];
      const mockService = createMockService({
        generatePretestQuestions: jest.fn().mockResolvedValue(mockQuestions),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest in a separate act
      await act(async () => {
        await result.current.startPretest();
      });

      act(() => {
        result.current.submitAnswer(0, 2000); // Wrong answer
      });

      expect(result.current.answers[0].isCorrect).toBe(false);
    });
  });

  describe('completePretest', () => {
    it('analyzes gaps and sets status to completed', async () => {
      const mockGapResult = createMockGapAnalysis();
      const mockQuestions = [createMockQuestion()];
      const mockService = createMockService({
        generatePretestQuestions: jest.fn().mockResolvedValue(mockQuestions),
        analyzeGaps: jest.fn().mockResolvedValue(mockGapResult),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest in a separate act
      await act(async () => {
        await result.current.startPretest();
      });

      act(() => {
        result.current.submitAnswer(1, 1000);
      });

      await act(async () => {
        await result.current.completePretest();
      });

      expect(mockService.analyzeGaps).toHaveBeenCalled();
      expect(result.current.pretestStatus).toBe('completed');
      expect(result.current.gapAnalysis).toEqual(mockGapResult);
      expect(result.current.gaps).toEqual(mockGapResult.gaps);
    });
  });

  describe('startMiniLesson', () => {
    it('generates and caches mini-lesson', async () => {
      const mockLesson = createMockMiniLesson();
      const mockService = createMockService({
        generateMiniLesson: jest.fn().mockResolvedValue(mockLesson),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.startMiniLesson('prereq-1');
      });

      expect(mockService.generateMiniLesson).toHaveBeenCalledWith('prereq-1');
      expect(result.current.currentMiniLessonId).toBe('prereq-1');
      expect(result.current.miniLessons.get('prereq-1')).toEqual(mockLesson);
    });

    it('uses cached lesson if available', async () => {
      const mockLesson = createMockMiniLesson();
      const mockService = createMockService({
        generateMiniLesson: jest.fn().mockResolvedValue(mockLesson),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // First call - generates lesson
      await act(async () => {
        await result.current.startMiniLesson('prereq-1');
      });

      // Clear current lesson
      act(() => {
        result.current.proceedToLearning();
      });

      // Second call - should use cache
      await act(async () => {
        await result.current.startMiniLesson('prereq-1');
      });

      expect(mockService.generateMiniLesson).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeMiniLesson', () => {
    it('marks lesson as completed and clears current', async () => {
      const mockLesson = createMockMiniLesson();
      const mockService = createMockService({
        generateMiniLesson: jest.fn().mockResolvedValue(mockLesson),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.startMiniLesson('prereq-1');
      });

      expect(result.current.currentMiniLessonId).toBe('prereq-1');

      act(() => {
        result.current.completeMiniLesson('prereq-1');
      });

      expect(result.current.completedMiniLessons.has('prereq-1')).toBe(true);
      expect(result.current.currentMiniLessonId).toBeNull();
    });
  });

  describe('proceedToLearning', () => {
    it('clears current mini-lesson', async () => {
      const mockLesson = createMockMiniLesson();
      const mockService = createMockService({
        generateMiniLesson: jest.fn().mockResolvedValue(mockLesson),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.startMiniLesson('prereq-1');
      });

      expect(result.current.currentMiniLessonId).toBe('prereq-1');

      act(() => {
        result.current.proceedToLearning();
      });

      expect(result.current.currentMiniLessonId).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Build up some state - check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest
      await act(async () => {
        await result.current.startPretest();
      });

      act(() => {
        result.current.submitAnswer(1, 1000);
      });

      // Verify state was built up
      expect(result.current.projectId).toBe('project-123');
      expect(result.current.answers).toHaveLength(1);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.projectId).toBeNull();
      expect(result.current.prerequisites).toEqual([]);
      expect(result.current.questions).toEqual([]);
      expect(result.current.pretestStatus).toBe('not_started');
      expect(result.current.answers).toEqual([]);
    });
  });

  describe('hasPrerequisites', () => {
    it('returns false when no prerequisites', () => {
      const mockService = createMockService({
        getPrerequisites: jest.fn().mockResolvedValue([]),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      expect(result.current.hasPrerequisites()).toBe(false);
    });

    it('returns true when prerequisites exist', async () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      expect(result.current.hasPrerequisites()).toBe(true);
    });
  });

  describe('getCurrentQuestion', () => {
    it('returns null when no questions', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      expect(result.current.getCurrentQuestion()).toBeNull();
    });

    it('returns current question', async () => {
      const mockQuestions = [
        createMockQuestion({ id: 'q1' }),
        createMockQuestion({ id: 'q2' }),
      ];
      const mockService = createMockService({
        generatePretestQuestions: jest.fn().mockResolvedValue(mockQuestions),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest
      await act(async () => {
        await result.current.startPretest();
      });

      expect(result.current.getCurrentQuestion()?.id).toBe('q1');

      act(() => {
        result.current.submitAnswer(1, 1000);
      });

      expect(result.current.getCurrentQuestion()?.id).toBe('q2');
    });
  });

  describe('allGapsAddressed', () => {
    it('returns true when no gaps', () => {
      const mockService = createMockService();
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      expect(result.current.allGapsAddressed()).toBe(true);
    });

    it('returns false when gaps exist and not all addressed', async () => {
      const gap1 = createMockPrerequisite({ id: 'gap-1' });
      const gap2 = createMockPrerequisite({ id: 'gap-2' });
      const mockService = createMockService({
        analyzeGaps: jest.fn().mockResolvedValue({
          ...createMockGapAnalysis(),
          gaps: [gap1, gap2],
        }),
      });
      const wrapper = createWrapper(mockService);
      const { result } = renderHook(() => usePrerequisite(), { wrapper });

      // Check prerequisites first
      await act(async () => {
        await result.current.checkPrerequisites('project-123');
      });

      // Then start pretest
      await act(async () => {
        await result.current.startPretest();
      });

      act(() => {
        result.current.submitAnswer(0, 1000);
      });

      await act(async () => {
        await result.current.completePretest();
      });

      expect(result.current.allGapsAddressed()).toBe(false);

      // Complete one gap
      act(() => {
        result.current.completeMiniLesson('gap-1');
      });

      expect(result.current.allGapsAddressed()).toBe(false);

      // Complete second gap
      act(() => {
        result.current.completeMiniLesson('gap-2');
      });

      expect(result.current.allGapsAddressed()).toBe(true);
    });
  });
});
