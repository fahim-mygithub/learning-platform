/**
 * Session Builder Service
 *
 * Pure algorithmic service for building interleaved learning sessions.
 * Implements interleaving (d=0.67 effect size) - mixing review with new material.
 *
 * Interleaving Pattern: R -> R -> P -> N -> R -> R -> P -> N -> ...
 * - Reviews before new concepts to activate prior knowledge
 * - 2 reviews per new concept when possible
 * - Pretests before new concepts for adaptive learning
 *
 * This service has no database dependencies - it's purely computational.
 */

import type { SessionItem, LearningSessionType } from '@/types/session';

/**
 * Duration estimates in minutes for each session item type
 */
const DURATION_MINUTES = {
  review: 2,
  new: 7,
  pretest: 1,
} as const;

/**
 * Number of reviews to place before each new concept when available
 */
const REVIEWS_PER_NEW_CONCEPT = 2;

/**
 * Apply interleaving pattern to reviews and new concepts.
 *
 * Pattern: R → R → P → N → R → R → P → N → ...
 * - Reviews come before new concepts to activate prior knowledge
 * - 2 reviews per new concept when possible
 * - Pretest precedes each new concept
 * - Remaining reviews are added at the end
 *
 * @param reviews - Array of review concept IDs
 * @param newConcepts - Array of new concept IDs
 * @param maxNewConcepts - Maximum number of new concepts allowed (capacity limit)
 * @returns Array of SessionItem in interleaved order
 */
export function applyInterleaving(
  reviews: string[],
  newConcepts: string[],
  maxNewConcepts: number
): SessionItem[] {
  const session: SessionItem[] = [];
  let reviewIndex = 0;
  let newIndex = 0;
  let position = 0;

  // Process new concepts up to capacity limit
  while (newIndex < maxNewConcepts && newIndex < newConcepts.length) {
    // Add 1-2 reviews before each new concept (if available)
    for (let i = 0; i < REVIEWS_PER_NEW_CONCEPT && reviewIndex < reviews.length; i++) {
      session.push({
        type: 'review',
        concept_id: reviews[reviewIndex++],
        position: position++,
      });
    }

    // Add pretest for new concept
    session.push({
      type: 'pretest',
      concept_id: newConcepts[newIndex],
      position: position++,
    });

    // Add new concept
    session.push({
      type: 'new',
      concept_id: newConcepts[newIndex++],
      position: position++,
    });
  }

  // Add remaining reviews at the end
  while (reviewIndex < reviews.length) {
    session.push({
      type: 'review',
      concept_id: reviews[reviewIndex++],
      position: position++,
    });
  }

  return session;
}

/**
 * Build an interleaved session from review and new concept arrays.
 *
 * This is the main entry point for building a session. It takes structured
 * input with conceptId and converts to the interleaved SessionItem format.
 *
 * @param options - Session building options
 * @param options.reviews - Array of review items with conceptId
 * @param options.newConcepts - Array of new concept items with conceptId
 * @param options.capacity - Maximum new concepts allowed based on cognitive capacity
 * @returns Array of SessionItem in interleaved order
 */
export function buildInterleavedSession(options: {
  reviews: Array<{ conceptId: string }>;
  newConcepts: Array<{ conceptId: string }>;
  capacity: number;
}): SessionItem[] {
  const { reviews, newConcepts, capacity } = options;

  // Extract concept IDs from structured input
  const reviewIds = reviews.map((r) => r.conceptId);
  const newConceptIds = newConcepts.map((n) => n.conceptId);

  return applyInterleaving(reviewIds, newConceptIds, capacity);
}

/**
 * Estimate session duration in minutes based on session items.
 *
 * Duration estimates:
 * - Reviews: 2 minutes each (familiar content)
 * - New concepts: 7 minutes each (learning new material)
 * - Pretests: 1 minute each (quick knowledge check)
 *
 * @param items - Array of SessionItem
 * @returns Estimated duration in minutes
 */
export function estimateSessionDuration(items: SessionItem[]): number {
  return items.reduce((total, item) => {
    return total + DURATION_MINUTES[item.type];
  }, 0);
}

/**
 * Create a session preview summary.
 *
 * Provides an overview of what the session will contain without
 * building the full interleaved structure. Useful for UI previews.
 *
 * @param options - Session preview options
 * @param options.reviews - Array of review items with conceptId
 * @param options.newConcepts - Array of new concept items with conceptId
 * @param options.capacity - Maximum new concepts allowed
 * @returns Preview summary with counts, duration, and session type
 */
export function getSessionPreview(options: {
  reviews: Array<{ conceptId: string }>;
  newConcepts: Array<{ conceptId: string }>;
  capacity: number;
}): {
  reviewCount: number;
  newConceptCount: number;
  estimatedMinutes: number;
  sessionType: LearningSessionType;
} {
  const { reviews, newConcepts, capacity } = options;

  // Calculate actual new concept count respecting capacity
  const newConceptCount = Math.min(newConcepts.length, capacity);
  const reviewCount = reviews.length;

  // Build the session to get accurate duration (includes pretests)
  const session = buildInterleavedSession(options);
  const estimatedMinutes = estimateSessionDuration(session);

  // Determine session type
  const sessionType: LearningSessionType = newConceptCount > 0 ? 'standard' : 'review_only';

  return {
    reviewCount,
    newConceptCount,
    estimatedMinutes,
    sessionType,
  };
}
