# Tasks: Design System Foundation and Project Management

> Reference: openspec/changes/design-system-and-projects/proposal.md
> Design: openspec/changes/design-system-and-projects/design.md
> Specs: openspec/changes/design-system-and-projects/specs/

## Status: PENDING

---

## 1. Theme Foundation

### Task 1.1: Create design tokens module
**Files:** `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/typography.ts`, `src/theme/index.ts`
- Create colors.ts with palette and semantic colors per spec
  - Primary: #6366F1 (Indigo)
  - Secondary: #10B981 (Emerald)
  - Accent: #F59E0B (Amber)
  - Mastery states: Gray -> Blue -> Orange -> Yellow -> Lime -> Emerald
- Create spacing.ts with scale (4, 8, 12, 16, 20, 24, 32, 48, 64) and semantic names
- Create typography.ts with font sizes, weights, line heights
- Create index.ts barrel export
- Add tests for token exports in `src/theme/__tests__/theme.test.ts`

### Task 1.2: Migrate Button to theme tokens
**Files:** `src/components/ui/Button.tsx`
- Import colors from theme instead of hardcoded values
- Replace #3B82F6 -> colors.primary
- Replace #6B7280 -> colors.secondary
- Update tests to verify theme usage

### Task 1.3: Migrate Input to theme tokens
**Files:** `src/components/ui/Input.tsx`
- Import colors and spacing from theme
- Replace all hardcoded color values
- Update tests

### Task 1.4: Migrate Card to theme tokens
**Files:** `src/components/ui/Card.tsx`
- Import colors and spacing from theme
- Replace hardcoded values
- Update tests

## 2. New UI Components

### Task 2.1: Create Progress component
**Files:** `src/components/ui/Progress.tsx`, `src/components/ui/__tests__/Progress.test.tsx`
- ProgressBar variant: horizontal bar with fill percentage
- ProgressCircle variant: circular/ring progress with SVG
- ProgressDots variant: step indicator for wizards
- All variants use theme colors
- Accessibility: value announced to screen readers
- Tests for each variant

### Task 2.2: Create Toast component and context
**Files:** `src/components/ui/Toast.tsx`, `src/components/ui/__tests__/Toast.test.tsx`
- ToastProvider context for global toast state
- useToast() hook: { showToast, hideToast }
- Toast types: success (green), error (red), info (blue)
- Auto-dismiss with configurable duration
- Queue multiple toasts
- Accessible announcements
- Tests for show/hide/queue behavior

### Task 2.3: Create Modal component
**Files:** `src/components/ui/Modal.tsx`, `src/components/ui/__tests__/Modal.test.tsx`
- Visible prop for declarative control
- Backdrop with dim effect
- Title, content, actions slots
- Focus trap within modal
- Close on backdrop tap or escape
- Accessible labeling
- Tests for open/close/accessibility

### Task 2.4: Create BottomSheet component
**Files:** `src/components/ui/BottomSheet.tsx`, `src/components/ui/__tests__/BottomSheet.test.tsx`
- Slide-up animation from bottom
- Backdrop with dismiss on tap
- Swipe-down to dismiss gesture
- Scrollable content area
- Keyboard avoidance for forms
- Tests for open/close/scroll behavior

### Task 2.5: Update component index exports
**Files:** `src/components/ui/index.ts`
- Export Progress, Toast, ToastProvider, useToast, Modal, BottomSheet
- Export theme from `src/theme`

## 3. Database Layer

### Task 3.1: Create projects migration
**Files:** `supabase/migrations/001_projects.sql`
- CREATE TABLE projects with all columns
- Enable RLS
- Create policy for user isolation
- Add indexes for common queries (user_id, last_accessed_at)
- Document manual application via Supabase Dashboard

### Task 3.2: Create database types
**Files:** `src/types/database.ts`
- Project interface matching table schema
- ProjectInsert type (for creation)
- ProjectUpdate type (for updates)
- Export from types index

## 4. Projects Service Layer

### Task 4.1: Create projects service
**Files:** `src/lib/projects.ts`, `src/lib/__tests__/projects.test.ts`
- createProject(data: ProjectInsert): Promise<Project>
- getProjects(): Promise<Project[]>
- getProject(id: string): Promise<Project | null>
- updateProject(id: string, data: ProjectUpdate): Promise<Project>
- deleteProject(id: string): Promise<void>
- Error handling for Supabase operations
- Tests with mocked Supabase client

### Task 4.2: Create projects context
**Files:** `src/lib/projects-context.tsx`, `src/lib/__tests__/projects-context.test.tsx`
- ProjectsProvider component
- useProjects() hook: { projects, loading, error, refreshProjects }
- Load projects on mount when authenticated
- Tests for loading/error states

## 5. Projects Screens

### Task 5.1: Create projects list screen
**Files:** `app/(auth)/projects/index.tsx`, `app/(auth)/projects/__tests__/index.test.tsx`
- Empty state with illustration and CTA
- FlatList of project cards
- Each card: title, progress bar, last accessed time
- FAB or header button for create
- Pull-to-refresh
- Loading skeleton
- Tests for empty/list/loading states

### Task 5.2: Create project detail screen
**Files:** `app/(auth)/projects/[id].tsx`, `app/(auth)/projects/__tests__/[id].test.tsx`
- Header with project title
- Description section
- Progress visualization (ProgressCircle)
- Edit button -> opens edit modal/sheet
- Delete button -> shows confirmation Modal
- Sources placeholder section
- Tests for render/edit/delete flows

### Task 5.3: Create project form screen/sheet
**Files:** `app/(auth)/projects/create.tsx` (or BottomSheet in list)
- Title input (required) with validation
- Description textarea (optional)
- Submit button with loading state
- Cancel/back navigation
- Success toast on creation
- Tests for validation/submit/navigation

### Task 5.4: Update app layout for projects route
**Files:** `app/(auth)/_layout.tsx` (if needed)
- Ensure projects route accessible from tab navigation
- Add Projects tab icon if not present

## 6. Integration & Polish

### Task 6.1: Run full test suite
**Command:** `npm test`
- All new tests pass
- Existing tests still pass
- Coverage meets threshold

### Task 6.2: Run lint and type check
**Command:** `npm run lint && npx tsc --noEmit`
- Fix any lint errors
- Fix any type errors

### Task 6.3: Chrome MCP browser testing
- Start dev server: `npx expo start --web --port 8082`
- Navigate to projects screen
- Test create project flow
- Test edit/delete flows
- Verify Toast/Modal/BottomSheet rendering
- Screenshot verification

---

## Dependencies

```
Task 1.1 ──> Task 1.2, 1.3, 1.4, 2.1-2.4
Task 3.1 ──> Task 3.2 ──> Task 4.1 ──> Task 4.2 ──> Task 5.1-5.4
Task 2.2 (Toast) ──> Task 5.3 (success toast)
Task 2.3 (Modal) ──> Task 5.2 (delete confirm)
```

## Parallelizable Work

**Wave 1 (parallel):**
- Task 1.1 (theme tokens)
- Task 3.1 (database migration - just document, apply manually)

**Wave 2 (after Wave 1, parallel):**
- Tasks 1.2-1.4 (migrate existing components)
- Tasks 2.1-2.4 (new UI components)
- Task 3.2 (database types)

**Wave 3 (after Wave 2, parallel):**
- Task 4.1 (projects service)
- Task 2.5 (update exports)

**Wave 4 (after Wave 3):**
- Task 4.2 (projects context)

**Wave 5 (after Wave 4, parallel):**
- Tasks 5.1-5.4 (screens)

**Wave 6 (sequential):**
- Tasks 6.1-6.3 (integration)
