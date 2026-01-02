/**
 * Learning Agenda Service
 *
 * Generates the Learning Agenda - a unified "learning contract" that synthesizes
 * Pass 1 (content classification) and Pass 2 (concept extraction) results into
 * a learner-facing overview.
 *
 * The Learning Agenda answers: "What will I learn and how will I get there?"
 *
 * Key responsibilities:
 * - Generate module title and central question from thesis
 * - Aggregate learning objectives from tier 2-3 concepts
 * - Create learning path with logical phase groupings
 * - Calculate time investment and prerequisites
 * - Define mastery criteria and assessment preview
 *
 * @example
 * ```ts
 * import { createLearningAgendaService } from '@/src/lib/learning-agenda-service';
 * import { createAIService } from '@/src/lib/ai-service';
 *
 * const aiService = createAIService();
 * const agendaService = createLearningAgendaService(aiService);
 *
 * const agenda = await agendaService.generateAgenda(pass1Result, concepts);
 * // agenda: { module_title, central_question, learning_path, ... }
 * ```
 */

import { AIService, sendStructuredMessage } from './ai-service';
import {
  Pass1Result,
  EnhancedExtractedConcept,
  LearningAgenda,
  AgendaKeyConcept,
  AgendaLearningPhase,
} from '@/src/types/three-pass';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for learning agenda operations
 */
export type LearningAgendaErrorCode =
  | 'GENERATION_FAILED'
  | 'VALIDATION_ERROR'
  | 'EMPTY_CONTENT'
  | 'NO_EXPLAINED_CONCEPTS';

/**
 * Custom error class for learning agenda operations
 */
