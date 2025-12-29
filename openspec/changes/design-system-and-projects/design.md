# Design: Design System Foundation and Project Management

## Context

Building on existing infrastructure:
- Supabase client configured with AsyncStorage persistence
- AuthContext provides session state and methods
- Button, Input, Card components exist with hardcoded colors
- Jest + React Native Testing Library for testing

## Architecture Decisions

### 1. Theme Token Structure

**Decision:** Centralized theme module with separate files per concern

```
src/theme/
  index.ts      # Re-exports all tokens
  colors.ts     # Color palette and semantic colors
  spacing.ts    # Spacing scale
  typography.ts # Font sizes, weights, line heights
```

**Rationale:**
- Separation of concerns for maintainability
- Tree-shaking friendly (only import what you need)
- Easy to extend with new token types (shadows, borders, etc.)

### 2. Color Token Naming

**Decision:** Two-tier naming - palette + semantic

```typescript
// Palette (raw values)
const palette = {
  indigo500: '#6366F1',
  emerald500: '#10B981',
  // ...
};

// Semantic (usage-based)
export const colors = {
  primary: palette.indigo500,
  secondary: palette.emerald500,
  error: palette.red500,
  // ...
};
```

**Rationale:**
- Palette provides flexibility for designers
- Semantic names communicate intent to developers
- Matches spec's mastery state color progression

### 3. Progress Component Variants

**Decision:** Single Progress component with `variant` prop

```typescript
<Progress variant="bar" value={75} />
<Progress variant="circle" value={50} size={64} />
<Progress variant="dots" current={2} total={5} />
```

**Rationale:**
- Consistent API across progress types
- Shared accessibility logic
- Easier imports (`import { Progress }` vs multiple imports)

### 4. Feedback Components Architecture

**Decision:** Context-based Toast, imperative Modal, declarative BottomSheet

- **Toast:** `ToastProvider` + `useToast()` hook for global notifications
- **Modal:** Declarative component with `visible` prop for confirmation dialogs
- **BottomSheet:** Declarative component for forms and content

**Rationale:**
- Toast needs global access from anywhere (services, handlers)
- Modal needs parent control for confirmation flows
- BottomSheet is content-focused, fits React paradigm

### 5. Projects Database Schema

**Decision:** Single projects table with status enum

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now()
);
```

**Rationale:**
- Simple schema sufficient for Phase 1
- Status enum matches learning project lifecycle
- progress field enables Phase 3 spaced repetition integration
- last_accessed_at enables "recently accessed" sorting

### 6. RLS Policy Strategy

**Decision:** Single policy per operation type with user_id check

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);
```

**Rationale:**
- Simple, auditable policy
- User data isolation by default
- No admin bypass needed for Phase 1

### 7. Projects Context vs Direct Service Calls

**Decision:** ProjectsContext for state, direct service for mutations

```typescript
// Context provides: projects, loading, error, refreshProjects
const { projects, loading } = useProjects();

// Service for mutations (returns updated data)
await createProject({ title });
refreshProjects(); // Sync context
```

**Rationale:**
- Context manages list state and loading
- Service handles Supabase operations
- Separation enables optimistic updates later

## Component Structure

```
src/
  theme/
    index.ts
    colors.ts
    spacing.ts
    typography.ts
  components/ui/
    Button.tsx        # Modified to use theme
    Input.tsx         # Modified to use theme
    Card.tsx          # Modified to use theme
    Progress.tsx      # NEW
    Toast.tsx         # NEW
    Modal.tsx         # NEW
    BottomSheet.tsx   # NEW
  lib/
    projects.ts       # NEW - CRUD service
    projects-context.tsx  # NEW - React context
  types/
    database.ts       # NEW - Supabase types

app/(auth)/projects/
  index.tsx           # Projects list
  [id].tsx            # Project detail
  create.tsx          # Create project
```

## Test Strategy

- Unit tests for theme token exports
- Component tests for Progress, Toast, Modal, BottomSheet
- Service tests for projects CRUD (mocked Supabase)
- Screen tests for projects UI (mocked context)
- Chrome MCP for visual verification
