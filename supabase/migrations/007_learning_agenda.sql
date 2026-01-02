-- Migration: Add Learning Agenda to Sources
-- Description: Adds learning_agenda JSONB column to sources table to store the
--              unified learning contract generated after Pass 2 analysis.
--
-- The Learning Agenda contains:
-- - module_title: Compelling title for the learning module
-- - central_question: The question this content answers
-- - learning_promise: What learner will be able to do after
-- - module_objectives: 3-5 aggregated learning objectives
-- - content_summary: Brief synopsis of source content
-- - key_concepts: Tier 2-3 concepts with one-liners
-- - learning_path: Phases showing logical progression
-- - total_time_minutes: Estimated learning time
-- - prerequisites: Required and helpful prerequisites
-- - mastery_definition: Success criteria
-- - assessment_preview: How learner will be tested

-- Add learning_agenda column to sources table
ALTER TABLE public.sources
ADD COLUMN IF NOT EXISTS learning_agenda JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.sources.learning_agenda IS
  'Learning Agenda JSON containing module title, objectives, learning path, and time estimates. Generated after Pass 2 (concept extraction).';

-- Create index for efficient querying of sources with learning agendas
CREATE INDEX IF NOT EXISTS idx_sources_learning_agenda_not_null
ON public.sources ((learning_agenda IS NOT NULL))
WHERE learning_agenda IS NOT NULL;
