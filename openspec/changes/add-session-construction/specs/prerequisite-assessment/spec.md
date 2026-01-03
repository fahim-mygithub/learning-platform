# Prerequisite Assessment Capability

Detect prerequisite knowledge gaps and provide AI-generated remediation before main learning begins.

## ADDED Requirements

### Requirement: Prerequisite Detection

The system SHALL detect prerequisites from analyzed content using both mentioned_only concepts and AI-inferred domain knowledge.

#### Scenario: Extract mentioned_only prerequisites
Given a project with analyzed concepts
When prerequisites are detected
Then concepts marked as mentioned_only should be identified as prerequisites
And each prerequisite should have a confidence score

#### Scenario: Infer domain prerequisites with AI
Given a project with analyzed concepts
When prerequisites are detected
Then the AI should infer additional foundational concepts
And inferred prerequisites should be marked with source "ai_inferred"

---

### Requirement: Pretest Question Generation

The system SHALL generate multiple-choice assessment questions for each identified prerequisite.

#### Scenario: Generate pretest questions
Given a prerequisite concept
When pretest questions are generated
Then 2-3 questions should be created per prerequisite
And each question should have 4 options with one correct answer
And questions should include explanations

#### Scenario: Mix difficulty levels
Given a set of pretest questions
When questions are generated
Then approximately 60% should be basic difficulty
And approximately 40% should be intermediate difficulty

---

### Requirement: Gap Scoring

The system SHALL score user responses and determine knowledge gap severity.

#### Scenario: Score pretest responses
Given a user has completed a pretest session
When responses are scored
Then a percentage score should be calculated per prerequisite
And gap severity should be assigned based on thresholds

#### Scenario: Determine gap severity thresholds
Given a prerequisite score
When severity is determined
Then 80-100% = no gap
And 60-79% = minor gap (optional remediation)
And 40-59% = significant gap (recommended remediation)
And 0-39% = critical gap (required remediation)

---

### Requirement: Mini-Lesson Generation

The system SHALL generate AI-powered mini-lessons for identified knowledge gaps.

#### Scenario: Generate mini-lesson content
Given a prerequisite with a knowledge gap
When a mini-lesson is generated
Then the lesson should be 500-1000 words
And include key points summary
And include 2-3 practice questions
And estimate reading time in minutes

#### Scenario: Generate lesson without source material
Given a prerequisite requiring remediation
When a mini-lesson is generated
Then the content should be created from AI knowledge
And not require any source material from the project

---

### Requirement: Prerequisite Roadmap

The system SHALL build a remediation roadmap from identified gaps.

#### Scenario: Build prerequisite roadmap
Given a user with multiple knowledge gaps
When the roadmap is built
Then gaps should be prioritized by severity
And critical gaps should appear first
And progress tracking should be included

#### Scenario: Track mini-lesson completion
Given a user working through prerequisite roadmap
When a mini-lesson is completed
Then completion should be recorded
And post-test score should be tracked
And roadmap progress should update

---

### Requirement: Pretest UX Flow

The system SHALL present prerequisite assessment as optional with recommendation.

#### Scenario: Offer pretest after analysis
Given a project with detected prerequisites
When the user views the project
Then a pretest offer modal should appear
And the modal should show prerequisite count
And offer "Take Pretest" and "Skip" options

#### Scenario: Skip pretest with warning
Given a user viewing the pretest offer modal
When the user selects "Skip"
Then a warning should be displayed about potential comprehension issues
And the user should be allowed to proceed to main content

#### Scenario: Complete pretest flow
Given a user taking a pretest
When the pretest is completed
Then results should show score breakdown by prerequisite
And recommendations should be provided based on gaps
And options to remediate or continue should be presented
