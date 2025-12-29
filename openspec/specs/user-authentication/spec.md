# user-authentication Specification

## Purpose
TBD - created by archiving change implement-authentication. Update Purpose after archive.
## Requirements
### Requirement: Email/Password Sign-Up

The system SHALL allow users to create accounts with email and password.

#### Scenario: Successful registration

- **GIVEN** user is on sign-up screen
- **WHEN** user enters valid email and password meeting requirements
- **AND** submits the form
- **THEN** account is created in Supabase
- **AND** verification email is sent
- **AND** user is redirected to verification pending screen

#### Scenario: Invalid email format

- **GIVEN** user is on sign-up screen
- **WHEN** user enters invalid email format
- **THEN** inline error displays "Please enter a valid email address"
- **AND** form submission is prevented

#### Scenario: Weak password

- **GIVEN** user is on sign-up screen
- **WHEN** user enters password less than 8 characters or missing letter/number
- **THEN** inline error displays password requirements
- **AND** form submission is prevented

#### Scenario: Duplicate email

- **GIVEN** user is on sign-up screen
- **WHEN** user submits with email already registered
- **THEN** error displays "An account with this email already exists"
- **AND** link to sign-in screen shown

### Requirement: Email/Password Sign-In

The system SHALL authenticate users with email and password.

#### Scenario: Successful sign-in

- **GIVEN** user has verified account
- **WHEN** user enters correct email and password
- **AND** submits the form
- **THEN** session is established
- **AND** user is redirected to authenticated home screen

#### Scenario: Invalid credentials

- **GIVEN** user is on sign-in screen
- **WHEN** user submits with incorrect email or password
- **THEN** error displays "Invalid email or password"
- **AND** no indication of which field is wrong (security)

#### Scenario: Unverified email

- **GIVEN** user registered but not verified
- **WHEN** user attempts to sign in
- **THEN** error displays "Please verify your email before signing in"
- **AND** link to resend verification shown

### Requirement: Email Verification

The system SHALL require email verification before granting full access.

#### Scenario: Verification pending display

- **GIVEN** user just completed registration
- **WHEN** verification screen displays
- **THEN** email address shown for confirmation
- **AND** "Resend verification email" button available
- **AND** "Back to sign in" link available

#### Scenario: Resend verification

- **GIVEN** user is on verification pending screen
- **WHEN** user clicks resend button
- **THEN** new verification email is sent
- **AND** success message confirms "Verification email sent"
- **AND** button disabled for 60 seconds to prevent spam

#### Scenario: Verification completion

- **GIVEN** user clicks verification link in email
- **WHEN** verification succeeds
- **THEN** onAuthStateChange fires with verified session
- **AND** user can access protected routes

### Requirement: Form Accessibility

The system SHALL ensure authentication forms meet accessibility standards.

#### Scenario: Input labeling

- **GIVEN** authentication form is displayed
- **WHEN** screen reader focuses on input field
- **THEN** accessible label announces field purpose
- **AND** error state announced when present

#### Scenario: Error focus management

- **GIVEN** form submission fails validation
- **WHEN** errors are displayed
- **THEN** focus moves to first error field
- **AND** error message is announced to screen reader

#### Scenario: Touch target sizing

- **GIVEN** authentication form is displayed
- **WHEN** user interacts with submit button
- **THEN** touch target is minimum 44x44px
- **AND** button text clearly indicates action

