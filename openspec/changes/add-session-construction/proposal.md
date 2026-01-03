# Change: Add Session Construction with Prerequisite Assessment

## Why

Learners need intelligent session construction that respects cognitive limits and ensures prerequisite knowledge is in place. Currently, users can jump into roadmaps without verified foundational knowledge, leading to frustration and poor comprehension. Additionally, sessions lack cognitive load management, risking mental fatigue and reduced retention.

Research supports:
- **Pretesting Effect (d=1.1)**: Testing prior knowledge before learning improves subsequent encoding
- **Cognitive Load Theory (4±1 chunks)**: Working memory limits require careful new concept budgeting
- **Interleaving (d=0.67)**: Mixing review with new material enhances long-term retention
- **Sleep Consolidation (20-40%)**: Memory consolidation occurs during sleep; late-night learning is suboptimal

## What Changes

### 4A. Prerequisite Assessment (NEW)
- **NEW**: Prerequisite detection from `mentioned_only` concepts + AI-inferred domain knowledge
- **NEW**: Pretest question generation for each identified prerequisite
- **NEW**: Gap scoring and identification service
- **NEW**: AI mini-lesson generator for knowledge gaps (no source material needed)
- **NEW**: Prerequisite roadmap construction before main content
- **NEW**: Database tables: `prerequisites`, `pretest_questions`, `pretest_sessions`, `pretest_responses`, `prerequisite_gaps`, `mini_lessons`, `prerequisite_progress`

### 4B. Cognitive Load Budgeting (NEW)
- **NEW**: Base capacity (4 new concepts/session) with modifiers
- **NEW**: Circadian rhythm adjustment (0.7-1.1x based on time of day)
- **NEW**: Fatigue tracking (0.05 reduction per 15 min in session)
- **NEW**: Warning at 75% capacity, blocking at 90%

### 4C. Session Builder (NEW)
- **NEW**: Interleaving algorithm (R → N → R → R → N → R pattern)
- **NEW**: Pretest questions for new concepts before learning
- **NEW**: Duration estimation service
- **NEW**: Session preview component
- **NEW**: Database tables: `learning_sessions`, `user_schedule_preferences`, `session_notifications`

### 4D. Sleep-Aware Features (NEW)
- **NEW**: Bedtime/wake time configuration
- **NEW**: 2-hour cutoff (review only, no new material before sleep)
- **NEW**: Morning check session type
- **NEW**: Pre-sleep review suggestions

### UI Components (NEW)
- **NEW**: PretestOfferModal - Presents pretest option with skip warning
- **NEW**: PretestSessionScreen - Assessment session flow
- **NEW**: PretestResultsScreen - Gap analysis display
- **NEW**: PrerequisiteRoadmapView - Gap remediation roadmap
- **NEW**: MiniLessonScreen - AI-generated lesson display
- **NEW**: SessionPreviewCard - Upcoming session preview
- **NEW**: CognitiveLoadIndicator - Capacity visualization
- **NEW**: SchedulePreferencesScreen - Sleep schedule configuration

### Integrations (MODIFIED)
- **MODIFIED**: Project detail screen triggers prerequisite check after analysis
- **MODIFIED**: Home screen shows session CTA with load status
- **MODIFIED**: Content analysis pipeline adds prerequisite detection stage

## Impact

- Affected specs: NEW `prerequisite-assessment`, NEW `session-construction` capabilities
- Affected code:
  - `src/lib/prerequisite-assessment-service.ts` - Core prereq logic
  - `src/lib/session/cognitive-load-service.ts` - Capacity calculation
  - `src/lib/session/session-builder-service.ts` - Session construction
  - `src/lib/session/sleep-aware-scheduler.ts` - Sleep-aware scheduling
  - `src/lib/prerequisite-context.tsx` - React context for prereq state
  - `src/lib/session-context.tsx` - React context for session state
  - `src/components/prerequisite/` - Prerequisite UI components
  - `src/components/session/` - Session UI components
  - `app/(auth)/pretest.tsx` - Pretest session screen
  - `app/(auth)/pretest-results.tsx` - Results screen
  - `app/(auth)/mini-lesson/[id].tsx` - Mini-lesson screen
  - `app/(auth)/schedule-preferences.tsx` - Settings screen
  - `supabase/migrations/007_prerequisite_assessment.sql` - Prereq tables
  - `supabase/migrations/008_session_construction.sql` - Session tables
  - `src/types/three-pass.ts` - Extended type definitions

## Dependencies

- Phase 3 (Spaced Repetition) provides mastery tracking and review queue
- Phase 2 (Content Analysis) provides `mentioned_only` concepts for prereq detection
- AI service (OpenAI) for pretest generation and mini-lesson creation
- Existing theme colors for cognitive load visualization
