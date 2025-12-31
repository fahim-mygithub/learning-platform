/**
 * Spaced Repetition Service
 *
 * Main orchestration service for spaced repetition system.
 * Handles review processing, state transitions, and FSRS calculations.
 */

import { FSRSRating, FSRSCard, scheduleReview, createNewCard } from '../fsrs';
import { evaluateTransition } from './concept-state-machine';
import { MasteryState, ConfidenceLevel, ConceptStateData } from './state-types';
import {
  ConceptState,
  ConceptStateInsert,
  ConceptStateUpdate,
  ReviewHistoryInsert,
} from '../../types/database';

/**
 * Input for processing a review
 */
export interface ProcessReviewInput {
  conceptState: ConceptState;
  rating: FSRSRating;
  timeToAnswerMs?: number;
  sessionId?: string;
  confidenceLevel?: ConfidenceLevel;
  isTransferQuestion?: boolean;
}

/**
 * Result of processing a review
 */
export interface ProcessReviewResult {
  updatedState: ConceptStateUpdate & {
    state: MasteryState;
    stability: number;
    difficulty: number;
    due_date: string | null;
    last_review_date: string;
    successful_sessions: number;
    consecutive_correct: number;
    session_dates: string[];
  };
  reviewHistory: Omit<ReviewHistoryInsert, 'user_id' | 'concept_id' | 'concept_state_id'>;
  intervalDays: number;
}

/**
 * Create initial concept state for a new concept
 */
export function createInitialConceptState(
  userId: string,
  conceptId: string
): ConceptStateInsert {
  return {
    user_id: userId,
    concept_id: conceptId,
    state: 'unseen',
    stability: 1.0,
    difficulty: 0.3,
    due_date: null,
    last_review_date: null,
    successful_sessions: 0,
    consecutive_correct: 0,
    session_dates: [],
  };
}

/**
 * Calculate next due date from interval
 */
export function calculateNextDueDate(
  intervalDays: number,
  fromDate: Date = new Date()
): string {
  const dueDate = new Date(fromDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return dueDate.toISOString();
}

/**
 * Map ConceptState to ConceptStateData for state machine
 */
function mapToStateData(state: ConceptState): ConceptStateData {
  return {
    state: state.state as MasteryState,
    successfulSessions: state.successful_sessions,
    consecutiveCorrect: state.consecutive_correct,
    sessionDates: state.session_dates as string[],
    stability: state.stability,
    difficulty: state.difficulty,
    dueDate: state.due_date ? new Date(state.due_date) : null,
    lastReviewDate: state.last_review_date ? new Date(state.last_review_date) : null,
  };
}

/**
 * Map ConceptState to FSRSCard
 */
function mapToFSRSCard(state: ConceptState): FSRSCard {
  const lastReview = state.last_review_date
    ? new Date(state.last_review_date)
    : undefined;
  const now = new Date();

  let elapsedDays = 0;
  if (lastReview) {
    elapsedDays = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
  }

  // Map mastery state to FSRS card state
  let cardState: 'new' | 'learning' | 'review' | 'relearning' = 'new';
  if (state.state === 'unseen') {
    cardState = 'new';
  } else if (['exposed', 'fragile'].includes(state.state)) {
    cardState = 'learning';
  } else if (['developing', 'solid', 'mastered'].includes(state.state)) {
    cardState = 'review';
  } else if (state.state === 'misconceived') {
    cardState = 'relearning';
  }

  return {
    stability: state.stability,
    difficulty: state.difficulty,
    elapsedDays,
    scheduledDays: 0, // Will be set by FSRS
    reps: state.successful_sessions,
    lapses: 0, // Could track this separately if needed
    state: cardState,
    lastReview: state.last_review_date || undefined,
  };
}

/**
 * Check if successful rating
 */
function isSuccessfulRating(rating: FSRSRating): boolean {
  return rating >= 3;
}

/**
 * Process a review and return updated state + history
 *
 * This is a pure function - no database calls.
 * Use this with your Supabase client to persist changes.
 */
export function processReview(input: ProcessReviewInput): ProcessReviewResult {
  const { conceptState, rating, timeToAnswerMs, sessionId, confidenceLevel, isTransferQuestion } =
    input;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get current state data for state machine
  const stateData = mapToStateData(conceptState);

  // Evaluate state transition
  const newMasteryState = evaluateTransition(stateData, {
    rating,
    confidenceLevel,
    isTransferQuestion,
    responseTimeMs: timeToAnswerMs,
  });

  // Get FSRS card and schedule next review
  const fsrsCard = mapToFSRSCard(conceptState);
  const fsrsResult = scheduleReview(fsrsCard, rating);

  // Update session tracking
  const isSuccess = isSuccessfulRating(rating);
  const newSuccessfulSessions = isSuccess
    ? conceptState.successful_sessions + 1
    : conceptState.successful_sessions;
  const newConsecutiveCorrect = isSuccess ? conceptState.consecutive_correct + 1 : 0;

  // Add today to session dates if not already present
  const sessionDates = [...(conceptState.session_dates as string[])];
  if (!sessionDates.includes(today)) {
    sessionDates.push(today);
  }

  // Calculate next due date
  const nextDueDate = calculateNextDueDate(fsrsResult.scheduledDays, now);

  // Build updated state
  const updatedState = {
    state: newMasteryState,
    stability: fsrsResult.card.stability,
    difficulty: fsrsResult.card.difficulty,
    due_date: nextDueDate,
    last_review_date: now.toISOString(),
    successful_sessions: newSuccessfulSessions,
    consecutive_correct: newConsecutiveCorrect,
    session_dates: sessionDates,
  };

  // Build review history record
  const reviewHistory: Omit<ReviewHistoryInsert, 'user_id' | 'concept_id' | 'concept_state_id'> = {
    rating,
    state_before: conceptState.state,
    state_after: newMasteryState,
    stability_before: conceptState.stability,
    stability_after: fsrsResult.card.stability,
    difficulty_before: conceptState.difficulty,
    difficulty_after: fsrsResult.card.difficulty,
    interval_days: fsrsResult.scheduledDays,
    next_due_date: nextDueDate,
    time_to_answer_ms: timeToAnswerMs,
    session_id: sessionId,
  };

  return {
    updatedState,
    reviewHistory,
    intervalDays: fsrsResult.scheduledDays,
  };
}

/**
 * Batch process multiple reviews
 */
export function batchProcessReviews(
  inputs: ProcessReviewInput[]
): ProcessReviewResult[] {
  return inputs.map((input) => processReview(input));
}

/**
 * Estimate daily review load based on current queue
 */
export interface DailyLoadEstimate {
  today: number;
  tomorrow: number;
  thisWeek: number;
  averagePerDay: number;
}

/**
 * Calculate estimated review load
 */
export function estimateDailyLoad(
  conceptStates: ConceptState[],
  daysAhead: number = 7
): DailyLoadEstimate {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayEnd.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  let today = 0;
  let tomorrow = 0;
  let thisWeek = 0;

  for (const state of conceptStates) {
    if (!state.due_date) continue;

    const dueDate = new Date(state.due_date);

    if (dueDate <= todayEnd) {
      today++;
      tomorrow++;
      thisWeek++;
    } else if (dueDate <= tomorrowEnd) {
      tomorrow++;
      thisWeek++;
    } else if (dueDate <= weekEnd) {
      thisWeek++;
    }
  }

  return {
    today,
    tomorrow,
    thisWeek,
    averagePerDay: thisWeek / daysAhead,
  };
}
