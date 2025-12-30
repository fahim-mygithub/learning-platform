# content-analysis Specification

## Purpose
TBD - created by archiving change implement-content-analysis-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Video/Audio Transcription

The system SHALL transcribe video and audio content with timestamp alignment.

#### Scenario: Video source transcription

- **GIVEN** a video source with audio track
- **WHEN** analysis is initiated
- **THEN** audio is extracted and sent to transcription service
- **AND** transcription stored with timestamped segments
- **AND** status updated to reflect progress

#### Scenario: Transcription accuracy

- **GIVEN** clear audio content
- **WHEN** transcription completes
- **THEN** accuracy exceeds 95% for standard speech
- **AND** segments aligned within 1 second of actual timing

#### Scenario: Transcription failure handling

- **GIVEN** audio extraction or transcription fails
- **WHEN** error occurs
- **THEN** status set to 'failed' with error message
- **AND** user can retry transcription
- **AND** partial progress is not lost

---

### Requirement: Concept Extraction

The system SHALL identify discrete learnable units from source content using AI.

#### Scenario: Concept identification from video

- **GIVEN** a transcribed video source
- **WHEN** concept extraction runs
- **THEN** AI identifies minimum 80% of key concepts
- **AND** each concept has name (2-5 words)
- **AND** each concept has definition (1-2 sentences)
- **AND** each concept has 3-5 key points

#### Scenario: Concept identification from text content

- **GIVEN** a PDF or URL source with text content
- **WHEN** concept extraction runs
- **THEN** concepts extracted directly from text
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

### Requirement: Knowledge Graph Construction

The system SHALL build prerequisite and relationship graphs from extracted concepts.

#### Scenario: Prerequisite identification

- **GIVEN** concepts extracted from source
- **WHEN** knowledge graph is built
- **THEN** prerequisite relationships identified between concepts
- **AND** learning path respects dependency order
- **AND** no circular prerequisites exist

#### Scenario: Relationship type classification

- **GIVEN** related concepts identified
- **WHEN** relationship analysis runs
- **THEN** relationships typed as: prerequisite, causal, taxonomic, temporal, or contrasts_with
- **AND** relationship strength (0.0-1.0) indicates confidence
- **AND** graph used for interleaving and review scheduling

#### Scenario: Multi-source graph merging

- **GIVEN** new source added to project with existing concepts
- **WHEN** knowledge graph updates
- **THEN** overlapping concepts identified and unified
- **AND** new relationships integrated without duplicates
- **AND** existing progress preserved

---

### Requirement: Roadmap Generation

The system SHALL create sequenced learning paths from knowledge graphs.

#### Scenario: Level organization

- **GIVEN** knowledge graph with prerequisites
- **WHEN** roadmap is generated
- **THEN** concepts organized into levels by prerequisite depth
- **AND** Level 1 contains concepts with no prerequisites
- **AND** subsequent levels contain concepts whose prerequisites are in earlier levels

#### Scenario: Mastery gate definition

- **GIVEN** concepts organized into levels
- **WHEN** roadmap generation completes
- **THEN** mastery gates defined between levels
- **AND** gates require minimum mastery percentage (default 80%)
- **AND** users cannot access later levels until gates passed

#### Scenario: Time estimation

- **GIVEN** roadmap with levels
- **WHEN** time estimation runs
- **THEN** estimated duration shown per level
- **AND** total project duration calculated
- **AND** session count estimated based on concept difficulty

---

### Requirement: Analysis Pipeline Orchestration

The system SHALL orchestrate the full analysis flow with status tracking.

#### Scenario: Automatic analysis trigger

- **GIVEN** source upload completes successfully
- **WHEN** source status changes to 'completed'
- **THEN** analysis pipeline starts automatically
- **AND** user sees analysis progress indicator

#### Scenario: Pipeline status tracking

- **GIVEN** analysis is in progress
- **WHEN** user views project
- **THEN** current stage displayed (transcribing, analyzing, building graph, generating roadmap)
- **AND** progress percentage shown where applicable
- **AND** estimated time remaining displayed

#### Scenario: Pipeline failure recovery

- **GIVEN** analysis fails at any stage
- **WHEN** user views failed analysis
- **THEN** error message explains failure
- **AND** retry option available
- **AND** partial results preserved where possible

#### Scenario: Analysis completion

- **GIVEN** analysis completes successfully
- **WHEN** pipeline finishes
- **THEN** project status updated to 'ready'
- **AND** concepts and roadmap accessible
- **AND** user notified of completion

---

### Requirement: Analysis Results Display

The system SHALL display analysis results in the project detail view.

#### Scenario: Concepts list display

- **GIVEN** concepts extracted for project
- **WHEN** user views project detail
- **THEN** concepts displayed in cards showing name, definition, difficulty
- **AND** cognitive type shown as badge
- **AND** source timestamp link available for video concepts

#### Scenario: Roadmap visualization

- **GIVEN** roadmap generated for project
- **WHEN** user views roadmap tab
- **THEN** levels displayed in sequence
- **AND** each level shows concept count and time estimate
- **AND** mastery gates visually indicated between levels

#### Scenario: Empty analysis state

- **GIVEN** source uploaded but analysis not started
- **WHEN** user views project
- **THEN** analysis pending state shown
- **AND** "Start Analysis" option available if needed

---

