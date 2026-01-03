-- ============================================================================
-- Migration: 011_engagement_engineering.sql
-- Purpose: Creates tables for engagement engineering features including
--          streaks, XP/leveling, feed progress, and typography preferences
-- ============================================================================
--
-- This migration creates the engagement engineering tables:
--   - user_streaks: Daily streak tracking for habit formation
--   - xp_ledger: Immutable log of all XP transactions
--   - user_xp: Aggregated XP totals and level for each user
--   - feed_progress: Tracks user progress through TikTok-style learning feeds
--   - user_typography_preferences: User accessibility and display preferences
--
-- Also adds columns to concepts table:
--   - chapter_sequence: Order of concept in video chapter sequence
--   - open_loop_teaser: Hook text to drive curiosity
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
-- USER_STREAKS TABLE
-- ============================================================================
-- Tracks daily learning streaks for habit formation and gamification

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Streak data
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,

  -- Streak freeze (optional future feature)
  streak_freeze_available BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE user_streaks IS
  'Tracks daily learning streaks for habit formation and gamification';

COMMENT ON COLUMN user_streaks.current_streak IS
  'Number of consecutive days the user has completed learning activities';

COMMENT ON COLUMN user_streaks.longest_streak IS
  'All-time longest streak achieved by the user';

COMMENT ON COLUMN user_streaks.last_activity_date IS
  'Date of the last learning activity (for streak calculation)';

COMMENT ON COLUMN user_streaks.streak_freeze_available IS
  'Whether user has a streak freeze available to protect their streak';

-- Row Level Security for user_streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own streak data
CREATE POLICY "Users can CRUD own user_streaks" ON user_streaks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for user_streaks
CREATE INDEX IF NOT EXISTS user_streaks_last_activity_idx ON user_streaks(last_activity_date);

-- Trigger for updated_at (reuses function from 001_projects.sql)
CREATE TRIGGER user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- XP_LEDGER TABLE
-- ============================================================================
-- Immutable log of all XP transactions for audit trail and analytics

CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- XP transaction details
  amount INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (
    reason IN ('quiz_correct', 'synthesis_complete', 'chapter_complete', 'streak_bonus', 'perfect_score')
  ),

  -- Optional context
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE xp_ledger IS
  'Immutable log of all XP transactions for gamification system';

COMMENT ON COLUMN xp_ledger.amount IS
  'XP amount awarded (always positive for awards)';

COMMENT ON COLUMN xp_ledger.reason IS
  'Reason for XP award (quiz_correct, synthesis_complete, chapter_complete, streak_bonus, perfect_score)';

COMMENT ON COLUMN xp_ledger.concept_id IS
  'Optional reference to the concept that triggered this XP award';

COMMENT ON COLUMN xp_ledger.source_id IS
  'Optional reference to the source/video that triggered this XP award';

-- Row Level Security for xp_ledger
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own XP ledger
CREATE POLICY "Users can read own xp_ledger" ON xp_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own XP entries
CREATE POLICY "Users can insert own xp_ledger" ON xp_ledger
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies - ledger is immutable

-- Indexes for xp_ledger
CREATE INDEX IF NOT EXISTS xp_ledger_user_id_idx ON xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS xp_ledger_created_at_idx ON xp_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS xp_ledger_reason_idx ON xp_ledger(reason);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON xp_ledger(user_id, created_at DESC);

-- ============================================================================
-- USER_XP TABLE
-- ============================================================================
-- Aggregated XP totals and level for each user (denormalized for performance)

CREATE TABLE IF NOT EXISTS user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- XP totals
  total_xp INTEGER NOT NULL DEFAULT 0,
  weekly_xp INTEGER NOT NULL DEFAULT 0,

  -- Level (computed from total_xp)
  level INTEGER NOT NULL DEFAULT 1,

  -- Week tracking for weekly reset
  week_start_date DATE NOT NULL DEFAULT date_trunc('week', now())::date,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE user_xp IS
  'Aggregated XP totals and level for gamification (denormalized from xp_ledger)';

COMMENT ON COLUMN user_xp.total_xp IS
  'Total XP earned by user (all time)';

COMMENT ON COLUMN user_xp.weekly_xp IS
  'XP earned in the current week (resets weekly)';

COMMENT ON COLUMN user_xp.level IS
  'User level computed from total_xp';

COMMENT ON COLUMN user_xp.week_start_date IS
  'Start date of current week for weekly XP reset tracking';

