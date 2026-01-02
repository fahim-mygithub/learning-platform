/**
 * Review Queue Service
 *
 * Manages review queue prioritization and statistics.
 */

import { MasteryState } from './state-types';
import { CognitiveType } from '../../types/database';

/**
 * Review queue item (from due_reviews view)
 */
export interface ReviewQueueItem {
  conceptStateId: string;
  conceptId: string;
  conceptName: string;
  conceptDefinition: string | null;
  projectId: string;
  state: MasteryState;
  dueDate: string;
  stability: number;
  difficulty: number;
  cognitiveType: CognitiveType;
  conceptDifficulty: number | null;
  daysOverdue: number;
}

/**
 * Review queue statistics
 */
export interface ReviewQueueStats {
  totalDue: number;
  overdueCount: number;
  avgOverdueDays: number;
  byState: Record<MasteryState, number>;
  byProject: Record<string, number>;
}

/**
 * State priority weights (higher = more urgent)
 */
const STATE_PRIORITY: Record<MasteryState, number> = {
  misconceived: 100, // Highest priority - needs correction
  fragile: 80, // High priority - at risk of forgetting
  exposed: 60, // Medium-high - new learning
  developing: 40, // Medium - building retention
  solid: 20, // Low - well established
  mastered: 10, // Very low - maintenance only
  unseen: 0, // Not in queue
};

/**
 * Calculate priority score for a review item
 *
 * Priority factors:
 * 1. Days overdue (most important)
 * 2. State priority (misconceived > fragile > etc.)
 * 3. Low stability (more likely to forget)
 */
export function getReviewPriority(item: ReviewQueueItem): number {
  // Base: days overdue (capped at 30 for sanity)
  const overdueFactor = Math.min(item.daysOverdue, 30) * 10;

  // State priority
  const stateFactor = STATE_PRIORITY[item.state] || 0;

  // Stability factor (inverse - lower stability = higher priority)
  // Stability typically ranges from 0.5 to 100+ days
  const stabilityFactor = Math.max(0, 20 - Math.log2(item.stability + 1) * 5);

  return overdueFactor + stateFactor + stabilityFactor;
}

/**
 * Sort review items by priority (highest first)
 */
export function sortByPriority(items: ReviewQueueItem[]): ReviewQueueItem[] {
  return [...items].sort((a, b) => getReviewPriority(b) - getReviewPriority(a));
}

/**
 * Filter items that are due (due date <= now)
 */
export function filterDueReviews(items: ReviewQueueItem[]): ReviewQueueItem[] {
  const now = new Date();
  return items.filter((item) => new Date(item.dueDate) <= now);
}

/**
 * Filter items that are overdue (daysOverdue > 0)
 */
export function filterOverdueReviews(items: ReviewQueueItem[]): ReviewQueueItem[] {
  return items.filter((item) => item.daysOverdue > 0);
}

/**
 * Calculate queue statistics
 */
export function calculateQueueStats(items: ReviewQueueItem[]): ReviewQueueStats {
  const stats: ReviewQueueStats = {
    totalDue: items.length,
    overdueCount: 0,
    avgOverdueDays: 0,
    byState: {
      unseen: 0,
      exposed: 0,
      fragile: 0,
      developing: 0,
      solid: 0,
      mastered: 0,
      misconceived: 0,
    },
    byProject: {},
  };

  if (items.length === 0) {
    return stats;
  }

  let totalOverdueDays = 0;

  for (const item of items) {
    // Count overdue
    if (item.daysOverdue > 0) {
      stats.overdueCount++;
      totalOverdueDays += item.daysOverdue;
    }

    // Count by state
    stats.byState[item.state] = (stats.byState[item.state] || 0) + 1;

    // Count by project
    stats.byProject[item.projectId] = (stats.byProject[item.projectId] || 0) + 1;
  }

  // Calculate average overdue days
  stats.avgOverdueDays = items.length > 0 ? totalOverdueDays / items.length : 0;

  return stats;
}

/**
 * Get top N highest priority items
 */
export function getTopPriorityItems(
  items: ReviewQueueItem[],
  limit: number
): ReviewQueueItem[] {
  return sortByPriority(items).slice(0, limit);
}

/**
 * Filter queue items by project
 */
export function filterByProject(
  items: ReviewQueueItem[],
  projectId: string
): ReviewQueueItem[] {
  return items.filter((item) => item.projectId === projectId);
}

/**
 * Filter queue items by state
 */
export function filterByState(
  items: ReviewQueueItem[],
  states: MasteryState[]
): ReviewQueueItem[] {
  return items.filter((item) => states.includes(item.state));
}

/**
 * Map database DueReview to ReviewQueueItem
 */
export function mapDueReviewToQueueItem(row: {
  concept_state_id: string;
  concept_id: string;
  concept_name: string;
  concept_definition?: string | null;
  project_id: string;
  state: string;
  due_date: string;
  stability: number;
  difficulty: number;
  cognitive_type: string;
  concept_difficulty: number | null;
  days_overdue: number;
}): ReviewQueueItem {
  return {
    conceptStateId: row.concept_state_id,
    conceptId: row.concept_id,
    conceptName: row.concept_name,
    conceptDefinition: row.concept_definition ?? null,
    projectId: row.project_id,
    state: row.state as MasteryState,
    dueDate: row.due_date,
    stability: row.stability,
    difficulty: row.difficulty,
    cognitiveType: row.cognitive_type as CognitiveType,
    conceptDifficulty: row.concept_difficulty,
    daysOverdue: row.days_overdue,
  };
}
