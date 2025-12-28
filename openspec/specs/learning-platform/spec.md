# Learning Platform Specification

## Overview

AI-Powered Active Learning Platform that transforms passive content (videos, PDFs, articles) into personalized active learning experiences producing lasting retention, grounded in cognitive science research.

### Target User
Adult professionals seeking to learn new domains efficiently, with limited time (10-20 minutes daily) and a history of abandoning passive learning approaches due to poor retention.

### Research Foundation
All features are grounded in cognitive science research with documented effect sizes:
- Testing Effect (g = 0.50-0.81): Retrieval practice over restudying
- Spacing Effect (d = 0.54-0.85): Distributed practice over massed practice
- Successive Relearning (d = 1.52-4.19): Retrieval + spacing + criterion mastery
- Pretesting Effect (d = 1.1): Testing before learning improves encoding
- Cognitive Load Theory: Working memory limited to 3-4 chunks
- Sleep Consolidation: 20-40% improvement with proper timing

### Technology Stack
- **Platform**: React Native (iOS & Android native apps)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI Provider**: Anthropic Claude (Sonnet for complex tasks, Haiku for simple)
- **Interactive Sandbox**: Pixi.js/Konva (2D canvas rendering)
- **Scope**: Full vision (all 10 phases)

---

## Phase 1: Foundation Infrastructure

### Requirement: User Authentication & Account Management
The system SHALL provide secure user authentication with multiple provider support.

#### Scenario: Email/password registration
- **WHEN** user provides email and password meeting minimum requirements
- **THEN** account is created and verification email sent
- **AND** user cannot access full features until email verified

#### Scenario: OAuth authentication
- **WHEN** user selects Google or Apple sign-in
- **THEN** user is authenticated via OAuth flow
- **AND** account created or linked to existing account

#### Scenario: Session management
- **WHEN** user is authenticated
- **THEN** session persists across app restarts
- **AND** user can sign out from any device

### Requirement: Project Management
The system SHALL allow users to create and manage learning projects.

#### Scenario: Project creation
- **WHEN** user creates a new project with title
- **THEN** project is initialized in draft state
- **AND** user can add sources to the project

#### Scenario: Project listing
- **WHEN** user views their projects
- **THEN** all projects displayed with progress indicators
- **AND** projects sorted by last accessed date

#### Scenario: Project deletion
- **WHEN** user deletes a project
- **THEN** confirmation required before deletion
- **AND** all associated sources and progress removed

### Requirement: Source Upload & Storage
The system SHALL accept multiple content types for analysis.

#### Scenario: Video file upload
- **WHEN** user uploads video file (MP4, MOV, WebM up to 2GB)
- **THEN** file is validated and stored securely
- **AND** upload progress displayed to user

#### Scenario: PDF document upload
- **WHEN** user uploads PDF (up to 100 pages)
- **THEN** document is stored and queued for analysis
- **AND** user notified when analysis begins

#### Scenario: URL submission
- **WHEN** user pastes YouTube URL or article link
- **THEN** content is fetched and stored for analysis
- **AND** metadata extracted and displayed

#### Scenario: Corrupted file handling
- **WHEN** user uploads corrupted or invalid file
- **THEN** clear error message displayed
- **AND** user prompted to re-upload valid file

---

## Phase 2: Content Analysis Pipeline

### Requirement: Transcription Service
The system SHALL transcribe video and audio content with high accuracy.

#### Scenario: Video transcription
- **WHEN** video source is submitted for analysis
- **THEN** audio extracted and transcribed
- **AND** transcription accuracy exceeds 95%

#### Scenario: Timestamp alignment
- **WHEN** transcription completes
- **THEN** text aligned with video timestamps
- **AND** concepts linked to specific time ranges

### Requirement: Concept Extraction
The system SHALL identify discrete learnable units from source content.

#### Scenario: Concept identification
- **WHEN** content analysis runs
- **THEN** minimum 80% of key concepts extracted
- **AND** each concept has name, definition, and key points

#### Scenario: Modality classification
- **WHEN** concepts are extracted
- **THEN** each tagged with cognitive type (declarative, conceptual, procedural, conditional, metacognitive)
- **AND** classification used for appropriate question generation

#### Scenario: Difficulty estimation
- **WHEN** concepts are identified
- **THEN** difficulty score (1-10) calculated per concept
- **AND** score based on abstractness, prerequisite depth, relational complexity

