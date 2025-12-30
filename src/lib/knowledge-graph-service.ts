/**
 * Knowledge Graph Service
 *
 * Builds prerequisite and relationship graphs from extracted concepts using Claude API.
 * Features:
 * - AI-powered relationship identification between concepts
 * - Cycle detection using DFS
 * - Topological sort using Kahn's algorithm for learning order
 * - Prerequisites/dependents traversal
 * - Database storage via Supabase
 *
 * @example
 * ```ts
 * import { createKnowledgeGraphService } from '@/src/lib/knowledge-graph-service';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const service = createKnowledgeGraphService(supabase);
 *
 * // Build knowledge graph from concepts
 * const relationships = await service.buildKnowledgeGraph(projectId, concepts);
 *
 * // Get topologically sorted concepts for learning order
 * const orderedConcepts = await service.getTopologicalOrder(projectId);
 *
 * // Check for circular dependencies
 * const hasCycle = await service.hasCircularDependency(projectId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  ConceptRelationship,
  ConceptRelationshipInsert,
  RelationshipType,
} from '@/src/types/database';
import {
  createAIService,
  sendStructuredMessage,
  AIService,
} from './ai-service';

/**
 * Error codes for knowledge graph operations
 */
export type KnowledgeGraphErrorCode =
  | 'API_KEY_MISSING'
  | 'GRAPH_BUILD_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'CIRCULAR_DEPENDENCY';

/**
 * Custom error class for knowledge graph operations
 */
export class KnowledgeGraphError extends Error {
  code: KnowledgeGraphErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: KnowledgeGraphErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'KnowledgeGraphError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Identified relationship from AI before database storage
 */
export interface IdentifiedRelationship {
  from_concept_name: string;
  to_concept_name: string;
  relationship_type: RelationshipType;
  strength: number; // 0.0-1.0
}

/**
 * Valid relationship types
 */
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'prerequisite',
  'causal',
  'taxonomic',
  'temporal',
  'contrasts_with',
];

/**
 * Knowledge graph service interface
 */
export interface KnowledgeGraphService {
  /**
   * Build relationships for project concepts using AI
   * @param projectId - ID of the project
   * @param concepts - Array of concepts to analyze
   * @returns Array of created relationships
   */
  buildKnowledgeGraph(
    projectId: string,
    concepts: Concept[]
  ): Promise<ConceptRelationship[]>;

  /**
   * Get all relationships for a project
   * @param projectId - ID of the project
   * @returns Array of relationships
   */
  getProjectRelationships(projectId: string): Promise<ConceptRelationship[]>;

  /**
   * Get prerequisites for a specific concept
   * @param conceptId - ID of the concept
   * @returns Array of prerequisite concepts
   */
  getPrerequisites(conceptId: string): Promise<Concept[]>;

  /**
   * Get concepts that depend on this concept
   * @param conceptId - ID of the concept
   * @returns Array of dependent concepts
   */
  getDependents(conceptId: string): Promise<Concept[]>;

  /**
   * Get topologically sorted concepts (for learning order)
   * @param projectId - ID of the project
   * @returns Array of concepts in learning order
   */
  getTopologicalOrder(projectId: string): Promise<Concept[]>;

  /**
   * Check for circular dependencies
   * @param projectId - ID of the project
   * @returns True if circular dependency exists
   */
  hasCircularDependency(projectId: string): Promise<boolean>;
}

/**
 * Validate an identified relationship
 *
 * @param relationship - Relationship to validate
 * @throws KnowledgeGraphError if validation fails
 */
