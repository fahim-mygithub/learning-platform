/**
 * Database types for Supabase tables
 * These types match the SQL schema defined in the database
 */

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
}

// ============================================================================
// Concept Relationship Types
// ============================================================================

/**
 * Relationship type enum for concept connections
 */
export type RelationshipType =
  | 'prerequisite'
  | 'causal'
  | 'taxonomic'
  | 'temporal'
  | 'contrasts_with';

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
}
