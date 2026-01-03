/**
 * Session Timer Service
 *
 * Tracks user session duration and suggests breaks for healthy learning habits.
 * Implements the Pomodoro-inspired approach of recommending breaks after
 * extended learning sessions.
 *
 * Features:
 * - Session start/duration tracking
 * - Break suggestions after 30 minutes
 * - Timer reset functionality
 * - Elapsed time monitoring
 *
 * @example
 * ```ts
 * import { createSessionTimerService } from '@/src/lib/session-timer-service';
 *
 * const timer = createSessionTimerService();
 * timer.startSession();
 *
 * // Later...
 * if (timer.shouldSuggestBreak()) {
 *   showBreakSuggestion();
 *   timer.resetTimer();
 * }
 * ```
 */

/**
 * Session timer configuration
 */
export interface SessionTimerConfig {
  /** Minutes before suggesting a break (default: 30) */
  breakIntervalMinutes: number;
  /** Whether to auto-start the timer on creation (default: true) */
  autoStart: boolean;
}

/**
 * Session timer state
 */
export interface SessionTimerState {
  /** Session start timestamp (ms since epoch) */
  startTime: number | null;
  /** Whether a break has been suggested for current session */
  breakSuggested: boolean;
  /** Number of breaks taken this session */
  breaksTaken: number;
}

/**
 * Session timer service interface
 */
export interface SessionTimerService {
  /**
   * Start or restart the session timer
   */
  startSession(): void;

  /**
   * Get elapsed minutes since session start
   * Returns 0 if session hasn't started
   */
  getElapsedMinutes(): number;

  /**
   * Get elapsed seconds since session start
   * Returns 0 if session hasn't started
   */
  getElapsedSeconds(): number;

  /**
   * Check if a break should be suggested
   * Returns true after the configured break interval
   */
  shouldSuggestBreak(): boolean;

  /**
   * Mark that a break suggestion was shown
   * Prevents repeated suggestions until timer reset
   */
  markBreakSuggested(): void;

  /**
   * Reset the timer and start a new session
   * Call this after user takes a break
   */
  resetTimer(): void;

  /**
   * Get the current timer state
   */
  getState(): SessionTimerState;

  /**
   * Get minutes until next break suggestion
   * Returns 0 if break is already due
   */
  getMinutesUntilBreak(): number;

  /**
   * Pause the current session (for app backgrounding)
   */
  pause(): void;

  /**
   * Resume the session timer
   */
  resume(): void;

  /**
   * Check if the timer is currently running
   */
  isRunning(): boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SessionTimerConfig = {
  breakIntervalMinutes: 30,
  autoStart: true,
};

/**
 * Create a session timer service instance
 *
 * @param config - Optional configuration overrides
 * @returns SessionTimerService instance
 *
 * @example
 * ```ts
 * // Default 30-minute break interval
 * const timer = createSessionTimerService();
 *
 * // Custom 25-minute interval (Pomodoro style)
 * const pomodoroTimer = createSessionTimerService({
 *   breakIntervalMinutes: 25,
 *   autoStart: false,
 * });
 * pomodoroTimer.startSession();
 * ```
 */
export function createSessionTimerService(
  config?: Partial<SessionTimerConfig>
): SessionTimerService {
  const fullConfig: SessionTimerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Internal state
  let state: SessionTimerState = {
    startTime: null,
    breakSuggested: false,
    breaksTaken: 0,
  };

  // For pause/resume functionality
  let pausedAt: number | null = null;
  let accumulatedPauseTime: number = 0;

  /**
   * Get current time accounting for pauses
   */
  function getEffectiveElapsedMs(): number {
    if (state.startTime === null) {
      return 0;
    }

    const now = pausedAt ?? Date.now();
    return now - state.startTime - accumulatedPauseTime;
  }

  const service: SessionTimerService = {
    /**
     * Start or restart the session timer
     */
    startSession(): void {
      state = {
        startTime: Date.now(),
        breakSuggested: false,
        breaksTaken: state.breaksTaken, // Preserve break count
      };
      pausedAt = null;
      accumulatedPauseTime = 0;
    },

    /**
     * Get elapsed minutes since session start
     */
    getElapsedMinutes(): number {
      const elapsedMs = getEffectiveElapsedMs();
      return Math.floor(elapsedMs / (1000 * 60));
    },

    /**
     * Get elapsed seconds since session start
     */
    getElapsedSeconds(): number {
      const elapsedMs = getEffectiveElapsedMs();
      return Math.floor(elapsedMs / 1000);
    },

    /**
     * Check if a break should be suggested
     */
    shouldSuggestBreak(): boolean {
      // Don't suggest if already suggested this session
      if (state.breakSuggested) {
        return false;
      }

      // Check if we've passed the break interval
      const elapsedMinutes = this.getElapsedMinutes();
      return elapsedMinutes >= fullConfig.breakIntervalMinutes;
    },

    /**
     * Mark that a break suggestion was shown
     */
    markBreakSuggested(): void {
      state.breakSuggested = true;
    },

    /**
     * Reset the timer and start a new session
     */
    resetTimer(): void {
      state = {
        startTime: Date.now(),
        breakSuggested: false,
        breaksTaken: state.breaksTaken + 1,
      };
      pausedAt = null;
      accumulatedPauseTime = 0;
    },

    /**
     * Get the current timer state
     */
    getState(): SessionTimerState {
      return { ...state };
    },

    /**
     * Get minutes until next break suggestion
     */
    getMinutesUntilBreak(): number {
      const elapsedMinutes = this.getElapsedMinutes();
      const remaining = fullConfig.breakIntervalMinutes - elapsedMinutes;
      return Math.max(0, remaining);
    },

    /**
     * Pause the current session
     */
    pause(): void {
      if (pausedAt === null && state.startTime !== null) {
        pausedAt = Date.now();
      }
    },

    /**
     * Resume the session timer
     */
    resume(): void {
      if (pausedAt !== null) {
        accumulatedPauseTime += Date.now() - pausedAt;
        pausedAt = null;
      }
    },

    /**
     * Check if the timer is currently running
     */
    isRunning(): boolean {
      return state.startTime !== null && pausedAt === null;
    },
  };

  // Auto-start if configured
  if (fullConfig.autoStart) {
    service.startSession();
  }

  return service;
}

/**
 * Default session timer service instance (singleton)
 */
let defaultSessionTimerService: SessionTimerService | null = null;

/**
 * Get or create the default session timer service instance
 *
 * @returns Default SessionTimerService instance
 */
export function getDefaultSessionTimerService(): SessionTimerService {
  if (!defaultSessionTimerService) {
    defaultSessionTimerService = createSessionTimerService();
  }
  return defaultSessionTimerService;
}

/**
 * Reset the default service instance (primarily for testing)
 */
export function resetDefaultSessionTimerService(): void {
  defaultSessionTimerService = null;
}
