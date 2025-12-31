/**
 * Review Queue Service Tests
 *
 * Tests for review queue management and prioritization.
 */

import {
  ReviewQueueItem,
  ReviewQueueStats,
  sortByPriority,
  getReviewPriority,
  calculateQueueStats,
  filterDueReviews,
  filterOverdueReviews,
} from '../review-queue';
import { MasteryState } from '../state-types';

// Helper to create mock queue items
function createMockItem(
  overrides: Partial<ReviewQueueItem> = {}
): ReviewQueueItem {
  return {
    conceptStateId: 'cs-1',
    conceptId: 'c-1',
    conceptName: 'Test Concept',
    projectId: 'p-1',
    state: 'exposed',
    dueDate: new Date().toISOString(),
    stability: 1.0,
    difficulty: 0.3,
    cognitiveType: 'declarative',
    conceptDifficulty: 5,
    daysOverdue: 0,
    ...overrides,
  };
}

describe('ReviewQueue', () => {
  describe('getReviewPriority', () => {
    it('returns higher priority for more overdue items', () => {
      const item1 = createMockItem({ daysOverdue: 1 });
      const item2 = createMockItem({ daysOverdue: 5 });

      expect(getReviewPriority(item2)).toBeGreaterThan(getReviewPriority(item1));
    });

    it('returns higher priority for lower stability items', () => {
      const stable = createMockItem({ stability: 10, daysOverdue: 1 });
      const fragile = createMockItem({ stability: 1, daysOverdue: 1 });

      expect(getReviewPriority(fragile)).toBeGreaterThan(getReviewPriority(stable));
    });

    it('returns higher priority for fragile state over developing', () => {
      const fragile = createMockItem({ state: 'fragile', daysOverdue: 1 });
      const developing = createMockItem({ state: 'developing', daysOverdue: 1 });

      expect(getReviewPriority(fragile)).toBeGreaterThan(getReviewPriority(developing));
    });

    it('returns higher priority for misconceived state', () => {
      const misconceived = createMockItem({ state: 'misconceived', daysOverdue: 0 });
      const exposed = createMockItem({ state: 'exposed', daysOverdue: 1 });

      expect(getReviewPriority(misconceived)).toBeGreaterThan(getReviewPriority(exposed));
    });
  });

  describe('sortByPriority', () => {
    it('sorts items by priority descending', () => {
      const items = [
        createMockItem({ conceptId: 'c-1', daysOverdue: 1, stability: 5 }),
        createMockItem({ conceptId: 'c-2', daysOverdue: 5, stability: 1 }),
        createMockItem({ conceptId: 'c-3', daysOverdue: 0, stability: 10 }),
      ];

      const sorted = sortByPriority(items);

      // Most urgent should be first (high overdue + low stability)
      expect(sorted[0].conceptId).toBe('c-2');
      expect(sorted[2].conceptId).toBe('c-3');
    });

    it('handles empty array', () => {
      expect(sortByPriority([])).toEqual([]);
    });

    it('does not mutate original array', () => {
      const items = [
        createMockItem({ conceptId: 'c-1', daysOverdue: 1 }),
        createMockItem({ conceptId: 'c-2', daysOverdue: 5 }),
      ];
      const originalFirst = items[0].conceptId;

      sortByPriority(items);

      expect(items[0].conceptId).toBe(originalFirst);
    });
  });

  describe('filterDueReviews', () => {
    it('returns items due today or earlier', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      const items = [
        createMockItem({ conceptId: 'c-1', dueDate: yesterday.toISOString() }),
        createMockItem({ conceptId: 'c-2', dueDate: now.toISOString() }),
        createMockItem({ conceptId: 'c-3', dueDate: tomorrow.toISOString() }),
      ];

      const due = filterDueReviews(items);

      expect(due.length).toBe(2);
      expect(due.map((i) => i.conceptId)).toContain('c-1');
      expect(due.map((i) => i.conceptId)).toContain('c-2');
    });
  });

  describe('filterOverdueReviews', () => {
    it('returns items with daysOverdue > 0', () => {
      const items = [
        createMockItem({ conceptId: 'c-1', daysOverdue: 0 }),
        createMockItem({ conceptId: 'c-2', daysOverdue: 1 }),
        createMockItem({ conceptId: 'c-3', daysOverdue: 3 }),
      ];

      const overdue = filterOverdueReviews(items);

      expect(overdue.length).toBe(2);
      expect(overdue.map((i) => i.conceptId)).not.toContain('c-1');
    });
  });

  describe('calculateQueueStats', () => {
    it('calculates correct counts', () => {
      const items = [
        createMockItem({ daysOverdue: 0 }),
        createMockItem({ daysOverdue: 1 }),
        createMockItem({ daysOverdue: 5 }),
      ];

      const stats = calculateQueueStats(items);

      expect(stats.totalDue).toBe(3);
      expect(stats.overdueCount).toBe(2);
    });

    it('calculates state distribution', () => {
      const items = [
        createMockItem({ state: 'exposed' }),
        createMockItem({ state: 'exposed' }),
        createMockItem({ state: 'fragile' }),
        createMockItem({ state: 'developing' }),
      ];

      const stats = calculateQueueStats(items);

      expect(stats.byState.exposed).toBe(2);
      expect(stats.byState.fragile).toBe(1);
      expect(stats.byState.developing).toBe(1);
      expect(stats.byState.solid).toBe(0);
    });

    it('returns zero stats for empty queue', () => {
      const stats = calculateQueueStats([]);

      expect(stats.totalDue).toBe(0);
      expect(stats.overdueCount).toBe(0);
      expect(stats.avgOverdueDays).toBe(0);
    });

    it('calculates average overdue days', () => {
      const items = [
        createMockItem({ daysOverdue: 2 }),
        createMockItem({ daysOverdue: 4 }),
        createMockItem({ daysOverdue: 6 }),
      ];

      const stats = calculateQueueStats(items);

      expect(stats.avgOverdueDays).toBe(4);
    });

    it('groups by project', () => {
      const items = [
        createMockItem({ projectId: 'p-1' }),
        createMockItem({ projectId: 'p-1' }),
        createMockItem({ projectId: 'p-2' }),
      ];

      const stats = calculateQueueStats(items);

      expect(stats.byProject['p-1']).toBe(2);
      expect(stats.byProject['p-2']).toBe(1);
    });
  });
});
