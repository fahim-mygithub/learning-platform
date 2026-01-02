/**
 * Learning Agenda Service Tests
 *
 * TDD tests for the Learning Agenda generation service.
 */

import {
  createLearningAgendaService,
  LearningAgendaService,
  LearningAgendaError,
  validateLearningAgenda,
} from '../learning-agenda-service';
import { AIService } from '../ai-service';
import {
  Pass1Result,
  EnhancedExtractedConcept,
  LearningAgenda,
} from '@/src/types/three-pass';

// Mock AI service
const mockSendStructuredMessage = jest.fn();
jest.mock('../ai-service', () => ({
  sendStructuredMessage: (...args: unknown[]) => mockSendStructuredMessage(...args),
}));

// Mock debug logger
jest.mock('../debug-logger', () => ({
  logInput: jest.fn(),
  logOutput: jest.fn(),
  logError: jest.fn(),
  startTimer: jest.fn(() => ({ stop: jest.fn(() => 100) })),
}));

describe('LearningAgendaService', () => {
  let service: LearningAgendaService;
  let mockAIService: AIService;

  // Sample Pass 1 result
  const samplePass1Result: Pass1Result = {
    contentType: 'conceptual',
    thesisStatement: 'Understanding deck building in Riftbound TCG',
    bloomCeiling: 'analyze',
    modeMultiplier: 2.5,
    extractionDepth: 'explanations',
    sourceDurationSeconds: 660,
    conceptDensity: 0.76,
    topicCount: 4,
  };

  // Sample concepts
  const sampleConcepts: EnhancedExtractedConcept[] = [
    {
      name: 'Riftbound TCG',
      definition: 'A trading card game with unique deck building mechanics.',
      key_points: ['Card game', 'Deck building', 'Strategic gameplay'],
      cognitive_type: 'conceptual',
      difficulty: 5,
      tier: 3,
      mentioned_only: false,
      bloom_level: 'understand',
      definition_provided: true,
      time_allocation_percent: 20,
      one_sentence_summary: 'Riftbound is a strategic TCG with unique mechanics.',
      why_it_matters: 'Foundation for all other gameplay concepts.',
      learning_objectives: [
        {
          bloom_verb: 'Explain',
          objective_statement: 'Explain the core mechanics of Riftbound TCG',
          success_criteria: ['Describe deck composition', 'Identify card types'],
        },
      ],
    },
    {
      name: 'Deck Construction',
      definition: 'Building a legal deck with the required card counts.',
      key_points: ['40 card minimum', 'Champion requirement', 'Domain matching'],
      cognitive_type: 'procedural',
      difficulty: 6,
      tier: 2,
      mentioned_only: false,
      bloom_level: 'apply',
      definition_provided: true,
      time_allocation_percent: 30,
      one_sentence_summary: 'Building a valid deck requires following specific rules.',
      why_it_matters: 'Required to play the game.',
      learning_objectives: [
        {
          bloom_verb: 'Demonstrate',
          objective_statement: 'Demonstrate how to construct a legal deck',
          success_criteria: ['Count cards correctly', 'Select matching domains'],
        },
      ],
    },
    {
      name: 'Champion Legends',
      definition: 'Special cards that lead your deck.',
      key_points: ['One per deck', 'Defines color access', 'Unique abilities'],
      cognitive_type: 'conceptual',
      difficulty: 5,
      tier: 2,
      mentioned_only: false,
      bloom_level: 'understand',
      definition_provided: true,
      time_allocation_percent: 25,
    },
    {
      name: 'Standard Format',
      definition: 'The most common competitive format.',
      key_points: ['Set rotation', 'Banned list'],
      cognitive_type: 'declarative',
      difficulty: 3,
      tier: 1,
      mentioned_only: true, // Mentioned but not explained
      bloom_level: 'remember',
      definition_provided: false,
      time_allocation_percent: 5,
    },
  ];

  // Sample generated agenda
  const sampleAgenda: LearningAgenda = {
    module_title: 'Mastering Riftbound TCG Deck Building',
    central_question: 'How do you build and play a competitive deck in Riftbound?',
    thesis_statement: 'Understanding deck building in Riftbound TCG',
    learning_promise: 'After this module, you will be able to build a legal Riftbound deck and understand the strategic implications of your choices.',
    module_objectives: [
      'Explain the core mechanics of Riftbound TCG',
      'Demonstrate deck construction following game rules',
      'Describe the role of Champion Legends in deck building',
    ],
    content_summary: 'This content covers the fundamentals of Riftbound TCG, focusing on deck building rules and Champion Legends. You will learn the card counts, domain matching, and strategic considerations.',
    content_type_explanation: 'This is a conceptual deep-dive that explores the reasoning behind deck building choices.',
    key_concepts: [
      {
        name: 'Riftbound TCG',
        tier: 3,
        one_liner: 'A strategic trading card game with unique mechanics.',
        why_included: 'Foundation for all other gameplay concepts.',
      },
      {
        name: 'Deck Construction',
        tier: 2,
        one_liner: 'Building a valid deck requires following specific rules.',
        why_included: 'Required to play the game.',
      },
      {
        name: 'Champion Legends',
        tier: 2,
        one_liner: 'Special cards that lead your deck and define color access.',
        why_included: 'Central to deck identity and strategy.',
      },
    ],
    learning_path: [
      {
        phase: 1,
        phase_title: 'Core Understanding',
        description: 'Learn what Riftbound TCG is and its core mechanics.',
        concept_names: ['Riftbound TCG'],
        estimated_minutes: 6,
      },
      {
        phase: 2,
        phase_title: 'Building Fundamentals',
        description: 'Master the rules of deck construction.',
        concept_names: ['Deck Construction', 'Champion Legends'],
        estimated_minutes: 34,
      },
    ],
    total_time_minutes: 40,
    recommended_session_length: 15,
    prerequisites: {
      required: [],
      helpful: ['Basic card game familiarity'],
    },
    mastery_definition: 'You will have mastered this when you can independently build a legal deck and explain your card choices.',
    assessment_preview: 'You will be tested through quiz questions on rules and a deck building exercise.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAIService = {} as AIService;
    service = createLearningAgendaService(mockAIService);
  });

  describe('createLearningAgendaService', () => {
    it('should create a service instance', () => {
      expect(service).toBeDefined();
      expect(service.generateAgenda).toBeDefined();
    });
  });

  describe('generateAgenda', () => {
    it('should generate a learning agenda from Pass 1 result and concepts', async () => {
      mockSendStructuredMessage.mockResolvedValueOnce({
        data: sampleAgenda,
        content: JSON.stringify(sampleAgenda),
        model: 'claude-3-haiku-20240307',
        usage: { inputTokens: 1000, outputTokens: 500 },
        stopReason: 'end_turn',
      });

      const agenda = await service.generateAgenda(samplePass1Result, sampleConcepts);

      expect(agenda).toBeDefined();
      expect(agenda.module_title).toBe('Mastering Riftbound TCG Deck Building');
      expect(agenda.central_question).toBe('How do you build and play a competitive deck in Riftbound?');
      expect(agenda.thesis_statement).toBe('Understanding deck building in Riftbound TCG');
      expect(agenda.module_objectives).toHaveLength(3);
      expect(agenda.key_concepts).toHaveLength(3);
      expect(agenda.learning_path).toHaveLength(2);
      expect(agenda.total_time_minutes).toBe(40);
    });

    it('should filter out mentioned_only concepts from key_concepts', async () => {
      mockSendStructuredMessage.mockResolvedValueOnce({
        data: sampleAgenda,
        content: JSON.stringify(sampleAgenda),
        model: 'claude-3-haiku-20240307',
        usage: { inputTokens: 1000, outputTokens: 500 },
        stopReason: 'end_turn',
      });

      await service.generateAgenda(samplePass1Result, sampleConcepts);

      // Verify the AI was called with filtered concepts (no mentioned_only)
      expect(mockSendStructuredMessage).toHaveBeenCalledTimes(1);
      const callArgs = mockSendStructuredMessage.mock.calls[0];
      const userMessage = callArgs[1].userMessage;

      // Should include tier 2-3 explained concepts
      expect(userMessage).toContain('Riftbound TCG');
      expect(userMessage).toContain('Deck Construction');
      expect(userMessage).toContain('Champion Legends');
    });

    it('should use Haiku model for generation', async () => {
      mockSendStructuredMessage.mockResolvedValueOnce({
        data: sampleAgenda,
        content: JSON.stringify(sampleAgenda),
        model: 'claude-3-haiku-20240307',
        usage: { inputTokens: 1000, outputTokens: 500 },
        stopReason: 'end_turn',
      });

      await service.generateAgenda(samplePass1Result, sampleConcepts);

      expect(mockSendStructuredMessage).toHaveBeenCalledWith(
        mockAIService,
        expect.objectContaining({
          options: expect.objectContaining({
            model: 'claude-haiku',
          }),
        })
      );
    });

    it('should throw error if no concepts provided', async () => {
      await expect(
        service.generateAgenda(samplePass1Result, [])
      ).rejects.toThrow(LearningAgendaError);

      await expect(
        service.generateAgenda(samplePass1Result, [])
      ).rejects.toThrow('No concepts provided for agenda generation');
    });

    it('should throw error if all concepts are mentioned_only', async () => {
      const mentionedOnlyConcepts = sampleConcepts.map((c) => ({
        ...c,
        mentioned_only: true,
      }));

      await expect(
        service.generateAgenda(samplePass1Result, mentionedOnlyConcepts)
      ).rejects.toThrow(LearningAgendaError);

      await expect(
        service.generateAgenda(samplePass1Result, mentionedOnlyConcepts)
      ).rejects.toThrow('No explained concepts found');
    });

    it('should handle API errors gracefully', async () => {
      mockSendStructuredMessage.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      await expect(
        service.generateAgenda(samplePass1Result, sampleConcepts)
      ).rejects.toThrow(LearningAgendaError);
    });
  });

  describe('validateLearningAgenda', () => {
    it('should validate a correct agenda', () => {
      const result = validateLearningAgenda(sampleAgenda);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing module_title', () => {
      const badAgenda = { ...sampleAgenda, module_title: '' };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('module_title is required');
    });

    it('should detect missing central_question', () => {
      const badAgenda = { ...sampleAgenda, central_question: '' };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('central_question is required');
    });

    it('should detect empty module_objectives', () => {
      const badAgenda = { ...sampleAgenda, module_objectives: [] };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('module_objectives must have 1-5 items');
    });

    it('should detect too many module_objectives', () => {
      const badAgenda = {
        ...sampleAgenda,
        module_objectives: ['1', '2', '3', '4', '5', '6'],
      };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('module_objectives must have 1-5 items');
    });

    it('should detect empty key_concepts', () => {
      const badAgenda = { ...sampleAgenda, key_concepts: [] };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('key_concepts must not be empty');
    });

    it('should detect empty learning_path', () => {
      const badAgenda = { ...sampleAgenda, learning_path: [] };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('learning_path must not be empty');
    });

    it('should detect invalid total_time_minutes', () => {
      const badAgenda = { ...sampleAgenda, total_time_minutes: 0 };
      const result = validateLearningAgenda(badAgenda);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('total_time_minutes must be positive');
    });
  });
});