### Requirement: Knowledge Graph Construction
The system SHALL build prerequisite and relationship graphs from extracted concepts.

#### Scenario: Prerequisite mapping
- **WHEN** concepts are extracted
- **THEN** prerequisite relationships identified
- **AND** learning path respects dependency order

#### Scenario: Relationship types
- **WHEN** knowledge graph is built
- **THEN** relationships typed (causal, taxonomic, temporal, contrasts_with)
- **AND** graph used for interleaving and review scheduling

### Requirement: Roadmap Generation
The system SHALL create sequenced learning paths from knowledge graphs.

#### Scenario: Level organization
- **WHEN** roadmap is generated
- **THEN** concepts organized into levels by prerequisites
- **AND** mastery gates defined between phases

#### Scenario: Time estimation
- **WHEN** roadmap is complete
- **THEN** estimated duration shown per level and total
- **AND** session count estimated based on user preferences

---

## Phase 3: Spaced Repetition Engine

### Requirement: FSRS Scheduling Algorithm
The system SHALL implement the FSRS algorithm for optimal review scheduling.

#### Scenario: Initial scheduling
- **WHEN** concept first learned
- **THEN** initial stability set to 1.0 day
- **AND** first review scheduled based on desired retention (default 0.90)

#### Scenario: Successful review
- **WHEN** user correctly recalls concept
- **THEN** stability increases per FSRS formula
- **AND** next review interval expands

#### Scenario: Failed review
- **WHEN** user fails to recall concept
- **THEN** interval contracts appropriately
- **AND** concept re-enters active review queue

#### Scenario: Individual parameters
- **WHEN** user reviews multiple concepts over time
- **THEN** FSRS parameters personalized per user per concept
- **AND** scheduling optimizes for individual decay rates

### Requirement: Concept State Machine
The system SHALL track concept mastery through defined states.

#### Scenario: State progression
- **WHEN** concept first exposed
- **THEN** state is EXPOSED
- **AND** progresses through FRAGILE -> DEVELOPING -> SOLID -> MASTERED

#### Scenario: Mastery requirements
- **WHEN** concept reaches MASTERED state
- **THEN** minimum 3 successful sessions on different days
- **AND** fast + correct + successful transfer question

#### Scenario: Misconception detection
- **WHEN** user answers incorrectly with high confidence
- **THEN** state transitions to MISCONCEIVED
- **AND** corrective feedback scheduled

---

## Phase 4: Session Construction

### Requirement: Cognitive Load Budgeting
The system SHALL enforce capacity limits based on cognitive science.

#### Scenario: New concept limit
- **WHEN** session is constructed
- **THEN** maximum 4 new concepts per session (hard limit)
- **AND** capacity calculated using sleep + time + fatigue modifiers

#### Scenario: Capacity warning
- **WHEN** user has consumed >75% of daily capacity
- **THEN** warning displayed recommending stop
- **AND** user can choose to continue with explicit override

#### Scenario: Capacity blocking
- **WHEN** capacity exceeds 90%
- **THEN** new material blocked entirely
- **AND** only review content available

### Requirement: Session Structure
The system SHALL construct sessions following research-based patterns.

#### Scenario: Pretest generation
- **WHEN** session includes new concepts
- **THEN** pretest questions generated for upcoming material
- **AND** user informed wrong answers expected and beneficial

#### Scenario: Interleaving
- **WHEN** session includes multiple topics
- **THEN** concepts interleaved (Review -> New -> Review -> New)
- **AND** interleaving degree adapts to user tolerance

#### Scenario: Consolidation practice
- **WHEN** session nears completion
- **THEN** mixed retrieval across all session concepts
- **AND** application and transfer questions included

### Requirement: Sleep-Aware Scheduling
The system SHALL respect sleep patterns for optimal consolidation.

#### Scenario: Bedtime cutoff
- **WHEN** user accesses app within 2 hours of bedtime
- **THEN** no new material introduced
- **AND** only review content offered

#### Scenario: Morning check
- **WHEN** user opens app in morning
- **THEN** quick check on previous day's material offered
- **AND** consolidation success measured

---

## Phase 5: Question Generation & Assessment

### Requirement: Retrieval Practice Generation
The system SHALL generate diverse question types per concept.

