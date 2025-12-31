# Spaced Repetition Specification

## Overview

FSRS-5 based spaced repetition engine for optimal review scheduling and mastery tracking.

---

## ADDED Requirements

### Requirement: FSRS Scheduling Algorithm

The system SHALL implement the FSRS-5 algorithm for optimal review scheduling.

#### Scenario: Initial scheduling

- **GIVEN** a concept is first exposed to the user
- **WHEN** the user rates their recall (Again/Hard/Good/Easy)
- **THEN** initial stability set based on rating (0.4 to 15.5 days)
- **AND** first review scheduled based on desired retention (default 0.90)

#### Scenario: Successful review

- **GIVEN** a concept is due for review
- **WHEN** user rates recall as Good or Easy
- **THEN** stability increases per FSRS formula
- **AND** next review interval expands accordingly

#### Scenario: Failed review

- **GIVEN** a concept is due for review
- **WHEN** user rates recall as Again
- **THEN** interval contracts to relearn
- **AND** concept re-enters active review queue

#### Scenario: Interval preview

- **GIVEN** a user is reviewing a concept
- **WHEN** answer is revealed
- **THEN** predicted intervals shown for all 4 ratings
- **AND** user can make informed rating choice

---

### Requirement: Concept State Machine

The system SHALL track concept mastery through 7 defined states.

#### Scenario: State progression UNSEEN to EXPOSED

- **GIVEN** a concept in UNSEEN state
- **WHEN** user first encounters the concept
- **THEN** state transitions to EXPOSED
- **AND** initial FSRS parameters are set

#### Scenario: State progression EXPOSED to FRAGILE

- **GIVEN** a concept in EXPOSED state
- **WHEN** user successfully reviews the concept
- **THEN** state transitions to FRAGILE
- **AND** review history recorded

#### Scenario: State progression FRAGILE to DEVELOPING

- **GIVEN** a concept in FRAGILE state
- **WHEN** user has 2+ successful sessions on different days
- **THEN** state transitions to DEVELOPING
- **AND** consecutive correct count tracked

#### Scenario: State progression DEVELOPING to SOLID

- **GIVEN** a concept in DEVELOPING state
- **WHEN** user has 3+ successful sessions on different days
- **THEN** state transitions to SOLID
- **AND** mastery progress visible to user

#### Scenario: State progression SOLID to MASTERED

- **GIVEN** a concept in SOLID state
- **WHEN** user answers fast AND correct AND passes transfer question
- **THEN** state transitions to MASTERED
- **AND** concept graduates from active review

#### Scenario: Misconception detection

- **GIVEN** a concept in any active state
- **WHEN** user answers incorrectly with high confidence
- **THEN** state transitions to MISCONCEIVED
- **AND** corrective feedback scheduled

#### Scenario: State regression on failure

- **GIVEN** a concept in SOLID or DEVELOPING state
- **WHEN** user fails a review (rates Again)
- **THEN** state may regress to FRAGILE
- **AND** stability reduced appropriately

---

### Requirement: Review Queue Management

The system SHALL manage a prioritized queue of due review items.

#### Scenario: Due items query

- **GIVEN** user has concepts with review dates
- **WHEN** due items are queried
- **THEN** all items with due_date <= now are returned
- **AND** items are sorted by priority

#### Scenario: Priority ordering

- **GIVEN** multiple items are due for review
- **WHEN** queue is retrieved
- **THEN** overdue items appear first
- **AND** within overdue, higher decay urgency ranks higher

#### Scenario: Queue statistics

- **GIVEN** user views home screen
- **WHEN** queue stats are loaded
- **THEN** due count displayed prominently
- **AND** "All caught up!" shown when queue empty

#### Scenario: Project filtering

- **GIVEN** user has multiple projects
- **WHEN** viewing a specific project
- **THEN** review queue filters to that project
- **AND** stats reflect project scope only

---

### Requirement: Mastery State Visualization

The system SHALL display mastery states using consistent color coding.

#### Scenario: State badge display

- **GIVEN** a concept with a mastery state
- **WHEN** displayed in any UI context
- **THEN** badge shows state name
- **AND** badge color matches theme:
  - UNSEEN: Gray (#9CA3AF)
  - EXPOSED: Blue (#3B82F6)
  - FRAGILE: Orange (#F97316)
  - DEVELOPING: Yellow (#EAB308)
  - SOLID: Lime (#84CC16)
  - MASTERED: Emerald (#10B981)

#### Scenario: Aggregated mastery progress

- **GIVEN** a project with multiple concepts
- **WHEN** viewing roadmap or project summary
- **THEN** aggregated mastery percentage shown
- **AND** color reflects distribution of states

---

### Requirement: Review Session Flow

The system SHALL provide a structured review session experience.

#### Scenario: Session start

- **GIVEN** user has due reviews
- **WHEN** tapping "Start Review Session"
- **THEN** session initialized with prioritized items
- **AND** progress indicator shows item count

#### Scenario: Answer reveal

- **GIVEN** user is in review session
- **WHEN** viewing a question
- **THEN** user can tap "Show Answer"
- **AND** correct answer revealed with rating options

#### Scenario: Rating submission

- **GIVEN** answer is revealed
- **WHEN** user selects rating (Again/Hard/Good/Easy)
- **THEN** FSRS parameters updated
- **AND** state transition evaluated
- **AND** next item presented (or session complete)

#### Scenario: Session completion

- **GIVEN** all items in session reviewed
- **WHEN** last rating submitted
- **THEN** session summary displayed
- **AND** stats show correct/incorrect counts

---

### Requirement: Due Reviews Card

The system SHALL display due reviews prominently on home screen.

#### Scenario: Due reviews display

- **GIVEN** user has items due for review
- **WHEN** viewing home screen
- **THEN** "Due Reviews" card shows count
- **AND** preview of due concept names visible
- **AND** "Start Review Session" button available

#### Scenario: Empty state display

- **GIVEN** user has no items due
- **WHEN** viewing home screen
- **THEN** "All caught up!" message displayed
- **AND** next due date shown if applicable

---

## Cross-References

- **content-analysis**: Provides concepts to track via spaced repetition
- **project-management**: Projects scope review queues
- **user-authentication**: Reviews scoped to authenticated user
- **design-system**: Mastery colors defined in theme tokens