export class LearningAgendaError extends Error {
  code: LearningAgendaErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: LearningAgendaErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LearningAgendaError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validation result for learning agenda
 */
export interface LearningAgendaValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Learning agenda service interface
 */
export interface LearningAgendaService {
  /**
   * Generate a learning agenda from Pass 1 and Pass 2 results
   * @param pass1Result - Result from content classification (Pass 1)
   * @param concepts - Extracted concepts from Pass 2
   * @returns Generated learning agenda
   */
  generateAgenda(
    pass1Result: Pass1Result,
    concepts: EnhancedExtractedConcept[]
  ): Promise<LearningAgenda>;
}

/**
 * System prompt for learning agenda generation
 * Uses Haiku for synthesis since input is structured
 */
const AGENDA_GENERATION_SYSTEM_PROMPT = `You are an expert instructional designer creating a Learning Agenda - a "learning contract" between an educational platform and a learner.

Your task is to synthesize content classification and extracted concepts into a learner-facing overview that answers: "What will I learn and how will I get there?"

Generate a Learning Agenda with these components:

1. **module_title**: A compelling, learnable title (5-10 words) that captures the essence of what will be learned.

2. **central_question**: The question this content answers (e.g., "How do you build a competitive deck?")

3. **thesis_statement**: Preserve the thesis from the input if provided, or null.

4. **learning_promise**: Complete the sentence "After this module, you will be able to..." (1-2 sentences)

5. **module_objectives**: 3-5 aggregated learning objectives with Bloom's verbs. These should be synthesized from concept-level objectives into module-level outcomes.

6. **content_summary**: 2-3 sentence synopsis of what the source covers.

7. **content_type_explanation**: Explain the content type to the learner (e.g., "This is an introductory overview that..." or "This is a conceptual deep-dive that...")

8. **key_concepts**: Array of tier 2-3 concepts with:
   - name: Concept name
   - tier: 2 or 3
   - one_liner: Single sentence explanation
   - why_included: Why this concept matters to the module

9. **learning_path**: Array of 2-4 phases showing logical progression:
   - phase: Number (1, 2, 3...)
   - phase_title: Short title (e.g., "Foundations", "Core Concepts", "Integration")
   - description: What learner achieves in this phase
   - concept_names: Which concepts are covered
   - estimated_minutes: Time for this phase

10. **total_time_minutes**: Total estimated learning time (should match sum of phases)

11. **recommended_session_length**: Suggested session length in minutes (typically 10-20)

12. **prerequisites**: Object with:
    - required: Array of must-know prerequisites (can be empty)
    - helpful: Array of nice-to-have prerequisites

13. **mastery_definition**: Complete "You'll have mastered this when..." (1 sentence)

14. **assessment_preview**: Complete "You'll be tested through..." (1 sentence describing assessment approach)

IMPORTANT:
- Only include tier 2-3 concepts that are NOT marked as mentioned_only
- Time estimates should be realistic for learning, not just watching
- Learning path phases should group related concepts logically
- Prerequisites should be appropriate for the content level

Return a valid JSON object matching the LearningAgenda interface.`;

/**
 * Build user message for agenda generation
 */
function buildAgendaUserMessage(
  pass1Result: Pass1Result,
  concepts: EnhancedExtractedConcept[]
): string {
  // Filter to tier 2-3 concepts that are not mentioned_only
  const keyConcepts = concepts.filter(
    (c) => !c.mentioned_only && (c.tier === 2 || c.tier === 3)
  );

  const conceptSummaries = keyConcepts.map((c) => ({
    name: c.name,
    tier: c.tier,
    definition: c.definition,
    cognitive_type: c.cognitive_type,
    bloom_level: c.bloom_level,
    time_allocation_percent: c.time_allocation_percent,
    one_sentence_summary: c.one_sentence_summary || c.definition,
    why_it_matters: c.why_it_matters,
    learning_objectives: c.learning_objectives,
  }));

  // Calculate total learning time from source duration and multiplier
  const sourceDurationMinutes = pass1Result.sourceDurationSeconds
    ? pass1Result.sourceDurationSeconds / 60
    : 10;
  const estimatedLearningTime = Math.round(
    sourceDurationMinutes * pass1Result.modeMultiplier
  );

  return `## Content Classification (Pass 1)

Content Type: ${pass1Result.contentType}
Thesis Statement: ${pass1Result.thesisStatement || 'Not identified'}
Bloom's Ceiling: ${pass1Result.bloomCeiling}
Source Duration: ${Math.round(sourceDurationMinutes)} minutes
Mode Multiplier: ${pass1Result.modeMultiplier}x
Estimated Learning Time: ${estimatedLearningTime} minutes
Topic Count: ${pass1Result.topicCount || 'Unknown'}

## Key Concepts (Tier 2-3, Explained)

${JSON.stringify(conceptSummaries, null, 2)}

## Instructions

Generate a Learning Agenda that:
1. Creates a compelling module title from the thesis and key concepts
2. Formulates a central question the learner will answer
3. Synthesizes concept-level objectives into 3-5 module objectives
4. Groups concepts into 2-4 logical learning phases
5. Provides accurate time estimates totaling approximately ${estimatedLearningTime} minutes
6. Identifies appropriate prerequisites
7. Defines clear mastery criteria

Return only valid JSON matching the LearningAgenda interface.`;
}

/**
 * Validate a learning agenda
 */
export function validateLearningAgenda(
  agenda: LearningAgenda
): LearningAgendaValidationResult {
  const errors: string[] = [];

  // Required string fields
  if (!agenda.module_title?.trim()) {
    errors.push('module_title is required');
  }

  if (!agenda.central_question?.trim()) {
    errors.push('central_question is required');
  }

  if (!agenda.learning_promise?.trim()) {
    errors.push('learning_promise is required');
  }

  if (!agenda.content_summary?.trim()) {
    errors.push('content_summary is required');
  }

  if (!agenda.content_type_explanation?.trim()) {
    errors.push('content_type_explanation is required');
  }

  if (!agenda.mastery_definition?.trim()) {
    errors.push('mastery_definition is required');
  }

  if (!agenda.assessment_preview?.trim()) {
    errors.push('assessment_preview is required');
  }

  // Array validations
  if (
    !agenda.module_objectives ||
    agenda.module_objectives.length < 1 ||
    agenda.module_objectives.length > 5
  ) {
    errors.push('module_objectives must have 1-5 items');
  }

  if (!agenda.key_concepts || agenda.key_concepts.length === 0) {
    errors.push('key_concepts must not be empty');
  }

  if (!agenda.learning_path || agenda.learning_path.length === 0) {
    errors.push('learning_path must not be empty');
  }

  // Numeric validations
  if (!agenda.total_time_minutes || agenda.total_time_minutes <= 0) {
    errors.push('total_time_minutes must be positive');
  }

  if (
    !agenda.recommended_session_length ||
    agenda.recommended_session_length <= 0
  ) {
    errors.push('recommended_session_length must be positive');
  }

  // Prerequisites validation
  if (!agenda.prerequisites) {
    errors.push('prerequisites is required');
  } else {
    if (!Array.isArray(agenda.prerequisites.required)) {
      errors.push('prerequisites.required must be an array');
    }
    if (!Array.isArray(agenda.prerequisites.helpful)) {
      errors.push('prerequisites.helpful must be an array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize learning agenda from AI response
 */
function normalizeAgenda(raw: LearningAgenda): LearningAgenda {
  return {
    module_title: raw.module_title?.trim() || 'Learning Module',
    central_question: raw.central_question?.trim() || 'What will you learn?',
    thesis_statement: raw.thesis_statement?.trim() || null,
    learning_promise:
      raw.learning_promise?.trim() ||
      'After this module, you will understand the key concepts.',
    module_objectives: Array.isArray(raw.module_objectives)
      ? raw.module_objectives.filter((o) => o?.trim()).slice(0, 5)
      : [],
    content_summary:
      raw.content_summary?.trim() || 'This module covers key concepts.',
    content_type_explanation:
      raw.content_type_explanation?.trim() ||
      'This is an educational module.',
    key_concepts: Array.isArray(raw.key_concepts)
      ? raw.key_concepts.map((c) => ({
          name: c.name?.trim() || 'Concept',
          tier: c.tier === 3 ? 3 : 2,
          one_liner: c.one_liner?.trim() || c.name,
          why_included: c.why_included?.trim() || 'Core concept',
        }))
      : [],
    learning_path: Array.isArray(raw.learning_path)
      ? raw.learning_path.map((p, i) => ({
          phase: p.phase || i + 1,
          phase_title: p.phase_title?.trim() || `Phase ${i + 1}`,
          description: p.description?.trim() || 'Learn key concepts',
          concept_names: Array.isArray(p.concept_names)
            ? p.concept_names.filter((n) => n?.trim())
            : [],
          estimated_minutes: Math.max(1, Math.round(p.estimated_minutes || 10)),
        }))
      : [],
    total_time_minutes: Math.max(1, Math.round(raw.total_time_minutes || 30)),
    recommended_session_length: Math.max(
      5,
      Math.round(raw.recommended_session_length || 15)
    ),
    prerequisites: {
      required: Array.isArray(raw.prerequisites?.required)
        ? raw.prerequisites.required.filter((p) => p?.trim())
        : [],
      helpful: Array.isArray(raw.prerequisites?.helpful)
        ? raw.prerequisites.helpful.filter((p) => p?.trim())
        : [],
    },
    mastery_definition:
      raw.mastery_definition?.trim() ||
      'You will have mastered this when you understand all key concepts.',
    assessment_preview:
      raw.assessment_preview?.trim() ||
      'You will be tested through quizzes and review exercises.',
  };
}

/**
 * Create a learning agenda service instance
 *
 * @param aiService - AI service for Claude API calls
 * @returns Learning agenda service instance
 */
export function createLearningAgendaService(
  aiService: AIService
): LearningAgendaService {
  return {
    async generateAgenda(
      pass1Result: Pass1Result,
      concepts: EnhancedExtractedConcept[]
    ): Promise<LearningAgenda> {
      const timer = startTimer();
      const sourceId = 'agenda-generation';

      try {
        // Validate input
        if (!concepts || concepts.length === 0) {
          throw new LearningAgendaError(
            'No concepts provided for agenda generation',
            'EMPTY_CONTENT'
          );
        }

        // Filter to explained concepts (not mentioned_only)
        const explainedConcepts = concepts.filter((c) => !c.mentioned_only);
        if (explainedConcepts.length === 0) {
          throw new LearningAgendaError(
            'No explained concepts found - all concepts are mentioned_only',
            'NO_EXPLAINED_CONCEPTS'
          );
        }

        // Build prompt
        const userMessage = buildAgendaUserMessage(pass1Result, concepts);

        logInput('learning_agenda_generation', sourceId, {
          contentType: pass1Result.contentType,
          conceptCount: concepts.length,
          explainedCount: explainedConcepts.length,
        });

        // Call AI
        const response = await sendStructuredMessage<LearningAgenda>(
          aiService,
          {
            systemPrompt: AGENDA_GENERATION_SYSTEM_PROMPT,
            userMessage,
            options: {
              model: 'claude-haiku',
              temperature: 0.3,
            },
          }
        );

        // Normalize and validate
        const agenda = normalizeAgenda(response.data);
        const validation = validateLearningAgenda(agenda);

        if (!validation.isValid) {
          logError('learning_agenda_generation', sourceId,
            `Validation failed: ${validation.errors.join(', ')}`
          );
          // Log warning but don't throw - normalization should have fixed issues
          console.warn(
            'Learning agenda validation warnings:',
            validation.errors
          );
        }

        const duration = timer.stop();
        logOutput('learning_agenda_generation', sourceId, {
          moduleTitle: agenda.module_title,
          objectiveCount: agenda.module_objectives.length,
          keyConceptCount: agenda.key_concepts.length,
          phaseCount: agenda.learning_path.length,
          totalTimeMinutes: agenda.total_time_minutes,
        }, duration);

        return agenda;
      } catch (error) {
        timer.stop();

        if (error instanceof LearningAgendaError) {
          throw error;
        }

        logError(
          'learning_agenda_generation',
          sourceId,
          error instanceof Error ? error : new Error(String(error))
        );

        throw new LearningAgendaError(
          `Failed to generate learning agenda: ${(error as Error).message}`,
          'GENERATION_FAILED',
          { cause: error }
        );
      }
    },
  };
}
