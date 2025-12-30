/**
 * Mock Roadmap Generation Service for Testing
 *
 * Provides predictable responses for testing other services that depend on roadmap generation.
 * Configurable to simulate different roadmap structures, errors, and custom responses.
 */

import {
  Concept,
  Roadmap,
  RoadmapLevel,
  MasteryGate,
  RoadmapStatus,
  CognitiveType,
} from '@/src/types/database';

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
  easy: 5,
  medium: 10,
  hard: 15,
  expert: 20,
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
 */
export function calculateConceptTime(concept: Concept): number {
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

  const modifier = COGNITIVE_TYPE_MODIFIER[concept.cognitive_type];
  return Math.round(baseTime * modifier);
}

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockRoadmapGenerationConfig {
  /** Default roadmap to return */
  defaultRoadmap?: Roadmap;
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: RoadmapGenerationError | Error;
  /** Custom roadmaps by project ID */
  customRoadmaps?: Map<string, Roadmap>;
  /** Predefined levels */
  predefinedLevels?: RoadmapLevel[];
  /** Total estimated minutes */
  totalEstimatedMinutes?: number;
}

/**
 * Global mock configuration
 */
let mockConfig: MockRoadmapGenerationConfig = {
  shouldError: false,
};

/**
 * Configure the mock behavior
 */
export function configureMock(config: Partial<MockRoadmapGenerationConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    shouldError: false,
  };
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockRoadmapGenerationConfig {
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
 * Sample roadmap for testing
 */
export const sampleRoadmap: Roadmap = {
  id: 'roadmap-1',
  project_id: 'project-123',
  title: 'Sample Learning Roadmap',
  description: null,
  levels: [
    {
      level: 1,
      title: 'Foundations',
      concept_ids: ['concept-1'],
      estimated_minutes: 5,
    },
    {
      level: 2,
      title: 'Level 2',
      concept_ids: ['concept-2', 'concept-3'],
      estimated_minutes: 30,
    },
    {
      level: 3,
      title: 'Advanced Topics',
      concept_ids: ['concept-4'],
      estimated_minutes: 20,
    },
  ],
  total_estimated_minutes: 55,
  mastery_gates: [
    {
      after_level: 1,
      required_score: 0.8,
      quiz_concept_ids: ['concept-1'],
    },
    {
      after_level: 2,
      required_score: 0.8,
      quiz_concept_ids: ['concept-2', 'concept-3'],
    },
    {
      after_level: 3,
      required_score: 0.8,
      quiz_concept_ids: ['concept-4'],
    },
  ],
  status: 'draft',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Roadmap generation service interface
 */
export interface RoadmapGenerationService {
  generateRoadmap(projectId: string, title?: string): Promise<Roadmap>;
  getRoadmap(projectId: string): Promise<Roadmap | null>;
  updateRoadmapStatus(roadmapId: string, status: RoadmapStatus): Promise<Roadmap>;
  recalculateEstimates(roadmapId: string): Promise<Roadmap>;
}

/**
 * Create a mock roadmap generation service
 */
export function createRoadmapGenerationService(): RoadmapGenerationService {
  // Check for API key (simulating real service behavior)
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RoadmapGenerationError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async generateRoadmap(projectId: string, title?: string): Promise<Roadmap> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'generateRoadmap',
        args: [projectId, title],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow ||
          new RoadmapGenerationError('Mock error', 'GENERATION_FAILED');
      }

      // Check for custom roadmap by project ID
      if (mockConfig.customRoadmaps?.has(projectId)) {
        return mockConfig.customRoadmaps.get(projectId)!;
      }

      // Return default roadmap or sample
      const roadmap = mockConfig.defaultRoadmap || sampleRoadmap;
      return {
        ...roadmap,
        project_id: projectId,
        title: title || roadmap.title,
        levels: mockConfig.predefinedLevels || roadmap.levels,
        total_estimated_minutes:
          mockConfig.totalEstimatedMinutes ?? roadmap.total_estimated_minutes,
      };
    },

    async getRoadmap(projectId: string): Promise<Roadmap | null> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getRoadmap',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow ||
          new RoadmapGenerationError('Mock error', 'DATABASE_ERROR');
      }

      // Check for custom roadmap by project ID
      if (mockConfig.customRoadmaps?.has(projectId)) {
        return mockConfig.customRoadmaps.get(projectId)!;
      }

      // Return default roadmap if project ID matches
      if (mockConfig.defaultRoadmap?.project_id === projectId) {
        return mockConfig.defaultRoadmap;
      }

      // Return sample if project ID matches
      if (sampleRoadmap.project_id === projectId) {
        return sampleRoadmap;
      }

      return null;
    },

    async updateRoadmapStatus(
      roadmapId: string,
      status: RoadmapStatus
    ): Promise<Roadmap> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'updateRoadmapStatus',
        args: [roadmapId, status],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow ||
          new RoadmapGenerationError('Mock error', 'DATABASE_ERROR');
      }

      const roadmap = mockConfig.defaultRoadmap || sampleRoadmap;
      return {
        ...roadmap,
        id: roadmapId,
        status,
        updated_at: new Date().toISOString(),
      };
    },

    async recalculateEstimates(roadmapId: string): Promise<Roadmap> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'recalculateEstimates',
        args: [roadmapId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow ||
          new RoadmapGenerationError('Mock error', 'DATABASE_ERROR');
      }

      const roadmap = mockConfig.defaultRoadmap || sampleRoadmap;
      return {
        ...roadmap,
        id: roadmapId,
        updated_at: new Date().toISOString(),
      };
    },
  };
}

/**
 * Get the default roadmap generation service
 */
export function getDefaultRoadmapGenerationService(): RoadmapGenerationService {
  return createRoadmapGenerationService();
}
