/**
 * Session Response Service
 *
 * Handles persisting session responses and updating mastery states.
 * Implements the mastery update logic based on response outcomes.
 *
 * Mastery Update Rules:
 * - Pretest correct: Mark concept as EXPOSED (knows it already)
 * - Follow-up correct: Advance mastery state
 * - Incorrect: Stay at current state (no regression for learning)
 */

import { supabase } from '../supabase';
import { processReview, createInitialConceptState } from '../spaced-repetition';
import type { FSRSRating } from '../fsrs';
import type {
  SessionResponse,
  SessionResponseInsert,
  MisconceptionLogEntry,
} from '@/types/session';
import type {
  MasteryState,
  ConceptState,
  ConceptStateInsert,
} from '@/types/database';

/**
 * Response data for saving
 */
export interface ResponseData {
  /** ID of the concept being tested */
  conceptId: string;
  /** Type of session item (pretest, new, review) */
  itemType: 'pretest' | 'new' | 'review';
  /** Type of question asked */
  questionType: 'multiple_choice' | 'true_false' | 'free_text' | 'interactive';
  /** The question text presented */
  questionText: string;
  /** The user's response */
  userResponse: string;
  /** The correct answer */
  correctAnswer: string;
  /** Whether the response was correct */
  isCorrect: boolean;
  /** Time taken to respond in milliseconds */
  responseTimeMs: number;
  /** Optional confidence level (1-5) */
  confidenceLevel?: number;
  /** Detected misconceptions */
  misconceptions?: MisconceptionLogEntry[];
}

/**
 * Result of saving responses
 */
export interface SaveResponsesResult {
  /** Number of responses saved */
  savedCount: number;
  /** Number of mastery states updated */
  masteryUpdatesCount: number;
  /** Number of misconceptions logged */
  misconceptionsLogged: number;
  /** Any errors that occurred */
  errors: string[];
}

/**
 * Mastery update result for a single concept
 */
export interface MasteryUpdateResult {
  conceptId: string;
  previousState: MasteryState;
  newState: MasteryState;
  updated: boolean;
}

/**
 * Map FSRS rating from response correctness
 * For session responses, we use a simplified mapping:
 * - Correct = Good (3)
 * - Incorrect = Again (1)
 */
function mapToFSRSRating(isCorrect: boolean, responseTimeMs: number): FSRSRating {
  if (!isCorrect) {
    return 1; // Again
  }
  // Fast correct answers get Easy (4), slow correct get Good (3)
  const fastThresholdMs = 5000;
  return responseTimeMs < fastThresholdMs ? 4 : 3;
}

/**
 * Determine the new mastery state based on item type and response
 *
 * Rules:
 * - Pretest correct: EXPOSED (user already knows this)
 * - Pretest incorrect: EXPOSED (first exposure, will learn)
 * - New concept: Follows standard progression
 * - Review: Uses FSRS-based state machine
 */
function determineNewState(
  currentState: MasteryState,
  itemType: 'pretest' | 'new' | 'review',
  isCorrect: boolean
): MasteryState {
  // Pretest always moves to EXPOSED (first encounter)
  if (itemType === 'pretest') {
    return 'exposed';
  }

  // For new concepts, mark as exposed if not already seen
  if (itemType === 'new') {
    if (currentState === 'unseen') {
      return 'exposed';
    }
    // If correct, can advance to fragile
    if (isCorrect && currentState === 'exposed') {
      return 'fragile';
    }
    // No regression for incorrect on new concepts
    return currentState;
  }

  // For reviews, incorrect stays at current state (no regression in learning sessions)
  if (!isCorrect) {
    return currentState;
  }

  // Correct review advances the state
  const stateProgression: Record<MasteryState, MasteryState> = {
    unseen: 'exposed',
    exposed: 'fragile',
    fragile: 'developing',
    developing: 'solid',
    solid: 'solid', // Need transfer question for mastered
    mastered: 'mastered',
    misconceived: 'fragile',
  };

  return stateProgression[currentState] || currentState;
}