#### Scenario: Question variety
- **WHEN** questions generated for concept
- **THEN** minimum 5 distinct questions created
- **AND** types include free recall, cued recall, application, discrimination

#### Scenario: Free recall priority
- **WHEN** question type selected for session
- **THEN** free recall comprises >40% of retrieval practice
- **AND** recognition (MC) limited to <10% (early exposure only)

#### Scenario: Difficulty progression
- **WHEN** questions generated
- **THEN** span from recognition to transfer
- **AND** difficulty increases with mastery level

### Requirement: AI Response Evaluation
The system SHALL evaluate free-response answers accurately.

#### Scenario: Accuracy evaluation
- **WHEN** user submits free-response answer
- **THEN** AI evaluates against criteria (key terms, relationships)
- **AND** evaluation agrees with human raters >90% of time

#### Scenario: Partial credit
- **WHEN** answer contains some correct elements
- **THEN** partial credit awarded appropriately
- **AND** feedback identifies missing or incorrect elements

#### Scenario: Misconception detection
- **WHEN** answer matches known misconception pattern
- **THEN** misconception flagged for explicit addressing
- **AND** corrective feedback provided with contrast

### Requirement: Immediate Feedback
The system SHALL provide explanatory feedback for all responses.

#### Scenario: Correct answer feedback
- **WHEN** user answers correctly
- **THEN** confirmation and reinforcing explanation shown
- **AND** connection to related concepts highlighted

#### Scenario: Incorrect answer feedback
- **WHEN** user answers incorrectly
- **THEN** correct answer shown with explanation of why
- **AND** common confusion addressed if applicable

---

## Phase 6: Source-Agnostic Interactive Sandbox

### Core Principle
The interactive sandbox is a blank 2D canvas where AI dynamically generates learning interactions based on ANY source content. Unlike static quiz apps, the experience is generated from the source material, not designed for specific content types.

### Requirement: Sandbox Framework
The system SHALL provide a source-agnostic canvas for AI-generated interactions using Pixi.js/Konva.

#### Scenario: Canvas initialization
- **WHEN** interactive practice mode activated
- **THEN** Pixi.js/Konva canvas initialized with responsive sizing
- **AND** touch-first event handling enabled (44px minimum targets)

#### Scenario: Schema-driven rendering
- **WHEN** AI generates interaction schema (JSON)
- **THEN** sandbox interprets and renders the specified elements
- **AND** supports: draggable, dropzone, text-input, sequence, matching, branching primitives

#### Scenario: Action capture
- **WHEN** user interacts with sandbox elements
- **THEN** all actions captured with timestamps
- **AND** state changes logged for AI evaluation

### Requirement: AI Interaction Generation
The system SHALL generate appropriate interactions based on cognitive type and learning objectives.

#### Scenario: Cognitive type matching
- **WHEN** concept has cognitive type (factual/conceptual/procedural/conditional/metacognitive)
- **THEN** AI generates interaction type aligned to cognitive demands:
  - Factual: Fill-in-blank, matching, rapid recall
  - Conceptual: Drag-to-build diagrams, cause-effect chains
  - Procedural: Step sequencing, decision trees, simulated workflows
  - Conditional: Scenario judgment, branching consequences
  - Metacognitive: Self-explanation prompts, confidence calibration
- **AND** interaction requires retrieval, not just recognition

#### Scenario: Schema caching
- **WHEN** interaction first generated for concept
- **THEN** base schema cached for reuse
- **AND** variations regenerated for review sessions (smart hybrid caching)

### Requirement: Interaction Schema Specification
The system SHALL define a standard JSON schema for AI-generated interactions.

```json
{
  "interactionId": "uuid",
  "conceptId": "concept_xyz",
  "cognitiveType": "conceptual",
  "title": "Understanding [Concept]",
  "instructions": "User-facing task description",
  "elements": [
    {"type": "draggable", "id": "elem_1", "label": "...", "position": {...}},
    {"type": "dropzone", "id": "zone_1", "label": "...", "accepts": [...]}
  ],
  "correctState": {"zone_1": ["elem_1", "elem_2"]},
  "hints": ["Hint 1...", "Hint 2..."],
  "evaluationRubric": {
    "fullCredit": "Criteria description",
    "partialCredit": "Criteria description",
    "misconceptions": ["Common error 1", "Common error 2"]
  }
}
```

### Requirement: Active Learning Enforcement
The sandbox SHALL enforce research-based learning principles.

