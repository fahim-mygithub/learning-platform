/**
 * Mock Knowledge Graph Service for Testing
 *
 * Provides predictable responses for testing other services that depend on knowledge graph.
 * Configurable to simulate different graph structures, errors, and custom responses.
 */

import {
  Concept,
  ConceptRelationship,
  RelationshipType,
} from '@/src/types/database';

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
  strength: number;
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
 * Mock configuration for controlling behavior in tests
 */
export interface MockKnowledgeGraphConfig {
  /** Default relationships to return */
  defaultRelationships?: ConceptRelationship[];
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: KnowledgeGraphError | Error;
  /** Whether to simulate circular dependency */
  hasCircularDependency?: boolean;
  /** Custom topological order to return */
  customTopologicalOrder?: Concept[];
  /** Custom prerequisites by concept ID */
  customPrerequisites?: Map<string, Concept[]>;
  /** Custom dependents by concept ID */
  customDependents?: Map<string, Concept[]>;
}

/**
 * Global mock configuration
 */
let mockConfig: MockKnowledgeGraphConfig = {
  defaultRelationships: [],
  shouldError: false,
  hasCircularDependency: false,
};

/**
 * Configure the mock behavior
 */
export function configureMock(config: Partial<MockKnowledgeGraphConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    defaultRelationships: [],
    shouldError: false,
    hasCircularDependency: false,
  };
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockKnowledgeGraphConfig {
  return { ...mockConfig };
}

/**
 * Track calls for verification in tests
 */
interface MockCallRecord {
  timestamp: number;
  method: string;
  args: unknown[];
}

const callHistory: MockCallRecord[] = [];

/**
 * Get all calls made to the mock service
 */
export function getMockCallHistory(): MockCallRecord[] {
  return [...callHistory];
}

/**
 * Clear the call history
 */
export function clearMockCallHistory(): void {
  callHistory.length = 0;
}

/**
 * Validate an identified relationship
 */
export function validateIdentifiedRelationship(
  relationship: IdentifiedRelationship
): void {
  if (!relationship.from_concept_name || relationship.from_concept_name.trim() === '') {
    throw new KnowledgeGraphError(
      'from_concept_name cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  if (!relationship.to_concept_name || relationship.to_concept_name.trim() === '') {
    throw new KnowledgeGraphError(
      'to_concept_name cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  if (!RELATIONSHIP_TYPES.includes(relationship.relationship_type)) {
    throw new KnowledgeGraphError(
      `Invalid relationship type: ${relationship.relationship_type}`,
      'VALIDATION_ERROR'
    );
  }

  if (relationship.strength < 0.0 || relationship.strength > 1.0) {
    throw new KnowledgeGraphError(
      `Strength must be between 0.0 and 1.0, got ${relationship.strength}`,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Knowledge graph service interface
 */
export interface KnowledgeGraphService {
  buildKnowledgeGraph(
    projectId: string,
    concepts: Concept[]
  ): Promise<ConceptRelationship[]>;

  getProjectRelationships(projectId: string): Promise<ConceptRelationship[]>;

  getPrerequisites(conceptId: string): Promise<Concept[]>;

  getDependents(conceptId: string): Promise<Concept[]>;

  getTopologicalOrder(projectId: string): Promise<Concept[]>;

  hasCircularDependency(projectId: string): Promise<boolean>;
}

/**
 * Sample relationships for testing
 */
export const sampleRelationships: Record<string, IdentifiedRelationship[]> = {
  programming: [
    {
      from_concept_name: 'Variables',
      to_concept_name: 'Functions',
      relationship_type: 'prerequisite',
      strength: 0.9,
    },
    {
      from_concept_name: 'Variables',
      to_concept_name: 'Loops',
      relationship_type: 'prerequisite',
      strength: 0.85,
    },
    {
      from_concept_name: 'Functions',
      to_concept_name: 'Recursion',
      relationship_type: 'prerequisite',
      strength: 0.95,
    },
    {
      from_concept_name: 'Loops',
      to_concept_name: 'Recursion',
      relationship_type: 'contrasts_with',
      strength: 0.7,
    },
  ],
  circular: [
    {
      from_concept_name: 'A',
      to_concept_name: 'B',
      relationship_type: 'prerequisite',
      strength: 0.9,
    },
    {
      from_concept_name: 'B',
      to_concept_name: 'C',
      relationship_type: 'prerequisite',
      strength: 0.9,
    },
    {
      from_concept_name: 'C',
      to_concept_name: 'A',
      relationship_type: 'prerequisite',
      strength: 0.9,
    },
  ],
};

/**
 * Create a mock knowledge graph service
 */
export function createKnowledgeGraphService(): KnowledgeGraphService {
  // Check for API key (simulating real service behavior)
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new KnowledgeGraphError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async buildKnowledgeGraph(
      projectId: string,
      concepts: Concept[]
    ): Promise<ConceptRelationship[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'buildKnowledgeGraph',
        args: [projectId, concepts],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'GRAPH_BUILD_FAILED');
      }

      // Return default relationships converted to ConceptRelationship format
      return (mockConfig.defaultRelationships || []).map((r, i) => ({
        ...r,
        id: r.id || `mock-rel-${i}`,
        project_id: projectId,
        created_at: r.created_at || new Date().toISOString(),
      }));
    },

    async getProjectRelationships(
      projectId: string
    ): Promise<ConceptRelationship[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getProjectRelationships',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'DATABASE_ERROR');
      }

      return (mockConfig.defaultRelationships || []).map((r, i) => ({
        ...r,
        id: r.id || `mock-rel-${i}`,
        project_id: projectId,
        created_at: r.created_at || new Date().toISOString(),
      }));
    },

    async getPrerequisites(conceptId: string): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getPrerequisites',
        args: [conceptId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'DATABASE_ERROR');
      }

      if (mockConfig.customPrerequisites) {
        return mockConfig.customPrerequisites.get(conceptId) || [];
      }

      return [];
    },

    async getDependents(conceptId: string): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getDependents',
        args: [conceptId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'DATABASE_ERROR');
      }

      if (mockConfig.customDependents) {
        return mockConfig.customDependents.get(conceptId) || [];
      }

      return [];
    },

    async getTopologicalOrder(projectId: string): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getTopologicalOrder',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'DATABASE_ERROR');
      }

      if (mockConfig.hasCircularDependency) {
        throw new KnowledgeGraphError(
          'Cannot determine learning order: circular dependency detected',
          'CIRCULAR_DEPENDENCY',
          { projectId }
        );
      }

      return mockConfig.customTopologicalOrder || [];
    },

    async hasCircularDependency(projectId: string): Promise<boolean> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'hasCircularDependency',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new KnowledgeGraphError('Mock error', 'DATABASE_ERROR');
      }

      return mockConfig.hasCircularDependency || false;
    },
  };
}

/**
 * Get the default knowledge graph service
 */
export function getDefaultKnowledgeGraphService(): KnowledgeGraphService {
  return createKnowledgeGraphService();
}
