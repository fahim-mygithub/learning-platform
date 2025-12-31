/**
 * Roadmap Architect Service (Pass 3)
 *
 * Builds learning roadmaps using Elaboration Theory with calibrated time estimation.
 * This is the third pass of the three-pass pedagogical analysis architecture.
 *
 * Key responsibilities:
 * - Identify epitome (thesis concept) for Level 0
 * - Build Elaboration Theory hierarchy
 * - Filter mentioned-only concepts from roadmap
 * - Calculate calibrated learning time
 * - Create mastery gates between levels
 *
 * @example
 * ```ts
 * import { createRoadmapArchitectService } from '@/src/lib/roadmap-architect';
 *
 * const service = createRoadmapArchitectService(supabase, aiService);
 * const roadmap = await service.buildRoadmap(projectId, concepts, relationships, pass1Result);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import {
  Concept,
  ConceptRelationship,
  Roadmap,
  RoadmapInsert,
  RoadmapLevel,
  MasteryGate,
  CognitiveType,
} from '@/src/types/database';
import {
  Pass1Result,
  Pass3Result,
  TimeCalibration,
  ValidationResults,
  ElaborationLevel,
  BloomLevel,
} from '@/src/types/three-pass';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for roadmap architect operations
 */
export type RoadmapArchitectErrorCode =
  | 'ARCHITECT_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_CONCEPTS';

/**
 * Custom error class for roadmap architect operations
 */
export class RoadmapArchitectError extends Error {
  code: RoadmapArchitectErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: RoadmapArchitectErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RoadmapArchitectError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Roadmap architect service interface
 */
export interface RoadmapArchitectService {
  /**
   * Build a complete roadmap with elaboration hierarchy
   * @param projectId - Project ID
   * @param concepts - All concepts (will filter mentioned_only)
   * @param relationships - Concept relationships
   * @param pass1Result - Pass 1 classification result
   * @returns Pass 3 result with roadmap data
   */
  buildRoadmap(
    projectId: string,
    concepts: Concept[],
    relationships: ConceptRelationship[],
    pass1Result: Pass1Result
  ): Promise<Pass3Result>;

  /**
   * Store roadmap in database
   * @param projectId - Project ID
   * @param pass3Result - Pass 3 result
   * @param title - Optional roadmap title
   * @returns Stored roadmap
   */
  storeRoadmap(
    projectId: string,
    pass3Result: Pass3Result,
    title?: string
  ): Promise<Roadmap>;

  /**
   * Identify the epitome (thesis) concept
   * @param concepts - Tier 3 concepts
   * @param thesisStatement - Thesis from Pass 1
   * @returns Epitome concept ID or null
   */
  identifyEpitome(
    concepts: Concept[],
    thesisStatement: string | null
  ): Promise<string | null>;

