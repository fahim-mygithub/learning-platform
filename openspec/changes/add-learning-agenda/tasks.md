# Tasks: Add Learning Agenda Component

## 1. Types & Schema

- [x] 1.1 Add `LearningAgenda` interface to `src/types/three-pass.ts`
- [x] 1.2 Create migration `007_learning_agenda.sql`:
  - Add `learning_agenda JSONB` column to `sources` table
- [x] 1.3 Update `src/types/database.ts` with `learning_agenda` field
- [x] 1.4 Apply migration to Supabase

## 2. Learning Agenda Service

- [x] 2.1 Create `src/lib/learning-agenda-service.ts`
- [x] 2.2 Implement `generateLearningAgenda(pass1Result, concepts)` function
- [x] 2.3 Design AI prompt for agenda synthesis (uses Haiku)
- [x] 2.4 Implement validation and normalization
- [x] 2.5 Write unit tests for learning agenda service

## 3. Pipeline Integration

- [x] 3.1 Add `generating_agenda` stage to `PipelineStage` type
- [x] 3.2 Update stage descriptions in `AnalysisStatus.tsx`
- [x] 3.3 Integrate agenda generation after Pass 2 in pipeline
- [x] 3.4 Update progress percentage allocations
- [x] 3.5 Store agenda in `sources.learning_agenda`

## 4. UI Component

- [x] 4.1 Create `src/components/analysis/LearningAgendaCard.tsx`
- [x] 4.2 Display module title, central question, objectives
- [x] 4.3 Show learning path phases with timing
- [x] 4.4 Add prerequisites and time investment sections
- [x] 4.5 Integrate into Project Detail screen (above roadmap)
- [x] 4.6 Export from `src/components/analysis/index.ts`

## 5. Testing & Validation

- [x] 5.1 Test with survey content (short video)
- [ ] 5.2 Test with conceptual content (longer video)
- [x] 5.3 Verify agenda renders correctly in UI
- [x] 5.4 Validate time estimates match roadmap
- [x] 5.5 Run openspec validate
