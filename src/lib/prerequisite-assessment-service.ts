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
  PretestQuestion,
  PretestQuestionInsert,
  MiniLesson,
  MiniLessonInsert,
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
  | 'NO_CONTENT_AVAILABLE'
  | 'QUESTION_GENERATION_FAILED'
  | 'MINI_LESSON_GENERATION_FAILED'
  | 'NO_PREREQUISITES_FOUND'
  | 'PREREQUISITE_NOT_FOUND';

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
 * AI-generated pretest question response
 */
export interface GeneratedPretestQuestion {
  question: string;
  correct_answer: string;
  distractors: string[];
  explanation: string;
}

/**
 * AI-generated mini-lesson response
 */
export interface GeneratedMiniLesson {
  title: string;
  content: string;
  key_points: string[];
}

/**
 * Recommendation based on gap analysis
 */
export type GapRecommendation = 'proceed' | 'review_suggested' | 'review_required';

/**
 * Response input for gap analysis
 */
export interface PretestResponseInput {
  question_id: string;
  prerequisite_id: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
}

/**
 * Result of gap analysis
 */
export interface GapAnalysisResult {
  totalPrerequisites: number;
  correct: number;
  percentage: number;
  gaps: Prerequisite[];
  recommendation: GapRecommendation;
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

  /**
   * Generate pretest questions for all prerequisites in a project
   * @param projectId - ID of the project
   * @returns Array of generated and stored pretest questions
   */
  generatePretestQuestions(projectId: string): Promise<PretestQuestion[]>;

  /**
   * Analyze gaps from pretest responses
   * @param pretestSessionId - ID of the pretest session
   * @param responses - Array of pretest responses
   * @returns Gap analysis result with recommendation
   */
  analyzeGaps(
    pretestSessionId: string,
    responses: PretestResponseInput[]
  ): Promise<GapAnalysisResult>;

  /**
   * Generate a mini-lesson for a specific prerequisite
   * @param prerequisiteId - ID of the prerequisite
   * @returns Generated and stored mini-lesson
   */
  generateMiniLesson(prerequisiteId: string): Promise<MiniLesson>;
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
 * System prompt for pretest question generation
 */
const PRETEST_QUESTION_SYSTEM_PROMPT = `You are an expert at creating assessment questions for educational content. Your task is to generate a multiple choice question that tests understanding of a specific prerequisite concept.

Create a question that:
- Tests understanding, not just recall
- Has exactly 4 options (1 correct, 3 distractors)
- Has plausible distractors (wrong but believable)
- Includes a clear explanation of the correct answer

Return a JSON object with this exact format:
{
  "question": "The question text",
  "correct_answer": "The correct answer",
  "distractors": ["Distractor 1", "Distractor 2", "Distractor 3"],
  "explanation": "Why the correct answer is right and why the distractors are wrong"
}

Guidelines:
- Keep the question clear and unambiguous
- Avoid trick questions
- Make distractors plausible but clearly incorrect to someone who understands the concept
- The explanation should be educational`;

/**
 * System prompt for mini-lesson generation
 */
const MINI_LESSON_SYSTEM_PROMPT = `You are an expert educational content creator. Your task is to create a brief mini-lesson that teaches a prerequisite concept to someone who missed it on a pretest.

Create a lesson that:
- Is 2-3 paragraphs long
- Explains what the concept is
- Explains why it matters
- Provides key points to remember
- Uses clear, accessible language

Return a JSON object with this exact format:
{
  "title": "Title for the mini-lesson",
  "content": "The 2-3 paragraph explanation in markdown format",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"]
}

Guidelines:
- Keep it concise and focused
- Use examples where helpful
- Build from foundational understanding
- Make it accessible to beginners`;

/**
 * Build user message for pretest question generation
 */
function buildQuestionUserMessage(prerequisite: Prerequisite): string {
  return `Generate a multiple choice question to test if someone understands:
"${prerequisite.name}: ${prerequisite.description || 'A foundational concept'}"

${prerequisite.domain ? `Domain: ${prerequisite.domain}` : ''}

Return a JSON object with question, correct_answer, distractors (array of 3), and explanation.`;
}

/**
 * Build user message for mini-lesson generation
 */
function buildMiniLessonUserMessage(prerequisite: Prerequisite): string {
  return `Create a brief (2-3 paragraph) explanation of:
"${prerequisite.name}"

${prerequisite.description ? `Context: ${prerequisite.description}` : ''}
${prerequisite.domain ? `Domain: ${prerequisite.domain}` : ''}

The learner got this wrong on a pretest, so explain clearly:
1. What it is
2. Why it matters
3. Key points to remember

Keep it concise and accessible.

Return a JSON object with title, content (markdown string), and key_points (array of strings).`;
}

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

