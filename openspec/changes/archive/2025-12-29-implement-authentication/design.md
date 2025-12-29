# Design: User Authentication Flows

## Context

Building on the existing infrastructure:
- Supabase client configured with AsyncStorage persistence
- AuthContext provides session state and signOut
- Protected routes redirect unauthenticated users
- Button/Input components ready for form use

## Architecture Decisions

### 1. Auth Methods in Context vs Direct Supabase Calls

**Decision:** Add auth methods to AuthContext

**Rationale:**
- Centralizes all auth logic in one place
- Components don't need to import supabase directly
- Easier to test with context mocking
- Consistent error handling across all auth operations

### 2. Form Validation Approach

**Decision:** Client-side validation with utility functions

**Rationale:**
- Immediate feedback improves UX
- Reduces unnecessary API calls
- Validation utilities reusable across forms
- Supabase still validates server-side as backup

**Validation Rules:**
- Email: RFC 5322 simplified regex
- Password: Minimum 8 characters, at least one letter and one number

### 3. Email Verification Flow

**Decision:** Redirect to verification-pending screen after signup

**Rationale:**
- Clear user feedback about next steps
- Matches Supabase email confirmation flow
- User can request resend from this screen
- Auto-redirects when verification completes (via onAuthStateChange)

### 4. Error Handling Strategy

**Decision:** Return error objects, display via form state

**Rationale:**
- Consistent with existing signOut pattern
- Components handle display (flexibility)
- Errors typed via Supabase AuthError
- User-friendly messages mapped from error codes

## Component Structure

```
app/(public)/
  sign-in.tsx        # Email/password form, link to sign-up
  sign-up.tsx        # Email/password form, link to sign-in
  verify-email.tsx   # Verification pending, resend button

src/lib/
  auth-context.tsx   # Add signIn, signUp, resendVerification
  validation.ts      # validateEmail, validatePassword utilities
```

## State Flow

```
[Sign Up Form]
      |
      v
[Submit] --> [Validation Error?] --> [Show inline error]
      |
      v (valid)
[supabase.auth.signUp]
      |
      v
[Success?] --> [Navigate to /verify-email]
      |
      v (error)
[Show error message]
```

## Test Strategy

- Unit tests for validation utilities
- Component tests for form interactions
- Integration test for full sign-up -> verify flow (mocked Supabase)
