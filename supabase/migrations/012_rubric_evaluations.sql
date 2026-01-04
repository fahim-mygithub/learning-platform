-- ============================================================================
-- Migration: 012_rubric_evaluations.sql
-- Purpose: Creates table for storing rubric-based AI mastery evaluations
--          from synthesis interactions in the learning feed
-- ============================================================================
--
-- This migration creates the rubric_evaluations table:
--   - Stores dimension-by-dimension scores from AI evaluation
--   - Tracks pass/fail status for concept mastery
--   - Links to user, source, concept, and synthesis interaction
--   - Immutable records (no updates allowed)
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on this table.
--   Users can only access their own evaluation data.
--
-- ============================================================================

-- ============================================================================
-- RUBRIC_EVALUATIONS TABLE
-- ============================================================================
-- Stores AI-powered rubric evaluation results for synthesis responses
-- Each evaluation contains dimension scores (accuracy, completeness, depth, etc.)
-- and an overall pass/fail determination for concept mastery

CREATE TABLE IF NOT EXISTS rubric_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  interaction_id TEXT NOT NULL, -- Unique ID from synthesis interaction
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,

  -- Dimension scores stored as JSONB array
  -- Example structure:
  -- [
  --   { "dimension": "accuracy", "score": 2, "feedback": "Good factual accuracy..." },
  --   { "dimension": "completeness", "score": 1, "feedback": "Missing key points..." },
  --   { "dimension": "depth", "score": 3, "feedback": "Excellent depth of understanding..." }
  -- ]
  dimensions JSONB NOT NULL,

  -- Overall results
  passed BOOLEAN NOT NULL,
  overall_feedback TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one evaluation per user per source per interaction
  -- This prevents duplicate evaluations for the same synthesis attempt
  CONSTRAINT unique_user_source_interaction UNIQUE (user_id, source_id, interaction_id)
);

-- Add comments for documentation
COMMENT ON TABLE rubric_evaluations IS
  'Stores AI-powered rubric evaluation results for synthesis responses in the learning feed';

COMMENT ON COLUMN rubric_evaluations.interaction_id IS
  'Unique identifier from the synthesis interaction that triggered this evaluation';

COMMENT ON COLUMN rubric_evaluations.dimensions IS
  'JSONB array of dimension evaluations, each with dimension name, score (1-3), and feedback';

COMMENT ON COLUMN rubric_evaluations.passed IS
  'Whether the user demonstrated mastery of the concept based on rubric criteria';

COMMENT ON COLUMN rubric_evaluations.overall_feedback IS
  'Synthesized feedback summarizing the evaluation across all dimensions';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE rubric_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own evaluations
CREATE POLICY "Users can read own rubric_evaluations" ON rubric_evaluations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own evaluations
CREATE POLICY "Users can insert own rubric_evaluations" ON rubric_evaluations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE policy - evaluations are immutable once created
-- This ensures audit trail integrity and prevents score manipulation

-- Policy: Users can delete their own evaluations
-- (Allows cleanup if needed, though typically evaluations should be preserved)
CREATE POLICY "Users can delete own rubric_evaluations" ON rubric_evaluations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user queries (e.g., "show all my evaluations")
CREATE INDEX IF NOT EXISTS rubric_evaluations_user_id_idx
  ON rubric_evaluations(user_id);

-- Index for source queries (e.g., "show evaluations for this video")
CREATE INDEX IF NOT EXISTS rubric_evaluations_source_id_idx
  ON rubric_evaluations(source_id);

-- Index for concept queries (e.g., "show evaluations for this concept")
CREATE INDEX IF NOT EXISTS rubric_evaluations_concept_id_idx
  ON rubric_evaluations(concept_id);

-- Index for time-based queries (e.g., "recent evaluations")
CREATE INDEX IF NOT EXISTS rubric_evaluations_created_at_idx
  ON rubric_evaluations(created_at DESC);

-- Composite index for user + source queries (common access pattern)
CREATE INDEX IF NOT EXISTS rubric_evaluations_user_source_idx
  ON rubric_evaluations(user_id, source_id);

-- Composite index for user + concept queries (e.g., "has user mastered this concept?")
CREATE INDEX IF NOT EXISTS rubric_evaluations_user_concept_idx
  ON rubric_evaluations(user_id, concept_id);

-- GIN index on dimensions JSONB for dimension-level queries
-- Enables efficient queries like: WHERE dimensions @> '[{"dimension": "accuracy"}]'
CREATE INDEX IF NOT EXISTS rubric_evaluations_dimensions_gin_idx
  ON rubric_evaluations USING GIN (dimensions);

-- Partial index for passed evaluations (common filter for mastery tracking)
CREATE INDEX IF NOT EXISTS rubric_evaluations_passed_idx
  ON rubric_evaluations(user_id, concept_id)
  WHERE passed = TRUE;

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: User's rubric evaluations with concept and source details
-- Usage: SELECT * FROM user_rubric_evaluations WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_rubric_evaluations AS
SELECT
  re.id AS evaluation_id,
  re.user_id,
  re.source_id,
  re.interaction_id,
  re.concept_id,
  re.dimensions,
  re.passed,
  re.overall_feedback,
  re.created_at,
  c.name AS concept_name,
  c.definition AS concept_definition,
  s.name AS source_name,
  s.type AS source_type
FROM rubric_evaluations re
JOIN concepts c ON c.id = re.concept_id
JOIN sources s ON s.id = re.source_id
ORDER BY re.created_at DESC;

COMMENT ON VIEW user_rubric_evaluations IS
  'User rubric evaluations with related concept and source details';

-- View: Concept mastery summary per user
-- Shows the latest evaluation status for each concept
-- Usage: SELECT * FROM user_concept_mastery WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_concept_mastery AS
SELECT DISTINCT ON (re.user_id, re.concept_id)
  re.user_id,
  re.concept_id,
  c.name AS concept_name,
  c.source_id,
  re.passed AS mastered,
  re.created_at AS evaluated_at,
  re.dimensions,
  re.overall_feedback
FROM rubric_evaluations re
JOIN concepts c ON c.id = re.concept_id
ORDER BY re.user_id, re.concept_id, re.created_at DESC;

COMMENT ON VIEW user_concept_mastery IS
  'Latest mastery status for each concept per user based on most recent rubric evaluation';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
