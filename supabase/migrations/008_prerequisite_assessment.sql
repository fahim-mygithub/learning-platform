-- ============================================================================
-- Migration: 008_prerequisite_assessment.sql
-- Purpose: Creates tables for prerequisite assessment system including
--          prerequisites identification, pretest questions, user sessions,
--          gap analysis, and mini-lessons for remediation
-- ============================================================================
--
-- This migration creates the prerequisite assessment tables:
--   - prerequisites: Identified prereqs (mentioned_only + AI-inferred)
--   - pretest_questions: Assessment questions per prerequisite
--   - pretest_sessions: User pretest attempts
--   - pretest_responses: Individual answers
--   - prerequisite_gaps: Identified gaps per user
--   - mini_lessons: AI-generated content for gaps
--   - prerequisite_progress: User progress on gap remediation
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- SECURITY:
--   Row Level Security (RLS) is ENABLED on all tables.
--   Users can only access their own data where applicable.
--
-- ============================================================================

-- ============================================================================
-- PREREQUISITES TABLE
-- ============================================================================
-- Stores identified prerequisites for a project (from mentioned_only concepts
-- or AI-inferred based on content analysis)

CREATE TABLE IF NOT EXISTS prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Prerequisite details
  name TEXT NOT NULL,
  description TEXT,

  -- Source of prerequisite identification
  source VARCHAR(20) NOT NULL CHECK (source IN ('mentioned_only', 'ai_inferred')),

  -- Confidence score for AI-inferred prerequisites (0.00 to 1.00)
  confidence NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Domain/subject area of the prerequisite
  domain TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE prerequisites IS
  'Identified prerequisites for projects, sourced from mentioned_only concepts or AI inference';

-- Row Level Security for prerequisites
ALTER TABLE prerequisites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read prerequisites for their own projects
CREATE POLICY "Users can read prerequisites for own projects" ON prerequisites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = prerequisites.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can insert prerequisites for their own projects
CREATE POLICY "Users can insert prerequisites for own projects" ON prerequisites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = prerequisites.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can update prerequisites for their own projects
CREATE POLICY "Users can update prerequisites for own projects" ON prerequisites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = prerequisites.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can delete prerequisites for their own projects
CREATE POLICY "Users can delete prerequisites for own projects" ON prerequisites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = prerequisites.project_id
      AND p.user_id = auth.uid()
    )
  );

-- Indexes for prerequisites
CREATE INDEX IF NOT EXISTS prerequisites_project_id_idx ON prerequisites(project_id);
CREATE INDEX IF NOT EXISTS prerequisites_source_idx ON prerequisites(source);
CREATE INDEX IF NOT EXISTS prerequisites_domain_idx ON prerequisites(domain);

-- ============================================================================
-- PRETEST_QUESTIONS TABLE
-- ============================================================================
-- Assessment questions linked to each prerequisite for diagnostic testing

CREATE TABLE IF NOT EXISTS pretest_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_id UUID NOT NULL REFERENCES prerequisites(id) ON DELETE CASCADE,

  -- Question content
  question_text TEXT NOT NULL,

  -- Multiple choice options (array of 4 strings)
  options JSONB NOT NULL,

  -- Index of correct answer (0-3)
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),

  -- Explanation shown after answering
  explanation TEXT,

  -- Difficulty level for adaptive testing
  difficulty VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'intermediate')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE pretest_questions IS
  'Assessment questions for each prerequisite, used in diagnostic pretests';

-- Row Level Security for pretest_questions
ALTER TABLE pretest_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read questions for prerequisites of their projects
CREATE POLICY "Users can read pretest_questions for own projects" ON pretest_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = pretest_questions.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can insert questions for prerequisites of their projects
CREATE POLICY "Users can insert pretest_questions for own projects" ON pretest_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = pretest_questions.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can update questions for prerequisites of their projects
CREATE POLICY "Users can update pretest_questions for own projects" ON pretest_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = pretest_questions.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can delete questions for prerequisites of their projects
CREATE POLICY "Users can delete pretest_questions for own projects" ON pretest_questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = pretest_questions.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Indexes for pretest_questions
CREATE INDEX IF NOT EXISTS pretest_questions_prerequisite_id_idx ON pretest_questions(prerequisite_id);
CREATE INDEX IF NOT EXISTS pretest_questions_difficulty_idx ON pretest_questions(difficulty);

-- ============================================================================
-- PRETEST_SESSIONS TABLE
-- ============================================================================
-- Tracks user pretest attempts for a project

CREATE TABLE IF NOT EXISTS pretest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Summary statistics
  total_questions INTEGER,
  correct_answers INTEGER
);

