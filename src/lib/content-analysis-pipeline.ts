/**
 * Content Analysis Pipeline Orchestration
 *
 * Orchestrates the full analysis flow using the three-pass pedagogical architecture:
 * 1. Fetch source from database
 * 2. Transcribe (if video/audio)
 * 3. Route content (Pass 1: Classify content type, set Bloom's ceiling)
 * 4. Extract concepts (Pass 2: Enhanced extraction with pedagogical metadata)
 * 5. Detect prerequisites (from mentioned_only concepts and AI inference)
 * 6. Build knowledge graph
 * 7. Architect roadmap (Pass 3: Elaboration Theory hierarchy, calibrated time)
 * 8. Validate analysis results
 *
 * Features:
 * - Three-pass pedagogical analysis based on cognitive science
 * - Stage-based progress tracking (0-100%)
 * - Error handling and recovery
 * - Retry from failed stage
 * - Cancellation support
 * - Status tracking in memory
 *
 * @example
 * ```ts
 * import { createContentAnalysisPipeline } from '@/src/lib/content-analysis-pipeline';
 * import { supabase } from '@/src/lib/supabase';
 *
 * const pipeline = createContentAnalysisPipeline(supabase);
 *
 * // Start analysis
 * const status = await pipeline.analyzeSource(sourceId);
 *
 * // Get status
 * const currentStatus = await pipeline.getStatus(sourceId);
 *
 * // Retry failed analysis
 * const retryStatus = await pipeline.retryAnalysis(sourceId);
 *
 * // Cancel ongoing analysis
 * await pipeline.cancelAnalysis(sourceId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Source,
  Concept,
  ConceptRelationship,
  Transcription,
  Roadmap,
} from '@/src/types/database';
import { Pass1Result, Pass3Result } from '@/src/types/three-pass';
import {
  createTranscriptionService,
  TranscriptionService,
} from './transcription-service';
import {
  createConceptExtractionService,
  ConceptExtractionService,
} from './concept-extraction';
import {
  createEnhancedConceptExtractionService,
  EnhancedConceptExtractionService,
} from './enhanced-concept-extraction';
import {
  createRhetoricalRouterService,
  RhetoricalRouterService,
} from './rhetorical-router';
import {
  createKnowledgeGraphService,
  KnowledgeGraphService,
} from './knowledge-graph-service';
import {
  createRoadmapGenerationService,
  RoadmapGenerationService,
} from './roadmap-generation';
import {
  createRoadmapArchitectService,
  RoadmapArchitectService,
} from './roadmap-architect';
import { createAnalysisValidatorService, AnalysisValidatorService, applyValidation } from './analysis-validator';
import { createAIService, AIService } from './ai-service';
import { isYouTubeUrl } from './youtube-url-utils';
import {
  fetchYouTubeTranscript,
  YouTubeTranscriptError,
} from './youtube-transcript-service';
import {
  createMisconceptionService,
  MisconceptionService,
} from './misconception-service';
import {
  createModuleSummaryService,
  ModuleSummaryService,
} from './module-summary-service';
import {
  createLearningAgendaService,
  LearningAgendaService,
} from './learning-agenda-service';
import {
  createPrerequisiteAssessmentService,
  PrerequisiteAssessmentService,
  PrerequisiteDetectionResult,
} from './prerequisite-assessment-service';
import {
  createChapterGenerationService,
  ChapterGenerationService,
} from './chapter-generation-service';
import { EnhancedExtractedConcept, Misconception, LearningAgenda } from '@/src/types/three-pass';

/**
 * Pipeline stages representing the three-pass analysis workflow
 */
export type PipelineStage =
  | 'pending'
  | 'transcribing'
  | 'routing_content'            // Pass 1: Rhetorical Router
  | 'extracting_concepts'        // Pass 2: Enhanced Concept Extraction
  | 'generating_chapters'        // Chapter generation (after concept extraction)
  | 'detecting_prerequisites'    // Prerequisite detection (after concept extraction)
  | 'generating_agenda'          // Learning Agenda generation (after Pass 2)
  | 'generating_misconceptions'  // Misconception generation (after agenda)
  | 'building_graph'
  | 'architecting_roadmap'       // Pass 3: Roadmap Architect
  | 'generating_summary'         // Module summary generation (after Pass 3)
  | 'validating'                 // Validation gate
  | 'completed'
  | 'failed';

/**
 * Array of all pipeline stages for iteration
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  'pending',
  'transcribing',
  'routing_content',
  'extracting_concepts',
  'generating_chapters',
  'detecting_prerequisites',
  'generating_agenda',
  'generating_misconceptions',
  'building_graph',
  'architecting_roadmap',
  'generating_summary',
  'validating',
  'completed',
  'failed',
];

/**
 * Progress ranges for each stage (three-pass architecture with new stages)
 */
