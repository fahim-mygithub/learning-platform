# Tasks: Three-Pass Pedagogical Analysis

## 1. Database Schema

- [x] 1.1 Create migration `005_three_pass_analysis.sql`
- [x] 1.2 Add `content_analyses` table for Pass 1 results
- [x] 1.3 Add columns to `concepts`: tier, mentioned_only, bloom_level, definition_provided, time_allocation_percent, is_legacy
- [x] 1.4 Extend `concept_relationships` with RST relationship types
- [x] 1.5 Add columns to `roadmaps`: epitome_concept_id, time_calibration, validation_results
- [x] 1.6 Create indexes for new columns
- [x] 1.7 Apply migration to Supabase
- [x] 1.8 **Enhancement:** Create migration `006_enhanced_analysis.sql` for:
  - `concepts.one_sentence_summary`, `why_it_matters`
  - `concepts.learning_objectives`, `assessment_spec`, `source_mapping`, `common_misconceptions` (JSONB)
  - `roadmaps.module_summary` (JSONB)
  - `content_analyses.topic_count`

## 2. TypeScript Types

- [x] 2.1 Create `src/types/three-pass.ts` with Pass1Result, Pass2Result, Pass3Result
- [x] 2.2 Add ContentType, BloomLevel, ConceptTier enums
- [x] 2.3 Add TimeCalibration, ValidationResults interfaces
- [x] 2.4 Update `src/types/database.ts` with new Concept and Roadmap fields
- [x] 2.5 **Enhancement:** Add interfaces for:
  - LearningObjective, AssessmentSpec, SampleQuestion
  - SourceMapping, Misconception, ModuleSummary
  - QuestionType, DifficultyLevel
  - BLOOM_VERBS constant

## 3. Pass 1: Rhetorical Router Service

- [x] 3.1 Create `src/lib/rhetorical-router.ts`
- [x] 3.2 Implement content type classification (survey/conceptual/procedural)
- [x] 3.3 Implement Bloom's ceiling detection
- [x] 3.4 Implement mode multiplier calculation
- [x] 3.5 Store results in `content_analyses` table
- [x] 3.6 Write unit tests for rhetorical router
- [x] 3.7 **Fix Issue 1:** Multi-topic detection (3+ topics in short content = survey)
- [x] 3.8 **Fix Issue 1:** Add topic_count to Pass1Result and programmatic enforcement

## 4. Pass 2: Enhanced Concept Extraction Service

- [x] 4.1 Create `src/lib/enhanced-concept-extraction.ts`
- [x] 4.2 Update extraction prompt with tier, mentioned_only, bloom_level fields
- [x] 4.3 Implement constraint passing from Pass 1
- [x] 4.4 Implement Bloom's ceiling enforcement
- [x] 4.5 Add normalization and validation for new fields
- [x] 4.6 Write unit tests for enhanced extraction
- [x] 4.7 **Fix Issue 7:** Add learning objectives extraction with Bloom's verbs
- [x] 4.8 **Fix Issue 4:** Add assessment specification extraction per concept
- [x] 4.9 **Fix Issue 5:** Add source mapping extraction with timestamps

## 5. Pass 3: Roadmap Architect Service

- [x] 5.1 Create `src/lib/roadmap-architect.ts`
- [x] 5.2 Implement epitome identification (thesis concept)
- [x] 5.3 Implement Elaboration Theory hierarchy (Level 0, 1, 2+)
- [x] 5.4 Implement calibrated time estimation formula
- [x] 5.5 Filter mentioned_only concepts from roadmap
- [x] 5.6 Write unit tests for roadmap architect
- [x] 5.7 **Fix Issue 2:** Correct epitome selection (thesis vs elaboration)
- [x] 5.8 **Fix Issue 2:** Add findBestFallback with umbrella keyword detection

## 6. Analysis Validator Service

- [x] 6.1 Create `src/lib/analysis-validator.ts`
- [x] 6.2 Implement proportionality check (concept count vs content length)
- [x] 6.3 Implement Bloom's ceiling check
- [x] 6.4 Implement time sanity check
- [x] 6.5 Return ValidationResults with warnings
- [x] 6.6 Write unit tests for validator
- [x] 6.7 **Enhancement:** Add checkLearningObjectives validation
- [x] 6.8 **Enhancement:** Add checkAssessmentSpec validation
- [x] 6.9 **Enhancement:** Add checkSourceMapping validation

## 7. Pipeline Integration

- [x] 7.1 Update PipelineStage type with new stages
- [x] 7.2 Add `routing_content` stage (Pass 1)
- [x] 7.3 Enhance `extracting_concepts` stage (Pass 2)
- [x] 7.4 Add `architecting_roadmap` stage (Pass 3)
- [x] 7.5 Add `validating` stage
- [x] 7.6 Update progress allocation percentages
- [x] 7.7 Update analysis-context.tsx for new stages
- [ ] 7.8 Write integration tests for full pipeline
- [x] 7.9 **Enhancement:** Add `generating_misconceptions` stage after Pass 2
- [x] 7.10 **Enhancement:** Add `generating_summary` stage after Pass 3

## 8. UI Components - New

- [x] 8.1 Create `src/components/concepts/TierBadge.tsx`
- [x] 8.2 Create `src/components/concepts/BloomLevelBadge.tsx`
- [x] 8.3 Create `src/components/concepts/MentionedOnlyWarning.tsx`
- [x] 8.4 Create `src/components/analysis/ContentTypeIndicator.tsx`
- [x] 8.5 Create `src/components/roadmap/EpitomeHighlight.tsx`
- [x] 8.6 Create `src/components/analysis/ValidationWarnings.tsx`

## 9. UI Components - Updates

- [x] 9.1 Update `ConceptCard.tsx` with tier badge, bloom level, mentioned_only indicator
- [x] 9.2 Update `RoadmapView.tsx` with Level 0 epitome, calibrated time display
- [x] 9.3 Update `AnalysisStatus.tsx` with new stage descriptions
- [x] 9.4 Add legacy badge for concepts with is_legacy=true

## 10. Testing & Validation

- [x] 10.1 Run all unit tests
- [x] 10.2 Test with Kurzgesagt-style survey content
- [ ] 10.3 Test with tutorial/procedural content
- [ ] 10.4 Test with conceptual/deep explanation content
- [x] 10.5 Verify time estimates are reasonable
- [x] 10.6 Test UI with Chrome DevTools MCP

## 11. New Services (Enhancement)

- [x] 11.1 Create `src/lib/misconception-service.ts` (**Fix Issue 6**)
  - generateMisconceptions(concepts) - tier 2-3 only
  - storeMisconceptions(conceptId, misconceptions)
  - getMisconceptions(conceptId)
- [x] 11.2 Create `src/lib/module-summary-service.ts` (**Fix Issue 3**)
  - generateModuleSummary(concepts, timeCalibration)
  - storeModuleSummary(roadmapId, summary)
  - getModuleSummary(roadmapId)
- [x] 11.3 Write unit tests for misconception service
- [x] 11.4 Write unit tests for module summary service
