-- ============================================================================
-- Migration: 010_learning_session_responses.sql
-- Purpose: Creates tables for learning session response tracking including
--          session responses for question answers and misconception logging
-- ============================================================================
--
-- This migration creates the learning session response tables:
--   - session_responses: Individual question responses within a learning session
--   - misconception_log: Tracks recurring misconceptions per user per concept
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on all tables.
--   Users can only access their own data (via session ownership or direct user_id).
--
-- ============================================================================

-- ============================================================================
-- SESSION_RESPONSES TABLE
-- ============================================================================
-- Stores individual question responses within a learning session
-- Tracks user answers, correctness, response time, and triggered misconceptions

CREATE TABLE IF NOT EXISTS session_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,

  -- Question details
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,

  -- Response data
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,

  -- Performance metrics
  response_time_ms INTEGER,

  -- Misconception tracking (references misconception text if triggered)
  misconception_triggered TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE session_responses IS
  'Individual question responses within a learning session, tracking answers, correctness, and misconceptions';

COMMENT ON COLUMN session_responses.question_type IS
  'Type of question (e.g., multiple_choice, free_response, true_false)';

COMMENT ON COLUMN session_responses.response_time_ms IS
  'Time taken to answer the question in milliseconds';

COMMENT ON COLUMN session_responses.misconception_triggered IS
  'Text of the misconception if the wrong answer indicated a known misconception pattern';

-- Row Level Security for session_responses
ALTER TABLE session_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own responses (via session ownership)
CREATE POLICY "Users can read own session_responses" ON session_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = session_responses.session_id
      AND ls.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own responses (via session ownership)
CREATE POLICY "Users can insert own session_responses" ON session_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = session_responses.session_id
      AND ls.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own responses (via session ownership)
CREATE POLICY "Users can update own session_responses" ON session_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = session_responses.session_id
      AND ls.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own responses (via session ownership)
CREATE POLICY "Users can delete own session_responses" ON session_responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM learning_sessions ls
      WHERE ls.id = session_responses.session_id
      AND ls.user_id = auth.uid()
    )
  );

-- Indexes for session_responses
CREATE INDEX IF NOT EXISTS session_responses_session_id_idx ON session_responses(session_id);
CREATE INDEX IF NOT EXISTS session_responses_concept_id_idx ON session_responses(concept_id);
CREATE INDEX IF NOT EXISTS session_responses_created_at_idx ON session_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS session_responses_is_correct_idx ON session_responses(is_correct);
CREATE INDEX IF NOT EXISTS session_responses_session_concept_idx ON session_responses(session_id, concept_id);

-- ============================================================================
-- MISCONCEPTION_LOG TABLE
-- ============================================================================
-- Tracks recurring misconceptions per user per concept
-- Aggregates misconception occurrences for analytics and targeted remediation

CREATE TABLE IF NOT EXISTS misconception_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,

  -- Misconception details
  misconception TEXT NOT NULL,

  -- Occurrence tracking
  triggered_count INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one entry per user per concept per misconception
  CONSTRAINT unique_user_concept_misconception UNIQUE (user_id, concept_id, misconception)
);

-- Add comment for documentation
COMMENT ON TABLE misconception_log IS
  'Aggregated log of recurring misconceptions per user per concept for targeted remediation';

COMMENT ON COLUMN misconception_log.triggered_count IS
  'Number of times this misconception has been triggered';

COMMENT ON COLUMN misconception_log.last_triggered_at IS
  'Timestamp of the most recent occurrence of this misconception';

-- Row Level Security for misconception_log
ALTER TABLE misconception_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own misconception logs
CREATE POLICY "Users can CRUD own misconception_log" ON misconception_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for misconception_log
CREATE INDEX IF NOT EXISTS misconception_log_user_id_idx ON misconception_log(user_id);
CREATE INDEX IF NOT EXISTS misconception_log_concept_id_idx ON misconception_log(concept_id);
CREATE INDEX IF NOT EXISTS misconception_log_user_concept_idx ON misconception_log(user_id, concept_id);
CREATE INDEX IF NOT EXISTS misconception_log_triggered_count_idx ON misconception_log(triggered_count DESC);
CREATE INDEX IF NOT EXISTS misconception_log_last_triggered_idx ON misconception_log(last_triggered_at DESC);

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Session response summary with concept details
-- Usage: SELECT * FROM session_response_details WHERE session_id = 'your-session-id'
CREATE OR REPLACE VIEW session_response_details AS
SELECT
  sr.id AS response_id,
  sr.session_id,
  sr.concept_id,
  sr.question_type,
  sr.question_text,
  sr.user_answer,
  sr.correct_answer,
  sr.is_correct,
  sr.response_time_ms,
  sr.misconception_triggered,
  sr.created_at,
  c.name AS concept_name,
  c.definition AS concept_definition,
  ls.user_id,
  ls.project_id,
  ls.session_type
FROM session_responses sr
JOIN learning_sessions ls ON ls.id = sr.session_id
JOIN concepts c ON c.id = sr.concept_id
ORDER BY sr.created_at ASC;

-- View: User's misconception patterns ordered by frequency
-- Usage: SELECT * FROM user_misconception_patterns WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_misconception_patterns AS
SELECT
  ml.id AS misconception_log_id,
  ml.user_id,
  ml.concept_id,
  ml.misconception,
  ml.triggered_count,
  ml.last_triggered_at,
  c.name AS concept_name,
  c.definition AS concept_definition,
  c.project_id
FROM misconception_log ml
JOIN concepts c ON c.id = ml.concept_id
ORDER BY ml.triggered_count DESC, ml.last_triggered_at DESC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
