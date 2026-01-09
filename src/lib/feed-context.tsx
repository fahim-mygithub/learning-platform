/**
 * Feed Context Provider
 *
 * Provides feed state management for the TikTok-style learning experience:
 * - Loads feed items from FeedBuilderService
 * - Tracks current index and navigation
 * - Manages feed actions (markAsKnown, addToReviewQueue, quiz/synthesis)
 * - Integrates session timer and break suggestions
 * - Tracks XP and streak state
 * - Persists progress to feed_progress table
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
import { createFeedBuilderService } from './feed-builder-service';
import {
  createSessionTimerService,
  type SessionTimerService,
} from './session-timer-service';
import { createXPService } from './xp-service';
import { createStreakService } from './streak-service';
import {
  createMasteryEvaluationService,
  type CompletedInteraction,
  type MasterySummary,
} from './mastery-evaluation-service';
import type { Concept } from '../types';
import type {
  FeedItem,
  FeedProgress,
  UserStreak,
  UserXP,
  XPReason,
  XPAwardResult,
  PretestItem,
  PretestResultsItem,
} from '../types/engagement';
import {
  isPretestItem,
  isPretestResultsItem,
} from '../types/engagement';
import type { SessionStats } from '../components/feed/SessionBreakModal';

/**
 * Quiz result returned from submitQuizAnswer
 */
export interface QuizResult {
  isCorrect: boolean;
  xpAwarded: number;
  levelUp: boolean;
  newLevel: number;
}

/**
 * Pretest state tracking for prerequisite assessment
 */
export interface PretestState {
  /** Map of prerequisiteId to user's answer index */
  answers: Map<string, number>;
  /** Whether pretest phase is completed */
  completed: boolean;
  /** IDs of prerequisites with knowledge gaps (incorrect answers) */
  gapPrerequisiteIds: string[];
}

/**
 * Feed context value interface
 */
export interface FeedContextValue {
  /** List of feed items */
  feedItems: FeedItem[];
  /** Current active item index */
  currentIndex: number;
  /** Whether feed is loading */
  isLoading: boolean;
  /** Error if feed failed to load */
  error: Error | null;
  /** Navigate to next card */
  goToNext: () => void;
  /** Navigate to previous card */
  goToPrevious: () => void;
  /** Jump to specific index */
  jumpToIndex: (index: number) => void;
  /** Mark item as known (swipe left) */
  markAsKnown: (itemId: string) => Promise<void>;
  /** Add concept to review queue (swipe right) */
  addToReviewQueue: (conceptId: string) => Promise<void>;
  /** Submit a quiz answer */
  submitQuizAnswer: (itemId: string, answer: string) => Promise<QuizResult>;
  /**
   * Complete a synthesis activity
   * Accepts either:
   * - CompletedInteraction[] for new mastery evaluation flow
   * - (itemId: string, response: string) for legacy compatibility
   */
  completeSynthesis: {
    (interactions: CompletedInteraction[]): Promise<void>;
    (itemId: string, response: string): Promise<void>;
  };
  /** Whether the session is complete (synthesis phase finished) */
  sessionComplete: boolean;
  /** Mastery summary from synthesis phase evaluation */
  masterySummary: MasterySummary | null;
  /** Current session statistics */
  sessionStats: SessionStats;
  /** Whether break modal should be shown */
  showBreakModal: boolean;
  /** Dismiss the break modal */
  dismissBreakModal: () => void;
  /** Take a break (resets timer) */
  takeBreak: () => void;
  /** User's current streak */
  streak: UserStreak | null;
  /** User's current XP */
  userXP: UserXP | null;
  /** Feed completion percentage (0-100) */
  completionPercentage: number;
  /** Session performance percentage (0-100) for synthesis phase decisions */
  sessionPerformance: number;
  /** IDs of completed items */
  completedItemIds: Set<string>;
  /** Source ID being fed */
  sourceId: string;
  /** Source URL (video URL) */
  sourceUrl: string | null;
  /** Current pretest state */
  pretestState: PretestState;
  /** Answer a pretest question */
  answerPretest: (prerequisiteId: string, answerIndex: number) => void;
  /** Complete pretest phase and calculate gaps */
  completePretest: () => void;
  /** Pretest progress percentage (0-100) */
  pretestProgress: number;
  /** Mark the first session as complete (called when session finishes) */
  markFirstSessionComplete: () => Promise<void>;
}

