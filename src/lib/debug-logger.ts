/**
 * Pipeline Debug Logger
 *
 * Provides detailed logging for the content analysis pipeline with
 * full visibility into API inputs/outputs for Chrome DevTools inspection.
 *
 * @example
 * ```ts
 * import { logInput, logOutput, logError } from './debug-logger';
 *
 * // Log input before API call
 * logInput('concept_extraction', sourceId, { text_length: 1500 });
 *
 * // Log output after API call
 * logOutput('concept_extraction', sourceId, { concepts_count: 5 }, 1200);
 *
 * // Log errors
 * logError('concept_extraction', sourceId, error);
 * ```
 */

/**
 * Pipeline stages for logging (includes three-pass architecture stages)
 */
export type PipelineStage =
  | 'transcription'
  | 'concept_extraction'
  | 'knowledge_graph'
  | 'roadmap'
  // Three-pass pedagogical analysis stages
  | 'rhetorical_router'
  | 'enhanced_concept_extraction'
  | 'chapter_generation'
  | 'chunking_text'
  | 'segmenting_video'
  | 'learning_agenda_generation'
  | 'misconception_generation'
  | 'roadmap_architect'
  | 'module_summary_generation';

/**
 * Log direction types
 */
export type LogDirection = 'INPUT' | 'OUTPUT' | 'ERROR';

/**
 * Pipeline log entry structure
 */
export interface PipelineLog {
  timestamp: string;
  stage: PipelineStage;
  direction: LogDirection;
  sourceId: string;
  duration?: number;
  data: unknown;
  error?: string;
}

/**
 * In-memory log storage
 */
const logs: PipelineLog[] = [];

/**
 * Maximum number of logs to keep in memory
 */
const MAX_LOGS = 1000;

/**
 * Format timestamp for display
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get console color for stage
 */
function getStageColor(stage: PipelineStage): string {
  const colors: Record<PipelineStage, string> = {
    transcription: '#3B82F6',              // Blue
    concept_extraction: '#10B981',          // Green
    knowledge_graph: '#8B5CF6',             // Purple
    roadmap: '#F59E0B',                     // Orange
    // Three-pass pedagogical analysis stages
    rhetorical_router: '#EC4899',           // Pink (Pass 1)
    enhanced_concept_extraction: '#14B8A6', // Teal (Pass 2)
    chapter_generation: '#84CC16',          // Lime (Post Pass 2)
    chunking_text: '#64748B',               // Slate (Text chunking)
    segmenting_video: '#0EA5E9',            // Sky blue (Video segmentation)
    learning_agenda_generation: '#22D3EE',  // Cyan bright (Post Pass 2)
    misconception_generation: '#A855F7',    // Purple bright (Post Pass 2)
    roadmap_architect: '#F97316',           // Orange bright (Pass 3)
    module_summary_generation: '#06B6D4',   // Cyan (Post Pass 3)
  };
  return colors[stage];
}

/**
 * Store log entry
 */
function storeLog(entry: PipelineLog): void {
  logs.push(entry);

  // Trim logs if exceeding max
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
}

/**
 * Log input data before an API call
 *
 * @param stage - Pipeline stage name
 * @param sourceId - Source or project ID
 * @param data - Input data to log
 */
export function logInput(
  stage: PipelineStage,
  sourceId: string,
  data: unknown
): void {
  const entry: PipelineLog = {
    timestamp: formatTimestamp(),
    stage,
    direction: 'INPUT',
    sourceId,
    data,
  };

  storeLog(entry);

  // Console output with styling for Chrome DevTools
  const color = getStageColor(stage);
  console.group(
    `%c[PIPELINE:${stage}:INPUT]%c sourceId=${sourceId}`,
    `color: ${color}; font-weight: bold`,
    'color: inherit'
  );
  console.log('Timestamp:', entry.timestamp);
  console.log('Data:', data);
  console.groupEnd();
}

