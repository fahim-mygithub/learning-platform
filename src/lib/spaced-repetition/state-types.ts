/**
 * Concept State Machine Types
 *
 * Defines the mastery states and transition criteria for concept learning.
 */

import { FSRSRating } from '../fsrs';
import { colors } from '../../theme/colors';

/**
 * Mastery states following the learning-platform spec
 *
 * Progression: UNSEEN -> EXPOSED -> FRAGILE -> DEVELOPING -> SOLID -> MASTERED
 * Special: MISCONCEIVED (confident wrong answer)
 */
export type MasteryState =
  | 'unseen'
  | 'exposed'
  | 'fragile'
  | 'developing'
  | 'solid'
  | 'mastered'
  | 'misconceived';

/**
 * All mastery states in order of progression
 */
export const MASTERY_STATES: MasteryState[] = [
  'unseen',
  'exposed',
  'fragile',
  'developing',
  'solid',
  'mastered',
];

/**
 * State transition criteria
 */
export interface StateTransitionCriteria {
  /** Starting state */
  fromState: MasteryState;
  /** Target state */
  toState: MasteryState;
  /** Minimum successful review sessions required */
  minSuccessfulSessions?: number;
  /** Minimum consecutive correct answers required */
  minConsecutiveCorrect?: number;
  /** Whether sessions must be on different calendar days */
  requiresDifferentDays?: boolean;
  /** Minimum days apart for sessions */
  minDaysApart?: number;
  /** Whether a fast response is required */
  requiresFastResponse?: boolean;
  /** Whether a transfer question is required */
  requiresTransferQuestion?: boolean;
  /** Whether this is a regression (failure) transition */
  isRegression?: boolean;
}

/**
 * Concept state data stored in database
 */
export interface ConceptStateData {
  /** Current mastery state */
  state: MasteryState;
  /** FSRS stability (days until 90% forgetting) */
  stability: number;
  /** FSRS difficulty (0-1 scale) */
  difficulty: number;
  /** When the next review is due */
  dueDate: Date | null;
  /** When last reviewed */
  lastReviewDate: Date | null;
  /** Count of successful review sessions */
  successfulSessions: number;
  /** Current streak of consecutive correct answers */
  consecutiveCorrect: number;
  /** Dates of successful sessions (for different-day requirement) */
  sessionDates: string[];
}

/**
 * Confidence level for misconception detection
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Review options for state evaluation
 */
export interface ReviewOptions {
  /** Rating from the review (1-4) */
  rating: FSRSRating;
  /** Whether this was a transfer question */
  isTransferQuestion?: boolean;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** User's confidence level (for misconception detection) */
  confidenceLevel?: ConfidenceLevel;
}

/**
 * State metadata for UI display
 */
export interface StateMetadata {
  /** Human-readable label */
  label: string;
  /** Color from theme */
  color: string;
  /** Short description */
  description: string;
  /** Progress percentage (0-100) */
  progressPercent: number;
}

/**
 * State metadata for all mastery states
 */
export const STATE_METADATA: Record<MasteryState, StateMetadata> = {
  unseen: {
    label: 'Unseen',
    color: colors.mastery.unseen,
    description: 'Not yet encountered',
    progressPercent: 0,
  },
  exposed: {
    label: 'Exposed',
    color: colors.mastery.exposed,
    description: 'First exposure, needs review',
    progressPercent: 10,
  },
  fragile: {
    label: 'Fragile',
    color: colors.mastery.fragile,
    description: 'Early learning, review soon',
    progressPercent: 30,
  },
  developing: {
    label: 'Developing',
    color: colors.mastery.developing,
    description: 'Building strength',
    progressPercent: 50,
  },
  solid: {
    label: 'Solid',
    color: colors.mastery.solid,
    description: 'Well learned, approaching mastery',
    progressPercent: 75,
  },
  mastered: {
    label: 'Mastered',
    color: colors.mastery.mastered,
    description: 'Fully mastered',
    progressPercent: 100,
  },
  misconceived: {
    label: 'Misconceived',
    color: colors.error,
    description: 'Needs correction',
    progressPercent: 20,
  },
};

/**
 * Fast response threshold in milliseconds
 * Responses under this time are considered "fast"
 */
export const FAST_RESPONSE_THRESHOLD_MS = 5000; // 5 seconds

/**
 * Create default concept state data for a new concept
 */
export function createDefaultConceptState(): ConceptStateData {
  return {
    state: 'unseen',
    stability: 0,
    difficulty: 0.3,
    dueDate: null,
    lastReviewDate: null,
    successfulSessions: 0,
    consecutiveCorrect: 0,
    sessionDates: [],
  };
}