/**
 * Get or create concept state for a user
 */
async function getOrCreateConceptState(
  userId: string,
  conceptId: string
): Promise<ConceptState | null> {
  // Try to get existing state
  const { data: existingState, error: getError } = await supabase
    .from('concept_states')
    .select('*')
    .eq('user_id', userId)
    .eq('concept_id', conceptId)
    .single();

  if (existingState && !getError) {
    return existingState as ConceptState;
  }

  // Create new state if not found
  if (getError?.code === 'PGRST116') {
    const newState: ConceptStateInsert = createInitialConceptState(userId, conceptId);

    const { data: createdState, error: createError } = await supabase
      .from('concept_states')
      .insert(newState)
      .select()
      .single();

    if (createError) {
      console.error('Error creating concept state:', createError);
      return null;
    }

    return createdState as ConceptState;
  }

  console.error('Error getting concept state:', getError);
  return null;
}

/**
 * Update mastery state for a concept based on response
 */
async function updateMasteryState(
  userId: string,
  conceptId: string,
  itemType: 'pretest' | 'new' | 'review',
  isCorrect: boolean,
  responseTimeMs: number,
  sessionId: string
): Promise<MasteryUpdateResult | null> {
  // Get current concept state
  const conceptState = await getOrCreateConceptState(userId, conceptId);

  if (!conceptState) {
    return null;
  }

  const previousState = conceptState.state as MasteryState;

  // Determine new state
  const newState = determineNewState(previousState, itemType, isCorrect);

  // If state changed, update using FSRS
  if (newState !== previousState || itemType === 'review') {
    const rating = mapToFSRSRating(isCorrect, responseTimeMs);

    // For pretests and new concepts, use simple state update
    if (itemType === 'pretest' || itemType === 'new') {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      const { error: updateError } = await supabase
        .from('concept_states')
        .update({
          state: newState,
          last_review_date: now,
          session_dates: [...(conceptState.session_dates || []), today].filter(
            (d, i, arr) => arr.indexOf(d) === i
          ),
        })
        .eq('id', conceptState.id);

      if (updateError) {
        console.error('Error updating concept state:', updateError);
        return null;
      }

      // Log review history
      await supabase.from('review_history').insert({
        user_id: userId,
        concept_id: conceptId,
        concept_state_id: conceptState.id,
        rating,
        state_before: previousState,
        state_after: newState,
        stability_before: conceptState.stability,
        stability_after: conceptState.stability,
        difficulty_before: conceptState.difficulty,
        difficulty_after: conceptState.difficulty,
        interval_days: 1,
        next_due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time_to_answer_ms: responseTimeMs,
        session_id: sessionId,
      });

      return {
        conceptId,
        previousState,
        newState,
        updated: previousState !== newState,
      };
    }

    // For reviews, use full FSRS processing
    const result = processReview({
      conceptState,
      rating,
      timeToAnswerMs: responseTimeMs,
      sessionId,
    });

    // Update concept state
    const { error: updateError } = await supabase
      .from('concept_states')
      .update(result.updatedState)
      .eq('id', conceptState.id);

    if (updateError) {
      console.error('Error updating concept state:', updateError);
      return null;
    }

    // Insert review history
    await supabase.from('review_history').insert({
      user_id: userId,
      concept_id: conceptId,
      concept_state_id: conceptState.id,
      ...result.reviewHistory,
    });

    return {
      conceptId,
      previousState,
      newState: result.updatedState.state,
      updated: previousState !== result.updatedState.state,
    };
  }

  return {
    conceptId,
    previousState,
    newState,
    updated: false,
  };
}

/**
 * Log misconception to misconception_log table
 */
