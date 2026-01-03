-- ============================================================================
-- Migration: 009_session_construction.sql
-- Purpose: Creates tables for session construction system including
--          learning sessions with cognitive load tracking, user schedule
--          preferences for sleep-aware scheduling, and session notifications
-- ============================================================================
--
-- This migration creates the session construction tables:
--   - learning_sessions: Sessions with cognitive load tracking and item sequencing
--   - user_schedule_preferences: Bedtime, wake time, timezone for sleep-aware scheduling
--   - session_notifications: Scheduled reminders for future use
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
-- LEARNING_SESSIONS TABLE
-- ============================================================================
-- Stores learning sessions with cognitive load tracking and session items
-- Session items are stored as JSONB array of {type, concept_id, position}

CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Session type determines the session structure
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('standard', 'review_only', 'morning_check')),

  -- Array of session items: [{type: 'new'|'review', concept_id: uuid, position: int}]
  items JSONB NOT NULL,

  -- Time and cognitive load estimates
  estimated_minutes INTEGER,
  cognitive_load_used NUMERIC(4,2),

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add comment for documentation
COMMENT ON TABLE learning_sessions IS
  'Learning sessions with cognitive load tracking, supporting standard, review-only, and morning check session types';

COMMENT ON COLUMN learning_sessions.items IS
  'JSONB array of session items: [{type: "new"|"review", concept_id: uuid, position: int}]';

COMMENT ON COLUMN learning_sessions.cognitive_load_used IS
  'Total cognitive load points used in this session (max typically 1.0)';

-- Row Level Security for learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own learning sessions
CREATE POLICY "Users can CRUD own learning_sessions" ON learning_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for learning_sessions
CREATE INDEX IF NOT EXISTS learning_sessions_user_id_idx ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS learning_sessions_project_id_idx ON learning_sessions(project_id);
CREATE INDEX IF NOT EXISTS learning_sessions_session_type_idx ON learning_sessions(session_type);
CREATE INDEX IF NOT EXISTS learning_sessions_started_at_idx ON learning_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS learning_sessions_completed_at_idx ON learning_sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS learning_sessions_user_project_idx ON learning_sessions(user_id, project_id);
CREATE INDEX IF NOT EXISTS learning_sessions_user_started_idx ON learning_sessions(user_id, started_at DESC);

-- ============================================================================
-- USER_SCHEDULE_PREFERENCES TABLE
-- ============================================================================
-- Stores user schedule preferences for sleep-aware session scheduling
-- Used to determine optimal learning windows and avoid scheduling during sleep

CREATE TABLE IF NOT EXISTS user_schedule_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Sleep schedule (stored in user's local time)
  bedtime TIME,
  wake_time TIME,

  -- User's timezone for converting to/from UTC
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE user_schedule_preferences IS
  'User schedule preferences for sleep-aware learning session scheduling';

COMMENT ON COLUMN user_schedule_preferences.bedtime IS
  'User bedtime in their local timezone';

COMMENT ON COLUMN user_schedule_preferences.wake_time IS
  'User wake time in their local timezone';

COMMENT ON COLUMN user_schedule_preferences.timezone IS
  'IANA timezone identifier (e.g., America/New_York, Europe/London)';

-- Row Level Security for user_schedule_preferences
ALTER TABLE user_schedule_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own schedule preferences
CREATE POLICY "Users can CRUD own user_schedule_preferences" ON user_schedule_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_schedule_preferences_updated_at
  BEFORE UPDATE ON user_schedule_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for timezone queries (for batch processing by timezone)
CREATE INDEX IF NOT EXISTS user_schedule_preferences_timezone_idx ON user_schedule_preferences(timezone);

-- ============================================================================
-- SESSION_NOTIFICATIONS TABLE
-- ============================================================================
-- Stores scheduled session reminders for future notification system
-- Supports various notification types (e.g., session_reminder, review_due)

CREATE TABLE IF NOT EXISTS session_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification details
  notification_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE session_notifications IS
  'Scheduled session reminders and notifications for future notification system';

COMMENT ON COLUMN session_notifications.notification_type IS
  'Type of notification (e.g., session_reminder, review_due, streak_warning)';

COMMENT ON COLUMN session_notifications.scheduled_for IS
  'When the notification should be sent';

COMMENT ON COLUMN session_notifications.sent_at IS
  'When the notification was actually sent (NULL if not yet sent)';

-- Row Level Security for session_notifications
ALTER TABLE session_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own notifications
CREATE POLICY "Users can CRUD own session_notifications" ON session_notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for session_notifications
CREATE INDEX IF NOT EXISTS session_notifications_user_id_idx ON session_notifications(user_id);
CREATE INDEX IF NOT EXISTS session_notifications_scheduled_for_idx ON session_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS session_notifications_type_idx ON session_notifications(notification_type);
CREATE INDEX IF NOT EXISTS session_notifications_pending_idx ON session_notifications(scheduled_for, sent_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS session_notifications_user_pending_idx ON session_notifications(user_id, scheduled_for) WHERE sent_at IS NULL;

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: User's active (incomplete) learning sessions
-- Usage: SELECT * FROM user_active_sessions WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_active_sessions AS
SELECT
  ls.id AS session_id,
  ls.user_id,
  ls.project_id,
  ls.session_type,
  ls.items,
  ls.estimated_minutes,
  ls.cognitive_load_used,
  ls.started_at,
  p.name AS project_name,
  jsonb_array_length(ls.items) AS total_items
FROM learning_sessions ls
LEFT JOIN projects p ON p.id = ls.project_id
WHERE ls.completed_at IS NULL
ORDER BY ls.started_at DESC;

-- View: User's session history with statistics
-- Usage: SELECT * FROM user_session_history WHERE user_id = auth.uid()
CREATE OR REPLACE VIEW user_session_history AS
SELECT
  ls.id AS session_id,
  ls.user_id,
  ls.project_id,
  ls.session_type,
  ls.estimated_minutes,
  ls.cognitive_load_used,
  ls.started_at,
  ls.completed_at,
  p.name AS project_name,
  jsonb_array_length(ls.items) AS total_items,
  EXTRACT(EPOCH FROM (ls.completed_at - ls.started_at)) / 60 AS actual_minutes
FROM learning_sessions ls
LEFT JOIN projects p ON p.id = ls.project_id
WHERE ls.completed_at IS NOT NULL
ORDER BY ls.completed_at DESC;

-- View: Pending notifications (for notification service)
-- Usage: SELECT * FROM pending_notifications WHERE scheduled_for <= now()
CREATE OR REPLACE VIEW pending_notifications AS
SELECT
  sn.id AS notification_id,
  sn.user_id,
  sn.notification_type,
  sn.scheduled_for,
  sn.created_at,
  usp.timezone AS user_timezone
FROM session_notifications sn
LEFT JOIN user_schedule_preferences usp ON usp.user_id = sn.user_id
WHERE sn.sent_at IS NULL
ORDER BY sn.scheduled_for ASC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