const STAGE_PROGRESS: Record<PipelineStage, { start: number; end: number }> = {
  pending: { start: 0, end: 0 },
  transcribing: { start: 0, end: 15 },
  routing_content: { start: 15, end: 20 },
  extracting_concepts: { start: 20, end: 28 },
  generating_chapters: { start: 28, end: 34 },
  detecting_prerequisites: { start: 34, end: 40 },
  generating_agenda: { start: 40, end: 46 },
  generating_misconceptions: { start: 46, end: 52 },
  building_graph: { start: 52, end: 60 },
  architecting_roadmap: { start: 60, end: 74 },
  generating_summary: { start: 74, end: 84 },
  validating: { start: 84, end: 100 },
  completed: { start: 100, end: 100 },
  failed: { start: 0, end: 0 },
};

/**
 * Error codes for pipeline operations
 */
export type ContentAnalysisPipelineErrorCode =
  | 'API_KEY_MISSING'
  | 'SOURCE_NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'PIPELINE_FAILED'
  | 'STAGE_FAILED'
  | 'ANALYSIS_NOT_FOUND'
  | 'CANNOT_RETRY'
  | 'CANCELLED';

/**
 * Custom error class for pipeline operations
 */
export class ContentAnalysisPipelineError extends Error {
  code: ContentAnalysisPipelineErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ContentAnalysisPipelineErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ContentAnalysisPipelineError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Pipeline status tracking
 */
export interface PipelineStatus {
  sourceId: string;
  projectId: string;
  stage: PipelineStage;
  progress: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
  lastFailedStage?: PipelineStage;
  /** Pass 1 result (content classification) */
  pass1Result?: Pass1Result;
  /** Pass 3 result (roadmap architecture) */
  pass3Result?: Pass3Result;
}

/**
 * Options for analyze source
 */
export interface AnalyzeOptions {
  /** Callback when progress updates */
  onProgress?: (progress: number) => void;
  /** Callback when stage changes */
  onStageChange?: (stage: PipelineStage, progress: number) => void;
}

/**
 * Content analysis pipeline interface
 */
export interface ContentAnalysisPipeline {
  /**
   * Start analysis for a source
   * @param sourceId - ID of the source to analyze
   * @param options - Optional callbacks for progress tracking
   * @returns Pipeline status
   */
  analyzeSource(sourceId: string, options?: AnalyzeOptions): Promise<PipelineStatus>;

  /**
   * Get current status of an analysis
   * @param sourceId - ID of the source
   * @returns Pipeline status or null if not found
   */
  getStatus(sourceId: string): Promise<PipelineStatus | null>;

  /**
   * Retry failed analysis from last failed stage
   * @param sourceId - ID of the source
   * @returns Pipeline status
   */
  retryAnalysis(sourceId: string): Promise<PipelineStatus>;