async function logMisconception(
  userId: string,
  conceptId: string,
  sessionId: string,
  misconception: MisconceptionLogEntry
): Promise<boolean> {
  try {
    const { error } = await supabase.from('misconception_log').upsert(
      {
        user_id: userId,
        concept_id: conceptId,
        session_id: sessionId,
        misconception_id: misconception.misconception_id,
        detected_at: misconception.detected_at,
        trigger_response: misconception.trigger_response,
        confidence: misconception.confidence,
        occurrence_count: 1,
      },
      {
        onConflict: 'user_id,concept_id,misconception_id',
        ignoreDuplicates: false,
      }
    );

    if (error) {
      // If upsert fails, try to increment occurrence count
      const { error: updateError } = await supabase.rpc('increment_misconception_count', {
        p_user_id: userId,
        p_concept_id: conceptId,
        p_misconception_id: misconception.misconception_id,
      });

      if (updateError) {
        console.error('Error logging misconception:', updateError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error logging misconception:', err);
    return false;
  }
}

/**
 * Save session responses and update mastery states
 *
 * @param sessionId - The learning session ID
 * @param userId - The user ID
 * @param responses - Array of response data to save
 * @returns Result with counts of saved responses, mastery updates, and errors
 */
export async function saveResponses(
  sessionId: string,
  userId: string,
  responses: ResponseData[]
): Promise<SaveResponsesResult> {
  const result: SaveResponsesResult = {
    savedCount: 0,
    masteryUpdatesCount: 0,
    misconceptionsLogged: 0,
    errors: [],
  };

  for (const response of responses) {
    try {
      // Build response insert data
      const responseInsert: SessionResponseInsert = {
        session_id: sessionId,
        concept_id: response.conceptId,
        question_type: response.questionType,
        question_text: response.questionText,
        user_response: response.userResponse,
        correct_answer: response.correctAnswer,
        is_correct: response.isCorrect,
        response_time_ms: response.responseTimeMs,
        confidence_level: response.confidenceLevel,
        misconception_log: response.misconceptions || [],
      };

      // Save response to session_responses table
      const { error: insertError } = await supabase
        .from('session_responses')
        .insert(responseInsert);

      if (insertError) {
        result.errors.push(`Failed to save response for concept ${response.conceptId}: ${insertError.message}`);
        continue;
      }

      result.savedCount++;

      // Update mastery state
      const masteryResult = await updateMasteryState(
        userId,
        response.conceptId,
        response.itemType,
        response.isCorrect,
        response.responseTimeMs,
        sessionId
      );

      if (masteryResult?.updated) {
        result.masteryUpdatesCount++;
      }

      // Log misconceptions
      if (response.misconceptions && response.misconceptions.length > 0) {
        for (const misconception of response.misconceptions) {
          const logged = await logMisconception(
            userId,
            response.conceptId,
            sessionId,
            misconception
          );
          if (logged) {
            result.misconceptionsLogged++;
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Error processing response for concept ${response.conceptId}: ${message}`);
    }
  }

  // Mark session as completed
  try {
    await supabase
      .from('learning_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (err) {
    result.errors.push('Failed to mark session as completed');
  }

  return result;
}

/**
 * Get session responses for a completed session
 */
export async function getSessionResponses(
  sessionId: string
): Promise<SessionResponse[]> {
  const { data, error } = await supabase
    .from('session_responses')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching session responses:', error);
    return [];
  }

  return (data || []) as SessionResponse[];
}

/**
 * Calculate session statistics from responses
 */
export function calculateSessionStats(responses: ResponseData[]): {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageTimeMs: number;
  byType: {
    pretest: { total: number; correct: number };
    new: { total: number; correct: number };
    review: { total: number; correct: number };
  };
} {
  const total = responses.length;
  const correct = responses.filter((r) => r.isCorrect).length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const totalTimeMs = responses.reduce((sum, r) => sum + r.responseTimeMs, 0);
  const averageTimeMs = total > 0 ? Math.round(totalTimeMs / total) : 0;

  const byType = {
    pretest: { total: 0, correct: 0 },
    new: { total: 0, correct: 0 },
    review: { total: 0, correct: 0 },
  };

  for (const response of responses) {
    const type = response.itemType;
    byType[type].total++;
    if (response.isCorrect) {
      byType[type].correct++;
    }
  }

  return {
    total,
    correct,
    incorrect,
    accuracy,
    averageTimeMs,
    byType,
  };
}
