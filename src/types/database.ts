/**
 * Database types for Supabase tables
 * These types match the SQL schema defined in the database
 */

// Import three-pass types for internal use
import type {
  BloomLevel as BloomLevelType,
  ConceptTier as ConceptTierType,
  TimeCalibration as TimeCalibrationImport,
  ValidationResults as ValidationResultsImport,
  LearningObjective as LearningObjectiveType,
  AssessmentSpec as AssessmentSpecType,
  SourceMapping as SourceMappingType,
  Misconception as MisconceptionType,
  ModuleSummary as ModuleSummaryImport,
} from './three-pass';

// Re-export three-pass types for convenience
export type {
  ContentType,
  BloomLevel,
  ConceptTier,
  TimeCalibration,
  ValidationResults,
  ContentAnalysis,
  ContentAnalysisInsert,
  LearningObjective,
  AssessmentSpec,
  SampleQuestion,
  SourceMapping,
  Misconception,
  ModuleSummary,
  QuestionType,
  DifficultyLevel,
} from './three-pass';

// Type aliases for internal use
type BloomLevel = BloomLevelType;
type ConceptTier = ConceptTierType;
type TimeCalibration = TimeCalibrationImport;
type ValidationResults = ValidationResultsImport;
type LearningObjective = LearningObjectiveType;
type AssessmentSpec = AssessmentSpecType;
type SourceMapping = SourceMappingType;
type Misconception = MisconceptionType;
type ModuleSummary = ModuleSummaryImport;

/**
 * Project status enum
 */
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';

/**
 * Project record from database
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

/**
 * Data for inserting a new project
 */
export interface ProjectInsert {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  progress?: number;
  // user_id is set by the service from auth context
}

/**
 * Data for updating a project
 */
export interface ProjectUpdate {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  progress?: number;
  last_accessed_at?: string;
}

/**
 * Source type enum
 */
export type SourceType = 'video' | 'pdf' | 'url';

/**
 * Source status enum
 */
export type SourceStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed';

/**
 * Source record from database
 */
export interface Source {
  id: string;
  project_id: string;
  user_id: string;
  type: SourceType;
  name: string;
  url: string | null;
  storage_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: SourceStatus;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Data for inserting a new source
 */
export interface SourceInsert {
  project_id: string;
  type: SourceType;
  name: string;
  url?: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  status?: SourceStatus;
  metadata?: Record<string, unknown>;
  // user_id is set by the service from auth context
}

/**
 * Data for updating a source
 */
export interface SourceUpdate {
  name?: string;
  url?: string | null;
  storage_path?: string | null;
  status?: SourceStatus;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Transcription Types
// ============================================================================

/**
 * Transcription status enum
 */
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Transcription segment with timing information
 */
export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Transcription record from database
 */
export interface Transcription {
  id: string;
  source_id: string;
  full_text: string;
  segments: TranscriptionSegment[];
  language: string;
  confidence: number | null;
  provider: string | null;
  status: TranscriptionStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data for inserting a new transcription
 */
export interface TranscriptionInsert {
  source_id: string;
  full_text: string;
  segments?: TranscriptionSegment[];
  language?: string;
  confidence?: number | null;
  provider?: string | null;
  status?: TranscriptionStatus;
  error_message?: string | null;
}

/**
 * Data for updating a transcription
 */
export interface TranscriptionUpdate {
  full_text?: string;
  segments?: TranscriptionSegment[];
  language?: string;
  confidence?: number | null;
  provider?: string | null;
  status?: TranscriptionStatus;
  error_message?: string | null;
}

// ============================================================================
// Concept Types
// ============================================================================

/**
 * Cognitive type enum based on knowledge taxonomy
 */
export type CognitiveType =
  | 'declarative'
  | 'conceptual'
  | 'procedural'
  | 'conditional'
  | 'metacognitive';

/**
 * Concept record from database
 */
export interface Concept {
  id: string;
  project_id: string;
  source_id: string | null;
  name: string;
  definition: string;
  key_points: string[];
  cognitive_type: CognitiveType;
  difficulty: number | null;
  source_timestamps: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Three-pass pedagogical fields (optional for backward compatibility)
  /** Concept tier: 1=Familiar, 2=Important, 3=Enduring Understanding */
  tier?: ConceptTier;
  /** True if concept mentioned but not explained - excluded from roadmap */
  mentioned_only?: boolean;
  /** Bloom's taxonomy level - drives question generation */
  bloom_level?: BloomLevel;
  /** True if source provided definition */
  definition_provided?: boolean;
  /** Suggested % of learning time for this concept */
  time_allocation_percent?: number | null;
  /** True if concept from pre-three-pass analysis */
  is_legacy?: boolean;

