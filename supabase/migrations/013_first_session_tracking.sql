-- ============================================================================
-- Migration: 013_first_session_tracking.sql
-- Purpose: Add first_session_completed_at column to feed_progress table
--          to distinguish first-time learning sessions from subsequent ones
-- ============================================================================
--
-- This migration adds:
--   - first_session_completed_at column to feed_progress table
--
-- WHY:
--   - First sessions should show prerequisite pretest (gauge foundational knowledge)
--   - Subsequent sessions should skip prerequisites (use brain-priming pretest)
--   - NULL = first session not yet completed
--   - NOT NULL = subsequent session
--
-- HOW TO APPLY:
--   1. Open your Supabase Dashboard
--   2. Navigate to SQL Editor
--   3. Paste this entire file contents
--   4. Click "Run" to execute
--
-- ============================================================================

-- Add first_session_completed_at column to feed_progress
ALTER TABLE feed_progress
  ADD COLUMN IF NOT EXISTS first_session_completed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN feed_progress.first_session_completed_at IS
  'When user completed their first learning session for this source. NULL = first session not yet completed.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
