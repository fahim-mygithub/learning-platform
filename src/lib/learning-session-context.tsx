/**
 * Learning Session Context
 *
 * Manages state for a single learning session:
 * - Tracks current item (concept) and position
 * - Manages phase transitions (question -> reveal -> next item)
 * - Accumulates responses for persistence
 * - Tracks progress metrics
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import type { SessionItem, SessionResponse } from '../types/session';

// ============================================================================
// Types
// ============================================================================

/**
 * Phase of the current item in the learning session
 */
export type LearningPhase = 'question' | 'reveal' | 'complete';

/**
 * Current response data for the active item
 */
export interface CurrentResponse {
  /** User's answer text */
  answer: string;
  /** Whether the answer was correct */
  isCorrect: boolean;
  /** Time taken to respond in milliseconds */
  responseTimeMs: number;
}

/**
 * Progress tracking for the learning session
 */
export interface SessionProgress {
  /** Current item number (1-indexed for display) */
  current: number;
  /** Total number of items in session */
  total: number;
  /** Count of new concepts learned */
  newLearned: number;
  /** Count of reviews completed */
  reviewsCompleted: number;
  /** Count of correct answers */
  correctCount: number;
}

/**
 * Learning session state
 */
export interface LearningSessionState {
  /** ID of the project this session belongs to */
  projectId: string | null;
  /** Ordered items for this session */
  items: SessionItem[];
  /** Current item index (0-indexed) */
  currentIndex: number;
  /** Current phase of the active item */
  phase: LearningPhase;
  /** Response data for current item (set after answer submitted) */
  currentResponse: CurrentResponse | null;
  /** All accumulated responses in this session */
  responses: SessionResponse[];
  /** When the session started */
  startTime: Date | null;
  /** Progress metrics */
  progress: SessionProgress;
}

/**
 * Learning session context value with state and actions
 */
