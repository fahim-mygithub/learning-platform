/**
 * FSRS-5 Algorithm Implementation
 *
 * Free Spaced Repetition Scheduler (FSRS) is a modern spaced repetition algorithm
 * developed by Jarrett Ye. This implementation is based on FSRS-5.
 *
 * Key concepts:
 * - Stability (S): Days until recall probability drops to 90%
 * - Difficulty (D): How hard this card is for this user (0-1)
 * - Retrievability (R): Current probability of recall
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

import {
  FSRSCard,
  FSRSRating,
  FSRSParameters,
  FSRSSchedulingResult,
  FSRSIntervalPreview,
  DEFAULT_FSRS_PARAMETERS,
  createNewCard,
} from './fsrs-types';

/**
 * FSRS decay factor (used in forgetting curve)
 */
const DECAY = -0.5;

/**
 * FSRS factor (derived from decay)
 * factor = 0.9^(1/decay) - 1
 */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

/**
 * Get initial stability for a rating (first review of new card)
 */
export function getInitialStability(
  rating: FSRSRating,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): number {
  return params.w[rating - 1];
}

/**
 * Get initial difficulty for a rating (first review of new card)
 * Returns value between 0 and 1
 *
 * Rating 1 (Again): ~0.6 (hard to remember)
 * Rating 2 (Hard): ~0.45
 * Rating 3 (Good): ~0.3 (default)
 * Rating 4 (Easy): ~0.15 (easy to remember)
 */
export function getInitialDifficulty(
  rating: FSRSRating,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): number {
  // Simplified initial difficulty based on first rating
  // Higher rating = easier card = lower difficulty
  const difficulties: Record<FSRSRating, number> = {
    1: 0.6,
    2: 0.45,
    3: 0.3,
    4: 0.15,
  };
  return difficulties[rating];
}

/**
 * Calculate retrievability (recall probability) given elapsed days
 * R(t, S) = (1 + FACTOR * t/S)^DECAY
 */
