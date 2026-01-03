/**
 * Prerequisite Assessment Service
 *
 * Detects prerequisites from two sources:
 * 1. mentioned_only concepts: Concepts referenced but not explained in source content
 * 2. AI-inferred prerequisites: Foundational knowledge assumed by the content
 *
 * Prerequisites are stored in the database and used for pretest generation.
 *
 * @example
 * ```ts
 * import { createPrerequisiteAssessmentService } from '@/src/lib/prerequisite-assessment-service';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const service = createPrerequisiteAssessmentService(supabase);
 *
 * // Detect prerequisites for a project
 * const prerequisites = await service.detectPrerequisites(projectId);
 *
 * // Get existing prerequisites
 * const existing = await service.getPrerequisites(projectId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Concept } from '@/src/types/database';
import {
  Prerequisite,
  PrerequisiteInsert,
  PrerequisiteSource,
} from '@/src/types/prerequisite';
import {
  createAIService,
  sendStructuredMessage,
  AIService,
} from './ai-service';

/**
 * Error codes for prerequisite assessment operations
 */
export type PrerequisiteAssessmentErrorCode =
  | 'API_KEY_MISSING'
  | 'DETECTION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_CONTENT_AVAILABLE';

/**
 * Custom error class for prerequisite assessment operations
 */
export class PrerequisiteAssessmentError extends Error {
  code: PrerequisiteAssessmentErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: PrerequisiteAssessmentErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PrerequisiteAssessmentError';
    this.code = code;
    this.details = details;
  }
}

/**
 * AI-inferred prerequisite from the model
 */
export interface InferredPrerequisite {
  name: string;
  description: string;
  domain?: string;
  confidence: number;
}

/**
 * Result of prerequisite detection
 */
export interface PrerequisiteDetectionResult {
  /** Prerequisites from mentioned_only concepts */
  mentionedOnly: PrerequisiteInsert[];
  /** AI-inferred domain prerequisites */
  aiInferred: PrerequisiteInsert[];
  /** Combined and deduplicated prerequisites */
  combined: PrerequisiteInsert[];
  /** Prerequisites stored in database */
  stored: Prerequisite[];
}

/**
 * Prerequisite assessment service interface
 */
export interface PrerequisiteAssessmentService {
  /**
   * Detect prerequisites for a project from both sources
   * @param projectId - ID of the project
   * @param sourceContent - Optional source content for AI inference (if not provided, fetches from DB)
   * @returns Detection result with all prerequisites
   */
  detectPrerequisites(
    projectId: string,
    sourceContent?: string
  ): Promise<PrerequisiteDetectionResult>;

  /**
   * Extract prerequisites from mentioned_only concepts
   * @param projectId - ID of the project
   * @returns Array of prerequisites from mentioned_only concepts
   */
  extractMentionedOnlyPrerequisites(
    projectId: string
  ): Promise<PrerequisiteInsert[]>;

  /**
   * Infer domain prerequisites using AI
   * @param projectId - ID of the project
   * @param content - Source content to analyze
   * @returns Array of AI-inferred prerequisites
   */
  inferDomainPrerequisites(
    projectId: string,
    content: string
  ): Promise<PrerequisiteInsert[]>;

  /**
   * Get existing prerequisites for a project
   * @param projectId - ID of the project
   * @returns Array of prerequisites
   */
  getPrerequisites(projectId: string): Promise<Prerequisite[]>;

  /**
   * Clear existing prerequisites for a project
   * @param projectId - ID of the project
   */
  clearPrerequisites(projectId: string): Promise<void>;
}

/**
 * System prompt for AI prerequisite inference
 */
const PREREQUISITE_INFERENCE_SYSTEM_PROMPT = `You are an expert at analyzing educational content to identify assumed prerequisite knowledge. Your task is to identify foundational concepts that the content assumes the learner already knows.

These are concepts that are:
- Referenced but not explained in the content
- Assumed as background knowledge
- Required to understand the main content

For each prerequisite you identify, provide:
1. **name**: A clear, concise name for the prerequisite concept
2. **description**: A brief description of what knowledge is required
3. **domain**: The subject area (e.g., "mathematics", "programming", "physics")
4. **confidence**: A score from 0.0 to 1.0 indicating how confident you are this is a prerequisite

Return a JSON array of prerequisites. Example:
[
  {
    "name": "Basic Algebra",
    "description": "Understanding of variables, equations, and basic algebraic operations",
    "domain": "mathematics",
    "confidence": 0.95
  },
  {
    "name": "Variables and Data Types",
    "description": "Understanding of how to declare and use variables in programming",
    "domain": "programming",
    "confidence": 0.85
  }
]

Guidelines:
- Focus on foundational knowledge that is ASSUMED but NOT EXPLAINED
- Limit to 2-5 most important prerequisites
- Avoid trivial prerequisites (e.g., "knowing how to read")
- Be specific and actionable
- Higher confidence for clearly assumed knowledge`;

