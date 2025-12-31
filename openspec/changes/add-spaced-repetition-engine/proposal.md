# Change: Add Spaced Repetition Engine

## Why

Learners need a scientifically-grounded system to schedule reviews for optimal retention. Currently, concepts are extracted from content (Phase 2) but there is no mechanism to track mastery or schedule practice. This creates a passive learning experience with poor long-term retention.

The FSRS-5 algorithm provides state-of-the-art scheduling with 10-15% better prediction accuracy than SM-2. Combined with a concept state machine and review queue management, this enables the core learning experience.

## What Changes

- **NEW**: FSRS-5 algorithm implementation for optimal review scheduling
- **NEW**: Concept state machine tracking progression (UNSEEN -> EXPOSED -> FRAGILE -> DEVELOPING -> SOLID -> MASTERED)
- **NEW**: MISCONCEIVED state for confident incorrect answers
- **NEW**: Review queue management with priority ordering
- **NEW**: Database tables: `concept_states`, `review_history`, `fsrs_user_parameters`
- **NEW**: UI components for mastery visualization (badges, progress bars)
- **NEW**: Review session flow with rating buttons (Forgot/Hard/Good/Easy)
- **MODIFIED**: Home screen adds "Due Reviews" card
- **MODIFIED**: ConceptCard shows mastery state badge
- **MODIFIED**: RoadmapLevel shows aggregated mastery percentage

## Impact

- Affected specs: NEW `spaced-repetition` capability
- Affected code:
  - `src/lib/fsrs/` - New FSRS algorithm module
  - `src/lib/spaced-repetition/` - State machine and queue services
  - `src/lib/review-context.tsx` - React context for review state
  - `src/components/mastery/` - Mastery visualization components
  - `src/components/review/` - Review session components
  - `app/(auth)/(tabs)/index.tsx` - Home screen update
  - `app/(auth)/review/[id].tsx` - New review session route
  - `supabase/migrations/004_spaced_repetition.sql` - New migration
  - `src/types/database.ts` - Type definitions

## Dependencies

- Phase 2 (Content Analysis) provides concepts to track
- Mock/seed concepts will be used for independent development
- Mastery colors already defined in `src/theme/colors.ts`
