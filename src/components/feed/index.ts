/**
 * Feed Components
 *
 * TikTok-style learning feed UI components for Phase 5 of Engagement Engineering.
 *
 * @example
 * ```tsx
 * import {
 *   FeedCard,
 *   VideoChunkCard,
 *   QuizCard,
 *   FactCard,
 *   SynthesisCard,
 *   FeedProgressBar,
 *   SessionBreakModal,
 * } from '@/src/components/feed';
 * ```
 */

// Base Card Components
export {
  FeedCard,
  useFeedCardReset,
  type FeedCardProps,
  type SwipeDirection,
} from './FeedCard';

// Video Components
export {
  VideoChunkCard,
  createVideoChunkCardProps,
  type VideoChunkCardProps,
  type CaptionWord,
} from './VideoChunkCard';

// Caption Components
export {
  CaptionOverlay,
  AnimatedCaptionWord,
  useCaptionSync,
  getCurrentWordIndex,
  parseTimestampedTranscript,
  createUniformCaptionWords,
  type CaptionOverlayProps,
} from './CaptionOverlay';

// Quiz Components
export {
  QuizCard,
  createQuizCardProps,
  type QuizCardProps,
} from './QuizCard';

// Fact Components
export {
  FactCard,
  createFactCardProps,
  type FactCardProps,
} from './FactCard';

// Text Chunk Components
export {
  TextChunkCard,
  createTextChunkCardProps,
  type TextChunkCardProps,
} from './TextChunkCard';

// Synthesis Components
export {
  SynthesisCard,
  createSynthesisCardProps,
  type SynthesisCardProps,
} from './SynthesisCard';

// Progress Components
export {
  FeedProgressBar,
  SegmentedProgressBar,
  CircularProgress,
  type FeedProgressBarProps,
  type SegmentedProgressBarProps,
  type CircularProgressProps,
} from './FeedProgressBar';

// Session Components
export {
  SessionBreakModal,
  type SessionBreakModalProps,
  type SessionStats,
} from './SessionBreakModal';