/**
 * Feed context - undefined by default to detect usage outside provider
 */
const FeedContext = createContext<FeedContextValue | undefined>(undefined);

/**
 * Props for FeedProvider component
 */
export interface FeedProviderProps {
  /** Source ID to build feed from */
  sourceId: string;
  /** Children components */
  children: ReactNode;
}

/**
 * Check if a URL is a YouTube URL
 */
function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Source data returned from getSourceData
 */
interface SourceData {
  concepts: Concept[] | null;
  sourceUrl: string | null;
  sourceType: string | null;
  textChunks: TextChunk[] | null;
  error: Error | null;
}

/**
 * TextChunk type from text-chunking-pipeline
 */
interface TextChunk {
  id: string;
  text: string;
  propositions: string[];
  startIndex: number;
  endIndex: number;
}

/**
 * Get source data including concepts, URL, type, and text chunks
 */
async function getSourceData(sourceId: string): Promise<SourceData> {
  // First get the source to find its project_id, url, type, and metadata
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('project_id, url, type, metadata')
    .eq('id', sourceId)
    .maybeSingle();

  if (sourceError) {
    // Check if it's the "multiple rows" error
    if (sourceError.message?.includes('coerce')) {
      return {
        concepts: null,
        sourceUrl: null,
        sourceType: null,
        textChunks: null,
        error: new Error('Data error: Multiple sources found with this ID. Please contact support.')
      };
    }
  }

  if (sourceError || !source) {
    return {
      concepts: null,
      sourceUrl: null,
      sourceType: null,
      textChunks: null,
      error: sourceError || new Error('Source not found')
    };
  }

  // Extract text chunks from metadata if present
  const textChunks = (source.metadata as Record<string, unknown>)?.text_chunks as TextChunk[] | undefined;

  // Then get concepts for that project
  const { data: concepts, error: conceptsError } = await supabase
    .from('concepts')
    .select('*')
    .eq('project_id', source.project_id)
    .order('chapter_sequence', { ascending: true });

  return {
    concepts,
    sourceUrl: source.url || null,
    sourceType: source.type || null,
    textChunks: textChunks || null,
    error: conceptsError
  };
}

/**
 * Load feed progress from database
 */
