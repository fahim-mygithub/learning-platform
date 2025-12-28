# Design: React Native Application Foundation

## Context

This is a greenfield React Native project for an AI-powered learning platform. The spec mandates:
- React Native for iOS & Android
- Supabase for backend (PostgreSQL + Auth + Storage + Realtime)
- Mobile-first design with 44px touch targets
- WCAG 2.1 AA accessibility compliance

Key constraints:
- Windows development environment (user's machine)
- Must support both iOS and Android from day one
- Offline capability required for core review functionality

## Goals / Non-Goals

**Goals:**
- Establish production-ready project structure
- Enable rapid feature development with hot reload
- Set up type-safe Supabase integration
- Create accessible component foundation
- Configure CI-ready testing and linting

**Non-Goals:**
- Implement any Phase 1 features (authentication, projects, uploads)
- Set up CI/CD pipelines (separate change)
- Configure app store deployment (separate change)
- Implement offline storage (Phase 1 feature)

## Decisions

### Decision 1: Expo (Managed Workflow)

**Choice:** Expo SDK 52 with managed workflow

**Rationale:**
- Faster development iteration (OTA updates)
- Simplified native module management
- Built-in support for iOS/Android builds via EAS
- Expo Router provides file-based navigation (React Navigation under the hood)

**Alternatives Considered:**
- React Native CLI: More control, but requires Xcode/Android Studio for all builds
- Expo bare workflow: Overkill for initial phase

### Decision 2: Directory Structure

**Choice:** Feature-based organization with clear separation

```
app/                      # Expo Router pages (file-based routing)
  (auth)/                 # Auth-gated routes
    _layout.tsx
    (tabs)/               # Tab navigation
      index.tsx           # Home/Dashboard
      projects.tsx        # Projects list
      settings.tsx        # Settings
  (public)/               # Public routes (no auth)
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  _layout.tsx             # Root layout
src/
  components/             # Shared UI components
    ui/                   # Base primitives (Button, Input, Card)
    feedback/             # Toast, Modal, Alert
  features/               # Feature modules (added in later phases)
  hooks/                  # Custom React hooks
  lib/                    # Utilities and clients
    supabase.ts           # Supabase client
    storage.ts            # Async storage wrapper
  types/                  # TypeScript types
  constants/              # App constants, theme
```

**Rationale:**
- Expo Router requires `app/` directory for routes
- Feature modules encapsulate related code
- Clear separation between pages and components

### Decision 3: Supabase Client Setup

**Choice:** Singleton client with React Context provider

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

**Rationale:**
- AsyncStorage for session persistence across app restarts
- Environment variables via Expo's EXPO_PUBLIC_ prefix
- Single client instance prevents connection duplication

### Decision 4: Testing Framework

**Choice:** Jest + React Native Testing Library

**Rationale:**
- Jest is standard for React Native
- RNTL encourages accessibility-first testing
- Matches Phase requirement for WCAG compliance testing

### Decision 5: UI Component Approach

**Choice:** Custom components built on React Native primitives

**Rationale:**
- Spec requires specific accessibility features (44px targets, 4.5:1 contrast)
- Custom components allow full control over design system
- No external UI library dependency to manage

**Base Components (Placeholder structure):**
- `Button` - Touch-friendly with loading states
- `Input` - Text input with validation styling
- `Card` - Content container
- `Text` - Typography with semantic variants

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Expo SDK update breaks app | Medium | Pin SDK version, test upgrades in branch |
| Supabase JS v2 breaking changes | Low | Lock version, follow changelog |
| Windows Expo issues | Medium | Document WSL setup as fallback |

## Migration Plan

N/A - Greenfield project.

## Open Questions

1. **Resolved:** Use Expo Router vs React Navigation directly? → Expo Router (simpler, file-based)
2. **Resolved:** NativeWind (Tailwind) vs StyleSheet? → StyleSheet initially (simpler, spec doesn't require Tailwind)
3. **For later:** State management (Zustand vs Context) - defer until Phase 1 implementation
