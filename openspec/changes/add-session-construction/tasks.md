# Tasks: Add Session Construction with Prerequisite Assessment

## Overview

Implement Phase 4: Session Construction with Prerequisite Assessment using TDD approach. Build services first, then database integration, then UI components.

---

## Task 1: Prerequisite Assessment Types

**Goal**: Define TypeScript types for prerequisite assessment.

### Subtasks
- [ ] Create `src/types/prerequisite.ts` with interfaces:
  - Prerequisite, PrerequisiteInsert, PrerequisiteUpdate
  - PretestQuestion, PretestQuestionInsert
  - PretestSession, PretestSessionInsert
  - PretestResponse, PretestResponseInsert
  - PrerequisiteGap, PrerequisiteGapInsert
  - MiniLesson, MiniLessonInsert
  - PrerequisiteProgress, PrerequisiteProgressInsert
- [ ] Create `src/types/session.ts` with interfaces:
  - CognitiveCapacity
  - LearningSession, LearningSessionInsert
  - SessionItem
  - UserSchedulePreferences
  - SessionRecommendation

### Validation
- TypeScript compiles without errors
- Types match database schema design

### Dependencies
- None (pure types)

---

## Task 2: Database Migration - Prerequisite Assessment

**Goal**: Create database tables for prerequisite assessment.

### Subtasks
- [ ] Create `supabase/migrations/007_prerequisite_assessment.sql`:
  - prerequisites table
  - pretest_questions table
  - pretest_sessions table
  - pretest_responses table
  - prerequisite_gaps table
  - mini_lessons table
  - prerequisite_progress table
  - RLS policies for all tables
  - Indexes for common queries
- [ ] Apply migration via Supabase MCP

### Validation
- Migration applies without errors
- RLS policies work correctly

### Dependencies
- Task 1 (types inform schema)

---

## Task 3: Database Migration - Session Construction

**Goal**: Create database tables for session construction.

### Subtasks
- [ ] Create `supabase/migrations/008_session_construction.sql`:
  - learning_sessions table
  - user_schedule_preferences table
  - session_notifications table
  - RLS policies for all tables
  - Indexes for common queries
- [ ] Apply migration via Supabase MCP

### Validation
- Migration applies without errors
- RLS policies work correctly

### Dependencies
- Task 2 (sequential migrations)

---

## Task 4: Prerequisite Detection Service

**Goal**: Implement prerequisite detection from concepts.

### Subtasks
- [ ] Create `src/lib/prerequisite/prerequisite-detection.ts`:
  - extractMentionedOnlyPrerequisites(concepts)
  - inferDomainPrerequisites(concepts, aiService)
  - mergePrerequisites(mentioned, inferred)
  - calculateConfidence(prerequisite)
- [ ] Write tests `src/lib/prerequisite/__tests__/prerequisite-detection.test.ts`:
  - Test extraction from mentioned_only concepts
  - Test AI inference integration
  - Test deduplication and merging
  - Test confidence scoring

### Validation
- `npm test` passes for prerequisite detection tests
- Correctly identifies prerequisites from sample concepts

### Dependencies
- Task 1 (types)

---

## Task 5: Pretest Question Generator

**Goal**: Generate assessment questions for prerequisites.

### Subtasks
- [ ] Create `src/lib/prerequisite/pretest-generator.ts`:
  - generatePretestQuestions(prerequisite, count)
  - createQuestionPrompt(prerequisite, difficulty)
  - parseQuestionResponse(aiResponse)
  - validateQuestion(question)
- [ ] Write tests `src/lib/prerequisite/__tests__/pretest-generator.test.ts`:
  - Test question generation
  - Test response parsing
  - Test validation logic

### Validation
- `npm test` passes for pretest generator tests
- Questions have correct structure

### Dependencies
- Tasks 1, 4

---

## Task 6: Gap Scoring Service

**Goal**: Score pretest responses and identify gaps.