-- Add comment for documentation
COMMENT ON TABLE pretest_sessions IS
  'User pretest session attempts for prerequisite assessment';

-- Row Level Security for pretest_sessions
ALTER TABLE pretest_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own pretest sessions
CREATE POLICY "Users can CRUD own pretest_sessions" ON pretest_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for pretest_sessions
CREATE INDEX IF NOT EXISTS pretest_sessions_user_id_idx ON pretest_sessions(user_id);
CREATE INDEX IF NOT EXISTS pretest_sessions_project_id_idx ON pretest_sessions(project_id);
CREATE INDEX IF NOT EXISTS pretest_sessions_started_at_idx ON pretest_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS pretest_sessions_user_project_idx ON pretest_sessions(user_id, project_id);

-- ============================================================================
-- PRETEST_RESPONSES TABLE
-- ============================================================================
-- Individual answers within a pretest session

CREATE TABLE IF NOT EXISTS pretest_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pretest_session_id UUID NOT NULL REFERENCES pretest_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pretest_questions(id),

  -- Response data
  selected_index INTEGER,
  is_correct BOOLEAN,

  -- Performance metrics
  response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE pretest_responses IS
  'Individual question responses within a pretest session';

-- Row Level Security for pretest_responses
ALTER TABLE pretest_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own responses (via session ownership)
CREATE POLICY "Users can read own pretest_responses" ON pretest_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pretest_sessions ps
      WHERE ps.id = pretest_responses.pretest_session_id
      AND ps.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own responses (via session ownership)
CREATE POLICY "Users can insert own pretest_responses" ON pretest_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pretest_sessions ps
      WHERE ps.id = pretest_responses.pretest_session_id
      AND ps.user_id = auth.uid()
    )
  );

-- Policy: Users can update their own responses (via session ownership)
CREATE POLICY "Users can update own pretest_responses" ON pretest_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pretest_sessions ps
      WHERE ps.id = pretest_responses.pretest_session_id
      AND ps.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own responses (via session ownership)
CREATE POLICY "Users can delete own pretest_responses" ON pretest_responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pretest_sessions ps
      WHERE ps.id = pretest_responses.pretest_session_id
      AND ps.user_id = auth.uid()
    )
  );

-- Indexes for pretest_responses
CREATE INDEX IF NOT EXISTS pretest_responses_session_id_idx ON pretest_responses(pretest_session_id);
CREATE INDEX IF NOT EXISTS pretest_responses_question_id_idx ON pretest_responses(question_id);
CREATE INDEX IF NOT EXISTS pretest_responses_created_at_idx ON pretest_responses(created_at DESC);

-- ============================================================================
-- PREREQUISITE_GAPS TABLE
-- ============================================================================
-- Identified knowledge gaps per user based on pretest results

CREATE TABLE IF NOT EXISTS prerequisite_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES prerequisites(id) ON DELETE CASCADE,
  pretest_session_id UUID REFERENCES pretest_sessions(id),

  -- Gap assessment
  score NUMERIC(5,2),
  gap_severity VARCHAR(20) NOT NULL CHECK (gap_severity IN ('none', 'minor', 'significant', 'critical')),

  -- Performance data
  questions_attempted INTEGER,
  questions_correct INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE prerequisite_gaps IS
  'Identified prerequisite knowledge gaps per user based on pretest performance';

-- Row Level Security for prerequisite_gaps
ALTER TABLE prerequisite_gaps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own prerequisite gaps
CREATE POLICY "Users can CRUD own prerequisite_gaps" ON prerequisite_gaps
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for prerequisite_gaps
CREATE INDEX IF NOT EXISTS prerequisite_gaps_user_id_idx ON prerequisite_gaps(user_id);
CREATE INDEX IF NOT EXISTS prerequisite_gaps_prerequisite_id_idx ON prerequisite_gaps(prerequisite_id);
CREATE INDEX IF NOT EXISTS prerequisite_gaps_session_id_idx ON prerequisite_gaps(pretest_session_id);
CREATE INDEX IF NOT EXISTS prerequisite_gaps_severity_idx ON prerequisite_gaps(gap_severity);
CREATE INDEX IF NOT EXISTS prerequisite_gaps_user_prereq_idx ON prerequisite_gaps(user_id, prerequisite_id);

-- ============================================================================
-- MINI_LESSONS TABLE
-- ============================================================================
-- AI-generated remediation content for prerequisite gaps

CREATE TABLE IF NOT EXISTS mini_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_id UUID NOT NULL REFERENCES prerequisites(id) ON DELETE CASCADE,

  -- Lesson content
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,

  -- Structured key points for quick reference
  key_points JSONB,

  -- Estimated time to complete
  estimated_minutes INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE mini_lessons IS
  'AI-generated mini-lessons to remediate prerequisite knowledge gaps';