export function validateIdentifiedRelationship(
  relationship: IdentifiedRelationship
): void {
  // Validate from_concept_name is non-empty
  if (!relationship.from_concept_name || relationship.from_concept_name.trim() === '') {
    throw new KnowledgeGraphError(
      'from_concept_name cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  // Validate to_concept_name is non-empty
  if (!relationship.to_concept_name || relationship.to_concept_name.trim() === '') {
    throw new KnowledgeGraphError(
      'to_concept_name cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  // Validate relationship type
  if (!RELATIONSHIP_TYPES.includes(relationship.relationship_type)) {
    throw new KnowledgeGraphError(
      `Invalid relationship type: ${relationship.relationship_type}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate strength is 0.0-1.0
  if (relationship.strength < 0.0 || relationship.strength > 1.0) {
    throw new KnowledgeGraphError(
      `Strength must be between 0.0 and 1.0, got ${relationship.strength}`,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * System prompt for relationship identification
 */
const RELATIONSHIP_IDENTIFICATION_SYSTEM_PROMPT = `You are an expert at analyzing relationships between educational concepts. Your task is to identify meaningful relationships between the provided concepts.

For each relationship you identify, specify:
1. **from_concept_name**: The name of the source concept (must match exactly)
2. **to_concept_name**: The name of the target concept (must match exactly)
3. **relationship_type**: One of the following types:
   - "prerequisite": Must understand the source concept before the target concept (e.g., "Variables" is prerequisite for "Functions")
   - "causal": The source concept causes or leads to the target concept (e.g., "Bug" causes "Error")
   - "taxonomic": The source is a type of the target, or the target contains the source (e.g., "Integer" is taxonomic to "Number")
   - "temporal": The source comes before the target in a sequence or timeline (e.g., "Planning" is temporal to "Implementation")
   - "contrasts_with": The source and target are often confused or contrasted (e.g., "Iteration" contrasts_with "Recursion")
4. **strength**: A confidence score from 0.0 to 1.0 indicating how strong the relationship is

Return a JSON array of relationships. Example:
[
  {
    "from_concept_name": "Variables",
    "to_concept_name": "Functions",
    "relationship_type": "prerequisite",
    "strength": 0.9
  },
  {
    "from_concept_name": "For Loop",
    "to_concept_name": "While Loop",
    "relationship_type": "contrasts_with",
    "strength": 0.7
  }
]

Important guidelines:
- Only identify relationships between concepts in the provided list
- Use exact concept names from the list
- Focus on meaningful educational relationships
- Avoid trivial or weak relationships (strength < 0.3)
- Prerequisite relationships are the most important for learning order
- A concept should not be related to itself`;

/**
 * Build user message for relationship identification
 */
function buildUserMessage(concepts: Concept[]): string {
  let message = 'Identify relationships between the following concepts:\n\n';

  concepts.forEach((concept, i) => {
    message += `${i + 1}. **${concept.name}**: ${concept.definition}\n`;
    if (concept.key_points && concept.key_points.length > 0) {
      message += `   Key points: ${concept.key_points.join(', ')}\n`;
    }
  });

  message += '\nReturn a JSON array of relationships between these concepts.';

  return message;
}

/**
 * Detect cycles in a directed graph using DFS
 *
 * @param adjacencyList - Map of node to its outgoing edges
 * @returns True if a cycle exists
 */
function detectCycleDFS(adjacencyList: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      // If neighbor is in recursion stack, we found a cycle
      if (recursionStack.has(neighbor)) {
        return true;
      }

      // If neighbor not visited, continue DFS
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  // Check all nodes (handles disconnected components)
  for (const node of adjacencyList.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Perform topological sort using Kahn's algorithm
 *
 * @param adjacencyList - Map of node to its outgoing edges (prerequisite -> dependent)
 * @param allNodes - Set of all node IDs
 * @returns Sorted node IDs or null if cycle exists
 */
function topologicalSortKahn(
  adjacencyList: Map<string, string[]>,
  allNodes: Set<string>
): string[] | null {
  // Calculate in-degrees
  const inDegree = new Map<string, number>();
  for (const node of allNodes) {
    inDegree.set(node, 0);
  }

  for (const neighbors of adjacencyList.values()) {
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    }
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    // Reduce in-degree of neighbors
    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If result doesn't contain all nodes, there's a cycle
  if (result.length !== allNodes.size) {
    return null;
  }

  return result;
}

/**
 * Build adjacency list from relationships (for prerequisite relationships only)
 *
 * @param relationships - Array of relationships
 * @returns Map of from_concept_id to array of to_concept_ids
 */
function buildAdjacencyList(
  relationships: ConceptRelationship[]
): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>();

  // Only consider prerequisite relationships for ordering
  const prerequisiteRelationships = relationships.filter(
    (r) => r.relationship_type === 'prerequisite'
  );

  for (const rel of prerequisiteRelationships) {
    if (!adjacencyList.has(rel.from_concept_id)) {
      adjacencyList.set(rel.from_concept_id, []);
    }
    adjacencyList.get(rel.from_concept_id)!.push(rel.to_concept_id);
  }

  return adjacencyList;
}

/**
 * Create a knowledge graph service instance
 *
 * @param supabase - Supabase client instance
 * @param aiService - Optional AI service instance (uses default if not provided)
 * @returns Knowledge graph service instance
 * @throws KnowledgeGraphError if API key is missing
 */
export function createKnowledgeGraphService(
  supabase: SupabaseClient,
  aiService?: AIService
): KnowledgeGraphService {
  // Create or use provided AI service
  let service: AIService;
  try {
    service = aiService || createAIService();
  } catch (error) {
    throw new KnowledgeGraphError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  /**
   * Identify relationships between concepts using AI
   */
  async function identifyRelationships(
    concepts: Concept[]
  ): Promise<IdentifiedRelationship[]> {
    // Handle case with 0 or 1 concept (no relationships possible)
    if (concepts.length < 2) {
      return [];
    }

    try {
      const response = await sendStructuredMessage<IdentifiedRelationship[]>(
        service,
        {
          systemPrompt: RELATIONSHIP_IDENTIFICATION_SYSTEM_PROMPT,
          userMessage: buildUserMessage(concepts),
          options: {
            model: 'claude-sonnet',
            temperature: 0.3, // Lower temperature for more consistent output
          },
        }
      );

      if (!Array.isArray(response.data)) {
        return [];
      }

      // Validate and filter relationships
      const validRelationships: IdentifiedRelationship[] = [];
      for (const rel of response.data) {
        try {
          // Normalize strength to be within bounds
          const normalizedRel = {
            ...rel,
            strength: Math.max(0, Math.min(1, rel.strength)),
          };
          validateIdentifiedRelationship(normalizedRel);
          validRelationships.push(normalizedRel);
        } catch {
          // Skip invalid relationships
        }
      }

      return validRelationships;
    } catch (error) {
      throw new KnowledgeGraphError(
        `Failed to identify relationships: ${(error as Error).message}`,
        'GRAPH_BUILD_FAILED',
        { cause: error }
      );
    }
  }

  /**
   * Map concept names to IDs
   */
  function mapNamesToIds(
    relationships: IdentifiedRelationship[],
    concepts: Concept[]
  ): ConceptRelationshipInsert[] {
    const nameToId = new Map<string, string>();
    for (const concept of concepts) {
      nameToId.set(concept.name.toLowerCase(), concept.id);
    }

    const mapped: ConceptRelationshipInsert[] = [];

    for (const rel of relationships) {
      const fromId = nameToId.get(rel.from_concept_name.toLowerCase());
      const toId = nameToId.get(rel.to_concept_name.toLowerCase());

      // Skip if either concept name doesn't match
      if (!fromId || !toId) {
        continue;
      }

      // Skip self-references during mapping
      if (fromId === toId) {
        continue;
      }

      mapped.push({
        project_id: concepts[0].project_id,
        from_concept_id: fromId,
        to_concept_id: toId,
        relationship_type: rel.relationship_type,
        strength: rel.strength,
        metadata: {},
      });
    }

    return mapped;
  }

  /**
   * Store relationships in database
   */
  async function storeRelationships(
    relationships: ConceptRelationshipInsert[]
  ): Promise<ConceptRelationship[]> {
    if (relationships.length === 0) {
      return [];
    }

    // Use upsert to handle duplicates (based on unique constraint)
    const { data, error } = await supabase
      .from('concept_relationships')
      .upsert(relationships, {
        onConflict: 'project_id,from_concept_id,to_concept_id',
        ignoreDuplicates: false, // Update if exists
      })
      .select();

    if (error) {
      throw new KnowledgeGraphError(
        `Failed to store relationships: ${error.message}`,
        'DATABASE_ERROR',
        { relationships }
      );
    }

    return (data as ConceptRelationship[]) || [];
  }

  return {
    async buildKnowledgeGraph(
      projectId: string,
      concepts: Concept[]
    ): Promise<ConceptRelationship[]> {
      // Identify relationships using AI
      const identifiedRelationships = await identifyRelationships(concepts);

      // Map concept names to IDs
      const relationshipInserts = mapNamesToIds(identifiedRelationships, concepts);

      // Store in database
      return storeRelationships(relationshipInserts);
    },

    async getProjectRelationships(
      projectId: string
    ): Promise<ConceptRelationship[]> {
      const { data, error } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        throw new KnowledgeGraphError(
          `Failed to get project relationships: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      return (data as ConceptRelationship[]) || [];
    },

    async getPrerequisites(conceptId: string): Promise<Concept[]> {
      // Get prerequisite relationships where this concept is the target
      const { data: relationships, error: relError } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('to_concept_id', conceptId)
        .eq('relationship_type', 'prerequisite');

      if (relError) {
        throw new KnowledgeGraphError(
          `Failed to get prerequisites: ${relError.message}`,
          'DATABASE_ERROR',
          { conceptId }
        );
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Get the actual concepts
      const prerequisiteIds = relationships.map((r: ConceptRelationship) => r.from_concept_id);
      const { data: concepts, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .in('id', prerequisiteIds);

      if (conceptError) {
        throw new KnowledgeGraphError(
          `Failed to get prerequisite concepts: ${conceptError.message}`,
          'DATABASE_ERROR',
          { conceptId }
        );
      }

      return (concepts as Concept[]) || [];
    },

    async getDependents(conceptId: string): Promise<Concept[]> {
      // Get prerequisite relationships where this concept is the source
      const { data: relationships, error: relError } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('from_concept_id', conceptId)
        .eq('relationship_type', 'prerequisite');

      if (relError) {
        throw new KnowledgeGraphError(
          `Failed to get dependents: ${relError.message}`,
          'DATABASE_ERROR',
          { conceptId }
        );
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Get the actual concepts
      const dependentIds = relationships.map((r: ConceptRelationship) => r.to_concept_id);
      const { data: concepts, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .in('id', dependentIds);

      if (conceptError) {
        throw new KnowledgeGraphError(
          `Failed to get dependent concepts: ${conceptError.message}`,
          'DATABASE_ERROR',
          { conceptId }
        );
      }

      return (concepts as Concept[]) || [];
    },

    async getTopologicalOrder(projectId: string): Promise<Concept[]> {
      // Get all relationships for the project
      const { data: relationships, error: relError } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('project_id', projectId);

      if (relError) {
        throw new KnowledgeGraphError(
          `Failed to get relationships: ${relError.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      // Get all concepts for the project
      const { data: concepts, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .eq('project_id', projectId);

      if (conceptError) {
        throw new KnowledgeGraphError(
          `Failed to get concepts: ${conceptError.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      if (!concepts || concepts.length === 0) {
        return [];
      }

      const typedRelationships = (relationships as ConceptRelationship[]) || [];
      const typedConcepts = concepts as Concept[];

      // Build adjacency list from prerequisite relationships
      const adjacencyList = buildAdjacencyList(typedRelationships);

      // Get all concept IDs
      const allConceptIds = new Set(typedConcepts.map((c) => c.id));

      // Ensure all concepts are in the adjacency list (even if no edges)
      for (const conceptId of allConceptIds) {
        if (!adjacencyList.has(conceptId)) {
          adjacencyList.set(conceptId, []);
        }
      }

      // Perform topological sort
      const sortedIds = topologicalSortKahn(adjacencyList, allConceptIds);

      if (sortedIds === null) {
        throw new KnowledgeGraphError(
          'Cannot determine learning order: circular dependency detected',
          'CIRCULAR_DEPENDENCY',
          { projectId }
        );
      }

      // Map sorted IDs back to concepts
      const idToConcept = new Map<string, Concept>();
      for (const concept of typedConcepts) {
        idToConcept.set(concept.id, concept);
      }

      return sortedIds.map((id) => idToConcept.get(id)!).filter(Boolean);
    },

    async hasCircularDependency(projectId: string): Promise<boolean> {
      // Get all relationships for the project
      const { data: relationships, error } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        throw new KnowledgeGraphError(
          `Failed to get relationships: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      if (!relationships || relationships.length === 0) {
        return false;
      }

      const typedRelationships = relationships as ConceptRelationship[];

      // Build adjacency list from prerequisite relationships
      const adjacencyList = buildAdjacencyList(typedRelationships);

      // Also add nodes that are only targets (no outgoing edges)
      for (const rel of typedRelationships) {
        if (rel.relationship_type === 'prerequisite') {
          if (!adjacencyList.has(rel.to_concept_id)) {
            adjacencyList.set(rel.to_concept_id, []);
          }
        }
      }

      // Detect cycles using DFS
      return detectCycleDFS(adjacencyList);
    },
  };
}

/**
 * Get the default knowledge graph service using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Knowledge graph service instance
 * @throws KnowledgeGraphError if EXPO_PUBLIC_ANTHROPIC_API_KEY is not set
 */
export function getDefaultKnowledgeGraphService(
  supabase: SupabaseClient
): KnowledgeGraphService {
  return createKnowledgeGraphService(supabase);
}
