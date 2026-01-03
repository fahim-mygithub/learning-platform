/**
 * Session Module
 *
 * Exports for Phase 4 intelligent learning session building.
 */

// Cognitive Load Service
export {
  calculateCapacity,
  getCircadianModifier,
  getFatigueModifier,
  getEffectiveCapacity,
  getWarningLevel,
} from './cognitive-load-service';

// Session Builder Service
export {
  applyInterleaving,
  buildInterleavedSession,
  estimateSessionDuration,
  getSessionPreview,
} from './session-builder-service';

// Sleep-Aware Scheduler
export {
  parseTimeString,
  isWithinSleepWindow,
  isPastBedtime,
  isWithinMorningWindow,
  getSessionRecommendation,
} from './sleep-aware-scheduler';

// Question Weighting Service
export {
  getPhaseWeights,
  normalizeWeights,
  applyAdaptiveAdjustments,
  selectQuestionType,
  getAdjustedWeights,
} from './question-weighting-service';

// Session Response Service
export {
  saveResponses,
  getSessionResponses,
  calculateSessionStats,
} from './session-response-service';
export type {
  ResponseData,
  SaveResponsesResult,
  MasteryUpdateResult,
} from './session-response-service';
