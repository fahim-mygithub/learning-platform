/**
 * Content Analysis Pipeline Orchestration
 *
 * Orchestrates the full analysis flow from source upload to roadmap generation:
 * 1. Fetch source from database
 * 2. Transcribe (if video/audio)
 * 3. Extract concepts
 * 4. Build knowledge graph
 * 5. Generate roadmap
 *
 * Features:
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
  Transcription,
  Roadmap,
} from '@/src/types/database';
import {
  createTranscriptionService,
  TranscriptionService,
} from './transcription-service';
import {
  createConceptExtractionService,
  ConceptExtractionService,
} from './concept-extraction';
import {
  createKnowledgeGraphService,
  KnowledgeGraphService,
} from './knowledge-graph-service';
import {
  createRoadmapGenerationService,
  RoadmapGenerationService,
} from './roadmap-generation';

/**
 * Pipeline stages representing the analysis workflow
 */
export type PipelineStage =
  | 'pending'
  | 'transcribing'
  | 'extracting_concepts'
  | 'building_graph'
  | 'generating_roadmap'
  | 'completed'
  | 'failed';

/**
 * Array of all pipeline stages for iteration
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  'pending',
  'transcribing',
  'extracting_concepts',
  'building_graph',
  'generating_roadmap',
  'completed',
  'failed',
];

/**
 * Progress ranges for each stage
 */
const STAGE_PROGRESS: Record<PipelineStage, { start: number; end: number }> = {
  pending: { start: 0, end: 0 },
  transcribing: { start: 0, end: 25 },
  extracting_concepts: { start: 25, end: 50 },
  building_graph: { start: 50, end: 75 },
  generating_roadmap: { start: 75, end: 100 },
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
  const anthropicApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new ContentAnalysisPipelineError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

  // Create service instances
  let transcriptionService: TranscriptionService | null = null;
  try {
    if (openaiApiKey) {
      transcriptionService = createTranscriptionService(supabase, openaiApiKey);
    }
  } catch {
    // Transcription service is optional - some sources don't need it
  }

  let conceptExtractionService: ConceptExtractionService;
  try {
    conceptExtractionService = createConceptExtractionService(supabase);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create concept extraction service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let knowledgeGraphService: KnowledgeGraphService;
  try {
    knowledgeGraphService = createKnowledgeGraphService(supabase);
  } catch (error) {
    throw new ContentAnalysisPipelineError(
      `Failed to create knowledge graph service: ${(error as Error).message}`,
      'API_KEY_MISSING'
    );
  }

  let roadmapGenerationService: RoadmapGenerationService;
  try {
    roadmapGenerationService = createRoadmapGenerationService(supabase);
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
   * Run transcription stage
   */
  async function runTranscriptionStage(
    source: Source,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Transcription | null> {
    if (!requiresTranscription(source.type)) {
      // Skip transcription for non-video sources
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
   * Run concept extraction stage
   */
  async function runConceptExtractionStage(
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
   * Run knowledge graph building stage
   */
  async function runKnowledgeGraphStage(
    projectId: string,
    concepts: Concept[],
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<void> {
    updateStatus(status, 'building_graph', STAGE_PROGRESS.building_graph.start, options);

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Build knowledge graph
    await knowledgeGraphService.buildKnowledgeGraph(projectId, concepts);

    updateStatus(status, 'building_graph', STAGE_PROGRESS.building_graph.end, options);
  }

  /**
   * Run roadmap generation stage
   */
  async function runRoadmapGenerationStage(
    projectId: string,
    status: PipelineStatus,
    options?: AnalyzeOptions
  ): Promise<Roadmap> {
    updateStatus(
      status,
      'generating_roadmap',
      STAGE_PROGRESS.generating_roadmap.start,
      options
    );

    if (isCancelled(status.sourceId)) {
      throw new ContentAnalysisPipelineError('Analysis cancelled', 'CANCELLED');
    }

    // Generate roadmap
    const roadmap = await roadmapGenerationService.generateRoadmap(projectId);

    updateStatus(
      status,
      'generating_roadmap',
      STAGE_PROGRESS.generating_roadmap.end,
      options
    );

    return roadmap;
  }

  /**
   * Run the complete pipeline
   */
  async function runPipeline(
    source: Source,
    status: PipelineStatus,
    options?: AnalyzeOptions,
    startFromStage?: PipelineStage
  ): Promise<void> {
    try {
      // Determine where to start
      const stages: PipelineStage[] = [
        'transcribing',
        'extracting_concepts',
        'building_graph',
        'generating_roadmap',
      ];

      let startIndex = 0;
      if (startFromStage) {
        startIndex = stages.indexOf(startFromStage);
        if (startIndex === -1) startIndex = 0;
      }

      let transcription: Transcription | null = null;
      let concepts: Concept[] = [];

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

          case 'extracting_concepts':
            concepts = await runConceptExtractionStage(
              source,
              transcription,
              status,
              options
            );
            break;

          case 'building_graph':
            await runKnowledgeGraphStage(source.project_id, concepts, status, options);
            break;

          case 'generating_roadmap':
            await runRoadmapGenerationStage(source.project_id, status, options);
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
