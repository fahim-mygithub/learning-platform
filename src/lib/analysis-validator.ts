/**
 * Analysis Validator Service
 *
 * Validates analysis results before completion using six checks:
 * 1. Proportionality: Concept count reasonable for content length
 * 2. Bloom's Ceiling: No concepts exceed the ceiling from Pass 1
 * 3. Time Sanity: Learning time within reasonable bounds
 * 4. Learning Objectives: Tier 2-3 concepts have learning objectives
 * 5. Assessment Spec: Question types appropriate for Bloom level
 * 6. Source Mapping: Valid timestamps (non-negative, start < end)
 *
 * @example
 * ```ts
 * import { createAnalysisValidatorService } from '@/src/lib/analysis-validator';
 *
 * const validator = createAnalysisValidatorService();
 * const results = validator.validate(concepts, pass3Result, pass1Result);
 * // results: { proportionality_passed: true, warnings: [] }
 * ```
 */

import { Concept } from '@/src/types/database';
import {
  Pass1Result,
  Pass3Result,
  ValidationResults,
  BLOOM_LEVEL_ORDER,
  BloomLevel,
  QuestionType,
} from '@/src/types/three-pass';

/**
 * Analysis validator service interface
 */
export interface AnalysisValidatorService {
  /**
   * Validate analysis results
   * @param concepts - All extracted concepts
   * @param pass3Result - Pass 3 roadmap result
   * @param pass1Result - Pass 1 classification result
   * @returns Validation results with warnings
   */
  validate(
    concepts: Concept[],
    pass3Result: Pass3Result,
    pass1Result: Pass1Result
  ): ValidationResults;

  /**
   * Check proportionality (concept count vs content length)
   * @param concepts - Learning objective concepts (not mentioned_only)
   * @param sourceDurationSeconds - Source duration
   * @returns Tuple of [passed, warning message or null]
   */
  checkProportionality(
    concepts: Concept[],
    sourceDurationSeconds: number | null
  ): [boolean, string | null];

  /**
   * Check Bloom's ceiling enforcement
   * @param concepts - All concepts
   * @param bloomCeiling - Maximum allowed Bloom's level
   * @returns Tuple of [passed, warning message or null]
   */
  checkBloomCeiling(
    concepts: Concept[],
    bloomCeiling: BloomLevel
  ): [boolean, string | null];

  /**
   * Check time sanity (learning time within bounds)
   * @param learningTimeMinutes - Calculated learning time
   * @param sourceDurationSeconds - Source duration
   * @param contentType - Content type from Pass 1
   * @returns Tuple of [passed, warning message or null]
   */
  checkTimeSanity(
    learningTimeMinutes: number,
    sourceDurationSeconds: number | null,
    contentType: string
  ): [boolean, string | null];

  /**
   * Check learning objectives exist for tier 2-3 non-mentioned-only concepts
   * @param concepts - All concepts
   * @returns Tuple of [passed, warning message or null]
   */
  checkLearningObjectives(concepts: Concept[]): [boolean, string | null];

  /**
   * Check assessment spec has appropriate question types for Bloom level
   * @param concepts - All concepts
   * @returns Tuple of [passed, warning message or null]
   */
  checkAssessmentSpec(concepts: Concept[]): [boolean, string | null];

  /**
   * Check source mapping has valid timestamps
   * @param concepts - All concepts
   * @returns Tuple of [passed, warning message or null]
   */
  checkSourceMapping(concepts: Concept[]): [boolean, string | null];
}

/**
 * Maximum concepts per minute of source content
 * Based on research: 3 concepts per minute is a reasonable upper bound
 */
const MAX_CONCEPTS_PER_MINUTE = 3;

/**
 * Maximum time multipliers by content type
 * Survey: 2x is max (6 min video -> 12 min max)
 * Conceptual: 5x is max (6 min video -> 30 min max)
 * Procedural: 10x is max (6 min video -> 60 min max, includes practice)
 */
const MAX_TIME_MULTIPLIER: Record<string, number> = {
  survey: 2,
  conceptual: 5,
  procedural: 10,
};

/**
 * Appropriate question types by Bloom's level
 * Lower levels: recall-based questions
 * Higher levels: application and analysis questions
 */
const APPROPRIATE_QUESTION_TYPES: Record<BloomLevel, QuestionType[]> = {
  remember: ['definition_recall', 'true_false', 'multiple_choice'],
  understand: ['definition_recall', 'true_false', 'multiple_choice'],
  apply: ['application', 'sequence'],
  analyze: ['comparison', 'cause_effect', 'application'],
  evaluate: ['comparison', 'cause_effect', 'application'],
  create: ['comparison', 'cause_effect', 'application'],
};

/**
 * Create an analysis validator service instance
 */
