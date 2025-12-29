# Design: Add Source Upload

## Context

Building on existing infrastructure:
- Supabase client configured with AsyncStorage persistence
- Projects table with RLS for user isolation
- ProjectsProvider context pattern
- UI components: Button, Input, Card, Progress, Toast, Modal, BottomSheet
- Project detail screen with sources placeholder

## Architecture Decisions

### 1. Database Schema

**Decision:** Single `sources` table linked to projects

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'url')),
  name TEXT NOT NULL,
  url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Rationale:**
- `project_id` enables cascade deletion when project deleted
- `user_id` enables direct RLS policy for user isolation
- `type` enum distinguishes file uploads from URLs
- `status` tracks upload progress: pending -> uploading -> completed/failed
- `storage_path` points to Supabase Storage location for files
- `metadata` JSON for extensible data (URL metadata, file info)

### 2. Storage Organization

**Decision:** Single bucket with user-prefixed paths

```
project-sources/
  {user_id}/
    {project_id}/
      {source_id}_{filename}
```

**Rationale:**
- User prefix enables RLS on storage
- Project grouping for easy cleanup on project deletion
- Source ID prefix prevents filename collisions

### 3. File Validation Strategy

**Decision:** Client-side validation before upload

```typescript
const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  pdf: ['application/pdf'],
};

const SIZE_LIMITS = {
  video: 2 * 1024 * 1024 * 1024, // 2GB
  pdf: 100 * 1024 * 1024,        // 100MB
};
```

**Rationale:**
- Fail fast - don't waste bandwidth on invalid files
- Clear error messages before upload starts
- Server-side validation as backup via RLS policies

### 4. Upload Flow

**Decision:** Create record first, then upload file

```
1. User selects file
2. Client validates file type/size
3. Create source record (status: 'uploading')
4. Upload to Supabase Storage with progress callback
5. Update source record (status: 'completed', storage_path)
6. On error: Update source record (status: 'failed', error_message)
```

**Rationale:**
- Source record exists immediately for UI display
- Progress tracked via Supabase upload callback
- Failed uploads visible with retry option
- Atomic cleanup if user cancels

### 5. URL Source Flow

**Decision:** Simple URL storage with optional metadata

```
1. User enters URL
2. Client validates URL format
3. Create source record (type: 'url', url: value, status: 'completed')
4. Optional: Fetch basic metadata (title from og:title, YouTube thumbnail)
```

**Rationale:**
- Keep simple for Phase 1.5
- Full metadata extraction (transcription) in Phase 2
- URL sources are immediately usable

### 6. Context Architecture

**Decision:** Project-scoped SourcesProvider

```typescript
// Wrap project detail screen content
<SourcesProvider projectId={id}>
  <SourcesSection />
</SourcesProvider>
```

**Rationale:**
- Sources are always in context of a project
- Simpler than global sources state
- Matches existing ProjectsProvider pattern

## Component Structure

```
src/
  lib/
    file-validation.ts      # Validation utilities
    sources.ts              # CRUD + upload service
    sources-context.tsx     # React context
  components/
    ui/
      FileUploadButton.tsx  # Triggers file picker
      UrlInputForm.tsx      # URL input with validation
      SourceCard.tsx        # Display single source
    sources/
      SourcesSection.tsx    # Container with list/empty state
      AddSourceSheet.tsx    # BottomSheet with upload options

app/(auth)/(tabs)/projects/
  [id].tsx                  # Modified to include SourcesSection
```

## Test Strategy

- Unit tests for file validation functions
- Service tests for sources CRUD (mocked Supabase)
- Context tests for loading/error states
- Component tests for UI interactions
- Integration test via Chrome MCP for full upload flow