#### Scenario: Retrieval over recognition
- **WHEN** interaction rendered
- **THEN** answer never shown first
- **AND** user must produce/arrange before revealing

#### Scenario: Productive failure
- **WHEN** user interacts with elements
- **THEN** 1-2 attempts allowed before hints appear
- **AND** struggle time tracked (some struggle is desirable)

#### Scenario: Immediate feedback
- **WHEN** user submits interaction state
- **THEN** AI evaluates against success criteria
- **AND** elaborative feedback provided (not just right/wrong)

#### Scenario: Criterion mastery
- **WHEN** user attempts interaction
- **THEN** must reach success state before advancing
- **AND** failed attempts inform FSRS scheduling

### Requirement: Evaluation Protocol
The sandbox SHALL produce testable outputs for AI assessment.

#### Scenario: Performance capture
- **WHEN** interaction completes
- **THEN** timestamped action log produced
- **AND** decision points and final state captured

#### Scenario: AI assessment
- **WHEN** performance data available
- **THEN** AI evaluates against rubric in real-time
- **AND** score and feedback generated for learning engine

---

## Phase 7: User Interface & Experience

### Requirement: Mobile-First Design
The system SHALL be optimized for thumb-friendly mobile interaction.

#### Scenario: Touch targets
- **WHEN** interactive elements displayed
- **THEN** minimum 44x44px touch targets
- **AND** primary actions in thumb-reachable zone

#### Scenario: Keyboard handling
- **WHEN** keyboard appears for text input
- **THEN** content scrolls to keep input visible
- **AND** submit action accessible above keyboard

### Requirement: Progress Visualization
The system SHALL display meaningful progress metrics.

#### Scenario: Mastery grid
- **WHEN** user views progress
- **THEN** concept mastery states shown visually
- **AND** state colors consistent (gray->blue->orange->yellow->lime->emerald)

#### Scenario: Streak display
- **WHEN** user maintains daily learning
- **THEN** streak count displayed prominently
- **AND** streak freeze available to prevent punishment for missed days

### Requirement: Gamification System
The system SHALL reinforce learning behaviors through achievements.

#### Scenario: Mastery milestones
- **WHEN** user masters concept or completes level
- **THEN** celebration animation displayed
- **AND** achievement recorded if applicable

#### Scenario: Streak forgiveness
- **WHEN** user misses a day
- **THEN** streak freeze auto-applied if available
- **AND** compassionate messaging if streak lost

### Requirement: Accessibility Compliance
The system SHALL meet WCAG 2.1 AA standards minimum.

#### Scenario: Screen reader support
- **WHEN** screen reader active
- **THEN** all content announced appropriately
- **AND** question/answer states clearly communicated

#### Scenario: Color contrast
- **WHEN** text displayed
- **THEN** minimum 4.5:1 contrast ratio maintained
- **AND** color never sole indicator of information

---

## Phase 8: Forgiveness & Autonomy Features

### Requirement: Review Debt Management
The system SHALL handle review backlogs gracefully.

#### Scenario: Debt detection
- **WHEN** overdue reviews exceed 20 items
- **THEN** debt level categorized (Healthy/Elevated/High/Critical)
- **AND** appropriate intervention offered

#### Scenario: Load spreading
- **WHEN** debt is Elevated or higher
- **THEN** overdue items spread across multiple days
- **AND** daily load never exceeds 2x normal

#### Scenario: Bankruptcy option
- **WHEN** debt exceeds 100 items
- **THEN** bankruptcy options prominently displayed
- **AND** zero guilt/shame language used

### Requirement: Learner Autonomy Controls
The system SHALL respect adult learner agency.

#### Scenario: Just-in-time access
- **WHEN** user searches for specific content
- **THEN** content available immediately regardless of schedule
- **AND** warning shown if prerequisites missing

#### Scenario: Schedule override
- **WHEN** user wants to defer, skip, or prioritize content
- **THEN** override options easily accessible
- **AND** no negative consequences for overrides

#### Scenario: Visible rationale
- **WHEN** system makes recommendation
- **THEN** "Why?" explanation available
- **AND** reasoning based on research and user data

### Requirement: Variable Executive Function Support
The system SHALL adapt to daily energy variations.

#### Scenario: Energy level selection
- **WHEN** session starts
- **THEN** optional energy check offered (High/Normal/Low/Quick)
- **AND** session adapts difficulty and length accordingly