async function loadFeedProgress(
  userId: string,
  sourceId: string
): Promise<FeedProgress | null> {
  const { data, error } = await supabase
    .from('feed_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .single();

  if (error) {
    // No progress yet is fine
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    sourceId: data.source_id,
    currentIndex: data.current_index,
    completedItems: data.completed_items || [],
    synthesisCount: data.synthesis_count || 0,
    lastSessionAt: data.last_session_at,
    firstSessionCompletedAt: data.first_session_completed_at,
  };
}

/**
 * Save feed progress to database
 */
async function saveFeedProgress(
  userId: string,
  sourceId: string,
  currentIndex: number,
  completedItems: string[],
  synthesisCount: number
): Promise<void> {
  const { error } = await supabase
    .from('feed_progress')
    .upsert({
      user_id: userId,
      source_id: sourceId,
      current_index: currentIndex,
      completed_items: completedItems,
      synthesis_count: synthesisCount,
      last_session_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,source_id',
    });

  if (error) {
    console.error('Failed to save feed progress:', error);
  }
}

/**
 * Feed Provider Component
 *
 * Wraps the feed screen to provide feed state and actions.
 */
export function FeedProvider({
  sourceId,
  children,
}: FeedProviderProps): React.ReactElement {
  const { user } = useAuth();

  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());

  // Session state
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    elapsedMinutes: 0,
    cardsCompleted: 0,
    xpEarned: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    synthesisCount: 0,
    currentStreak: 0,
  });
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [masterySummary, setMasterySummary] = useState<MasterySummary | null>(null);

  // User engagement state
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [userXP, setUserXP] = useState<UserXP | null>(null);

  // Source state
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // Pretest state
  const [pretestAnswers, setPretestAnswers] = useState<Map<string, number>>(new Map());
  const [pretestCompleted, setPretestCompleted] = useState(false);
  const [gapPrerequisiteIds, setGapPrerequisiteIds] = useState<string[]>([]);

  // Services
  const sessionTimerRef = useRef<SessionTimerService | null>(null);
  const xpServiceRef = useRef(createXPService());
  const streakServiceRef = useRef(createStreakService());
  const feedBuilderRef = useRef(createFeedBuilderService());
  const masteryEvaluationRef = useRef(createMasteryEvaluationService());

  // Timer interval ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize session timer
   */
  useEffect(() => {
    sessionTimerRef.current = createSessionTimerService({
      breakIntervalMinutes: 30,
      autoStart: true,
    });

    // Update elapsed time every minute
    timerIntervalRef.current = setInterval(() => {
      if (sessionTimerRef.current) {
        const elapsed = sessionTimerRef.current.getElapsedMinutes();
        setSessionStats((prev) => ({ ...prev, elapsedMinutes: elapsed }));

        // Check if break should be suggested
        if (sessionTimerRef.current.shouldSuggestBreak()) {
          sessionTimerRef.current.markBreakSuggested();
          setShowBreakModal(true);
        }
      }
    }, 60000); // Every minute

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  /**
   * Load user engagement data
   */
  useEffect(() => {
    async function loadEngagementData() {
      if (!user) return;

      try {
        const [streakData, xpData] = await Promise.all([
          streakServiceRef.current.getStreak(user.id),
          xpServiceRef.current.getUserXP(user.id),
        ]);

        setStreak(streakData);
        setUserXP(xpData);
        setSessionStats((prev) => ({
          ...prev,
          currentStreak: streakData.currentStreak,
        }));
      } catch (err) {
        console.error('Failed to load engagement data:', err);
      }
    }

    loadEngagementData();
  }, [user]);

  /**
   * Load feed items and progress
   */
  useEffect(() => {
    async function loadFeed() {
      if (!sourceId) {
        setError(new Error('Source ID is required'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load source data including concepts, URL, type, and text chunks
        const sourceData = await getSourceData(sourceId);

        if (sourceData.error) {
          setError(sourceData.error);
          setIsLoading(false);
          return;
        }

        // Store source URL for video playback
        setSourceUrl(sourceData.sourceUrl);

        // Determine if this is a text-based source with text chunks
        const isTextSource = sourceData.sourceType === 'pdf' ||
          (sourceData.sourceType === 'url' && !isYouTubeUrl(sourceData.sourceUrl));
        const hasTextChunks = sourceData.textChunks && sourceData.textChunks.length > 0;

        let items: FeedItem[];

        if (isTextSource && hasTextChunks) {
          // Build text-based feed from text chunks
          items = feedBuilderRef.current.buildTextFeed(
            sourceId,
            sourceData.textChunks!,
            sourceData.concepts || []
          );
        } else if (sourceData.concepts && sourceData.concepts.length > 0) {
          // Build video-based feed from concepts (YouTube sources)
          items = feedBuilderRef.current.buildFeed(sourceId, sourceData.concepts);
        } else {
          // No content to build feed from
          setError(new Error('No content available for learning feed'));
          setIsLoading(false);
          return;
        }

        setFeedItems(items);

        // Load saved progress
        if (user) {
          const progress = await loadFeedProgress(user.id, sourceId);
          if (progress) {
            setCurrentIndex(progress.currentIndex);
            setCompletedItemIds(new Set(progress.completedItems));
            setSessionStats((prev) => ({
              ...prev,
              synthesisCount: progress.synthesisCount,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
        setError(err instanceof Error ? err : new Error('Failed to load feed'));
      } finally {
        setIsLoading(false);
      }
    }

    loadFeed();
  }, [sourceId, user]);

  /**
   * Save progress when it changes
   */
  useEffect(() => {
    if (!user || feedItems.length === 0) return;

    const completedArray = Array.from(completedItemIds);
    saveFeedProgress(
      user.id,
      sourceId,
      currentIndex,
      completedArray,
      sessionStats.synthesisCount || 0
    );
  }, [user, sourceId, currentIndex, completedItemIds, sessionStats.synthesisCount, feedItems.length]);

  /**
   * Navigation: go to next card
   */
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, feedItems.length - 1));
  }, [feedItems.length]);

  /**
   * Navigation: go to previous card
   */
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * Navigation: jump to specific index
   */
  const jumpToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, feedItems.length - 1)));
  }, [feedItems.length]);

  /**
   * Mark item as known (swipe left)
   */
  const markAsKnown = useCallback(async (itemId: string) => {
    setCompletedItemIds((prev) => new Set(prev).add(itemId));
    setSessionStats((prev) => ({
      ...prev,
      cardsCompleted: prev.cardsCompleted + 1,
    }));

    // Award chapter complete XP
    if (user) {
      try {
        const result = await xpServiceRef.current.awardXP(user.id, 'chapter_complete');
        setSessionStats((prev) => ({
          ...prev,
          xpEarned: prev.xpEarned + result.amountAwarded,
        }));
        setUserXP((prev) => prev ? {
          ...prev,
          totalXp: result.newTotalXp,
          level: result.newLevel,
        } : null);
      } catch (err) {
        console.error('Failed to award XP:', err);
      }
    }

    // Auto-advance to next card
    goToNext();
  }, [user, goToNext]);

  /**
   * Add concept to review queue (swipe right)
   * Uses the existing concept_states table from spaced repetition
   */
  const addToReviewQueue = useCallback(async (conceptId: string) => {
    if (!user) return;

    try {
      // Upsert into concept_states table (spaced repetition)
      // Set state to 'exposed' with due_date for immediate review
      await supabase.from('concept_states').upsert({
        user_id: user.id,
        concept_id: conceptId,
        state: 'exposed',
        due_date: new Date().toISOString(),
        last_review_date: new Date().toISOString(),
      }, {
        onConflict: 'user_id,concept_id',
      });
    } catch (err) {
      console.error('Failed to add to review queue:', err);
    }

    // Auto-advance to next card
    goToNext();
  }, [user, goToNext]);

  /**
   * Submit quiz answer
   */
  const submitQuizAnswer = useCallback(async (
    itemId: string,
    answer: string
  ): Promise<QuizResult> => {
    const item = feedItems.find((i) => i.id === itemId);
    if (!item || item.type !== 'quiz') {
      return { isCorrect: false, xpAwarded: 0, levelUp: false, newLevel: 1 };
    }

    const isCorrect = answer === item.question.correct_answer;

    setSessionStats((prev) => ({
      ...prev,
      totalAnswers: prev.totalAnswers + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
    }));

    let xpResult: XPAwardResult = {
      newTotalXp: userXP?.totalXp || 0,
      newLevel: userXP?.level || 1,
      levelUp: false,
      amountAwarded: 0,
    };

    if (isCorrect && user) {
      try {
        xpResult = await xpServiceRef.current.awardXP(user.id, 'quiz_correct', item.conceptId);
        setSessionStats((prev) => ({
          ...prev,
          xpEarned: prev.xpEarned + xpResult.amountAwarded,
        }));
        setUserXP((prev) => prev ? {
          ...prev,
          totalXp: xpResult.newTotalXp,
          level: xpResult.newLevel,
        } : null);
      } catch (err) {
        console.error('Failed to award quiz XP:', err);
      }
    }

    // Mark as completed
    setCompletedItemIds((prev) => new Set(prev).add(itemId));

    return {
      isCorrect,
      xpAwarded: xpResult.amountAwarded,
      levelUp: xpResult.levelUp,
      newLevel: xpResult.newLevel,
    };
  }, [feedItems, user, userXP]);

  /**
   * Complete synthesis activity
   *
   * Supports two signatures for backward compatibility:
   * - completeSynthesis(interactions: CompletedInteraction[]) - new mastery evaluation flow
   * - completeSynthesis(itemId: string, response: string) - legacy flow (detected by string first arg)
   */
  const completeSynthesis = useCallback(async (
    interactionsOrItemId: CompletedInteraction[] | string,
    legacyResponse?: string
  ) => {
    if (!user) return;

    // Detect legacy call: first argument is a string (itemId)
    const isLegacyCall = typeof interactionsOrItemId === 'string';

    if (isLegacyCall) {
      // Legacy flow: just award XP and mark as completed
      const itemId = interactionsOrItemId;
      try {
        const result = await xpServiceRef.current.awardXP(user.id, 'synthesis_complete');
        setSessionStats((prev) => ({
          ...prev,
          synthesisCount: (prev.synthesisCount || 0) + 1,
          xpEarned: prev.xpEarned + result.amountAwarded,
        }));
        setUserXP((prev) => prev ? {
          ...prev,
          totalXp: result.newTotalXp,
          level: result.newLevel,
        } : null);
      } catch (err) {
        console.error('Failed to award synthesis XP:', err);
      }

      // Mark as completed
      setCompletedItemIds((prev) => new Set(prev).add(itemId));

      // Record activity for streak
      try {
        const streakResult = await streakServiceRef.current.recordActivity(user.id);
        setStreak((prev) => prev ? {
          ...prev,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
        } : null);
        setSessionStats((prev) => ({
          ...prev,
          currentStreak: streakResult.currentStreak,
        }));
      } catch (err) {
        console.error('Failed to update streak:', err);
      }
      return;
    }

    // New flow: evaluate interactions and award XP based on mastery
    const interactions = interactionsOrItemId;

    try {
      // Evaluate mastery
      const summary = masteryEvaluationRef.current.evaluate(interactions);

      // Award XP for synthesis completion using mastery-based recommendation
      const xpResult = await xpServiceRef.current.awardXP(
        user.id,
        'synthesis_complete',
        undefined,
        summary.xpRecommendation
      );

      // Update session stats
      setSessionStats((prev) => ({
        ...prev,
        synthesisCount: (prev.synthesisCount || 0) + 1,
        xpEarned: prev.xpEarned + xpResult.amountAwarded,
      }));

      // Update user XP
      setUserXP((prev) => prev ? {
        ...prev,
        totalXp: xpResult.newTotalXp,
        level: xpResult.newLevel,
      } : null);

      // Set mastery summary and mark session complete
      setMasterySummary(summary);
      setSessionComplete(true);

      // Record activity for streak
      try {
        const streakResult = await streakServiceRef.current.recordActivity(user.id);
        setStreak((prev) => prev ? {
          ...prev,
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
        } : null);
        setSessionStats((prev) => ({
          ...prev,
          currentStreak: streakResult.currentStreak,
        }));
      } catch (err) {
        console.error('Failed to update streak:', err);
      }
    } catch (err) {
      console.error('Failed to complete synthesis:', err);
      // Don't set session complete on error
    }
  }, [user]);

  /**
   * Dismiss break modal
   */
  const dismissBreakModal = useCallback(() => {
    setShowBreakModal(false);
  }, []);

  /**
   * Take a break (reset timer)
   */
  const takeBreak = useCallback(() => {
    setShowBreakModal(false);
    if (sessionTimerRef.current) {
      sessionTimerRef.current.resetTimer();
    }
    setSessionStats((prev) => ({ ...prev, elapsedMinutes: 0 }));
  }, []);

  /**
   * Calculate completion percentage
   */
  const completionPercentage = useMemo(() => {
    if (feedItems.length === 0) return 0;
    return Math.round((completedItemIds.size / feedItems.length) * 100);
  }, [feedItems.length, completedItemIds.size]);

  /**
   * Calculate session performance percentage (correct answers / total answers)
   * Used by synthesis phase to determine interaction count
   */
  const sessionPerformance = useMemo(() => {
    if (sessionStats.totalAnswers === 0) return 100; // No quizzes yet, assume perfect
    return Math.round((sessionStats.correctAnswers / sessionStats.totalAnswers) * 100);
  }, [sessionStats.correctAnswers, sessionStats.totalAnswers]);

  /**
   * Memoized pretest state
   */
  const pretestState = useMemo<PretestState>(() => ({
    answers: pretestAnswers,
    completed: pretestCompleted,
    gapPrerequisiteIds,
  }), [pretestAnswers, pretestCompleted, gapPrerequisiteIds]);

  /**
   * Get pretest items from the feed
   */
  const pretestItems = useMemo(() => {
    return feedItems.filter(isPretestItem) as PretestItem[];
  }, [feedItems]);

  /**
   * Calculate pretest progress percentage
   * Based on how many unique prerequisites have been answered
   */
  const pretestProgress = useMemo(() => {
    if (pretestItems.length === 0) return 0;
    // Get unique prerequisite IDs from pretest items
    const uniquePrereqIds = new Set(pretestItems.map((item) => item.prerequisiteId));
    const totalPrerequisites = uniquePrereqIds.size;
    if (totalPrerequisites === 0) return 0;
    const answeredCount = pretestAnswers.size;
    return Math.round((answeredCount / totalPrerequisites) * 100);
  }, [pretestItems, pretestAnswers]);

  /**
   * Answer a pretest question
   * Records the user's answer for a specific prerequisite
   */
  const answerPretest = useCallback((prerequisiteId: string, answerIndex: number) => {
    setPretestAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(prerequisiteId, answerIndex);
      return newAnswers;
    });
  }, []);

  /**
   * Complete pretest phase and calculate gaps
   * - Determines which prerequisites were answered incorrectly
   * - Updates PretestResultsItem with actual scores
   * - Inserts mini-lessons for gaps
   */
  const completePretest = useCallback(() => {
    setPretestCompleted(true);

    // Calculate gaps from pretest items in the feed
    const gaps: string[] = [];
    let correctCount = 0;

    for (const pretestItem of pretestItems) {
      const userAnswer = pretestAnswers.get(pretestItem.prerequisiteId);

      // If not answered or answered incorrectly, it's a gap
      if (userAnswer === undefined || userAnswer !== pretestItem.correctIndex) {
        if (!gaps.includes(pretestItem.prerequisiteId)) {
          gaps.push(pretestItem.prerequisiteId);
        }
      } else {
        correctCount++;
      }
    }

    setGapPrerequisiteIds(gaps);

    // Update PretestResultsItem in feedItems with actual scores
    const uniquePrereqIds = new Set(pretestItems.map((item) => item.prerequisiteId));
    const totalPrerequisites = uniquePrereqIds.size;
    const percentage = totalPrerequisites > 0
      ? Math.round((correctCount / totalPrerequisites) * 100)
      : 0;

    // Determine recommendation based on percentage
    let recommendation: 'proceed' | 'review_suggested' | 'review_required';
    if (percentage >= 80) {
      recommendation = 'proceed';
    } else if (percentage >= 50) {
      recommendation = 'review_suggested';
    } else {
      recommendation = 'review_required';
    }

    // Update feedItems with actual pretest results
    setFeedItems((prev) => {
      const updated = prev.map((item) => {
        if (isPretestResultsItem(item)) {
          return {
            ...item,
            correctCount,
            percentage,
            recommendation,
            gapPrerequisiteIds: gaps,
          };
        }
        return item;
      });

      // Insert mini-lessons for gaps if there are any
      if (gaps.length > 0) {
        // Find the index of PretestResultsItem
        const resultsIndex = updated.findIndex(isPretestResultsItem);
        if (resultsIndex !== -1) {
          // Create mini-lesson data for gaps
          const miniLessonData = gaps.map((prereqId) => {
            // Find the pretest item for this prerequisite to get the name
            const pretestItem = pretestItems.find((p) => p.prerequisiteId === prereqId);
            return {
              prerequisiteId: prereqId,
              title: `Review: ${pretestItem?.prerequisiteName || prereqId}`,
              contentMarkdown: `Let's review the key concepts for ${pretestItem?.prerequisiteName || prereqId}.`,
              keyPoints: ['Key point 1', 'Key point 2'],
              estimatedMinutes: 3,
            };
          });

          // Use feed builder service to insert mini-lessons
          return feedBuilderRef.current.insertMiniLessons(updated, miniLessonData, resultsIndex);
        }
      }

      return updated;
    });
  }, [pretestItems, pretestAnswers]);

  /**
   * Mark the first session as complete
   * Sets first_session_completed_at timestamp in feed_progress table
   * Future sessions will skip the prerequisite pretest
   */
  const markFirstSessionComplete = useCallback(async () => {
    if (!user?.id) {
      console.warn('[FeedContext] Cannot mark first session complete: no user');
      return;
    }

    try {
      const timestamp = new Date().toISOString();

      // Upsert the feed_progress record with first_session_completed_at
      const { error: upsertError } = await supabase
        .from('feed_progress')
        .upsert(
          {
            user_id: user.id,
            source_id: sourceId,
            first_session_completed_at: timestamp,
          },
          {
            onConflict: 'user_id,source_id',
          }
        );

      if (upsertError) {
        console.error('[FeedContext] Failed to mark first session complete:', upsertError);
        return;
      }

      console.log('[FeedContext] First session marked complete for source:', sourceId);
    } catch (err) {
      console.error('[FeedContext] Error marking first session complete:', err);
    }
  }, [user?.id, sourceId]);

  /**
   * Auto-mark first session complete when session completes
   * This ensures subsequent sessions will skip the prerequisite pretest
   */
  useEffect(() => {
    if (sessionComplete) {
      // Session completed - mark first session as complete
      // This is idempotent - if already marked, it will just update the timestamp
      markFirstSessionComplete();
    }
  }, [sessionComplete, markFirstSessionComplete]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<FeedContextValue>(
    () => ({
      feedItems,
      currentIndex,
      isLoading,
      error,
      goToNext,
      goToPrevious,
      jumpToIndex,
      markAsKnown,
      addToReviewQueue,
      submitQuizAnswer,
      completeSynthesis,
      sessionComplete,
      masterySummary,
      sessionStats,
      showBreakModal,
      dismissBreakModal,
      takeBreak,
      streak,
      userXP,
      completionPercentage,
      sessionPerformance,
      completedItemIds,
      sourceId,
      sourceUrl,
      pretestState,
      answerPretest,
      completePretest,
      pretestProgress,
      markFirstSessionComplete,
    }),
    [
      feedItems,
      currentIndex,
      isLoading,
      error,
      goToNext,
      goToPrevious,
      jumpToIndex,
      markAsKnown,
      addToReviewQueue,
      submitQuizAnswer,
      completeSynthesis,
      sessionComplete,
      masterySummary,
      sessionStats,
      showBreakModal,
      dismissBreakModal,
      takeBreak,
      streak,
      userXP,
      completionPercentage,
      sessionPerformance,
      completedItemIds,
      sourceId,
      sourceUrl,
      pretestState,
      answerPretest,
      completePretest,
      pretestProgress,
      markFirstSessionComplete,
    ]
  );

  return (
    <FeedContext.Provider value={contextValue}>
      {children}
    </FeedContext.Provider>
  );
}

/**
 * Hook to access feed state and actions
 *
 * Must be used within a FeedProvider.
 *
 * @returns Feed context value
 * @throws Error if used outside of FeedProvider
 */
export function useFeed(): FeedContextValue {
  const context = useContext(FeedContext);

  if (context === undefined) {
    throw new Error('useFeed must be used within a FeedProvider');
  }

  return context;
}

// Types FeedContextValue, FeedProviderProps, and QuizResult are exported above with their definitions

// Re-export mastery evaluation types for convenience
export type { CompletedInteraction, MasterySummary } from './mastery-evaluation-service';
