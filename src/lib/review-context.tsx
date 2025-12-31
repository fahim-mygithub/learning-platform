/**
 * Review Context Provider
 *
 * Provides spaced repetition review state management:
 * - Loads due reviews for the current user
 * - Provides review queue with statistics
 * - Handles review submissions (processReview and persist to Supabase)
 * - Tracks current review session state
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { FSRSRating } from './fsrs';
import {
  ReviewQueueItem,
  ReviewQueueStats,
  sortByPriority,
  calculateQueueStats,
  filterByProject,
  mapDueReviewToQueueItem,
  MasteryState,
  ConfidenceLevel,
  processReview,
} from './spaced-repetition';
import type { ConceptState, ConceptStateInsert } from '../types/database';

/**
 * Review session state
 */
export interface ReviewSession {
  id: string;
  startedAt: string;
  itemsReviewed: number;
  currentItemIndex: number;
}

/**
 * Review context value interface
 */
interface ReviewContextValue {
  /** Due review items sorted by priority */
  dueReviews: ReviewQueueItem[];
  /** Queue statistics */
  stats: ReviewQueueStats;
  /** True while loading review data */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Current review session (null if not in session) */
  session: ReviewSession | null;
  /** Current item being reviewed */
  currentItem: ReviewQueueItem | null;
  /** Refresh due reviews from server */
  refreshReviews: () => Promise<void>;
  /** Start a new review session */
  startSession: (projectId?: string) => void;
  /** End the current review session */
  endSession: () => void;
  /** Submit a review rating for the current item */
  submitReview: (
    rating: FSRSRating,
    options?: {
      timeToAnswerMs?: number;
      confidenceLevel?: ConfidenceLevel;
      isTransferQuestion?: boolean;
    }
  ) => Promise<void>;
  /** Get reviews for a specific project */
  getProjectReviews: (projectId: string) => ReviewQueueItem[];
  /** Get concept state for a specific concept */
  getConceptState: (conceptId: string) => Promise<ConceptState | null>;
  /** Initialize concept state if not exists */
  initializeConceptState: (conceptId: string) => Promise<ConceptState | null>;
}

/**
 * Review context - undefined by default to detect usage outside provider
 */
const ReviewContext = createContext<ReviewContextValue | undefined>(undefined);

/**
 * Props for ReviewProvider component
 */
