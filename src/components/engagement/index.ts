/**
 * Engagement Components
 *
 * Gamification UI components for Phase 5 of Engagement Engineering.
 * Includes streaks, XP displays, levels, mastery indicators, and celebrations.
 *
 * @example
 * ```tsx
 * import {
 *   StreakDisplay,
 *   XPPopup,
 *   LevelBadge,
 *   MasteryRing,
 *   ConfettiAnimation,
 * } from '@/src/components/engagement';
 * ```
 */

// Streak Components
export {
  StreakDisplay,
  CompactStreak,
  StreakMilestone,
  type StreakDisplayProps,
  type CompactStreakProps,
  type StreakMilestoneProps,
} from './StreakDisplay';

// XP Components
export {
  XPPopup,
  XPToast,
  XPCounter,
  type XPPopupProps,
  type XPToastProps,
  type XPCounterProps,
} from './XPPopup';

// Level Components
export {
  LevelBadge,
  LevelProgressBar,
  LevelUpCelebration,
  CompactLevel,
  type LevelBadgeProps,
  type LevelProgressBarProps,
  type LevelUpCelebrationProps,
  type CompactLevelProps,
} from './LevelBadge';

// Mastery Components
export {
  MasteryRing,
  MultiRing,
  MasteryArc,
  type MasteryRingProps,
  type MultiRingProps,
  type MasteryArcProps,
} from './MasteryRing';

// Celebration Components
export {
  ConfettiAnimation,
  ConfettiBurst,
  ConfettiRain,
  type ConfettiAnimationProps,
  type ConfettiBurstProps,
  type ConfettiRainProps,
} from './ConfettiAnimation';
