# Change: Design System Foundation and Project Management

## Why

Phase 1 of the Learning Platform requires foundational infrastructure before feature work. Currently:

1. **Design tokens are hardcoded** - Colors like `#3B82F6` scattered across Button, Input, Card components
2. **Missing UI primitives** - No Progress indicators, Toast notifications, Modal dialogs, or BottomSheet components
3. **No project management** - Users cannot create, view, or manage learning projects
4. **No database schema** - Supabase has auth but no project tables

These gaps block Phase 1 completion (per `openspec/specs/learning-platform/tasks.md` items 1.2 and 1.4).

## What Changes

### Design System Foundation (1.2)

- **NEW**: `src/theme/` - Centralized design tokens (colors, spacing, typography)
- **MODIFIED**: `src/components/ui/Button.tsx` - Use theme tokens
- **MODIFIED**: `src/components/ui/Input.tsx` - Use theme tokens
- **MODIFIED**: `src/components/ui/Card.tsx` - Use theme tokens
- **NEW**: `src/components/ui/Progress.tsx` - ProgressBar, ProgressCircle, ProgressDots
- **NEW**: `src/components/ui/Toast.tsx` - Success/error/info notifications
- **NEW**: `src/components/ui/Modal.tsx` - Confirmation dialogs
- **NEW**: `src/components/ui/BottomSheet.tsx` - Mobile-friendly drawers

### Project Management (1.4)

- **NEW**: `supabase/migrations/001_projects.sql` - Projects table with RLS
- **NEW**: `src/types/database.ts` - TypeScript types for database
- **NEW**: `src/lib/projects.ts` - Project CRUD service
- **NEW**: `src/lib/projects-context.tsx` - React context for project state
- **NEW**: `app/(auth)/projects/index.tsx` - Projects list screen
- **NEW**: `app/(auth)/projects/[id].tsx` - Project detail screen
- **NEW**: `app/(auth)/projects/create.tsx` - Create project screen

## Scope Boundaries

**In scope:**
- Centralized theme tokens per spec (Primary: #6366F1, Secondary: #10B981, Accent: #F59E0B)
- Mastery state colors (Gray -> Blue -> Orange -> Yellow -> Lime -> Emerald)
- Progress, Toast, Modal, BottomSheet components with accessibility
- Projects table with user_id, title, description, status, progress
- RLS policies for user data isolation
- Project CRUD operations (create, read, update, delete)
- Projects list and detail screens with navigation

**Out of scope (future changes):**
- NativeWind/Tailwind CSS migration (keeping StyleSheet approach)
- Source upload (Phase 1.5)
- Dark mode theme variants
- Project sharing/collaboration

## Success Criteria

1. No hardcoded color values remain in UI components
2. All new components meet 44x44px touch target requirement
3. Progress/Toast/Modal/BottomSheet render correctly with tests
4. Projects table created in Supabase with RLS enabled
5. User can create project with title, view list, open detail, delete
6. All tests pass, 0 lint errors, 0 TypeScript errors
7. Chrome MCP browser testing confirms UI renders correctly
