/**
 * Engagement Engineering Types
 *
 * Types for gamification features including:
 * - TikTok-style learning feed with video chapters
 * - Streaks and XP/leveling system
 * - Typography preferences (Lexend font, Bionic Reading, dark mode)
 */

import type { SampleQuestion } from './three-pass';

// ============================================================================
// Feed Item Types
// ============================================================================

/**
 * Types of items that can appear in the learning feed
 */
export type FeedItemType = 'video_chunk' | 'quiz' | 'fact' | 'synthesis';

/**
 * Video chunk item - a segment of video content
 */
export interface VideoChunkItem {
  id: string;
  type: 'video_chunk';
  conceptId: string;
  startSec: number;
  endSec: number;
  title: string;
  openLoopTeaser?: string;
}

/**
 * Quiz item - an interactive question
 */
export interface QuizItem {
  id: string;
  type: 'quiz';
  conceptId: string;
  question: SampleQuestion;
}

/**
 * Fact item - a standalone interesting fact
 */
export interface FactItem {
  id: string;
  type: 'fact';
  conceptId: string;
  factText: string;
  whyItMatters: string;
}

/**
 * Synthesis item - connects multiple concepts
 */
export interface SynthesisItem {
  id: string;
  type: 'synthesis';
  conceptsToConnect: string[];
  synthesisPrompt: string;
  chaptersCompleted: number;
  totalChapters: number;
}

/**
 * Union type for all feed items
 */
export type FeedItem = VideoChunkItem | QuizItem | FactItem | SynthesisItem;

// ============================================================================
// Streak Types
// ============================================================================

/**
 * User streak data for habit tracking
 */
export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakFreezeAvailable: boolean;
}

// ============================================================================
// XP and Level Types
// ============================================================================

/**
 * User XP totals and level
 */
export interface UserXP {
  userId: string;
  totalXp: number;
  weeklyXp: number;
  level: number;
}

/**
 * Reasons for XP awards
 */
export type XPReason =
  | 'quiz_correct'
  | 'synthesis_complete'
  | 'chapter_complete'
  | 'streak_bonus'
  | 'perfect_score';

/**
 * XP reward configuration with weighted random amounts
 * Implements variable ratio reinforcement for engagement
 */
export const XP_REWARDS: Record<XPReason, { amounts: number[]; weights: number[] }> = {
  quiz_correct: { amounts: [10, 15, 25, 50], weights: [60, 25, 10, 5] },
  synthesis_complete: { amounts: [50, 75, 100], weights: [50, 35, 15] },
  chapter_complete: { amounts: [15, 20], weights: [70, 30] },
  streak_bonus: { amounts: [25, 50], weights: [70, 30] },
  perfect_score: { amounts: [100], weights: [100] },
};

/**
 * XP ledger entry for audit trail
 */
export interface XPLedgerEntry {
  id: string;
  userId: string;
  amount: number;
  reason: XPReason;
  conceptId: string | null;
  sourceId: string | null;
  createdAt: string;
}

// ============================================================================
// Typography Preferences Types
// ============================================================================

/**
 * Available font families
 */
export type FontFamily = 'system' | 'lexend';

/**
 * User typography and accessibility preferences
 */
export interface TypographyPreferences {
  fontFamily: FontFamily;
  bionicReadingEnabled: boolean;
  darkModeEnabled: boolean;
  fontScale: number;
}

/**
 * Default typography preferences
 */
export const DEFAULT_TYPOGRAPHY_PREFERENCES: TypographyPreferences = {
  fontFamily: 'system',
  bionicReadingEnabled: false,
  darkModeEnabled: true, // Dark mode enabled by default per spec
  fontScale: 1.0,
};

// ============================================================================
// Feed Progress Types
// ============================================================================

/**
 * User progress through a source's learning feed
 */
export interface FeedProgress {
  id: string;
  userId: string;
  sourceId: string;
  currentIndex: number;
  completedItems: string[];
  synthesisCount: number;
  lastSessionAt: string | null;
}

// ============================================================================
// Engagement Summary Types
// ============================================================================

/**
 * Combined engagement data for a user
 */
export interface UserEngagementSummary {
  userId: string;
  totalXp: number;
  weeklyXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakFreezeAvailable: boolean;
  typographyPreferences: TypographyPreferences;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  userId: string;
  totalXp: number;
  weeklyXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  allTimeRank: number;
  weeklyRank: number;
}

// ============================================================================
// XP Award Result Types
// ============================================================================

/**
 * Result from awarding XP
 */
export interface XPAwardResult {
  newTotalXp: number;
  newLevel: number;
  levelUp: boolean;
  amountAwarded: number;
}

/**
 * Result from updating streak
 */
export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Select a weighted random XP amount for a given reason
 */
export function selectXPAmount(reason: XPReason): number {
  const reward = XP_REWARDS[reason];
  const totalWeight = reward.weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < reward.amounts.length; i++) {
    random -= reward.weights[i];
    if (random <= 0) {
      return reward.amounts[i];
    }
  }

  // Fallback to first amount
  return reward.amounts[0];
}

/**
 * Calculate level from total XP
 * Uses logarithmic curve: level = floor(sqrt(xp / 100)) + 1
 */
export function calculateLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

/**
 * Calculate XP required for a given level
 */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calculate XP required for next level
 */
export function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
}

/**
 * Calculate progress percentage toward next level
 */
export function levelProgress(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const levelRange = nextLevelXp - currentLevelXp;

  if (levelRange === 0) return 100;

  return Math.min(100, ((totalXp - currentLevelXp) / levelRange) * 100);
}

/**
 * Type guard for VideoChunkItem
 */
export function isVideoChunkItem(item: FeedItem): item is VideoChunkItem {
  return item.type === 'video_chunk';
}

/**
 * Type guard for QuizItem
 */
export function isQuizItem(item: FeedItem): item is QuizItem {
  return item.type === 'quiz';
}

/**
 * Type guard for FactItem
 */
export function isFactItem(item: FeedItem): item is FactItem {
  return item.type === 'fact';
}

/**
 * Type guard for SynthesisItem
 */
export function isSynthesisItem(item: FeedItem): item is SynthesisItem {
  return item.type === 'synthesis';
}
