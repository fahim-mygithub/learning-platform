/**
 * FSRS Algorithm Tests
 *
 * TDD approach: These tests define the expected behavior of the FSRS-5 algorithm.
 */

import {
  FSRSCard,
  FSRSRating,
  DEFAULT_FSRS_PARAMETERS,
  createNewCard,
} from '../fsrs-types';
import {
  getInitialStability,
  getInitialDifficulty,
  scheduleReview,
  getRetrievability,
  previewIntervals,
  FSRSAlgorithm,
} from '../fsrs-algorithm';

describe('FSRSAlgorithm', () => {
  describe('getInitialStability', () => {
    it('returns increasing stability for higher ratings', () => {
      const stabilityAgain = getInitialStability(1);
      const stabilityHard = getInitialStability(2);
      const stabilityGood = getInitialStability(3);
      const stabilityEasy = getInitialStability(4);

      expect(stabilityAgain).toBeLessThan(stabilityHard);
      expect(stabilityHard).toBeLessThan(stabilityGood);
      expect(stabilityGood).toBeLessThan(stabilityEasy);
    });

    it('returns ~0.4 days for Again rating', () => {
      const stability = getInitialStability(1);
      expect(stability).toBeCloseTo(0.4, 1);
    });

    it('returns ~15.5 days for Easy rating', () => {
      const stability = getInitialStability(4);
      expect(stability).toBeCloseTo(15.5, 0);
    });

    it('returns positive values for all ratings', () => {
      for (let rating = 1; rating <= 4; rating++) {
        expect(getInitialStability(rating as FSRSRating)).toBeGreaterThan(0);
      }
    });
  });

  describe('getInitialDifficulty', () => {
    it('returns decreasing difficulty for higher ratings', () => {
      const diffAgain = getInitialDifficulty(1);
      const diffHard = getInitialDifficulty(2);
      const diffGood = getInitialDifficulty(3);
      const diffEasy = getInitialDifficulty(4);

      expect(diffAgain).toBeGreaterThan(diffHard);
      expect(diffHard).toBeGreaterThan(diffGood);
      expect(diffGood).toBeGreaterThan(diffEasy);
    });

    it('returns values between 0 and 1', () => {
      for (let rating = 1; rating <= 4; rating++) {
        const difficulty = getInitialDifficulty(rating as FSRSRating);
        expect(difficulty).toBeGreaterThanOrEqual(0);
        expect(difficulty).toBeLessThanOrEqual(1);
      }
    });

    it('returns ~0.3 for Good rating (default difficulty)', () => {
      const difficulty = getInitialDifficulty(3);
      expect(difficulty).toBeCloseTo(0.3, 1);
    });
  });

  describe('scheduleReview', () => {
    let newCard: FSRSCard;

    beforeEach(() => {
      newCard = createNewCard();
    });

    it('schedules first review for a new card', () => {
      const result = scheduleReview(newCard, 3);

      expect(result.card.state).toBe('learning');
      expect(result.card.reps).toBe(1);
      expect(result.scheduledDays).toBeGreaterThan(0);
      expect(result.card.stability).toBeGreaterThan(0);
    });

    it('increases stability after successful review (Good)', () => {
      // First review
      const afterFirst = scheduleReview(newCard, 3);
      const stabilityAfterFirst = afterFirst.card.stability;

      // Simulate time passing
      const cardAfterTime: FSRSCard = {
        ...afterFirst.card,
        elapsedDays: afterFirst.scheduledDays,
        state: 'review',
      };

      // Second review with Good
      const afterSecond = scheduleReview(cardAfterTime, 3);

      expect(afterSecond.card.stability).toBeGreaterThan(stabilityAfterFirst);
    });

    it('decreases stability after failed review (Again)', () => {
      // Set up a card in review state with established stability
      const reviewCard: FSRSCard = {
        stability: 10,
        difficulty: 0.3,
        elapsedDays: 10,
        scheduledDays: 10,
        reps: 5,
        lapses: 0,
        state: 'review',
      };

      const result = scheduleReview(reviewCard, 1); // Again

      expect(result.card.stability).toBeLessThan(reviewCard.stability);
      expect(result.card.lapses).toBe(1);
      expect(result.card.state).toBe('relearning');
    });

    it('respects maxInterval parameter', () => {
      const params = { ...DEFAULT_FSRS_PARAMETERS, maxInterval: 30 };

      // Card with very high stability
      const card: FSRSCard = {
        stability: 100,
        difficulty: 0.1,
        elapsedDays: 30,
        scheduledDays: 30,
        reps: 20,
        lapses: 0,
        state: 'review',
      };

      const result = scheduleReview(card, 4, params); // Easy

      expect(result.scheduledDays).toBeLessThanOrEqual(30);
    });

    it('respects desiredRetention parameter', () => {
      const highRetention = { ...DEFAULT_FSRS_PARAMETERS, desiredRetention: 0.95 };
      const lowRetention = { ...DEFAULT_FSRS_PARAMETERS, desiredRetention: 0.80 };

      const card: FSRSCard = {
        stability: 10,
        difficulty: 0.3,
        elapsedDays: 10,
        scheduledDays: 10,
        reps: 5,
        lapses: 0,
        state: 'review',
      };

      const resultHigh = scheduleReview(card, 3, highRetention);
      const resultLow = scheduleReview(card, 3, lowRetention);

      // Higher retention should give shorter intervals
      expect(resultHigh.scheduledDays).toBeLessThan(resultLow.scheduledDays);
    });

    it('increases difficulty after Again rating', () => {
      const card: FSRSCard = {
        stability: 5,
        difficulty: 0.3,
        elapsedDays: 5,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 'review',
      };

      const result = scheduleReview(card, 1); // Again

      expect(result.card.difficulty).toBeGreaterThan(card.difficulty);
    });

    it('decreases difficulty after Easy rating', () => {
      const card: FSRSCard = {
        stability: 5,
        difficulty: 0.5,
        elapsedDays: 5,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 'review',
      };

      const result = scheduleReview(card, 4); // Easy

      expect(result.card.difficulty).toBeLessThan(card.difficulty);
    });

    it('sets lastReview to current date', () => {
      const result = scheduleReview(newCard, 3);

      expect(result.card.lastReview).toBeDefined();
      const lastReviewDate = new Date(result.card.lastReview!);
      const now = new Date();

      // Should be within 1 second of now
      expect(Math.abs(lastReviewDate.getTime() - now.getTime())).toBeLessThan(1000);
    });
  });

  describe('getRetrievability', () => {
    it('returns 1.0 immediately after review (elapsedDays = 0)', () => {
      const card: FSRSCard = {
        stability: 10,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 10,
        reps: 5,
        lapses: 0,
        state: 'review',
      };

      const retrievability = getRetrievability(card, 0);

      expect(retrievability).toBeCloseTo(1.0, 1);
    });

    it('decays over time', () => {
      const card: FSRSCard = {
        stability: 10,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 10,
        reps: 5,
        lapses: 0,
        state: 'review',
      };

      const r0 = getRetrievability(card, 0);
      const r5 = getRetrievability(card, 5);
      const r10 = getRetrievability(card, 10);
      const r20 = getRetrievability(card, 20);

      expect(r5).toBeLessThan(r0);
      expect(r10).toBeLessThan(r5);
      expect(r20).toBeLessThan(r10);
    });

    it('returns ~0.9 at scheduled interval for 0.9 retention', () => {
      const card: FSRSCard = {
        stability: 10,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 10,
        reps: 5,
        lapses: 0,
        state: 'review',
      };

      // At the scheduled interval, retrievability should be close to desired retention
      const retrievability = getRetrievability(card, 10);

      // Should be around 0.9 (the default desired retention)
      expect(retrievability).toBeGreaterThan(0.85);
      expect(retrievability).toBeLessThan(0.95);
    });

    it('returns values between 0 and 1', () => {
      const card: FSRSCard = {
        stability: 5,
        difficulty: 0.3,
        elapsedDays: 0,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 'review',
      };

      for (let days = 0; days <= 100; days += 10) {
        const r = getRetrievability(card, days);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('previewIntervals', () => {
    it('returns intervals for all 4 ratings', () => {
      const card: FSRSCard = {
        stability: 5,
        difficulty: 0.3,
        elapsedDays: 5,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 'review',
      };

      const preview = previewIntervals(card);

      expect(preview).toHaveProperty('again');
      expect(preview).toHaveProperty('hard');
      expect(preview).toHaveProperty('good');
      expect(preview).toHaveProperty('easy');
    });

    it('returns increasing intervals for higher ratings', () => {
      const card: FSRSCard = {
        stability: 5,
        difficulty: 0.3,
        elapsedDays: 5,
        scheduledDays: 5,
        reps: 3,
        lapses: 0,
        state: 'review',
      };

      const preview = previewIntervals(card);

      expect(preview.again).toBeLessThan(preview.hard);
      expect(preview.hard).toBeLessThan(preview.good);
      expect(preview.good).toBeLessThan(preview.easy);
    });

    it('returns positive intervals for all ratings', () => {
      const card = createNewCard();

      const preview = previewIntervals(card);

      expect(preview.again).toBeGreaterThan(0);
      expect(preview.hard).toBeGreaterThan(0);
      expect(preview.good).toBeGreaterThan(0);
      expect(preview.easy).toBeGreaterThan(0);
    });
  });

  describe('FSRSAlgorithm class', () => {
    let fsrs: FSRSAlgorithm;

    beforeEach(() => {
      fsrs = new FSRSAlgorithm();
    });

    it('can be instantiated with default parameters', () => {
      expect(fsrs).toBeInstanceOf(FSRSAlgorithm);
    });

    it('can be instantiated with custom parameters', () => {
      const customFsrs = new FSRSAlgorithm({
        desiredRetention: 0.85,
        maxInterval: 180,
      });

      expect(customFsrs).toBeInstanceOf(FSRSAlgorithm);
    });

    it('schedules reviews correctly', () => {
      const card = createNewCard();
      const result = fsrs.scheduleReview(card, 3);

      expect(result.scheduledDays).toBeGreaterThan(0);
      expect(result.card.reps).toBe(1);
    });

    it('provides consistent results with static functions', () => {
      const card = createNewCard();

      const staticResult = scheduleReview(card, 3);
      const instanceResult = fsrs.scheduleReview(card, 3);

      expect(staticResult.scheduledDays).toBe(instanceResult.scheduledDays);
    });
  });
});
