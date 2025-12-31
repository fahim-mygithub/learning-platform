/**
 * Rhetorical Router Service (Pass 1)
 *
 * Classifies content type and sets extraction constraints before concept extraction.
 * This is the first pass of the three-pass pedagogical analysis architecture.
 *
 * Key responsibilities:
 * - Classify content as survey, conceptual, or procedural
 * - Identify thesis statement for epitome detection
 * - Set Bloom's ceiling to prevent over-extraction
 * - Calculate time multiplier for calibrated estimation
 * - Determine extraction depth (mentions vs explanations only)
 *
 * @example
 * ```ts
 * import { createRhetoricalRouterService } from '@/src/lib/rhetorical-router';
 * import { createAIService } from '@/src/lib/ai-service';
 *
 * const aiService = createAIService();
 * const router = createRhetoricalRouterService(aiService);
 *
 * const result = await router.classifyContent(transcriptText, durationSeconds);
 * // result: { contentType: 'survey', bloomCeiling: 'understand', ... }
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import {
  ContentType,
  BloomLevel,
  ExtractionDepth,
  Pass1Result,
  ContentAnalysisInsert,
  getModeMultiplier,
  getDefaultBloomCeiling,
} from '@/src/types/three-pass';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for rhetorical router operations
 */
export type RhetoricalRouterErrorCode =
  | 'CLASSIFICATION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Custom error class for rhetorical router operations
 */
export class RhetoricalRouterError extends Error {
  code: RhetoricalRouterErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: RhetoricalRouterErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RhetoricalRouterError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Raw classification result from AI
 */
interface RawClassificationResult {
  content_type: 'survey' | 'conceptual' | 'procedural';
  thesis_statement: string | null;
  bloom_ceiling: BloomLevel;
  extraction_depth: 'mentions' | 'explanations';
  topic_count: number;  // Number of distinct topics/sections
  reasoning: string;
}

/**
 * Rhetorical router service interface
 */
export interface RhetoricalRouterService {
  /**
   * Classify content and set extraction constraints
   * @param text - Full transcript or text content
   * @param sourceDurationSeconds - Duration in seconds (for time calibration)
   * @returns Pass 1 result with content type and constraints
   */
  classifyContent(
    text: string,
    sourceDurationSeconds?: number
  ): Promise<Pass1Result>;

  /**
   * Store classification result in database
   * @param sourceId - Source ID
   * @param projectId - Project ID
   * @param result - Pass 1 result to store
   */
  storeClassification(
    sourceId: string,
    projectId: string,
    result: Pass1Result
  ): Promise<void>;

  /**
   * Get stored classification for a source
   * @param sourceId - Source ID
   * @returns Pass 1 result or null if not found
   */
  getClassification(sourceId: string): Promise<Pass1Result | null>;
}

/**
 * System prompt for content classification
 * Uses Haiku for speed since this is a classification task
 */
const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert educational content analyst. Your task is to classify content type and set appropriate learning constraints.

Analyze the content and determine:

1. **content_type**: Classify as ONE of:
   - "survey": Overview, introduction, "Top 5...", "What is X?", brief coverage of multiple topics
     → Bloom ceiling: understand (no apply/analyze objectives)
     → Time multiplier: 1.5x source duration
   - "conceptual": Deep explanation, "Why X happens", argument-based, theoretical
     → Bloom ceiling: analyze (can include understand and analyze)
     → Time multiplier: 2.5x source duration
   - "procedural": Tutorial, "How to...", step-by-step, hands-on
     → Bloom ceiling: apply (includes remember, understand, apply)
     → Time multiplier: 4.0x source duration

2. **thesis_statement**: The main claim or thesis in 1-2 sentences. Set to null if content is purely informational without a thesis.

3. **bloom_ceiling**: The MAXIMUM Bloom's level this content can support:
   - "remember": Just terminology, names, dates
   - "understand": Explanations, summaries, comparisons
   - "apply": Procedures, worked examples, practice
   - "analyze": Deep structure, relationships, cause-effect
   - "evaluate": Judgment, critique, assessment
   - "create": Synthesis, design, novel solutions

4. **extraction_depth**:
   - "explanations": Only extract concepts that are EXPLAINED in the content
   - "mentions": Also include concepts that are merely referenced

5. **reasoning**: Brief explanation of your classification (1-2 sentences)

6. **topic_count**: Estimate the number of distinct major topics or sections covered

CRITICAL MULTI-TOPIC DETECTION RULES:
1. Count the number of DISTINCT major topics/sections in the content
2. If content covers 3+ distinct topics briefly (< 5 min each): ALWAYS classify as "survey"
3. Short content (< 15 min) + multiple topics = ALMOST ALWAYS "survey"
4. "Three ways to...", "5 things about...", "Types of..." = SURVEY
5. Single-topic deep dive with extended explanation = "conceptual"
6. Step-by-step tutorial with practice = "procedural"

DURATION HEURISTICS:
- Content < 10 min covering 3+ topics → survey (Bloom ceiling: understand)
- Content 10-30 min with single focused argument → conceptual
- Content with hands-on exercises → procedural

CRITICAL RULES:
- Short content (< 10 min) covering multiple topics is almost always "survey"
- Survey content CANNOT have bloom_ceiling above "understand"
- If content provides no definitions for terms, set extraction_depth to "mentions"
- Thesis statement should capture the core message, not just the topic

Return a JSON object with these fields.`;

/**
 * Build user message for classification
 */
function buildClassificationMessage(
  text: string,
  durationSeconds?: number
): string {
  let message = 'Classify the following content:\n\n';

  if (durationSeconds) {
    const minutes = Math.round(durationSeconds / 60);
    message += `[Content Duration: ${minutes} minutes]\n\n`;
  }

  // Truncate very long content to first 15000 chars for classification
  // Classification doesn't need the full text
  const truncatedText =
    text.length > 15000 ? text.slice(0, 15000) + '\n\n[Content truncated...]' : text;

  message += truncatedText;

  return message;
}

/**
 * Validate and normalize classification result
 */
function normalizeClassificationResult(
  raw: RawClassificationResult,
  durationSeconds?: number
): Pass1Result {
  // Validate content type
  const validContentTypes: ContentType[] = ['survey', 'conceptual', 'procedural'];
  if (!validContentTypes.includes(raw.content_type)) {
    throw new RhetoricalRouterError(
      `Invalid content type: ${raw.content_type}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate Bloom's ceiling
  const validBloomLevels: BloomLevel[] = [
    'remember',
    'understand',
    'apply',
    'analyze',
    'evaluate',
    'create',
  ];
  if (!validBloomLevels.includes(raw.bloom_ceiling)) {
    throw new RhetoricalRouterError(
      `Invalid Bloom's ceiling: ${raw.bloom_ceiling}`,
      'VALIDATION_ERROR'
    );
  }

