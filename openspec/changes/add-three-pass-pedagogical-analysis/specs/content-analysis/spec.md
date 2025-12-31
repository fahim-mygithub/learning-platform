# content-analysis Specification Delta

## ADDED Requirements

### Requirement: Content Classification (Rhetorical Router)

The system SHALL classify source content type before concept extraction to set extraction constraints.

#### Scenario: Survey content classification

- **GIVEN** a source with overview/introductory content
- **WHEN** content classification runs
- **THEN** content_type set to 'survey'
- **AND** bloom_ceiling set to 'understand'
- **AND** mode_multiplier set to 1.5
- **AND** extraction_depth set to 'explanations'

#### Scenario: Conceptual content classification

- **GIVEN** a source with deep explanatory content
- **WHEN** content classification runs
- **THEN** content_type set to 'conceptual'
- **AND** bloom_ceiling set to 'analyze'
- **AND** mode_multiplier set to 2.5

#### Scenario: Procedural content classification

- **GIVEN** a source with tutorial/how-to content
- **WHEN** content classification runs
- **THEN** content_type set to 'procedural'
- **AND** bloom_ceiling set to 'apply'
- **AND** mode_multiplier set to 4.0

#### Scenario: Thesis statement identification

- **GIVEN** source content analyzed
- **WHEN** classification completes
- **THEN** thesis_statement extracted if present
- **AND** thesis used to identify epitome concept

---

### Requirement: Pedagogical Concept Classification

The system SHALL classify each extracted concept with pedagogical metadata.

#### Scenario: Tier classification

- **GIVEN** concepts extracted from source
- **WHEN** classification runs
- **THEN** each concept assigned tier 1, 2, or 3
- **AND** tier 1 = Familiar (background knowledge)
- **AND** tier 2 = Important (core concepts)
- **AND** tier 3 = Enduring Understanding (thesis-level)

#### Scenario: Mentioned-only detection

- **GIVEN** a concept referenced but not explained in source
- **WHEN** concept extraction runs
- **THEN** mentioned_only flag set to true
- **AND** definition_provided set to false
- **AND** concept excluded from learning roadmap
- **AND** concept shown with warning badge in UI

#### Scenario: Bloom's level assignment

- **GIVEN** concepts extracted from source
- **WHEN** classification runs
- **THEN** each concept assigned bloom_level
- **AND** bloom_level cannot exceed bloom_ceiling from Pass 1
- **AND** levels are: remember, understand, apply, analyze, evaluate, create

---

### Requirement: Analysis Validation Gate

The system SHALL validate analysis results before completion.

#### Scenario: Proportionality check

- **GIVEN** concepts extracted from source
- **WHEN** validation runs
- **THEN** concept count compared to source duration
- **AND** warning generated if count exceeds 3 concepts per minute
- **AND** validation result stored

#### Scenario: Bloom's ceiling enforcement

- **GIVEN** concepts with bloom_level assigned
- **WHEN** validation runs
- **THEN** concepts violating bloom_ceiling flagged
- **AND** warning generated for violations
- **AND** violations can be corrected or accepted

#### Scenario: Time sanity check

- **GIVEN** roadmap with estimated time
- **WHEN** validation runs
- **THEN** learning time compared to source duration
- **AND** warning if learning time exceeds 10x source duration for non-procedural content
- **AND** warning if learning time exceeds 15x source duration for procedural content

---

### Requirement: Epitome Identification

The system SHALL identify the thesis concept (epitome) for hierarchical organization.

#### Scenario: Epitome detection

- **GIVEN** tier 3 concepts exist
- **WHEN** roadmap generation runs
- **THEN** epitome concept identified based on thesis statement
- **AND** epitome placed at Level 0 in roadmap
- **AND** other concepts organized as elaborations

#### Scenario: Epitome display

- **GIVEN** epitome concept identified
- **WHEN** user views roadmap
- **THEN** epitome highlighted distinctly at top
- **AND** Level 0 shown before Level 1 (Foundations)

---

## MODIFIED Requirements

### Requirement: Concept Extraction

The system SHALL identify discrete learnable units from source content using AI with three-pass pedagogical analysis.

#### Scenario: Concept identification from video

- **GIVEN** a transcribed video source
- **WHEN** concept extraction runs
- **THEN** Pass 1 classifies content type and sets constraints
- **AND** Pass 2 extracts concepts respecting constraints
- **AND** AI identifies minimum 80% of explained concepts
- **AND** each concept has name (2-5 words)
- **AND** each concept has definition (1-2 sentences)
- **AND** each concept has 3-5 key points
- **AND** each concept has tier (1-3)
- **AND** each concept has mentioned_only flag
- **AND** each concept has bloom_level

#### Scenario: Concept identification from text content