### Subtasks
- [ ] Create `src/lib/prerequisite/gap-scoring.ts`:
  - scorePrerequisite(responses)
  - determineGapSeverity(score)
  - calculateOverallReadiness(gaps)
  - prioritizeGaps(gaps)
- [ ] Write tests `src/lib/prerequisite/__tests__/gap-scoring.test.ts`:
  - Test scoring calculation
  - Test severity thresholds
  - Test prioritization logic

### Validation
- `npm test` passes for gap scoring tests
- Thresholds match design spec

### Dependencies
- Task 1

---

## Task 7: Mini-Lesson Generator

**Goal**: Generate AI-powered mini-lessons for gaps.

### Subtasks
- [ ] Create `src/lib/prerequisite/mini-lesson-generator.ts`:
  - generateMiniLesson(prerequisite, gap)
  - createLessonPrompt(prerequisite)
  - parseLessonResponse(aiResponse)
  - estimateDuration(content)
- [ ] Write tests `src/lib/prerequisite/__tests__/mini-lesson-generator.test.ts`:
  - Test lesson generation
  - Test content parsing
  - Test duration estimation

### Validation
- `npm test` passes for mini-lesson tests
- Generated content is well-structured

### Dependencies
- Tasks 1, 6

---

## Task 8: Prerequisite Assessment Service

**Goal**: Orchestrate prerequisite assessment flow.

### Subtasks
- [ ] Create `src/lib/prerequisite/prerequisite-assessment-service.ts`:
  - detectPrerequisites(projectId)
  - createPretestSession(userId, projectId)
  - submitPretestResponse(sessionId, questionId, answer)
  - completePretestSession(sessionId)
  - getPrerequisiteGaps(userId, projectId)
  - generateMiniLessons(userId, projectId)
  - getPrerequisiteRoadmap(userId, projectId)
- [ ] Create `src/lib/prerequisite/index.ts` exports
- [ ] Write integration tests

### Validation
- `npm test` passes for service tests
- Full pretest flow works end-to-end

### Dependencies
- Tasks 2, 4-7

---

## Task 9: Cognitive Load Service

**Goal**: Calculate learning capacity with modifiers.

### Subtasks
- [ ] Create `src/lib/session/cognitive-load-service.ts`:
  - calculateCapacity(userId, options)
  - getCircadianModifier(hour)
  - getSleepModifier(preferences, currentTime)
  - getFatigueModifier(sessionDuration)
  - getEffectiveCapacity(modifiers)
  - getWarningLevel(percentageUsed)
- [ ] Write tests `src/lib/session/__tests__/cognitive-load-service.test.ts`:
  - Test base capacity
  - Test circadian modifiers at different times
  - Test fatigue accumulation
  - Test warning thresholds

### Validation
- `npm test` passes for cognitive load tests
- Capacity formula matches design spec

### Dependencies
- Task 1

---

## Task 10: Session Builder Service

**Goal**: Construct learning sessions with interleaving.

### Subtasks
- [ ] Create `src/lib/session/session-builder-service.ts`:
  - buildSession(userId, options)
  - applyInterleaving(reviews, newConcepts, capacity)
  - addPretestItems(session, newConcepts)
  - estimateDuration(session)
  - getSessionPreview(userId, options)
- [ ] Write tests `src/lib/session/__tests__/session-builder-service.test.ts`:
  - Test interleaving pattern (R→N→R→R→N)
  - Test capacity limits
  - Test pretest insertion
  - Test duration estimation

### Validation
- `npm test` passes for session builder tests
- Interleaving pattern matches spec

### Dependencies
- Tasks 1, 9

---

## Task 11: Sleep-Aware Scheduler

**Goal**: Implement sleep-aware session recommendations.

### Subtasks
- [ ] Create `src/lib/session/sleep-aware-scheduler.ts`:
  - getSessionRecommendation(preferences, currentTime)
  - isWithinSleepWindow(preferences, currentTime)
  - suggestNextSessionTime(preferences)
  - getMorningCheckItems(userId)
