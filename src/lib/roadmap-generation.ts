/**
 * Roadmap Generation Service
 *
 * Generates sequenced learning paths from knowledge graphs with levels, time estimates,
 * and mastery gates.
 *
 * Features:
 * - Level organization based on prerequisite depth
 * - Time estimation by difficulty and cognitive type
 * - Mastery gates after each level (80% required)
 * - Database storage via Supabase
 *
 * @example
 * ```ts
 * import { createRoadmapGenerationService } from '@/src/lib/roadmap-generation';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const service = createRoadmapGenerationService(supabase);
 *
 * // Generate roadmap for a project
 * const roadmap = await service.generateRoadmap(projectId, 'My Learning Path');
 *
 * // Get existing roadmap
 * const existingRoadmap = await service.getRoadmap(projectId);
 *
 * // Update roadmap status
 * await service.updateRoadmapStatus(roadmapId, 'active');
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  ConceptRelationship,
  Roadmap,
  RoadmapInsert,
  RoadmapLevel,
  MasteryGate,
  RoadmapStatus,
  CognitiveType,
} from '@/src/types/database';
import {
  createKnowledgeGraphService,
  KnowledgeGraphService,
} from './knowledge-graph-service';

/**
 * Error codes for roadmap generation operations
 */
export type RoadmapGenerationErrorCode =
  | 'API_KEY_MISSING'
  | 'GENERATION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'ROADMAP_NOT_FOUND';

/**
 * Custom error class for roadmap generation operations
 */
export class RoadmapGenerationError extends Error {
  code: RoadmapGenerationErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: RoadmapGenerationErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RoadmapGenerationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Base time in minutes by difficulty category
 */
export const DIFFICULTY_BASE_TIME = {
  easy: 5, // difficulty 1-3
  medium: 10, // difficulty 4-6
  hard: 15, // difficulty 7-8
  expert: 20, // difficulty 9-10
} as const;

/**
 * Time multiplier by cognitive type
 */
export const COGNITIVE_TYPE_MODIFIER: Record<CognitiveType, number> = {
  declarative: 1.0,
  conceptual: 1.2,
  procedural: 1.5,
  conditional: 1.3,
  metacognitive: 1.4,
};

/**
 * Calculate time estimate for a single concept
 *
 * @param concept - The concept to calculate time for
 * @returns Estimated time in minutes
 */
export function calculateConceptTime(concept: Concept): number {
  // Get base time from difficulty
  const difficulty = concept.difficulty ?? 5; // Default to medium if null
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

  // Apply cognitive type modifier
  const modifier = COGNITIVE_TYPE_MODIFIER[concept.cognitive_type];

  // Return rounded time
  return Math.round(baseTime * modifier);
}

/**
 * Roadmap generation service interface
 */
export interface RoadmapGenerationService {
  /**
   * Generate a roadmap for a project
   * @param projectId - ID of the project
   * @param title - Optional title for the roadmap
   * @returns The generated roadmap
   */
  generateRoadmap(projectId: string, title?: string): Promise<Roadmap>;

  /**
   * Get the roadmap for a project
   * @param projectId - ID of the project
   * @returns The roadmap or null if not found
   */
  getRoadmap(projectId: string): Promise<Roadmap | null>;

  /**
   * Update the status of a roadmap
   * @param roadmapId - ID of the roadmap
   * @param status - New status
   * @returns The updated roadmap
   */
  updateRoadmapStatus(
    roadmapId: string,
    status: RoadmapStatus
  ): Promise<Roadmap>;

