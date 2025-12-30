/**
 * Analysis Queries Service
 *
 * Provides query functions for fetching analysis data from Supabase.
 * These functions retrieve data that was stored by the analysis services
 * (concept-extraction, knowledge-graph, roadmap-generation).
 * All operations return consistent { data, error } objects.
 */

import { supabase } from './supabase';
import type { Concept, Roadmap, Transcription } from '../types';

/**
 * Get all concepts for a project
 * @param projectId - The ID of the project
 * @returns Array of concepts or error
 */
export async function getConceptsByProject(
  projectId: string
): Promise<{ data: Concept[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Get the roadmap for a project
 * @param projectId - The ID of the project
 * @returns Roadmap or error
 */
export async function getRoadmapByProject(
  projectId: string
): Promise<{ data: Roadmap | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('project_id', projectId)
    .single();

  return { data, error };
}

/**
 * Get transcription for a source
 * @param sourceId - The ID of the source
 * @returns Transcription or error
 */
export async function getTranscriptionBySource(
  sourceId: string
): Promise<{ data: Transcription | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('source_id', sourceId)
    .single();

  return { data, error };
}
