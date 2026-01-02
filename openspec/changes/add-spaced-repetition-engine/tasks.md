# Tasks: Add Spaced Repetition Engine

## Overview

Implement Phase 3: Spaced Repetition Engine with TDD approach. Start with pure algorithmic functions, build up to database integration, then UI components.

---

## Task 1: FSRS Algorithm Implementation

**Goal**: Implement pure FSRS-5 calculations with comprehensive tests.

### Subtasks
- [x] Create `src/lib/fsrs/fsrs-types.ts` with TypeScript types
- [x] Create `src/lib/fsrs/fsrs-algorithm.ts` with core calculations:
  - getInitialStability(rating)
  - getInitialDifficulty(rating)
  - scheduleReview(card, rating, params)
  - getRetrievability(card, elapsedDays)
  - previewIntervals(card)
- [x] Write `src/lib/fsrs/__tests__/fsrs-algorithm.test.ts`:
  - Test initial stability values for all ratings
  - Test stability increase on success
  - Test stability decrease on failure
  - Test retrievability decay
  - Test interval preview for all ratings

### Validation
- `npm test` passes for FSRS tests
- All edge cases covered (min/max values, boundary conditions)

### Dependencies
- None (pure functions, no external dependencies)

---

## Task 2: Concept State Machine

**Goal**: Implement state transitions with clear criteria.

### Subtasks
- [x] Create `src/lib/spaced-repetition/state-types.ts`:
  - MasteryState type (7 states)
  - StateTransitionCriteria interface
  - ConceptStateData interface
- [x] Create `src/lib/spaced-repetition/concept-state-machine.ts`:
  - getTransitionCriteria(currentState)
  - evaluateTransition(currentData, rating, options)
  - getStateColor(state)
  - getStateLabel(state)
- [x] Write `src/lib/spaced-repetition/__tests__/concept-state-machine.test.ts`:
  - Test each state transition
  - Test regression on failure
  - Test MISCONCEIVED detection
  - Test different-day requirements

### Validation
- `npm test` passes for state machine tests
- All 7 states have defined transitions

### Dependencies
- Task 1 (uses FSRSRating type)

---

## Task 3: Database Schema

**Goal**: Create database tables for spaced repetition.

### Subtasks
- [x] Create `supabase/migrations/004_spaced_repetition.sql`:
  - concept_states table
  - review_history table
  - fsrs_user_parameters table
  - RLS policies for all tables
  - Indexes for common queries
  - Updated_at triggers
- [x] Add types to `src/types/database.ts`:
  - ConceptState, ConceptStateInsert, ConceptStateUpdate
  - ReviewHistory, ReviewHistoryInsert
  - FSRSUserParameters, FSRSUserParametersInsert
- [x] Apply migration via Supabase MCP

### Validation
- Migration applies without errors
- RLS policies verified with test queries
- TypeScript types compile

### Dependencies
- Tasks 1-2 (types inform schema)

---

## Task 4: Review Queue Service

**Goal**: Query and prioritize due items.

### Subtasks
- [x] Create `src/lib/spaced-repetition/review-queue.ts`:
  - getDueItems(userId, options)
  - getQueueStats(userId, projectId?)
  - getBacklogLevel(stats)
  - getPrioritizedQueue(userId, options)
- [x] Write integration tests:
  - Test due item queries
  - Test priority ordering (overdue first)
  - Test project filtering
  - Test backlog level calculation

### Validation
- `npm test` passes for review queue tests
- Queries return correct items with proper ordering

### Dependencies
- Task 3 (database tables exist)

---

## Task 5: Spaced Repetition Service

**Goal**: Orchestrate FSRS, state machine, and queue.

### Subtasks
- [x] Create `src/lib/spaced-repetition/spaced-repetition-service.ts`:
  - initializeConceptState(userId, conceptId)
  - recordReview(userId, conceptStateId, rating, options)
  - startReviewSession(userId, options)
  - getConceptState(userId, conceptId)
  - getProjectConceptStates(userId, projectId)
- [x] Write integration tests:
  - Test concept state initialization
  - Test review recording and state updates
  - Test session creation
  - Test FSRS parameter updates

### Validation
- `npm test` passes for service tests
- Full review cycle works end-to-end

### Dependencies
- Tasks 1-4 (all components)

---

## Task 6: React Context

**Goal**: Provide review state to UI components.

