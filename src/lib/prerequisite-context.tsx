/**
 * Prerequisite Context
 *
 * Manages prerequisite assessment state for a learning session:
 * - Tracks prerequisites for a project
 * - Handles pretest flow (offer, in-progress, completed, skipped)
 * - Manages knowledge gaps and mini-lesson completion
 * - Provides actions for UI components to interact with prerequisite system
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

import type {
  Prerequisite,
  PretestQuestion,
  MiniLesson,
} from '../types/prerequisite';
import type {
  GapAnalysisResult,
  PretestResponseInput,
} from './prerequisite-assessment-service';

// ============================================================================
// Types
// ============================================================================

/**
 * Status of the pretest flow
 */
export type PretestStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * User response to a pretest question
 */
export interface PretestAnswer {
  questionId: string;
  prerequisiteId: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
}

/**
 * Prerequisite context state
 */
export interface PrerequisiteState {
  /** Project ID for the current prerequisites */
  projectId: string | null;
  /** List of prerequisites for the project */
  prerequisites: Prerequisite[];
  /** Pretest questions (one per prerequisite) */
  questions: PretestQuestion[];
  /** Current pretest status */
  pretestStatus: PretestStatus;
  /** Current question index during pretest */
  currentQuestionIndex: number;
  /** Collected answers during pretest */
  answers: PretestAnswer[];
  /** Knowledge gaps identified after pretest */
  gaps: Prerequisite[];
  /** Gap analysis result with recommendations */
  gapAnalysis: GapAnalysisResult | null;
  /** Mini-lessons for gaps (keyed by prerequisite ID) */
  miniLessons: Map<string, MiniLesson>;
  /** Completed mini-lesson prerequisite IDs */
  completedMiniLessons: Set<string>;
  /** Current mini-lesson being viewed */
  currentMiniLessonId: string | null;
  /** Whether prerequisites are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether user skipped pretest (for showing warning badge) */
  didSkipPretest: boolean;
}

/**
 * Prerequisite context value with state and actions
 */