  /**
   * Cancel ongoing analysis
   * @param sourceId - ID of the source
   */
  cancelAnalysis(sourceId: string): Promise<void>;
}

/**
 * In-memory status storage
 */
const pipelineStatuses = new Map<string, PipelineStatus>();

/**
 * Cancellation tokens
 */
const cancellationTokens = new Map<string, boolean>();

/**
 * Check if source type requires transcription
 */
function requiresTranscription(sourceType: string): boolean {
  return sourceType === 'video';
}

/**
 * Check if source is a YouTube URL that needs transcript fetching
 */
function isYouTubeSource(source: Source): boolean {
  return source.type === 'url' && !!source.url && isYouTubeUrl(source.url);
}

/**
 * Create a content analysis pipeline instance
 *
 * @param supabase - Supabase client instance
 * @returns Content analysis pipeline instance
 * @throws ContentAnalysisPipelineError if API key is missing
 */
export function createContentAnalysisPipeline(
  supabase: SupabaseClient
): ContentAnalysisPipeline {
  // Validate API keys
  // NOTE: Using literal process.env access for Babel to inline at bundle time
  const anthropicApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  console.log('[DEBUG] EXPO_PUBLIC_ANTHROPIC_API_KEY value:', anthropicApiKey ? `${anthropicApiKey.substring(0, 10)}...` : 'undefined');
  console.log('[DEBUG] process.env keys:', Object.keys(process.env || {}).filter(k => k.startsWith('EXPO')));
  if (!anthropicApiKey) {
    throw new ContentAnalysisPipelineError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

  // Create a shared AI service instance with explicit API key
  let aiService: AIService;
  try {
    aiService = createAIService({ apiKey: anthropicApiKey });
    console.log('[DEBUG] AIService created successfully');
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create AI service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  // Create service instances using the shared AI service
  let transcriptionService: TranscriptionService | null = null;
  try {
    if (openaiApiKey) {
      transcriptionService = createTranscriptionService(supabase, openaiApiKey);
    }
  } catch {
    // Transcription service is optional - some sources don't need it
  }

  // Three-pass services
  let rhetoricalRouterService: RhetoricalRouterService;
  try {
    rhetoricalRouterService = createRhetoricalRouterService(aiService, supabase);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create rhetorical router service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let enhancedConceptExtractionService: EnhancedConceptExtractionService;
  try {
    enhancedConceptExtractionService = createEnhancedConceptExtractionService(supabase, aiService);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create enhanced concept extraction service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let roadmapArchitectService: RoadmapArchitectService;
  try {
    roadmapArchitectService = createRoadmapArchitectService(supabase, aiService);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create roadmap architect service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  const analysisValidatorService: AnalysisValidatorService = createAnalysisValidatorService();

  // New services for misconception, learning agenda, module summary, prerequisite assessment, and chapter generation
  const misconceptionService: MisconceptionService = createMisconceptionService(aiService, supabase);
  const learningAgendaService: LearningAgendaService = createLearningAgendaService(aiService);
  const moduleSummaryService: ModuleSummaryService = createModuleSummaryService(aiService, supabase);
  const prerequisiteAssessmentService: PrerequisiteAssessmentService = createPrerequisiteAssessmentService(supabase, aiService);
  const chapterGenerationService: ChapterGenerationService = createChapterGenerationService(aiService, supabase);

  // Legacy services (kept for backward compatibility)
  let conceptExtractionService: ConceptExtractionService;
  try {
    conceptExtractionService = createConceptExtractionService(supabase, aiService);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create concept extraction service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let knowledgeGraphService: KnowledgeGraphService;
  try {
    knowledgeGraphService = createKnowledgeGraphService(supabase, aiService);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create knowledge graph service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let roadmapGenerationService: RoadmapGenerationService;
  try {
    roadmapGenerationService = createRoadmapGenerationService(supabase, knowledgeGraphService);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create roadmap generation service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  /**
   * Fetch source from database
   */
  async function fetchSource(sourceId: string): Promise<Source> {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (error || !data) {
      throw new ContentAnalysisPipelineError(
        `Failed to fetch source: ${error?.message || 'Source not found'}`,
        'SOURCE_NOT_FOUND',
        { sourceId }
      );
    }

    return data as Source;
  }

  /**
   * Update status and call callbacks
   */
  function updateStatus(
    status: PipelineStatus,
    stage: PipelineStage,
    progress: number,
    options?: AnalyzeOptions,
    error?: string
  ): void {
    status.stage = stage;
    status.progress = progress;
    if (error) {
      status.error = error;
      status.lastFailedStage = stage;
    }

    pipelineStatuses.set(status.sourceId, status);

    if (options?.onProgress) {
      options.onProgress(progress);
    }
    if (options?.onStageChange) {
      options.onStageChange(stage, progress);
    }
  }

  /**
   * Check if cancelled
   */
  function isCancelled(sourceId: string): boolean {
    return cancellationTokens.get(sourceId) === true;
  }

  /**
   * Run transcription stage for YouTube URLs
   */
  async function runYouTubeTranscriptionStage(
    source: Source,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Transcription> {
    updateStatus(status, 'transcribing', STAGE_PROGRESS.transcribing.start, options);

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    try {
      // Fetch transcript from YouTube
      const youtubeTranscript = await fetchYouTubeTranscript(source.url!);

      // Convert to our Transcription format and save to database
      const transcriptionData = {
        source_id: source.id,
        full_text: youtubeTranscript.fullText,
        segments: youtubeTranscript.segments,
        language: youtubeTranscript.language,
        provider: 'youtube' as const,
        status: 'completed' as const,
      };

      // Insert into database
      const { data, error } = await supabase
        .from('transcriptions')
        .insert(transcriptionData)
        .select()
        .single();

      if (error) {
        throw new ContentAnalysisPipelineError(
          `Failed to save YouTube transcript: ${error.message}`,
          'DATABASE_ERROR',
          { stage: 'transcribing' }
        );
      }

      updateStatus(status, 'transcribing', STAGE_PROGRESS.transcribing.end, options);

      return data as Transcription;
    } catch (error) {
      if (error instanceof YouTubeTranscriptError) {
        throw new ContentAnalysisPipelineError(
          `YouTube transcript error: ${error.message}`,
          'STAGE_FAILED',
          { stage: 'transcribing', youtubeErrorCode: error.code }
        );
      }
      throw error;
    }
  }

  /**
   * Run transcription stage
   */
  async function runTranscriptionStage(
    source: Source,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Transcription | null> {
    // Check if it's a YouTube URL - use YouTube.js for transcripts
    if (isYouTubeSource(source)) {
      return runYouTubeTranscriptionStage(source, status, options);
    }

    if (!requiresTranscription(source.type)) {
      // Skip transcription for non-video/non-YouTube sources
      return null;
    }

    if (!transcriptionService) {
      throw new ContentAnalysisPipelineError(
        'Transcription service not available. Set EXPO_PUBLIC_OPENAI_API_KEY.',
        'STAGE_FAILED',
        { stage: 'transcribing' }
      );
    }

    updateStatus(status, 'transcribing', STAGE_PROGRESS.transcribing.start, options);

    // Start transcription
    const { transcriptionId } = await transcriptionService.startTranscription(source.id);

    // Wait for completion
    let transcriptionStatus = await transcriptionService.getStatus(transcriptionId);
    while (transcriptionStatus === 'pending' || transcriptionStatus === 'processing') {
      if (isCancelled(status.sourceId)) {
        await transcriptionService.cancelTranscription(transcriptionId);
        throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      transcriptionStatus = await transcriptionService.getStatus(transcriptionId);
    }

    if (transcriptionStatus === 'failed') {
      throw new ContentAnalysisPipelineError(
        'Transcription failed',
        'STAGE_FAILED',
        { stage: 'transcribing' }
      );
    }

    updateStatus(status, 'transcribing', STAGE_PROGRESS.transcribing.end, options);

    // Get the completed transcription
    return transcriptionService.getTranscription(source.id);
  }

  /**
   * Get text content from source and transcription
   */
  function getTextContent(source: Source, transcription: Transcription | null): string {
    if (transcription) {
      return transcription.full_text;
    }
    return (source.metadata?.text_content as string) || source.name || '';
  }

  /**
   * Get source duration from metadata or transcription
   */
  function getSourceDuration(source: Source, transcription: Transcription | null): number | undefined {
    // Try metadata first
    const metadataDuration = source.metadata?.duration_seconds as number | undefined;
    if (metadataDuration) {
      return metadataDuration;
    }

    // Try to infer from transcription segments
    if (transcription?.segments && transcription.segments.length > 0) {
      const lastSegment = transcription.segments[transcription.segments.length - 1];
      return Math.ceil(lastSegment.end);
    }

    return undefined;
  }

  /**
   * Run content routing stage (Pass 1: Rhetorical Router)
   * Classifies content type, sets Bloom's ceiling, and extraction constraints
   */
  async function runContentRoutingStage(
    source: Source,
    transcription: Transcription | null,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Pass1Result> {
    updateStatus(
      status,
      'routing_content',
      STAGE_PROGRESS.routing_content.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    const textContent = getTextContent(source, transcription);
    const sourceDuration = getSourceDuration(source, transcription);

    // Run Pass 1: Content classification
    const pass1Result = await rhetoricalRouterService.classifyContent(
      textContent,
      sourceDuration
    );

    // Store Pass 1 result
    await rhetoricalRouterService.storeClassification(
      source.id,
      source.project_id,
      pass1Result
    );

    // Update status with Pass 1 result
    status.pass1Result = pass1Result;
    pipelineStatuses.set(status.sourceId, status);

    updateStatus(
      status,
      'routing_content',
      STAGE_PROGRESS.routing_content.end,
      options
    );

    return pass1Result;
  }

  /**
   * Run enhanced concept extraction stage (Pass 2: Enhanced Concept Extraction)
   * Extracts concepts with pedagogical metadata respecting Pass 1 constraints
   */
  async function runEnhancedConceptExtractionStage(
    source: Source,
    transcription: Transcription | null,
    pass1Result: Pass1Result,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Concept[]> {
    updateStatus(
      status,
      'extracting_concepts',
      STAGE_PROGRESS.extracting_concepts.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    let concepts: Concept[];

    if (transcription) {
      // Extract from transcription with Pass 1 constraints
      concepts = await enhancedConceptExtractionService.extractFromTranscription(
        source.project_id,
        source.id,
        transcription,
        pass1Result
      );
    } else {
      // Extract from text content with Pass 1 constraints
      const textContent =
        (source.metadata?.text_content as string) || source.name || '';
      concepts = await enhancedConceptExtractionService.extractFromText(
        source.project_id,
        source.id,
        textContent,
        pass1Result
      );
    }

    updateStatus(
      status,
      'extracting_concepts',
      STAGE_PROGRESS.extracting_concepts.end,
      options
    );

    return concepts;
  }

  /**
   * Run legacy concept extraction stage (for backward compatibility)
   */
  async function runLegacyConceptExtractionStage(
    source: Source,
    transcription: Transcription | null,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Concept[]> {
    updateStatus(
      status,
      'extracting_concepts',
      STAGE_PROGRESS.extracting_concepts.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    let concepts: Concept[];

    if (transcription) {
      // Extract from transcription
      concepts = await conceptExtractionService.extractFromTranscription(
        source.project_id,
        source.id,
        transcription
      );
    } else {
      // Extract from text content (PDF, URL)
      const textContent =
        (source.metadata?.text_content as string) || source.name || '';
      concepts = await conceptExtractionService.extractFromText(
        source.project_id,
        source.id,
        textContent
      );
    }

    updateStatus(
      status,
      'extracting_concepts',
      STAGE_PROGRESS.extracting_concepts.end,
      options
    );

    return concepts;
  }

  /**
   * Run prerequisite detection stage
   * Detects prerequisites from mentioned_only concepts and AI inference
   * This stage is non-blocking - the pipeline continues even if it fails
   */
  async function runPrerequisiteDetectionStage(
    projectId: string,
    sourceContent: string,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<PrerequisiteDetectionResult | null> {
    updateStatus(
      status,
      'detecting_prerequisites',
      STAGE_PROGRESS.detecting_prerequisites.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    try {
      // Detect prerequisites using the service
      const result = await prerequisiteAssessmentService.detectPrerequisites(
        projectId,
        sourceContent
      );

      updateStatus(
        status,
        'detecting_prerequisites',
        STAGE_PROGRESS.detecting_prerequisites.end,
        options
      );

      return result;
    } catch (error) {
      // Non-blocking: log the error but continue the pipeline
      console.warn(
        'Prerequisite detection failed (non-blocking):',
        (error as Error).message
      );

      updateStatus(
        status,
        'detecting_prerequisites',
        STAGE_PROGRESS.detecting_prerequisites.end,
        options
      );

      return null;
    }
  }

  /**
   * Run knowledge graph building stage
   * Returns the relationships for use in roadmap architect
   */
  async function runKnowledgeGraphStage(
    projectId: string,
    concepts: Concept[],
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<ConceptRelationship[]> {
    updateStatus(status, 'building_graph', STAGE_PROGRESS.building_graph.start, options);

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Build knowledge graph
    await knowledgeGraphService.buildKnowledgeGraph(projectId, concepts);

    // Fetch the relationships that were created
    const { data: relationships, error } = await supabase
      .from('concept_relationships')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.warn('Failed to fetch relationships:', error.message);
    }

    updateStatus(status, 'building_graph', STAGE_PROGRESS.building_graph.end, options);

    return (relationships as ConceptRelationship[]) || [];
  }

  /**
   * Run roadmap architect stage (Pass 3)
   * Builds Elaboration Theory hierarchy with calibrated time estimation
   */
  async function runRoadmapArchitectStage(
    projectId: string,
    concepts: Concept[],
    relationships: ConceptRelationship[],
    pass1Result: Pass1Result,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Pass3Result> {
    updateStatus(
      status,
      'architecting_roadmap',
      STAGE_PROGRESS.architecting_roadmap.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Build roadmap with Elaboration Theory
    const pass3Result = await roadmapArchitectService.buildRoadmap(
      projectId,
      concepts,
      relationships,
      pass1Result
    );

    // Update status with Pass 3 result
    status.pass3Result = pass3Result;
    pipelineStatuses.set(status.sourceId, status);

    updateStatus(
      status,
      'architecting_roadmap',
      STAGE_PROGRESS.architecting_roadmap.end,
      options
    );

    return pass3Result;
  }

  /**
   * Run validation stage
   * Validates analysis results before completion
   */
  async function runValidationStage(
    projectId: string,
    concepts: Concept[],
    pass1Result: Pass1Result,
    pass3Result: Pass3Result,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Roadmap> {
    updateStatus(
      status,
      'validating',
      STAGE_PROGRESS.validating.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Apply validation and get updated Pass 3 result
    const validatedPass3Result = applyValidation(concepts, pass3Result, pass1Result);

    // Log warnings if any
    if (validatedPass3Result.validationResults.warnings.length > 0) {
      console.warn(
        'Analysis validation warnings:',
        validatedPass3Result.validationResults.warnings
      );
    }

    // Store the roadmap with validation results
    const roadmap = await roadmapArchitectService.storeRoadmap(
      projectId,
      validatedPass3Result,
      'Learning Roadmap'
    );

    // Update status with validated Pass 3 result
    status.pass3Result = validatedPass3Result;
    pipelineStatuses.set(status.sourceId, status);

    updateStatus(
      status,
      'validating',
      STAGE_PROGRESS.validating.end,
      options
    );

    return roadmap;
  }

  /**
   * Run legacy roadmap generation stage (for backward compatibility)
   */
  async function runLegacyRoadmapGenerationStage(
    projectId: string,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Roadmap> {
    updateStatus(
      status,
      'architecting_roadmap',
      STAGE_PROGRESS.architecting_roadmap.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Generate roadmap using legacy service
    const roadmap = await roadmapGenerationService.generateRoadmap(projectId);

    updateStatus(
      status,
      'architecting_roadmap',
      STAGE_PROGRESS.architecting_roadmap.end,
      options
    );

    return roadmap;
  }

  /**
   * Run learning agenda generation stage
   * Generates a unified "learning contract" from Pass 1 and Pass 2 results
   */
  async function runLearningAgendaGenerationStage(
    source: Source,
    pass1Result: Pass1Result,
    concepts: Concept[],
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<LearningAgenda> {
    updateStatus(
      status,
      'generating_agenda',
      STAGE_PROGRESS.generating_agenda.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Convert Concept[] to EnhancedExtractedConcept[] format for agenda service
    const enhancedConcepts: EnhancedExtractedConcept[] = concepts.map((concept) => ({
      name: concept.name,
      definition: concept.definition,
      key_points: concept.key_points || [],
      cognitive_type: concept.cognitive_type,
      difficulty: concept.difficulty || 5,
      source_timestamps: concept.source_timestamps as { start: number; end: number }[] | undefined,
      tier: (concept.tier || 2) as 1 | 2 | 3,
      mentioned_only: concept.mentioned_only || false,
      bloom_level: concept.bloom_level || 'understand',
      definition_provided: concept.definition_provided !== false,
      time_allocation_percent: concept.time_allocation_percent || 10,
      one_sentence_summary: concept.one_sentence_summary,
      why_it_matters: concept.why_it_matters,
      learning_objectives: concept.learning_objectives,
    }));

    // Generate learning agenda
    const learningAgenda = await learningAgendaService.generateAgenda(
      pass1Result,
      enhancedConcepts
    );

    // Store learning agenda in source
    const { error } = await supabase
      .from('sources')
      .update({ learning_agenda: learningAgenda })
      .eq('id', source.id);

    if (error) {
      console.warn('Failed to store learning agenda:', error.message);
    }

    updateStatus(
      status,
      'generating_agenda',
      STAGE_PROGRESS.generating_agenda.end,
      options
    );

    return learningAgenda;
  }

  /**
   * Run misconception generation stage
   * Generates common misconceptions for tier 2-3 concepts (not mentioned_only)
   */
  async function runMisconceptionGenerationStage(
    concepts: Concept[],
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Map<string, Misconception[]>> {
    updateStatus(
      status,
      'generating_misconceptions',
      STAGE_PROGRESS.generating_misconceptions.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Convert Concept[] to EnhancedExtractedConcept[] format for misconception service
    const enhancedConcepts: EnhancedExtractedConcept[] = concepts.map((concept) => ({
      name: concept.name,
      definition: concept.definition,
      key_points: concept.key_points || [],
      cognitive_type: concept.cognitive_type,
      difficulty: concept.difficulty || 5,
      source_timestamps: concept.source_timestamps as { start: number; end: number }[] | undefined,
      tier: concept.tier as 1 | 2 | 3,
      mentioned_only: concept.mentioned_only || false,
      bloom_level: concept.bloom_level || 'understand',
      definition_provided: true,
      time_allocation_percent: concept.time_allocation_percent || 10,
    }));

    // Generate misconceptions
    const misconceptionMap = await misconceptionService.generateMisconceptions(enhancedConcepts);

    // Store misconceptions for each concept
    for (const concept of concepts) {
      const misconceptions = misconceptionMap.get(concept.name);
      if (misconceptions && misconceptions.length > 0) {
        await misconceptionService.storeMisconceptions(concept.id, misconceptions);
      }
    }

    updateStatus(
      status,
      'generating_misconceptions',
      STAGE_PROGRESS.generating_misconceptions.end,
      options
    );

    return misconceptionMap;
  }

  /**
   * Run module summary generation stage
   * Generates user-facing module summary after roadmap is built
   */
  async function runModuleSummaryGenerationStage(
    concepts: Concept[],
    pass3Result: Pass3Result,
    roadmapId: string,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<void> {
    updateStatus(
      status,
      'generating_summary',
      STAGE_PROGRESS.generating_summary.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Generate module summary using time calibration from Pass 3
    const moduleSummary = await moduleSummaryService.generateModuleSummary(
      concepts,
      pass3Result.timeCalibration
    );

    // Store module summary in roadmap
    await moduleSummaryService.storeModuleSummary(roadmapId, moduleSummary);

    updateStatus(
      status,
      'generating_summary',
      STAGE_PROGRESS.generating_summary.end,
      options
    );
  }

  /**
   * Run the complete pipeline with three-pass architecture
   */
  async function runPipeline(
    source: Source,
    status: PipelineStatus,
    options?: AnalyzeOptions,
    startFromStage?: PipelineStage
  ): Promise<void> {
    try {
      // Determine where to start - new three-pass stages with agenda, misconception, chapter, and summary generation
      const stages: PipelineStage[] = [
        'transcribing',
        'routing_content',            // Pass 1
        'extracting_concepts',        // Pass 2
        'generating_chapters',        // Chapter generation (after concept extraction)
        'detecting_prerequisites',    // Prerequisite detection (after concept extraction)
        'generating_agenda',          // Learning Agenda generation (after Pass 2)
        'generating_misconceptions',  // Misconception generation (after agenda)
        'building_graph',
        'architecting_roadmap',       // Pass 3
        'generating_summary',         // Module summary generation (after Pass 3)
        'validating',
      ];

      let startIndex = 0;
      if (startFromStage) {
        startIndex = stages.indexOf(startFromStage);
        if (startIndex === -1) startIndex = 0;
      }

      let transcription: Transcription | null = null;
      let pass1Result: Pass1Result | null = null;

      // If starting from a stage after transcribing, fetch existing transcription
      if (startIndex > 0) {
        const { data: existingTranscription } = await supabase
          .from('transcriptions')
          .select('*')
          .eq('source_id', source.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingTranscription) {
          transcription = existingTranscription as Transcription;
        }
      }
      let concepts: Concept[] = [];
      let relationships: ConceptRelationship[] = [];
      let pass3Result: Pass3Result | null = null;
      let roadmapId: string | null = null;

      // Run each stage
      for (let i = startIndex; i < stages.length; i++) {
        const currentStage = stages[i];

        if (isCancelled(status.sourceId)) {
          throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
        }

        switch (currentStage) {
          case 'transcribing':
            transcription = await runTranscriptionStage(source, status, options);
            break;

          case 'routing_content':
            // Pass 1: Content classification
            pass1Result = await runContentRoutingStage(
              source,
              transcription,
              status,
              options
            );
            break;

          case 'extracting_concepts':
            // Pass 2: Enhanced concept extraction with Pass 1 constraints
            if (pass1Result) {
              concepts = await runEnhancedConceptExtractionStage(
                source,
                transcription,
                pass1Result,
                status,
                options
              );
            } else {
              // Fallback to legacy extraction if no Pass 1 result
              concepts = await runLegacyConceptExtractionStage(
                source,
                transcription,
                status,
                options
              );
            }
            break;

          case 'generating_chapters':
            // Generate chapters for video content
            // This stage assigns chapter_sequence and generates open_loop_teaser
            updateStatus(
              status,
              'generating_chapters',
              STAGE_PROGRESS.generating_chapters.start,
              options
            );

            if (isCancelled(status.sourceId)) {
              throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
            }

            if (concepts.length > 0) {
              try {
                concepts = await chapterGenerationService.generateChapters(
                  source.project_id,
                  source.id,
                  concepts,
                  transcription
                );
              } catch (error) {
                // Non-blocking: log the error but continue the pipeline
                console.warn(
                  'Chapter generation failed (non-blocking):',
                  (error as Error).message
                );
              }
            }

            updateStatus(
              status,
              'generating_chapters',
              STAGE_PROGRESS.generating_chapters.end,
              options
            );
            break;

          case 'detecting_prerequisites':
            // Detect prerequisites from mentioned_only concepts and AI inference
            // This is non-blocking - continue even if it fails
            {
              const textContent = getTextContent(source, transcription);
              await runPrerequisiteDetectionStage(
                source.project_id,
                textContent,
                status,
                options
              );
            }
            break;

          case 'generating_agenda':
            // Generate learning agenda from Pass 1 and Pass 2 results
            if (pass1Result && concepts.length > 0) {
              await runLearningAgendaGenerationStage(
                source,
                pass1Result,
                concepts,
                status,
                options
              );
            }
            break;

          case 'generating_misconceptions':
            // Generate misconceptions for tier 2-3 concepts
            if (concepts.length > 0) {
              await runMisconceptionGenerationStage(
                concepts,
                status,
                options
              );
            }
            break;

          case 'building_graph':
            relationships = await runKnowledgeGraphStage(
              source.project_id,
              concepts,
              status,
              options
            );
            break;

          case 'architecting_roadmap':
            // Pass 3: Roadmap architect with Elaboration Theory
            if (pass1Result) {
              pass3Result = await runRoadmapArchitectStage(
                source.project_id,
                concepts,
                relationships,
                pass1Result,
                status,
                options
              );
            } else {
              // Fallback to legacy roadmap if no Pass 1 result
              await runLegacyRoadmapGenerationStage(
                source.project_id,
                status,
                options
              );
            }
            break;

          case 'generating_summary':
            // Generate module summary using time calibration from Pass 3
            // Summary will be stored after roadmap is created in validating stage
            if (pass1Result && pass3Result && concepts.length > 0) {
              // Store roadmap first to get the ID
              const roadmap = await roadmapArchitectService.storeRoadmap(
                source.project_id,
                pass3Result,
                'Learning Roadmap'
              );
              roadmapId = roadmap.id;

              // Generate and store module summary
              await runModuleSummaryGenerationStage(
                concepts,
                pass3Result,
                roadmapId,
                status,
                options
              );
            }
            break;

          case 'validating':
            // Validation stage - applies validation to the stored roadmap
            updateStatus(
              status,
              'validating',
              STAGE_PROGRESS.validating.start,
              options
            );

            if (pass1Result && pass3Result) {
              // If roadmap wasn't created in generating_summary (shouldn't happen normally),
              // create it now
              if (!roadmapId) {
                const roadmap = await roadmapArchitectService.storeRoadmap(
                  source.project_id,
                  pass3Result,
                  'Learning Roadmap'
                );
                roadmapId = roadmap.id;
              }

              // Apply validation - update status with validated Pass 3 result
              const validatedPass3Result = applyValidation(concepts, pass3Result, pass1Result);

              // Log warnings if any
              if (validatedPass3Result.validationResults.warnings.length > 0) {
                console.warn(
                  'Analysis validation warnings:',
                  validatedPass3Result.validationResults.warnings
                );
              }

              // Update the roadmap with validation results
              await supabase
                .from('roadmaps')
                .update({ validation_results: validatedPass3Result.validationResults })
                .eq('id', roadmapId);

              // Update status with validated Pass 3 result
              status.pass3Result = validatedPass3Result;
              pipelineStatuses.set(status.sourceId, status);

              updateStatus(
                status,
                'validating',
                STAGE_PROGRESS.validating.end,
                options
              );
            }
            break;
        }
      }

      // Mark as completed
      status.stage = 'completed';
      status.progress = 100;
      status.completedAt = new Date().toISOString();
      status.error = undefined;
      pipelineStatuses.set(status.sourceId, status);

      if (options?.onProgress) {
        options.onProgress(100);
      }
      if (options?.onStageChange) {
        options.onStageChange('completed', 100);
      }
    } catch (error) {
      // Mark as failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const currentStage = status.stage === 'pending' ? 'transcribing' : status.stage;
      status.stage = 'failed';
      status.error = errorMessage;
      status.lastFailedStage = currentStage as PipelineStage;
      pipelineStatuses.set(status.sourceId, status);

      if (options?.onStageChange) {
        options.onStageChange('failed', status.progress);
      }
    }
  }

  return {
    async analyzeSource(
      sourceId: string,
      options?: AnalyzeOptions
    ): Promise<PipelineStatus> {
      // Clear any previous cancellation
      cancellationTokens.delete(sourceId);

      // Fetch source
      const source = await fetchSource(sourceId);

      // Initialize status
      const status: PipelineStatus = {
        sourceId,
        projectId: source.project_id,
        stage: 'pending',
        progress: 0,
        startedAt: new Date().toISOString(),
      };

      pipelineStatuses.set(sourceId, status);

      // Run the pipeline
      await runPipeline(source, status, options);

      return pipelineStatuses.get(sourceId) || status;
    },

    async getStatus(sourceId: string): Promise<PipelineStatus | null> {
      return pipelineStatuses.get(sourceId) || null;
    },

    async retryAnalysis(sourceId: string): Promise<PipelineStatus> {
      // Get previous status
      const previousStatus = pipelineStatuses.get(sourceId);

      if (!previousStatus) {
        throw new ContentAnalysisPipelineError(
          'No previous analysis found for this source',
          'ANALYSIS_NOT_FOUND',
          { sourceId }
        );
      }

      if (previousStatus.stage !== 'failed') {
        throw new ContentAnalysisPipelineError(
          'Cannot retry analysis that is not in failed state',
          'CANNOT_RETRY',
          { sourceId, currentStage: previousStatus.stage }
        );
      }

      // Clear cancellation
      cancellationTokens.delete(sourceId);

      // Fetch source
      const source = await fetchSource(sourceId);

      // Reset status for retry
      const status: PipelineStatus = {
        sourceId,
        projectId: source.project_id,
        stage: 'pending',
        progress: 0,
        startedAt: new Date().toISOString(),
      };

      pipelineStatuses.set(sourceId, status);

      // Retry from the failed stage
      await runPipeline(source, status, undefined, previousStatus.lastFailedStage);

      return pipelineStatuses.get(sourceId) || status;
    },

    async cancelAnalysis(sourceId: string): Promise<void> {
      // Set cancellation token
      cancellationTokens.set(sourceId, true);

      // Update status if exists
      const status = pipelineStatuses.get(sourceId);
      if (status && status.stage !== 'completed' && status.stage !== 'failed') {
        status.stage = 'failed';
        status.error = 'Analysis cancelled by user';
        pipelineStatuses.set(sourceId, status);
      }
    },
  };
}

/**
 * Get the default content analysis pipeline using environment variables
 *
 * @param supabase - Supabase client instance
 * @returns Content analysis pipeline instance
 * @throws ContentAnalysisPipelineError if required API keys are not set
 */
export function getDefaultContentAnalysisPipeline(
  supabase: SupabaseClient
): ContentAnalysisPipeline {
  return createContentAnalysisPipeline(supabase);
}