- [ ] Write tests `src/lib/session/__tests__/sleep-aware-scheduler.test.ts`:
  - Test 2-hour bedtime cutoff
  - Test morning check logic
  - Test timezone handling

### Validation
- `npm test` passes for scheduler tests
- Sleep rules match spec

### Dependencies
- Task 1

---

## Task 12: Session Context

**Goal**: React context for session state.

### Subtasks
- [ ] Create `src/lib/session-context.tsx`:
  - SessionProvider component
  - useSession hook
  - State: currentSession, capacity, recommendation
  - Actions: startSession, completeItem, endSession
- [ ] Write context tests

### Validation
- Context provides expected values
- State updates propagate correctly

### Dependencies
- Tasks 9-11

---

## Task 13: Prerequisite Context

**Goal**: React context for prerequisite state.

### Subtasks
- [ ] Create `src/lib/prerequisite-context.tsx`:
  - PrerequisiteProvider component
  - usePrerequisite hook
  - State: prerequisites, gaps, currentSession, roadmap
  - Actions: startPretest, submitAnswer, completePretest
- [ ] Write context tests

### Validation
- Context provides expected values
- State updates propagate correctly

### Dependencies
- Task 8

---

## Task 14: Prerequisite UI Components

**Goal**: Build prerequisite assessment UI.

### Subtasks
- [ ] Create `src/components/prerequisite/PretestOfferModal.tsx`:
  - Prerequisite count display
  - "Take Pretest" button
  - "Skip" button with warning
- [ ] Create `src/components/prerequisite/PretestQuestionCard.tsx`:
  - Question text
  - Multiple choice options
  - Selection state
- [ ] Create `src/components/prerequisite/PretestProgress.tsx`:
  - Progress bar
  - Question counter
- [ ] Create `src/components/prerequisite/GapCard.tsx`:
  - Gap severity badge
  - Prerequisite name
  - Recommendation text
- [ ] Create `src/components/prerequisite/MiniLessonCard.tsx`:
  - Lesson title
  - Duration estimate
  - Completion status
- [ ] Create `src/components/prerequisite/index.ts` exports
- [ ] Write component tests

### Validation
- Components render correctly
- Interactions work as expected

### Dependencies
- Task 13

---

## Task 15: Session UI Components

**Goal**: Build session construction UI.

### Subtasks
- [ ] Create `src/components/session/SessionPreviewCard.tsx`:
  - Due reviews count
  - New concepts available
  - Session type badge
  - "Start Session" button
- [ ] Create `src/components/session/CognitiveLoadIndicator.tsx`:
  - Capacity bar visualization
  - Warning colors at thresholds
  - Percentage text
- [ ] Create `src/components/session/SessionProgress.tsx`:
  - Current item indicator
  - Item type icons
  - Progress percentage
- [ ] Create `src/components/session/SleepWarning.tsx`:
  - Time until bedtime
  - Recommendation message
- [ ] Create `src/components/session/index.ts` exports
- [ ] Write component tests

### Validation
- Components render correctly
- Load indicator reflects capacity

### Dependencies
- Task 12

---

## Task 16: Prerequisite Screens

**Goal**: Create prerequisite assessment screens.

### Subtasks
- [ ] Create `app/(auth)/pretest.tsx`:
  - Question display flow
  - Answer submission
  - Progress tracking
- [ ] Create `app/(auth)/pretest-results.tsx`:
  - Score breakdown
  - Gap list
  - Continue/remediate options
- [ ] Create `app/(auth)/prerequisite-roadmap.tsx`:
  - Mini-lesson list
  - Progress indicators
- [ ] Create `app/(auth)/mini-lesson/[id].tsx`:
  - Content display
  - Key points section
  - Practice questions

