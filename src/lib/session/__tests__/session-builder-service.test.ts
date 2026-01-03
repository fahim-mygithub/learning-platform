/**
 * Tests for Session Builder Service
 *
 * Tests the pure algorithmic service for building interleaved learning sessions.
 * Interleaving has d=0.67 effect size - mixing review with new material improves learning.
 */

import {
  applyInterleaving,
  buildInterleavedSession,
  estimateSessionDuration,
  getSessionPreview,
} from '../session-builder-service';
import type { SessionItem, LearningSessionType } from '@/types/session';

describe('session-builder-service', () => {
  // ============================================================================
  // applyInterleaving tests
  // ============================================================================
  describe('applyInterleaving', () => {
    it('returns empty array for empty inputs', () => {
      const result = applyInterleaving([], [], 5);
      expect(result).toEqual([]);
    });

    it('returns reviews only when no new concepts', () => {
      const reviews = ['review-1', 'review-2', 'review-3'];
      const result = applyInterleaving(reviews, [], 5);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'review', concept_id: 'review-1', position: 0 });
      expect(result[1]).toEqual({ type: 'review', concept_id: 'review-2', position: 1 });
      expect(result[2]).toEqual({ type: 'review', concept_id: 'review-3', position: 2 });
    });

    it('returns new concepts with pretests when no reviews', () => {
      const newConcepts = ['new-1', 'new-2'];
      const result = applyInterleaving([], newConcepts, 5);

      expect(result).toHaveLength(4); // 2 pretests + 2 new
      expect(result[0]).toEqual({ type: 'pretest', concept_id: 'new-1', position: 0 });
      expect(result[1]).toEqual({ type: 'new', concept_id: 'new-1', position: 1 });
      expect(result[2]).toEqual({ type: 'pretest', concept_id: 'new-2', position: 2 });
      expect(result[3]).toEqual({ type: 'new', concept_id: 'new-2', position: 3 });
    });

    it('applies interleaving pattern R->R->P->N for first new concept', () => {
      const reviews = ['review-1', 'review-2', 'review-3', 'review-4'];
      const newConcepts = ['new-1'];
      const result = applyInterleaving(reviews, newConcepts, 5);

      // Pattern: R -> R -> P -> N, then remaining reviews
      expect(result[0]).toEqual({ type: 'review', concept_id: 'review-1', position: 0 });
      expect(result[1]).toEqual({ type: 'review', concept_id: 'review-2', position: 1 });
      expect(result[2]).toEqual({ type: 'pretest', concept_id: 'new-1', position: 2 });
      expect(result[3]).toEqual({ type: 'new', concept_id: 'new-1', position: 3 });
      // Remaining reviews
      expect(result[4]).toEqual({ type: 'review', concept_id: 'review-3', position: 4 });
      expect(result[5]).toEqual({ type: 'review', concept_id: 'review-4', position: 5 });
    });

    it('respects capacity limit', () => {
      const reviews = ['review-1', 'review-2'];
      const newConcepts = ['new-1', 'new-2', 'new-3', 'new-4', 'new-5'];
      const result = applyInterleaving(reviews, newConcepts, 2);

      // Should only include 2 new concepts (capacity limit)
      const newItems = result.filter((item) => item.type === 'new');
      expect(newItems).toHaveLength(2);
      expect(newItems[0].concept_id).toBe('new-1');
      expect(newItems[1].concept_id).toBe('new-2');
    });

    it('adds remaining reviews at end', () => {
      const reviews = ['review-1', 'review-2', 'review-3', 'review-4', 'review-5'];
      const newConcepts = ['new-1'];
      const result = applyInterleaving(reviews, newConcepts, 5);

      // Pattern: R1 -> R2 -> P -> N -> R3 -> R4 -> R5
      const lastThree = result.slice(-3);
      expect(lastThree[0]).toEqual({ type: 'review', concept_id: 'review-3', position: 4 });
      expect(lastThree[1]).toEqual({ type: 'review', concept_id: 'review-4', position: 5 });
      expect(lastThree[2]).toEqual({ type: 'review', concept_id: 'review-5', position: 6 });
    });

    it('handles multiple new concepts with interleaving', () => {
      const reviews = ['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6'];
      const newConcepts = ['n-1', 'n-2', 'n-3'];
      const result = applyInterleaving(reviews, newConcepts, 5);

      // Expected pattern:
      // R1 -> R2 -> P1 -> N1 -> R3 -> R4 -> P2 -> N2 -> R5 -> R6 -> P3 -> N3
      expect(result).toHaveLength(12);

      // First block: R1, R2, P1, N1
      expect(result[0].type).toBe('review');
      expect(result[0].concept_id).toBe('r-1');
      expect(result[1].type).toBe('review');
      expect(result[1].concept_id).toBe('r-2');
      expect(result[2].type).toBe('pretest');
      expect(result[2].concept_id).toBe('n-1');
      expect(result[3].type).toBe('new');
      expect(result[3].concept_id).toBe('n-1');

      // Second block: R3, R4, P2, N2
      expect(result[4].type).toBe('review');
      expect(result[4].concept_id).toBe('r-3');
      expect(result[5].type).toBe('review');
      expect(result[5].concept_id).toBe('r-4');
      expect(result[6].type).toBe('pretest');
      expect(result[6].concept_id).toBe('n-2');
      expect(result[7].type).toBe('new');
      expect(result[7].concept_id).toBe('n-2');

      // Third block: R5, R6, P3, N3
      expect(result[8].type).toBe('review');
      expect(result[8].concept_id).toBe('r-5');
      expect(result[9].type).toBe('review');
      expect(result[9].concept_id).toBe('r-6');
      expect(result[10].type).toBe('pretest');
      expect(result[10].concept_id).toBe('n-3');
      expect(result[11].type).toBe('new');
      expect(result[11].concept_id).toBe('n-3');
    });

    it('handles fewer reviews than new concepts', () => {
      const reviews = ['r-1'];
      const newConcepts = ['n-1', 'n-2', 'n-3'];
      const result = applyInterleaving(reviews, newConcepts, 3);

      // Pattern: R1 -> P1 -> N1 -> P2 -> N2 -> P3 -> N3
      expect(result).toHaveLength(7);
      expect(result[0]).toEqual({ type: 'review', concept_id: 'r-1', position: 0 });
      expect(result[1]).toEqual({ type: 'pretest', concept_id: 'n-1', position: 1 });
      expect(result[2]).toEqual({ type: 'new', concept_id: 'n-1', position: 2 });
      expect(result[3]).toEqual({ type: 'pretest', concept_id: 'n-2', position: 3 });
      expect(result[4]).toEqual({ type: 'new', concept_id: 'n-2', position: 4 });
      expect(result[5]).toEqual({ type: 'pretest', concept_id: 'n-3', position: 5 });
      expect(result[6]).toEqual({ type: 'new', concept_id: 'n-3', position: 6 });
    });

    it('handles capacity of 0', () => {
      const reviews = ['r-1', 'r-2'];
      const newConcepts = ['n-1', 'n-2'];
      const result = applyInterleaving(reviews, newConcepts, 0);

      // Should only have reviews
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'review')).toBe(true);
    });

    it('maintains correct position numbering', () => {
      const reviews = ['r-1', 'r-2'];
      const newConcepts = ['n-1'];
      const result = applyInterleaving(reviews, newConcepts, 5);

      // Check positions are sequential
      result.forEach((item, index) => {
        expect(item.position).toBe(index);
      });
    });
  });

  // ============================================================================
  // buildInterleavedSession tests
  // ============================================================================
  describe('buildInterleavedSession', () => {
    it('builds session from review and new concept arrays', () => {
      const result = buildInterleavedSession({
        reviews: [{ conceptId: 'review-1' }, { conceptId: 'review-2' }],
        newConcepts: [{ conceptId: 'new-1' }],
        capacity: 5,
      });

      expect(result).toHaveLength(4); // 2 reviews + 1 pretest + 1 new
    });

    it('correctly maps conceptId to concept_id', () => {
      const result = buildInterleavedSession({
        reviews: [{ conceptId: 'review-1' }],
        newConcepts: [{ conceptId: 'new-1' }],
        capacity: 5,
      });

      expect(result[0].concept_id).toBe('review-1');
      expect(result[1].concept_id).toBe('new-1');
      expect(result[2].concept_id).toBe('new-1');
    });

    it('handles empty arrays', () => {
      const result = buildInterleavedSession({
        reviews: [],
        newConcepts: [],
        capacity: 5,
      });

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // estimateSessionDuration tests
  // ============================================================================
  describe('estimateSessionDuration', () => {
    it('returns 0 for empty session', () => {
      const result = estimateSessionDuration([]);
      expect(result).toBe(0);
    });

    it('returns 2 minutes per review', () => {
      const items: SessionItem[] = [
        { type: 'review', concept_id: 'r-1', position: 0 },
        { type: 'review', concept_id: 'r-2', position: 1 },
        { type: 'review', concept_id: 'r-3', position: 2 },
      ];
      const result = estimateSessionDuration(items);
      expect(result).toBe(6); // 3 reviews * 2 minutes
    });

    it('returns 7 minutes per new concept', () => {
      const items: SessionItem[] = [
        { type: 'new', concept_id: 'n-1', position: 0 },
        { type: 'new', concept_id: 'n-2', position: 1 },
      ];
      const result = estimateSessionDuration(items);
      expect(result).toBe(14); // 2 new concepts * 7 minutes
    });

    it('returns 1 minute per pretest', () => {
      const items: SessionItem[] = [
        { type: 'pretest', concept_id: 'n-1', position: 0 },
        { type: 'pretest', concept_id: 'n-2', position: 1 },
        { type: 'pretest', concept_id: 'n-3', position: 2 },
      ];
      const result = estimateSessionDuration(items);
      expect(result).toBe(3); // 3 pretests * 1 minute
    });

    it('calculates correct total for mixed session', () => {
      const items: SessionItem[] = [
        { type: 'review', concept_id: 'r-1', position: 0 },
        { type: 'review', concept_id: 'r-2', position: 1 },
        { type: 'pretest', concept_id: 'n-1', position: 2 },
        { type: 'new', concept_id: 'n-1', position: 3 },
      ];
      const result = estimateSessionDuration(items);
      // 2 reviews * 2 min + 1 pretest * 1 min + 1 new * 7 min = 4 + 1 + 7 = 12
      expect(result).toBe(12);
    });

    it('calculates correct total for typical interleaved session', () => {
      const items: SessionItem[] = [
        { type: 'review', concept_id: 'r-1', position: 0 },
        { type: 'review', concept_id: 'r-2', position: 1 },
        { type: 'pretest', concept_id: 'n-1', position: 2 },
        { type: 'new', concept_id: 'n-1', position: 3 },
        { type: 'review', concept_id: 'r-3', position: 4 },
        { type: 'review', concept_id: 'r-4', position: 5 },
        { type: 'pretest', concept_id: 'n-2', position: 6 },
        { type: 'new', concept_id: 'n-2', position: 7 },
      ];
      const result = estimateSessionDuration(items);
      // 4 reviews * 2 min + 2 pretests * 1 min + 2 new * 7 min = 8 + 2 + 14 = 24
      expect(result).toBe(24);
    });
  });

  // ============================================================================
  // getSessionPreview tests
  // ============================================================================
  describe('getSessionPreview', () => {
    it('returns correct counts', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }, { conceptId: 'r-2' }, { conceptId: 'r-3' }],
        newConcepts: [{ conceptId: 'n-1' }, { conceptId: 'n-2' }],
        capacity: 5,
      });

      expect(result.reviewCount).toBe(3);
      expect(result.newConceptCount).toBe(2);
    });

    it('respects capacity in new concept count', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }],
        newConcepts: [
          { conceptId: 'n-1' },
          { conceptId: 'n-2' },
          { conceptId: 'n-3' },
          { conceptId: 'n-4' },
          { conceptId: 'n-5' },
        ],
        capacity: 2,
      });

      expect(result.newConceptCount).toBe(2); // Limited by capacity
    });

    it('calculates duration correctly', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }, { conceptId: 'r-2' }],
        newConcepts: [{ conceptId: 'n-1' }],
        capacity: 5,
      });

      // 2 reviews * 2 min + 1 pretest * 1 min + 1 new * 7 min = 12
      expect(result.estimatedMinutes).toBe(12);
    });

    it('returns review_only when no new concepts', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }, { conceptId: 'r-2' }],
        newConcepts: [],
        capacity: 5,
      });

      expect(result.sessionType).toBe('review_only');
    });

    it('returns review_only when capacity is 0', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }],
        newConcepts: [{ conceptId: 'n-1' }],
        capacity: 0,
      });

      expect(result.sessionType).toBe('review_only');
    });

    it('returns standard when has new concepts within capacity', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }],
        newConcepts: [{ conceptId: 'n-1' }],
        capacity: 5,
      });

      expect(result.sessionType).toBe('standard');
    });

    it('returns standard for mixed session with new concepts', () => {
      const result = getSessionPreview({
        reviews: [{ conceptId: 'r-1' }, { conceptId: 'r-2' }, { conceptId: 'r-3' }],
        newConcepts: [{ conceptId: 'n-1' }, { conceptId: 'n-2' }],
        capacity: 3,
      });

      expect(result.sessionType).toBe('standard');
      expect(result.reviewCount).toBe(3);
      expect(result.newConceptCount).toBe(2);
    });

    it('handles empty session', () => {
      const result = getSessionPreview({
        reviews: [],
        newConcepts: [],
        capacity: 5,
      });

      expect(result.reviewCount).toBe(0);
      expect(result.newConceptCount).toBe(0);
      expect(result.estimatedMinutes).toBe(0);
      expect(result.sessionType).toBe('review_only');
    });
  });
});