  /**
   * Recalculate time estimates for a roadmap
   * @param roadmapId - ID of the roadmap
   * @returns The updated roadmap with new estimates
   */
  recalculateEstimates(roadmapId: string): Promise<Roadmap>;
}

/**
 * Organize concepts into levels by prerequisite depth
 *
 * @param concepts - Array of concepts in topological order
 * @param relationships - Array of prerequisite relationships
 * @returns Array of roadmap levels
 */
function organizeLevels(
  concepts: Concept[],
  relationships: ConceptRelationship[]
): RoadmapLevel[] {
  if (concepts.length === 0) {
    return [];
  }

  // Build prerequisite map: conceptId -> set of prerequisite concept IDs
  const prereqMap = new Map<string, Set<string>>();
  for (const concept of concepts) {
    prereqMap.set(concept.id, new Set());
  }

  // Only consider prerequisite relationships
  for (const rel of relationships) {
    if (rel.relationship_type === 'prerequisite') {
      const prereqs = prereqMap.get(rel.to_concept_id);
      if (prereqs) {
        prereqs.add(rel.from_concept_id);
      }
    }
  }

  // Assign levels based on prerequisite depth
  const conceptLevel = new Map<string, number>();
  const conceptMap = new Map<string, Concept>();
  for (const concept of concepts) {
    conceptMap.set(concept.id, concept);
  }

  // Calculate level for each concept
  function calculateLevel(conceptId: string): number {
    if (conceptLevel.has(conceptId)) {
      return conceptLevel.get(conceptId)!;
    }

    const prereqs = prereqMap.get(conceptId);
    if (!prereqs || prereqs.size === 0) {
      conceptLevel.set(conceptId, 1);
      return 1;
    }

    let maxPrereqLevel = 0;
    for (const prereqId of prereqs) {
      const prereqLevelValue = calculateLevel(prereqId);
      maxPrereqLevel = Math.max(maxPrereqLevel, prereqLevelValue);
    }

    const level = maxPrereqLevel + 1;
    conceptLevel.set(conceptId, level);
    return level;
  }

  // Calculate levels for all concepts
  for (const concept of concepts) {
    calculateLevel(concept.id);
  }

  // Group concepts by level
  const levelGroups = new Map<number, string[]>();
  for (const [conceptId, level] of conceptLevel) {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(conceptId);
  }

  // Create RoadmapLevel objects
  const levels: RoadmapLevel[] = [];
  const sortedLevelNumbers = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  for (const levelNum of sortedLevelNumbers) {
    const conceptIds = levelGroups.get(levelNum)!;

    // Calculate estimated time for this level
    let estimatedMinutes = 0;
    for (const conceptId of conceptIds) {
      const concept = conceptMap.get(conceptId);
      if (concept) {
        estimatedMinutes += calculateConceptTime(concept);
      }
    }

    // Generate level title
    let title: string;
    if (levelNum === 1) {
      title = 'Foundations';
    } else if (levelNum === sortedLevelNumbers.length) {
      title = 'Advanced Topics';
    } else {
      title = `Level ${levelNum}`;
    }

    levels.push({
      level: levelNum,
      title,
      concept_ids: conceptIds,
      estimated_minutes: estimatedMinutes,
    });
  }

  return levels;
}

/**
 * Create mastery gates for each level
 *
 * @param levels - Array of roadmap levels
 * @returns Array of mastery gates
 */
function createMasteryGates(levels: RoadmapLevel[]): MasteryGate[] {
  return levels.map((level) => ({
    after_level: level.level,
    required_score: 0.8, // 80% mastery required
    quiz_concept_ids: level.concept_ids,
  }));
}

/**
 * Create a roadmap generation service instance
 *
 * @param supabase - Supabase client instance
 * @param knowledgeGraphService - Optional knowledge graph service instance
 * @returns Roadmap generation service instance
 * @throws RoadmapGenerationError if API key is missing
 */
export function createRoadmapGenerationService(
  supabase: SupabaseClient,
  knowledgeGraphService?: KnowledgeGraphService
): RoadmapGenerationService {
  // Create or use provided knowledge graph service
  let kgService: KnowledgeGraphService;
  try {
    kgService = knowledgeGraphService || createKnowledgeGraphService(supabase);
  } catch (error) {
    throw new RoadmapGenerationError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async generateRoadmap(
      projectId: string,
      title?: string
    ): Promise<Roadmap> {
      try {
        // Get topologically sorted concepts from knowledge graph
        const concepts = await kgService.getTopologicalOrder(projectId);

        // Get relationships for level organization
        const relationships = await kgService.getProjectRelationships(projectId);

        // Organize concepts into levels
        const levels = organizeLevels(concepts, relationships);

        // Calculate total estimated time
        const totalEstimatedMinutes = levels.reduce(
          (sum, level) => sum + level.estimated_minutes,
          0
        );

        // Create mastery gates
        const masteryGates = createMasteryGates(levels);

        // Create roadmap insert data
        const roadmapData: RoadmapInsert = {
          project_id: projectId,
          title: title || 'Learning Roadmap',
          levels,
          total_estimated_minutes: totalEstimatedMinutes,
          mastery_gates: masteryGates,
          status: 'draft',
        };

        // Insert roadmap into database
        const { data, error } = await supabase
          .from('roadmaps')
          .insert(roadmapData)
          .select()
          .single();

        if (error) {
          throw new RoadmapGenerationError(
            `Failed to store roadmap: ${error.message}`,
            'DATABASE_ERROR',
            { projectId }
          );
        }

        return data as Roadmap;
      } catch (error) {
        if (error instanceof RoadmapGenerationError) {
          throw error;
        }
        throw new RoadmapGenerationError(
          `Failed to generate roadmap: ${(error as Error).message}`,
          'GENERATION_FAILED',
          { projectId }
        );
      }
    },

    async getRoadmap(projectId: string): Promise<Roadmap | null> {
      const { data, error } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) {
        // Return null for "not found" errors
        if (error.code === 'PGRST116') {
          return null;
        }
        // Return null for other query errors as well (roadmap doesn't exist)
        return null;
      }

      return data as Roadmap;
    },

    async updateRoadmapStatus(
      roadmapId: string,
      status: RoadmapStatus
    ): Promise<Roadmap> {
      const { data, error } = await supabase
        .from('roadmaps')
        .update({ status })
        .eq('id', roadmapId)
        .select()
        .single();

      if (error) {
        throw new RoadmapGenerationError(
          `Failed to update roadmap status: ${error.message}`,
          'DATABASE_ERROR',
          { roadmapId, status }
        );
      }

      if (!data) {
        throw new RoadmapGenerationError(
          `Roadmap not found: ${roadmapId}`,
          'ROADMAP_NOT_FOUND',
          { roadmapId }
        );
      }

      return data as Roadmap;
    },

    async recalculateEstimates(roadmapId: string): Promise<Roadmap> {
      // Get existing roadmap
      const { data: roadmap, error: fetchError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .single();

      if (fetchError || !roadmap) {
        throw new RoadmapGenerationError(
          `Roadmap not found: ${roadmapId}`,
          'ROADMAP_NOT_FOUND',
          { roadmapId }
        );
      }

      const typedRoadmap = roadmap as Roadmap;

      // Get all concept IDs from levels
      const allConceptIds = typedRoadmap.levels.flatMap(
        (level) => level.concept_ids
      );

      if (allConceptIds.length === 0) {
        return typedRoadmap;
      }

      // Fetch concepts from database
      const { data: concepts, error: conceptsError } = await supabase
        .from('concepts')
        .select('*')
        .in('id', allConceptIds);

      if (conceptsError) {
        throw new RoadmapGenerationError(
          `Failed to fetch concepts: ${conceptsError.message}`,
          'DATABASE_ERROR',
          { roadmapId }
        );
      }

      const conceptMap = new Map<string, Concept>();
      for (const concept of (concepts as Concept[]) || []) {
        conceptMap.set(concept.id, concept);
      }

      // Recalculate time estimates for each level
      const updatedLevels = typedRoadmap.levels.map((level) => {
        let estimatedMinutes = 0;
        for (const conceptId of level.concept_ids) {
          const concept = conceptMap.get(conceptId);
          if (concept) {
            estimatedMinutes += calculateConceptTime(concept);
          }
        }
        return { ...level, estimated_minutes: estimatedMinutes };
      });

      // Calculate new total
      const totalEstimatedMinutes = updatedLevels.reduce(
        (sum, level) => sum + level.estimated_minutes,
        0
      );

      // Update roadmap in database
      const { data: updated, error: updateError } = await supabase
        .from('roadmaps')
        .update({
          levels: updatedLevels,
          total_estimated_minutes: totalEstimatedMinutes,
        })
        .eq('id', roadmapId)
        .select()
        .single();

      if (updateError) {
        throw new RoadmapGenerationError(
          `Failed to update roadmap: ${updateError.message}`,
          'DATABASE_ERROR',
          { roadmapId }
        );
      }

      return updated as Roadmap;
    },
  };
}

/**
 * Get the default roadmap generation service using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Roadmap generation service instance
 * @throws RoadmapGenerationError if EXPO_PUBLIC_ANTHROPIC_API_KEY is not set
 */
export function getDefaultRoadmapGenerationService(
  supabase: SupabaseClient
): RoadmapGenerationService {
  return createRoadmapGenerationService(supabase);
}
