# Tasks: React Native App Initialization

> Reference: openspec/changes/add-react-native-init/proposal.md
> Design: openspec/changes/add-react-native-init/design.md
> Specs: openspec/changes/add-react-native-init/specs/

## 1. Project Initialization

### Task 1.1: Create Expo project with TypeScript template
**Files:** `app.json`, `package.json`, `tsconfig.json`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#expo-project-configuration`

**Steps:**
1. Run `npx create-expo-app@latest learning-platform --template expo-template-blank-typescript`
2. Move generated files to project root (or generate in place)
3. Verify `app.json` has correct app name and slug

**Verification:**
```bash
npx expo start --no-dev --minify
# Should start without errors
```

**TDD Notes:**
- RED: No project exists, expo start fails
- GREEN: Project initializes, server starts

- [ ] Complete

---

### Task 1.2: Configure TypeScript strict mode and path aliases
**Files:** `tsconfig.json`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#expo-project-configuration`

**Steps:**
1. Enable `strict: true` in tsconfig.json
2. Add path aliases for `@/` pointing to project root
3. Configure `baseUrl` and `paths`

**Verification:**
```bash
npx tsc --noEmit
# Should complete with no errors
```

**TDD Notes:**
- RED: Import `@/src/lib/supabase` fails
- GREEN: Path alias resolves correctly

- [ ] Complete

---

### Task 1.3: Set up environment configuration
**Files:** `.env.example`, `src/lib/env.ts`, `.gitignore`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#expo-project-configuration`

**Steps:**
1. Create `.env.example` with required variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)
2. Create `.env` from example (gitignored)
3. Create type-safe env accessor in `src/lib/env.ts`
4. Add `.env` to `.gitignore`

**Verification:**
```bash
grep -q "EXPO_PUBLIC_SUPABASE_URL" .env.example && echo "ENV template exists"
```

**TDD Notes:**
- RED: Accessing env variable returns undefined
- GREEN: Typed env helper returns string value

- [ ] Complete

---

## 2. Navigation Infrastructure

### Task 2.1: Set up Expo Router with layout structure
**Files:** `app/_layout.tsx`, `app/(public)/_layout.tsx`, `app/(auth)/_layout.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#navigation-infrastructure`

**Steps:**
1. Create root `_layout.tsx` with Stack navigator
2. Create `(public)/_layout.tsx` for unauthenticated routes
3. Create `(auth)/_layout.tsx` for authenticated routes
4. Configure slot/outlet for nested routing

**Verification:**
```bash
npx expo start
# Navigate to different routes in app
```

**TDD Notes:**
- RED: App crashes on launch (no layout)
- GREEN: Root layout renders, navigation works

- [ ] Complete

---

### Task 2.2: Create placeholder screens for all route groups
**Files:** `app/(public)/sign-in.tsx`, `app/(public)/sign-up.tsx`, `app/(auth)/(tabs)/index.tsx`, `app/(auth)/(tabs)/projects.tsx`, `app/(auth)/(tabs)/settings.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#navigation-infrastructure`

**Steps:**
1. Create sign-in placeholder screen
2. Create sign-up placeholder screen
3. Create home tab placeholder
4. Create projects tab placeholder
5. Create settings tab placeholder

**Verification:**
```bash
npx expo start
# Each screen accessible via navigation
```

**TDD Notes:**
- RED: Navigation to `/sign-in` 404s
- GREEN: All placeholder screens render

- [ ] Complete

---

### Task 2.3: Implement tab navigation with icons
**Files:** `app/(auth)/(tabs)/_layout.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#navigation-infrastructure`

**Steps:**
1. Create tabs layout with Tabs component from expo-router
2. Add icons for each tab (using @expo/vector-icons)
3. Configure tab bar styling with accessibility in mind
4. Ensure icons meet 4.5:1 contrast ratio

**Verification:**
```bash
npx expo start
# Tab bar visible with icons, tapping switches tabs
```

**TDD Notes:**
- RED: Tabs render without icons
- GREEN: Each tab has icon, active state visible

- [ ] Complete

---

## 3. Supabase Integration

### Task 3.1: Install and configure Supabase client
**Files:** `package.json`, `src/lib/supabase.ts`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#supabase-client-integration`

**Steps:**
1. Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage`
2. Create Supabase client with AsyncStorage adapter
3. Configure auto-refresh and session persistence

**Verification:**
```bash
npm test -- --grep "Supabase client"
```

**TDD Notes:**
- RED: Test expects supabase client export, file doesn't exist
- GREEN: Client exports, test passes

- [ ] Complete

---

### Task 3.2: Create auth context provider
**Files:** `src/lib/auth-context.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#supabase-client-integration`

**Steps:**
1. Create AuthContext with session state
2. Subscribe to auth state changes
3. Provide loading state during session restore
4. Export `useAuth` hook

**Verification:**
```bash
npm test -- --grep "AuthContext"
```

**TDD Notes:**
- RED: useAuth hook throws outside provider
- GREEN: Hook returns session state

- [ ] Complete

---

### Task 3.3: Implement auth-gated routing
**Files:** `app/_layout.tsx`, `app/(auth)/_layout.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#navigation-infrastructure`

