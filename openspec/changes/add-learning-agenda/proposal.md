# Change: Add Learning Agenda Component

## Why

The current content analysis pipeline extracts rich per-concept data but lacks a unified module-level learning objective. Learners see individual concepts and roadmaps but don't get a clear "learning contract" that answers: "What will I learn and how will I get there?"

This gap means learners:
- Can't quickly understand the scope of what they'll learn
- Don't see how individual concepts connect to form a coherent learning experience
- Lack a commitment-building overview before diving into detailed concepts

## What Changes

- **ADDED** Learning Agenda generation after Pass 2 (concept extraction)
- **MODIFIED** Pipeline to include `generating_agenda` stage
- **MODIFIED** Sources table to store `learning_agenda` JSONB
- **ADDED** LearningAgendaCard UI component (displayed before roadmap)
- **ADDED** LearningAgenda TypeScript interface

## Impact

- Affected specs: `content-analysis`
- Affected code:
  - `src/lib/learning-agenda-service.ts` - NEW: Generation service
  - `src/lib/content-analysis-pipeline.ts` - Add new stage
  - `src/types/three-pass.ts` - Add LearningAgenda interface
  - `src/types/database.ts` - Add learning_agenda field to Source
  - `src/components/analysis/LearningAgendaCard.tsx` - NEW: UI component
  - `app/(auth)/(tabs)/projects/[id].tsx` - Display agenda before roadmap
  - `supabase/migrations/007_learning_agenda.sql` - NEW: Schema change

## Success Criteria

1. Every completed analysis has a Learning Agenda
2. Module title is compelling and descriptive (5-10 words)
3. Central question captures the "why learn this?"
4. Module objectives use appropriate Bloom verbs
5. Learning path shows logical progression matching roadmap levels
6. Time estimates within 20% of roadmap total
7. UI displays agenda prominently before concepts and roadmap
8. Learner understands commitment before starting
