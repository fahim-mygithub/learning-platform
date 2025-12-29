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