-- Row Level Security for user_xp
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own XP data
CREATE POLICY "Users can CRUD own user_xp" ON user_xp
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for user_xp
CREATE INDEX IF NOT EXISTS user_xp_level_idx ON user_xp(level DESC);
CREATE INDEX IF NOT EXISTS user_xp_total_xp_idx ON user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS user_xp_weekly_xp_idx ON user_xp(weekly_xp DESC);

-- Trigger for updated_at
CREATE TRIGGER user_xp_updated_at
  BEFORE UPDATE ON user_xp
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FEED_PROGRESS TABLE
-- ============================================================================
-- Tracks user progress through TikTok-style learning feeds per source

CREATE TABLE IF NOT EXISTS feed_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  -- Progress tracking
  current_index INTEGER NOT NULL DEFAULT 0,
  completed_items UUID[] NOT NULL DEFAULT '{}',

  -- Synthesis tracking
  synthesis_count INTEGER NOT NULL DEFAULT 0,

  -- Session tracking
  last_session_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user has one progress record per source
  CONSTRAINT unique_user_source_progress UNIQUE (user_id, source_id)
);

-- Add comments for documentation
COMMENT ON TABLE feed_progress IS
  'Tracks user progress through TikTok-style learning feeds for each source';

COMMENT ON COLUMN feed_progress.current_index IS
  'Current position in the feed (0-indexed)';

COMMENT ON COLUMN feed_progress.completed_items IS
  'Array of completed feed item IDs (video chunks, quizzes, facts, syntheses)';

COMMENT ON COLUMN feed_progress.synthesis_count IS
  'Number of synthesis exercises completed for this source';

COMMENT ON COLUMN feed_progress.last_session_at IS
  'Timestamp of the last feed session for this source';

-- Row Level Security for feed_progress
ALTER TABLE feed_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own feed progress
CREATE POLICY "Users can CRUD own feed_progress" ON feed_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for feed_progress
CREATE INDEX IF NOT EXISTS feed_progress_user_id_idx ON feed_progress(user_id);
CREATE INDEX IF NOT EXISTS feed_progress_source_id_idx ON feed_progress(source_id);
CREATE INDEX IF NOT EXISTS feed_progress_last_session_idx ON feed_progress(last_session_at DESC);

-- Trigger for updated_at
CREATE TRIGGER feed_progress_updated_at
  BEFORE UPDATE ON feed_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER_TYPOGRAPHY_PREFERENCES TABLE
-- ============================================================================
-- Stores user accessibility and display preferences

CREATE TABLE IF NOT EXISTS user_typography_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Typography settings
  font_family VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (
    font_family IN ('system', 'lexend')
  ),
  bionic_reading_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  font_scale REAL NOT NULL DEFAULT 1.0 CHECK (font_scale >= 0.75 AND font_scale <= 2.0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE user_typography_preferences IS
  'User accessibility and display preferences for learning content';

COMMENT ON COLUMN user_typography_preferences.font_family IS
  'Preferred font family (system for default, lexend for dyslexia-friendly)';

COMMENT ON COLUMN user_typography_preferences.bionic_reading_enabled IS
  'Whether Bionic Reading formatting is enabled for improved reading speed';

COMMENT ON COLUMN user_typography_preferences.dark_mode_enabled IS
  'Whether dark mode is enabled for reduced eye strain';

COMMENT ON COLUMN user_typography_preferences.font_scale IS
  'Font size multiplier (0.75 to 2.0)';

-- Row Level Security for user_typography_preferences
ALTER TABLE user_typography_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own typography preferences
CREATE POLICY "Users can CRUD own user_typography_preferences" ON user_typography_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER user_typography_preferences_updated_at
  BEFORE UPDATE ON user_typography_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ALTER CONCEPTS TABLE
-- ============================================================================
-- Add engagement-related columns to existing concepts table

ALTER TABLE concepts
  ADD COLUMN IF NOT EXISTS chapter_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS open_loop_teaser TEXT;

-- Add comments for new columns
COMMENT ON COLUMN concepts.chapter_sequence IS
  'Order of this concept in the video chapter sequence for feed generation';

COMMENT ON COLUMN concepts.open_loop_teaser IS
  'Hook text to drive curiosity and engagement (e.g., "But what happens when...")';

-- Index for chapter sequence ordering
CREATE INDEX IF NOT EXISTS concepts_chapter_sequence_idx ON concepts(source_id, chapter_sequence);

-- ============================================================================
-- HELPFUL FUNCTIONS
-- ============================================================================

-- Function: Calculate level from XP
-- Uses a logarithmic curve: level = floor(sqrt(total_xp / 100)) + 1
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(xp / 100.0)) + 1)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_level IS
  'Calculates user level from total XP using logarithmic curve';

