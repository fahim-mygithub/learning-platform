/**
 * Enhanced Concept Extraction Service (Pass 2)
 *
 * Extracts concepts with pedagogical metadata, respecting Pass 1 constraints.
 * This is the second pass of the three-pass pedagogical analysis architecture.
 *
 * Key responsibilities:
 * - Extract concepts with tier, bloom_level, and mentioned_only flags
 * - Respect Bloom's ceiling from Pass 1
 * - Identify concepts that are mentioned but not explained
 * - Allocate learning time percentages
 *
 * The pedagogical fields enable:
 * - Question generation based on Bloom's level
 * - AI tutoring depth based on tier
 * - Adaptive assessment with tier-based weighting
 * - Filtering mentioned-only concepts from roadmap
 *
 * @example
 * ```ts
 * import { createEnhancedConceptExtractionService } from '@/src/lib/enhanced-concept-extraction';
 *
 * const service = createEnhancedConceptExtractionService(supabase, aiService);
 * const result = await service.extractWithConstraints(text, pass1Result, segments);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import {
  Concept,
  ConceptInsert,
  CognitiveType,
  Transcription,
} from '@/src/types/database';
import {
  Pass1Result,
  Pass2Result,
  EnhancedExtractedConcept,
  BloomLevel,
  ConceptTier,
  BLOOM_LEVEL_ORDER,
  exceedsBloomCeiling,
  // Enhanced pedagogical fields
  LearningObjective,
  AssessmentSpec,
  SourceMapping,
  QuestionType,
  BLOOM_VERBS,
} from '@/src/types/three-pass';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for enhanced concept extraction
 */
export type EnhancedConceptExtractionErrorCode =
  | 'EXTRACTION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'EMPTY_CONTENT';

/**
 * Custom error class for enhanced concept extraction
 */
export class EnhancedConceptExtractionError extends Error {
  code: EnhancedConceptExtractionErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: EnhancedConceptExtractionErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EnhancedConceptExtractionError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Valid cognitive types
 */
const COGNITIVE_TYPES: CognitiveType[] = [
  'declarative',
  'conceptual',
  'procedural',
  'conditional',
  'metacognitive',
];

/**
 * Enhanced concept extraction service interface
 */
export interface EnhancedConceptExtractionService {
  /**
   * Extract concepts with Pass 1 constraints applied
   * @param text - Content text to analyze
   * @param constraints - Pass 1 result with classification and constraints
   * @param segments - Optional transcription segments for timestamps
   * @returns Pass 2 result with enhanced concepts
   */
  extractWithConstraints(
    text: string,
    constraints: Pass1Result,
    segments?: { start: number; end: number; text: string }[]
  ): Promise<Pass2Result>;

  /**
   * Extract and store concepts for a source
   * @param projectId - Project ID
   * @param sourceId - Source ID
   * @param transcription - Transcription with text and segments
   * @param constraints - Pass 1 result
   * @returns Stored concepts
   */
  extractFromTranscription(
    projectId: string,
    sourceId: string,
    transcription: Transcription,
    constraints: Pass1Result
  ): Promise<Concept[]>;

