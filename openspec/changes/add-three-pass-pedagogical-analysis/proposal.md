# Change: Add Three-Pass Pedagogical Content Analysis

## Why

The current single-pass concept extraction treats all mentioned terms as learning objectives, leading to over-extraction. A 6-minute overview video about "Three Ways to Destroy the Universe" produces an 8-hour learning roadmap because terms like "dark energy" and "entropy" (merely mentioned) become full learning objectives. This violates pedagogical principles where learning time should be proportional to content depth, not content mentions.

## What Changes

- **MODIFIED** Concept Extraction: Add three-pass architecture
  - Pass 1 (Rhetorical Router): Classify content type and set extraction constraints
  - Pass 2 (Enhanced Extraction): Extract concepts with tier, bloom_level, and `mentioned_only` flag
  - Pass 3 (Roadmap Architect): Build Elaboration Theory hierarchy with epitome identification
- **MODIFIED** Roadmap Generation: Calibrated time estimation based on content type
- **ADDED** Analysis Validation: Pre-completion checks for proportionality, Bloom's ceiling, time sanity
- **ADDED** Database schema: New columns for tier, mentioned_only, bloom_level, is_legacy; new content_analyses table

### Enhancements (Phase 2)

- **FIXED** Content type classification for multi-topic survey content
- **FIXED** Epitome selection to use thesis vs elaboration
- **ADDED** Misconception service: Generate 1-3 misconceptions per concept (tier 2-3)
- **ADDED** Module summary service: User-facing summary with outcomes, time, difficulty
- **ADDED** Enhanced concept extraction fields:
  - `learning_objectives` with Bloom's verbs
  - `assessment_spec` for question generation
  - `source_mapping` with timestamps
  - `common_misconceptions` for adaptive tutoring
- **ADDED** New pipeline stages: `generating_misconceptions`, `generating_summary`
- **ADDED** New validations: learning objectives, assessment spec, source mapping

## Impact

- Affected specs: `content-analysis`
- Affected code:
  - `src/lib/content-analysis-pipeline.ts` - New pipeline stages (8 total)
  - `src/lib/concept-extraction.ts` - Enhanced extraction with Pass 1/2
  - `src/lib/roadmap-generation.ts` - Pass 3 with epitome and calibrated time
  - `src/lib/rhetorical-router.ts` - Multi-topic detection, topic_count
  - `src/lib/roadmap-architect.ts` - Correct epitome selection
  - `src/lib/enhanced-concept-extraction.ts` - New pedagogical fields
  - `src/lib/misconception-service.ts` - NEW: Misconception generation
  - `src/lib/module-summary-service.ts` - NEW: Module summary generation
  - `src/lib/analysis-validator.ts` - 6 validation checks
  - `src/types/database.ts` - New fields
  - `src/types/three-pass.ts` - New interfaces
  - `supabase/migrations/005_three_pass_analysis.sql` - Core schema
  - `supabase/migrations/006_enhanced_analysis.sql` - Enhancement schema
  - `src/components/concepts/` - Tier/Bloom badges
  - `src/components/analysis/` - Stage descriptions

## Success Criteria

1. Survey content (6 min) produces 5-15 min learning time (not hours)
2. `mentioned_only` concepts filtered from learning roadmap
3. Bloom's ceiling enforced (Survey content has no Apply-level objectives)
4. Epitome identified and displayed at Level 0 (thesis, not elaboration)
5. UI shows tier, bloom level, and validation warnings
6. Multi-topic short content correctly classified as survey
7. Learning objectives generated with Bloom's verbs
8. Assessment specs include appropriate question types for Bloom level
9. Misconceptions generated for tier 2-3 concepts
10. Module summary includes outcomes, time investment, difficulty