export function createAnalysisValidatorService(): AnalysisValidatorService {
  return {
    validate(
      concepts: Concept[],
      pass3Result: Pass3Result,
      pass1Result: Pass1Result
    ): ValidationResults {
      const warnings: string[] = [];

      // Filter to learning objectives only
      const learningConcepts = concepts.filter((c) => !c.mentioned_only);

      // Check 1: Proportionality
      const [proportionalityPassed, proportionalityWarning] = this.checkProportionality(
        learningConcepts,
        pass1Result.sourceDurationSeconds
      );
      if (proportionalityWarning) {
        warnings.push(proportionalityWarning);
      }

      // Check 2: Bloom's Ceiling
      const [bloomCeilingPassed, bloomWarning] = this.checkBloomCeiling(
        concepts,
        pass1Result.bloomCeiling
      );
      if (bloomWarning) {
        warnings.push(bloomWarning);
      }

      // Check 3: Time Sanity
      const [timeSanityPassed, timeWarning] = this.checkTimeSanity(
        pass3Result.timeCalibration.calculated_learning_time_minutes,
        pass1Result.sourceDurationSeconds,
        pass1Result.contentType
      );
      if (timeWarning) {
        warnings.push(timeWarning);
      }

      // Check 4: Learning Objectives
      const [learningObjectivesPassed, learningObjectivesWarning] =
        this.checkLearningObjectives(concepts);
      if (learningObjectivesWarning) {
        warnings.push(learningObjectivesWarning);
      }

      // Check 5: Assessment Spec
      const [assessmentSpecPassed, assessmentSpecWarning] =
        this.checkAssessmentSpec(concepts);
      if (assessmentSpecWarning) {
        warnings.push(assessmentSpecWarning);
      }

      // Check 6: Source Mapping
      const [sourceMappingPassed, sourceMappingWarning] =
        this.checkSourceMapping(concepts);
      if (sourceMappingWarning) {
        warnings.push(sourceMappingWarning);
      }

      return {
        proportionality_passed: proportionalityPassed,
        bloom_ceiling_passed: bloomCeilingPassed,
        time_sanity_passed: timeSanityPassed,
        learning_objectives_passed: learningObjectivesPassed,
        assessment_spec_passed: assessmentSpecPassed,
        source_mapping_passed: sourceMappingPassed,
        warnings,
      };
    },

    checkProportionality(
      concepts: Concept[],
      sourceDurationSeconds: number | null
    ): [boolean, string | null] {
      if (!sourceDurationSeconds || sourceDurationSeconds === 0) {
        // Can't check proportionality without duration
        return [true, null];
      }

      const durationMinutes = sourceDurationSeconds / 60;
      const maxConcepts = Math.ceil(durationMinutes * MAX_CONCEPTS_PER_MINUTE);
      const conceptCount = concepts.length;

      if (conceptCount > maxConcepts) {
        return [
          false,
          `Too many learning objectives (${conceptCount}) for ${Math.round(durationMinutes)} min content. ` +
            `Expected max ~${maxConcepts}. Consider reviewing mentioned_only flags.`,
        ];
      }

      // Warn if very few concepts (might indicate under-extraction)
      const minConcepts = Math.max(1, Math.floor(durationMinutes * 0.3));
      if (conceptCount < minConcepts && durationMinutes > 3) {
        return [
          true,
          `Few learning objectives (${conceptCount}) for ${Math.round(durationMinutes)} min content. ` +
            `This may indicate important concepts were marked as mentioned_only.`,
        ];
      }

      return [true, null];
    },

    checkBloomCeiling(
      concepts: Concept[],
      bloomCeiling: BloomLevel
    ): [boolean, string | null] {
      const ceilingIndex = BLOOM_LEVEL_ORDER.indexOf(bloomCeiling);

      const violations = concepts.filter((c) => {
        const level = c.bloom_level as BloomLevel | undefined;
        if (!level) return false;
        return BLOOM_LEVEL_ORDER.indexOf(level) > ceilingIndex;
      });

      if (violations.length > 0) {
        const violationNames = violations.slice(0, 3).map((c) => c.name);
        const moreCount = violations.length - 3;

        return [
          false,
          `${violations.length} concept(s) exceed Bloom's ceiling "${bloomCeiling}": ` +
            `${violationNames.join(', ')}${moreCount > 0 ? ` and ${moreCount} more` : ''}. ` +
            `These should be at "${bloomCeiling}" level or below for this content type.`,
        ];
      }

      return [true, null];
    },

    checkTimeSanity(
      learningTimeMinutes: number,
      sourceDurationSeconds: number | null,
      contentType: string
    ): [boolean, string | null] {
      if (!sourceDurationSeconds || sourceDurationSeconds === 0) {
        // Can't check time sanity without source duration
        return [true, null];
      }

      const sourceMinutes = sourceDurationSeconds / 60;
      const maxMultiplier = MAX_TIME_MULTIPLIER[contentType] || 10;
      const maxLearningTime = sourceMinutes * maxMultiplier;

      if (learningTimeMinutes > maxLearningTime) {
        return [
          false,
          `Learning time (${learningTimeMinutes} min) exceeds reasonable limit ` +
            `(${Math.round(maxLearningTime)} min) for ${contentType} content. ` +
            `A ${Math.round(sourceMinutes)} min ${contentType} video should produce ~${Math.round(sourceMinutes * (maxMultiplier / 2))} min of learning.`,
        ];
      }

      // Warn if learning time is less than source duration (suspicious)
      if (learningTimeMinutes < sourceMinutes * 0.8) {
        return [
          true,
          `Learning time (${learningTimeMinutes} min) is less than source duration ` +
            `(${Math.round(sourceMinutes)} min). This may indicate too few concepts or incorrect calibration.`,
        ];
      }

      return [true, null];
    },

    checkLearningObjectives(concepts: Concept[]): [boolean, string | null] {
      // Filter to tier 2-3 concepts that are NOT mentioned_only
      const tier23Concepts = concepts.filter(
        (c) => (c.tier === 2 || c.tier === 3) && !c.mentioned_only
      );

      if (tier23Concepts.length === 0) {
        // No tier 2-3 learning concepts to validate
        return [true, null];
      }

      // Check that each has at least 1 learning objective
      const missingObjectives = tier23Concepts.filter(
        (c) => !c.learning_objectives || c.learning_objectives.length === 0
      );

      if (missingObjectives.length > 0) {
        const missingNames = missingObjectives.slice(0, 3).map((c) => c.name);
        const moreCount = missingObjectives.length - 3;

        return [
          true, // Pass with warning (objectives are optional enrichments)
          `${missingObjectives.length} tier 2-3 concept(s) missing learning objectives: ` +
            `${missingNames.join(', ')}${moreCount > 0 ? ` and ${moreCount} more` : ''}. ` +
            `Consider adding learning objectives for better assessment generation.`,
        ];
      }

      return [true, null];
    },

    checkAssessmentSpec(concepts: Concept[]): [boolean, string | null] {
      // Check concepts that have assessment_spec
      const conceptsWithSpec = concepts.filter((c) => c.assessment_spec);

      if (conceptsWithSpec.length === 0) {
        // No assessment specs to validate
        return [true, null];
      }

      const invalidSpecs: string[] = [];

      for (const concept of conceptsWithSpec) {
        const bloomLevel = concept.bloom_level;
        if (!bloomLevel || !concept.assessment_spec) continue;

        const appropriateTypes = APPROPRIATE_QUESTION_TYPES[bloomLevel];
        const specTypes = concept.assessment_spec.appropriate_question_types;

        // Check if at least one appropriate type is included
        const hasAppropriateType = specTypes.some((type) =>
          appropriateTypes.includes(type)
        );

        if (!hasAppropriateType) {
          invalidSpecs.push(concept.name);
        }
      }

      if (invalidSpecs.length > 0) {
        const invalidNames = invalidSpecs.slice(0, 3);
        const moreCount = invalidSpecs.length - 3;

        return [
          true, // Pass with warning
          `${invalidSpecs.length} concept(s) have assessment specs with question types ` +
            `not appropriate for their Bloom level: ${invalidNames.join(', ')}` +
            `${moreCount > 0 ? ` and ${moreCount} more` : ''}. ` +
            `Review question types to match cognitive demands.`,
        ];
      }

      return [true, null];
    },

    checkSourceMapping(concepts: Concept[]): [boolean, string | null] {
      // Check concepts that have source_mapping
      const conceptsWithMapping = concepts.filter((c) => c.source_mapping);

      if (conceptsWithMapping.length === 0) {
        // No source mappings to validate
        return [true, null];
      }

      const invalidMappings: string[] = [];

      for (const concept of conceptsWithMapping) {
        const mapping = concept.source_mapping;
        if (!mapping) continue;

        let isValid = true;

        // Validate primary_segment
        if (mapping.primary_segment) {
          const { start_sec, end_sec } = mapping.primary_segment;
          if (start_sec < 0 || end_sec <= start_sec) {
            isValid = false;
          }
        }

        // Validate review_clip
        if (mapping.review_clip) {
          const { start_sec, end_sec } = mapping.review_clip;
          if (start_sec < 0 || end_sec <= start_sec) {
            isValid = false;
          }
        }

        if (!isValid) {
          invalidMappings.push(concept.name);
        }
      }

      if (invalidMappings.length > 0) {
        const invalidNames = invalidMappings.slice(0, 3);
        const moreCount = invalidMappings.length - 3;

        return [
          false, // Fail - invalid timestamps are a data integrity issue
          `${invalidMappings.length} concept(s) have invalid source mapping timestamps ` +
            `(negative or start >= end): ${invalidNames.join(', ')}` +
            `${moreCount > 0 ? ` and ${moreCount} more` : ''}. ` +
            `Fix timestamps to ensure valid video navigation.`,
        ];
      }

      return [true, null];
    },
  };
}

/**
 * Apply validation and update Pass 3 result
 * @param concepts - All concepts
 * @param pass3Result - Pass 3 result to update
 * @param pass1Result - Pass 1 classification result
 * @returns Updated Pass 3 result with validation
 */
export function applyValidation(
  concepts: Concept[],
  pass3Result: Pass3Result,
  pass1Result: Pass1Result
): Pass3Result {
  const validator = createAnalysisValidatorService();
  const validationResults = validator.validate(concepts, pass3Result, pass1Result);

  return {
    ...pass3Result,
    validationResults,
  };
}