  /**
   * Calculate calibrated learning time
   * @param pass1Result - Pass 1 result with mode multiplier
   * @param concepts - Learning objective concepts (not mentioned_only)
   * @returns Time calibration details
   */
  calculateCalibratedTime(
    pass1Result: Pass1Result,
    concepts: Concept[]
  ): TimeCalibration;
}

/**
 * System prompt for epitome identification
 */
const EPITOME_IDENTIFICATION_PROMPT = `You are an expert educational analyst applying Elaboration Theory. Identify the EPITOME concept - the single concept that represents the THESIS of the entire content.

CRITICAL RULES FOR EPITOME IDENTIFICATION:

1. THESIS vs ELABORATION:
   - The epitome is the THESIS (umbrella claim), NOT an example or elaboration
   - "Three ways X can happen" is the epitome/thesis
   - "Way 1: Big Rip" is an elaboration, NOT the epitome
   - If content covers multiple scenarios/types/ways, the epitome is the UMBRELLA concept

2. ENUMERATED CONTENT:
   - If thesis is "N ways/types/scenarios of X", the epitome IS that umbrella statement
   - The N individual items are PEER elaborations at Level 1, NOT candidates for epitome
   - Do NOT select one enumerated item as the epitome

3. MATCHING PASS 1 THESIS:
   - If a thesis statement is provided, the epitome MUST closely match or represent that thesis
   - Do NOT select a sub-component or one example as the epitome
   - The epitome should be the most general, inclusive concept

4. ELABORATION THEORY:
   - Level 0 (Epitome) = The "big picture" or thesis summarizing the whole
   - Level 1+ = Elaborations that provide detail on the epitome

Return a JSON object:
{
  "epitome_concept_name": "Name of the epitome concept (must match a provided concept)",
  "reasoning": "Brief explanation of why this represents the thesis, not just an elaboration"
}

If no clear epitome exists (no umbrella concept), return:
{
  "epitome_concept_name": null,
  "reasoning": "Explanation of why no epitome was identified"
}`;

/**
 * Difficulty-based time estimates (minutes)
 */
const DIFFICULTY_BASE_TIME: Record<string, number> = {
  easy: 5, // difficulty 1-3
  medium: 10, // difficulty 4-6
  hard: 15, // difficulty 7-8
  expert: 20, // difficulty 9-10
};

/**
 * Cognitive type time modifiers
 */
const COGNITIVE_TYPE_MODIFIER: Record<CognitiveType, number> = {
  declarative: 1.0,
  conceptual: 1.2,
  procedural: 1.5,
  conditional: 1.3,
  metacognitive: 1.4,
};

/**
 * Get density modifier based on concepts per minute
 */
function getDensityModifier(
  conceptCount: number,
  durationSeconds: number | null
): number {
  if (!durationSeconds || durationSeconds === 0) {
    return 1.0; // Default to medium density
  }

  const durationMinutes = durationSeconds / 60;
  const conceptsPerMinute = conceptCount / durationMinutes;

  if (conceptsPerMinute < 0.5) {
    return 0.8; // Low density
  } else if (conceptsPerMinute < 1.5) {
    return 1.0; // Medium density
  } else {
    return 1.3; // High density (adjusted from 1.5 to be more reasonable)
  }
}

/**
 * Get knowledge type factor based on cognitive type distribution
 */
function getKnowledgeTypeFactor(concepts: Concept[]): number {
  if (concepts.length === 0) return 1.0;

  const proceduralCount = concepts.filter(
    (c) => c.cognitive_type === 'procedural'
  ).length;
  const proceduralRatio = proceduralCount / concepts.length;

  if (proceduralRatio > 0.5) {
    return 1.5; // Majority procedural
  } else if (proceduralRatio > 0.25) {
    return 1.2; // Significant procedural
  } else {
    return 1.0; // Mostly conceptual/declarative
  }
}

/**
 * Calculate time for a single concept
 */
function calculateConceptTime(concept: Concept): number {
  const difficulty = concept.difficulty ?? 5;
  let baseTime: number;

  if (difficulty <= 3) {
    baseTime = DIFFICULTY_BASE_TIME.easy;
  } else if (difficulty <= 6) {
    baseTime = DIFFICULTY_BASE_TIME.medium;
  } else if (difficulty <= 8) {
    baseTime = DIFFICULTY_BASE_TIME.hard;
  } else {
    baseTime = DIFFICULTY_BASE_TIME.expert;
  }

  const modifier = COGNITIVE_TYPE_MODIFIER[concept.cognitive_type] || 1.0;
  return Math.round(baseTime * modifier);
}

/**
 * Organize concepts into levels by prerequisite depth
 */
function organizeLevels(
  concepts: Concept[],
  relationships: ConceptRelationship[],
  epitomeId: string | null
): ElaborationLevel[] {
  if (concepts.length === 0) {
    return [];
  }

  // Build prerequisite map
  const prereqMap = new Map<string, Set<string>>();
  for (const concept of concepts) {
    prereqMap.set(concept.id, new Set());
  }

  for (const rel of relationships) {
    if (rel.relationship_type === 'prerequisite') {
      const prereqs = prereqMap.get(rel.to_concept_id);
      if (prereqs && prereqMap.has(rel.from_concept_id)) {
        prereqs.add(rel.from_concept_id);
      }
    }
  }

  // Calculate levels
  const conceptLevel = new Map<string, number>();
  const conceptMap = new Map<string, Concept>();
  for (const concept of concepts) {
    conceptMap.set(concept.id, concept);
  }

  function calculateLevel(conceptId: string, visited: Set<string> = new Set()): number {
    if (conceptLevel.has(conceptId)) {
      return conceptLevel.get(conceptId)!;
    }

    if (visited.has(conceptId)) {
      return 1; // Break circular dependency
    }
    visited.add(conceptId);

    const prereqs = prereqMap.get(conceptId);
    if (!prereqs || prereqs.size === 0) {
      conceptLevel.set(conceptId, 1);
      return 1;
    }

    let maxPrereqLevel = 0;
    for (const prereqId of prereqs) {
      const prereqLevelValue = calculateLevel(prereqId, new Set(visited));
      maxPrereqLevel = Math.max(maxPrereqLevel, prereqLevelValue);
    }

    const level = maxPrereqLevel + 1;
    conceptLevel.set(conceptId, level);
    return level;
  }

  for (const concept of concepts) {
    calculateLevel(concept.id);
  }

  // Group by level
  const levelGroups = new Map<number, string[]>();
  for (const [conceptId, level] of conceptLevel) {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(conceptId);
  }

  // Create ElaborationLevel objects
  const levels: ElaborationLevel[] = [];
  const sortedLevelNumbers = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  // If we have an epitome, add Level 0
  if (epitomeId && conceptMap.has(epitomeId)) {
    const epitomeConcept = conceptMap.get(epitomeId)!;
    levels.push({
      level: 0,
      title: 'Core Understanding (Epitome)',
      concept_ids: [epitomeId],
      estimated_minutes: calculateConceptTime(epitomeConcept),
      bloom_target: (epitomeConcept.bloom_level as BloomLevel) || 'understand',
    });

    // Remove epitome from other levels
    for (const conceptIds of levelGroups.values()) {
      const idx = conceptIds.indexOf(epitomeId);
      if (idx > -1) {
        conceptIds.splice(idx, 1);
      }
    }
  }

  // Add remaining levels
  for (const levelNum of sortedLevelNumbers) {
    const conceptIds = levelGroups.get(levelNum)!.filter((id) => id !== epitomeId);

    if (conceptIds.length === 0) continue;

    let estimatedMinutes = 0;
    for (const conceptId of conceptIds) {
      const concept = conceptMap.get(conceptId);
      if (concept) {
        estimatedMinutes += calculateConceptTime(concept);
      }
    }

    // Determine level title
    let title: string;
    const adjustedLevel = epitomeId ? levelNum : levelNum;
    if (adjustedLevel === 1) {
      title = 'Foundations';
    } else if (levelNum === sortedLevelNumbers[sortedLevelNumbers.length - 1]) {
      title = 'Advanced Topics';
    } else {
      title = `Level ${adjustedLevel}`;
    }

    levels.push({
      level: epitomeId ? levelNum : levelNum,
      title,
      concept_ids: conceptIds,
      estimated_minutes: estimatedMinutes,
    });
  }

  return levels;
}

/**
 * Create mastery gates for levels
 */
function createMasteryGates(levels: ElaborationLevel[]): MasteryGate[] {
  return levels
    .filter((level) => level.level > 0) // No gate before epitome
    .map((level) => ({
      after_level: level.level,
      required_score: 0.8,
      quiz_concept_ids: level.concept_ids,
    }));
}

/**
 * Create roadmap architect service instance
 */
export function createRoadmapArchitectService(
  supabase: SupabaseClient,
  aiService: AIService
): RoadmapArchitectService {
  return {
    async buildRoadmap(
      projectId: string,
      concepts: Concept[],
      relationships: ConceptRelationship[],
      pass1Result: Pass1Result
    ): Promise<Pass3Result> {
      const logId = `roadmap-${projectId}`;

      logInput('roadmap_architect', logId, {
        total_concepts: concepts.length,
        relationships_count: relationships.length,
        content_type: pass1Result.contentType,
      });

      const timer = startTimer();

      // Filter out mentioned_only concepts
      const learningConcepts = concepts.filter((c) => !c.mentioned_only);

      if (learningConcepts.length === 0) {
        throw new RoadmapArchitectError(
          'No learning concepts found (all marked as mentioned_only)',
          'NO_CONCEPTS'
        );
      }

      // Identify epitome
      const epitomeId = await this.identifyEpitome(
        learningConcepts.filter((c) => c.tier === 3),
        pass1Result.thesisStatement
      );

      // Calculate calibrated time
      const timeCalibration = this.calculateCalibratedTime(pass1Result, learningConcepts);

      // Build levels
      const levels = organizeLevels(learningConcepts, relationships, epitomeId);

      // Extract RST relationships
      const rstRelationships = relationships
        .filter((r) =>
          ['elaboration_of', 'evidence_for', 'example_of', 'definition_of'].includes(
            r.relationship_type
          )
        )
        .map((r) => ({
          from_concept_id: r.from_concept_id,
          to_concept_id: r.to_concept_id,
          relationship_type: r.relationship_type as Pass3Result['relationships'][0]['relationship_type'],
          strength: r.strength,
        }));

      // Validation results (placeholder - will be set by validator)
      const validationResults: ValidationResults = {
        proportionality_passed: true,
        bloom_ceiling_passed: true,
        time_sanity_passed: true,
        warnings: [],
      };

      const result: Pass3Result = {
        epitomeConceptId: epitomeId,
        levels,
        relationships: rstRelationships,
        timeCalibration,
        validationResults,
      };

      logOutput(
        'roadmap_architect',
        logId,
        {
          epitome_found: epitomeId !== null,
          levels_count: levels.length,
          total_learning_time: timeCalibration.calculated_learning_time_minutes,
          filtered_mentioned_only: concepts.length - learningConcepts.length,
        },
        timer.stop()
      );

      return result;
    },

    async storeRoadmap(
      projectId: string,
      pass3Result: Pass3Result,
      title?: string
    ): Promise<Roadmap> {
      // Convert ElaborationLevel to RoadmapLevel
      const roadmapLevels: RoadmapLevel[] = pass3Result.levels.map((level) => ({
        level: level.level,
        title: level.title,
        concept_ids: level.concept_ids,
        estimated_minutes: level.estimated_minutes,
      }));

      const totalMinutes = roadmapLevels.reduce(
        (sum, level) => sum + level.estimated_minutes,
        0
      );

      const masteryGates = createMasteryGates(pass3Result.levels);

      const roadmapData: RoadmapInsert = {
        project_id: projectId,
        title: title || 'Learning Roadmap',
        levels: roadmapLevels,
        total_estimated_minutes: totalMinutes,
        mastery_gates: masteryGates,
        status: 'draft',
        epitome_concept_id: pass3Result.epitomeConceptId,
        time_calibration: pass3Result.timeCalibration,
        validation_results: pass3Result.validationResults,
      };

      const { data, error } = await supabase
        .from('roadmaps')
        .insert(roadmapData)
        .select()
        .single();

      if (error) {
        throw new RoadmapArchitectError(
          `Failed to store roadmap: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      return data as Roadmap;
    },

    async identifyEpitome(
      tier3Concepts: Concept[],
      thesisStatement: string | null
    ): Promise<string | null> {
      if (tier3Concepts.length === 0) {
        return null;
      }

      if (tier3Concepts.length === 1) {
        return tier3Concepts[0].id;
      }

      /**
       * Find the best fallback epitome when AI selection fails.
       * Prefers concepts with thesis-like names (overview, introduction, scenarios)
       * or concepts whose names appear in the thesis statement.
       */
      const findBestFallback = (): Concept => {
        // Keywords indicating umbrella/thesis concepts
        const umbrellaKeywords = [
          'overview',
          'introduction',
          'scenarios',
          'types',
          'ways',
          'methods',
          'approaches',
          'principles',
          'fundamentals',
          'theory',
          'framework',
        ];

        // If thesis provided, prefer concepts whose name appears in thesis
        if (thesisStatement) {
          const thesisLower = thesisStatement.toLowerCase();
          const thesisMatch = tier3Concepts.find((c) =>
            thesisLower.includes(c.name.toLowerCase())
          );
          if (thesisMatch) {
            return thesisMatch;
          }
        }

        // Look for concepts with umbrella keywords in their name
        const umbrellaMatch = tier3Concepts.find((c) => {
          const nameLower = c.name.toLowerCase();
          return umbrellaKeywords.some((keyword) => nameLower.includes(keyword));
        });
        if (umbrellaMatch) {
          return umbrellaMatch;
        }

        // Default to first concept
        return tier3Concepts[0];
      };

      // Use AI to identify the best epitome
      try {
        const conceptList = tier3Concepts
          .map((c) => `- ${c.name}: ${c.definition}`)
          .join('\n');

        const response = await sendStructuredMessage<{
          epitome_concept_name: string | null;
          reasoning: string;
        }>(aiService, {
          systemPrompt: EPITOME_IDENTIFICATION_PROMPT,
          userMessage: `${thesisStatement ? `Thesis: "${thesisStatement}"\n\n` : ''}Tier 3 Concepts:\n${conceptList}`,
          options: {
            model: 'claude-haiku',
            temperature: 0.2,
          },
        });

        if (response.data.epitome_concept_name) {
          // Try exact name match first
          let match = tier3Concepts.find(
            (c) =>
              c.name.toLowerCase() ===
              response.data.epitome_concept_name!.toLowerCase()
          );

          // If exact match failed, try partial matching
          if (!match) {
            const responseName = response.data.epitome_concept_name.toLowerCase();
            match = tier3Concepts.find(
              (c) =>
                c.name.toLowerCase().includes(responseName) ||
                responseName.includes(c.name.toLowerCase())
            );
          }

          // If still no match but thesis provided, try finding concept that best matches thesis
          if (!match && thesisStatement) {
            const thesisLower = thesisStatement.toLowerCase();
            match = tier3Concepts.find(
              (c) =>
                thesisLower.includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes('scenario') ||
                c.name.toLowerCase().includes('overview') ||
                c.name.toLowerCase().includes('introduction')
            );
          }

          if (match) {
            return match.id;
          }
        }

        // Use improved fallback
        return findBestFallback().id;
      } catch {
        // Use improved fallback
        return findBestFallback().id;
      }
    },

    calculateCalibratedTime(
      pass1Result: Pass1Result,
      concepts: Concept[]
    ): TimeCalibration {
      const modeMultiplier = pass1Result.modeMultiplier;
      const densityModifier = getDensityModifier(
        concepts.length,
        pass1Result.sourceDurationSeconds
      );
      const knowledgeTypeFactor = getKnowledgeTypeFactor(concepts);

      // Calculate base time from source duration or concept estimates
      let baseTimeMinutes: number;
      if (pass1Result.sourceDurationSeconds) {
        baseTimeMinutes = pass1Result.sourceDurationSeconds / 60;
      } else {
        // Sum concept times if no source duration
        baseTimeMinutes = concepts.reduce(
          (sum, c) => sum + calculateConceptTime(c),
          0
        );
      }

      const calculatedTime = Math.round(
        baseTimeMinutes * modeMultiplier * densityModifier * knowledgeTypeFactor
      );

      return {
        mode_multiplier: modeMultiplier,
        density_modifier: densityModifier,
        knowledge_type_factor: knowledgeTypeFactor,
        source_duration_seconds: pass1Result.sourceDurationSeconds,
        calculated_learning_time_minutes: calculatedTime,
      };
    },
  };
}
