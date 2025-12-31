/**
 * Module Summary Service
 *
 * Generates user-facing module summaries after Pass 3 (roadmap building).
 * Provides learners with:
 * - Module overview for content preview
 * - Learning outcomes for motivation
 * - Time investment breakdown
 * - Difficulty assessment
 *
 * This service is called after Pass 3 when we have:
 * - Extracted concepts with their tiers and Bloom levels
 * - Time calibration data from the roadmap architect
 * - The complete learning roadmap
 *
 * @example
 * ```ts
 * import { createModuleSummaryService } from '@/src/lib/module-summary-service';
 * import { createAIService } from '@/src/lib/ai-service';
 *
 * const aiService = createAIService();
 * const summaryService = createModuleSummaryService(aiService, supabase);
 *
 * // Generate module summary from concepts and time calibration
 * const summary = await summaryService.generateModuleSummary(concepts, timeCalibration);
 *
 * // Store summary in roadmap
 * await summaryService.storeModuleSummary(roadmapId, summary);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AIService, sendStructuredMessage } from './ai-service';
import {
  ModuleSummary,
  TimeCalibration,
  DifficultyLevel,
  BloomLevel,
} from '@/src/types/three-pass';
import { Concept } from '@/src/types/database';
import { logInput, logOutput, logError, startTimer } from './debug-logger';

/**
 * Error codes for module summary service operations
 */
export type ModuleSummaryServiceErrorCode =
  | 'GENERATION_FAILED'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NO_CONCEPTS';

/**
 * Custom error class for module summary service operations
 */
export class ModuleSummaryServiceError extends Error {
  code: ModuleSummaryServiceErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ModuleSummaryServiceErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ModuleSummaryServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Raw summary response from AI
 */
interface RawSummaryResponse {
  title: string;
  one_paragraph_summary: string;
  learning_outcomes: string[];
  prerequisites: {
    required: string[];
    helpful: string[];
  };
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  difficulty_explanation: string;
  skills_gained: string[];
}

/**
 * Module summary service interface
 */
export interface ModuleSummaryService {
  /**
   * Generate a module summary from concepts and time calibration data
   *
   * @param concepts - Extracted concepts from Pass 2
   * @param timeCalibration - Time calibration data from Pass 3
   * @returns Generated module summary
   */
  generateModuleSummary(
    concepts: Concept[],
    timeCalibration: TimeCalibration
  ): Promise<ModuleSummary>;

  /**
   * Store module summary in the roadmap record
   *
   * @param roadmapId - Database ID of the roadmap
   * @param summary - Module summary to store
   */
  storeModuleSummary(roadmapId: string, summary: ModuleSummary): Promise<void>;

