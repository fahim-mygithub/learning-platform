# Engagement Feed Specification

## ADDED Requirements

### Requirement: Learning Feed Screen

The app SHALL provide a full-screen, swipeable learning feed for active content consumption.

#### Scenario: Feed entry from project detail

- **Given** the user is on a project detail screen with analyzed content
- **When** the user taps "Start Learning"
- **Then** the app navigates to the learning feed screen
- **And** the feed displays the first video chunk card

#### Scenario: Vertical card navigation

- **Given** the user is viewing a feed card
- **When** the user swipes up
- **Then** the next card snaps into view with smooth animation
- **And** the previous card scrolls out of view

#### Scenario: Feed progress persistence

- **Given** the user has partially completed a feed
- **When** the user returns to the feed later
- **Then** the feed resumes from the last viewed position
- **And** completed items remain marked as viewed

### Requirement: Video Chunk Cards

The app SHALL display video content in chapter-based chunks with synchronized captions.

#### Scenario: Video chunk playback

- **Given** a VideoChunkCard is visible in the feed
- **When** the card becomes the active card
- **Then** the video auto-plays from the chapter start timestamp
- **And** playback stops at the chapter end timestamp

#### Scenario: Caption synchronization

- **Given** a video chunk is playing with captions enabled
- **When** the video reaches a word's timestamp
- **Then** that word is highlighted in yellow (#FFD700)
- **And** previous words return to normal styling

#### Scenario: Open loop teaser display

- **Given** a chapter has an open_loop_teaser defined
- **When** the video reaches the end of the chapter
- **Then** the teaser text displays as a hook for the next content
- **And** the user is encouraged to continue

### Requirement: Quiz Cards

The app SHALL display interactive quiz cards that test comprehension with immediate feedback.

#### Scenario: Quiz answer submission

- **Given** a QuizCard is displayed with multiple choice options
- **When** the user selects an answer
- **Then** the correct answer is highlighted in green
- **And** incorrect selected answer is highlighted in red
- **And** haptic feedback is triggered (success or error)

#### Scenario: XP reward on correct answer

- **Given** the user submits a correct quiz answer
- **When** the answer is validated
- **Then** variable XP is awarded (10-50 range)
- **And** an animated XP popup displays the amount

### Requirement: Synthesis Cards

The app SHALL insert synthesis milestone cards to prevent knowledge fragmentation.

#### Scenario: Synthesis card insertion

- **Given** the user has completed 5-6 video chunks
- **When** the feed reaches the synthesis threshold
- **Then** a SynthesisCard is inserted into the feed
- **And** the card prompts connection between recent concepts

#### Scenario: Synthesis completion reward

- **Given** the user completes a synthesis exercise
- **When** they submit their response
- **Then** bonus XP is awarded (50-100 range)
- **And** a celebration animation plays

### Requirement: Feed Gesture Actions

The app SHALL support swipe gestures that enable quick knowledge management actions.

#### Scenario: Swipe left to skip

- **Given** the user is viewing any feed card
- **When** the user swipes left
- **Then** the card is marked as "known"
- **And** small XP is awarded
- **And** the card is archived from future feeds

#### Scenario: Swipe right to review

- **Given** the user is viewing any feed card
- **When** the user swipes right
- **Then** the associated concept is added to the spaced repetition queue
- **And** visual confirmation is displayed

#### Scenario: Double tap to save

- **Given** the user is viewing a fact or quiz card
- **When** the user double-taps
- **Then** the content is saved to their personal flashcard deck
- **And** visual confirmation is displayed

### Requirement: Session Boundary Management

The app SHALL track session duration and suggest breaks to prevent cognitive overload.

#### Scenario: Break suggestion after 30 minutes

- **Given** the user has been in the feed for 30+ minutes
- **When** the session timer threshold is reached
- **Then** a modal appears suggesting a break
- **And** the modal shows session statistics (cards completed, XP earned)

#### Scenario: Continue or break choice

- **Given** the break suggestion modal is displayed
- **When** the user selects "Continue Learning"
- **Then** the modal dismisses and feed continues
- **When** the user selects "Take a Break"
- **Then** the app navigates back to project detail

## Cross-References

- Related to: `content-analysis` (chapter generation pipeline stage)
- Related to: `engagement-gamification` (XP and streak tracking)
- Related to: `design-system` (typography and dark mode)