### Validation
- Screens navigate correctly
- Data flows properly

### Dependencies
- Tasks 13-14

---

## Task 17: Session Screens

**Goal**: Create session construction screens.

### Subtasks
- [ ] Update `app/(auth)/(tabs)/index.tsx`:
  - Add SessionPreviewCard
  - Add CognitiveLoadIndicator
  - Connect to SessionProvider
- [ ] Create `app/(auth)/session.tsx`:
  - Item flow display
  - Progress tracking
  - Early exit handling
- [ ] Create `app/(auth)/schedule-preferences.tsx`:
  - Bedtime picker
  - Wake time picker
  - Timezone selection

### Validation
- Screens navigate correctly
- Session flow works end-to-end

### Dependencies
- Tasks 12, 15

---

## Task 18: Pipeline Integration

**Goal**: Add prerequisite detection to analysis pipeline.

### Subtasks
- [ ] Update `src/lib/content-analysis-pipeline.ts`:
  - Add 'detecting_prerequisites' stage
  - Call prerequisite detection after concept extraction
  - Store prerequisites in database
- [ ] Update `app/(auth)/(tabs)/projects/[id].tsx`:
  - Show PretestOfferModal after analysis completes
  - Handle pretest flow integration

### Validation
- Pipeline runs with new stage
- Modal appears at correct time

### Dependencies
- Tasks 8, 14

---

## Task 19: E2E Testing

**Goal**: Verify full flow with Chrome MCP.

### Subtasks
- [ ] Test prerequisite assessment flow:
  - Analysis triggers prereq detection
  - Pretest offer modal appears
  - Complete pretest session
  - View results and gaps
  - Complete mini-lesson
- [ ] Test session construction flow:
  - View session preview
  - Start session
  - Complete interleaved items
  - View completion summary
- [ ] Test sleep-aware features:
  - Configure schedule
  - Verify bedtime warning
  - Verify review-only mode
- [ ] Capture screenshots at checkpoints

### Validation
- Full flows work end-to-end
- Screenshots document all states

### Dependencies
- All previous tasks

---

## Task 20: Git Commit

**Goal**: Commit Phase 4 implementation.

### Subtasks
- [ ] Run all tests
- [ ] Verify no lint errors
- [ ] Create commit with descriptive message
- [ ] Update OpenSpec change status

### Validation
- All tests pass
- Commit created successfully

### Dependencies
- Task 19

---

## Parallelization Notes

**Can run in parallel**:
- Tasks 4-7 (prerequisite services)
- Tasks 9-11 (session services)
- Tasks 14-15 (UI components)

**Sequential dependencies**:
- Task 1 → Tasks 2-11 (types needed first)
- Tasks 2-3 → Task 8 (database needed for service)
- Tasks 8, 13 → Tasks 14, 16 (service/context before UI)
- Tasks 12 → Tasks 15, 17 (session context before UI)
- All → Task 19 → Task 20

---

## Estimated Complexity

| Task | Complexity | Notes |
|------|------------|-------|
| 1. Types | Low | Pure type definitions |
| 2-3. Migrations | Low | Standard SQL patterns |
| 4. Prereq Detection | Medium | AI integration |
| 5. Pretest Generator | Medium | AI prompt engineering |
| 6. Gap Scoring | Low | Pure calculations |
| 7. Mini-Lesson Gen | Medium | AI content generation |
| 8. Prereq Service | Medium | Orchestration |
| 9. Cognitive Load | Low | Pure calculations |
| 10. Session Builder | Medium | Interleaving algorithm |
| 11. Sleep Scheduler | Low | Time-based logic |
| 12-13. Contexts | Low | Standard React patterns |
| 14-15. Components | Medium | Multiple components |
| 16-17. Screens | Medium | Navigation and flow |
| 18. Integration | Medium | Pipeline modification |
| 19. E2E Testing | Medium | Full flow verification |
| 20. Commit | Low | Standard git |