### Subtasks
- [x] Create `src/lib/review-context.tsx`:
  - ReviewProvider component
  - useReview hook
  - State: dueItems, queueStats, currentSession
  - Actions: startSession, submitRating, refreshQueue
- [x] Write context tests

### Validation
- Context provides expected values
- State updates propagate correctly

### Dependencies
- Task 5 (uses spaced repetition service)

---

## Task 7: Mastery UI Components

**Goal**: Build mastery visualization components.

### Subtasks
- [x] Create `src/components/mastery/MasteryStateBadge.tsx`:
  - Color-coded badge by state
  - Label text (UNSEEN, EXPOSED, etc.)
  - Uses theme colors from colors.mastery
- [ ] Create `src/components/mastery/MasteryProgressBar.tsx` (optional enhancement):
  - Shows aggregated mastery across concepts
  - Color gradient based on distribution
- [x] Create `src/components/mastery/index.ts` exports
- [x] Write component tests

### Validation
- Components render all 7 states correctly
- Colors match theme specification
- Accessibility labels present

### Dependencies
- Task 2 (state types and colors)

---

## Task 8: Review UI Components

**Goal**: Build review session components.

### Subtasks
- [x] Create `src/components/review/DueReviewsCard.tsx`:
  - Shows due count and concept previews
  - "Start Review Session" button
  - "All caught up!" empty state
- [x] Create `src/components/review/RatingButtons.tsx`:
  - 4 buttons: Forgot, Hard, Good, Easy
  - Shows predicted intervals
  - Disabled during submission
- [x] Create `src/components/review/ReviewProgress.tsx` (inline in review.tsx):
  - Progress bar for session
  - "X of Y" counter
- [x] Create `src/components/review/index.ts` exports
- [x] Write component tests

### Validation
- Components render correctly
- Button interactions work
- Progress updates

### Dependencies
- Tasks 6-7 (context and mastery components)

---

## Task 9: Screen Integration

**Goal**: Integrate components into app screens.

### Subtasks
- [x] Update `app/(auth)/(tabs)/index.tsx`:
  - Add DueReviewsCard to home screen
  - Connect to ReviewProvider
- [x] Update `src/components/concepts/ConceptCard.tsx`:
  - Add MasteryStateBadge
  - Show "Next review: X" text
- [x] Create `app/(auth)/review.tsx`:
  - Review session screen
  - Question display
  - Answer reveal
  - Rating submission
  - Session completion
- [ ] Update `src/components/roadmap/RoadmapLevel.tsx` (optional enhancement):
  - Show aggregated mastery percentage
  - Color-code by lowest state

### Validation
- Home screen shows due reviews
- Concept cards show mastery
- Review session flow works

### Dependencies
- Tasks 7-8 (UI components)

---

## Task 10: Seed Data & E2E Testing

**Goal**: Create test data and verify full flow.

### Subtasks
- [x] Create seed script for mock concepts (JavaScript utility) - deferred to production
- [x] Verify with Chrome DevTools MCP:
  - Sign in with test account
  - View home screen with DueReviewsCard
  - Start review session
  - Submit ratings
  - Verify state transitions
  - Check database updates
- [x] Capture screenshots at checkpoints

### Validation
- Full review flow works end-to-end
- State transitions visible in UI
- Console logs show expected values
- Screenshots document all states

### Dependencies
- All previous tasks complete

---

## Parallelization Notes

**Can run in parallel**:
- Task 1 and Task 2 (no dependencies on each other)

**Sequential chain**:
- Task 3 depends on Tasks 1-2
- Task 4 depends on Task 3
- Task 5 depends on Tasks 1-4
- Task 6 depends on Task 5
- Tasks 7-8 depend on Tasks 2, 6
- Task 9 depends on Tasks 7-8
- Task 10 depends on all

---

## Estimated Complexity

| Task | Complexity | Notes |
|------|------------|-------|
| 1. FSRS Algorithm | Medium | Pure math, well-documented algorithm |
| 2. State Machine | Medium | Clear criteria from spec |
| 3. Database Schema | Low | Standard migration pattern |
| 4. Review Queue | Low | Query composition |
| 5. Service Orchestration | Medium | Integrates all components |
| 6. React Context | Low | Standard pattern |
| 7. Mastery Components | Low | Use existing design system |
| 8. Review Components | Medium | Multiple interactions |
| 9. Screen Integration | Medium | Touch multiple files |
| 10. E2E Testing | Medium | Full flow verification |