  /**
   * Retrieve stored module summary for a roadmap
   *
   * @param roadmapId - Database ID of the roadmap
   * @returns Module summary or null if not found
   */
  getModuleSummary(roadmapId: string): Promise<ModuleSummary | null>;
}

/**
 * System prompt for module summary generation
 * Uses Haiku for simple summarization task
 */
const SUMMARY_SYSTEM_PROMPT = `You are an expert educational content designer. Your task is to create a concise, user-facing module summary that helps learners understand what they will learn and what to expect.

Generate a module summary with the following components:

1. **title**: A clear, engaging module title (5-10 words). Should capture the main topic without being generic.

2. **one_paragraph_summary**: A 2-4 sentence summary that explains what this module covers, why it matters, and what learners will gain. Write in second person ("you will learn...").

3. **learning_outcomes**: 3-5 bullet points starting with action verbs (e.g., "Understand...", "Apply...", "Analyze..."). Each outcome should be specific and measurable.

4. **prerequisites**: Knowledge required before starting:
   - **required**: Must-have knowledge (keep to 0-3 items, empty array if none)
   - **helpful**: Nice-to-have knowledge (keep to 0-3 items)

5. **difficulty_level**: One of "beginner", "intermediate", or "advanced" based on:
   - Concept complexity and abstraction level
   - Bloom's taxonomy levels present
   - Prerequisite knowledge requirements

6. **difficulty_explanation**: 1-2 sentences explaining why this difficulty level was assigned.

7. **skills_gained**: 3-5 practical skills or competencies learners will develop (not just knowledge, but abilities they can use).

GUIDELINES:
- Be concise and practical
- Focus on learner benefits
- Use clear, jargon-free language where possible
- Make outcomes specific to the content, not generic
- Prerequisites should be realistic - don't require advanced knowledge for beginner content

Return a JSON object with all these fields.`;

/**
 * Build user message for summary generation
 */
function buildUserMessage(
  concepts: Concept[],
  timeCalibration: TimeCalibration
): string {
  // Filter to non-mentioned-only concepts for the summary
  const coreConcepts = concepts.filter((c) => !c.mentioned_only);

  // Separate by tier for better context
  const tier3 = coreConcepts.filter((c) => c.tier === 3);
  const tier2 = coreConcepts.filter((c) => c.tier === 2);
  const tier1 = coreConcepts.filter((c) => c.tier === 1);

  let message = 'Create a module summary for the following content:\n\n';

  // Add time context
  message += `**Estimated Learning Time**: ${timeCalibration.calculated_learning_time_minutes} minutes\n`;
  if (timeCalibration.source_duration_seconds) {
    const sourceMinutes = Math.round(timeCalibration.source_duration_seconds / 60);
    message += `**Source Duration**: ${sourceMinutes} minutes\n`;
  }
  message += '\n';

  // Add enduring understanding concepts (tier 3)
  if (tier3.length > 0) {
    message += '**Core/Thesis Concepts (Enduring Understanding)**:\n';
    tier3.forEach((c) => {
      message += `- ${c.name}: ${c.definition}\n`;
      if (c.bloom_level) {
        message += `  (Bloom's level: ${c.bloom_level})\n`;
      }
    });
    message += '\n';
  }

  // Add important concepts (tier 2)
  if (tier2.length > 0) {
    message += '**Important Concepts**:\n';
    tier2.forEach((c) => {
      message += `- ${c.name}: ${c.definition}\n`;
    });
    message += '\n';
  }

  // Add familiar concepts (tier 1) briefly
  if (tier1.length > 0) {
    message += `**Background Concepts** (${tier1.length} concepts): `;
    message += tier1.map((c) => c.name).join(', ');
    message += '\n\n';
  }

  // Add Bloom's level distribution for difficulty assessment
  const bloomDistribution = getBloomDistribution(coreConcepts);
  message += '**Bloom\'s Level Distribution**:\n';
  for (const [level, count] of Object.entries(bloomDistribution)) {
    if (count > 0) {
      message += `- ${level}: ${count} concepts\n`;
    }
  }
  message += '\n';

  // Add cognitive type distribution
  const cognitiveTypes = getCognitiveTypeDistribution(coreConcepts);
  message += '**Cognitive Types**: ';
  message += Object.entries(cognitiveTypes)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
  message += '\n';

  return message;
}

/**
 * Get distribution of Bloom's levels across concepts
 */
function getBloomDistribution(concepts: Concept[]): Record<BloomLevel, number> {
  const distribution: Record<BloomLevel, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  };

  for (const concept of concepts) {
    if (concept.bloom_level && concept.bloom_level in distribution) {
      distribution[concept.bloom_level]++;
    }
  }

  return distribution;
}

/**
 * Get distribution of cognitive types across concepts
 */
function getCognitiveTypeDistribution(
  concepts: Concept[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const concept of concepts) {
    const type = concept.cognitive_type;
    distribution[type] = (distribution[type] || 0) + 1;
  }

  return distribution;
}

/**
 * Calculate time investment breakdown from time calibration
 */
function calculateTimeInvestment(
  timeCalibration: TimeCalibration
): ModuleSummary['time_investment'] {
  const totalMinutes = timeCalibration.calculated_learning_time_minutes;
  const sourceMinutes = timeCalibration.source_duration_seconds
    ? Math.round(timeCalibration.source_duration_seconds / 60)
    : Math.round(totalMinutes * 0.4); // Estimate source time as 40% of total if not provided

  const reviewMinutes = totalMinutes - sourceMinutes;

  return {
    source_minutes: sourceMinutes,
    review_minutes: Math.max(0, reviewMinutes),
    total_minutes: totalMinutes,
  };
}

/**
 * Determine difficulty level based on concepts
 */