/**
 * Log output data after an API call
 *
 * @param stage - Pipeline stage name
 * @param sourceId - Source or project ID
 * @param data - Output data to log
 * @param durationMs - Duration of the operation in milliseconds
 */
export function logOutput(
  stage: PipelineStage,
  sourceId: string,
  data: unknown,
  durationMs: number
): void {
  const entry: PipelineLog = {
    timestamp: formatTimestamp(),
    stage,
    direction: 'OUTPUT',
    sourceId,
    duration: durationMs,
    data,
  };

  storeLog(entry);

  // Console output with styling for Chrome DevTools
  const color = getStageColor(stage);
  console.group(
    `%c[PIPELINE:${stage}:OUTPUT]%c ${formatDuration(durationMs)}`,
    `color: ${color}; font-weight: bold`,
    'color: #6B7280'
  );
  console.log('Timestamp:', entry.timestamp);
  console.log('Duration:', formatDuration(durationMs));
  console.log('Data:', data);
  console.groupEnd();
}

/**
 * Log error during an API call
 *
 * @param stage - Pipeline stage name
 * @param sourceId - Source or project ID
 * @param error - Error that occurred
 */
export function logError(
  stage: PipelineStage,
  sourceId: string,
  error: Error | string
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const entry: PipelineLog = {
    timestamp: formatTimestamp(),
    stage,
    direction: 'ERROR',
    sourceId,
    data: null,
    error: errorMessage,
  };

  storeLog(entry);

  // Console output with red styling for errors
  console.group(
    `%c[PIPELINE:${stage}:ERROR]%c sourceId=${sourceId}`,
    'color: #EF4444; font-weight: bold',
    'color: inherit'
  );
  console.log('Timestamp:', entry.timestamp);
  console.error('Error:', errorMessage);
  if (error instanceof Error && error.stack) {
    console.error('Stack:', error.stack);
  }
  console.groupEnd();
}

/**
 * Get stored logs, optionally filtered by sourceId
 *
 * @param sourceId - Optional source ID to filter by
 * @returns Array of pipeline logs
 */
export function getLogs(sourceId?: string): PipelineLog[] {
  if (sourceId) {
    return logs.filter((log) => log.sourceId === sourceId);
  }
  return [...logs];
}

/**
 * Clear all stored logs
 */
export function clearLogs(): void {
  logs.length = 0;
  console.log('%c[PIPELINE] Logs cleared', 'color: #6B7280');
}

/**
 * Export logs as JSON string (useful for debugging)
 *
 * @param sourceId - Optional source ID to filter by
 * @returns JSON string of logs
 */
export function exportLogsAsJSON(sourceId?: string): string {
  const logsToExport = sourceId ? getLogs(sourceId) : getLogs();
  return JSON.stringify(logsToExport, null, 2);
}

/**
 * Log a summary of the pipeline execution
 *
 * @param sourceId - Source ID
 * @param totalDurationMs - Total duration in milliseconds
 * @param stageResults - Results from each stage
 */
export function logPipelineSummary(
  sourceId: string,
  totalDurationMs: number,
  stageResults: Record<PipelineStage, { success: boolean; duration?: number }>
): void {
  console.group(
    '%c[PIPELINE:SUMMARY]%c sourceId=' + sourceId,
    'color: #1F2937; font-weight: bold; background: #F3F4F6; padding: 2px 6px; border-radius: 4px',
    'color: inherit'
  );
  console.log('Total Duration:', formatDuration(totalDurationMs));
  console.log('Stage Results:');

  Object.entries(stageResults).forEach(([stage, result]) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${formatDuration(result.duration)})` : '';
    console.log(`  ${status} ${stage}${duration}`);
  });

  console.groupEnd();
}

/**
 * Create a timer for measuring operation duration
 *
 * @returns Object with stop() method that returns duration in ms
 */
export function startTimer(): { stop: () => number } {
  const start = performance.now();
  return {
    stop: () => Math.round(performance.now() - start),
  };
}
