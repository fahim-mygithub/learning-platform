/**
 * Projects Service
 *
 * Provides CRUD operations for managing projects in Supabase.
 * All operations return consistent { data, error } objects.
 */

import { supabase } from './supabase';
import type { Project, ProjectInsert, ProjectUpdate } from '../types';

/**
 * Create a new project
 * @param userId - The ID of the user creating the project
 * @param data - Project data to insert
 * @returns Created project or error
 */
export async function createProject(
  userId: string,
  data: ProjectInsert
): Promise<{ data: Project | null; error: Error | null }> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  return { data: project, error };
}

/**
 * Get all projects for a user, sorted by last accessed
 * @param userId - The ID of the user
 * @returns Array of projects or error
 */
export async function getProjects(
  userId: string
): Promise<{ data: Project[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false });

  return { data, error };
}

/**
 * Get a single project by ID
 * @param id - The project ID
 * @returns Project or error
 */
export async function getProject(
  id: string
): Promise<{ data: Project | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * Update a project
 * @param id - The project ID
 * @param data - Fields to update
 * @returns Updated project or error
 */
export async function updateProject(
  id: string,
  data: ProjectUpdate
): Promise<{ data: Project | null; error: Error | null }> {
  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  return { data: project, error };
}

/**
 * Delete a project
 * @param id - The project ID
 * @returns Error if deletion failed
 */
export async function deleteProject(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('projects').delete().eq('id', id);

  return { error };
}

/**
 * Update last_accessed_at timestamp
 * @param id - The project ID
 * @returns Error if update failed
 */
export async function touchProject(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('projects')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', id);

  return { error };
}
