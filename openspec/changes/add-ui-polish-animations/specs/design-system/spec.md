# design-system Specification Delta

> This delta extends the existing design-system spec with animation and micro-interaction requirements.

## ADDED Requirements

### Requirement: Animation Token System

The system SHALL provide centralized animation tokens for consistent motion design.

#### Scenario: Timing token usage

- **GIVEN** developer needs to animate a component
- **WHEN** they import timings from animations theme
- **THEN** standard durations available (buttonPress: 100ms, inputFocus: 200ms, etc.)
- **AND** consistent timing across all components
- **AND** no hardcoded duration values in components

#### Scenario: Spring configuration usage

- **GIVEN** developer needs spring physics animation
- **WHEN** they import spring configs from animations theme
- **THEN** named configurations available (tabBarPill, buttonPress, cardEntrance)
- **AND** damping, stiffness, mass values defined
- **AND** animations feel cohesive across interactions

#### Scenario: Scale token usage

- **GIVEN** developer needs press feedback animation
- **WHEN** they import scale values from animations theme
- **THEN** standard scales available (buttonPressed: 0.96, cardPressed: 0.98)
- **AND** consistent feedback across interactive elements

---

### Requirement: Haptic Feedback System

The system SHALL provide haptic feedback on key interactions for tactile response.

#### Scenario: Selection haptic on toggles

- **GIVEN** user interacts with toggle or tab
- **WHEN** selection is made
- **THEN** selection haptic fires (light tap)
- **AND** haptic occurs before visual feedback
- **AND** gracefully degrades on web (no-op)

#### Scenario: Impact haptic on buttons

- **GIVEN** user presses a button
- **WHEN** press begins (onPressIn)
- **THEN** impact haptic fires (light)
- **AND** provides tactile confirmation

#### Scenario: Notification haptic on form events

- **GIVEN** form submission completes
- **WHEN** success occurs
- **THEN** success notification haptic fires
- **AND** when error occurs
- **THEN** error notification haptic fires

---

### Requirement: Theme Consistency

The system SHALL maintain consistent theming across all screens.

#### Scenario: Dark theme on all public screens

- **GIVEN** user navigates to any public screen (sign-in, sign-up, verify-email)
- **WHEN** screen renders
- **THEN** background uses `colors.background` token
- **AND** text uses `colors.text` and `colors.textSecondary` tokens
- **AND** no hardcoded color values (#fff, #000, etc.)

#### Scenario: Dynamic theme support

- **GIVEN** screen uses theme tokens
- **WHEN** theme context changes
- **THEN** colors update automatically
- **AND** no screen requires manual color overrides

---

### Requirement: Button Animations

The system SHALL animate button state transitions for premium feel.

#### Scenario: Loading morph animation

- **GIVEN** button with `loading={true}`
- **WHEN** loading state activates
- **THEN** button width animates from full to 56px (circle)
- **AND** border radius animates from 12px to 28px
- **AND** text fades out, ActivityIndicator fades in
- **AND** animation duration is 400ms

#### Scenario: Press scale animation

- **GIVEN** user presses button
- **WHEN** press begins
- **THEN** button scales to 0.96 with spring physics
- **AND** spring uses damping: 15, stiffness: 150
- **AND** releases smoothly back to 1.0

#### Scenario: Backwards compatibility

- **GIVEN** existing button usage without animation props
- **WHEN** component renders
- **THEN** default behavior includes animations
- **AND** `animateLoading={false}` disables morph
- **AND** `hapticOnPress={false}` disables haptic

---

### Requirement: Input Animations

The system SHALL animate input focus states for visual feedback.

#### Scenario: Focus border animation

- **GIVEN** user focuses on text input
- **WHEN** focus event fires
- **THEN** border color animates from `colors.border` to `colors.primary`
- **AND** animation duration is 200ms
- **AND** smooth interpolation between colors

#### Scenario: Blur border animation

- **GIVEN** user unfocuses text input
- **WHEN** blur event fires
- **THEN** border color animates back to `colors.border`
- **AND** animation matches focus duration

---

### Requirement: Tab Bar Animations

The system SHALL animate tab bar selection for smooth navigation.

#### Scenario: Sliding pill indicator

- **GIVEN** user selects different tab
- **WHEN** tab changes
- **THEN** background pill slides to new position
- **AND** uses spring physics (damping: 18, stiffness: 140, mass: 1)
- **AND** pill has primary color at 15% opacity

#### Scenario: Tab icon glow

- **GIVEN** tab is active
- **WHEN** tab renders
- **THEN** subtle glow effect behind icon
- **AND** active indicator bar above icon
- **AND** consistent with existing implementation

---

### Requirement: Screen Animations

The system SHALL animate screen entrances for polished transitions.

#### Scenario: Auth screen entrance

- **GIVEN** user navigates to sign-in or sign-up
- **WHEN** screen mounts
- **THEN** logo/header fades in from above (600ms)
- **AND** form elements stagger with 100ms delays
- **AND** button enters last

#### Scenario: List stagger animation

- **GIVEN** screen contains list of items
- **WHEN** screen mounts
- **THEN** items enter with 50ms stagger between each
- **AND** creates waterfall loading effect
- **AND** maintains 60fps performance

---

### Requirement: Card Animations

The system SHALL animate card interactions for tactile feedback.

#### Scenario: Card press animation

- **GIVEN** card has onPress handler
- **WHEN** user presses card
- **THEN** card scales to 0.98 with spring physics
- **AND** releases smoothly on press end
- **AND** haptic feedback fires (if enabled)

#### Scenario: Card without press handler

- **GIVEN** card without onPress
- **WHEN** user attempts to press
- **THEN** no animation occurs
- **AND** card remains static

---

### Requirement: Progress Animations

The system SHALL animate progress indicators for engagement.

#### Scenario: Empty ring pulse

- **GIVEN** progress ring with 0% value
- **WHEN** ring renders
- **THEN** track stroke pulses subtly (opacity 0.3 to 0.6)
- **AND** pulse duration is 2000ms
- **AND** infinite repeat creates "waiting" feeling

#### Scenario: Progress fill animation

- **GIVEN** progress ring with value > 0
- **WHEN** value changes
- **THEN** fill animates to new value (1500ms, ease-out-exp)
- **AND** glow effect pulses during fill
- **AND** matches existing MasteryRing behavior

---

## MODIFIED Requirements

### Requirement: Progress Indicators (Modified)

The system SHALL provide animated progress visualization components.

> Original: Basic progress visualization
> Change: Add animation requirements

#### Scenario: Animated progress ring (MODIFIED)

- **GIVEN** progress circle with value between 0-100
- **WHEN** component renders or value changes
- **THEN** arc fill **animates** to reflect percentage value
- **AND** animation uses ease-out-exponential easing
- **AND** duration is configurable (default: 1500ms)
- **AND** optional glow effect pulses during animation
