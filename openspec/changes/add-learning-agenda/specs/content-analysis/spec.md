# content-analysis Specification Delta

## ADDED Requirements

### Requirement: Learning Agenda Generation

The system SHALL generate a unified Learning Agenda that provides a "learning contract" showing overall module objectives, learning path preview, and time investment.

#### Scenario: Learning Agenda generation

- **GIVEN** Pass 1 (content classification) and Pass 2 (concept extraction) complete
- **WHEN** agenda generation stage runs
- **THEN** Learning Agenda generated with module title, central question, objectives
- **AND** key concepts (tier 2-3) summarized with one-liners
- **AND** learning path preview shows phases with timing
- **AND** total time investment and prerequisites included
- **AND** agenda stored in sources.learning_agenda

#### Scenario: Learning Agenda display

- **GIVEN** Learning Agenda exists for project source
- **WHEN** user views project detail
- **THEN** Learning Agenda displayed prominently before concepts and roadmap
- **AND** module title and central question shown as header
- **AND** module objectives listed with Bloom verbs
- **AND** learning path preview shows phases with concept counts and timing
- **AND** prerequisites and time investment clearly displayed

#### Scenario: Learning Agenda content synthesis

- **GIVEN** Pass 1 thesis statement and Pass 2 concepts available
- **WHEN** agenda generation runs
- **THEN** module title synthesized from thesis and key concepts
- **AND** central question captures what learner will answer
- **AND** learning promise states "After this module, you will be able to..."
- **AND** module objectives aggregated from tier 2-3 concept learning objectives
- **AND** content summary is 2-3 sentences describing source coverage

---

## MODIFIED Requirements

### Requirement: Analysis Pipeline Orchestration

The system SHALL orchestrate the full analysis flow with status tracking, including the new Learning Agenda generation stage.

#### Scenario: Pipeline status tracking (MODIFIED)

- **GIVEN** analysis is in progress
- **WHEN** user views project
- **THEN** current stage displayed (transcribing, routing, extracting, generating_agenda, building graph, architecting roadmap, generating summary, validating)
- **AND** progress percentage shown where applicable
- **AND** estimated time remaining displayed
