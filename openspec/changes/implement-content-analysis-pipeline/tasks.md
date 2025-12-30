# Tasks: Implement Content Analysis Pipeline

## Overview

Implement Phase 2: Content Analysis Pipeline with TDD approach. Each task produces testable, user-visible progress.

---

## Task 1: Database Schema Setup

**Goal**: Create database tables for transcriptions, concepts, relationships, and roadmaps.

### Subtasks
- [ ] Create Supabase migration for `transcriptions` table
- [ ] Create Supabase migration for `concepts` table
- [ ] Create Supabase migration for `concept_relationships` table
- [ ] Create Supabase migration for `roadmaps` table
- [ ] Add Row Level Security policies
- [ ] Create TypeScript types in `src/types/database.ts`

### Validation
- Tables exist in Supabase dashboard
- RLS policies prevent cross-user access
- TypeScript types compile without errors

---

## Task 2: AI Service Foundation

**Goal**: Create base AI service for Claude API integration.

### Subtasks
- [ ] Install `@anthropic-ai/sdk` package
- [ ] Create `src/lib/ai-service.ts` with client initialization
- [ ] Implement API key handling from environment
- [ ] Add error handling and retry logic
- [ ] Write unit tests for retry behavior
- [ ] Create mock AI service for testing

### Validation
- `npm test` passes for ai-service tests
- API client initializes with env key
- Retry logic triggers on transient errors

### Dependencies
- None (can run in parallel with Task 1)

---

## Task 3: Transcription Service

**Goal**: Implement video/audio transcription using Whisper API.

### Subtasks
- [ ] Create `src/lib/transcription-service.ts`
- [ ] Implement audio extraction logic (for video files)
- [ ] Integrate OpenAI Whisper API
- [ ] Handle timestamped segment responses
- [ ] Store transcription results in database
- [ ] Add status tracking (pending, processing, completed, failed)
- [ ] Write tests with mocked Whisper API

### Validation
- `npm test` passes for transcription-service tests
- Transcription creates database record with segments
- Status transitions work correctly

### Dependencies
- Task 1 (database schema)
- Task 2 (AI service patterns)

---

## Task 4: Concept Extraction Service

**Goal**: Extract learnable concepts from content using Claude API.

### Subtasks
- [ ] Create `src/lib/concept-extraction.ts`
- [ ] Design extraction prompt with JSON output
- [ ] Implement content preparation (transcription/PDF/URL)
- [ ] Parse and validate Claude response
- [ ] Store concepts in database with source links
- [ ] Handle cognitive type classification
- [ ] Handle difficulty estimation
- [ ] Write comprehensive tests

### Validation
- `npm test` passes for concept-extraction tests
- Concepts stored with all required fields
- Cognitive types are valid enum values
- Difficulty scores are 1-10

### Dependencies
- Task 1 (database schema)
- Task 2 (AI service)
- Task 3 (transcription for video sources)

---

## Task 5: Knowledge Graph Service

**Goal**: Build prerequisite and relationship graphs from concepts.

### Subtasks
- [ ] Create `src/lib/knowledge-graph-service.ts`
- [ ] Design relationship identification prompt
- [ ] Implement graph construction logic
- [ ] Validate no circular prerequisites
- [ ] Store relationships in database
- [ ] Add graph traversal utilities
- [ ] Write tests including cycle detection

### Validation
- `npm test` passes for knowledge-graph tests
- Relationships stored with correct types
- Circular prerequisite detection works
- Graph traversal returns correct order

### Dependencies
- Task 1 (database schema)
- Task 2 (AI service)
- Task 4 (concepts exist to relate)

---

## Task 6: Roadmap Generation Service

**Goal**: Generate sequenced learning paths from knowledge graphs.

### Subtasks
- [ ] Create `src/lib/roadmap-generation.ts`
- [ ] Implement topological sort for prerequisites
- [ ] Group concepts into levels
- [ ] Calculate time estimates per level
- [ ] Define mastery gates between levels
- [ ] Store roadmap in database
- [ ] Write tests for level organization

### Validation
- `npm test` passes for roadmap-generation tests
- Levels respect prerequisite order
- Time estimates calculated for all levels
- Mastery gates defined at level boundaries

