-- Enhanced Pedagogical Analysis Fields
-- Extends three-pass analysis schema (005) with user-facing summaries, learning objectives,
-- assessment specifications, source mappings, and misconception tracking
-- These fields enable quiz generation, video review timestamps, and richer tutoring

-- =============================================================================
-- 1. CONCEPTS TABLE EXTENSIONS
-- =============================================================================

-- User-facing summary: One-sentence description for roadmap display (Issue 3)
-- Example: "Recursion is a technique where a function calls itself to solve smaller subproblems"
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS one_sentence_summary TEXT;

-- Why it matters: Motivational context for learners (Issue 3)
-- Example: "Understanding recursion unlocks elegant solutions for tree traversal and divide-and-conquer algorithms"
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS why_it_matters TEXT;

-- Learning objectives with Bloom verbs (Issue 7)
-- Structure: [{"verb": "Explain", "objective": "the base case requirement for recursion", "bloom_level": "understand"}, ...]
-- Drives: quiz question generation, progress tracking, tutoring goals
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]';

-- Assessment specification for quiz generation (Issue 4)
-- Structure: {
--   "question_types": ["multiple_choice", "short_answer"],
--   "difficulty_range": {"min": 1, "max": 3},
--   "sample_questions": [...],
--   "distractors": [...] -- for mentioned_only concepts
-- }
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS assessment_spec JSONB;

-- Source mapping for video review (Issue 5)
-- Structure: {
--   "timestamps": [{"start_seconds": 120, "end_seconds": 180, "context": "definition"}],
--   "transcript_excerpts": ["..."],
--   "confidence": 0.95
-- }
-- Enables: "Jump to where this concept was explained" feature
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS source_mapping JSONB;

-- Common misconceptions for tutoring (Issue 6)
-- Structure: [{"misconception": "Recursion always causes stack overflow", "correction": "...", "frequency": "common"}, ...]
-- Drives: targeted tutoring interventions, distractor generation for quizzes
ALTER TABLE concepts ADD COLUMN IF NOT EXISTS common_misconceptions JSONB DEFAULT '[]';

-- =============================================================================
-- 2. ROADMAPS TABLE EXTENSIONS
-- =============================================================================

-- Module summary for user-facing overview (Issue 3)
-- Structure: {
--   "title": "Understanding Recursion",
--   "description": "This module covers...",
--   "learning_outcomes": ["..."],
--   "estimated_duration_minutes": 45,
--   "difficulty_level": "intermediate"
-- }
ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS module_summary JSONB;

-- =============================================================================
-- 3. CONTENT_ANALYSES TABLE EXTENSIONS
-- =============================================================================

-- Topic count for multi-topic detection (Issue 1)
-- If topic_count > 1, content may need splitting or careful roadmap structuring
-- Helps identify survey-style content that covers multiple distinct subjects
ALTER TABLE content_analyses ADD COLUMN IF NOT EXISTS topic_count INTEGER;

-- =============================================================================
-- 4. INDEXES FOR QUERY PERFORMANCE
-- =============================================================================

-- GIN indexes for JSONB columns enable efficient containment queries
-- Example: Find all concepts with "apply" level learning objectives
CREATE INDEX IF NOT EXISTS concepts_learning_objectives_idx ON concepts USING GIN (learning_objectives);

-- Enable queries like: Find concepts with specific assessment types
CREATE INDEX IF NOT EXISTS concepts_assessment_spec_idx ON concepts USING GIN (assessment_spec);

-- Enable queries for concepts with source timestamps
CREATE INDEX IF NOT EXISTS concepts_source_mapping_idx ON concepts USING GIN (source_mapping);

-- Enable queries for misconception analysis
CREATE INDEX IF NOT EXISTS concepts_common_misconceptions_idx ON concepts USING GIN (common_misconceptions);

-- Enable efficient module summary queries
CREATE INDEX IF NOT EXISTS roadmaps_module_summary_idx ON roadmaps USING GIN (module_summary);
