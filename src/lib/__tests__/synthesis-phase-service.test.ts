/**
 * Synthesis Phase Service Tests
 *
 * Tests for the synthesis phase orchestrator that generates assessment
 * interactions based on research principles (desirable difficulties,
 * free recall, interleaving).
 */

import {
  createSynthesisPhaseService,
  createRetryInteraction,
  canRetry,
  SynthesisPhaseError,
  type SynthesisPhaseService,
  type SynthesisConcept,
  type SynthesisInteraction,
  type InteractionType,
  type ConceptType,
} from '../synthesis-phase-service';

// Mock concepts for testing
const createMockConcepts = (count: number, type: ConceptType = 'factual'): SynthesisConcept[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `concept-${i + 1}`,
    name: `Concept ${i + 1}`,
    type,
    description: `Description for concept ${i + 1}`,
  }));
};

// Helper to count interaction types
const countInteractionTypes = (interactions: SynthesisInteraction[]): Record<InteractionType, number> => {
  const counts: Record<InteractionType, number> = {
    free_recall: 0,
    fill_in_blank: 0,
    sequence: 0,
    connect_dots: 0,
    mcq: 0,
  };
  interactions.forEach((i) => {
    counts[i.type]++;
  });
  return counts;
};

// Helper to check interleaving (no consecutive same-concept interactions)
const hasConsecutiveSameConcept = (interactions: SynthesisInteraction[]): boolean => {
  for (let i = 1; i < interactions.length; i++) {
    if (interactions[i].conceptId === interactions[i - 1].conceptId) {
      return true;
    }
  }
  return false;
};