function assessDifficultyFromConcepts(concepts: Concept[]): DifficultyLevel {
  const coreConcepts = concepts.filter((c) => !c.mentioned_only);

  if (coreConcepts.length === 0) {
    return 'beginner';
  }

  // Calculate average difficulty from concept difficulty scores
  const avgDifficulty =
    coreConcepts.reduce((sum, c) => sum + (c.difficulty || 5), 0) /
    coreConcepts.length;

  // Check for advanced Bloom's levels
  const bloomDistribution = getBloomDistribution(coreConcepts);
  const advancedBloomCount =
    bloomDistribution.analyze +
    bloomDistribution.evaluate +
    bloomDistribution.create;
  const advancedBloomRatio = advancedBloomCount / coreConcepts.length;

  // Check for tier 3 concepts
  const tier3Count = coreConcepts.filter((c) => c.tier === 3).length;
  const tier3Ratio = tier3Count / coreConcepts.length;

  // Scoring for difficulty assessment
  let score = 0;

  // Difficulty score contribution (1-10 scale)
  if (avgDifficulty >= 7) score += 2;
  else if (avgDifficulty >= 5) score += 1;

  // Advanced Bloom's levels contribution
  if (advancedBloomRatio >= 0.4) score += 2;
  else if (advancedBloomRatio >= 0.2) score += 1;

  // Tier 3 concepts contribution
  if (tier3Ratio >= 0.3) score += 2;
  else if (tier3Ratio >= 0.1) score += 1;

  // Determine level based on score
  if (score >= 4) return 'advanced';
  if (score >= 2) return 'intermediate';
  return 'beginner';
}

/**
 * Validate and normalize a module summary response
 */
function validateAndNormalizeSummary(
  raw: RawSummaryResponse,
  timeCalibration: TimeCalibration,
  concepts: Concept[]
): ModuleSummary {
  // Validate and normalize title
  if (!raw.title || typeof raw.title !== 'string') {
    throw new ModuleSummaryServiceError(
      'Invalid response: title is required',
      'VALIDATION_ERROR'
    );
  }

  // Validate and normalize summary
  if (!raw.one_paragraph_summary || typeof raw.one_paragraph_summary !== 'string') {
    throw new ModuleSummaryServiceError(
      'Invalid response: one_paragraph_summary is required',
      'VALIDATION_ERROR'
    );
  }

  // Validate and normalize learning outcomes
  const learningOutcomes = Array.isArray(raw.learning_outcomes)
    ? raw.learning_outcomes.filter((o) => typeof o === 'string').slice(0, 5)
    : [];

  if (learningOutcomes.length < 3) {
    throw new ModuleSummaryServiceError(
      'Invalid response: at least 3 learning outcomes required',
      'VALIDATION_ERROR'
    );
  }

  // Validate and normalize prerequisites
  const prerequisites = {
    required: Array.isArray(raw.prerequisites?.required)
      ? raw.prerequisites.required.filter((p) => typeof p === 'string').slice(0, 3)
      : [],
    helpful: Array.isArray(raw.prerequisites?.helpful)
      ? raw.prerequisites.helpful.filter((p) => typeof p === 'string').slice(0, 3)
      : [],
  };

  // Validate difficulty level
  const validDifficultyLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
  let difficultyLevel: DifficultyLevel;

  if (validDifficultyLevels.includes(raw.difficulty_level as DifficultyLevel)) {
    difficultyLevel = raw.difficulty_level as DifficultyLevel;
  } else {
    // Fall back to calculated difficulty
    difficultyLevel = assessDifficultyFromConcepts(concepts);
  }

  // Validate difficulty explanation
  const difficultyExplanation =
    typeof raw.difficulty_explanation === 'string'
      ? raw.difficulty_explanation.trim()
      : `This module is rated ${difficultyLevel} based on the complexity of concepts covered.`;

  // Validate and normalize skills gained
  const skillsGained = Array.isArray(raw.skills_gained)
    ? raw.skills_gained.filter((s) => typeof s === 'string').slice(0, 5)
    : [];

  // Calculate time investment from time calibration
  const timeInvestment = calculateTimeInvestment(timeCalibration);

  return {
    title: raw.title.trim(),
    one_paragraph_summary: raw.one_paragraph_summary.trim(),
    learning_outcomes: learningOutcomes.map((o) => o.trim()),
    prerequisites,
    time_investment: timeInvestment,
    difficulty_level: difficultyLevel,
    difficulty_explanation: difficultyExplanation,
    skills_gained: skillsGained.map((s) => s.trim()),
  };
}