  // Enforce Bloom's ceiling constraints by content type
  let bloomCeiling = raw.bloom_ceiling;
  const defaultCeiling = getDefaultBloomCeiling(raw.content_type);
  const bloomOrder = validBloomLevels;
  const ceilingIndex = bloomOrder.indexOf(bloomCeiling);
  const defaultIndex = bloomOrder.indexOf(defaultCeiling);

  // If AI set a higher ceiling than content type allows, use the default
  if (ceilingIndex > defaultIndex) {
    bloomCeiling = defaultCeiling;
  }

  // Validate extraction depth
  const validDepths: ExtractionDepth[] = ['mentions', 'explanations'];
  const extractionDepth = validDepths.includes(raw.extraction_depth as ExtractionDepth)
    ? (raw.extraction_depth as ExtractionDepth)
    : 'explanations';

  return {
    contentType: raw.content_type,
    thesisStatement: raw.thesis_statement?.trim() || null,
    bloomCeiling,
    modeMultiplier: getModeMultiplier(raw.content_type),
    extractionDepth,
    sourceDurationSeconds: durationSeconds || null,
    conceptDensity: null, // Calculated after concept extraction
    topicCount: raw.topic_count || undefined,
  };
}

/**
 * Create a rhetorical router service instance
 *
 * @param aiService - AI service instance for classification
 * @param supabase - Optional Supabase client for persistence
 * @returns Rhetorical router service instance
 */
export function createRhetoricalRouterService(
  aiService: AIService,
  supabase?: SupabaseClient
): RhetoricalRouterService {
  return {
    async classifyContent(
      text: string,
      sourceDurationSeconds?: number
    ): Promise<Pass1Result> {
      const logId = `classification-${Date.now()}`;

      // Log input
      logInput('rhetorical_router', logId, {
        text_length: text.length,
        duration_seconds: sourceDurationSeconds,
      });

      const timer = startTimer();

      try {
        const response = await sendStructuredMessage<RawClassificationResult>(
          aiService,
          {
            systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
            userMessage: buildClassificationMessage(text, sourceDurationSeconds),
            options: {
              model: 'claude-haiku', // Fast classification
              temperature: 0.2, // Low temperature for consistent classification
            },
          }
        );

        const result = normalizeClassificationResult(
          response.data,
          sourceDurationSeconds
        );

        // Log output
        logOutput(
          'rhetorical_router',
          logId,
          {
            content_type: result.contentType,
            bloom_ceiling: result.bloomCeiling,
            extraction_depth: result.extractionDepth,
            mode_multiplier: result.modeMultiplier,
            has_thesis: result.thesisStatement !== null,
          },
          timer.stop()
        );

        return result;
      } catch (error) {
        logError('rhetorical_router', logId, error as Error);

        if (error instanceof RhetoricalRouterError) {
          throw error;
        }

        throw new RhetoricalRouterError(
          `Content classification failed: ${(error as Error).message}`,
          'CLASSIFICATION_FAILED',
          { cause: error }
        );
      }
    },

    async storeClassification(
      sourceId: string,
      projectId: string,
      result: Pass1Result
    ): Promise<void> {
      if (!supabase) {
        throw new RhetoricalRouterError(
          'Supabase client required for storage',
          'DATABASE_ERROR'
        );
      }

      const insert: ContentAnalysisInsert = {
        source_id: sourceId,
        project_id: projectId,
        content_type: result.contentType,
        thesis_statement: result.thesisStatement,
        bloom_ceiling: result.bloomCeiling,
        mode_multiplier: result.modeMultiplier,
        extraction_depth: result.extractionDepth,
        source_duration_seconds: result.sourceDurationSeconds,
        concept_density: result.conceptDensity,
        topic_count: result.topicCount,
      };

      const { error } = await supabase
        .from('content_analyses')
        .insert(insert);

      if (error) {
        throw new RhetoricalRouterError(
          `Failed to store classification: ${error.message}`,
          'DATABASE_ERROR',
          { sourceId, projectId }
        );
      }
    },

    async getClassification(sourceId: string): Promise<Pass1Result | null> {
      if (!supabase) {
        return null;
      }

      const { data, error } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        contentType: data.content_type as ContentType,
        thesisStatement: data.thesis_statement,
        bloomCeiling: data.bloom_ceiling as BloomLevel,
        modeMultiplier: data.mode_multiplier,
        extractionDepth: data.extraction_depth as ExtractionDepth,
        sourceDurationSeconds: data.source_duration_seconds,
        conceptDensity: data.concept_density,
        topicCount: data.topic_count ?? undefined,
      };
    },
  };
}
