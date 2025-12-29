-- ============================================================================
-- Migration: 002_sources.sql
-- Purpose: Creates the sources table for storing learning material sources
-- ============================================================================
--
-- This migration creates the sources table which stores:
--   - Source metadata (name, type, url, storage_path)
--   - File information (file_size, mime_type)
--   - Processing status tracking (pending, uploading, processing, completed, failed)
--   - Error handling (error_message for failed sources)
--   - Flexible metadata storage via JSONB
--
-- Sources are linked to projects and support three types:
--   - video: Video content for learning
--   - pdf: PDF documents
--   - url: Web URLs/links
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on this table.
--   Users can only access sources belonging to their own projects.
--
-- ============================================================================

-- Sources table for learning material sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'url')),
  name TEXT NOT NULL,
  url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sources
CREATE POLICY "Users can CRUD own sources" ON sources
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS sources_project_id_idx ON sources(project_id);
CREATE INDEX IF NOT EXISTS sources_user_id_idx ON sources(user_id);

-- Trigger for updated_at (reuses function from 001_projects.sql)
CREATE TRIGGER sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