/**
 * Create a module summary service instance
 *
 * @param aiService - AI service instance for summary generation
 * @param supabase - Optional Supabase client for persistence
 * @returns Module summary service instance
 */
export function createModuleSummaryService(
  aiService: AIService,
  supabase?: SupabaseClient
): ModuleSummaryService {
  return {
    async generateModuleSummary(
      concepts: Concept[],
      timeCalibration: TimeCalibration
    ): Promise<ModuleSummary> {
      const logId = `module-summary-${Date.now()}`;

      // Filter to core concepts for counting
      const coreConcepts = concepts.filter((c) => !c.mentioned_only);

      logInput('module_summary_generation', logId, {
        total_concepts: concepts.length,
        core_concepts: coreConcepts.length,
        mentioned_only_count: concepts.length - coreConcepts.length,
        time_calibration: {
          total_minutes: timeCalibration.calculated_learning_time_minutes,
          source_duration_seconds: timeCalibration.source_duration_seconds,
          mode_multiplier: timeCalibration.mode_multiplier,
        },
      });

      if (coreConcepts.length === 0) {
        throw new ModuleSummaryServiceError(
          'No core concepts available for summary generation',
          'NO_CONCEPTS'
        );
      }

      const timer = startTimer();

      try {
        const response = await sendStructuredMessage<RawSummaryResponse>(
          aiService,
          {
            systemPrompt: SUMMARY_SYSTEM_PROMPT,
            userMessage: buildUserMessage(concepts, timeCalibration),
            options: {
              model: 'claude-haiku', // Simple summarization task
              temperature: 0.3, // Consistent, focused output
            },
          }
        );

        const summary = validateAndNormalizeSummary(
          response.data,
          timeCalibration,
          concepts
        );

        // Log output
        logOutput('module_summary_generation', logId, {
          title: summary.title,
          learning_outcomes_count: summary.learning_outcomes.length,
          prerequisites: {
            required_count: summary.prerequisites.required.length,
            helpful_count: summary.prerequisites.helpful.length,
          },
          difficulty_level: summary.difficulty_level,
          skills_gained_count: summary.skills_gained.length,
          time_investment: summary.time_investment,
        }, timer.stop());

        return summary;
      } catch (error) {
        logError('module_summary_generation', logId, error as Error);

        if (error instanceof ModuleSummaryServiceError) {
          throw error;
        }

        throw new ModuleSummaryServiceError(
          `Module summary generation failed: ${(error as Error).message}`,
          'GENERATION_FAILED',
          { cause: error }
        );
      }
    },

    async storeModuleSummary(
      roadmapId: string,
      summary: ModuleSummary
    ): Promise<void> {
      if (!supabase) {
        throw new ModuleSummaryServiceError(
          'Supabase client required for storage',
          'DATABASE_ERROR'
        );
      }

      if (!roadmapId) {
        throw new ModuleSummaryServiceError(
          'roadmapId is required',
          'VALIDATION_ERROR'
        );
      }

      const { error } = await supabase
        .from('roadmaps')
        .update({ module_summary: summary })
        .eq('id', roadmapId);

      if (error) {
        throw new ModuleSummaryServiceError(
          `Failed to store module summary: ${error.message}`,
          'DATABASE_ERROR',
          { roadmapId }
        );
      }
    },

    async getModuleSummary(roadmapId: string): Promise<ModuleSummary | null> {
      if (!supabase) {
        return null;
      }

      if (!roadmapId) {
        throw new ModuleSummaryServiceError(
          'roadmapId is required',
          'VALIDATION_ERROR'
        );
      }

      const { data, error } = await supabase
        .from('roadmaps')
        .select('module_summary')
        .eq('id', roadmapId)
        .single();

      if (error || !data) {
        return null;
      }

      const raw = data.module_summary;

      if (!raw || typeof raw !== 'object') {
        return null;
      }

      // Validate the stored summary has required fields
      const summary = raw as ModuleSummary;

      if (
        !summary.title ||
        !summary.one_paragraph_summary ||
        !Array.isArray(summary.learning_outcomes)
      ) {
        return null;
      }

      return summary;
    },
  };
}