-- Row Level Security for mini_lessons
ALTER TABLE mini_lessons ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read mini_lessons for prerequisites of their projects
CREATE POLICY "Users can read mini_lessons for own projects" ON mini_lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = mini_lessons.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can insert mini_lessons for prerequisites of their projects
CREATE POLICY "Users can insert mini_lessons for own projects" ON mini_lessons
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = mini_lessons.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can update mini_lessons for prerequisites of their projects
CREATE POLICY "Users can update mini_lessons for own projects" ON mini_lessons
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = mini_lessons.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can delete mini_lessons for prerequisites of their projects
CREATE POLICY "Users can delete mini_lessons for own projects" ON mini_lessons
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prerequisites pr
      JOIN projects p ON p.id = pr.project_id
      WHERE pr.id = mini_lessons.prerequisite_id
      AND p.user_id = auth.uid()
    )
  );

-- Indexes for mini_lessons
CREATE INDEX IF NOT EXISTS mini_lessons_prerequisite_id_idx ON mini_lessons(prerequisite_id);

-- ============================================================================
-- PREREQUISITE_PROGRESS TABLE
-- ============================================================================
-- Tracks user progress on mini-lesson completion and post-test scores

CREATE TABLE IF NOT EXISTS prerequisite_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mini_lesson_id UUID NOT NULL REFERENCES mini_lessons(id) ON DELETE CASCADE,

  -- Progress tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Post-lesson assessment score
  post_test_score NUMERIC(5,2),

  -- Unique constraint: one progress record per user per mini-lesson
  CONSTRAINT unique_user_mini_lesson UNIQUE (user_id, mini_lesson_id)
);

-- Add comment for documentation
COMMENT ON TABLE prerequisite_progress IS
  'User progress on mini-lesson completion and post-test remediation scores';

-- Row Level Security for prerequisite_progress
ALTER TABLE prerequisite_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own prerequisite progress
CREATE POLICY "Users can CRUD own prerequisite_progress" ON prerequisite_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for prerequisite_progress
CREATE INDEX IF NOT EXISTS prerequisite_progress_user_id_idx ON prerequisite_progress(user_id);
CREATE INDEX IF NOT EXISTS prerequisite_progress_mini_lesson_id_idx ON prerequisite_progress(mini_lesson_id);
CREATE INDEX IF NOT EXISTS prerequisite_progress_completed_idx ON prerequisite_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: User's prerequisite gaps with details
-- Usage: SELECT * FROM user_prerequisite_gaps WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_prerequisite_gaps AS
SELECT
  pg.id AS gap_id,
  pg.user_id,
  pg.score,
  pg.gap_severity,
  pg.questions_attempted,
  pg.questions_correct,
  pg.created_at AS gap_identified_at,
  pr.id AS prerequisite_id,
  pr.name AS prerequisite_name,
  pr.description AS prerequisite_description,
  pr.source AS prerequisite_source,
  pr.domain AS prerequisite_domain,
  pr.project_id,
  ml.id AS mini_lesson_id,
  ml.title AS mini_lesson_title,
  ml.estimated_minutes,
  pp.started_at AS lesson_started_at,
  pp.completed_at AS lesson_completed_at,
  pp.post_test_score
FROM prerequisite_gaps pg
JOIN prerequisites pr ON pr.id = pg.prerequisite_id
LEFT JOIN mini_lessons ml ON ml.prerequisite_id = pr.id
LEFT JOIN prerequisite_progress pp ON pp.mini_lesson_id = ml.id AND pp.user_id = pg.user_id
ORDER BY
  CASE pg.gap_severity
    WHEN 'critical' THEN 1
    WHEN 'significant' THEN 2
    WHEN 'minor' THEN 3
    ELSE 4
  END,
  pg.created_at DESC;

-- View: Project prerequisite summary
-- Usage: SELECT * FROM project_prerequisites_summary WHERE project_id = 'your-project-id'
CREATE OR REPLACE VIEW project_prerequisites_summary AS
SELECT
  pr.project_id,
  pr.id AS prerequisite_id,
  pr.name,
  pr.description,
  pr.source,
  pr.confidence,
  pr.domain,
  COUNT(DISTINCT pq.id) AS question_count,
  COUNT(DISTINCT ml.id) AS mini_lesson_count
FROM prerequisites pr
LEFT JOIN pretest_questions pq ON pq.prerequisite_id = pr.id
LEFT JOIN mini_lessons ml ON ml.prerequisite_id = pr.id
GROUP BY pr.id, pr.project_id, pr.name, pr.description, pr.source, pr.confidence, pr.domain
ORDER BY pr.source, pr.name;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
