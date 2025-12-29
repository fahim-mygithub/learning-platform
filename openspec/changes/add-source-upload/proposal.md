# Proposal: Add Source Upload

## Summary

Implement Phase 1.5 Source Upload & Storage functionality, enabling users to upload files (video, PDF) and submit URLs as learning sources for their projects.

## Motivation

Projects currently have a placeholder for sources. Users need to add learning content (videos, PDFs, URLs) to their projects before the content analysis pipeline (Phase 2) can process them.

## Scope

### In Scope

- Supabase Storage bucket for file uploads
- Database table for source metadata with RLS
- File upload with progress tracking (video up to 2GB, PDF up to 100MB)
- URL submission with basic metadata extraction
- File validation (type, size limits)
- Source listing, viewing, and deletion
- Error handling for corrupted/invalid files
- Integration with project detail screen

### Out of Scope

- Content analysis/transcription (Phase 2)
- YouTube video downloading (just store URL)
- Advanced metadata extraction from URLs
- Resumable uploads for very large files

## Dependencies

- Existing: projects table, ProjectsProvider, project detail screen
- New: expo-document-picker for native file selection

## Risks

- Large file uploads may timeout on slow connections
- Supabase Storage free tier limits (1GB)

## Success Criteria

1. User can upload video/PDF files with progress indicator
2. User can submit YouTube/article URLs
3. Sources display in project detail with status
4. File validation prevents invalid uploads
5. User can delete sources
6. All tests passing, 0 lint errors
