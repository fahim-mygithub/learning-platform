# Tasks: Add Prerequisite Assessment

## Phase 6A: Prerequisite Detection Service

- [ ] **6A.1** Create prerequisite detection service
  - Extract mentioned_only concepts from analysis
  - AI-infer domain prerequisites
  - Store in prerequisites table
  - *File*: `src/lib/prerequisite-assessment-service.ts`
  - *Validation*: Unit tests pass

- [ ] **6A.2** Add detection to analysis pipeline
  - Add `detecting_prerequisites` stage after concept extraction
  - Call detection service
  - *File*: `src/lib/content-analysis-pipeline.ts`
  - *Validation*: Pipeline includes prereq stage

- [ ] **6A.3** Write detection tests
  - Test mentioned_only extraction
  - Test AI inference
  - Test combined deduplication
  - *File*: `src/lib/__tests__/prerequisite-assessment-service.test.ts`
  - *Validation*: All tests pass

## Phase 6B: Pretest Generation

- [ ] **6B.1** Implement pretest question generator
  - Generate MC question per prerequisite
  - Store in pretest_questions table
  - *File*: `src/lib/prerequisite-assessment-service.ts`
  - *Validation*: Unit tests pass

- [ ] **6B.2** Implement gap scoring logic
  - Calculate correct/total
  - Determine recommendation (proceed/review_suggested/review_required)
  - *File*: `src/lib/prerequisite-assessment-service.ts`
  - *Validation*: Unit tests pass

- [ ] **6B.3** Implement mini-lesson generator
  - Generate AI explanation for gaps
  - Store in mini_lessons table
  - *File*: `src/lib/prerequisite-assessment-service.ts`
  - *Validation*: Unit tests pass

## Phase 6C: Prerequisite UI Components

- [ ] **6C.1** Create PrerequisiteContext
  - Track prereq state
  - Handle pretest flow
  - *File*: `src/lib/prerequisite-context.tsx`
  - *Validation*: Unit tests pass

- [ ] **6C.2** Create PretestOfferModal
  - Show prerequisite count
  - Offer take/skip options
  - *File*: `src/components/prerequisite/PretestOfferModal.tsx`
  - *Validation*: Unit tests pass

- [ ] **6C.3** Create PrerequisitePretest screen
  - Reuse MCInput from Phase 5
  - Show progress through prereq questions
  - *File*: `src/components/prerequisite/PrerequisitePretest.tsx`
  - *Validation*: Unit tests pass

- [ ] **6C.4** Create GapResultsScreen
  - Show score and gaps
  - Offer remediation options
  - *File*: `src/components/prerequisite/GapResultsScreen.tsx`
  - *Validation*: Unit tests pass

- [ ] **6C.5** Create MiniLesson component
  - Display AI-generated lesson
  - Mark as completed
  - *File*: `src/components/prerequisite/MiniLesson.tsx`
  - *Validation*: Unit tests pass

- [ ] **6C.6** Create barrel export
  - *File*: `src/components/prerequisite/index.ts`
  - *Validation*: Imports work

## Phase 6D: Learning Flow Integration

- [x] **6D.1** Add prerequisite check to learning screen *(UPDATED: first-session only)*
  - Check if first session via `first_session_completed_at` column
  - First session: Check prerequisites before starting session
  - Subsequent sessions: Skip directly to feed
  - Show offer modal if prerequisites found (first session only)
  - *Files*: `app/(auth)/learning.tsx`, `supabase/migrations/013_first_session_tracking.sql`
  - *Validation*: Modal appears on first session, skipped on subsequent

- [ ] **6D.2** Handle skip with warning
  - Track skipped status
  - Show warning badge during session
  - *File*: `app/(auth)/learning.tsx`
  - *Validation*: Warning shown

- [ ] **6D.3** Handle pretest completion
  - Navigate to gap results if gaps found
  - Proceed to learning if all correct
  - *Validation*: Flow works

- [ ] **6D.4** Handle mini-lesson completion
  - Mark prerequisite as addressed
  - Proceed to learning
  - *Validation*: Flow works

- [x] **6D.5** Mark first session complete on session end
  - Add `markFirstSessionComplete` to FeedContext
  - Auto-call when `sessionComplete` becomes true
  - *Files*: `src/lib/feed-context.tsx`, `src/types/engagement.ts`, `src/types/database.ts`
  - *Validation*: `first_session_completed_at` is set after session

## Phase 6E: Integration & Polish

- [ ] **6E.1** E2E test full flow
  - Start learning → Prereq check → Pretest → Gaps → Learning
  - *Validation*: Chrome MCP test passes

- [ ] **6E.2** Git commit
  - *Validation*: Clean git status

---

## Task Dependencies

```
6A.1 ─> 6A.2 ─> 6A.3
  │
  └─> 6B.1 ─> 6B.2 ─> 6B.3
              │
              └─> 6C.1 ─> 6C.2 ─> 6C.3 ─> 6C.4 ─> 6C.5 ─> 6C.6
                                   │
                                   └─> 6D.1 ─> 6D.2 ─> 6D.3 ─> 6D.4
                                                        │
                                                        └─> 6E.1 ─> 6E.2
```

## Parallelizable Work

- **6B.1, 6B.2, 6B.3** can run after 6A.1 completes
- **6C.2-6C.5** can run in parallel (independent components)