/**
 * Build user message for AI prerequisite inference
 */
function buildInferenceUserMessage(content: string): string {
  // Truncate content if too long (to stay within token limits)
  const maxLength = 10000;
  const truncatedContent =
    content.length > maxLength
      ? content.substring(0, maxLength) + '\n\n[Content truncated...]'
      : content;

  return `Based on the following educational content, identify 2-5 prerequisite concepts that the learner is assumed to already know.

These should be foundational concepts that are assumed but not explained in the content.

Content:
${truncatedContent}

Return a JSON array of prerequisites with name, description, domain, and confidence fields.`;
}

/**
 * Normalize prerequisite name for comparison
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Deduplicate prerequisites, with mentioned_only taking precedence
 */
export function deduplicatePrerequisites(
  mentionedOnly: PrerequisiteInsert[],
  aiInferred: PrerequisiteInsert[]
): PrerequisiteInsert[] {
  const seen = new Map<string, PrerequisiteInsert>();

  // Add mentioned_only first (they take precedence)
  for (const prereq of mentionedOnly) {
    const normalizedName = normalizeName(prereq.name);
    seen.set(normalizedName, prereq);
  }

  // Add AI-inferred only if not already seen
  for (const prereq of aiInferred) {
    const normalizedName = normalizeName(prereq.name);
    if (!seen.has(normalizedName)) {
      seen.set(normalizedName, prereq);
    }
  }

  return Array.from(seen.values());
}

/**
 * Create a prerequisite assessment service instance
 *
 * @param supabase - Supabase client instance
 * @param aiService - Optional AI service instance (uses default if not provided)
 * @returns Prerequisite assessment service instance
 * @throws PrerequisiteAssessmentError if API key is missing
 */
