-- ============================================================================
-- Migration: 004_spaced_repetition.sql
-- Purpose: Creates tables for spaced repetition engine (concept states,
--          review history, and user FSRS parameters)
-- ============================================================================
--
-- This migration creates the spaced repetition tables:
--   - concept_states: Tracks mastery state and FSRS parameters per user per concept
--   - review_history: Logs all reviews for analytics and optimization
--   - fsrs_user_parameters: Stores per-user FSRS algorithm weights
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on all tables.
--   Users can only access their own data.
--
-- ============================================================================

-- ============================================================================
-- CONCEPT_STATES TABLE
-- ============================================================================
-- Tracks mastery state and FSRS parameters per user per concept

CREATE TABLE IF NOT EXISTS concept_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,

  -- Mastery state machine
  state VARCHAR(20) NOT NULL DEFAULT 'unseen' CHECK (
    state IN ('unseen', 'exposed', 'fragile', 'developing', 'solid', 'mastered', 'misconceived')
  ),

  -- FSRS parameters
  stability REAL NOT NULL DEFAULT 1.0,
  difficulty REAL NOT NULL DEFAULT 0.3,

  -- Scheduling
  due_date TIMESTAMPTZ,
  last_review_date TIMESTAMPTZ,

  -- Session tracking for state transitions
  successful_sessions INTEGER NOT NULL DEFAULT 0,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  session_dates JSONB NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only have one state per concept
  CONSTRAINT unique_user_concept UNIQUE (user_id, concept_id)
);

-- Row Level Security for concept_states
ALTER TABLE concept_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own concept states
CREATE POLICY "Users can CRUD own concept_states" ON concept_states
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for concept_states
CREATE INDEX IF NOT EXISTS concept_states_user_id_idx ON concept_states(user_id);
CREATE INDEX IF NOT EXISTS concept_states_concept_id_idx ON concept_states(concept_id);
CREATE INDEX IF NOT EXISTS concept_states_due_date_idx ON concept_states(user_id, due_date);
CREATE INDEX IF NOT EXISTS concept_states_state_idx ON concept_states(state);

-- Trigger for updated_at (reuses function from 001_projects.sql)
CREATE TRIGGER concept_states_updated_at
  BEFORE UPDATE ON concept_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REVIEW_HISTORY TABLE
-- ============================================================================
-- Logs all reviews for analytics, debugging, and FSRS parameter optimization

CREATE TABLE IF NOT EXISTS review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  concept_state_id UUID NOT NULL REFERENCES concept_states(id) ON DELETE CASCADE,

  -- Review data
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 4),

  -- State tracking (before and after review)
  state_before VARCHAR(20) NOT NULL,
  state_after VARCHAR(20) NOT NULL,

  -- FSRS values at time of review
  stability_before REAL NOT NULL,
  stability_after REAL NOT NULL,
  difficulty_before REAL NOT NULL,
  difficulty_after REAL NOT NULL,

  -- Scheduling
  interval_days REAL NOT NULL,
  next_due_date TIMESTAMPTZ NOT NULL,

  -- Timing metrics
  time_to_answer_ms INTEGER,
  scheduled_date TIMESTAMPTZ,
  actual_date TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Session context
  session_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security for review_history
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own review history
CREATE POLICY "Users can CRUD own review_history" ON review_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for review_history
CREATE INDEX IF NOT EXISTS review_history_user_id_idx ON review_history(user_id);
CREATE INDEX IF NOT EXISTS review_history_concept_id_idx ON review_history(concept_id);
CREATE INDEX IF NOT EXISTS review_history_concept_state_id_idx ON review_history(concept_state_id);
CREATE INDEX IF NOT EXISTS review_history_session_id_idx ON review_history(session_id);
CREATE INDEX IF NOT EXISTS review_history_created_at_idx ON review_history(created_at DESC);

-- ============================================================================
-- FSRS_USER_PARAMETERS TABLE
-- ============================================================================
-- Stores per-user FSRS algorithm weights for personalized scheduling

CREATE TABLE IF NOT EXISTS fsrs_user_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- FSRS-5 default parameters (19 weights)
  -- These can be optimized per user over time based on their review history
  w REAL[] DEFAULT ARRAY[
    0.4072, 1.1829, 3.1262, 15.4722,
    7.2102, 0.5316, 1.0651, 0.0234,
    1.5458, 0.1067, 1.0159, 2.1559,
    0.0537, 0.3455, 1.3098, 0.2803,
    2.6122, 0.000499, 0.5827
  ],

  -- Target retention (0.7 to 0.97)
  desired_retention REAL NOT NULL DEFAULT 0.9 CHECK (
    desired_retention >= 0.7 AND desired_retention <= 0.97
  ),

  -- Maximum interval cap in days
  max_interval_days INTEGER NOT NULL DEFAULT 365 CHECK (max_interval_days > 0),

  -- Optimization metadata
  last_optimized_at TIMESTAMPTZ,
  optimization_sample_size INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security for fsrs_user_parameters
ALTER TABLE fsrs_user_parameters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own FSRS parameters
CREATE POLICY "Users can CRUD own fsrs_user_parameters" ON fsrs_user_parameters
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fsrs_user_parameters
CREATE INDEX IF NOT EXISTS fsrs_user_parameters_user_id_idx ON fsrs_user_parameters(user_id);

-- Trigger for updated_at
CREATE TRIGGER fsrs_user_parameters_updated_at
  BEFORE UPDATE ON fsrs_user_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Due reviews for a user
-- Usage: SELECT * FROM due_reviews WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW due_reviews AS
SELECT
  cs.id AS concept_state_id,
  cs.user_id,
  cs.concept_id,
  cs.state,
  cs.due_date,
  cs.stability,
  cs.difficulty,
  c.name AS concept_name,
  c.definition AS concept_definition,
  c.project_id,
  c.cognitive_type,
  c.difficulty AS concept_difficulty,
  EXTRACT(EPOCH FROM (now() - cs.due_date)) / 86400 AS days_overdue
FROM concept_states cs
JOIN concepts c ON c.id = cs.concept_id
WHERE cs.due_date IS NOT NULL
  AND cs.due_date <= now()
  AND cs.state NOT IN ('mastered', 'unseen')
ORDER BY cs.due_date ASC;

-- ============================================================================
-- SEED DATA FOR TESTING (Optional)
-- ============================================================================
-- Uncomment and run separately if you need test data

-- Example: Create concept states for existing concepts
-- INSERT INTO concept_states (user_id, concept_id, state, due_date)
-- SELECT
--   c.user_id,
--   c.id,
--   'exposed',
--   now() - interval '1 day'
-- FROM concepts c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM concept_states cs
--   WHERE cs.user_id = c.user_id AND cs.concept_id = c.id
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