export interface LearningSessionContextValue extends LearningSessionState {
  /** Start a new learning session with items */
  startSession: (projectId: string, items: SessionItem[]) => void;
  /** Submit an answer for the current item */
  submitAnswer: (answer: string, isCorrect: boolean, responseTimeMs: number) => void;
  /** Advance from question phase to reveal phase */
  advanceToReveal: () => void;
  /** Advance to the next item in the session */
  advanceToNextItem: () => void;
  /** End the current session */
  endSession: () => void;
  /** Get the current session item */
  getCurrentItem: () => SessionItem | null;
  /** Check if the session is active */
  isSessionActive: () => boolean;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Learning session context - undefined by default to detect usage outside provider
 */
const LearningSessionContext = createContext<LearningSessionContextValue | undefined>(undefined);

// ============================================================================
// Initial State
// ============================================================================

/**
 * Create initial state for a new/reset session
 */
function createInitialState(): LearningSessionState {
  return {
    projectId: null,
    items: [],
    currentIndex: 0,
    phase: 'question',
    currentResponse: null,
    responses: [],
    startTime: null,
    progress: {
      current: 0,
      total: 0,
      newLearned: 0,
      reviewsCompleted: 0,
      correctCount: 0,
    },
  };
}

// ============================================================================
// Provider
// ============================================================================

/**
 * Props for LearningSessionProvider component
 */
export interface LearningSessionProviderProps {
  children: ReactNode;
}

/**
 * Learning Session Provider Component
 *
 * Wraps components that need access to learning session state.
 * Manages the full lifecycle of a learning session from start to end.
 *
 * @example
 * ```tsx
 * <LearningSessionProvider>
 *   <LearningScreen />
 * </LearningSessionProvider>
 * ```
 */
export function LearningSessionProvider({
  children,
}: LearningSessionProviderProps): React.ReactElement {
  const [state, setState] = useState<LearningSessionState>(createInitialState);

  // Track response start time for calculating response duration
  const responseStartTimeRef = useRef<number | null>(null);

  /**
   * Start a new learning session
   */
  const startSession = useCallback((projectId: string, items: SessionItem[]) => {
    setState({
      projectId,
      items,
      currentIndex: 0,
      phase: 'question',
      currentResponse: null,
      responses: [],
      startTime: new Date(),
      progress: {
        current: 1,
        total: items.length,
        newLearned: 0,
        reviewsCompleted: 0,
        correctCount: 0,
      },
    });
    responseStartTimeRef.current = Date.now();
  }, []);

  /**
   * Submit an answer for the current item
   */
  const submitAnswer = useCallback(
    (answer: string, isCorrect: boolean, responseTimeMs: number) => {
      setState((prev) => {
        if (prev.items.length === 0 || prev.currentIndex >= prev.items.length) {
          return prev;
        }

        const currentItem = prev.items[prev.currentIndex];

        // Create current response
        const currentResponse: CurrentResponse = {
          answer,
          isCorrect,
          responseTimeMs,
        };

        // Update progress counters
        const newProgress = { ...prev.progress };
        if (isCorrect) {
          newProgress.correctCount += 1;
        }

        return {
          ...prev,
          currentResponse,
          phase: 'reveal' as LearningPhase,
          progress: newProgress,
        };
      });
    },
    []
  );

  /**
   * Advance from question phase to reveal phase
   * Used when showing the answer without requiring submission
   */
  const advanceToReveal = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'question') {
        return prev;
      }
      return {
        ...prev,
        phase: 'reveal' as LearningPhase,
      };
    });
  }, []);

  /**
   * Advance to the next item in the session
   */
  const advanceToNextItem = useCallback(() => {
    setState((prev) => {
      if (prev.items.length === 0) {
        return prev;
      }

      const currentItem = prev.items[prev.currentIndex];
      const nextIndex = prev.currentIndex + 1;
      const isComplete = nextIndex >= prev.items.length;

      // Update counters based on completed item type
      const newProgress = { ...prev.progress };
      if (currentItem.type === 'new') {
        newProgress.newLearned += 1;
      } else if (currentItem.type === 'review') {
        newProgress.reviewsCompleted += 1;
      }

      // Create session response from current response if available
      const newResponses = [...prev.responses];
      if (prev.currentResponse) {
        const sessionResponse: SessionResponse = {
          id: `response-${Date.now()}-${prev.currentIndex}`,
          session_id: '', // Will be set when persisting
          concept_id: currentItem.concept_id,
          question_type: 'free_text', // Default type
          question_text: '', // Will be set by caller
          user_response: prev.currentResponse.answer,
          correct_answer: '', // Will be set by caller
          is_correct: prev.currentResponse.isCorrect,
          response_time_ms: prev.currentResponse.responseTimeMs,
          confidence_level: null,
          misconception_log: [],
          created_at: new Date().toISOString(),
        };
        newResponses.push(sessionResponse);
      }

      if (isComplete) {
        return {
          ...prev,
          phase: 'complete' as LearningPhase,
          currentResponse: null,
          responses: newResponses,
          progress: {
            ...newProgress,
            current: prev.items.length,
          },
        };
      }

      // Reset response start time for next item
      responseStartTimeRef.current = Date.now();

      return {
        ...prev,
        currentIndex: nextIndex,
        phase: 'question' as LearningPhase,
        currentResponse: null,
        responses: newResponses,
        progress: {
          ...newProgress,
          current: nextIndex + 1,
        },
      };
    });
  }, []);

  /**
   * End the current session
   */
  const endSession = useCallback(() => {
    setState(createInitialState());
    responseStartTimeRef.current = null;
  }, []);

  /**
   * Get the current session item
   */
  const getCurrentItem = useCallback((): SessionItem | null => {
    if (state.items.length === 0 || state.currentIndex >= state.items.length) {
      return null;
    }
    return state.items[state.currentIndex];
  }, [state.items, state.currentIndex]);

  /**
   * Check if the session is active
   */
  const isSessionActive = useCallback((): boolean => {
    return state.projectId !== null && state.items.length > 0 && state.phase !== 'complete';
  }, [state.projectId, state.items.length, state.phase]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<LearningSessionContextValue>(
    () => ({
      ...state,
      startSession,
      submitAnswer,
      advanceToReveal,
      advanceToNextItem,
      endSession,
      getCurrentItem,
      isSessionActive,
    }),
    [
      state,
      startSession,
      submitAnswer,
      advanceToReveal,
      advanceToNextItem,
      endSession,
      getCurrentItem,
      isSessionActive,
    ]
  );

  return (
    <LearningSessionContext.Provider value={contextValue}>
      {children}
    </LearningSessionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access learning session state and actions
 *
 * Must be used within a LearningSessionProvider.
 *
 * @returns Learning session context value
 * @throws Error if used outside of LearningSessionProvider
 *
 * @example
 * ```tsx
 * function LearningCard() {
 *   const {
 *     phase,
 *     progress,
 *     getCurrentItem,
 *     submitAnswer,
 *     advanceToNextItem,
 *   } = useLearningSession();
 *
 *   const item = getCurrentItem();
 *
 *   if (!item) {
 *     return <Text>No items</Text>;
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Item {progress.current} of {progress.total}</Text>
 *       {phase === 'question' && (
 *         <QuestionView
 *           onSubmit={(answer, correct, time) => submitAnswer(answer, correct, time)}
 *         />
 *       )}
 *       {phase === 'reveal' && (
 *         <RevealView onNext={() => advanceToNextItem()} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useLearningSession(): LearningSessionContextValue {
  const context = useContext(LearningSessionContext);

  if (context === undefined) {
    throw new Error('useLearningSession must be used within a LearningSessionProvider');
  }

  return context;
}

