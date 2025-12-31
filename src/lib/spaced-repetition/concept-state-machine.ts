/**
 * Concept State Machine Implementation
 *
 * Manages mastery state transitions based on review outcomes.
 */

import { FSRSRating } from '../fsrs';
import {
  MasteryState,
  ConceptStateData,
  StateTransitionCriteria,
  StateMetadata,
  ReviewOptions,
  STATE_METADATA,
  FAST_RESPONSE_THRESHOLD_MS,
} from './state-types';

/**
 * Check if a rating counts as successful (Good or Easy)
 */
export function isSuccessfulRating(rating: FSRSRating): boolean {
  return rating >= 3;
}

/**
 * Check if a rating should trigger regression (Again only)
 */
export function shouldRegress(rating: FSRSRating): boolean {
  return rating === 1;
}

/**
 * Check if response was fast enough for mastery
 */
function isFastResponse(responseTimeMs?: number): boolean {
  if (responseTimeMs === undefined) return false;
  return responseTimeMs < FAST_RESPONSE_THRESHOLD_MS;
}

/**
 * Check if today is a different day from any in the session dates
 */
function isNewDay(sessionDates: string[]): boolean {
  const today = new Date().toISOString().split('T')[0];
  return !sessionDates.includes(today);
}

/**
 * Get the number of unique days in session dates
 */
function getUniqueDays(sessionDates: string[]): number {
  const uniqueDays = new Set(sessionDates);
  return uniqueDays.size;
}

/**
 * Get transition criteria for a given state
 */
export function getTransitionCriteria(
  currentState: MasteryState
): StateTransitionCriteria[] {
  const criteria: Record<MasteryState, StateTransitionCriteria[]> = {
    unseen: [
      {
        fromState: 'unseen',
        toState: 'exposed',
        // Any review transitions to exposed
      },
    ],
    exposed: [
      {
        fromState: 'exposed',
        toState: 'fragile',
        minSuccessfulSessions: 1,
      },
    ],
    fragile: [
      {
        fromState: 'fragile',
        toState: 'developing',
        minSuccessfulSessions: 2,
        requiresDifferentDays: true,
      },
      {
        fromState: 'fragile',
        toState: 'exposed',
        isRegression: true,
      },
    ],
    developing: [
      {
        fromState: 'developing',
        toState: 'solid',
        minSuccessfulSessions: 3,
        requiresDifferentDays: true,
      },
      {
        fromState: 'developing',
        toState: 'fragile',
        isRegression: true,
      },
    ],
    solid: [
      {
        fromState: 'solid',
        toState: 'mastered',
        requiresFastResponse: true,
        requiresTransferQuestion: true,
      },
      {
        fromState: 'solid',
        toState: 'fragile',
        isRegression: true,
      },
    ],
    mastered: [
      {
        fromState: 'mastered',
        toState: 'solid',
        isRegression: true,
      },
    ],
    misconceived: [
      {
        fromState: 'misconceived',
        toState: 'fragile',
        minSuccessfulSessions: 1,
      },
    ],
  };

  return criteria[currentState] || [];
}

/**
 * Evaluate what the next state should be after a review
 */
export function evaluateTransition(
  currentData: ConceptStateData,
  options: ReviewOptions
): MasteryState {
  const { state, successfulSessions, sessionDates } = currentData;
  const { rating, isTransferQuestion, responseTimeMs, confidenceLevel } = options;

  // Handle UNSEEN first - any review moves to exposed
  if (state === 'unseen') {
    return 'exposed';
  }

  // Check for misconception (confident wrong answer)
  if (shouldRegress(rating) && confidenceLevel === 'high') {
    return 'misconceived';
  }

  // Handle regression on failure
  if (shouldRegress(rating)) {
    return getRegressedState(state);
  }

  // Handle successful review progression
  const isSuccess = isSuccessfulRating(rating);

  switch (state) {
    case 'exposed':
      // Successful review moves to fragile
      return isSuccess ? 'fragile' : 'exposed';

    case 'fragile':
      // Need 2+ successful sessions on different days
      if (isSuccess) {
        const newSessionCount = successfulSessions + 1;
        const willBeNewDay = isNewDay(sessionDates);
        const uniqueDaysAfter = getUniqueDays(sessionDates) + (willBeNewDay ? 1 : 0);

        if (newSessionCount >= 2 && uniqueDaysAfter >= 2) {
          return 'developing';
        }
      }
      return 'fragile';

    case 'developing':
      // Need 3+ successful sessions on different days
      if (isSuccess) {
        const newSessionCount = successfulSessions + 1;
        const willBeNewDay = isNewDay(sessionDates);
        const uniqueDaysAfter = getUniqueDays(sessionDates) + (willBeNewDay ? 1 : 0);

        if (newSessionCount >= 3 && uniqueDaysAfter >= 3) {
          return 'solid';
        }
      }
      return 'developing';

    case 'solid':
      // Need fast + correct (Easy) + transfer question
      if (
        rating === 4 && // Easy
        isTransferQuestion === true &&
        isFastResponse(responseTimeMs)
      ) {
        return 'mastered';
      }
      return 'solid';

    case 'mastered':
      // Stay mastered (regression handled above)
      return 'mastered';

    case 'misconceived':
      // Successful review moves back to fragile
      return isSuccess ? 'fragile' : 'misconceived';

    default:
      return state;
  }
}

/**
 * Get the regressed state after a failure
 */
function getRegressedState(currentState: MasteryState): MasteryState {
  const regressionMap: Partial<Record<MasteryState, MasteryState>> = {
    mastered: 'solid',
    solid: 'fragile',
    developing: 'fragile',
    fragile: 'exposed',
    exposed: 'exposed',
    misconceived: 'exposed',
  };

  return regressionMap[currentState] || currentState;
}

/**
 * Get the color for a mastery state
 */
export function getStateColor(state: MasteryState): string {
  return STATE_METADATA[state].color;
}

/**
 * Get the human-readable label for a mastery state
 */
export function getStateLabel(state: MasteryState): string {
  return STATE_METADATA[state].label;
}

/**
 * Concept State Machine class for stateful usage
 */
export class ConceptStateMachine {
  /**
   * Evaluate state transition
   */
  evaluateTransition(
    currentData: ConceptStateData,
    options: ReviewOptions
  ): MasteryState {
    return evaluateTransition(currentData, options);
  }

  /**
   * Get transition criteria for a state
   */
  getTransitionCriteria(state: MasteryState): StateTransitionCriteria[] {
    return getTransitionCriteria(state);
  }

  /**
   * Get state metadata
   */
  getStateMetadata(state: MasteryState): StateMetadata {
    return STATE_METADATA[state];
  }

  /**
   * Get color for a state
   */
  getStateColor(state: MasteryState): string {
    return getStateColor(state);
  }

  /**
   * Get label for a state
   */
  getStateLabel(state: MasteryState): string {
    return getStateLabel(state);
  }

  /**
   * Check if rating is successful
   */
  isSuccessfulRating(rating: FSRSRating): boolean {
    return isSuccessfulRating(rating);
  }

  /**
   * Check if rating should cause regression
   */
  shouldRegress(rating: FSRSRating): boolean {
    return shouldRegress(rating);
  }
}

/**
 * Default state machine instance
 */
export const stateMachine = new ConceptStateMachine();
