# Capability: Learning Session UI

Provides the user interface for learning new concepts through the Question-First approach with mixed question types and immediate feedback.

## ADDED Requirements

### Requirement: Learning Session Screen

The system SHALL provide a learning session screen that guides users through an interleaved sequence of pretest questions, new concept introductions, and reviews.

#### Scenario: User starts a learning session
- **Given** the user is on a project detail page with analyzed content
- **When** the user taps "Start Learning" on the Learning Agenda card
- **Then** the system navigates to the learning session screen
- **And** displays progress (e.g., "4/12 items")
- **And** displays cognitive load indicator

#### Scenario: User progresses through session items
- **Given** the user is in a learning session
- **When** the user completes an item (question + reveal)
- **Then** the system advances to the next item
- **And** updates the progress indicator
- **And** follows the interleaved order (review → new → review)

#### Scenario: User completes a session
- **Given** the user has answered all session items
- **When** the last item is completed
- **Then** the system navigates to the session complete screen
- **And** persists all responses to the database

---

### Requirement: Question-First Flow

The system SHALL present a question before revealing the concept definition (pretesting effect).

#### Scenario: New concept with pretest
- **Given** the current item is a new concept
- **When** the item is displayed
- **Then** the system shows a pretest question first
- **And** pretest questions are always multiple choice
- **And** after answering, reveals the concept with explanation

#### Scenario: Concept reveal after answer
- **Given** the user has answered a question
- **When** the answer is submitted
- **Then** the system shows correct/incorrect feedback
- **And** displays the full concept definition
- **And** displays pedagogical notes ("Why this matters")
- **And** optionally displays misconception correction if triggered

---

### Requirement: Question Input Components

The system SHALL provide mobile-optimized input components for all question types with minimum 56px touch targets.

#### Scenario: Multiple choice input
- **Given** the question type is "multiple_choice"
- **When** the question is displayed
- **Then** the system shows 4 options as tappable buttons
- **And** each button has minimum 56px height
- **And** buttons have 12px vertical gap
- **And** tapping an option submits the answer

#### Scenario: True/False input
- **Given** the question type is "true_false"
- **When** the question is displayed
- **Then** the system shows two large True/False buttons
- **And** tapping a button submits the answer

#### Scenario: Free-text input
- **Given** the question type requires free-text
- **When** the question is displayed
- **Then** the system shows a text input field
- **And** the input auto-expands up to 4 lines
- **And** a submit button appears above the keyboard
- **And** the view scrolls to keep input visible

#### Scenario: Sequence/drag input
- **Given** the question type is "sequence"
- **When** the question is displayed
- **Then** the system shows draggable items with handles
- **And** user can reorder by dragging
- **And** a "Check Order" button submits the answer

---

### Requirement: Question Type Weighting

The system SHALL select question types based on phase and adaptive factors.

#### Scenario: Pretest phase uses MC only
- **Given** the current item is a pretest
- **When** selecting a question type
- **Then** the system always selects multiple choice
- **And** ignores other weighting factors

#### Scenario: Learning phase uses mixed types
- **Given** the current item is a new concept (not pretest)
- **When** selecting a question type
- **Then** the system applies phase weights (MC=30%, T/F=10%, Free-text=40%, Interactive=20%)
- **And** adjusts based on user accuracy, mastery, and capacity

#### Scenario: Adaptive adjustment for struggling user
- **Given** the user's recent accuracy is below 50%
- **When** selecting a question type
- **Then** the system increases MC weight by 20%
- **And** decreases free-text weight proportionally

---

### Requirement: Session Response Tracking

The system SHALL persist all responses and update mastery states.

#### Scenario: Response is persisted
- **Given** the user answers a question
- **When** the answer is submitted
- **Then** the system records question_type, user_answer, correct_answer, is_correct
- **And** records response_time_ms
- **And** records misconception_triggered if applicable

#### Scenario: Mastery state updates
- **Given** the user completes a session
- **When** responses are processed
- **Then** correct pretest answers mark concept as EXPOSED
- **And** correct follow-up answers advance mastery state
- **And** incorrect answers do not regress state (no shame)

#### Scenario: Misconception logging
- **Given** the user selects a distractor that maps to a known misconception
- **When** the response is processed
- **Then** the system logs the misconception to `misconception_log`
- **And** increments triggered_count if already exists

---

### Requirement: Session Completion

The system SHALL display session statistics and next steps upon completion.

#### Scenario: Session complete screen
- **Given** the user completes all session items
- **When** the session complete screen is displayed
- **Then** shows new concepts learned count
- **And** shows reviews completed count
- **And** shows accuracy percentage
- **And** shows session duration

#### Scenario: Mastery updates displayed
- **Given** the user completes a session
- **When** the session complete screen is displayed
- **Then** shows concepts that changed mastery state
- **And** displays old state → new state for each

#### Scenario: Next review preview
- **Given** the user completes a session
- **When** the session complete screen is displayed
- **Then** shows count of concepts due for next review
- **And** shows when the next review is due
