# Tasks: Implement User Authentication

> Reference: openspec/changes/implement-authentication/proposal.md
> Design: openspec/changes/implement-authentication/design.md
> Specs: openspec/changes/implement-authentication/specs/

## 1. Validation Utilities

### Task 1.1: Create form validation module
**Files:** `src/lib/validation.ts`, `src/lib/__tests__/validation.test.ts`
- Implement `validateEmail(email: string): string | null` - returns error message or null
- Implement `validatePassword(password: string): string | null` - returns error message or null
- Password requirements: min 8 chars, at least 1 letter, at least 1 number
- Write unit tests covering valid/invalid inputs

### Task 1.2: Export validation from lib index
**Files:** `src/lib/index.ts`
- Create lib barrel export if not exists
- Export validation utilities

## 2. Auth Context Enhancement

### Task 2.1: Add signUp method to AuthContext
**Files:** `src/lib/auth-context.tsx`
- Add `signUp(email: string, password: string)` method
- Return `{ data, error }` matching Supabase pattern
- Handle and log errors consistently

### Task 2.2: Add signIn method to AuthContext
**Files:** `src/lib/auth-context.tsx`
- Add `signIn(email: string, password: string)` method
- Return `{ data, error }` matching Supabase pattern
- Handle unverified email case

### Task 2.3: Add resendVerification method to AuthContext
**Files:** `src/lib/auth-context.tsx`
- Add `resendVerification(email: string)` method
- Use Supabase resend API
- Return `{ error }` pattern

### Task 2.4: Add auth context tests
**Files:** `src/lib/__tests__/auth-context.test.tsx`
- Test signUp success and error cases
- Test signIn success and error cases
- Test resendVerification
- Mock Supabase client

## 3. Sign-Up Screen

### Task 3.1: Implement sign-up form UI
**Files:** `app/(public)/sign-up.tsx`
- Email input with validation
- Password input with show/hide toggle
- Confirm password input
- Submit button with loading state
- Link to sign-in screen
- Use existing Input and Button components

### Task 3.2: Implement sign-up form logic
**Files:** `app/(public)/sign-up.tsx`
- Form state management (email, password, confirmPassword, errors, loading)
- Validation on blur and submit
- Call authContext.signUp on submit
- Navigate to verify-email on success
- Display errors from API

### Task 3.3: Add sign-up screen tests
**Files:** `app/(public)/__tests__/sign-up.test.tsx`
- Test form renders with inputs
- Test validation errors display
- Test successful submission navigation
- Test API error display

## 4. Sign-In Screen

### Task 4.1: Implement sign-in form UI
**Files:** `app/(public)/sign-in.tsx`
- Email input
- Password input with show/hide toggle
- Submit button with loading state
- Link to sign-up screen
- "Forgot password?" link (placeholder for future)

### Task 4.2: Implement sign-in form logic
**Files:** `app/(public)/sign-in.tsx`
- Form state management
- Validation on submit
- Call authContext.signIn on submit
- Handle unverified email error specifically
- Navigate to home on success (handled by auth state change)

### Task 4.3: Add sign-in screen tests
**Files:** `app/(public)/__tests__/sign-in.test.tsx`
- Test form renders
- Test validation errors
- Test successful sign-in
- Test invalid credentials error

## 5. Email Verification Screen

### Task 5.1: Create verify-email screen
**Files:** `app/(public)/verify-email.tsx`
- Display email address passed via route params
- "Check your email" messaging
- Resend verification button
- Back to sign-in link

### Task 5.2: Implement resend functionality
**Files:** `app/(public)/verify-email.tsx`
- Resend button with 60-second cooldown
- Success/error feedback
- Countdown timer display during cooldown

### Task 5.3: Add verify-email screen tests
**Files:** `app/(public)/__tests__/verify-email.test.tsx`
- Test screen displays email
- Test resend button works
- Test cooldown prevents spam
- Test back to sign-in navigation

## 6. Integration & Polish

### Task 6.1: Run full test suite
**Command:** `npm test`
- Ensure all tests pass
- Check coverage for new code

### Task 6.2: Run linting and type check
**Command:** `npm run lint && npx tsc --noEmit`
- Fix any lint errors
- Resolve any type errors

### Task 6.3: Manual verification
- Test sign-up flow end-to-end
- Test sign-in flow end-to-end
- Verify accessibility with screen reader
- Check responsive layout

## Dependencies

```
Task 1.1 ──┬──> Task 3.1, 3.2, 4.1, 4.2
           │
Task 2.1 ──┼──> Task 3.2
Task 2.2 ──┼──> Task 4.2
Task 2.3 ──┼──> Task 5.2
           │
Task 3.x ──┼──> Task 6.x
Task 4.x ──┼──> Task 6.x
Task 5.x ──┴──> Task 6.x
```

## Parallelizable Work

- Tasks 1.1 and 2.1-2.3 can run in parallel (no dependencies)
- Tasks 3.1-3.3, 4.1-4.3, and 5.1-5.3 can run in parallel after dependencies met
