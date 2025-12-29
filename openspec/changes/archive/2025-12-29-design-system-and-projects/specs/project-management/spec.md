# Project Management Specification

## ADDED Requirements

### Requirement: Project Data Storage

The system SHALL store learning projects in Supabase with user isolation.

#### Scenario: Project creation in database

- **GIVEN** authenticated user
- **WHEN** project created with title
- **THEN** record inserted with user_id from session
- **AND** timestamps set automatically
- **AND** status defaults to "draft"

#### Scenario: Row-level security enforcement

- **GIVEN** RLS policies enabled on projects table
- **WHEN** user queries projects
- **THEN** only projects with matching user_id returned
- **AND** other users' projects inaccessible

#### Scenario: Cascade deletion

- **GIVEN** user account deleted from auth
- **WHEN** deletion cascades
- **THEN** all user's projects deleted
- **AND** no orphaned records remain

### Requirement: Project CRUD Operations

The system SHALL provide service functions for project management.

#### Scenario: Create project

- **GIVEN** authenticated user with title input
- **WHEN** createProject called
- **THEN** new project created in database
- **AND** created project returned with id

#### Scenario: List projects

- **GIVEN** user has multiple projects
- **WHEN** getProjects called
- **THEN** all user's projects returned
- **AND** sorted by last_accessed_at descending

#### Scenario: Get single project

- **GIVEN** valid project id owned by user
- **WHEN** getProject called with id
- **THEN** project details returned
- **AND** last_accessed_at updated

#### Scenario: Update project

- **GIVEN** existing project owned by user
- **WHEN** updateProject called with changes
- **THEN** project updated in database
- **AND** updated_at timestamp refreshed

#### Scenario: Delete project

- **GIVEN** project owned by user
- **WHEN** deleteProject called with id
- **THEN** project removed from database
- **AND** operation succeeds silently

### Requirement: Projects List Screen

The system SHALL display user's learning projects.

#### Scenario: Empty state display

- **GIVEN** user has no projects
- **WHEN** projects screen loads
- **THEN** empty state message shown
- **AND** create project CTA prominently displayed

#### Scenario: Projects list display

- **GIVEN** user has projects
- **WHEN** projects screen loads
- **THEN** project cards displayed in grid/list
- **AND** each card shows title, progress, last accessed
- **AND** sorted by most recently accessed

#### Scenario: Create project navigation

- **GIVEN** user on projects list
- **WHEN** user taps create button (FAB or header)
- **THEN** navigates to create project screen
- **AND** create button meets 44px touch target

#### Scenario: Project card interaction

- **GIVEN** project cards displayed
- **WHEN** user taps project card
- **THEN** navigates to project detail screen
- **AND** touch feedback visible on press

### Requirement: Project Detail Screen

The system SHALL display individual project information.

#### Scenario: Project header display

- **GIVEN** valid project id in route
- **WHEN** detail screen loads
- **THEN** project title displayed prominently
- **AND** description shown if present
- **AND** progress indicator visible

#### Scenario: Edit action

- **GIVEN** project detail screen
- **WHEN** user taps edit action
- **THEN** edit form opens (modal or screen)
- **AND** title and description editable

#### Scenario: Delete action with confirmation

- **GIVEN** project detail screen
- **WHEN** user taps delete action
- **THEN** confirmation modal displayed
- **AND** requires explicit confirm to delete
- **AND** cancel returns to detail screen

#### Scenario: Sources placeholder

- **GIVEN** project detail screen
- **WHEN** screen renders
- **THEN** sources section shown with placeholder
- **AND** indicates sources feature coming (Phase 1.5)

### Requirement: Create Project Screen

The system SHALL provide project creation form.

#### Scenario: Form display

- **GIVEN** user navigates to create project
- **WHEN** screen renders
- **THEN** title input displayed (required)
- **AND** description input displayed (optional)
- **AND** create button visible

#### Scenario: Validation on submit

- **GIVEN** create form displayed
- **WHEN** user submits without title
- **THEN** validation error shown on title field
- **AND** form not submitted

#### Scenario: Successful creation

- **GIVEN** valid title entered
- **WHEN** user submits form
- **THEN** project created via service
- **AND** user navigated to project detail
- **AND** success feedback shown

#### Scenario: Loading state during submission

- **GIVEN** user submits create form
- **WHEN** request in progress
- **THEN** button shows loading state
- **AND** inputs disabled during submission
