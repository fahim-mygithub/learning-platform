-- ============================================================================
-- Migration: 003_content_analysis.sql
-- Purpose: Creates tables for content analysis pipeline (transcriptions,
--          concepts, concept relationships, and roadmaps)
-- ============================================================================
--
-- This migration creates the core content analysis tables:
--   - transcriptions: Stores transcribed text from video/audio sources
--   - concepts: Stores extracted learning concepts
--   - concept_relationships: Stores relationships between concepts
--   - roadmaps: Stores learning roadmaps with levels and mastery gates
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on all tables.
--   Users can only access data belonging to their own projects.
--
-- ============================================================================

-- ============================================================================
-- TRANSCRIPTIONS TABLE
-- ============================================================================
-- Stores transcribed text from video/audio sources with timing segments

CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]',
  language VARCHAR(10) DEFAULT 'en',
  confidence REAL,
  provider VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security for transcriptions
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access transcriptions for their own sources
-- Join through sources table to get user_id
CREATE POLICY "Users can CRUD own transcriptions" ON transcriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sources
      WHERE sources.id = transcriptions.source_id
      AND sources.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sources
      WHERE sources.id = transcriptions.source_id
      AND sources.user_id = auth.uid()
    )
  );

-- Indexes for transcriptions
CREATE INDEX IF NOT EXISTS transcriptions_source_id_idx ON transcriptions(source_id);
CREATE INDEX IF NOT EXISTS transcriptions_status_idx ON transcriptions(status);

-- Trigger for updated_at (reuses function from 001_projects.sql)
CREATE TRIGGER transcriptions_updated_at
  BEFORE UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONCEPTS TABLE
-- ============================================================================
-- Stores extracted learning concepts with cognitive classification

CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  definition TEXT NOT NULL,
  key_points JSONB DEFAULT '[]',
  cognitive_type VARCHAR(50) NOT NULL CHECK (cognitive_type IN ('declarative', 'conceptual', 'procedural', 'conditional', 'metacognitive')),
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
  source_timestamps JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security for concepts
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access concepts for their own projects
-- Join through projects table to get user_id
CREATE POLICY "Users can CRUD own concepts" ON concepts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = concepts.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = concepts.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes for concepts
CREATE INDEX IF NOT EXISTS concepts_project_id_idx ON concepts(project_id);
CREATE INDEX IF NOT EXISTS concepts_source_id_idx ON concepts(source_id);
CREATE INDEX IF NOT EXISTS concepts_cognitive_type_idx ON concepts(cognitive_type);

-- Trigger for updated_at
CREATE TRIGGER concepts_updated_at
  BEFORE UPDATE ON concepts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONCEPT RELATIONSHIPS TABLE
-- ============================================================================
-- Stores relationships between concepts (prerequisite, causal, etc.)

CREATE TABLE IF NOT EXISTS concept_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('prerequisite', 'causal', 'taxonomic', 'temporal', 'contrasts_with')),
  strength REAL DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_concept_relationship UNIQUE (from_concept_id, to_concept_id, relationship_type)
);

-- Row Level Security for concept_relationships
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access relationships for their own projects
CREATE POLICY "Users can CRUD own concept_relationships" ON concept_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = concept_relationships.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = concept_relationships.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes for concept_relationships
CREATE INDEX IF NOT EXISTS concept_relationships_project_id_idx ON concept_relationships(project_id);
CREATE INDEX IF NOT EXISTS concept_relationships_from_concept_idx ON concept_relationships(from_concept_id);
CREATE INDEX IF NOT EXISTS concept_relationships_to_concept_idx ON concept_relationships(to_concept_id);
CREATE INDEX IF NOT EXISTS concept_relationships_type_idx ON concept_relationships(relationship_type);

-- ============================================================================
-- ROADMAPS TABLE
-- ============================================================================
-- Stores learning roadmaps with levels and mastery gates

CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  levels JSONB NOT NULL DEFAULT '[]',
  total_estimated_minutes INTEGER,
  mastery_gates JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security for roadmaps
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access roadmaps for their own projects
CREATE POLICY "Users can CRUD own roadmaps" ON roadmaps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = roadmaps.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = roadmaps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Indexes for roadmaps
CREATE INDEX IF NOT EXISTS roadmaps_project_id_idx ON roadmaps(project_id);
CREATE INDEX IF NOT EXISTS roadmaps_status_idx ON roadmaps(status);

-- Trigger for updated_at
CREATE TRIGGER roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
