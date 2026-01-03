# Tasks: Add Learning Session UI

## Phase 5A: Database & Types
> Foundational schema and type definitions

- [ ] **5A.1** Create migration `010_learning_session_responses.sql`
  - Add `session_responses` table with RLS policies
  - Add `misconception_log` table with UNIQUE constraint
  - Add indexes for session_id and concept_id lookups
  - *Validation*: `openspec validate add-learning-session-ui`

- [ ] **5A.2** Add response types to `src/types/session.ts`
  - `SessionResponse` interface
  - `SessionResponseInsert` interface
  - `MisconceptionLogEntry` interface
  - *Validation*: TypeScript compiles

- [ ] **5A.3** Add question weighting types to `src/types/session.ts`
  - `QuestionWeights` interface
  - `WeightingContext` interface
  - `QuestionPhase` type
  - *Validation*: TypeScript compiles

## Phase 5B: Question Components
> Mobile-first input components for all question types

- [ ] **5B.1** Create `QuestionCard` component
  - Display question text with proper typography
  - Support all question types from `QuestionType`
  - testID props for testing
  - *File*: `src/components/question/QuestionCard.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.2** Create `MCInput` component
  - 4 options with 56px height, 12px gap
  - Visual feedback on selection
  - Disabled state after answer
  - *File*: `src/components/question/MCInput.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.3** Create `TFInput` component
  - Two large True/False buttons
  - Binary selection handling
  - *File*: `src/components/question/TFInput.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.4** Create `TextInput` component
  - Auto-expand up to 4 lines
  - Keyboard-aware scrolling
  - Submit button sticky above keyboard
  - *File*: `src/components/question/TextInput.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.5** Create `DragList` component
  - Drag-to-reorder with handles
  - Gesture-friendly for mobile
  - Check order button
  - *File*: `src/components/question/DragList.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.6** Create `QuestionRenderer` component
  - Routes to appropriate input based on question_type
  - Handles onAnswer callback
  - *File*: `src/components/question/QuestionRenderer.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.7** Create `ConceptReveal` component
  - Correct/Incorrect banner
  - Concept name and definition
  - Pedagogical notes section
  - Misconception section (conditional)
  - Continue button
  - *File*: `src/components/question/ConceptReveal.tsx`
  - *Validation*: Unit tests pass

- [ ] **5B.8** Create barrel export
  - Export all components and types
  - *File*: `src/components/question/index.ts`
  - *Validation*: Import works from index

- [ ] **5B.9** Write comprehensive component tests
  - Test each input type with various states
  - Test accessibility (labels, roles)
  - Test touch targets (56px+)
  - *File*: `src/components/question/__tests__/*.test.tsx`
  - *Validation*: All tests pass

## Phase 5C: Question Weighting Service
> AI-driven question type selection

