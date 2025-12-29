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
