/**
 * Library Index
 *
 * Re-exports all library utilities from a single entry point for convenient imports.
 *
 * @example
 * ```ts
 * import { validateEmail, validatePassword, supabase } from '@/src/lib';
 * ```
 */

// Environment configuration
export { env, validateEnv, type EnvVariables } from './env';

// Supabase client and utilities
export {
  supabase,
  isNetworkError,
  withOfflineHandling,
  validateSupabaseConnection,
  type SupabaseError,
} from './supabase';

// Form validation utilities
export { validateEmail, validatePassword } from './validation';

// Projects service
export {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  touchProject,
} from './projects';

// File validation utilities
export {
  ALLOWED_VIDEO_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_VIDEO_SIZE,
  MAX_PDF_SIZE,
  validateFileType,
  validateFileSize,
  getSourceTypeFromMime,
  formatFileSize,
  type ValidationResult,
} from './file-validation';

// Sources service
export {
  createSource,
  getSources,
  getSource,
  updateSource,
  deleteSource,
  uploadFile,
  deleteStorageFile,
  type UploadFile,
  type OnProgressCallback,
} from './sources';

// Sources context
export {
  SourcesProvider,
  useSources,
  type SourcesContextValue,
  type SourcesProviderProps,
} from './sources-context';

// DEV ONLY - Development authentication bypass utilities
// REMOVE BEFORE PRODUCTION or ensure these are not used in production code
export {
  isDevEnvironment,
  devSignIn,
  devSignOut,
  getDevAuthState,
  isDevAuthenticated,
  DEV_USER,
  DEV_SESSION,
} from './dev-auth';

// AI Service (Claude API integration)
export {
  createAIService,
  sendMessage,
  sendStructuredMessage,
  getDefaultService,
  resetDefaultService,
  calculateBackoffDelay,
  isRetryableError,
  type AIService,
} from './ai-service';

// Transcription Service (OpenAI Whisper API integration)
export {
  createTranscriptionService,
  getDefaultTranscriptionService,
  TranscriptionError,
  WHISPER_MAX_FILE_SIZE,
  type TranscriptionService,
  type TranscriptionErrorCode,
} from './transcription-service';

// Concept Extraction Service
export {
  createConceptExtractionService,
  getDefaultConceptExtractionService,
  ConceptExtractionError,
  validateExtractedConcept,
  COGNITIVE_TYPES,
  type ConceptExtractionService,
  type ConceptExtractionErrorCode,
  type ExtractedConcept,
} from './concept-extraction';

// Knowledge Graph Service (Concept Relationships)
export {
  createKnowledgeGraphService,
  getDefaultKnowledgeGraphService,
  KnowledgeGraphError,
  validateIdentifiedRelationship,
  RELATIONSHIP_TYPES,
  type KnowledgeGraphService,
  type KnowledgeGraphErrorCode,
  type IdentifiedRelationship,
} from './knowledge-graph-service';

// Roadmap Generation Service
export {
  createRoadmapGenerationService,
  getDefaultRoadmapGenerationService,
  RoadmapGenerationError,
  calculateConceptTime,
  DIFFICULTY_BASE_TIME,
  COGNITIVE_TYPE_MODIFIER,
  type RoadmapGenerationService,
  type RoadmapGenerationErrorCode,
} from './roadmap-generation';

// Content Analysis Pipeline (Orchestration)
export {
  createContentAnalysisPipeline,
  getDefaultContentAnalysisPipeline,
  ContentAnalysisPipelineError,
  PIPELINE_STAGES,
  type ContentAnalysisPipeline,
  type ContentAnalysisPipelineErrorCode,
  type PipelineStage,
  type PipelineStatus,
  type AnalyzeOptions,
} from './content-analysis-pipeline';