interface ReviewProviderProps {
  children: ReactNode;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Review Provider Component
 *
 * Wraps the app to provide review state to all components.
 * Handles:
 * - Loading due reviews on mount
 * - Managing review session state
 * - Submitting reviews and persisting to Supabase
 *
 * @example
 * ```tsx
 * <ReviewProvider>
 *   <App />
 * </ReviewProvider>
 * ```
 */
export function ReviewProvider({ children }: ReviewProviderProps): React.ReactElement {
  const { user } = useAuth();
  const [dueReviews, setDueReviews] = useState<ReviewQueueItem[]>([]);
  const [stats, setStats] = useState<ReviewQueueStats>({
    totalDue: 0,
    overdueCount: 0,
    avgOverdueDays: 0,
    byState: {
      unseen: 0,
      exposed: 0,
      fragile: 0,
      developing: 0,
      solid: 0,
      mastered: 0,
      misconceived: 0,
    },
    byProject: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [sessionItems, setSessionItems] = useState<ReviewQueueItem[]>([]);

  // Track user ID for reloading
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Load due reviews from Supabase
   */
  const loadDueReviews = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Query the due_reviews view
      const { data, error: queryError } = await supabase
        .from('due_reviews')
        .select('*')
        .eq('user_id', userId);

      if (queryError) {
        throw queryError;
      }

      // Map to queue items and sort by priority
      const items = (data || []).map(mapDueReviewToQueueItem);
      const sortedItems = sortByPriority(items);

      setDueReviews(sortedItems);
      setStats(calculateQueueStats(sortedItems));
    } catch (err) {
      console.error('Error loading due reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
      setDueReviews([]);
      setStats({
        totalDue: 0,
        overdueCount: 0,
        avgOverdueDays: 0,
        byState: {
          unseen: 0,
          exposed: 0,
          fragile: 0,
          developing: 0,
          solid: 0,
          mastered: 0,
          misconceived: 0,
        },
        byProject: {},
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh due reviews
   */
  const refreshReviews = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    await loadDueReviews(user.id);
  }, [user?.id, loadDueReviews]);

  /**
   * Start a new review session
   */
  const startSession = useCallback(
    (projectId?: string) => {
      // Get items for this session
      const items = projectId ? filterByProject(dueReviews, projectId) : dueReviews;

      if (items.length === 0) {
        setError('No reviews due');
        return;
      }

      const newSession: ReviewSession = {
        id: generateSessionId(),
        startedAt: new Date().toISOString(),
        itemsReviewed: 0,
        currentItemIndex: 0,
      };

      setSession(newSession);
      setSessionItems(items);
      setError(null);
    },
    [dueReviews]
  );

  /**
   * End the current review session
   */
  const endSession = useCallback(() => {
    setSession(null);
    setSessionItems([]);
    // Refresh reviews to update counts
    refreshReviews();
  }, [refreshReviews]);

  /**
   * Get current item being reviewed
   */
  const currentItem = useMemo(() => {
    if (!session || sessionItems.length === 0) {
      return null;
    }
    if (session.currentItemIndex >= sessionItems.length) {
      return null;
    }
    return sessionItems[session.currentItemIndex];
  }, [session, sessionItems]);

  /**
   * Submit a review rating
   */
  const submitReview = useCallback(
    async (
      rating: FSRSRating,
      options?: {
        timeToAnswerMs?: number;
        confidenceLevel?: ConfidenceLevel;
        isTransferQuestion?: boolean;
      }
    ) => {
      if (!user?.id || !currentItem || !session) {
        throw new Error('No active review session');
      }

      try {
        // Fetch the full concept state
        const { data: conceptState, error: fetchError } = await supabase
          .from('concept_states')
          .select('*')
          .eq('id', currentItem.conceptStateId)
          .single();

        if (fetchError || !conceptState) {
          throw new Error('Failed to fetch concept state');
        }

        // Process the review
        const result = processReview({
          conceptState: conceptState as ConceptState,
          rating,
          timeToAnswerMs: options?.timeToAnswerMs,
          sessionId: session.id,
          confidenceLevel: options?.confidenceLevel,
          isTransferQuestion: options?.isTransferQuestion,
        });

        // Update concept state in database
        const { error: updateError } = await supabase
          .from('concept_states')
          .update(result.updatedState)
          .eq('id', currentItem.conceptStateId);

        if (updateError) {
          throw updateError;
        }

        // Insert review history
        const { error: historyError } = await supabase.from('review_history').insert({
          ...result.reviewHistory,
          user_id: user.id,
          concept_id: currentItem.conceptId,
          concept_state_id: currentItem.conceptStateId,
        });

        if (historyError) {
          console.error('Failed to insert review history:', historyError);
          // Don't throw - history is for analytics, not critical
        }

        // Advance to next item
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            itemsReviewed: prev.itemsReviewed + 1,
            currentItemIndex: prev.currentItemIndex + 1,
          };
        });

        // If we've finished all items, end the session
        if (session.currentItemIndex + 1 >= sessionItems.length) {
          // Don't end immediately - let UI show completion
        }
      } catch (err) {
        console.error('Error submitting review:', err);
        setError(err instanceof Error ? err.message : 'Failed to submit review');
        throw err;
      }
    },
    [user?.id, currentItem, session, sessionItems.length]
  );

  /**
   * Get reviews for a specific project
   */
  const getProjectReviews = useCallback(
    (projectId: string) => {
      return filterByProject(dueReviews, projectId);
    },
    [dueReviews]
  );

  /**
   * Get concept state for a specific concept
   */
  const getConceptState = useCallback(
    async (conceptId: string): Promise<ConceptState | null> => {
      if (!user?.id) {
        return null;
      }

      const { data, error: queryError } = await supabase
        .from('concept_states')
        .select('*')
        .eq('user_id', user.id)
        .eq('concept_id', conceptId)
        .single();

      if (queryError) {
        // May not exist yet
        return null;
      }

      return data as ConceptState;
    },
    [user?.id]
  );

  /**
   * Initialize concept state if not exists
   */
  const initializeConceptState = useCallback(
    async (conceptId: string): Promise<ConceptState | null> => {
      if (!user?.id) {
        return null;
      }

      // Check if already exists
      const existing = await getConceptState(conceptId);
      if (existing) {
        return existing;
      }

      // Create new state
      const newState: ConceptStateInsert = {
        user_id: user.id,
        concept_id: conceptId,
        state: 'unseen',
        stability: 1.0,
        difficulty: 0.3,
        successful_sessions: 0,
        consecutive_correct: 0,
        session_dates: [],
      };

      const { data, error: insertError } = await supabase
        .from('concept_states')
        .insert(newState)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create concept state:', insertError);
        return null;
      }

      return data as ConceptState;
    },
    [user?.id, getConceptState]
  );

  /**
   * Load due reviews when user changes
   */
  useEffect(() => {
    if (!user?.id) {
      if (currentUserIdRef.current !== null) {
        setDueReviews([]);
        setStats({
          totalDue: 0,
          overdueCount: 0,
          avgOverdueDays: 0,
          byState: {
            unseen: 0,
            exposed: 0,
            fragile: 0,
            developing: 0,
            solid: 0,
            mastered: 0,
            misconceived: 0,
          },
          byProject: {},
        });
        setError(null);
        setSession(null);
        setSessionItems([]);
      }
      currentUserIdRef.current = null;
      return;
    }

    if (user.id !== currentUserIdRef.current) {
      currentUserIdRef.current = user.id;
      loadDueReviews(user.id);
    }
  }, [user?.id, loadDueReviews]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<ReviewContextValue>(
    () => ({
      dueReviews,
      stats,
      loading,
      error,
      session,
      currentItem,
      refreshReviews,
      startSession,
      endSession,
      submitReview,
      getProjectReviews,
      getConceptState,
      initializeConceptState,
    }),
    [
      dueReviews,
      stats,
      loading,
      error,
      session,
      currentItem,
      refreshReviews,
      startSession,
      endSession,
      submitReview,
      getProjectReviews,
      getConceptState,
      initializeConceptState,
    ]
  );

  return <ReviewContext.Provider value={contextValue}>{children}</ReviewContext.Provider>;
}

/**
 * Hook to access review state and actions
 *
 * Must be used within a ReviewProvider.
 *
 * @returns Review context value
 * @throws Error if used outside of ReviewProvider
 *
 * @example
 * ```tsx
 * function DueReviewsCard() {
 *   const { dueReviews, stats, loading, startSession } = useReview();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <Card>
 *       <Text>{stats.totalDue} reviews due</Text>
 *       <Button onPress={() => startSession()}>Start Review</Button>
 *     </Card>
 *   );
 * }
 * ```
 */
export function useReview(): ReviewContextValue {
  const context = useContext(ReviewContext);

  if (context === undefined) {
    throw new Error('useReview must be used within a ReviewProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type { ReviewContextValue, ReviewProviderProps };
