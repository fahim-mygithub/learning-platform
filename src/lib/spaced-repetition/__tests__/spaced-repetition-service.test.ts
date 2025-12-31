/**
 * Spaced Repetition Service Tests
 *
 * Tests for the main orchestration service.
 */

import {
  processReview,
  createInitialConceptState,
  calculateNextDueDate,
  ProcessReviewInput,
  ProcessReviewResult,
} from '../spaced-repetition-service';
import { FSRSRating } from '../../fsrs';

describe('SpacedRepetitionService', () => {
  describe('createInitialConceptState', () => {
    it('creates state with default FSRS values', () => {
      const state = createInitialConceptState('user-1', 'concept-1');

      expect(state.user_id).toBe('user-1');
      expect(state.concept_id).toBe('concept-1');
      expect(state.state).toBe('unseen');
      expect(state.stability).toBe(1.0);
      expect(state.difficulty).toBe(0.3);
      expect(state.successful_sessions).toBe(0);
      expect(state.consecutive_correct).toBe(0);
      expect(state.session_dates).toEqual([]);
    });
  });

  describe('calculateNextDueDate', () => {
    it('returns date based on interval days', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      const intervalDays = 3;

      const dueDate = calculateNextDueDate(intervalDays, now);

      expect(new Date(dueDate).toISOString().split('T')[0]).toBe('2024-01-18');
    });

    it('handles fractional days', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      const intervalDays = 1.5;

      const dueDate = calculateNextDueDate(intervalDays, now);

      // 1.5 days = 36 hours later
      const expected = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000);
      expect(new Date(dueDate).getTime()).toBe(expected.getTime());
    });
  });

  describe('processReview', () => {
    const baseInput: ProcessReviewInput = {
      conceptState: {
        id: 'cs-1',
        user_id: 'user-1',
        concept_id: 'concept-1',
        state: 'exposed',
        stability: 1.0,
        difficulty: 0.3,
        due_date: '2024-01-15T00:00:00Z',
        last_review_date: null,
        successful_sessions: 0,
        consecutive_correct: 0,
        session_dates: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      rating: 3 as FSRSRating,
    };

    it('returns updated concept state', () => {
      const result = processReview(baseInput);

      expect(result.updatedState).toBeDefined();
      expect(result.updatedState.state).toBe('fragile'); // exposed -> fragile on success
    });

    it('returns review history record', () => {
      const result = processReview(baseInput);

      expect(result.reviewHistory).toBeDefined();
      expect(result.reviewHistory.rating).toBe(3);
      expect(result.reviewHistory.state_before).toBe('exposed');
      expect(result.reviewHistory.state_after).toBe('fragile');
    });

    it('increments successful sessions on good rating', () => {
      const result = processReview(baseInput);

      expect(result.updatedState.successful_sessions).toBe(1);
      expect(result.updatedState.consecutive_correct).toBe(1);
    });

    it('resets consecutive correct on failure', () => {
      const input: ProcessReviewInput = {
        ...baseInput,
        conceptState: {
          ...baseInput.conceptState,
          state: 'fragile',
          consecutive_correct: 3,
        },
        rating: 1 as FSRSRating,
      };

      const result = processReview(input);

      expect(result.updatedState.consecutive_correct).toBe(0);
    });

    it('adds today to session dates', () => {
      const result = processReview(baseInput);

      expect(result.updatedState.session_dates.length).toBeGreaterThan(0);
      const today = new Date().toISOString().split('T')[0];
      expect(result.updatedState.session_dates).toContain(today);
    });

    it('transitions state correctly on review', () => {
      // UNSEEN -> EXPOSED
      const unseenInput: ProcessReviewInput = {
        ...baseInput,
        conceptState: { ...baseInput.conceptState, state: 'unseen' },
        rating: 3 as FSRSRating,
      };
      expect(processReview(unseenInput).updatedState.state).toBe('exposed');

      // EXPOSED -> FRAGILE on Good
      const exposedInput: ProcessReviewInput = {
        ...baseInput,
        conceptState: { ...baseInput.conceptState, state: 'exposed' },
        rating: 3 as FSRSRating,
      };
      expect(processReview(exposedInput).updatedState.state).toBe('fragile');

      // FRAGILE -> EXPOSED on Again
      const fragileInput: ProcessReviewInput = {
        ...baseInput,
        conceptState: { ...baseInput.conceptState, state: 'fragile' },
        rating: 1 as FSRSRating,
      };
      expect(processReview(fragileInput).updatedState.state).toBe('exposed');
    });

    it('calculates new stability and difficulty', () => {
      const result = processReview(baseInput);

      // FSRS updates these values
      expect(result.updatedState.stability).toBeGreaterThan(0);
      expect(result.updatedState.difficulty).toBeGreaterThan(0);
      expect(result.updatedState.difficulty).toBeLessThanOrEqual(1);
    });

    it('sets next due date', () => {
      const result = processReview(baseInput);

      expect(result.updatedState.due_date).toBeDefined();
      expect(new Date(result.updatedState.due_date!).getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it('records time to answer when provided', () => {
      const input: ProcessReviewInput = {
        ...baseInput,
        timeToAnswerMs: 5000,
      };

      const result = processReview(input);

      expect(result.reviewHistory.time_to_answer_ms).toBe(5000);
    });

    it('records session ID when provided', () => {
      const input: ProcessReviewInput = {
        ...baseInput,
        sessionId: 'session-123',
      };

      const result = processReview(input);

      expect(result.reviewHistory.session_id).toBe('session-123');
    });

    it('handles confidence level for misconception detection', () => {
      const input: ProcessReviewInput = {
        ...baseInput,
        conceptState: { ...baseInput.conceptState, state: 'fragile' },
        rating: 1 as FSRSRating,
        confidenceLevel: 'high',
      };

      const result = processReview(input);

      expect(result.updatedState.state).toBe('misconceived');
    });
  });
});
