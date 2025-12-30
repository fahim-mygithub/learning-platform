/**
 * Mock Concept Extraction Service for Testing
 *
 * Provides predictable responses for testing other services that depend on concept extraction.
 * Configurable to simulate different content types, errors, and custom responses.
 */

import {
  Concept,
  CognitiveType,
  Transcription,
} from '@/src/types/database';

/**
 * Error codes for concept extraction operations
 */
export type ConceptExtractionErrorCode =
  | 'API_KEY_MISSING'
  | 'EXTRACTION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'EMPTY_CONTENT';

/**
 * Custom error class for concept extraction operations
 */
export class ConceptExtractionError extends Error {
  code: ConceptExtractionErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ConceptExtractionErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConceptExtractionError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Extracted concept before database storage
 */
export interface ExtractedConcept {
  name: string;
  definition: string;
  key_points: string[];
  cognitive_type: CognitiveType;
  difficulty: number;
  source_timestamps?: { start: number; end: number }[];
}

/**
 * Valid cognitive types
 */
export const COGNITIVE_TYPES: CognitiveType[] = [
  'declarative',
  'conceptual',
  'procedural',
  'conditional',
  'metacognitive',
];

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockConceptExtractionConfig {
  /** Default concepts to return when no custom response is set */
  defaultConcepts?: ExtractedConcept[];
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: ConceptExtractionError | Error;
  /** Custom concepts keyed by a pattern in the content */
  customResponses?: Map<string, ExtractedConcept[]>;
}

/**
 * Global mock configuration
 */
let mockConfig: MockConceptExtractionConfig = {
  defaultConcepts: [],
  shouldError: false,
};

/**
 * Configure the mock behavior
 */
export function configureMock(config: Partial<MockConceptExtractionConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    defaultConcepts: [],
    shouldError: false,
  };
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockConceptExtractionConfig {
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
 * Validate an extracted concept
 */
export function validateExtractedConcept(concept: ExtractedConcept): void {
  // Validate name length (2-50 characters)
  if (concept.name.length < 2 || concept.name.length > 50) {
    throw new ConceptExtractionError(
      `Name must be 2-50 characters, got ${concept.name.length}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate definition is non-empty
  if (!concept.definition || concept.definition.trim() === '') {
    throw new ConceptExtractionError(
      'Definition cannot be empty',
      'VALIDATION_ERROR'
    );
  }

  // Validate key_points has 1-10 items
  if (concept.key_points.length < 1 || concept.key_points.length > 10) {
    throw new ConceptExtractionError(
      `Key points must have 1-10 items, got ${concept.key_points.length}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate cognitive type
  if (!COGNITIVE_TYPES.includes(concept.cognitive_type)) {
    throw new ConceptExtractionError(
      `Invalid cognitive type: ${concept.cognitive_type}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate difficulty is integer 1-10
  if (
    !Number.isInteger(concept.difficulty) ||
    concept.difficulty < 1 ||
    concept.difficulty > 10
  ) {
    throw new ConceptExtractionError(
      `Difficulty must be integer 1-10, got ${concept.difficulty}`,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Concept extraction service interface
 */
export interface ConceptExtractionService {
  extractFromTranscription(
    projectId: string,
    sourceId: string,
    transcription: Transcription
  ): Promise<Concept[]>;

  extractFromText(
    projectId: string,
    sourceId: string,
    text: string
  ): Promise<Concept[]>;

  getProjectConcepts(projectId: string): Promise<Concept[]>;
}

/**
 * Sample concepts for different content types
 */
export const sampleConcepts: Record<string, ExtractedConcept[]> = {
  machineLearning: [
    {
      name: 'Machine Learning',
      definition:
        'A subset of artificial intelligence that enables systems to learn and improve from experience.',
      key_points: [
        'Uses algorithms to learn from data',
        'Part of artificial intelligence field',
        'Improves through experience',
      ],
      cognitive_type: 'conceptual',
      difficulty: 6,
      source_timestamps: [{ start: 0, end: 10 }],
    },
    {
      name: 'Neural Networks',
      definition:
        'Computing systems inspired by biological neural networks that process information.',
      key_points: [
        'Inspired by biological neurons',
        'Process information in layers',
        'Foundation of deep learning',
      ],
      cognitive_type: 'conceptual',
      difficulty: 7,
      source_timestamps: [{ start: 10, end: 20 }],
    },
  ],
  programming: [
    {
      name: 'Variables',
      definition: 'Named storage locations in memory that hold data values.',
      key_points: [
        'Store data temporarily',
        'Have specific data types',
        'Can be modified during execution',
      ],
      cognitive_type: 'declarative',
      difficulty: 2,
    },
    {
      name: 'Functions',
      definition: 'Reusable blocks of code that perform specific tasks.',
      key_points: [
        'Accept input parameters',
        'Return output values',
        'Promote code reuse',
      ],
      cognitive_type: 'procedural',
      difficulty: 4,
    },
  ],
};

/**
 * Create a mock concept extraction service
 */
export function createConceptExtractionService(): ConceptExtractionService {
  // Check for API key (simulating real service behavior)
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ConceptExtractionError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async extractFromTranscription(
      projectId: string,
      sourceId: string,
      transcription: Transcription
    ): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'extractFromTranscription',
        args: [projectId, sourceId, transcription],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new ConceptExtractionError('Mock error', 'EXTRACTION_FAILED');
      }

      // Handle empty content
      if (!transcription.full_text || transcription.full_text.trim() === '') {
        return [];
      }

      // Get concepts from custom responses or default
      let extractedConcepts = mockConfig.defaultConcepts || [];
      if (mockConfig.customResponses) {
        for (const [pattern, concepts] of mockConfig.customResponses) {
          if (transcription.full_text.includes(pattern)) {
            extractedConcepts = concepts;
            break;
          }
        }
      }

      // Convert to Concept records with timestamps
      return extractedConcepts.map((c, i) => ({
        id: `mock-concept-${i}`,
        project_id: projectId,
        source_id: sourceId,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: c.source_timestamps || [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    },

    async extractFromText(
      projectId: string,
      sourceId: string,
      text: string
    ): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'extractFromText',
        args: [projectId, sourceId, text],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new ConceptExtractionError('Mock error', 'EXTRACTION_FAILED');
      }

      // Handle empty content
      if (!text || text.trim() === '') {
        return [];
      }

      // Get concepts from custom responses or default
      let extractedConcepts = mockConfig.defaultConcepts || [];
      if (mockConfig.customResponses) {
        for (const [pattern, concepts] of mockConfig.customResponses) {
          if (text.includes(pattern)) {
            extractedConcepts = concepts;
            break;
          }
        }
      }

      // Convert to Concept records without timestamps (plain text)
      return extractedConcepts.map((c, i) => ({
        id: `mock-concept-${i}`,
        project_id: projectId,
        source_id: sourceId,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    },

    async getProjectConcepts(projectId: string): Promise<Concept[]> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getProjectConcepts',
        args: [projectId],
      });

      if (mockConfig.shouldError) {
        throw mockConfig.errorToThrow || new ConceptExtractionError('Mock error', 'DATABASE_ERROR');
      }

      // Return default concepts for the project
      return (mockConfig.defaultConcepts || []).map((c, i) => ({
        id: `mock-concept-${i}`,
        project_id: projectId,
        source_id: null,
        name: c.name,
        definition: c.definition,
        key_points: c.key_points,
        cognitive_type: c.cognitive_type,
        difficulty: c.difficulty,
        source_timestamps: c.source_timestamps || [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    },
  };
}
