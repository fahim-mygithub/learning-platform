/**
 * Mock Content Analysis Pipeline for Testing
 *
 * Provides predictable responses for testing components that depend on the pipeline.
 * Configurable to simulate different stages, progress, and failure scenarios.
 */

import { SupabaseClient } from '@supabase/supabase-js';

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
  onProgress?: (progress: number) => void;
  onStageChange?: (stage: PipelineStage, progress: number) => void;
}

/**
 * Content analysis pipeline interface
 */
export interface ContentAnalysisPipeline {
  analyzeSource(sourceId: string, options?: AnalyzeOptions): Promise<PipelineStatus>;
  getStatus(sourceId: string): Promise<PipelineStatus | null>;
  retryAnalysis(sourceId: string): Promise<PipelineStatus>;
  cancelAnalysis(sourceId: string): Promise<void>;
}

/**
 * Mock configuration for controlling behavior in tests
 */
export interface MockContentAnalysisPipelineConfig {
  /** Default status to return */
  defaultStatus?: PipelineStatus;
  /** Whether to simulate errors */
  shouldError?: boolean;
  /** Error to throw when shouldError is true */
  errorToThrow?: ContentAnalysisPipelineError | Error;
  /** Stage at which to fail */
  failAtStage?: PipelineStage;
  /** Custom statuses by source ID */
  customStatuses?: Map<string, PipelineStatus>;
  /** Delay in milliseconds before responding */
  responseDelayMs?: number;
  /** Whether the pipeline should complete successfully */
  shouldComplete?: boolean;
}

/**
 * Global mock configuration
 */
let mockConfig: MockContentAnalysisPipelineConfig = {
  shouldError: false,
  shouldComplete: true,
};

/**
 * In-memory status storage for mock
 */
const mockStatuses = new Map<string, PipelineStatus>();

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
 * Configure the mock behavior
 */
export function configureMock(config: Partial<MockContentAnalysisPipelineConfig>): void {
  mockConfig = { ...mockConfig, ...config };
}

/**
 * Reset mock to default configuration
 */
export function resetMock(): void {
  mockConfig = {
    shouldError: false,
    shouldComplete: true,
  };
  mockStatuses.clear();
}

/**
 * Get the current mock configuration
 */
export function getMockConfig(): MockContentAnalysisPipelineConfig {
  return { ...mockConfig };
}

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
 * Helper function to create a delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sample completed pipeline status
 */
export const sampleCompletedStatus: PipelineStatus = {
  sourceId: 'source-123',
  projectId: 'project-456',
  stage: 'completed',
  progress: 100,
  startedAt: '2024-01-01T00:00:00Z',
  completedAt: '2024-01-01T00:01:00Z',
};

/**
 * Sample failed pipeline status
 */
export const sampleFailedStatus: PipelineStatus = {
  sourceId: 'source-123',
  projectId: 'project-456',
  stage: 'failed',
  progress: 25,
  error: 'Transcription failed',
  startedAt: '2024-01-01T00:00:00Z',
  lastFailedStage: 'transcribing',
};

/**
 * Create a mock content analysis pipeline
 */
