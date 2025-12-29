# Source Management Specification

## ADDED Requirements

### Requirement: Source Data Storage

The system SHALL store learning sources in Supabase with project and user association.

#### Scenario: Source creation in database

- **GIVEN** authenticated user with existing project
- **WHEN** source created with type and name
- **THEN** record inserted with project_id and user_id
- **AND** timestamps set automatically
- **AND** status defaults to "pending"

#### Scenario: Row-level security enforcement

- **GIVEN** RLS policies enabled on sources table
- **WHEN** user queries sources
- **THEN** only sources with matching user_id returned
- **AND** other users' sources inaccessible

#### Scenario: Cascade deletion

- **GIVEN** project with associated sources
- **WHEN** project deleted
- **THEN** all project sources deleted
- **AND** storage files cleaned up

### Requirement: File Upload with Progress

The system SHALL upload files to Supabase Storage with progress tracking.

#### Scenario: Video file upload

- **GIVEN** user selects video file (MP4, MOV, WebM)
- **WHEN** file size under 2GB limit
- **THEN** file uploaded to storage with progress updates
- **AND** source record updated with storage path
- **AND** status changes to "completed"

#### Scenario: PDF file upload

- **GIVEN** user selects PDF file
- **WHEN** file size under 100MB limit
- **THEN** file uploaded to storage with progress updates
- **AND** source record updated with storage path

#### Scenario: Upload progress display

- **GIVEN** file upload in progress
- **WHEN** upload progresses
- **THEN** percentage displayed in real-time
- **AND** user can see upload status

### Requirement: URL Source Submission

The system SHALL accept URL submissions for YouTube and article links.

#### Scenario: URL submission

- **GIVEN** user enters valid URL
- **WHEN** URL format validated
- **THEN** source record created with type "url"
- **AND** status set to "completed" immediately

#### Scenario: URL validation

- **GIVEN** user enters text in URL field
- **WHEN** text is not valid URL format
- **THEN** validation error displayed
- **AND** submission prevented

### Requirement: File Validation

The system SHALL validate files before upload begins.

#### Scenario: File type validation

- **GIVEN** user selects file for upload
- **WHEN** file type not in allowed list
- **THEN** error message displayed with allowed types
- **AND** upload prevented

#### Scenario: File size validation

- **GIVEN** user selects file for upload
- **WHEN** file exceeds size limit for type
- **THEN** error message displayed with size limit
- **AND** upload prevented

#### Scenario: Corrupted file handling

- **GIVEN** file upload fails during processing
- **WHEN** error detected
- **THEN** clear error message displayed
- **AND** user prompted to re-upload valid file
- **AND** source status set to "failed"

### Requirement: Source Management UI

The system SHALL display sources in project detail screen.

#### Scenario: Empty state display

- **GIVEN** project has no sources
- **WHEN** sources section renders
- **THEN** empty state message shown
- **AND** add source CTA prominently displayed

#### Scenario: Sources list display

- **GIVEN** project has sources
- **WHEN** sources section renders
- **THEN** source cards displayed in list
- **AND** each card shows name, type icon, status

#### Scenario: Source deletion

- **GIVEN** source exists in project
- **WHEN** user taps delete on source
- **THEN** confirmation dialog displayed
- **AND** source and storage file deleted on confirm

#### Scenario: Add source action

- **GIVEN** user on project detail screen
- **WHEN** user taps add source button
- **THEN** bottom sheet opens with upload options
- **AND** file upload and URL options available