  // Enhanced pedagogical fields (migration 006)
  /** Plain-language one-sentence summary */
  one_sentence_summary?: string;
  /** Why this concept matters to the learner */
  why_it_matters?: string;
  /** Learning objectives with Bloom verbs */
  learning_objectives?: LearningObjective[];
  /** Assessment specification for quiz generation */
  assessment_spec?: AssessmentSpec;
  /** Source mapping for video review timestamps */
  source_mapping?: SourceMapping;
  /** Common misconceptions for targeted tutoring */
  common_misconceptions?: Misconception[];
}

/**
 * Data for inserting a new concept
 */
export interface ConceptInsert {
  project_id: string;
  source_id?: string | null;
  name: string;
  definition: string;
  key_points?: string[];
  cognitive_type: CognitiveType;
  difficulty?: number | null;
  source_timestamps?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  // Three-pass pedagogical fields
  tier?: ConceptTier;
  mentioned_only?: boolean;
  bloom_level?: BloomLevel;
  definition_provided?: boolean;
  time_allocation_percent?: number | null;
  is_legacy?: boolean;
  // Enhanced pedagogical fields (migration 006)
  one_sentence_summary?: string;
  why_it_matters?: string;
  learning_objectives?: LearningObjective[];
  assessment_spec?: AssessmentSpec;
  source_mapping?: SourceMapping;
  common_misconceptions?: Misconception[];
}

/**
 * Data for updating a concept
 */
export interface ConceptUpdate {
  name?: string;
  definition?: string;
  key_points?: string[];
  cognitive_type?: CognitiveType;
  difficulty?: number | null;
  source_timestamps?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  // Three-pass pedagogical fields
  tier?: ConceptTier;
  mentioned_only?: boolean;
  bloom_level?: BloomLevel;
  definition_provided?: boolean;
  time_allocation_percent?: number | null;
  is_legacy?: boolean;
  // Enhanced pedagogical fields (migration 006)
  one_sentence_summary?: string;
  why_it_matters?: string;
  learning_objectives?: LearningObjective[];
  assessment_spec?: AssessmentSpec;
  source_mapping?: SourceMapping;
  common_misconceptions?: Misconception[];
}

// ============================================================================
// Concept Relationship Types
// ============================================================================

/**
 * Relationship type enum for concept connections
 * Includes original types plus RST-based types for elaboration hierarchy
 */
export type RelationshipType =
  | 'prerequisite'
  | 'causal'
  | 'taxonomic'
  | 'temporal'
  | 'contrasts_with'
  // RST-based types for three-pass analysis
  | 'elaboration_of'
  | 'evidence_for'
  | 'example_of'
  | 'definition_of';

/**
 * Concept relationship record from database
 */
export interface ConceptRelationship {
  id: string;
  project_id: string;
  from_concept_id: string;
  to_concept_id: string;
  relationship_type: RelationshipType;
  strength: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Data for inserting a new concept relationship
 */
export interface ConceptRelationshipInsert {
  project_id: string;
  from_concept_id: string;
  to_concept_id: string;
  relationship_type: RelationshipType;
  strength?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Data for updating a concept relationship
 */
export interface ConceptRelationshipUpdate {
  relationship_type?: RelationshipType;
  strength?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Roadmap Types
// ============================================================================

/**
 * Roadmap status enum
 */
export type RoadmapStatus = 'draft' | 'active' | 'completed';

/**
 * Roadmap level structure
 */
export interface RoadmapLevel {
  level: number;
  title: string;
  concept_ids: string[];
  estimated_minutes: number;
}

/**
 * Mastery gate structure for roadmap progression
 */
export interface MasteryGate {
  after_level: number;
  required_score: number;
  quiz_concept_ids: string[];
}

/**
 * Roadmap record from database
 */
export interface Roadmap {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  levels: RoadmapLevel[];
  total_estimated_minutes: number | null;
  mastery_gates: MasteryGate[];
  status: RoadmapStatus;
  created_at: string;
  updated_at: string;

