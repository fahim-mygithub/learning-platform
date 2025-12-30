/**
 * Concept Extraction Service
 *
 * Extracts learnable concepts from content (transcriptions, PDFs, URLs) using Claude API.
 * Features:
 * - Cognitive type classification (declarative, conceptual, procedural, conditional, metacognitive)
 * - Difficulty estimation (1-10 scale)
 * - Timestamp mapping from transcription segments
 * - Database storage via Supabase
 *
 * @example
 * ```ts
 * import { createConceptExtractionService } from '@/src/lib/concept-extraction';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const service = createConceptExtractionService(supabase);
 *
 * // Extract from transcription
 * const concepts = await service.extractFromTranscription(
 *   projectId,
 *   sourceId,
 *   transcription
 * );
 *
 * // Extract from plain text
 * const concepts = await service.extractFromText(projectId, sourceId, text);
 *
 * // Get all concepts for a project
 * const allConcepts = await service.getProjectConcepts(projectId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  ConceptInsert,
  CognitiveType,
  Transcription,
} from '@/src/types/database';
import {
  createAIService,
  sendStructuredMessage,
  AIService,
} from './ai-service';

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
 * Concept extraction service interface
 */
export interface ConceptExtractionService {
  /**
   * Extract concepts from transcription text with timestamps
   * @param projectId - ID of the project
   * @param sourceId - ID of the source
   * @param transcription - Transcription record with segments
   * @returns Array of extracted and stored concepts
   */
  extractFromTranscription(
    projectId: string,
    sourceId: string,
    transcription: Transcription
  ): Promise<Concept[]>;

  /**
   * Extract concepts from plain text (PDF, article)
   * @param projectId - ID of the project
   * @param sourceId - ID of the source
   * @param text - Plain text content
   * @returns Array of extracted and stored concepts
   */
  extractFromText(
    projectId: string,
    sourceId: string,
    text: string
  ): Promise<Concept[]>;

  /**
   * Get all concepts for a project
   * @param projectId - ID of the project
   * @returns Array of concepts
   */
  getProjectConcepts(projectId: string): Promise<Concept[]>;
}

/**
 * Validate an extracted concept
 *
 * @param concept - Concept to validate
 * @throws ConceptExtractionError if validation fails
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
 * System prompt for concept extraction
 */
const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `You are an expert educational content analyzer. Your task is to extract learnable concepts from the provided content.

For each concept, provide:
1. **name**: A concise name (2-5 words)
2. **definition**: A clear definition (1-2 sentences)
3. **key_points**: 3-5 key points about the concept
4. **cognitive_type**: Classify as one of:
   - "declarative": Facts and information (e.g., "The capital of France is Paris")
   - "conceptual": Abstract ideas and principles (e.g., "What is democracy?")
   - "procedural": How to do something (e.g., "Steps to solve a quadratic equation")
   - "conditional": When/why to apply knowledge (e.g., "When to use integration vs differentiation")
   - "metacognitive": Thinking about thinking (e.g., "How to evaluate your own learning")
5. **difficulty**: Score 1-10 based on:
   - Abstractness (1=concrete, 10=highly abstract)
   - Prerequisite depth (1=no prerequisites, 10=many prerequisites required)
   - Relational complexity (1=simple, 10=many interconnected ideas)

Return a JSON array of concepts. Example:
[
  {
    "name": "Machine Learning",
    "definition": "A subset of AI that enables systems to learn from data without explicit programming.",
    "key_points": [
      "Uses algorithms to identify patterns",
      "Improves performance through experience",
      "Foundation for many AI applications"
    ],
    "cognitive_type": "conceptual",
    "difficulty": 6
  }
]

Important guidelines:
- Extract only distinct, meaningful concepts
- Avoid trivial or overly broad concepts
- Ensure each concept can be learned independently
- Difficulty should reflect learning challenge, not familiarity`;

/**
 * Build user message for concept extraction with optional timestamp information
 */
function buildUserMessage(
  text: string,
  segments?: { start: number; end: number; text: string }[]
): string {
  let message = `Extract learnable concepts from the following content:\n\n${text}`;

  if (segments && segments.length > 0) {
    message += '\n\nThe content has the following timed segments (for reference when locating concepts):';
    segments.forEach((seg, i) => {
      message += `\n[${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s]: ${seg.text}`;
    });
    message += '\n\nFor each concept, include source_timestamps indicating which segment(s) discuss it.';
  }

  return message;
}

/**
 * Normalize and validate extracted concepts from AI response
 */