export function createContentAnalysisPipeline(
  _supabase: SupabaseClient
): ContentAnalysisPipeline {
  // Simulate API key check
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ContentAnalysisPipelineError(
      'API key is required. Set EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  return {
    async analyzeSource(
      sourceId: string,
      options?: AnalyzeOptions
    ): Promise<PipelineStatus> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'analyzeSource',
        args: [sourceId, options],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Simulate error if configured
      if (mockConfig.shouldError) {
        const status: PipelineStatus = {
          sourceId,
          projectId: 'mock-project-id',
          stage: 'failed',
          progress: 0,
          error:
            mockConfig.errorToThrow?.message || 'Mock pipeline error',
          startedAt: new Date().toISOString(),
          lastFailedStage: mockConfig.failAtStage || 'transcribing',
        };
        mockStatuses.set(sourceId, status);
        return status;
      }

      // Check for custom status
      if (mockConfig.customStatuses?.has(sourceId)) {
        const status = mockConfig.customStatuses.get(sourceId)!;
        mockStatuses.set(sourceId, status);
        return status;
      }

      // Simulate stage progression with callbacks
      const stages: PipelineStage[] = [
        'pending',
        'transcribing',
        'extracting_concepts',
        'building_graph',
        'generating_roadmap',
        'completed',
      ];

      const stageProgress: Record<PipelineStage, number> = {
        pending: 0,
        transcribing: 25,
        extracting_concepts: 50,
        building_graph: 75,
        generating_roadmap: 100,
        completed: 100,
        failed: 0,
      };

      // Call progress callbacks for each stage
      for (const stage of stages) {
        const progress = stageProgress[stage];

        if (options?.onProgress) {
          options.onProgress(progress);
        }
        if (options?.onStageChange) {
          options.onStageChange(stage, progress);
        }

        // Check if should fail at this stage
        if (mockConfig.failAtStage === stage) {
          const status: PipelineStatus = {
            sourceId,
            projectId: 'mock-project-id',
            stage: 'failed',
            progress,
            error: `Failed at ${stage} stage`,
            startedAt: new Date().toISOString(),
            lastFailedStage: stage,
          };
          mockStatuses.set(sourceId, status);
          return status;
        }
      }

      // Return completed status
      const status: PipelineStatus = mockConfig.defaultStatus || {
        sourceId,
        projectId: 'mock-project-id',
        stage: 'completed',
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      mockStatuses.set(sourceId, status);
      return status;
    },

    async getStatus(sourceId: string): Promise<PipelineStatus | null> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'getStatus',
        args: [sourceId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Check for custom status
      if (mockConfig.customStatuses?.has(sourceId)) {
        return mockConfig.customStatuses.get(sourceId)!;
      }

      // Check in-memory storage
      return mockStatuses.get(sourceId) || null;
    },

    async retryAnalysis(sourceId: string): Promise<PipelineStatus> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'retryAnalysis',
        args: [sourceId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Check if previous status exists
      const previousStatus = mockStatuses.get(sourceId);
      if (!previousStatus) {
        throw new ContentAnalysisPipelineError(
          'No previous analysis found for this source',
          'ANALYSIS_NOT_FOUND',
          { sourceId }
        );
      }

      // Check if status was failed
      if (previousStatus.stage !== 'failed') {
        throw new ContentAnalysisPipelineError(
          'Cannot retry analysis that is not in failed state',
          'CANNOT_RETRY',
          { sourceId, currentStage: previousStatus.stage }
        );
      }

      // Simulate error on retry if configured
      if (mockConfig.shouldError) {
        const status: PipelineStatus = {
          sourceId,
          projectId: previousStatus.projectId,
          stage: 'failed',
          progress: 0,
          error: mockConfig.errorToThrow?.message || 'Mock retry error',
          startedAt: new Date().toISOString(),
          lastFailedStage: previousStatus.lastFailedStage,
        };
        mockStatuses.set(sourceId, status);
        return status;
      }

      // Return completed status on retry
      const status: PipelineStatus = {
        sourceId,
        projectId: previousStatus.projectId,
        stage: 'completed',
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      mockStatuses.set(sourceId, status);
      return status;
    },

    async cancelAnalysis(sourceId: string): Promise<void> {
      callHistory.push({
        timestamp: Date.now(),
        method: 'cancelAnalysis',
        args: [sourceId],
      });

      // Simulate delay if configured
      if (mockConfig.responseDelayMs && mockConfig.responseDelayMs > 0) {
        await delay(mockConfig.responseDelayMs);
      }

      // Update status if exists
      const status = mockStatuses.get(sourceId);
      if (status && status.stage !== 'completed' && status.stage !== 'failed') {
        status.stage = 'failed';
        status.error = 'Analysis cancelled by user';
        mockStatuses.set(sourceId, status);
      }
    },
  };
}

/**
 * Get the default content analysis pipeline (mock version)
 */
export function getDefaultContentAnalysisPipeline(
  supabase: SupabaseClient
): ContentAnalysisPipeline {
  return createContentAnalysisPipeline(supabase);
}
