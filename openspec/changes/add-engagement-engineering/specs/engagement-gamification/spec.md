# Engagement Gamification Specification

## ADDED Requirements

### Requirement: Streak Tracking

The app SHALL track daily learning activity with a simple streak counter.

#### Scenario: Streak increment on learning activity

- **Given** the user has not recorded activity today
- **When** the user completes any learning action (quiz, chapter, synthesis)
- **Then** the current_streak increments by 1
- **And** last_activity_date is set to today

#### Scenario: Streak persistence on same day

- **Given** the user has already recorded activity today
- **When** the user completes additional learning actions
- **Then** the streak count remains unchanged
- **And** last_activity_date remains today

#### Scenario: Streak reset on missed day

- **Given** the user's last_activity_date was 2+ days ago
- **When** the user opens the app
- **Then** current_streak resets to 0
- **And** a "streak lost" message is displayed

#### Scenario: Streak display in feed

- **Given** the user is in the learning feed
- **When** the feed header renders
- **Then** a flame icon with streak count is visible
- **And** the streak animates when incremented

### Requirement: Variable XP Rewards

The app SHALL award XP using weighted random selection to prevent reward habituation.

#### Scenario: Quiz correct answer XP

- **Given** the user answers a quiz correctly
- **When** XP is awarded
- **Then** the amount is randomly selected from [10, 15, 25, 50]
- **And** lower amounts are more likely (60% for 10, 5% for 50)
- **And** an animated popup displays the amount

#### Scenario: Chapter completion XP

- **Given** the user completes a video chapter
- **When** XP is awarded
- **Then** the amount is randomly selected from [15, 20]
- **And** the total is added to user_xp.total_xp

#### Scenario: Synthesis completion XP

- **Given** the user completes a synthesis exercise
- **When** XP is awarded
- **Then** the amount is randomly selected from [50, 75, 100]
- **And** a celebration animation plays for amounts >= 75

#### Scenario: XP popup animation

- **Given** XP is awarded
- **When** the popup appears
- **Then** the text "+[amount] XP" bounces in (BounceIn animation)
- **And** the popup fades out after 1.5 seconds
- **And** haptic feedback is triggered

### Requirement: Level Progression

The app SHALL calculate user levels based on accumulated XP and display progression.

#### Scenario: Level calculation

- **Given** the user has total_xp of N
- **When** the level is calculated
- **Then** level = floor(sqrt(total_xp / 100)) + 1
- **And** the next level threshold is displayed

#### Scenario: Level up celebration

- **Given** the user's XP crosses a level threshold
- **When** the new level is calculated
- **Then** a level up notification displays
- **And** confetti animation plays
- **And** the new level badge is shown

### Requirement: XP Ledger Persistence

The app SHALL persist all XP transactions in a ledger for auditability.

#### Scenario: XP ledger entry creation

- **Given** XP is awarded for any reason
- **When** the XP service processes the award
- **Then** an entry is created in xp_ledger
- **And** the entry includes user_id, amount, reason, and timestamp
- **And** concept_id is included if applicable

#### Scenario: Total XP aggregation

- **Given** new XP is awarded
- **When** the ledger entry is created
- **Then** user_xp.total_xp is updated atomically
- **And** user_xp.level is recalculated

### Requirement: Synthesis Milestones

The app SHALL insert synthesis exercises at regular intervals to consolidate learning.

#### Scenario: Synthesis threshold detection

- **Given** the user is progressing through the feed
- **When** they complete 5 or 6 chapters since last synthesis
- **Then** a synthesis card is inserted into the feed
- **And** synthesis_count in feed_progress increments

#### Scenario: Synthesis prompt generation

- **Given** a synthesis card is to be displayed
- **When** the prompt is generated
- **Then** it references 3-5 concepts from recent chapters
- **And** it asks the user to connect or relate the concepts
- **And** the prompt is unique to the user's progress

### Requirement: Feed Progress Tracking

The app SHALL persist user progress through each source's feed.

#### Scenario: Progress save on feed exit

- **Given** the user exits the learning feed
- **When** the feed context unmounts
- **Then** current_index is saved to feed_progress
- **And** completed_items array is updated

#### Scenario: Progress resume on feed entry

- **Given** the user re-enters a feed for a source
- **When** the feed context loads
- **Then** the feed starts at the saved current_index
- **And** completed items are skipped or marked

## Cross-References

- Related to: `engagement-feed` (feed UI components consume these services)
- Related to: `content-analysis` (concepts provide source_mapping for chapters)