  // Three-pass roadmap architect fields (optional for backward compatibility)
  /** Epitome (thesis) concept ID at Level 0 */
  epitome_concept_id?: string | null;
  /** Time calibration formula components */
  time_calibration?: TimeCalibration;
  /** Validation gate results and warnings */
  validation_results?: ValidationResults;
  /** User-facing module summary with title, description, outcomes */
  module_summary?: ModuleSummary;
}

/**
 * Data for inserting a new roadmap
 */
export interface RoadmapInsert {
  project_id: string;
  title: string;
  description?: string | null;
  levels?: RoadmapLevel[];
  total_estimated_minutes?: number | null;
  mastery_gates?: MasteryGate[];
  status?: RoadmapStatus;
  // Three-pass roadmap architect fields
  epitome_concept_id?: string | null;
  time_calibration?: TimeCalibration;
  validation_results?: ValidationResults;
  module_summary?: ModuleSummary;
}

/**
 * Data for updating a roadmap
 */
export interface RoadmapUpdate {
  title?: string;
  description?: string | null;
  levels?: RoadmapLevel[];
  total_estimated_minutes?: number | null;
  mastery_gates?: MasteryGate[];
  status?: RoadmapStatus;
  // Three-pass roadmap architect fields
  epitome_concept_id?: string | null;
  time_calibration?: TimeCalibration;
  validation_results?: ValidationResults;
  module_summary?: ModuleSummary;
}

// ============================================================================
// Concept State Types (Spaced Repetition)
// ============================================================================

/**
 * Mastery state enum for concept learning progression
 */
export type MasteryState =
  | 'unseen'
  | 'exposed'
  | 'fragile'
  | 'developing'
  | 'solid'
  | 'mastered'
  | 'misconceived';

/**
 * Concept state record from database
 * Tracks mastery state and FSRS parameters per user per concept
 */
export interface ConceptState {
  id: string;
  user_id: string;
  concept_id: string;
  state: MasteryState;
  stability: number;
  difficulty: number;
  due_date: string | null;
  last_review_date: string | null;
  successful_sessions: number;
  consecutive_correct: number;
  session_dates: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Data for inserting a new concept state
 */
export interface ConceptStateInsert {
  user_id: string;
  concept_id: string;
  state?: MasteryState;
  stability?: number;
  difficulty?: number;
  due_date?: string | null;
  last_review_date?: string | null;
  successful_sessions?: number;
  consecutive_correct?: number;
  session_dates?: string[];
}

/**
 * Data for updating a concept state
 */
export interface ConceptStateUpdate {
  state?: MasteryState;
  stability?: number;
  difficulty?: number;
  due_date?: string | null;
  last_review_date?: string | null;
  successful_sessions?: number;
  consecutive_correct?: number;
  session_dates?: string[];
}

// ============================================================================
// Review History Types
// ============================================================================

/**
 * FSRS rating scale (1-4)
 */
export type FSRSRatingValue = 1 | 2 | 3 | 4;

/**
 * Review history record from database
 * Logs all reviews for analytics and optimization
 */
export interface ReviewHistory {
  id: string;
  user_id: string;
  concept_id: string;
  concept_state_id: string;
  rating: FSRSRatingValue;
  state_before: MasteryState;
  state_after: MasteryState;
  stability_before: number;
  stability_after: number;
  difficulty_before: number;
  difficulty_after: number;
  interval_days: number;
  next_due_date: string;
  time_to_answer_ms: number | null;
  scheduled_date: string | null;
  actual_date: string;
  session_id: string | null;
  created_at: string;
}

/**
 * Data for inserting a new review history record
 */
export interface ReviewHistoryInsert {
  user_id: string;
  concept_id: string;
  concept_state_id: string;
  rating: FSRSRatingValue;
  state_before: MasteryState;
  state_after: MasteryState;
  stability_before: number;
  stability_after: number;
  difficulty_before: number;
  difficulty_after: number;
  interval_days: number;
  next_due_date: string;
  time_to_answer_ms?: number | null;
  scheduled_date?: string | null;
  session_id?: string | null;
}

// ============================================================================
// FSRS User Parameters Types
// ============================================================================

/**
 * FSRS user parameters record from database
 * Stores per-user FSRS algorithm weights for personalized scheduling
 */
export interface FSRSUserParameters {
  id: string;
  user_id: string;
  w: number[];
  desired_retention: number;
  max_interval_days: number;
  last_optimized_at: string | null;
  optimization_sample_size: number;
  created_at: string;
  updated_at: string;
}

/**
 * Data for inserting new FSRS user parameters
 */
export interface FSRSUserParametersInsert {
  user_id: string;
  w?: number[];
  desired_retention?: number;
  max_interval_days?: number;
}

/**
 * Data for updating FSRS user parameters
 */
export interface FSRSUserParametersUpdate {
  w?: number[];
  desired_retention?: number;
  max_interval_days?: number;
  last_optimized_at?: string | null;
  optimization_sample_size?: number;
}

// ============================================================================
// Due Review View Type
// ============================================================================

/**
 * Due review record from the due_reviews view
 */
export interface DueReview {
  concept_state_id: string;
  user_id: string;
  concept_id: string;
  state: MasteryState;
  due_date: string;
  stability: number;
  difficulty: number;
  concept_name: string;
  project_id: string;
  cognitive_type: CognitiveType;
  concept_difficulty: number | null;
  days_overdue: number;
}
