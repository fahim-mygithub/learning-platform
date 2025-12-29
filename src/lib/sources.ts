/**
 * Sources Service
 *
 * Provides CRUD operations for managing sources in Supabase.
 * Handles file uploads to Supabase Storage with progress tracking.
 * All operations return consistent { data, error } objects.
 */

import { supabase } from './supabase';
import type { Source, SourceInsert, SourceUpdate } from '../types';
import { validateFileType, validateFileSize, getSourceTypeFromMime } from './file-validation';

/**
 * File object interface for uploads
 */
export interface UploadFile {
  name: string;
  type: string;
  size: number;
  uri: string;
}

/**
 * Progress callback type
 */
export type OnProgressCallback = (progress: { loaded: number; total: number }) => void;

/**
 * Storage bucket name for sources
 */
const STORAGE_BUCKET = 'sources';

/**
 * Create a new source
 * @param userId - The ID of the user creating the source
 * @param data - Source data to insert
 * @returns Created source or error
 */
export async function createSource(
  userId: string,
  data: SourceInsert
): Promise<{ data: Source | null; error: Error | null }> {
  const { data: source, error } = await supabase
    .from('sources')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  return { data: source, error };
}

/**
 * Get all sources for a project, sorted by creation date
 * @param projectId - The ID of the project
 * @returns Array of sources or error
 */
export async function getSources(
  projectId: string
): Promise<{ data: Source[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Get a single source by ID
 * @param id - The source ID
 * @returns Source or error
 */
export async function getSource(
  id: string
): Promise<{ data: Source | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * Update a source
 * @param id - The source ID
 * @param data - Fields to update
 * @returns Updated source or error
 */
export async function updateSource(
  id: string,
  data: SourceUpdate
): Promise<{ data: Source | null; error: Error | null }> {
  const { data: source, error } = await supabase
    .from('sources')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  return { data: source, error };
}

/**
 * Delete a source
 * @param id - The source ID
 * @returns Error if deletion failed
 */
export async function deleteSource(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('sources').delete().eq('id', id);

  return { error };
}

/**
 * Generate storage path for a file
 * Pattern: {user_id}/{project_id}/{source_id}_{filename}
 */
function generateStoragePath(
  userId: string,
  projectId: string,
  sourceId: string,
  filename: string
): string {
  return `${userId}/${projectId}/${sourceId}_${filename}`;
}

/**
 * Upload a file to Supabase Storage
 *
 * Upload Flow:
 * 1. Validate file type/size
 * 2. Create source record (status: 'uploading')
 * 3. Upload to Supabase Storage with progress callback
 * 4. Update source record (status: 'completed', storage_path)
 * 5. On error: Update source record (status: 'failed', error_message)
 *
 * @param userId - The ID of the user uploading
 * @param projectId - The project to add the source to
 * @param file - The file to upload
 * @param onProgress - Optional progress callback
 * @returns Created source or error
 */
export async function uploadFile(
  userId: string,
  projectId: string,
  file: UploadFile,
  onProgress?: OnProgressCallback
): Promise<{ data: Source | null; error: Error | null }> {
  // Step 1: Validate file type
  const typeValidation = validateFileType(file.type);
  if (!typeValidation.valid) {
    return { data: null, error: new Error(typeValidation.error) };
  }

  // Determine source type from MIME type
  const sourceType = getSourceTypeFromMime(file.type);
  if (!sourceType) {
    return { data: null, error: new Error('Unable to determine source type from file') };
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size, sourceType);
  if (!sizeValidation.valid) {
    return { data: null, error: new Error(sizeValidation.error) };
  }

  // Step 2: Create source record with 'uploading' status
  const sourceData: SourceInsert = {
    project_id: projectId,
    type: sourceType,
    name: file.name,
    status: 'uploading',
    file_size: file.size,
    mime_type: file.type,
  };

  const { data: source, error: createError } = await createSource(userId, sourceData);
  if (createError || !source) {
    return { data: null, error: createError };
  }

  // Step 3: Generate storage path and upload file
  const storagePath = generateStoragePath(userId, projectId, source.id, file.name);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.uri, {
      contentType: file.type,
      onUploadProgress: onProgress,
    });

  // Step 4/5: Update source record based on upload result
  if (uploadError) {
    // Update source with failed status
    await updateSource(source.id, {
      status: 'failed',
      error_message: uploadError.message,
    });
    return { data: null, error: uploadError };
  }

  // Update source with completed status and storage path
  const { data: updatedSource, error: updateError } = await updateSource(source.id, {
    status: 'completed',
    storage_path: uploadData?.path || storagePath,
  });

  if (updateError) {
    return { data: null, error: updateError };
  }

  return { data: updatedSource, error: null };
}

/**
 * Delete a file from Supabase Storage
 * @param storagePath - The path to the file in storage
 * @returns Error if deletion failed
 */
export async function deleteStorageFile(storagePath: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

  return { error };
}
