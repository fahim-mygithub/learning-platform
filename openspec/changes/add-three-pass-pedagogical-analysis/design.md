# Design: Three-Pass Pedagogical Content Analysis

## Context

The learning platform analyzes source materials (videos, PDFs, URLs) to extract learnable concepts and generate learning roadmaps. The current single-pass extraction treats all mentioned terms as learning objectives, causing over-extraction. This design introduces a three-pass architecture based on cognitive science research (Kintsch's Construction-Integration Model, Wiggins & McTighe's Understanding by Design, Reigeluth's Elaboration Theory).

### Stakeholders
- Learners: Need accurate, proportional learning paths
- Content creators: Want faithful representation of teaching intent
- Platform: Needs reasonable API costs and processing time

### Constraints
- Must integrate with existing pipeline without breaking current functionality
- Existing concepts must remain usable (backward compatibility)
- API cost increase should be minimal (<50% more)

## Goals / Non-Goals

**Goals:**
- Distinguish between "mentioned" and "explained" concepts
- Calibrate learning time to content type (survey vs tutorial)
- Enforce Bloom's taxonomy ceiling based on content depth
- Identify thesis/epitome concept for hierarchy

**Non-Goals:**
- Domain-specific extraction rules (future enhancement)
- Real-time streaming analysis
- Multi-language optimization

## Decisions

### Decision 1: Three Separate Services vs Single Enhanced Service

**Choice:** Three separate services (RhetoricalRouter, EnhancedConceptExtraction, RoadmapArchitect)

**Rationale:**
- Clear separation of concerns
- Each pass can be tested independently
- Different AI models can be used (Haiku for Pass 1/3, Sonnet for Pass 2)
- Easier to retry individual passes on failure

**Alternatives:**
- Single service with internal phases: Harder to test, less flexible model selection

### Decision 2: Model Selection per Pass

**Choice:**
- Pass 1 (Rhetorical Router): claude-haiku - Simple classification task
- Pass 2 (Enhanced Extraction): claude-sonnet - Complex extraction with nuance
- Pass 3 (Roadmap Architect): claude-haiku - Structured organization

**Rationale:**
- Optimizes cost/quality tradeoff
- Haiku is 10x cheaper than Sonnet
- Pass 2 requires the most nuanced understanding

### Decision 3: Database Schema Approach

**Choice:** Extend existing tables with new columns + one new table

**Rationale:**
- `content_analyses` table stores Pass 1 results separately (source-level metadata)
- Extending `concepts` keeps queries simple
- Adding `is_legacy` flag enables graceful backward compatibility

**Schema:**
```
content_analyses (NEW)
├── source_id, project_id
├── content_type (survey|conceptual|procedural)
├── thesis_statement
├── bloom_ceiling
├── mode_multiplier
└── extraction_depth

concepts (EXTENDED)
├── tier (1|2|3)
├── mentioned_only (boolean) <- CRITICAL FLAG
├── bloom_level
├── definition_provided
├── time_allocation_percent
└── is_legacy

roadmaps (EXTENDED)
├── epitome_concept_id
├── time_calibration (JSONB)
└── validation_results (JSONB)
```

### Decision 4: Mentioned-Only Filtering Strategy

**Choice:** Filter at roadmap generation, preserve in concepts table

**Rationale:**
- Keeps extraction complete for debugging/analysis
- UI can show mentioned concepts with warning badge
- Future features may use mentioned concepts (e.g., glossary)

### Decision 5: Time Calibration Formula

**Choice:** `Learning_Time = Source_Duration × Mode × Density × Knowledge`

**Formula:**
```
Mode_Multiplier: Survey=1.5, Conceptual=2.5, Procedural=4.0
Density_Modifier: Low=0.8, Medium=1.0, High=1.5 (based on concepts/minute)
Knowledge_Type_Factor: Factual=0.8, Conceptual=1.0, Procedural=1.5
```

**Example:** 6-min Kurzgesagt (Survey, High, Conceptual) = 6 × 1.5 × 1.3 × 1.0 = 11.7 min

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AI misclassifies content type | Validation gate checks proportionality; UI shows content type for user override |
| mentioned_only flag incorrectly set | Include definition_provided as secondary signal; allow manual correction |
| API costs increase | Use Haiku for 2 of 3 passes; total increase ~30% |
| Existing concepts become stale | is_legacy flag; UI shows legacy badge; no forced re-analysis |

## Migration Plan

1. **Schema Migration:** Add new columns with defaults; no data migration needed
2. **Existing Concepts:** Set `is_legacy=true`, use default values for new fields
3. **Rollback:** New columns are optional; can revert to single-pass by bypassing Pass 1

## Pedagogical Fields for Learning Optimization

These fields aren't just for extraction—they're foundational for the entire learning pipeline:

### How Fields Drive Question Generation

| Field | Question Generation Use |
|-------|------------------------|
| `bloom_level` | Determines question type: Remember→recall, Understand→explain, Apply→problem-solve, Analyze→compare, Evaluate→critique, Create→design |
| `tier` | Prioritization: Tier 3 (Enduring) gets more assessment weight, Tier 1 (Familiar) gets reference-only questions |
| `cognitive_type` | Format selection: Procedural→step-by-step exercises, Conceptual→compare/contrast, Conditional→scenario-based |
| `mentioned_only` | Context-only: Appears in glossary, not directly tested, but may appear as distractors or context |
| `difficulty` | Adaptive sequencing: Start with low difficulty, progress based on performance |

### How Fields Drive AI Tutoring

| Field | AI Tutor Use |
|-------|--------------|
| `bloom_level` | Scaffolding depth: Lower levels get definitions, higher levels get Socratic questioning |
| `tier` | Explanation depth: Tier 3 concepts get deep multi-angle explanations |
| `definition_provided` | Gap detection: If false, tutor must provide external definition |
| `time_allocation_percent` | Session planning: More time on high-allocation concepts |
| `epitome_concept_id` | Anchoring: Always relate back to thesis understanding |

### How Fields Drive Assessment

| Field | Assessment Use |
|-------|---------------|
| `bloom_level` | Scoring rubric: Higher Bloom's = more partial credit opportunities |
| `mentioned_only` | Exclusion: Never directly assess, but may test recognition |
| `tier` | Weighting: Tier 3 mastery required for completion |
| Relationships | Interleaving: Related concepts tested together for deeper understanding |

### Future Integration Points

1. **Question Bank Generation**: Use bloom_level + cognitive_type to generate appropriate question templates
2. **Adaptive Difficulty**: Adjust based on user performance on concepts with similar difficulty/tier
3. **Misconception Detection**: Track patterns in how users answer Tier 2-3 concepts
4. **Personalized Tutoring**: AI explains based on which tier/bloom concepts user struggles with
5. **Mastery Prediction**: Combine tier + bloom + spaced repetition data to predict true understanding

## Open Questions

1. ~~Should Pass 1 run on partial transcript for speed?~~ **Resolved:** No, run on full text for accuracy
2. ~~Should we backfill existing concepts?~~ **Resolved:** No, mark as legacy; user can re-analyze if desired
3. Future: Should users be able to manually set content_type override?