- [ ] **5C.1** Create question weighting service
  - Phase-based default weights
  - *File*: `src/lib/session/question-weighting-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5C.2** Implement adaptive adjustments
  - Accuracy-based adjustment
  - Mastery-based adjustment
  - Capacity-based adjustment
  - Bloom level adjustment
  - *File*: `src/lib/session/question-weighting-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5C.3** Implement question selection
  - `selectQuestionType(context)` function
  - `selectQuestion(concept, phase)` function
  - *File*: `src/lib/session/question-weighting-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5C.4** Write unit tests
  - Test phase-based weights
  - Test adaptive adjustments
  - Test edge cases (no questions available)
  - *File*: `src/lib/session/__tests__/question-weighting-service.test.ts`
  - *Validation*: All tests pass

## Phase 5D: Learning Session Screen
> Main learning experience

- [ ] **5D.1** Create `LearningSessionContext`
  - Track current item, phase, progress
  - Track responses for session
  - Handle item advancement
  - *File*: `src/lib/learning-session-context.tsx`
  - *Validation*: Unit tests pass

- [ ] **5D.2** Create `LearningSessionScreen`
  - Progress bar and cognitive load indicator
  - Integrate QuestionRenderer and ConceptReveal
  - Handle session completion navigation
  - *File*: `app/(auth)/learning.tsx`
  - *Validation*: Screen renders

- [ ] **5D.3** Implement session item progression
  - Interleaved flow (review/new/pretest)
  - State machine (question → reveal → followup → next)
  - *File*: `app/(auth)/learning.tsx`
  - *Validation*: Manual testing

- [ ] **5D.4** Implement pretest flow
  - MC only for pretests
  - Show concept reveal after answer
  - No follow-up for pretests
  - *Validation*: Manual testing

- [ ] **5D.5** Implement new concept flow
  - Question with weighting
  - Concept reveal
  - Optional follow-up question
  - *Validation*: Manual testing

- [ ] **5D.6** Handle review items
  - Delegate to review flow or inline
  - FSRS rating integration
  - *Validation*: Manual testing

- [ ] **5D.7** Write screen tests
  - Test session initialization
  - Test item progression
  - Test completion
  - *File*: `app/(auth)/__tests__/learning.test.tsx`
  - *Validation*: All tests pass

## Phase 5E: Session Completion
> Stats and persistence

- [ ] **5E.1** Create `SessionCompleteScreen`
  - Stats summary (new concepts, reviews, accuracy, time)
  - Mastery updates display
  - Next review preview
  - Navigation buttons (Back to Project, Start Another)
  - *File*: `app/(auth)/session-complete.tsx`
  - *Validation*: Screen renders

- [ ] **5E.2** Create session response service
  - `saveResponses(sessionId, responses)` function
  - *File*: `src/lib/session/session-response-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5E.3** Implement mastery state updates
  - Update concept_mastery based on responses
  - Pretest correct → EXPOSED
  - Follow-up correct → Advance state
  - *File*: `src/lib/session/session-response-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5E.4** Implement misconception logging
  - Detect misconception triggers from distractors
  - Upsert to misconception_log
  - *File*: `src/lib/session/session-response-service.ts`
  - *Validation*: Unit tests pass

- [ ] **5E.5** Write service tests
  - Test response persistence
  - Test mastery updates
  - Test misconception logging
  - *File*: `src/lib/session/__tests__/session-response-service.test.ts`
  - *Validation*: All tests pass

## Phase 5F: Integration
> Wire everything together

- [ ] **5F.1** Wire "Start Learning" in LearningAgendaCard
  - Add onStartLearning callback
  - Navigate to /learning with projectId
  - *File*: `src/components/learning-agenda/LearningAgendaCard.tsx`
  - *Validation*: Button navigates

- [ ] **5F.2** Wire navigation in project detail
  - Handle onStartLearning from LearningAgendaCard
  - Pass projectId to learning screen
  - *File*: `app/(auth)/(tabs)/projects/[id].tsx`
  - *Validation*: Navigation works

- [ ] **5F.3** Add learning route
  - Ensure /learning route exists
  - Handle projectId param
  - *File*: `app/(auth)/_layout.tsx` (if needed)
  - *Validation*: Route accessible

- [ ] **5F.4** E2E user story test
  - Sign in → Project → Start Learning → Complete session
  - Use Chrome MCP for testing
  - *Validation*: Full flow works

- [ ] **5F.5** Git commit
  - Commit all Phase 5 changes
  - *Validation*: Clean git status

---

## Task Dependencies

```
5A.1 ─┬─> 5A.2 ─┬─> 5A.3
      │         │
      │         └─> 5E.2 ─> 5E.3 ─> 5E.4 ─> 5E.5
      │
      └─> 5B.1 ─┬─> 5B.2 ─┬
                │   5B.3 ─┤
                │   5B.4 ─┼─> 5B.6 ─> 5B.7 ─> 5B.8 ─> 5B.9
                │   5B.5 ─┤
                │         │
                └─────────┴─> 5C.1 ─> 5C.2 ─> 5C.3 ─> 5C.4
                              │
                              └─> 5D.1 ─> 5D.2 ─> 5D.3 ─> 5D.4 ─> 5D.5 ─> 5D.6 ─> 5D.7
                                                          │
                                                          └─> 5E.1
                                                              │
                                                              └─> 5F.1 ─> 5F.2 ─> 5F.3 ─> 5F.4 ─> 5F.5
```

## Parallelizable Work

- **5B.2, 5B.3, 5B.4, 5B.5** can run in parallel (independent input components)
- **5C.1-5C.4** can run in parallel with **5B.6-5B.9** (service vs UI)
- **5E.2-5E.5** can run in parallel with **5D.1-5D.7** after 5A completes