-- Function: Check and update streak
-- Call this when user completes an activity to update their streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, is_new_day BOOLEAN) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_is_new_day BOOLEAN := FALSE;
BEGIN
  -- Get or create streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current streak data
  SELECT us.last_activity_date, us.current_streak, us.longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;

  -- Calculate new streak
  IF v_last_activity IS NULL THEN
    -- First activity ever
    v_current_streak := 1;
    v_is_new_day := TRUE;
  ELSIF v_last_activity = v_today THEN
    -- Already active today, no change
    v_is_new_day := FALSE;
  ELSIF v_last_activity = v_today - 1 THEN
    -- Consecutive day, increment streak
    v_current_streak := v_current_streak + 1;
    v_is_new_day := TRUE;
  ELSE
    -- Streak broken, start over
    v_current_streak := 1;
    v_is_new_day := TRUE;
  END IF;

  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update the record
  UPDATE user_streaks
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    updated_at = now()
  WHERE user_streaks.user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_is_new_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_streak IS
  'Updates user streak when activity is completed. Returns new streak values and whether this is a new day.';

-- Function: Award XP and update aggregates
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason VARCHAR(50),
  p_concept_id UUID DEFAULT NULL,
  p_source_id UUID DEFAULT NULL
)
RETURNS TABLE(new_total_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_total INTEGER;
  v_week_start DATE := date_trunc('week', now())::date;
BEGIN
  -- Insert into ledger
  INSERT INTO xp_ledger (user_id, amount, reason, concept_id, source_id)
  VALUES (p_user_id, p_amount, p_reason, p_concept_id, p_source_id);

  -- Get or create user_xp record
  INSERT INTO user_xp (user_id, total_xp, weekly_xp, level, week_start_date)
  VALUES (p_user_id, 0, 0, 1, v_week_start)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current level
  SELECT level INTO v_old_level FROM user_xp WHERE user_xp.user_id = p_user_id;
  -- Handle NULL case (new user where INSERT was just created with level=1)
  v_old_level := COALESCE(v_old_level, 1);

  -- Update aggregates (reset weekly if new week)
  UPDATE user_xp
  SET
    total_xp = total_xp + p_amount,
    weekly_xp = CASE
      WHEN week_start_date < v_week_start THEN p_amount
      ELSE weekly_xp + p_amount
    END,
    week_start_date = v_week_start,
    level = calculate_level(total_xp + p_amount),
    updated_at = now()
  WHERE user_xp.user_id = p_user_id
  RETURNING total_xp, level INTO v_new_total, v_new_level;

  RETURN QUERY SELECT v_new_total, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_xp IS
  'Awards XP to user, updates aggregates, and returns new totals with level-up detection';

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Leaderboard with ranking
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT
  ux.user_id,
  ux.total_xp,
  ux.weekly_xp,
  ux.level,
  us.current_streak,
  us.longest_streak,
  RANK() OVER (ORDER BY ux.total_xp DESC) as all_time_rank,
  RANK() OVER (ORDER BY ux.weekly_xp DESC) as weekly_rank
FROM user_xp ux
LEFT JOIN user_streaks us ON us.user_id = ux.user_id
ORDER BY ux.total_xp DESC;

COMMENT ON VIEW xp_leaderboard IS
  'User leaderboard with XP totals, levels, streaks, and rankings';

-- View: User engagement summary
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT
  ux.user_id,
  ux.total_xp,
  ux.weekly_xp,
  ux.level,
  us.current_streak,
  us.longest_streak,
  us.last_activity_date,
  us.streak_freeze_available,
  utp.font_family,
  utp.bionic_reading_enabled,
  utp.dark_mode_enabled,
  utp.font_scale
FROM user_xp ux
LEFT JOIN user_streaks us ON us.user_id = ux.user_id
LEFT JOIN user_typography_preferences utp ON utp.user_id = ux.user_id;

COMMENT ON VIEW user_engagement_summary IS
  'Combined view of user engagement data including XP, streaks, and preferences';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
