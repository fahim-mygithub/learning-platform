/**
 * Prerequisite Components Index
 *
 * Re-exports all prerequisite-related components from a single entry point.
 *
 * @example
 * ```tsx
 * import {
 *   PretestOfferModal,
 *   PrerequisitePretest,
 *   GapResultsScreen,
 *   MiniLesson,
 * } from '@/src/components/prerequisite';
 * ```
 */

// PretestOfferModal - Modal for offering pretest to user
export {
  PretestOfferModal,
  type PretestOfferModalProps,
} from './PretestOfferModal';

// PrerequisitePretest - Screen for taking the pretest
export {
  PrerequisitePretest,
  type PrerequisitePretestProps,
} from './PrerequisitePretest';

// GapResultsScreen - Screen showing pretest results and gaps
export {
  GapResultsScreen,
  type GapResultsScreenProps,
} from './GapResultsScreen';

// MiniLesson - Component for displaying mini-lesson content
export {
  MiniLesson,
  type MiniLessonProps,
} from './MiniLesson';