export interface PrerequisiteContextValue extends PrerequisiteState {
  /** Check and load prerequisites for a project */
  checkPrerequisites: (projectId: string) => Promise<void>;
  /** Start the pretest */
  startPretest: () => void;
  /** Skip the pretest */
  skipPretest: () => void;
  /** Submit an answer for the current question */
  submitAnswer: (selectedIndex: number, responseTimeMs: number) => void;
  /** Complete the pretest and analyze gaps */
  completePretest: () => Promise<void>;
  /** Start viewing a mini-lesson for a prerequisite */
  startMiniLesson: (prerequisiteId: string) => Promise<void>;
  /** Mark a mini-lesson as completed */
  completeMiniLesson: (prerequisiteId: string) => void;
  /** Proceed to the main learning session */
  proceedToLearning: () => void;
  /** Reset the context state */
  reset: () => void;
  /** Check if there are prerequisites to assess */
  hasPrerequisites: () => boolean;
  /** Get the current pretest question */
  getCurrentQuestion: () => PretestQuestion | null;
  /** Check if all gaps have been addressed */
  allGapsAddressed: () => boolean;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Prerequisite context - undefined by default to detect usage outside provider
 */
const PrerequisiteContext = createContext<PrerequisiteContextValue | undefined>(undefined);

// ============================================================================
// Initial State
// ============================================================================

/**
 * Create initial state for a new/reset context
 */
function createInitialState(): PrerequisiteState {
  return {
    projectId: null,
    prerequisites: [],
    questions: [],
    pretestStatus: 'not_started',
    currentQuestionIndex: 0,
    answers: [],
    gaps: [],
    gapAnalysis: null,
    miniLessons: new Map(),
    completedMiniLessons: new Set(),
    currentMiniLessonId: null,
    isLoading: false,
    error: null,
    didSkipPretest: false,
  };
}

// ============================================================================
// Provider Props
// ============================================================================

/**
 * Service interface for dependency injection
 * This allows the provider to work with the actual service or a mock in tests
 */
export interface PrerequisiteService {
  getPrerequisites(projectId: string): Promise<Prerequisite[]>;
  generatePretestQuestions(projectId: string): Promise<PretestQuestion[]>;
  analyzeGaps(
    pretestSessionId: string,
    responses: PretestResponseInput[]
  ): Promise<GapAnalysisResult>;
  generateMiniLesson(prerequisiteId: string): Promise<MiniLesson>;
}

/**
 * Props for PrerequisiteProvider component
 */
export interface PrerequisiteProviderProps {
  children: ReactNode;
  /** Service for prerequisite operations (uses default if not provided) */
  service?: PrerequisiteService;
}

// ============================================================================
// Provider
// ============================================================================

/**
 * Prerequisite Provider Component
 *
 * Wraps components that need access to prerequisite assessment state.
 * Manages the full lifecycle of prerequisite checking and remediation.
 *
 * @example
 * ```tsx
 * <PrerequisiteProvider>
 *   <ProjectLearningScreen />
 * </PrerequisiteProvider>
 * ```
 */
export function PrerequisiteProvider({
  children,
  service,
}: PrerequisiteProviderProps): React.ReactElement {
  const [state, setState] = useState<PrerequisiteState>(createInitialState);

  // Callback ref for the service to avoid recreating callbacks when service changes
  const serviceRef = React.useRef(service);
  serviceRef.current = service;

  /**
   * Check and load prerequisites for a project
   */
  const checkPrerequisites = useCallback(async (projectId: string) => {
    if (!serviceRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Prerequisite service not configured',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      projectId,
    }));

    try {
      const prerequisites = await serviceRef.current.getPrerequisites(projectId);

      setState((prev) => ({
        ...prev,
        prerequisites,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load prerequisites',
      }));
    }
  }, []);

  /**
   * Start the pretest
   */
  const startPretest = useCallback(async () => {
    if (!serviceRef.current || !state.projectId) {
      setState((prev) => ({
        ...prev,
        error: 'Cannot start pretest: service or project not configured',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const questions = await serviceRef.current.generatePretestQuestions(state.projectId);

      setState((prev) => ({
        ...prev,
        questions,
        pretestStatus: 'in_progress',
        currentQuestionIndex: 0,
        answers: [],
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate pretest questions',
      }));
    }
  }, [state.projectId]);

  /**
   * Skip the pretest
   */
  const skipPretest = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pretestStatus: 'skipped',
      didSkipPretest: true,
    }));
  }, []);

  /**
   * Submit an answer for the current question
   */
  const submitAnswer = useCallback((selectedIndex: number, responseTimeMs: number) => {
    setState((prev) => {
      const currentQuestion = prev.questions[prev.currentQuestionIndex];
      if (!currentQuestion) {
        return prev;
      }

      const isCorrect = selectedIndex === currentQuestion.correct_index;

      const answer: PretestAnswer = {
        questionId: currentQuestion.id,
        prerequisiteId: currentQuestion.prerequisite_id,
        selectedIndex,
        correctIndex: currentQuestion.correct_index,
        isCorrect,
        responseTimeMs,
      };

      const newAnswers = [...prev.answers, answer];
      const newIndex = prev.currentQuestionIndex + 1;
      const isComplete = newIndex >= prev.questions.length;

      return {
        ...prev,
        answers: newAnswers,
        currentQuestionIndex: newIndex,
        // Don't change pretestStatus here - wait for completePretest
      };
    });
  }, []);

  /**
   * Complete the pretest and analyze gaps
   */
  const completePretest = useCallback(async () => {
    if (!serviceRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Prerequisite service not configured',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Convert answers to the format expected by analyzeGaps
      const responses: PretestResponseInput[] = state.answers.map((answer) => ({
        question_id: answer.questionId,
        prerequisite_id: answer.prerequisiteId,
        selected_index: answer.selectedIndex,
        correct_index: answer.correctIndex,
        is_correct: answer.isCorrect,
      }));

      // Use a generated session ID for now
      const sessionId = `pretest-${Date.now()}`;
      const gapAnalysis = await serviceRef.current.analyzeGaps(sessionId, responses);

      setState((prev) => ({
        ...prev,
        pretestStatus: 'completed',
        gaps: gapAnalysis.gaps,
        gapAnalysis,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to analyze gaps',
      }));
    }
  }, [state.answers]);

  /**
   * Start viewing a mini-lesson for a prerequisite
   */
  const startMiniLesson = useCallback(async (prerequisiteId: string) => {
    if (!serviceRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Prerequisite service not configured',
      }));
      return;
    }

    // Check if we already have the mini-lesson cached
    const existingLesson = state.miniLessons.get(prerequisiteId);
    if (existingLesson) {
      setState((prev) => ({
        ...prev,
        currentMiniLessonId: prerequisiteId,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const miniLesson = await serviceRef.current.generateMiniLesson(prerequisiteId);

      setState((prev) => {
        const newMiniLessons = new Map(prev.miniLessons);
        newMiniLessons.set(prerequisiteId, miniLesson);

        return {
          ...prev,
          miniLessons: newMiniLessons,
          currentMiniLessonId: prerequisiteId,
          isLoading: false,
        };
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate mini-lesson',
      }));
    }
  }, [state.miniLessons]);

  /**
   * Mark a mini-lesson as completed
   */
  const completeMiniLesson = useCallback((prerequisiteId: string) => {
    setState((prev) => {
      const newCompletedMiniLessons = new Set(prev.completedMiniLessons);
      newCompletedMiniLessons.add(prerequisiteId);

      return {
        ...prev,
        completedMiniLessons: newCompletedMiniLessons,
        currentMiniLessonId: null,
      };
    });
  }, []);

  /**
   * Proceed to the main learning session
   * This clears the current mini-lesson view but keeps the completed status
   */
  const proceedToLearning = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentMiniLessonId: null,
    }));
  }, []);

  /**
   * Reset the context state
   */
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  /**
   * Check if there are prerequisites to assess
   */
  const hasPrerequisites = useCallback((): boolean => {
    return state.prerequisites.length > 0;
  }, [state.prerequisites.length]);

  /**
   * Get the current pretest question
   */
  const getCurrentQuestion = useCallback((): PretestQuestion | null => {
    if (
      state.questions.length === 0 ||
      state.currentQuestionIndex >= state.questions.length
    ) {
      return null;
    }
    return state.questions[state.currentQuestionIndex];
  }, [state.questions, state.currentQuestionIndex]);

  /**
   * Check if all gaps have been addressed
   */
  const allGapsAddressed = useCallback((): boolean => {
    if (state.gaps.length === 0) {
      return true;
    }
    return state.gaps.every((gap) => state.completedMiniLessons.has(gap.id));
  }, [state.gaps, state.completedMiniLessons]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<PrerequisiteContextValue>(
    () => ({
      ...state,
      checkPrerequisites,
      startPretest,
      skipPretest,
      submitAnswer,
      completePretest,
      startMiniLesson,
      completeMiniLesson,
      proceedToLearning,
      reset,
      hasPrerequisites,
      getCurrentQuestion,
      allGapsAddressed,
    }),
    [
      state,
      checkPrerequisites,
      startPretest,
      skipPretest,
      submitAnswer,
      completePretest,
      startMiniLesson,
      completeMiniLesson,
      proceedToLearning,
      reset,
      hasPrerequisites,
      getCurrentQuestion,
      allGapsAddressed,
    ]
  );

  return (
    <PrerequisiteContext.Provider value={contextValue}>
      {children}
    </PrerequisiteContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access prerequisite context state and actions
 *
 * Must be used within a PrerequisiteProvider.
 *
 * @returns Prerequisite context value
 * @throws Error if used outside of PrerequisiteProvider
 *
 * @example
 * ```tsx
 * function PrerequisiteCheck() {
 *   const {
 *     prerequisites,
 *     pretestStatus,
 *     checkPrerequisites,
 *     startPretest,
 *     skipPretest,
 *   } = usePrerequisite();
 *
 *   useEffect(() => {
 *     checkPrerequisites(projectId);
 *   }, [projectId]);
 *
 *   if (pretestStatus === 'not_started' && prerequisites.length > 0) {
 *     return (
 *       <PretestOfferModal
 *         prerequisiteCount={prerequisites.length}
 *         onTakePretest={startPretest}
 *         onSkip={skipPretest}
 *       />
 *     );
 *   }
 *
 *   return <LearningSession />;
 * }
 * ```
 */
export function usePrerequisite(): PrerequisiteContextValue {
  const context = useContext(PrerequisiteContext);

  if (context === undefined) {
    throw new Error('usePrerequisite must be used within a PrerequisiteProvider');
  }

  return context;
}