#### Scenario: Easy day mode
- **WHEN** user selects Easy Day
- **THEN** review only, simpler formats, shorter session
- **AND** consistency celebrated over intensity

---

## Phase 9: Account Settings & Subscription

### Requirement: Subscription Tier Management
The system SHALL support multiple subscription tiers.

#### Scenario: Free tier limits
- **WHEN** user on free tier
- **THEN** 1 project, 1 source, 50K tokens/month
- **AND** upgrade prompts when limits approached

#### Scenario: Paid tier features
- **WHEN** user on Learner/Pro/Team tier
- **THEN** appropriate limits and features unlocked
- **AND** token usage tracked and displayed

### Requirement: BYOK (Bring Your Own Key) Support
The system SHALL allow users to provide their own API keys.

#### Scenario: API key configuration
- **WHEN** user enters API key for supported provider
- **THEN** key validated and encrypted at rest (AES-256)
- **AND** platform uses user's key for AI operations

#### Scenario: Budget limits
- **WHEN** user sets daily/monthly budget limits
- **THEN** usage tracked against limits
- **AND** alerts at configurable threshold (default 80%)

### Requirement: Local LLM Support
The system SHALL support local model execution.

#### Scenario: Ollama integration
- **WHEN** user configures local endpoint
- **THEN** connection validated
- **AND** compatible models used for operations

#### Scenario: Hybrid mode
- **WHEN** user configures hybrid (local + cloud)
- **THEN** simple tasks use local, complex use cloud
- **AND** privacy preserved for routine operations

---

## Phase 10: Multi-Source Integration

### Requirement: Source Synthesis
The system SHALL integrate multiple sources into unified roadmaps.

#### Scenario: Overlapping content detection
- **WHEN** new source added to existing project
- **THEN** overlapping concepts identified (>80% precision)
- **AND** unified under single concept with multiple references

#### Scenario: Sequential content
- **WHEN** "Part 2" or sequel content added
- **THEN** new levels appended to existing roadmap
- **AND** prerequisite chain maintained

#### Scenario: Progress preservation
- **WHEN** source added to in-progress project
- **THEN** all existing progress preserved
- **AND** new concepts initialized as Unexposed

---

## Testing & Verification Strategy

### Console Logging Requirements
Each phase implementation SHALL include comprehensive console logging for:
- User action events (button clicks, navigation, form submissions)
- API call initiation and completion with timing
- State transitions (concept states, session states)
- Error conditions with stack traces
- Performance metrics (render times, response times)

### Screenshot Verification Points
Each phase SHALL define verification checkpoints where screenshots capture:
- Initial state before user action
- Intermediate states during multi-step flows
- Final state after action completion
- Error states when applicable

### Chrome DevTools MCP Integration
Testing workflow SHALL leverage Chrome DevTools MCP for:
- DOM inspection and verification
- Network request monitoring
- Console log capture and analysis
- Performance profiling
- Screenshot capture automation

---

## Acceptance Criteria Summary

| Phase | Critical Acceptance Criteria |
|-------|------------------------------|
| 1 | User can register, login, create projects, upload sources |
| 2 | Sources transcribed, concepts extracted with >80% accuracy |
| 3 | FSRS scheduling functional, states track correctly |
| 4 | Sessions respect capacity limits, include pretests |
| 5 | Questions generated, AI evaluation >90% human agreement |
| 6 | Source-agnostic sandbox renders AI-generated interactions, captures user actions, AI evaluates performance |
| 7 | Mobile-friendly, accessible, gamification working |
| 8 | Debt management, autonomy controls, energy adaptation |
| 9 | Subscriptions, BYOK, local LLM all functional |
| 10 | Multi-source synthesis preserves progress |

---

## Non-Functional Requirements

### Performance
- Content analysis: <5 minutes for typical video (30-60 min)
- Session load time: <2 seconds
- Question response: <1 second AI evaluation
- Offline: Core review functionality works without connectivity

### Security
- API keys encrypted at rest (AES-256)
- User data encrypted in transit (TLS 1.3)
- GDPR compliance: Export all data within 24 hours
- Account deletion: Remove all data within 30 days

### Scalability
- Support 10,000+ concurrent users
- Handle 100+ concepts per project
- 500+ questions per session without degradation
