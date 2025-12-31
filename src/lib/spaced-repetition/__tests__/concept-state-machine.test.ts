/**
 * Concept State Machine Tests
 *
 * TDD approach: Define expected state transitions before implementation.
 */

import {
  MasteryState,
  ConceptStateData,
  createDefaultConceptState,
  STATE_METADATA,
  FAST_RESPONSE_THRESHOLD_MS,
} from '../state-types';
import {
  evaluateTransition,
  getTransitionCriteria,
  getStateColor,
  getStateLabel,
  isSuccessfulRating,
  shouldRegress,
  ConceptStateMachine,
} from '../concept-state-machine';
import { colors } from '../../../theme/colors';

describe('ConceptStateMachine', () => {
  describe('evaluateTransition', () => {
    describe('UNSEEN -> EXPOSED', () => {
      it('transitions from UNSEEN to EXPOSED on first exposure', () => {
        const state = createDefaultConceptState();
        expect(state.state).toBe('unseen');

        const newState = evaluateTransition(state, { rating: 3 });
        expect(newState).toBe('exposed');
      });

      it('transitions to EXPOSED for any rating on first exposure', () => {
        for (let rating = 1; rating <= 4; rating++) {
          const state = createDefaultConceptState();
          const newState = evaluateTransition(state, { rating: rating as 1 | 2 | 3 | 4 });
          expect(newState).toBe('exposed');
        }
      });
    });

    describe('EXPOSED -> FRAGILE', () => {
      it('transitions from EXPOSED to FRAGILE after successful review', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'exposed',
          successfulSessions: 0,
        };

        const newState = evaluateTransition(state, { rating: 3 }); // Good
        expect(newState).toBe('fragile');
      });

      it('stays in EXPOSED after failed review', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'exposed',
        };

        const newState = evaluateTransition(state, { rating: 1 }); // Again
        expect(newState).toBe('exposed');
      });
    });

    describe('FRAGILE -> DEVELOPING', () => {
      it('transitions from FRAGILE to DEVELOPING with 2+ successful sessions on different days', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'fragile',
          successfulSessions: 1,
          sessionDates: ['2024-01-01'],
        };

        // Simulate review on a different day
        const newState = evaluateTransition(state, { rating: 3 });
        expect(newState).toBe('developing');
      });

      it('stays in FRAGILE if sessions are not on different days', () => {
        const today = new Date().toISOString().split('T')[0];
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'fragile',
          successfulSessions: 1,
          sessionDates: [today], // Same day as "now"
        };

        const newState = evaluateTransition(state, { rating: 3 });
        // Should stay FRAGILE because same day
        expect(newState).toBe('fragile');
      });

      it('stays in FRAGILE with only 1 successful session', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'fragile',
          successfulSessions: 0,
          sessionDates: [],
        };

        const newState = evaluateTransition(state, { rating: 3 });
        // Advances to 1 session, but needs 2+ on different days
        expect(newState).toBe('fragile');
      });
    });

    describe('DEVELOPING -> SOLID', () => {
      it('transitions from DEVELOPING to SOLID with 3+ successful sessions on different days', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'developing',
          successfulSessions: 2,
          sessionDates: ['2024-01-01', '2024-01-02'],
        };

        const newState = evaluateTransition(state, { rating: 3 });
        expect(newState).toBe('solid');
      });

      it('stays in DEVELOPING with fewer than 3 sessions', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'developing',
          successfulSessions: 1,
          sessionDates: ['2024-01-01'],
        };

        const newState = evaluateTransition(state, { rating: 3 });
        expect(newState).toBe('developing');
      });
    });

    describe('SOLID -> MASTERED', () => {
      it('transitions from SOLID to MASTERED with fast + correct + transfer', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'solid',
          successfulSessions: 5,
          sessionDates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        };

        const newState = evaluateTransition(state, {
          rating: 4, // Easy
          isTransferQuestion: true,
          responseTimeMs: 3000, // Under 5s threshold
        });
        expect(newState).toBe('mastered');
      });

      it('stays in SOLID without transfer question', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'solid',
          successfulSessions: 5,
        };

        const newState = evaluateTransition(state, {
          rating: 4,
          isTransferQuestion: false,
          responseTimeMs: 3000,
        });
        expect(newState).toBe('solid');
      });

      it('stays in SOLID with slow response', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'solid',
          successfulSessions: 5,
        };

        const newState = evaluateTransition(state, {
          rating: 3,
          isTransferQuestion: true,
          responseTimeMs: 10000, // Over 5s threshold
        });
        expect(newState).toBe('solid');
      });
    });

    describe('Regression on failure', () => {
      it('regresses from DEVELOPING to FRAGILE on Again rating', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'developing',
          successfulSessions: 3,
        };

        const newState = evaluateTransition(state, { rating: 1 });
        expect(newState).toBe('fragile');
      });

      it('regresses from SOLID to FRAGILE on Again rating', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'solid',
          successfulSessions: 5,
        };

        const newState = evaluateTransition(state, { rating: 1 });
        expect(newState).toBe('fragile');
      });

      it('stays in MASTERED on Hard rating (not full failure)', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'mastered',
          successfulSessions: 10,
        };

        const newState = evaluateTransition(state, { rating: 2 }); // Hard
        expect(newState).toBe('mastered');
      });

      it('regresses from MASTERED to SOLID on Again rating', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'mastered',
          successfulSessions: 10,
        };

        const newState = evaluateTransition(state, { rating: 1 }); // Again
        expect(newState).toBe('solid');
      });
    });

    describe('MISCONCEIVED state', () => {
      it('transitions to MISCONCEIVED on confident wrong answer', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'fragile',
        };

        const newState = evaluateTransition(state, {
          rating: 1,
          confidenceLevel: 'high',
        });
        expect(newState).toBe('misconceived');
      });

      it('does not transition to MISCONCEIVED without high confidence', () => {
        const state: ConceptStateData = {
          ...createDefaultConceptState(),
          state: 'fragile',
        };

        const newState = evaluateTransition(state, {
          rating: 1,
          confidenceLevel: 'low',
        });
        expect(newState).not.toBe('misconceived');
      });
    });
  });

  describe('getTransitionCriteria', () => {
    it('returns criteria for UNSEEN state', () => {
      const criteria = getTransitionCriteria('unseen');
      expect(criteria.length).toBeGreaterThan(0);
      expect(criteria[0].toState).toBe('exposed');
    });

    it('returns criteria for all states', () => {
      const states: MasteryState[] = [
        'unseen',
        'exposed',
        'fragile',
        'developing',
        'solid',
        'mastered',
      ];

      for (const state of states) {
        const criteria = getTransitionCriteria(state);
        expect(Array.isArray(criteria)).toBe(true);
      }
    });
  });

  describe('getStateColor', () => {
    it('returns correct color for each state', () => {
      expect(getStateColor('unseen')).toBe(colors.mastery.unseen);
      expect(getStateColor('exposed')).toBe(colors.mastery.exposed);
      expect(getStateColor('fragile')).toBe(colors.mastery.fragile);
      expect(getStateColor('developing')).toBe(colors.mastery.developing);
      expect(getStateColor('solid')).toBe(colors.mastery.solid);
      expect(getStateColor('mastered')).toBe(colors.mastery.mastered);
    });

    it('returns error color for MISCONCEIVED', () => {
      expect(getStateColor('misconceived')).toBe(colors.error);
    });
  });

  describe('getStateLabel', () => {
    it('returns human-readable labels', () => {
      expect(getStateLabel('unseen')).toBe('Unseen');
      expect(getStateLabel('exposed')).toBe('Exposed');
      expect(getStateLabel('fragile')).toBe('Fragile');
      expect(getStateLabel('developing')).toBe('Developing');
      expect(getStateLabel('solid')).toBe('Solid');
      expect(getStateLabel('mastered')).toBe('Mastered');
      expect(getStateLabel('misconceived')).toBe('Misconceived');
    });
  });

  describe('isSuccessfulRating', () => {
    it('returns true for Good and Easy ratings', () => {
      expect(isSuccessfulRating(3)).toBe(true);
      expect(isSuccessfulRating(4)).toBe(true);
    });

    it('returns false for Again and Hard ratings', () => {
      expect(isSuccessfulRating(1)).toBe(false);
      expect(isSuccessfulRating(2)).toBe(false);
    });
  });

  describe('shouldRegress', () => {
    it('returns true for Again rating', () => {
      expect(shouldRegress(1)).toBe(true);
    });

    it('returns false for other ratings', () => {
      expect(shouldRegress(2)).toBe(false);
      expect(shouldRegress(3)).toBe(false);
      expect(shouldRegress(4)).toBe(false);
    });
  });

  describe('ConceptStateMachine class', () => {
    let machine: ConceptStateMachine;

    beforeEach(() => {
      machine = new ConceptStateMachine();
    });

    it('can be instantiated', () => {
      expect(machine).toBeInstanceOf(ConceptStateMachine);
    });

    it('evaluates transitions correctly', () => {
      const state = createDefaultConceptState();
      const newState = machine.evaluateTransition(state, { rating: 3 });
      expect(newState).toBe('exposed');
    });

    it('provides state metadata', () => {
      const metadata = machine.getStateMetadata('fragile');
      expect(metadata.label).toBe('Fragile');
      expect(metadata.color).toBe(colors.mastery.fragile);
    });
  });
});
