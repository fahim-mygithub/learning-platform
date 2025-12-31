/**
 * FSRS-5 Algorithm Types
 *
 * Free Spaced Repetition Scheduler (FSRS) is a modern spaced repetition algorithm
 * that outperforms SM-2 by 10-15% in prediction accuracy.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

/**
 * FSRS Rating scale (1-4)
 * - 1: Again (forgot completely, need to relearn)
 * - 2: Hard (correct but with significant difficulty)
 * - 3: Good (correct with moderate effort)
 * - 4: Easy (correct with no effort)
 */
export type FSRSRating = 1 | 2 | 3 | 4;

/**
 * Card learning state
 */
export type FSRSCardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * FSRS Card representation
 */
export interface FSRSCard {
  /** Days until 90% chance of forgetting (memory stability) */
  stability: number;
  /** How hard this card is for this user (0-1 scale, higher = harder) */
  difficulty: number;
  /** Days since last review */
  elapsedDays: number;
  /** Days scheduled until next review */
  scheduledDays: number;
  /** Total number of reviews */
  reps: number;
  /** Number of times forgotten (rated Again) */
  lapses: number;
  /** Current card state */
  state: FSRSCardState;
  /** Last review date (ISO string) */
  lastReview?: string;
}

/**
 * FSRS scheduling output
 */
export interface FSRSSchedulingResult {
  /** Updated card after scheduling */
  card: FSRSCard;
  /** Days until next review */
  scheduledDays: number;
  /** Next due date */
  dueDate: Date;
  /** Current recall probability (0-1) */
  retrievability: number;
}

/**
 * FSRS-5 algorithm parameters
 * Default values are optimized from large-scale data
 */
export interface FSRSParameters {
  /**
   * 19 weights for FSRS-5 algorithm
   * w[0-3]: Initial stability for ratings 1-4
   * w[4]: Difficulty decay
   * w[5-18]: Various multipliers and modifiers
   */
  w: number[];
  /** Target recall probability (0.7-0.97, default 0.9) */
  desiredRetention: number;
  /** Maximum interval in days (default 365) */
  maxInterval: number;
}

/**
 * Preview of intervals for all possible ratings
 */
export interface FSRSIntervalPreview {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

/**
 * Default FSRS-5 parameters
 * These values are from the official FSRS implementation
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  w: [
    0.4072, // w[0]: Initial stability for rating 1 (Again)
    1.1829, // w[1]: Initial stability for rating 2 (Hard)
    3.1262, // w[2]: Initial stability for rating 3 (Good)
    15.4722, // w[3]: Initial stability for rating 4 (Easy)
    7.2102, // w[4]: Difficulty weight
    0.5316, // w[5]: Stability multiplier for success
    1.0651, // w[6]: Difficulty multiplier for success
    0.0234, // w[7]: Hard penalty
    1.5458, // w[8]: Easy bonus
    0.1067, // w[9]: Stability for failure (decay)
    1.0159, // w[10]: Difficulty after failure
    2.1559, // w[11]: Short-term stability modifier
    0.0537, // w[12]: Recall probability power
    0.3455, // w[13]: Recall probability multiplier
    1.3098, // w[14]: Memory stability decay
    0.2803, // w[15]: Difficulty decay rate
    2.6122, // w[16]: Stability growth
    0.000499, // w[17]: Forget penalty
    0.5827, // w[18]: Success bonus
  ],
  desiredRetention: 0.9,
  maxInterval: 365,
};

/**
 * Create a new FSRS card with default values
 */
export function createNewCard(): FSRSCard {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

/**
 * Rating labels for UI display
 */
export const RATING_LABELS: Record<FSRSRating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};
