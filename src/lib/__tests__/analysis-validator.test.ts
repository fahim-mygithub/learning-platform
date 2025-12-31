/**
 * Analysis Validator Service Tests
 *
 * Tests for validation checks on analysis results including:
 * - checkLearningObjectives - tier 2-3 concepts with/without objectives
 * - checkAssessmentSpec - valid/invalid question types for Bloom levels
 * - checkSourceMapping - valid/invalid timestamps
 * - Proportionality, Bloom ceiling, and time sanity checks
 */

import { Concept } from '@/src/types/database';
import {
  Pass1Result,
  Pass3Result,
  ValidationResults,
  BloomLevel,
  QuestionType,
  AssessmentSpec,
  SourceMapping,
  LearningObjective,
} from '@/src/types/three-pass';
import {
  createAnalysisValidatorService,
  AnalysisValidatorService,
  applyValidation,
} from '../analysis-validator';

describe('Analysis Validator Service', () => {
  let validator: AnalysisValidatorService;

  // Sample test data
  const createBaseConcept = (overrides: Partial<Concept> = {}): Concept => ({
    id: `concept-${Math.random().toString(36).substr(2, 9)}`,
    project_id: 'project-123',
    source_id: 'source-456',
    name: 'Test Concept',
    definition: 'A test concept definition.',
    key_points: ['Point 1', 'Point 2', 'Point 3'],
    cognitive_type: 'conceptual',
    difficulty: 5,
    source_timestamps: [],
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createPass1Result = (overrides: Partial<Pass1Result> = {}): Pass1Result => ({
    contentType: 'conceptual',
    thesisStatement: 'Main thesis statement',
    bloomCeiling: 'analyze',
    modeMultiplier: 2.5,
    extractionDepth: 'explanations',
    sourceDurationSeconds: 1200, // 20 minutes
    conceptDensity: null,
    ...overrides,
  });

  const createPass3Result = (overrides: Partial<Pass3Result> = {}): Pass3Result => ({
    epitomeConceptId: 'concept-epitome',
    levels: [],
    relationships: [],
    timeCalibration: {
      mode_multiplier: 2.5,
      density_modifier: 1.0,
      knowledge_type_factor: 1.0,
      source_duration_seconds: 1200,
      calculated_learning_time_minutes: 50,
    },
    validationResults: {
      proportionality_passed: true,
      bloom_ceiling_passed: true,
      time_sanity_passed: true,
      warnings: [],
    },
    ...overrides,
  });

  beforeEach(() => {
    validator = createAnalysisValidatorService();
  });

  describe('createAnalysisValidatorService', () => {
    it('creates validator service with all methods', () => {
      expect(validator).toBeDefined();
      expect(validator.validate).toBeDefined();
      expect(validator.checkProportionality).toBeDefined();
      expect(validator.checkBloomCeiling).toBeDefined();
      expect(validator.checkTimeSanity).toBeDefined();
      expect(validator.checkLearningObjectives).toBeDefined();
      expect(validator.checkAssessmentSpec).toBeDefined();
      expect(validator.checkSourceMapping).toBeDefined();
    });
  });

  describe('checkLearningObjectives', () => {
    const sampleLearningObjective: LearningObjective = {
      bloom_verb: 'Explain',
      objective_statement: 'You will be able to explain the concept',
      success_criteria: ['Can articulate main points', 'Can provide examples'],
    };

    it('passes when all tier 2-3 non-mentioned-only concepts have learning objectives', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          tier: 2,
          mentioned_only: false,
          learning_objectives: [sampleLearningObjective],
        }),
        createBaseConcept({
          tier: 3,
          mentioned_only: false,
          learning_objectives: [sampleLearningObjective],
        }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes with warning when tier 2-3 concepts are missing learning objectives', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Missing Objectives Concept',
          tier: 2,
          mentioned_only: false,
          learning_objectives: [], // Empty array
        }),
        createBaseConcept({
          tier: 3,
          mentioned_only: false,
          learning_objectives: [sampleLearningObjective],
        }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true); // Pass with warning
      expect(warning).not.toBeNull();
      expect(warning).toContain('Missing Objectives Concept');
      expect(warning).toContain('missing learning objectives');
    });

    it('ignores tier 1 concepts', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          tier: 1,
          mentioned_only: false,
          learning_objectives: [], // No objectives but tier 1 is ignored
        }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('ignores mentioned_only concepts', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          tier: 2,
          mentioned_only: true, // Mentioned only, should be ignored
          learning_objectives: [],
        }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes when no tier 2-3 learning concepts exist', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          tier: 1,
          mentioned_only: false,
        }),
        createBaseConcept({
          tier: 2,
          mentioned_only: true,
        }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('lists up to 3 concepts in warning message', () => {
      const concepts: Concept[] = [
        createBaseConcept({ name: 'Concept A', tier: 2, mentioned_only: false, learning_objectives: [] }),
        createBaseConcept({ name: 'Concept B', tier: 2, mentioned_only: false, learning_objectives: [] }),
        createBaseConcept({ name: 'Concept C', tier: 3, mentioned_only: false, learning_objectives: [] }),
        createBaseConcept({ name: 'Concept D', tier: 2, mentioned_only: false, learning_objectives: [] }),
      ];

      const [passed, warning] = validator.checkLearningObjectives(concepts);

      expect(passed).toBe(true);
      expect(warning).toContain('Concept A');
      expect(warning).toContain('Concept B');
      expect(warning).toContain('Concept C');
      expect(warning).toContain('and 1 more');
    });
  });

  describe('checkAssessmentSpec', () => {
    const createAssessmentSpec = (questionTypes: QuestionType[]): AssessmentSpec => ({
      appropriate_question_types: questionTypes,
      inappropriate_question_types: [],
      sample_questions: [],
      mastery_indicators: ['Can answer correctly'],
      mastery_threshold: 0.7,
    });

    it('passes when question types match Bloom level (remember)', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          bloom_level: 'remember',
          assessment_spec: createAssessmentSpec(['definition_recall', 'true_false']),
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes when question types match Bloom level (understand)', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          bloom_level: 'understand',
          assessment_spec: createAssessmentSpec(['multiple_choice']),
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes when question types match Bloom level (apply)', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          bloom_level: 'apply',
          assessment_spec: createAssessmentSpec(['application', 'sequence']),
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes when question types match Bloom level (analyze)', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          bloom_level: 'analyze',
          assessment_spec: createAssessmentSpec(['comparison', 'cause_effect']),
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('warns when question types are inappropriate for Bloom level', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Mismatched Concept',
          bloom_level: 'remember', // Recall level
          assessment_spec: createAssessmentSpec(['application', 'cause_effect']), // Higher-level questions
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true); // Pass with warning
      expect(warning).not.toBeNull();
      expect(warning).toContain('Mismatched Concept');
      expect(warning).toContain('not appropriate for their Bloom level');
    });

    it('passes when concepts have no assessment spec', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          bloom_level: 'analyze',
          // No assessment_spec
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('handles mixed valid and invalid specs', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Valid Concept',
          bloom_level: 'understand',
          assessment_spec: createAssessmentSpec(['multiple_choice']),
        }),
        createBaseConcept({
          name: 'Invalid Concept',
          bloom_level: 'remember',
          assessment_spec: createAssessmentSpec(['comparison']), // Wrong for remember
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      expect(passed).toBe(true);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Invalid Concept');
      expect(warning).not.toContain('Valid Concept');
    });

    it('handles concepts without bloom_level', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          // No bloom_level set
          assessment_spec: createAssessmentSpec(['application']),
        }),
      ];

      const [passed, warning] = validator.checkAssessmentSpec(concepts);

      // Should pass because we skip concepts without bloom_level
      expect(passed).toBe(true);
    });
  });

  describe('checkSourceMapping', () => {
    const createSourceMapping = (
      primaryStart: number,
      primaryEnd: number,
      reviewStart?: number,
      reviewEnd?: number
    ): SourceMapping => ({
      primary_segment: { start_sec: primaryStart, end_sec: primaryEnd },
      key_moments: [],
      review_clip: reviewStart !== undefined && reviewEnd !== undefined
        ? { start_sec: reviewStart, end_sec: reviewEnd }
        : { start_sec: primaryStart, end_sec: primaryEnd },
    });

    it('passes with valid timestamps (non-negative, start < end)', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          source_mapping: createSourceMapping(0, 60, 30, 50),
        }),
        createBaseConcept({
          source_mapping: createSourceMapping(100, 200, 150, 180),
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('fails with negative start timestamp', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Negative Start',
          source_mapping: createSourceMapping(-5, 60), // Negative start
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Negative Start');
      expect(warning).toContain('invalid source mapping timestamps');
    });

    it('fails when start >= end in primary_segment', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Start Equals End',
          source_mapping: createSourceMapping(60, 60), // start == end
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Start Equals End');
    });

    it('fails when start > end in primary_segment', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Start Greater Than End',
          source_mapping: createSourceMapping(100, 50), // start > end
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Start Greater Than End');
    });

    it('fails with invalid review_clip timestamps', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Invalid Review Clip',
          source_mapping: {
            primary_segment: { start_sec: 0, end_sec: 100 },
            key_moments: [],
            review_clip: { start_sec: 80, end_sec: 70 }, // start > end
          },
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Invalid Review Clip');
    });

    it('fails with negative review_clip start', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Negative Review Start',
          source_mapping: {
            primary_segment: { start_sec: 0, end_sec: 100 },
            key_moments: [],
            review_clip: { start_sec: -10, end_sec: 50 }, // negative start
          },
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
    });

    it('passes when concepts have no source mapping', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          // No source_mapping
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('handles mixed valid and invalid mappings', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Valid Mapping',
          source_mapping: createSourceMapping(0, 100),
        }),
        createBaseConcept({
          name: 'Invalid Mapping 1',
          source_mapping: createSourceMapping(100, 50), // Invalid
        }),
        createBaseConcept({
          name: 'Invalid Mapping 2',
          source_mapping: createSourceMapping(-5, 60), // Invalid
        }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).toContain('2 concept(s)');
      expect(warning).toContain('Invalid Mapping 1');
      expect(warning).toContain('Invalid Mapping 2');
      expect(warning).not.toContain('Valid Mapping');
    });

    it('lists up to 3 concepts in error message', () => {
      const concepts: Concept[] = [
        createBaseConcept({ name: 'Invalid A', source_mapping: createSourceMapping(10, 5) }),
        createBaseConcept({ name: 'Invalid B', source_mapping: createSourceMapping(20, 10) }),
        createBaseConcept({ name: 'Invalid C', source_mapping: createSourceMapping(30, 15) }),
        createBaseConcept({ name: 'Invalid D', source_mapping: createSourceMapping(40, 20) }),
      ];

      const [passed, warning] = validator.checkSourceMapping(concepts);

      expect(passed).toBe(false);
      expect(warning).toContain('4 concept(s)');
      expect(warning).toContain('Invalid A');
      expect(warning).toContain('Invalid B');
      expect(warning).toContain('Invalid C');
      expect(warning).toContain('and 1 more');
    });
  });

  describe('checkProportionality', () => {
    it('passes with reasonable concept count for duration', () => {
      const concepts: Concept[] = [
        createBaseConcept(),
        createBaseConcept(),
        createBaseConcept(),
      ];
      const durationSeconds = 600; // 10 minutes, max ~30 concepts

      const [passed, warning] = validator.checkProportionality(concepts, durationSeconds);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('fails when too many concepts for content duration', () => {
      const concepts: Concept[] = Array(20).fill(null).map(() => createBaseConcept());
      const durationSeconds = 180; // 3 minutes, max ~9 concepts

      const [passed, warning] = validator.checkProportionality(concepts, durationSeconds);

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Too many learning objectives');
    });

    it('warns when very few concepts for long content', () => {
      const concepts: Concept[] = [createBaseConcept()];
      const durationSeconds = 1800; // 30 minutes, min ~9 concepts

      const [passed, warning] = validator.checkProportionality(concepts, durationSeconds);

      expect(passed).toBe(true); // Pass with warning
      expect(warning).not.toBeNull();
      expect(warning).toContain('Few learning objectives');
    });

    it('passes when duration is null', () => {
      const concepts: Concept[] = [createBaseConcept()];

      const [passed, warning] = validator.checkProportionality(concepts, null);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('passes when duration is zero', () => {
      const concepts: Concept[] = [createBaseConcept()];

      const [passed, warning] = validator.checkProportionality(concepts, 0);

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });
  });

  describe('checkBloomCeiling', () => {
    it('passes when all concepts are at or below ceiling', () => {
      const concepts: Concept[] = [
        createBaseConcept({ bloom_level: 'remember' }),
        createBaseConcept({ bloom_level: 'understand' }),
        createBaseConcept({ bloom_level: 'apply' }),
      ];

      const [passed, warning] = validator.checkBloomCeiling(concepts, 'apply');

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('fails when concepts exceed Bloom ceiling', () => {
      const concepts: Concept[] = [
        createBaseConcept({ name: 'Above Ceiling', bloom_level: 'analyze' }),
        createBaseConcept({ bloom_level: 'understand' }),
      ];

      const [passed, warning] = validator.checkBloomCeiling(concepts, 'understand');

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('Above Ceiling');
      expect(warning).toContain('exceed Bloom\'s ceiling');
    });

    it('handles concepts without bloom_level', () => {
      const concepts: Concept[] = [
        createBaseConcept({ bloom_level: undefined }),
      ];

      const [passed, warning] = validator.checkBloomCeiling(concepts, 'understand');

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });
  });

  describe('checkTimeSanity', () => {
    it('passes when learning time is within bounds', () => {
      // 20 min source * 5x max for conceptual = 100 min max
      const [passed, warning] = validator.checkTimeSanity(50, 1200, 'conceptual');

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('fails when learning time exceeds maximum for content type', () => {
      // 10 min source * 2x max for survey = 20 min max
      const [passed, warning] = validator.checkTimeSanity(30, 600, 'survey');

      expect(passed).toBe(false);
      expect(warning).not.toBeNull();
      expect(warning).toContain('exceeds reasonable limit');
    });

    it('warns when learning time is less than source duration', () => {
      // 20 min source, but only 10 min learning time (suspicious)
      const [passed, warning] = validator.checkTimeSanity(10, 1200, 'conceptual');

      expect(passed).toBe(true); // Pass with warning
      expect(warning).not.toBeNull();
      expect(warning).toContain('less than source duration');
    });

    it('passes when source duration is null', () => {
      const [passed, warning] = validator.checkTimeSanity(50, null, 'conceptual');

      expect(passed).toBe(true);
      expect(warning).toBeNull();
    });

    it('handles different content types', () => {
      // Survey: 2x max
      expect(validator.checkTimeSanity(25, 600, 'survey')[0]).toBe(false);
      expect(validator.checkTimeSanity(15, 600, 'survey')[0]).toBe(true);

      // Conceptual: 5x max
      expect(validator.checkTimeSanity(60, 600, 'conceptual')[0]).toBe(false);
      expect(validator.checkTimeSanity(40, 600, 'conceptual')[0]).toBe(true);

      // Procedural: 10x max
      expect(validator.checkTimeSanity(120, 600, 'procedural')[0]).toBe(false);
      expect(validator.checkTimeSanity(80, 600, 'procedural')[0]).toBe(true);
    });
  });

  describe('validate (integration)', () => {
    it('runs all validation checks and returns combined results', () => {
      // Create 5 concepts for 5 minutes of content - passes proportionality check
      const concepts: Concept[] = Array(5).fill(null).map((_, i) =>
        createBaseConcept({
          name: `Concept ${i + 1}`,
          tier: 2,
          mentioned_only: false,
          bloom_level: 'understand',
          learning_objectives: [{
            bloom_verb: 'Explain',
            objective_statement: 'You will be able to explain...',
            success_criteria: ['Can explain'],
          }],
          source_mapping: {
            primary_segment: { start_sec: i * 60, end_sec: (i + 1) * 60 },
            key_moments: [],
            review_clip: { start_sec: i * 60 + 10, end_sec: i * 60 + 50 },
          },
          assessment_spec: {
            appropriate_question_types: ['multiple_choice'],
            inappropriate_question_types: [],
            sample_questions: [],
            mastery_indicators: ['Can answer correctly'],
            mastery_threshold: 0.7,
          },
        })
      );

      // 5 minutes source duration with 5 concepts is reasonable (1 concept/min)
      const pass1Result = createPass1Result({ sourceDurationSeconds: 300 });
      const pass3Result = createPass3Result({
        timeCalibration: {
          mode_multiplier: 2.5,
          density_modifier: 1.0,
          knowledge_type_factor: 1.0,
          source_duration_seconds: 300,
          calculated_learning_time_minutes: 12, // 5 min * 2.5
        },
      });

      const results = validator.validate(concepts, pass3Result, pass1Result);

      expect(results.proportionality_passed).toBe(true);
      expect(results.bloom_ceiling_passed).toBe(true);
      expect(results.time_sanity_passed).toBe(true);
      expect(results.learning_objectives_passed).toBe(true);
      expect(results.assessment_spec_passed).toBe(true);
      expect(results.source_mapping_passed).toBe(true);
      expect(results.warnings).toHaveLength(0);
    });

    it('accumulates warnings from multiple checks', () => {
      const concepts: Concept[] = [
        createBaseConcept({
          name: 'Problem Concept',
          tier: 2,
          mentioned_only: false,
          bloom_level: 'analyze', // Exceeds ceiling
          learning_objectives: [], // Missing
          source_mapping: {
            primary_segment: { start_sec: 100, end_sec: 50 }, // Invalid
            key_moments: [],
            review_clip: { start_sec: 0, end_sec: 30 },
          },
        }),
      ];

      const pass1Result = createPass1Result({ bloomCeiling: 'understand' });
      const pass3Result = createPass3Result();

      const results = validator.validate(concepts, pass3Result, pass1Result);

      expect(results.bloom_ceiling_passed).toBe(false);
      expect(results.source_mapping_passed).toBe(false);
      expect(results.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('filters mentioned_only concepts for proportionality check', () => {
      const concepts: Concept[] = [
        createBaseConcept({ mentioned_only: true }),
        createBaseConcept({ mentioned_only: true }),
        createBaseConcept({ mentioned_only: false }),
      ];

      const pass1Result = createPass1Result({ sourceDurationSeconds: 60 }); // 1 minute
      const pass3Result = createPass3Result();

      const results = validator.validate(concepts, pass3Result, pass1Result);

      // Only 1 learning concept for 1 minute = reasonable
      expect(results.proportionality_passed).toBe(true);
    });
  });

  describe('applyValidation', () => {
    it('adds validation results to Pass3Result', () => {
      const concepts: Concept[] = [createBaseConcept({ tier: 2, mentioned_only: false })];
      const pass1Result = createPass1Result();
      const pass3Result = createPass3Result();

      const updatedResult = applyValidation(concepts, pass3Result, pass1Result);

      expect(updatedResult.validationResults).toBeDefined();
      expect(updatedResult.validationResults.proportionality_passed).toBeDefined();
      expect(updatedResult.validationResults.bloom_ceiling_passed).toBeDefined();
    });

    it('preserves other Pass3Result fields', () => {
      const concepts: Concept[] = [createBaseConcept()];
      const pass1Result = createPass1Result();
      const pass3Result = createPass3Result({
        epitomeConceptId: 'custom-epitome',
        levels: [{ level: 0, title: 'Epitome', concept_ids: [], estimated_minutes: 10 }],
      });

      const updatedResult = applyValidation(concepts, pass3Result, pass1Result);

      expect(updatedResult.epitomeConceptId).toBe('custom-epitome');
      expect(updatedResult.levels).toHaveLength(1);
    });
  });
});
