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
