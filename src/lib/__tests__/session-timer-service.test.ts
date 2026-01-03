/**
 * Session Timer Service Tests
 *
 * Tests for session timing and break suggestion functionality.
 */

import {
  createSessionTimerService,
  getDefaultSessionTimerService,
  resetDefaultSessionTimerService,
  type SessionTimerService,
  type SessionTimerConfig,
} from '../session-timer-service';

describe('session-timer-service', () => {
  let service: SessionTimerService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultSessionTimerService();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSessionTimerService', () => {
    it('creates a service instance with required methods', () => {
      service = createSessionTimerService();

      expect(service).toBeDefined();
      expect(typeof service.startSession).toBe('function');
      expect(typeof service.getElapsedMinutes).toBe('function');
      expect(typeof service.getElapsedSeconds).toBe('function');
      expect(typeof service.shouldSuggestBreak).toBe('function');
      expect(typeof service.markBreakSuggested).toBe('function');
      expect(typeof service.resetTimer).toBe('function');
      expect(typeof service.getState).toBe('function');
      expect(typeof service.getMinutesUntilBreak).toBe('function');
      expect(typeof service.pause).toBe('function');
      expect(typeof service.resume).toBe('function');
      expect(typeof service.isRunning).toBe('function');
    });

    it('auto-starts by default', () => {
      service = createSessionTimerService();

      expect(service.isRunning()).toBe(true);
      expect(service.getState().startTime).not.toBeNull();
    });

    it('does not auto-start when configured', () => {
      service = createSessionTimerService({ autoStart: false });

      expect(service.isRunning()).toBe(false);
      expect(service.getState().startTime).toBeNull();
    });

    it('uses custom break interval when configured', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 25 });

      expect(service.getMinutesUntilBreak()).toBe(25);
    });
  });

  describe('startSession', () => {
    it('starts the timer with current timestamp', () => {
      service = createSessionTimerService({ autoStart: false });

      service.startSession();

      expect(service.isRunning()).toBe(true);
      expect(service.getState().startTime).toBe(Date.now());
    });

    it('resets breakSuggested flag', () => {
      service = createSessionTimerService();
      service.markBreakSuggested();

      service.startSession();

      expect(service.getState().breakSuggested).toBe(false);
    });

    it('preserves break count', () => {
      service = createSessionTimerService();
      service.resetTimer(); // Increments break count

      service.startSession();

      expect(service.getState().breaksTaken).toBe(1);
    });
  });

  describe('getElapsedMinutes', () => {
    it('returns 0 for session not started', () => {
      service = createSessionTimerService({ autoStart: false });

      expect(service.getElapsedMinutes()).toBe(0);
    });

    it('returns correct elapsed minutes', () => {
      service = createSessionTimerService();

      // Advance 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(service.getElapsedMinutes()).toBe(5);
    });

    it('floors the minutes value', () => {
      service = createSessionTimerService();

      // Advance 5.9 minutes
      jest.advanceTimersByTime(5 * 60 * 1000 + 54 * 1000);

      expect(service.getElapsedMinutes()).toBe(5);
    });

    it('handles large time values', () => {
      service = createSessionTimerService();

      // Advance 2 hours
      jest.advanceTimersByTime(2 * 60 * 60 * 1000);

      expect(service.getElapsedMinutes()).toBe(120);
    });
  });

  describe('getElapsedSeconds', () => {
    it('returns 0 for session not started', () => {
      service = createSessionTimerService({ autoStart: false });

      expect(service.getElapsedSeconds()).toBe(0);
    });

    it('returns correct elapsed seconds', () => {
      service = createSessionTimerService();

      // Advance 45 seconds
      jest.advanceTimersByTime(45 * 1000);

      expect(service.getElapsedSeconds()).toBe(45);
    });

    it('floors the seconds value', () => {
      service = createSessionTimerService();

      // Advance 10.5 seconds
      jest.advanceTimersByTime(10500);

      expect(service.getElapsedSeconds()).toBe(10);
    });
  });

  describe('shouldSuggestBreak', () => {
    it('returns false before break interval', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 29 minutes
      jest.advanceTimersByTime(29 * 60 * 1000);

      expect(service.shouldSuggestBreak()).toBe(false);
    });

    it('returns true at break interval', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      expect(service.shouldSuggestBreak()).toBe(true);
    });

    it('returns true after break interval', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 35 minutes
      jest.advanceTimersByTime(35 * 60 * 1000);

      expect(service.shouldSuggestBreak()).toBe(true);
    });

    it('returns false after break was suggested', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);

      service.markBreakSuggested();

      expect(service.shouldSuggestBreak()).toBe(false);
    });

    it('returns false for session not started', () => {
      service = createSessionTimerService({ autoStart: false, breakIntervalMinutes: 1 });

      expect(service.shouldSuggestBreak()).toBe(false);
    });
  });

  describe('markBreakSuggested', () => {
    it('sets breakSuggested flag to true', () => {
      service = createSessionTimerService();

      service.markBreakSuggested();

      expect(service.getState().breakSuggested).toBe(true);
    });

    it('prevents further break suggestions', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);
      expect(service.shouldSuggestBreak()).toBe(true);

      service.markBreakSuggested();

      // Advance another 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);
      expect(service.shouldSuggestBreak()).toBe(false);
    });
  });

  describe('resetTimer', () => {
    it('resets the start time', () => {
      service = createSessionTimerService();

      // Advance 10 minutes
      jest.advanceTimersByTime(10 * 60 * 1000);

      service.resetTimer();

      expect(service.getElapsedMinutes()).toBe(0);
    });

    it('resets breakSuggested flag', () => {
      service = createSessionTimerService();
      service.markBreakSuggested();

      service.resetTimer();

      expect(service.getState().breakSuggested).toBe(false);
    });

    it('increments breaks taken count', () => {
      service = createSessionTimerService();

      expect(service.getState().breaksTaken).toBe(0);

      service.resetTimer();
      expect(service.getState().breaksTaken).toBe(1);

      service.resetTimer();
      expect(service.getState().breaksTaken).toBe(2);
    });

    it('clears pause state', () => {
      service = createSessionTimerService();
      service.pause();

      service.resetTimer();

      expect(service.isRunning()).toBe(true);
    });
  });

  describe('getState', () => {
    it('returns current timer state', () => {
      service = createSessionTimerService();

      const state = service.getState();

      expect(state).toHaveProperty('startTime');
      expect(state).toHaveProperty('breakSuggested');
      expect(state).toHaveProperty('breaksTaken');
    });

    it('returns a copy of the state', () => {
      service = createSessionTimerService();

      const state1 = service.getState();
      const state2 = service.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getMinutesUntilBreak', () => {
    it('returns full interval at start', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      expect(service.getMinutesUntilBreak()).toBe(30);
    });

    it('returns remaining minutes', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 10 minutes
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(service.getMinutesUntilBreak()).toBe(20);
    });

    it('returns 0 when break is due', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 35 minutes
      jest.advanceTimersByTime(35 * 60 * 1000);

      expect(service.getMinutesUntilBreak()).toBe(0);
    });

    it('never returns negative values', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 30 });

      // Advance 60 minutes
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(service.getMinutesUntilBreak()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pause', () => {
    it('stops the timer', () => {
      service = createSessionTimerService();

      service.pause();

      expect(service.isRunning()).toBe(false);
    });

    it('preserves elapsed time when paused', () => {
      service = createSessionTimerService();

      // Advance 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      service.pause();

      // Advance another 5 minutes while paused
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(service.getElapsedMinutes()).toBe(5);
    });

    it('does nothing if already paused', () => {
      service = createSessionTimerService();

      // Advance 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      service.pause();

      // Advance 2 minutes while paused
      jest.advanceTimersByTime(2 * 60 * 1000);

      service.pause(); // Should not change anything

      // Advance another 2 minutes while paused
      jest.advanceTimersByTime(2 * 60 * 1000);

      expect(service.getElapsedMinutes()).toBe(5);
    });

    it('does nothing if session not started', () => {
      service = createSessionTimerService({ autoStart: false });

      service.pause();

      expect(service.isRunning()).toBe(false);
    });
  });

  describe('resume', () => {
    it('restarts the timer after pause', () => {
      service = createSessionTimerService();

      service.pause();
      service.resume();

      expect(service.isRunning()).toBe(true);
    });

    it('continues tracking time from pause point', () => {
      service = createSessionTimerService();

      // Advance 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      service.pause();

      // Advance 10 minutes while paused
      jest.advanceTimersByTime(10 * 60 * 1000);

      service.resume();

      // Advance another 3 minutes after resume
      jest.advanceTimersByTime(3 * 60 * 1000);

      expect(service.getElapsedMinutes()).toBe(8); // 5 + 3, not 5 + 10 + 3
    });

    it('does nothing if not paused', () => {
      service = createSessionTimerService();

      // Advance 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      service.resume(); // Should not change anything

      expect(service.getElapsedMinutes()).toBe(5);
    });

    it('handles multiple pause/resume cycles', () => {
      service = createSessionTimerService();

      // First cycle: 2 minutes active, 5 minutes paused
      jest.advanceTimersByTime(2 * 60 * 1000);
      service.pause();
      jest.advanceTimersByTime(5 * 60 * 1000);
      service.resume();

      // Second cycle: 3 minutes active, 10 minutes paused
      jest.advanceTimersByTime(3 * 60 * 1000);
      service.pause();
      jest.advanceTimersByTime(10 * 60 * 1000);
      service.resume();

      // Third cycle: 1 minute active
      jest.advanceTimersByTime(1 * 60 * 1000);

      // Total active time: 2 + 3 + 1 = 6 minutes
      expect(service.getElapsedMinutes()).toBe(6);
    });
  });

  describe('isRunning', () => {
    it('returns false for session not started', () => {
      service = createSessionTimerService({ autoStart: false });

      expect(service.isRunning()).toBe(false);
    });

    it('returns true after startSession', () => {
      service = createSessionTimerService({ autoStart: false });

      service.startSession();

      expect(service.isRunning()).toBe(true);
    });

    it('returns false after pause', () => {
      service = createSessionTimerService();

      service.pause();

      expect(service.isRunning()).toBe(false);
    });

    it('returns true after resume', () => {
      service = createSessionTimerService();

      service.pause();
      service.resume();

      expect(service.isRunning()).toBe(true);
    });
  });

  describe('getDefaultSessionTimerService', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = getDefaultSessionTimerService();
      const instance2 = getDefaultSessionTimerService();

      expect(instance1).toBe(instance2);
    });

    it('returns new instance after reset', () => {
      const instance1 = getDefaultSessionTimerService();
      resetDefaultSessionTimerService();
      const instance2 = getDefaultSessionTimerService();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('configuration defaults', () => {
    it('uses 30 minute break interval by default', () => {
      service = createSessionTimerService();

      expect(service.getMinutesUntilBreak()).toBe(30);
    });

    it('merges partial config with defaults', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 25 });

      // Should use custom break interval
      expect(service.getMinutesUntilBreak()).toBe(25);
      // Should use default autoStart (true)
      expect(service.isRunning()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles very short break intervals', () => {
      service = createSessionTimerService({ breakIntervalMinutes: 1 });

      jest.advanceTimersByTime(60 * 1000);

      expect(service.shouldSuggestBreak()).toBe(true);
    });

    it('handles zero elapsed time', () => {
      service = createSessionTimerService();

      expect(service.getElapsedMinutes()).toBe(0);
      expect(service.getElapsedSeconds()).toBe(0);
    });

    it('handles rapid pause/resume', () => {
      service = createSessionTimerService();

      for (let i = 0; i < 100; i++) {
        service.pause();
        service.resume();
      }

      // Advance 1 minute
      jest.advanceTimersByTime(60 * 1000);

      expect(service.getElapsedMinutes()).toBe(1);
    });
  });
});