    async generatePretestQuestions(projectId: string): Promise<PretestQuestion[]> {
      // Get all prerequisites for the project
      const prerequisites = await this.getPrerequisites(projectId);

      if (prerequisites.length === 0) {
        throw new PrerequisiteAssessmentError(
          'No prerequisites found for project',
          'NO_PREREQUISITES_FOUND',
          { projectId }
        );
      }

      // Generate a question for each prerequisite
      const generatedQuestions: PretestQuestion[] = [];

      for (const prereq of prerequisites) {
        try {
          // Check if a question already exists for this prerequisite
          const { data: existingQuestion } = await supabase
            .from('pretest_questions')
            .select('*')
            .eq('prerequisite_id', prereq.id)
            .single();

          if (existingQuestion) {
            generatedQuestions.push(existingQuestion as PretestQuestion);
            continue;
          }

          // Generate question using AI
          const response = await sendStructuredMessage<GeneratedPretestQuestion>(
            service,
            {
              systemPrompt: PRETEST_QUESTION_SYSTEM_PROMPT,
              userMessage: buildQuestionUserMessage(prereq),
              options: {
                model: 'claude-sonnet',
                temperature: 0.7, // Slightly higher for variety in questions
              },
            }
          );

          // Validate AI response
          const generated = response.data;
          if (
            !generated.question ||
            !generated.correct_answer ||
            !Array.isArray(generated.distractors) ||
            generated.distractors.length !== 3
          ) {
            throw new Error('Invalid question format from AI');
          }

          // Build options array with correct answer at random position
          const correctIndex = Math.floor(Math.random() * 4);
          const options: string[] = [...generated.distractors];
          options.splice(correctIndex, 0, generated.correct_answer);

          // Store question in database
          const questionInsert: PretestQuestionInsert = {
            prerequisite_id: prereq.id,
            question_text: generated.question,
            options,
            correct_index: correctIndex,
            explanation: generated.explanation || null,
            difficulty: 'basic', // Default to basic for now
          };

          const { data: storedQuestion, error: insertError } = await supabase
            .from('pretest_questions')
            .insert(questionInsert)
            .select()
            .single();

          if (insertError) {
            throw new PrerequisiteAssessmentError(
              `Failed to store question: ${insertError.message}`,
              'DATABASE_ERROR',
              { prerequisiteId: prereq.id }
            );
          }

          generatedQuestions.push(storedQuestion as PretestQuestion);
        } catch (error) {
          // If it's already a PrerequisiteAssessmentError, rethrow
          if (error instanceof PrerequisiteAssessmentError) {
            throw error;
          }
          // Wrap other errors
          throw new PrerequisiteAssessmentError(
            `Failed to generate question for prerequisite "${prereq.name}": ${(error as Error).message}`,
            'QUESTION_GENERATION_FAILED',
            { prerequisiteId: prereq.id, cause: error }
          );
        }
      }

      return generatedQuestions;
    },

