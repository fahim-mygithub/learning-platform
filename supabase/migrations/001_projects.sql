-- ============================================================================
-- Migration: 001_projects.sql
-- Purpose: Creates the projects table for storing user learning projects
-- ============================================================================
--
-- This migration creates the core projects table which stores:
--   - Project metadata (title, description)
--   - Project status tracking (draft, active, completed, archived)
--   - Progress percentage (0-100)
--   - Timestamps for creation, updates, and last access
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on this table.
--   Users can only access their own projects via the auth.uid() check.
--
-- ============================================================================

-- Projects table for learning projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own projects
CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_last_accessed_idx ON projects(user_id, last_accessed_at DESC);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