export function getRetrievability(card: FSRSCard, elapsedDays: number): number {
  if (card.stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;

  const r = Math.pow(1 + (FACTOR * elapsedDays) / card.stability, DECAY);
  return clamp(r, 0, 1);
}

/**
 * Calculate new stability after a review
 */
function calculateNewStability(
  card: FSRSCard,
  rating: FSRSRating,
  retrievability: number,
  params: FSRSParameters
): number {
  const { w } = params;
  const s = card.stability;
  const d = card.difficulty;

  if (rating === 1) {
    // Again: Stability decreases significantly
    // S'(S, D) = w9 * D^(-w10) * ((S + 1)^w11 - 1) * e^(w17 * (1 - R))
    const newS =
      w[9] *
      Math.pow(d * 10, -w[10]) *
      (Math.pow(s + 1, w[11]) - 1) *
      Math.exp(w[17] * (1 - retrievability));
    return Math.max(0.1, newS);
  }

  // Successful review: Stability increases
  // S'(S, D, R, G) = S * (e^(w8) * (11 - D) * S^(-w9) * (e^(w10 * (1 - R)) - 1) * hardPenalty * easyBonus + 1)
  const hardPenalty = rating === 2 ? w[7] : 1;
  const easyBonus = rating === 4 ? w[8] : 1;

  const newS =
    s *
    (Math.exp(w[16]) *
      (11 - d * 10) *
      Math.pow(s, -w[14]) *
      (Math.exp(w[15] * (1 - retrievability)) - 1) *
      hardPenalty *
      easyBonus +
      1);

  return Math.max(0.1, newS);
}

/**
 * Calculate new difficulty after a review
 * Using simplified FSRS approach: adjust difficulty based on rating
 */
function calculateNewDifficulty(
  card: FSRSCard,
  rating: FSRSRating,
  params: FSRSParameters
): number {
  const d = card.difficulty;

  // Simplified difficulty adjustment:
  // - Again (1): increase difficulty by 0.1
  // - Hard (2): increase difficulty by 0.05
  // - Good (3): no change
  // - Easy (4): decrease difficulty by 0.05
  const adjustments: Record<FSRSRating, number> = {
    1: 0.1,
    2: 0.05,
    3: 0,
    4: -0.05,
  };

  const newD = d + adjustments[rating];

  // Mean reversion towards 0.3 (default difficulty)
  const meanReversion = 0.1;
  const targetD = 0.3;
  const revertedD = newD + meanReversion * (targetD - newD);

  return clamp(revertedD, 0.01, 1);
}

/**
 * Calculate scheduled interval from stability and desired retention
 * I(S, R) = S / FACTOR * (R^(1/DECAY) - 1)
 */
function calculateInterval(
  stability: number,
  desiredRetention: number,
  maxInterval: number
): number {
  const interval =
    (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return clamp(Math.round(interval), 1, maxInterval);
}

/**
 * Schedule the next review for a card
 */
export function scheduleReview(
  card: FSRSCard,
  rating: FSRSRating,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): FSRSSchedulingResult {
  const now = new Date();
  const isNew = card.state === 'new' || card.reps === 0;

  let newCard: FSRSCard;
  let scheduledDays: number;

  if (isNew) {
    // First review of a new card
    const stability = getInitialStability(rating, params);
    const difficulty = getInitialDifficulty(rating, params);

    scheduledDays = calculateInterval(
      stability,
      params.desiredRetention,
      params.maxInterval
    );

    newCard = {
      stability,
      difficulty,
      elapsedDays: 0,
      scheduledDays,
      reps: 1,
      lapses: rating === 1 ? 1 : 0,
      state: rating === 1 ? 'relearning' : 'learning',
      lastReview: now.toISOString(),
    };
  } else {
    // Review of an existing card
    const elapsedDays = card.elapsedDays || 0;
    const retrievability = getRetrievability(card, elapsedDays);

    const newStability = calculateNewStability(card, rating, retrievability, params);
    const newDifficulty = calculateNewDifficulty(card, rating, params);

    scheduledDays = calculateInterval(
      newStability,
      params.desiredRetention,
      params.maxInterval
    );

    let newState = card.state;
    let lapses = card.lapses;

    if (rating === 1) {
      // Failed review
      newState = 'relearning';
      lapses += 1;
    } else if (card.state === 'learning' || card.state === 'relearning') {
      // Graduate to review after successful learning
      newState = 'review';
    }

    newCard = {
      stability: newStability,
      difficulty: newDifficulty,
      elapsedDays: 0,
      scheduledDays,
      reps: card.reps + 1,
      lapses,
      state: newState,
      lastReview: now.toISOString(),
    };
  }

  const dueDate = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000);
  const retrievability = getRetrievability(newCard, 0);

  return {
    card: newCard,
    scheduledDays,
    dueDate,
    retrievability,
  };
}

/**
 * Preview intervals for all possible ratings
 */
export function previewIntervals(
  card: FSRSCard,
  params: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): FSRSIntervalPreview {
  return {
    again: scheduleReview(card, 1, params).scheduledDays,
    hard: scheduleReview(card, 2, params).scheduledDays,
    good: scheduleReview(card, 3, params).scheduledDays,
    easy: scheduleReview(card, 4, params).scheduledDays,
  };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * FSRS Algorithm class for stateful usage
 */
export class FSRSAlgorithm {
  private params: FSRSParameters;

  constructor(params?: Partial<FSRSParameters>) {
    this.params = {
      ...DEFAULT_FSRS_PARAMETERS,
      ...params,
    };
  }

  /**
   * Get the current parameters
   */
  getParameters(): FSRSParameters {
    return { ...this.params };
  }

  /**
   * Update parameters
   */
  setParameters(params: Partial<FSRSParameters>): void {
    this.params = {
      ...this.params,
      ...params,
    };
  }

  /**
   * Schedule the next review
   */
  scheduleReview(card: FSRSCard, rating: FSRSRating): FSRSSchedulingResult {
    return scheduleReview(card, rating, this.params);
  }

  /**
   * Get initial stability for a rating
   */
  getInitialStability(rating: FSRSRating): number {
    return getInitialStability(rating, this.params);
  }

  /**
   * Get initial difficulty for a rating
   */
  getInitialDifficulty(rating: FSRSRating): number {
    return getInitialDifficulty(rating, this.params);
  }

  /**
   * Get current retrievability
   */
  getRetrievability(card: FSRSCard, elapsedDays: number): number {
    return getRetrievability(card, elapsedDays);
  }

  /**
   * Preview intervals for all ratings
   */
  previewIntervals(card: FSRSCard): FSRSIntervalPreview {
    return previewIntervals(card, this.params);
  }
}

/**
 * Default FSRS instance
 */
export const fsrs = new FSRSAlgorithm();
