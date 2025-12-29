# Tasks: Add Source Upload

> Reference: openspec/changes/add-source-upload/proposal.md
> Design: openspec/changes/add-source-upload/design.md
> Specs: openspec/changes/add-source-upload/specs/

## Status: PENDING

---

## 1. Database Layer

### Task 1.1: Create sources migration
**Files:** `supabase/migrations/002_sources.sql`
- CREATE TABLE sources with all columns per design
- Enable RLS
- Create policy for user isolation
- Add indexes for project_id and user_id
- Document manual application via Supabase Dashboard

### Task 1.2: Create database types
**Files:** `src/types/database.ts`
- Add SourceType enum ('video', 'pdf', 'url')
- Add SourceStatus enum ('pending', 'uploading', 'processing', 'completed', 'failed')
- Add Source interface matching table schema
- Add SourceInsert type (for creation)
- Add SourceUpdate type (for updates)
- Export from types index

## 2. Service Layer

### Task 2.1: Create file validation utilities
**Files:** `src/lib/file-validation.ts`, `src/lib/__tests__/file-validation.test.ts`
- ALLOWED_VIDEO_TYPES constant
- ALLOWED_PDF_TYPES constant
- MAX_VIDEO_SIZE constant (2GB)
- MAX_PDF_SIZE constant (100MB)
- validateFileType(mimeType, extension) function
- validateFileSize(size, type) function
- getSourceTypeFromMime(mimeType) function
- formatFileSize(bytes) helper
- Tests for all validation scenarios

### Task 2.2: Create sources service
**Files:** `src/lib/sources.ts`, `src/lib/__tests__/sources.test.ts`
- createSource(userId, data: SourceInsert): Promise<{data, error}>
- getSources(projectId): Promise<{data, error}>
- getSource(id): Promise<{data, error}>
- updateSource(id, data: SourceUpdate): Promise<{data, error}>
- deleteSource(id): Promise<{error}>
- uploadFile(userId, projectId, file, onProgress): Promise<{data, error}>
- deleteStorageFile(storagePath): Promise<{error}>
- Tests with mocked Supabase client

### Task 2.3: Create sources context
**Files:** `src/lib/sources-context.tsx`, `src/lib/__tests__/sources-context.test.tsx`
- SourcesProvider component (takes projectId prop)
- useSources() hook: { sources, loading, error, refreshSources, uploadProgress }
- Load sources on mount when projectId provided
- Track upload progress state
- Tests for loading/error/refresh states

## 3. UI Components

### Task 3.1: Create FileUploadButton component
**Files:** `src/components/ui/FileUploadButton.tsx`, `src/components/ui/__tests__/FileUploadButton.test.tsx`
- Button that triggers expo-document-picker
- Accept prop for file types (video/pdf)
- onFileSelected callback with file info
- Disabled state during upload
- 44px minimum touch target
- Tests for render/press/disabled states

### Task 3.2: Create UrlInputForm component
**Files:** `src/components/ui/UrlInputForm.tsx`, `src/components/ui/__tests__/UrlInputForm.test.tsx`
- URL input field with validation
- Submit button with loading state
- onSubmit callback with URL value
- Error display for invalid URLs
- Tests for validation/submit/error states

### Task 3.3: Create SourceCard component
**Files:** `src/components/ui/SourceCard.tsx`, `src/components/ui/__tests__/SourceCard.test.tsx`
- Display source name, type icon, status
- Progress bar for uploading status
- Delete button with onDelete callback
- Error display for failed status
- Touch feedback on press
- Tests for each status state

### Task 3.4: Update component index exports
**Files:** `src/components/ui/index.ts`, `src/lib/index.ts`
- Export FileUploadButton, UrlInputForm, SourceCard
- Export sources service functions
- Export SourcesProvider, useSources

## 4. Integration

### Task 4.1: Create SourcesSection component
**Files:** `src/components/sources/SourcesSection.tsx`, `src/components/sources/__tests__/SourcesSection.test.tsx`
- Uses useSources() hook
- Empty state with add source CTA
- List of SourceCards
- Add source button opens AddSourceSheet
- Loading state
- Tests for empty/list/loading states

### Task 4.2: Create AddSourceSheet component
**Files:** `src/components/sources/AddSourceSheet.tsx`, `src/components/sources/__tests__/AddSourceSheet.test.tsx`
- BottomSheet with two options: Upload File, Add URL
- Integrates FileUploadButton for file selection
- Integrates UrlInputForm for URL submission
- Handles upload flow with progress
- Close on success with toast
- Tests for file/url flows

### Task 4.3: Update project detail screen
**Files:** `app/(auth)/(tabs)/projects/[id].tsx`
- Import SourcesProvider and SourcesSection
- Wrap content with SourcesProvider (projectId prop)
- Replace sources placeholder with SourcesSection
- Handle source upload errors

## 5. Integration & Testing

### Task 5.1: Run full test suite
**Command:** `npm test`
- All new tests pass
- Existing tests still pass
- Coverage meets threshold

### Task 5.2: Run lint and type check
**Command:** `npm run lint && npx tsc --noEmit`
- Fix any lint errors
- Fix any type errors

### Task 5.3: Chrome MCP browser testing
- Start dev server: `npx expo start --web --port 8082`
- Navigate to project detail screen
- Test file upload flow (validation, progress, completion)
- Test URL submission flow
- Test source deletion flow
- Verify error handling
- Screenshot verification

---

## Dependencies

```
Task 1.1 ──> Task 1.2 ──> Task 2.2 ──> Task 2.3
Task 2.1 ──> Task 2.2
Task 3.1-3.3 ──> Task 3.4
Task 2.3, 3.4 ──> Task 4.1-4.2 ──> Task 4.3
```

## Parallelizable Work

**Wave 1 (parallel):**
- Task 1.1 (database migration)
- Task 2.1 (file validation)

**Wave 2 (after Wave 1, parallel):**
- Task 1.2 (database types)
- Task 3.1-3.3 (UI components)

**Wave 3 (after Wave 2):**
- Task 2.2 (sources service)
- Task 3.4 (exports)

**Wave 4 (after Wave 3):**
- Task 2.3 (sources context)

**Wave 5 (after Wave 4, parallel):**
- Task 4.1-4.2 (section components)

**Wave 6 (after Wave 5):**
- Task 4.3 (screen integration)

**Wave 7 (sequential):**
- Tasks 5.1-5.3 (integration testing)