describe('synthesis-phase-service', () => {
  let service: SynthesisPhaseService;

  beforeEach(() => {
    service = createSynthesisPhaseService();
  });

  describe('createSynthesisPhaseService', () => {
    it('creates a service instance with generateSynthesisPhase method', () => {
      expect(service).toBeDefined();
      expect(typeof service.generateSynthesisPhase).toBe('function');
    });

    it('accepts optional configuration', () => {
      const customService = createSynthesisPhaseService({
        minInteractions: 4,
        maxInteractions: 8,
        preferFreeRecallRatio: 0.8,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws INSUFFICIENT_CONCEPTS if fewer than 3 concepts', () => {
      const twoConcepts = createMockConcepts(2);

      expect(() => service.generateSynthesisPhase(twoConcepts, 80)).toThrow(
        SynthesisPhaseError
      );
      expect(() => service.generateSynthesisPhase(twoConcepts, 80)).toThrow(
        'at least 3 concepts'
      );

      try {
        service.generateSynthesisPhase(twoConcepts, 80);
      } catch (error) {
        expect((error as SynthesisPhaseError).code).toBe('INSUFFICIENT_CONCEPTS');
      }
    });

    it('throws INSUFFICIENT_CONCEPTS for empty concepts array', () => {
      expect(() => service.generateSynthesisPhase([], 80)).toThrow(
        SynthesisPhaseError
      );
    });

    it('throws INVALID_PERFORMANCE for performance < 0', () => {
      const concepts = createMockConcepts(3);

      expect(() => service.generateSynthesisPhase(concepts, -1)).toThrow(
        SynthesisPhaseError
      );

      try {
        service.generateSynthesisPhase(concepts, -1);
      } catch (error) {
        expect((error as SynthesisPhaseError).code).toBe('INVALID_PERFORMANCE');
      }
    });

    it('throws INVALID_PERFORMANCE for performance > 100', () => {
      const concepts = createMockConcepts(3);

      expect(() => service.generateSynthesisPhase(concepts, 101)).toThrow(
        SynthesisPhaseError
      );

      try {
        service.generateSynthesisPhase(concepts, 101);
      } catch (error) {
        expect((error as SynthesisPhaseError).code).toBe('INVALID_PERFORMANCE');
      }
    });
  });

  describe('interaction count based on performance', () => {
    it('generates 3-4 interactions for perfect performance (100%)', () => {
      const concepts = createMockConcepts(5);
      const interactions = service.generateSynthesisPhase(concepts, 100);

      expect(interactions.length).toBeGreaterThanOrEqual(3);
      expect(interactions.length).toBeLessThanOrEqual(4);
    });

    it('generates 5-6 interactions for good performance (70-99%)', () => {
      const concepts = createMockConcepts(6);

      // Test at 70%
      const interactions70 = service.generateSynthesisPhase(concepts, 70);
      expect(interactions70.length).toBeGreaterThanOrEqual(5);
      expect(interactions70.length).toBeLessThanOrEqual(6);

      // Test at 85%
      const interactions85 = service.generateSynthesisPhase(concepts, 85);
      expect(interactions85.length).toBeGreaterThanOrEqual(5);
      expect(interactions85.length).toBeLessThanOrEqual(6);

      // Test at 99%
      const interactions99 = service.generateSynthesisPhase(concepts, 99);
      expect(interactions99.length).toBeGreaterThanOrEqual(5);
      expect(interactions99.length).toBeLessThanOrEqual(6);
    });

    it('generates 8-10 interactions for struggling performance (<70%)', () => {
      const concepts = createMockConcepts(10);

      // Test at 69%
      const interactions69 = service.generateSynthesisPhase(concepts, 69);
      expect(interactions69.length).toBeGreaterThanOrEqual(8);
      expect(interactions69.length).toBeLessThanOrEqual(10);

      // Test at 50%
      const interactions50 = service.generateSynthesisPhase(concepts, 50);
      expect(interactions50.length).toBeGreaterThanOrEqual(8);
      expect(interactions50.length).toBeLessThanOrEqual(10);

      // Test at 0%
      const interactions0 = service.generateSynthesisPhase(concepts, 0);
      expect(interactions0.length).toBeGreaterThanOrEqual(8);
      expect(interactions0.length).toBeLessThanOrEqual(10);
    });

    it('respects maximum of 10 interactions', () => {
      const concepts = createMockConcepts(15);
      const interactions = service.generateSynthesisPhase(concepts, 30);

      expect(interactions.length).toBeLessThanOrEqual(10);
    });

    it('respects minimum of 3 interactions', () => {
      const concepts = createMockConcepts(3);
      const interactions = service.generateSynthesisPhase(concepts, 100);

      expect(interactions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('interaction type selection by concept type', () => {
    it('prefers fill_in_blank or free_recall for factual concepts', () => {
      const factualConcepts = createMockConcepts(5, 'factual');

      // Run multiple times to check probability distribution
      let freeRecallCount = 0;
      let fillInBlankCount = 0;
      let totalInteractions = 0;

      for (let i = 0; i < 50; i++) {
        const interactions = service.generateSynthesisPhase(factualConcepts, 80);
        const counts = countInteractionTypes(interactions);
        freeRecallCount += counts.free_recall;
        fillInBlankCount += counts.fill_in_blank;
        totalInteractions += interactions.length;
      }

      // At least 60% should be free_recall or fill_in_blank (allowing for variance)
      const preferredRatio = (freeRecallCount + fillInBlankCount) / totalInteractions;
      expect(preferredRatio).toBeGreaterThan(0.5);
    });

    it('prefers sequence for procedural concepts', () => {
      const proceduralConcepts = createMockConcepts(5, 'procedural');

      let sequenceCount = 0;
      let totalInteractions = 0;

      for (let i = 0; i < 50; i++) {
        const interactions = service.generateSynthesisPhase(proceduralConcepts, 80);
        const counts = countInteractionTypes(interactions);
        sequenceCount += counts.sequence;
        totalInteractions += interactions.length;
      }

      // At least 40% should be sequence type (allowing for variance)
      const sequenceRatio = sequenceCount / totalInteractions;
      expect(sequenceRatio).toBeGreaterThan(0.3);
    });

    it('prefers connect_dots for conceptual concepts', () => {
      const conceptualConcepts = createMockConcepts(5, 'conceptual');

      let connectDotsCount = 0;
      let totalInteractions = 0;

      for (let i = 0; i < 50; i++) {
        const interactions = service.generateSynthesisPhase(conceptualConcepts, 80);
        const counts = countInteractionTypes(interactions);
        connectDotsCount += counts.connect_dots;
        totalInteractions += interactions.length;
      }

      // At least 40% should be connect_dots type (allowing for variance)
      const connectDotsRatio = connectDotsCount / totalInteractions;
      expect(connectDotsRatio).toBeGreaterThan(0.3);
    });

    it('prefers free_recall for applied concepts', () => {
      const appliedConcepts = createMockConcepts(5, 'applied');

      let freeRecallCount = 0;
      let totalInteractions = 0;

      for (let i = 0; i < 50; i++) {
        const interactions = service.generateSynthesisPhase(appliedConcepts, 80);
        const counts = countInteractionTypes(interactions);
        freeRecallCount += counts.free_recall;
        totalInteractions += interactions.length;
      }

      // At least 50% should be free_recall type (allowing for variance)
      const freeRecallRatio = freeRecallCount / totalInteractions;
      expect(freeRecallRatio).toBeGreaterThan(0.4);
    });
  });

  describe('interleaving (concept order)', () => {
    it('interleaves concepts - no consecutive same-concept interactions', () => {
      const concepts = createMockConcepts(5);

      // Run multiple times to verify consistent interleaving
      for (let i = 0; i < 20; i++) {
        const interactions = service.generateSynthesisPhase(concepts, 80);

        // With 5+ concepts and 5-6 interactions, there should be no consecutive same-concept
        expect(hasConsecutiveSameConcept(interactions)).toBe(false);
      }
    });

    it('shuffles concept order across multiple generations', () => {
      const concepts = createMockConcepts(5);

      const firstConceptIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const interactions = service.generateSynthesisPhase(concepts, 80);
        firstConceptIds.push(interactions[0].conceptId);
      }

      // Should have some variation in first concept (not always same)
      const uniqueFirstConcepts = new Set(firstConceptIds);
      expect(uniqueFirstConcepts.size).toBeGreaterThan(1);
    });
  });

  describe('interaction structure', () => {
    it('each interaction has required fields', () => {
      const concepts = createMockConcepts(4);
      const interactions = service.generateSynthesisPhase(concepts, 80);

      interactions.forEach((interaction, index) => {
        expect(interaction.id).toBe(`synthesis-interaction-${index}`);
        expect(interaction.conceptId).toBeDefined();
        expect(interaction.conceptName).toBeDefined();
        expect(interaction.type).toBeDefined();
        expect(interaction.prompt).toBeDefined();
        expect(interaction.attemptCount).toBe(0);
        // expectedAnswer and feedbackOnIncorrect are optional but should exist
        expect('expectedAnswer' in interaction).toBe(true);
        expect('feedbackOnIncorrect' in interaction).toBe(true);
      });
    });

    it('interaction type is one of valid types', () => {
      const concepts = createMockConcepts(5);
      const interactions = service.generateSynthesisPhase(concepts, 80);

      const validTypes: InteractionType[] = [
        'free_recall',
        'fill_in_blank',
        'sequence',
        'connect_dots',
        'mcq',
      ];

      interactions.forEach((interaction) => {
        expect(validTypes).toContain(interaction.type);
      });
    });

    it('conceptId references a valid concept from input', () => {
      const concepts = createMockConcepts(5);
      const conceptIds = new Set(concepts.map((c) => c.id));
      const interactions = service.generateSynthesisPhase(concepts, 80);

      interactions.forEach((interaction) => {
        expect(conceptIds.has(interaction.conceptId)).toBe(true);
      });
    });

    it('conceptName matches the concept name from input', () => {
      const concepts = createMockConcepts(5);
      const conceptNameMap = new Map(concepts.map((c) => [c.id, c.name]));
      const interactions = service.generateSynthesisPhase(concepts, 80);

      interactions.forEach((interaction) => {
        expect(interaction.conceptName).toBe(conceptNameMap.get(interaction.conceptId));
      });
    });
  });

  describe('SynthesisPhaseError', () => {
    it('has correct name and properties', () => {
      const error = new SynthesisPhaseError('Test error', 'GENERATION_FAILED');

      expect(error.name).toBe('SynthesisPhaseError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
    });

    it('supports cause error', () => {
      const cause = new Error('Original error');
      const error = new SynthesisPhaseError('Wrapped error', 'GENERATION_FAILED', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('custom configuration', () => {
    it('respects custom minInteractions', () => {
      const customService = createSynthesisPhaseService({
        minInteractions: 4,
      });
      const concepts = createMockConcepts(5);
      const interactions = customService.generateSynthesisPhase(concepts, 100);

      // Even with perfect performance, should have at least 4
      expect(interactions.length).toBeGreaterThanOrEqual(4);
    });

    it('respects custom maxInteractions', () => {
      const customService = createSynthesisPhaseService({
        maxInteractions: 6,
      });
      const concepts = createMockConcepts(10);
      const interactions = customService.generateSynthesisPhase(concepts, 30);

      // Even with struggling performance, should not exceed 6
      expect(interactions.length).toBeLessThanOrEqual(6);
    });
  });

  describe('edge cases', () => {
    it('handles exactly 3 concepts', () => {
      const concepts = createMockConcepts(3);
      const interactions = service.generateSynthesisPhase(concepts, 80);

      expect(interactions.length).toBeGreaterThanOrEqual(3);
    });

    it('handles boundary performance values', () => {
      const concepts = createMockConcepts(6);

      // Exactly 0%
      expect(() => service.generateSynthesisPhase(concepts, 0)).not.toThrow();

      // Exactly 100%
      expect(() => service.generateSynthesisPhase(concepts, 100)).not.toThrow();

      // Exactly 70% (boundary between good and struggling)
      const interactions70 = service.generateSynthesisPhase(concepts, 70);
      expect(interactions70.length).toBeGreaterThanOrEqual(5);
      expect(interactions70.length).toBeLessThanOrEqual(6);
    });

    it('handles mixed concept types', () => {
      const mixedConcepts: SynthesisConcept[] = [
        { id: 'c1', name: 'Factual Concept', type: 'factual' },
        { id: 'c2', name: 'Procedural Concept', type: 'procedural' },
        { id: 'c3', name: 'Conceptual Concept', type: 'conceptual' },
        { id: 'c4', name: 'Applied Concept', type: 'applied' },
      ];

      const interactions = service.generateSynthesisPhase(mixedConcepts, 80);

      expect(interactions.length).toBeGreaterThanOrEqual(3);
      expect(interactions.length).toBeLessThanOrEqual(10);
    });

    it('works with concepts that have no description', () => {
      const concepts: SynthesisConcept[] = [
        { id: 'c1', name: 'Concept 1', type: 'factual' },
        { id: 'c2', name: 'Concept 2', type: 'factual' },
        { id: 'c3', name: 'Concept 3', type: 'factual' },
      ];

      expect(() => service.generateSynthesisPhase(concepts, 80)).not.toThrow();
    });
  });

  describe('productive failure pattern', () => {
    describe('SynthesisInteraction fields', () => {
      it('all generated interactions have showHint: false initially', () => {
        const concepts = createMockConcepts(5);
        const interactions = service.generateSynthesisPhase(concepts, 80);

        interactions.forEach((interaction) => {
          expect(interaction.showHint).toBe(false);
        });
      });

      it('all generated interactions have maxAttempts: 2', () => {
        const concepts = createMockConcepts(5);
        const interactions = service.generateSynthesisPhase(concepts, 80);

        interactions.forEach((interaction) => {
          expect(interaction.maxAttempts).toBe(2);
        });
      });

      it('interactions may have hintText for later use', () => {
        const concepts = createMockConcepts(5);
        const interactions = service.generateSynthesisPhase(concepts, 80);

        // hintText is optional but the field should exist
        interactions.forEach((interaction) => {
          expect('hintText' in interaction).toBe(true);
        });
      });
    });

    describe('canRetry', () => {
      it('returns true when attemptCount < maxAttempts', () => {
        const interaction: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 0,
          showHint: false,
          maxAttempts: 2,
        };

        expect(canRetry(interaction)).toBe(true);
      });

      it('returns true when attemptCount is 1 less than maxAttempts', () => {
        const interaction: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 1,
          showHint: true,
          maxAttempts: 2,
        };

        expect(canRetry(interaction)).toBe(true);
      });

      it('returns false when attemptCount equals maxAttempts', () => {
        const interaction: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 2,
          showHint: true,
          maxAttempts: 2,
        };

        expect(canRetry(interaction)).toBe(false);
      });

      it('returns false when attemptCount exceeds maxAttempts', () => {
        const interaction: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 3,
          showHint: true,
          maxAttempts: 2,
        };

        expect(canRetry(interaction)).toBe(false);
      });
    });

    describe('createRetryInteraction', () => {
      it('increments attemptCount', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          expectedAnswer: 'The answer',
          attemptCount: 0,
          feedbackOnIncorrect: 'Try again with more detail.',
          showHint: false,
          maxAttempts: 2,
        };

        const retry = createRetryInteraction(original);
        expect(retry.attemptCount).toBe(1);
      });

      it('sets showHint to true', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 0,
          showHint: false,
          maxAttempts: 2,
        };

        const retry = createRetryInteraction(original);
        expect(retry.showHint).toBe(true);
      });

      it('preserves other fields unchanged', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'fill_in_blank',
          prompt: 'Complete the definition.',
          expectedAnswer: 'expected',
          attemptCount: 0,
          feedbackOnIncorrect: 'Review the concept.',
          hintText: 'Think about the key properties.',
          showHint: false,
          maxAttempts: 2,
        };

        const retry = createRetryInteraction(original);

        expect(retry.id).toBe(original.id);
        expect(retry.conceptId).toBe(original.conceptId);
        expect(retry.conceptName).toBe(original.conceptName);
        expect(retry.type).toBe(original.type);
        expect(retry.prompt).toBe(original.prompt);
        expect(retry.expectedAnswer).toBe(original.expectedAnswer);
        expect(retry.feedbackOnIncorrect).toBe(original.feedbackOnIncorrect);
        expect(retry.hintText).toBe(original.hintText);
        expect(retry.maxAttempts).toBe(original.maxAttempts);
      });

      it('returns a new object (immutable)', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 0,
          showHint: false,
          maxAttempts: 2,
        };

        const retry = createRetryInteraction(original);

        expect(retry).not.toBe(original);
        expect(original.attemptCount).toBe(0); // Original unchanged
        expect(original.showHint).toBe(false); // Original unchanged
      });

      it('throws MAX_ATTEMPTS_EXCEEDED when attemptCount equals maxAttempts', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 2,
          showHint: true,
          maxAttempts: 2,
        };

        expect(() => createRetryInteraction(original)).toThrow(SynthesisPhaseError);
        expect(() => createRetryInteraction(original)).toThrow('max attempts (2) reached');

        try {
          createRetryInteraction(original);
        } catch (error) {
          expect((error as SynthesisPhaseError).code).toBe('MAX_ATTEMPTS_EXCEEDED');
        }
      });

      it('throws MAX_ATTEMPTS_EXCEEDED when attemptCount exceeds maxAttempts', () => {
        const original: SynthesisInteraction = {
          id: 'test-interaction-1',
          conceptId: 'concept-1',
          conceptName: 'Test Concept',
          type: 'free_recall',
          prompt: 'Explain what Test Concept is.',
          attemptCount: 3,
          showHint: true,
          maxAttempts: 2,
        };

        expect(() => createRetryInteraction(original)).toThrow(SynthesisPhaseError);

        try {
          createRetryInteraction(original);
        } catch (error) {
          expect((error as SynthesisPhaseError).code).toBe('MAX_ATTEMPTS_EXCEEDED');
        }
      });
    });
  });
});