    async analyzeGaps(
      pretestSessionId: string,
      responses: PretestResponseInput[]
    ): Promise<GapAnalysisResult> {
      if (responses.length === 0) {
        return {
          totalPrerequisites: 0,
          correct: 0,
          percentage: 100,
          gaps: [],
          recommendation: 'proceed',
        };
      }

      // Group responses by prerequisite
      const responsesByPrereq = new Map<string, PretestResponseInput[]>();
      for (const response of responses) {
        const existing = responsesByPrereq.get(response.prerequisite_id) || [];
        existing.push(response);
        responsesByPrereq.set(response.prerequisite_id, existing);
      }

      // Calculate per-prerequisite scores
      const prerequisiteIds = Array.from(responsesByPrereq.keys());
      const totalPrerequisites = prerequisiteIds.length;
      let correctPrerequisites = 0;
      const gapPrerequisiteIds: string[] = [];

      for (const [prereqId, prereqResponses] of responsesByPrereq.entries()) {
        // A prerequisite is "correct" if all its questions were answered correctly
        const allCorrect = prereqResponses.every((r) => r.is_correct);
        if (allCorrect) {
          correctPrerequisites++;
        } else {
          gapPrerequisiteIds.push(prereqId);
        }
      }

      // Calculate percentage
      const percentage =
        totalPrerequisites > 0
          ? Math.round((correctPrerequisites / totalPrerequisites) * 100)
          : 100;

      // Determine recommendation based on percentage
      let recommendation: GapRecommendation;
      if (percentage === 100) {
        recommendation = 'proceed';
      } else if (percentage >= 50) {
        recommendation = 'review_suggested';
      } else {
        recommendation = 'review_required';
      }

      // Fetch the gap prerequisites
      let gaps: Prerequisite[] = [];
      if (gapPrerequisiteIds.length > 0) {
        const { data: gapData, error: gapError } = await supabase
          .from('prerequisites')
          .select('*')
          .in('id', gapPrerequisiteIds);

        if (gapError) {
          throw new PrerequisiteAssessmentError(
            `Failed to fetch gap prerequisites: ${gapError.message}`,
            'DATABASE_ERROR',
            { pretestSessionId }
          );
        }

        gaps = (gapData as Prerequisite[]) || [];
      }

      return {
        totalPrerequisites,
        correct: correctPrerequisites,
        percentage,
        gaps,
        recommendation,
      };
    },

    async generateMiniLesson(prerequisiteId: string): Promise<MiniLesson> {
      // Check if a mini-lesson already exists
      const { data: existingLesson } = await supabase
        .from('mini_lessons')
        .select('*')
        .eq('prerequisite_id', prerequisiteId)
        .single();

      if (existingLesson) {
        return existingLesson as MiniLesson;
      }

      // Fetch the prerequisite
      const { data: prereq, error: prereqError } = await supabase
        .from('prerequisites')
        .select('*')
        .eq('id', prerequisiteId)
        .single();

      if (prereqError || !prereq) {
        throw new PrerequisiteAssessmentError(
          `Prerequisite not found: ${prerequisiteId}`,
          'PREREQUISITE_NOT_FOUND',
          { prerequisiteId }
        );
      }

      try {
        // Generate mini-lesson using AI
        const response = await sendStructuredMessage<GeneratedMiniLesson>(
          service,
          {
            systemPrompt: MINI_LESSON_SYSTEM_PROMPT,
            userMessage: buildMiniLessonUserMessage(prereq as Prerequisite),
            options: {
              model: 'claude-sonnet',
              temperature: 0.5,
            },
          }
        );

        // Validate AI response
        const generated = response.data;
        if (!generated.title || !generated.content) {
          throw new Error('Invalid mini-lesson format from AI');
        }

        // Estimate reading time (roughly 200 words per minute)
        const wordCount = generated.content.split(/\s+/).length;
        const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));

        // Store mini-lesson in database
        const lessonInsert: MiniLessonInsert = {
          prerequisite_id: prerequisiteId,
          title: generated.title,
          content_markdown: generated.content,
          key_points: generated.key_points || [],
          estimated_minutes: estimatedMinutes,
        };

        const { data: storedLesson, error: insertError } = await supabase
          .from('mini_lessons')
          .insert(lessonInsert)
          .select()
          .single();

        if (insertError) {
          throw new PrerequisiteAssessmentError(
            `Failed to store mini-lesson: ${insertError.message}`,
            'DATABASE_ERROR',
            { prerequisiteId }
          );
        }

        return storedLesson as MiniLesson;
      } catch (error) {
        if (error instanceof PrerequisiteAssessmentError) {
          throw error;
        }
        throw new PrerequisiteAssessmentError(
          `Failed to generate mini-lesson: ${(error as Error).message}`,
          'MINI_LESSON_GENERATION_FAILED',
          { prerequisiteId, cause: error }
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
