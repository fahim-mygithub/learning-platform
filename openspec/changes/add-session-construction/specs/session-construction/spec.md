# Session Construction Capability

Build intelligent learning sessions with cognitive load management, interleaving, and sleep-aware scheduling.

## ADDED Requirements

### Requirement: Cognitive Load Budgeting

The system SHALL calculate learning capacity using base limits and contextual modifiers.

#### Scenario: Calculate base capacity
Given a user starting a learning session
When cognitive capacity is calculated
Then the base capacity should be 4 new concepts

#### Scenario: Apply circadian rhythm modifier
Given a user at different times of day
When cognitive capacity is calculated
Then the modifier should be:
  - 0.9 during 06:00-09:00 (waking)
  - 1.1 during 09:00-12:00 (peak morning)
  - 0.85 during 12:00-14:00 (post-lunch)
  - 1.0 during 14:00-17:00 (afternoon)
  - 0.95 during 17:00-20:00 (evening)
  - 0.8 during 20:00-22:00 (winding down)
  - 0.7 during 22:00-06:00 (late night)

#### Scenario: Apply fatigue modifier
Given a user in an active learning session
When cognitive capacity is calculated
Then fatigue should reduce capacity by 0.05 per 15 minutes
And maximum fatigue reduction should be 0.3

#### Scenario: Warning at capacity thresholds
Given cognitive load is being tracked
When capacity usage reaches thresholds
Then a caution warning should appear at 75%
And blocking should occur at 90%

---

### Requirement: Session Building with Interleaving

The system SHALL construct sessions mixing review and new material for optimal retention.

#### Scenario: Apply interleaving pattern
Given available reviews and new concepts
When a session is built
Then the pattern should be R→N→R→R→N→R→R→N
And reviews should appear before new concepts to activate prior knowledge

#### Scenario: Respect capacity limits
Given cognitive capacity is calculated
When a session is built
Then new concepts should not exceed effective capacity
And users should not be allowed to exceed 90% capacity

#### Scenario: Include pretests for new concepts
Given new concepts in a session
When the session is built
Then a pretest question should precede each new concept
And the pretest should activate retrieval before learning

#### Scenario: Estimate session duration
Given a session with mixed items
When duration is estimated
Then reviews should be estimated at 2 minutes each
And new concepts should be estimated at 5-10 minutes each
And total duration should be displayed to user

---

### Requirement: Sleep-Aware Scheduling

The system SHALL adjust learning recommendations based on sleep schedule.

#### Scenario: Configure sleep schedule
Given a user accessing schedule preferences
When preferences are set
Then bedtime and wake time should be configurable
And timezone should be detected or selectable

#### Scenario: Enforce bedtime cutoff
Given a user within 2 hours of bedtime
When session type is determined
Then only review sessions should be allowed
And new learning should be blocked
And a warning should explain the restriction

#### Scenario: Suggest morning check session
Given a user within 2 hours of wake time
When session type is determined
Then a light review session should be suggested
And it should focus on items from previous day

#### Scenario: Block late-night learning
Given a user past their bedtime
When they attempt to start a session
Then a message should suggest waiting until morning
And the user should be able to override with acknowledgment

---

### Requirement: Session Preview

The system SHALL show users what to expect in their learning session.

#### Scenario: Display session preview
Given a user on the home screen
When session preview is displayed
Then due review count should be shown
And new concepts available should be shown
And session type should be indicated
And estimated duration should be displayed

#### Scenario: Show cognitive load indicator
Given a session preview
When cognitive load is displayed
Then current capacity should be visualized
And warning colors should reflect threshold levels
And percentage should be shown numerically

---

### Requirement: Session Execution

The system SHALL guide users through constructed learning sessions.

#### Scenario: Execute session items
Given a user starts a session
When items are presented
Then items should appear in interleaved order
And progress should be tracked
And cognitive load should update in real-time

#### Scenario: Allow early exit
Given a user in an active session
When they choose to exit early
Then progress should be saved
And incomplete items should return to queue
And summary should show completed work

#### Scenario: Complete session
Given a user finishes all session items
When session is completed
Then a summary should display
  - Items completed by type
  - Time spent
  - Mastery changes
And next session suggestion should be provided