**Steps:**
1. Wrap root layout with AuthProvider
2. Check session in (auth) layout
3. Redirect to sign-in if unauthenticated
4. Show loading screen during session restore

**Verification:**
```bash
npx expo start
# Without session, navigating to /projects redirects to /sign-in
```

**TDD Notes:**
- RED: Protected route accessible without auth
- GREEN: Redirect to sign-in works

- [ ] Complete

---

## 4. Development Tooling

### Task 4.1: Configure ESLint with TypeScript rules
**Files:** `.eslintrc.js`, `package.json`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#development-tooling`

**Steps:**
1. Install ESLint and TypeScript plugin
2. Configure React Native and accessibility rules
3. Add `lint` script to package.json

**Verification:**
```bash
npm run lint
# Should complete with no errors (or only warnings)
```

**TDD Notes:**
- RED: `npm run lint` command not found
- GREEN: Lint runs, reports issues if any

- [ ] Complete

---

### Task 4.2: Configure Prettier for code formatting
**Files:** `.prettierrc`, `package.json`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#development-tooling`

**Steps:**
1. Install Prettier
2. Create `.prettierrc` with project settings
3. Add `format` and `format:check` scripts

**Verification:**
```bash
npm run format:check
```

**TDD Notes:**
- RED: `npm run format:check` command not found
- GREEN: Formatter runs, checks all files

- [ ] Complete

---

### Task 4.3: Set up Jest with React Native Testing Library
**Files:** `jest.config.js`, `jest.setup.js`, `package.json`, `src/__tests__/App.test.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#development-tooling`

**Steps:**
1. Install jest, @testing-library/react-native, jest-expo
2. Create jest.config.js with React Native preset
3. Create jest.setup.js for test utilities
4. Add sample test file
5. Add `test` script to package.json

**Verification:**
```bash
npm test
# Should run sample test successfully
```

**TDD Notes:**
- RED: `npm test` fails (no config)
- GREEN: Sample test passes

- [ ] Complete

---

## 5. Base Component Library

### Task 5.1: Create Button component with accessibility
**Files:** `src/components/ui/Button.tsx`, `src/components/ui/__tests__/Button.test.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#base-component-library`

**Steps:**
1. Create Button component with TouchableOpacity/Pressable
2. Enforce 44px minimum touch target
3. Add loading state with ActivityIndicator
4. Add accessibility label support
5. Write tests for accessibility props

**Verification:**
```bash
npm test -- --grep "Button"
```

**TDD Notes:**
- RED: Test expects Button with minHeight 44, component doesn't exist
- GREEN: Button renders with correct sizing

- [ ] Complete

---

### Task 5.2: Create Input component with accessibility
**Files:** `src/components/ui/Input.tsx`, `src/components/ui/__tests__/Input.test.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#base-component-library`

**Steps:**
1. Create Input component wrapping TextInput
2. Enforce 44px minimum height
3. Add error state styling
4. Add accessibility labels for screen readers
5. Write tests for accessibility

**Verification:**
```bash
npm test -- --grep "Input"
```

**TDD Notes:**
- RED: Test expects Input with accessibilityLabel, component doesn't exist
- GREEN: Input renders with accessibility props

- [ ] Complete

---

### Task 5.3: Create Card component
**Files:** `src/components/ui/Card.tsx`, `src/components/ui/__tests__/Card.test.tsx`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#base-component-library`

**Steps:**
1. Create Card container component
2. Add padding and border radius
3. Support children prop
4. Write render test

**Verification:**
```bash
npm test -- --grep "Card"
```

**TDD Notes:**
- RED: Test expects Card component, doesn't exist
- GREEN: Card renders children

- [ ] Complete

---

### Task 5.4: Create component index exports
**Files:** `src/components/ui/index.ts`, `src/components/index.ts`
**Spec Reference:** `openspec/changes/add-react-native-init/specs/app-infrastructure/spec.md#base-component-library`

**Steps:**
1. Create ui/index.ts exporting Button, Input, Card
2. Create components/index.ts re-exporting from ui

**Verification:**
```bash
npx tsc --noEmit
# Import { Button } from '@/src/components' works
```

**TDD Notes:**
- RED: Import fails
- GREEN: Named exports work

- [ ] Complete

---

## 6. Final Verification

### Task 6.1: Full integration test
**Files:** N/A (verification only)
**Spec Reference:** All specs in `openspec/changes/add-react-native-init/specs/`

**Steps:**
1. Run full test suite
2. Run linting
3. Run type checking
4. Start Expo and verify all screens accessible

**Verification:**
```bash
npm test && npm run lint && npx tsc --noEmit && npx expo start
```

**TDD Notes:**
- All tests pass
- No lint errors
- No type errors
- App runs successfully

- [ ] Complete

---

## Parallelization Notes

**Independent tasks (can run in parallel):**
- Tasks 4.1, 4.2, 4.3 (tooling setup)
- Tasks 5.1, 5.2, 5.3 (component creation)

**Sequential dependencies:**
- Task 1.1 must complete before all other tasks
- Task 1.2 depends on 1.1
- Task 1.3 depends on 1.1
- Tasks 2.x depend on 1.1 and 1.2
- Task 3.1 depends on 1.1 and 1.3
- Tasks 3.2, 3.3 depend on 3.1
- Task 6.1 depends on all other tasks