- **GIVEN** a PDF or URL source with text content
- **WHEN** concept extraction runs
- **THEN** content classified before extraction
- **AND** concepts extracted with pedagogical metadata
- **AND** source references link to page numbers or sections

#### Scenario: Cognitive type classification

- **GIVEN** concepts are extracted
- **WHEN** classification runs
- **THEN** each concept tagged with cognitive type
- **AND** types are: declarative, conceptual, procedural, conditional, or metacognitive
- **AND** classification used for appropriate learning activities

#### Scenario: Difficulty estimation

- **GIVEN** concepts are extracted
- **WHEN** difficulty estimation runs
- **THEN** each concept assigned difficulty score 1-10
- **AND** score based on abstractness, prerequisite depth, relational complexity
- **AND** difficulty informs learning sequence

---

### Requirement: Roadmap Generation

The system SHALL create sequenced learning paths from knowledge graphs with calibrated time estimation.

#### Scenario: Level organization

- **GIVEN** knowledge graph with prerequisites
- **WHEN** roadmap is generated
- **THEN** concepts organized into levels by prerequisite depth
- **AND** Level 0 contains epitome concept (if identified)
- **AND** Level 1 contains concepts with no prerequisites
- **AND** subsequent levels contain concepts whose prerequisites are in earlier levels
- **AND** mentioned_only concepts excluded from levels

#### Scenario: Mastery gate definition

- **GIVEN** concepts organized into levels
- **WHEN** roadmap generation completes
- **THEN** mastery gates defined between levels
- **AND** gates require minimum mastery percentage (default 80%)
- **AND** users cannot access later levels until gates passed

#### Scenario: Calibrated time estimation

- **GIVEN** roadmap with levels and Pass 1 results
- **WHEN** time estimation runs
- **THEN** learning time = source_duration x mode_multiplier x density_modifier x knowledge_type_factor
- **AND** mode_multiplier from Pass 1 (1.5/2.5/4.0)
- **AND** density_modifier based on concepts per minute
- **AND** time sanity validated before completion

---

### Requirement: Analysis Pipeline Orchestration

The system SHALL orchestrate the full analysis flow with three-pass architecture and status tracking.

#### Scenario: Pipeline stages

- **GIVEN** source ready for analysis
- **WHEN** analysis pipeline runs
- **THEN** stages execute in order: transcribing, routing_content (Pass 1), extracting_concepts (Pass 2), building_graph, architecting_roadmap (Pass 3), validating
- **AND** progress tracked per stage

#### Scenario: Automatic analysis trigger

- **GIVEN** source upload completes successfully
- **WHEN** source status changes to 'completed'
- **THEN** analysis pipeline starts automatically
- **AND** user sees analysis progress indicator

#### Scenario: Pipeline status tracking

- **GIVEN** analysis is in progress
- **WHEN** user views project
- **THEN** current stage displayed with descriptive label
- **AND** stage labels: Analyzing content type, Extracting concepts, Building knowledge graph, Creating roadmap, Validating results
- **AND** progress percentage shown where applicable
- **AND** estimated time remaining displayed

#### Scenario: Pipeline failure recovery

- **GIVEN** analysis fails at any stage
- **WHEN** user views failed analysis
- **THEN** error message explains failure
- **AND** retry option available
- **AND** partial results preserved where possible

#### Scenario: Analysis completion

- **GIVEN** analysis and validation complete successfully
- **WHEN** pipeline finishes
- **THEN** validation warnings shown if any
- **AND** project status updated to 'ready'
- **AND** concepts and roadmap accessible
- **AND** user notified of completion

---

### Requirement: Analysis Results Display

The system SHALL display analysis results with pedagogical metadata in the project detail view.

#### Scenario: Concepts list display

- **GIVEN** concepts extracted for project
- **WHEN** user views project detail
- **THEN** concepts displayed in cards showing name, definition, difficulty
- **AND** cognitive type shown as badge
- **AND** tier badge shown (Familiar/Important/Enduring)
- **AND** Bloom's level badge shown
- **AND** mentioned_only concepts shown with warning indicator
- **AND** legacy concepts shown with legacy badge
- **AND** source timestamp link available for video concepts

#### Scenario: Roadmap visualization

- **GIVEN** roadmap generated for project
- **WHEN** user views roadmap tab
- **THEN** Level 0 (epitome) shown at top if present
- **AND** levels displayed in sequence
- **AND** each level shows concept count and calibrated time estimate
- **AND** mastery gates visually indicated between levels
- **AND** content type indicator shown (Survey/Conceptual/Procedural)
- **AND** validation warnings shown if any

#### Scenario: Empty analysis state

- **GIVEN** source uploaded but analysis not started
- **WHEN** user views project
- **THEN** analysis pending state shown
- **AND** "Start Analysis" option available if needed

---