export function createPrerequisiteAssessmentService(
  supabase: SupabaseClient,
  aiService?: AIService
): PrerequisiteAssessmentService {
  // Create or use provided AI service
  let service: AIService;
  try {
    service = aiService || createAIService();
  } catch (error) {
    throw new PrerequisiteAssessmentError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  /**
   * Get source content from database
   */
  async function getSourceContent(projectId: string): Promise<string | null> {
    // Get transcriptions for video sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, type')
      .eq('project_id', projectId);

    if (sourcesError) {
      throw new PrerequisiteAssessmentError(
        `Failed to fetch sources: ${sourcesError.message}`,
        'DATABASE_ERROR',
        { projectId }
      );
    }

    if (!sources || sources.length === 0) {
      return null;
    }

    // Get transcriptions
    const sourceIds = sources.map((s) => s.id);
    const { data: transcriptions, error: transError } = await supabase
      .from('transcriptions')
      .select('full_text')
      .in('source_id', sourceIds)
      .eq('status', 'completed');

    if (transError) {
      throw new PrerequisiteAssessmentError(
        `Failed to fetch transcriptions: ${transError.message}`,
        'DATABASE_ERROR',
        { projectId }
      );
    }

    if (transcriptions && transcriptions.length > 0) {
      return transcriptions.map((t) => t.full_text).join('\n\n');
    }

    return null;
  }

  /**
   * Extract prerequisites from mentioned_only concepts
   */
  async function extractMentionedOnlyPrerequisites(
    projectId: string
  ): Promise<PrerequisiteInsert[]> {
    const { data: concepts, error } = await supabase
      .from('concepts')
      .select('*')
      .eq('project_id', projectId)
      .eq('mentioned_only', true);

    if (error) {
      throw new PrerequisiteAssessmentError(
        `Failed to fetch mentioned_only concepts: ${error.message}`,
        'DATABASE_ERROR',
        { projectId }
      );
    }

    if (!concepts || concepts.length === 0) {
      return [];
    }

    return concepts.map((concept: Concept) => ({
      project_id: projectId,
      name: concept.name,
      description: concept.definition || `Knowledge of ${concept.name}`,
      source: 'mentioned_only' as PrerequisiteSource,
      confidence: 1.0, // mentioned_only concepts are definite prerequisites
      domain: null, // Could be inferred from cognitive_type or metadata
    }));
  }

  /**
   * Infer domain prerequisites using AI
   */
  async function inferDomainPrerequisites(
    projectId: string,
    content: string
  ): Promise<PrerequisiteInsert[]> {
    if (!content || content.trim().length === 0) {
      return [];
    }

    try {
      const response = await sendStructuredMessage<InferredPrerequisite[]>(
        service,
        {
          systemPrompt: PREREQUISITE_INFERENCE_SYSTEM_PROMPT,
          userMessage: buildInferenceUserMessage(content),
          options: {
            model: 'claude-sonnet',
            temperature: 0.3, // Lower temperature for consistent output
          },
        }
      );

      if (!Array.isArray(response.data)) {
        return [];
      }

      // Validate and transform AI response
      const validPrerequisites: PrerequisiteInsert[] = [];
      for (const prereq of response.data) {
        // Basic validation
        if (!prereq.name || typeof prereq.name !== 'string') {
          continue;
        }

        // Normalize confidence to valid range
        const confidence = Math.max(
          0,
          Math.min(1, prereq.confidence ?? 0.5)
        );

        // Skip low-confidence prerequisites
        if (confidence < 0.3) {
          continue;
        }

        validPrerequisites.push({
          project_id: projectId,
          name: prereq.name.trim(),
          description:
            prereq.description?.trim() || `Knowledge of ${prereq.name}`,
          source: 'ai_inferred' as PrerequisiteSource,
          confidence,
          domain: prereq.domain?.trim() || null,
        });
      }

      return validPrerequisites;
    } catch (error) {
      throw new PrerequisiteAssessmentError(
        `Failed to infer prerequisites: ${(error as Error).message}`,
        'DETECTION_FAILED',
        { cause: error }
      );
    }
  }

  /**
   * Store prerequisites in database
   * Uses insert since prerequisites table doesn't have a unique constraint on (project_id, name)
   */
  async function storePrerequisites(
    prerequisites: PrerequisiteInsert[]
  ): Promise<Prerequisite[]> {
    if (prerequisites.length === 0) {
      return [];
    }

    // Insert new prerequisites
    const { data, error } = await supabase
      .from('prerequisites')
      .insert(prerequisites)
      .select();

    if (error) {
      throw new PrerequisiteAssessmentError(
        `Failed to store prerequisites: ${error.message}`,
        'DATABASE_ERROR',
        { prerequisites }
      );
    }

    return (data as Prerequisite[]) || [];
  }

  return {
    async detectPrerequisites(
      projectId: string,
      sourceContent?: string
    ): Promise<PrerequisiteDetectionResult> {
      // Clear existing prerequisites to prevent duplicates on re-run
      await this.clearPrerequisites(projectId);

      // Extract mentioned_only prerequisites
      const mentionedOnly = await extractMentionedOnlyPrerequisites(projectId);

      // Get source content if not provided
      let content = sourceContent;
      if (!content) {
        content = await getSourceContent(projectId) || '';
      }

      // Infer AI prerequisites
      const aiInferred = await inferDomainPrerequisites(projectId, content);

      // Deduplicate with mentioned_only taking precedence
      const combined = deduplicatePrerequisites(mentionedOnly, aiInferred);

      // Store in database
      const stored = await storePrerequisites(combined);

      return {
        mentionedOnly,
        aiInferred,
        combined,
        stored,
      };
    },

    extractMentionedOnlyPrerequisites,

    inferDomainPrerequisites,

    async getPrerequisites(projectId: string): Promise<Prerequisite[]> {
      const { data, error } = await supabase
        .from('prerequisites')
        .select('*')
        .eq('project_id', projectId)
        .order('source', { ascending: false }) // mentioned_only > ai_inferred alphabetically
        .order('confidence', { ascending: false }); // higher confidence first

      if (error) {
        throw new PrerequisiteAssessmentError(
          `Failed to fetch prerequisites: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }

      return (data as Prerequisite[]) || [];
    },

    async clearPrerequisites(projectId: string): Promise<void> {
      const { error } = await supabase
        .from('prerequisites')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        throw new PrerequisiteAssessmentError(
          `Failed to clear prerequisites: ${error.message}`,
          'DATABASE_ERROR',
          { projectId }
        );
      }
    },
  };
}

/**
 * Get the default prerequisite assessment service using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Prerequisite assessment service instance
 * @throws PrerequisiteAssessmentError if API key is not set
 */
export function getDefaultPrerequisiteAssessmentService(
  supabase: SupabaseClient
): PrerequisiteAssessmentService {
  return createPrerequisiteAssessmentService(supabase);
}