  /**
   * Extract and store concepts from plain text
   * @param projectId - Project ID
   * @param sourceId - Source ID
   * @param text - Plain text content
   * @param constraints - Pass 1 result
   * @returns Stored concepts
   */
  extractFromText(
    projectId: string,
    sourceId: string,
    text: string,
    constraints: Pass1Result
  ): Promise<Concept[]>;
}

/**
 * Build system prompt with Pass 1 constraints
 */
function buildSystemPrompt(constraints: Pass1Result): string {
  return `You are an expert educational content analyzer extracting learnable concepts with pedagogical classification.

CONTENT CLASSIFICATION (from Pass 1):
- Content Type: ${constraints.contentType.toUpperCase()}
- Bloom's Ceiling: ${constraints.bloomCeiling.toUpperCase()} (DO NOT assign higher levels)
- Extraction Depth: ${constraints.extractionDepth}
${constraints.thesisStatement ? `- Thesis: "${constraints.thesisStatement}"` : '- No thesis identified'}

For each concept, provide:
1. **name**: Concise name (2-5 words)
2. **definition**: Clear definition (1-2 sentences)
3. **key_points**: 3-5 key learning points
4. **cognitive_type**: One of: declarative, conceptual, procedural, conditional, metacognitive
5. **difficulty**: Score 1-10 based on abstractness, prerequisites, complexity

PEDAGOGICAL FIELDS (CRITICAL):
6. **tier**: Classification based on Understanding by Design:
   - 1 (Familiar): Background knowledge, mentioned for context, not core to learning
   - 2 (Important): Core concepts that are explained and should be learned
   - 3 (Enduring Understanding): Thesis-level concepts central to the content's purpose

7. **mentioned_only**: THE CRITICAL FLAG - Set to TRUE when:
   - Concept is referenced but NOT defined or explained
   - Content assumes prior knowledge of this concept
   - Term appears in passing without elaboration
   - Would require external resources to learn
   Set to FALSE when concept is actively taught in the content.

8. **bloom_level**: The Bloom's level THIS CONTENT supports for this concept:
   - remember: Just names/recalls the concept
   - understand: Explains/describes the concept
   - apply: Shows how to use the concept (procedures)
   - analyze: Breaks down structure/relationships
   CONSTRAINT: Cannot exceed ${constraints.bloomCeiling}

9. **definition_provided**: TRUE if the content provides a definition, FALSE if assumed known

10. **time_allocation_percent**: Suggested % of learning time (all concepts should sum to ~100%)

ENHANCED PEDAGOGICAL FIELDS (NEW):

11. **one_sentence_summary**: Plain language summary for learner display (1 sentence, no jargon)

12. **why_it_matters**: Brief explanation of why this concept is important to learn (1-2 sentences)

13. **learning_objectives**: Array of 1-3 learning objectives for this concept:
   - bloom_verb: Action verb matching bloom_level (e.g., "Define", "Explain", "Compare")
   - objective_statement: "You will be able to [verb] [specific outcome]"
   - success_criteria: Array of 1-3 criteria that demonstrate mastery

14. **assessment_spec**: Assessment specification for quiz generation:
   - appropriate_question_types: Array from [definition_recall, true_false, multiple_choice, comparison, sequence, cause_effect, application]
   - inappropriate_question_types: Question types NOT suitable for this concept
   - sample_questions: 1-2 sample questions with:
     - question_type, question_text, correct_answer
     - distractors: Array of 2-3 wrong answers (for multiple choice)
   - mastery_indicators: Array of 2-3 behaviors that indicate understanding
   - mastery_threshold: 0.0-1.0 (typically 0.8)

15. **source_mapping**: Video/audio segment mapping (if segments provided):
   - primary_segment: { start_sec, end_sec } - Main explanation
   - key_moments: Array of { timestamp_sec, description } - Key points
   - review_clip: { start_sec, end_sec } - Good segment for review

QUESTION TYPE SELECTION BY BLOOM'S LEVEL:
- remember: definition_recall, true_false
- understand: multiple_choice, comparison, cause_effect
- apply: application, sequence
- analyze+: comparison, cause_effect, application

EXTRACTION RULES:
- For "explanations" depth: Only extract concepts that are EXPLAINED, not just mentioned
- For "mentions" depth: Include referenced concepts but mark them mentioned_only=true
- Tier 3 concepts should relate to the thesis
- mentioned_only concepts get lower time_allocation_percent
- Bloom's level reflects how deeply the content covers the concept, not how deep it COULD go

Return a JSON array of concepts.`;
}

/**
 * Build user message for extraction
 */
function buildUserMessage(
  text: string,
  segments?: { start: number; end: number; text: string }[]
): string {
  let message = `Extract learnable concepts from the following content:\n\n${text}`;

  if (segments && segments.length > 0) {
    message += '\n\nThe content has the following timed segments:';
    // Only include first 50 segments to avoid token limits
    segments.slice(0, 50).forEach((seg) => {
      message += `\n[${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s]: ${seg.text}`;
    });
    message += '\n\nFor each concept, include source_timestamps indicating which segment(s) discuss it.';
  }

  return message;
}

/**
 * Validate and normalize an extracted concept
 */
function normalizeExtractedConcept(
  concept: Partial<EnhancedExtractedConcept>,
  constraints: Pass1Result
): EnhancedExtractedConcept {
  // Validate name
  const name = (concept.name || '').trim();
  if (name.length < 2 || name.length > 100) {
    throw new EnhancedConceptExtractionError(
      `Invalid concept name length: ${name.length}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate definition
  const definition = (concept.definition || '').trim();
  if (!definition) {
    throw new EnhancedConceptExtractionError(
      `Missing definition for concept: ${name}`,
      'VALIDATION_ERROR'
    );
  }

  // Normalize key points
  const keyPoints = Array.isArray(concept.key_points)
    ? concept.key_points.map((p) => String(p).trim()).filter((p) => p.length > 0)
    : [];

  // Validate cognitive type
  const cognitiveType = COGNITIVE_TYPES.includes(concept.cognitive_type as CognitiveType)
    ? (concept.cognitive_type as CognitiveType)
    : 'conceptual';

  // Normalize difficulty
  let difficulty = Math.round(Number(concept.difficulty) || 5);
  if (difficulty < 1) difficulty = 1;
  if (difficulty > 10) difficulty = 10;

  // Normalize tier
  let tier = Number(concept.tier) || 2;
  if (tier < 1) tier = 1;
  if (tier > 3) tier = 3;

  // Normalize mentioned_only
  const mentionedOnly = Boolean(concept.mentioned_only);

  // Normalize bloom_level with ceiling enforcement
  let bloomLevel: BloomLevel = (concept.bloom_level as BloomLevel) || 'understand';
  if (!BLOOM_LEVEL_ORDER.includes(bloomLevel)) {
    bloomLevel = 'understand';
  }
  // Enforce ceiling
  if (exceedsBloomCeiling(bloomLevel, constraints.bloomCeiling)) {
    bloomLevel = constraints.bloomCeiling;
  }

  // Normalize definition_provided
  const definitionProvided = concept.definition_provided !== false;

  // Normalize time allocation
  let timeAllocationPercent = Number(concept.time_allocation_percent) || 0;
  if (timeAllocationPercent < 0) timeAllocationPercent = 0;
  if (timeAllocationPercent > 100) timeAllocationPercent = 100;

  // Normalize one_sentence_summary
  const oneSentenceSummary =
    (concept.one_sentence_summary || '').trim() || definition.split('.')[0];

  // Normalize why_it_matters
  const whyItMatters = (concept.why_it_matters || '').trim() || '';

  // Normalize learning_objectives
  const learningObjectives: LearningObjective[] = Array.isArray(
    concept.learning_objectives
  )
    ? concept.learning_objectives
        .slice(0, 3)
        .map((obj: Partial<LearningObjective>) => ({
          bloom_verb: String(
            obj.bloom_verb || BLOOM_VERBS[bloomLevel]?.[0] || 'Understand'
          ),
          objective_statement: String(
            obj.objective_statement ||
              `You will be able to understand ${name}`
          ),
          success_criteria: Array.isArray(obj.success_criteria)
            ? obj.success_criteria.map(String).slice(0, 3)
            : [],
        }))
    : [];

  // Normalize assessment_spec
  const assessmentSpec: AssessmentSpec | undefined = concept.assessment_spec
    ? {
        appropriate_question_types: Array.isArray(
          concept.assessment_spec.appropriate_question_types
        )
          ? (concept.assessment_spec.appropriate_question_types as QuestionType[])
          : ['multiple_choice'],
        inappropriate_question_types: Array.isArray(
          concept.assessment_spec.inappropriate_question_types
        )
          ? (concept.assessment_spec.inappropriate_question_types as QuestionType[])
          : [],
        sample_questions: Array.isArray(
          concept.assessment_spec.sample_questions
        )
          ? concept.assessment_spec.sample_questions.slice(0, 2)
          : [],
        mastery_indicators: Array.isArray(
          concept.assessment_spec.mastery_indicators
        )
          ? concept.assessment_spec.mastery_indicators.map(String).slice(0, 3)
          : [],
        mastery_threshold:
          Number(concept.assessment_spec.mastery_threshold) || 0.8,
      }
    : undefined;

  // Normalize source_mapping
  const sourceMapping: SourceMapping | undefined = concept.source_mapping
    ? {
        primary_segment: concept.source_mapping.primary_segment || {
          start_sec: 0,
          end_sec: 0,
        },
        key_moments: Array.isArray(concept.source_mapping.key_moments)
          ? concept.source_mapping.key_moments.slice(0, 5)
          : [],
        review_clip: concept.source_mapping.review_clip || {
          start_sec: 0,
          end_sec: 0,
        },
      }
    : undefined;

  return {
    name,
    definition,
    key_points: keyPoints.length > 0 ? keyPoints : [definition],
    cognitive_type: cognitiveType,
    difficulty,
    source_timestamps: concept.source_timestamps,
    tier: tier as ConceptTier,
    mentioned_only: mentionedOnly,
    bloom_level: bloomLevel,
    definition_provided: definitionProvided,
    time_allocation_percent: timeAllocationPercent,
    // Enhanced pedagogical fields
    one_sentence_summary: oneSentenceSummary,
    why_it_matters: whyItMatters,
    learning_objectives:
      learningObjectives.length > 0 ? learningObjectives : undefined,
    assessment_spec: assessmentSpec,
    source_mapping: sourceMapping,
  };
}

/**
 * Maximum content length before chunking
 */
const MAX_CONTENT_LENGTH = 50000;

/**
 * Chunk content at sentence boundaries
 */
function chunkContent(text: string, maxLength: number = MAX_CONTENT_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

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
 * Create an enhanced concept extraction service instance
 */
export function createEnhancedConceptExtractionService(
  supabase: SupabaseClient,
  aiService: AIService
): EnhancedConceptExtractionService {
  /**
   * Core extraction function
   */
  async function extractConcepts(
    text: string,
    constraints: Pass1Result,
    segments?: { start: number; end: number; text: string }[],
    sourceId?: string
  ): Promise<EnhancedExtractedConcept[]> {
    const logId = sourceId || `extraction-${Date.now()}`;

    if (!text || text.trim() === '') {
      return [];
    }

    const chunks = chunkContent(text);
    const allConcepts: EnhancedExtractedConcept[] = [];

    logInput('enhanced_concept_extraction', logId, {
      text_length: text.length,
      segments_count: segments?.length || 0,
      chunks_count: chunks.length,
      constraints: {
        content_type: constraints.contentType,
        bloom_ceiling: constraints.bloomCeiling,
        extraction_depth: constraints.extractionDepth,
      },
    });

    const timer = startTimer();

    for (const chunk of chunks) {
      try {
        const response = await sendStructuredMessage<Partial<EnhancedExtractedConcept>[]>(
          aiService,
          {
            systemPrompt: buildSystemPrompt(constraints),
            userMessage: buildUserMessage(chunk, segments),
            options: {
              model: 'claude-sonnet', // Complex extraction needs Sonnet
              temperature: 0.3,
            },
          }
        );

        if (Array.isArray(response.data)) {
          for (const rawConcept of response.data) {
            try {
              const normalized = normalizeExtractedConcept(rawConcept, constraints);
              allConcepts.push(normalized);
            } catch {
              // Skip invalid concepts
            }
          }
        }
      } catch (error) {
        logError('enhanced_concept_extraction', logId, error as Error);
        throw new EnhancedConceptExtractionError(
          `Extraction failed: ${(error as Error).message}`,
          'EXTRACTION_FAILED',
          { cause: error }
        );
      }
    }

    // Log output
    const mentionedCount = allConcepts.filter((c) => c.mentioned_only).length;
    logOutput(
      'enhanced_concept_extraction',
      logId,
      {
        total_concepts: allConcepts.length,
        mentioned_only_count: mentionedCount,
        learning_objective_count: allConcepts.length - mentionedCount,
        tier_distribution: {
          tier1: allConcepts.filter((c) => c.tier === 1).length,
          tier2: allConcepts.filter((c) => c.tier === 2).length,
          tier3: allConcepts.filter((c) => c.tier === 3).length,
        },
        bloom_distribution: BLOOM_LEVEL_ORDER.reduce(
          (acc, level) => {
            acc[level] = allConcepts.filter((c) => c.bloom_level === level).length;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      timer.stop()
    );

    return allConcepts;
  }

  /**
   * Store concepts in database
   */
  async function storeConcepts(
    projectId: string,
    sourceId: string,
    concepts: EnhancedExtractedConcept[]
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
      // Three-pass fields
      tier: c.tier,
      mentioned_only: c.mentioned_only,
      bloom_level: c.bloom_level,
      definition_provided: c.definition_provided,
      time_allocation_percent: c.time_allocation_percent,
      is_legacy: false,
      // Enhanced pedagogical fields
      one_sentence_summary: c.one_sentence_summary,
      why_it_matters: c.why_it_matters,
      learning_objectives: c.learning_objectives || [],
      assessment_spec: c.assessment_spec,
      source_mapping: c.source_mapping,
    }));

    const { data, error } = await supabase
      .from('concepts')
      .insert(conceptInserts)
      .select();

    if (error) {
      throw new EnhancedConceptExtractionError(
        `Failed to store concepts: ${error.message}`,
        'DATABASE_ERROR',
        { projectId, sourceId }
      );
    }

    return (data as Concept[]) || [];
  }

  return {
    async extractWithConstraints(
      text: string,
      constraints: Pass1Result,
      segments?: { start: number; end: number; text: string }[]
    ): Promise<Pass2Result> {
      const concepts = await extractConcepts(text, constraints, segments);

      const mentionedOnlyCount = concepts.filter((c) => c.mentioned_only).length;

      return {
        concepts,
        pass1Constraints: constraints,
        mentionedOnlyCount,
        learningObjectiveCount: concepts.length - mentionedOnlyCount,
      };
    },

    async extractFromTranscription(
      projectId: string,
      sourceId: string,
      transcription: Transcription,
      constraints: Pass1Result
    ): Promise<Concept[]> {
      const concepts = await extractConcepts(
        transcription.full_text,
        constraints,
        transcription.segments,
        sourceId
      );

      return storeConcepts(projectId, sourceId, concepts);
    },

    async extractFromText(
      projectId: string,
      sourceId: string,
      text: string,
      constraints: Pass1Result
    ): Promise<Concept[]> {
      const concepts = await extractConcepts(text, constraints, undefined, sourceId);

      return storeConcepts(projectId, sourceId, concepts);
    },
  };
}