function normalizeExtractedConcepts(
  rawConcepts: ExtractedConcept[]
): ExtractedConcept[] {
  return rawConcepts.map((concept) => {
    // Normalize difficulty to integer
    const normalizedConcept: ExtractedConcept = {
      name: concept.name.trim(),
      definition: concept.definition.trim(),
      key_points: concept.key_points.map((p) => p.trim()),
      cognitive_type: concept.cognitive_type,
      difficulty: Math.round(concept.difficulty),
      source_timestamps: concept.source_timestamps,
    };

    // Clamp difficulty to valid range
    if (normalizedConcept.difficulty < 1) normalizedConcept.difficulty = 1;
    if (normalizedConcept.difficulty > 10) normalizedConcept.difficulty = 10;

    // Validate after normalization
    validateExtractedConcept(normalizedConcept);

    return normalizedConcept;
  });
}

/**
 * Maximum content length before chunking (in characters)
 */
const MAX_CONTENT_LENGTH = 50000;

/**
 * Chunk large content for processing
 */
function chunkContent(text: string, maxLength: number = MAX_CONTENT_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + maxLength / 2) {
        end = lastPeriod + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks;
}

/**
 * Create a concept extraction service instance
 *
 * @param supabase - Supabase client instance
 * @param aiService - Optional AI service instance (uses default if not provided)
 * @returns Concept extraction service instance
 * @throws ConceptExtractionError if API key is missing
 */
export function createConceptExtractionService(
  supabase: SupabaseClient,
  aiService?: AIService
): ConceptExtractionService {
  // Create or use provided AI service
  let service: AIService;
  try {
    service = aiService || createAIService();
  } catch (error) {
    throw new ConceptExtractionError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  /**
   * Extract concepts using AI service
   */
  async function extractConcepts(
    text: string,
    segments?: { start: number; end: number; text: string }[]
  ): Promise<ExtractedConcept[]> {
    // Handle empty content
    if (!text || text.trim() === '') {
      return [];
    }

    // Chunk content if too large
    const chunks = chunkContent(text);
    const allConcepts: ExtractedConcept[] = [];

    for (const chunk of chunks) {
      try {
        const response = await sendStructuredMessage<ExtractedConcept[]>(
          service,
          {
            systemPrompt: CONCEPT_EXTRACTION_SYSTEM_PROMPT,
            userMessage: buildUserMessage(chunk, segments),
            options: {
              model: 'claude-sonnet',
              temperature: 0.3, // Lower temperature for more consistent output
            },
          }
        );

        if (Array.isArray(response.data)) {
          const normalized = normalizeExtractedConcepts(response.data);
          allConcepts.push(...normalized);
        }
      } catch (error) {
        throw new ConceptExtractionError(
          `Failed to extract concepts: ${(error as Error).message}`,
          'EXTRACTION_FAILED',
          { cause: error }
        );
      }
    }

    return allConcepts;
  }

  /**
   * Store concepts in database
   */
  async function storeConcepts(
    projectId: string,
    sourceId: string,
    concepts: ExtractedConcept[]
  ): Promise<Concept[]> {
    if (concepts.length === 0) {
      return [];
    }

    const conceptInserts: ConceptInsert[] = concepts.map((c) => ({
      project_id: projectId,
      source_id: sourceId,
      name: c.name,
      definition: c.definition,
      key_points: c.key_points,
      cognitive_type: c.cognitive_type,
      difficulty: c.difficulty,
      source_timestamps: c.source_timestamps || [],
      metadata: {},
    }));

    const { data, error } = await supabase
      .from('concepts')
      .insert(conceptInserts)
      .select();

    if (error) {
      throw new ConceptExtractionError(
        `Failed to store concepts: ${error.message}`,
        'DATABASE_ERROR',
        { projectId, sourceId }
      );
    }

    return (data as Concept[]) || [];
  }

  return {
    async extractFromTranscription(
      projectId: string,
      sourceId: string,
      transcription: Transcription
    ): Promise<Concept[]> {
      // Extract concepts with segment information
      const extractedConcepts = await extractConcepts(
        transcription.full_text,
        transcription.segments
      );

      // Store in database
      return storeConcepts(projectId, sourceId, extractedConcepts);
    },

    async extractFromText(
      projectId: string,
      sourceId: string,
      text: string
    ): Promise<Concept[]> {
      // Extract concepts without segment information
      const extractedConcepts = await extractConcepts(text);

      // Store in database
      return storeConcepts(projectId, sourceId, extractedConcepts);
    },

    async getProjectConcepts(projectId: string): Promise<Concept[]> {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        throw new ConceptExtractionError(
          `Failed to get project concepts: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      return (data as Concept[]) || [];
    },
  };
}

/**
 * Get the default concept extraction service using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Concept extraction service instance
 * @throws ConceptExtractionError if EXPO_PUBLIC_ANTHROPIC_API_KEY is not set
 */
export function getDefaultConceptExtractionService(
  supabase: SupabaseClient
): ConceptExtractionService {
  return createConceptExtractionService(supabase);
}