### Dependencies
- Task 1 (database schema)
- Task 5 (knowledge graph)

---

## Task 7: Content Analysis Pipeline Orchestration

**Goal**: Orchestrate full analysis flow from source to roadmap.

### Subtasks
- [ ] Create `src/lib/content-analysis-pipeline.ts`
- [ ] Implement pipeline state machine
- [ ] Add progress tracking for each stage
- [ ] Handle partial failures and recovery
- [ ] Integrate all services in sequence
- [ ] Write integration tests

### Validation
- `npm test` passes for pipeline tests
- Full pipeline completes for test content
- Status updates at each stage
- Failures handled gracefully

### Dependencies
- Tasks 3-6 (all services)

---

## Task 8: Analysis Status UI

**Goal**: Show analysis progress in project detail screen.

### Subtasks
- [ ] Create `src/components/analysis/AnalysisStatus.tsx`
- [ ] Display current pipeline stage
- [ ] Show progress percentage
- [ ] Handle error states with retry option
- [ ] Integrate into ProjectDetailScreen
- [ ] Write component tests

### Validation
- `npm test` passes for AnalysisStatus tests
- Component renders all pipeline states
- Error state shows retry button
- Progress updates in real-time

### Dependencies
- Task 7 (pipeline provides status)

---

## Task 9: Concepts Display UI

**Goal**: Display extracted concepts in project detail.

### Subtasks
- [ ] Create `src/components/concepts/ConceptCard.tsx`
- [ ] Create `src/components/concepts/ConceptsList.tsx`
- [ ] Show concept name, definition, difficulty
- [ ] Display cognitive type badge
- [ ] Link to source timestamp (if video)
- [ ] Write component tests

### Validation
- `npm test` passes for concept components
- Concepts display with all metadata
- Cognitive type badges render correctly
- Timestamp links work for video sources

### Dependencies
- Task 4 (concepts exist in database)
- Task 8 (analysis status shows when ready)

---

## Task 10: Roadmap Display UI

**Goal**: Display generated learning roadmap.

### Subtasks
- [ ] Create `src/components/roadmap/RoadmapLevel.tsx`
- [ ] Create `src/components/roadmap/RoadmapView.tsx`
- [ ] Display levels with concept counts
- [ ] Show time estimates
- [ ] Indicate mastery gates
- [ ] Write component tests

### Validation
- `npm test` passes for roadmap components
- Levels display in correct order
- Time estimates shown per level
- Mastery gates visually indicated

### Dependencies
- Task 6 (roadmap exists in database)

---

## Task 11: End-to-End Integration Testing

**Goal**: Verify complete flow with Chrome DevTools MCP.

### Subtasks
- [ ] Sign in with test account
- [ ] Create test project
- [ ] Upload test video/URL source
- [ ] Verify analysis starts automatically
- [ ] Verify concepts extracted correctly
- [ ] Verify roadmap generated correctly
- [ ] Capture screenshots at each stage

### Validation
- Full flow completes without errors
- Console logs show expected progression
- UI displays all extracted content
- Screenshots document all states

### Dependencies
- All previous tasks complete

---

## Parallelization Notes

**Can run in parallel**:
- Task 1 and Task 2 (no dependencies on each other)

**Must be sequential**:
- Task 3 depends on Tasks 1, 2
- Task 4 depends on Tasks 1, 2, 3
- Task 5 depends on Tasks 1, 2, 4
- Task 6 depends on Task 5
- Task 7 depends on Tasks 3-6
- Tasks 8-10 depend on Task 7
- Task 11 depends on all

## Estimated Effort

| Task | Complexity | Estimate |
|------|------------|----------|
| 1. Database Schema | Medium | 1 session |
| 2. AI Service | Medium | 1 session |
| 3. Transcription | High | 2 sessions |
| 4. Concept Extraction | High | 2 sessions |
| 5. Knowledge Graph | High | 2 sessions |
| 6. Roadmap Generation | Medium | 1 session |
| 7. Pipeline Orchestration | High | 2 sessions |
| 8. Analysis Status UI | Low | 1 session |
| 9. Concepts Display UI | Medium | 1 session |
| 10. Roadmap Display UI | Medium | 1 session |
| 11. E2E Testing | Medium | 1 session |
