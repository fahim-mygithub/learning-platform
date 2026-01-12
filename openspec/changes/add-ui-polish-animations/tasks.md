# Tasks: Add UI Polish and Animations

> Reference: openspec/changes/add-ui-polish-animations/proposal.md
> Design: openspec/changes/add-ui-polish-animations/design.md
> Specs: openspec/changes/add-ui-polish-animations/specs/

---

## Phase 1: Foundation

### Task 1.1: Create animation constants file
**Files:** `src/theme/animations.ts`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md`

**Steps:**
1. Create `src/theme/animations.ts`
2. Define timing constants (buttonPress: 100ms, inputFocus: 200ms, etc.)
3. Define spring configurations (tabBarPill, buttonPress, cardEntrance)
4. Define scale constants (buttonPressed: 0.96, cardPressed: 0.98)
5. Export all constants

**Verification:**
```bash
npx tsc --noEmit src/theme/animations.ts
```

**TDD Notes:**
- No test needed - pure constants file

- [ ] Complete

---

### Task 1.2: Create useHaptics hook
**Files:** `src/hooks/useHaptics.ts`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#haptic-feedback`

**Steps:**
1. Create `src/hooks/useHaptics.ts`
2. Import expo-haptics (install if needed: `npx expo install expo-haptics`)
3. Implement platform detection (web = disabled)
4. Export selection(), impact(), notification() methods
5. Handle async properly with try/catch

**Verification:**
```bash
npx expo install expo-haptics
npm test -- --grep "useHaptics"
```

**TDD Notes:**
- RED: Write test that calls hook and verifies methods exist
- GREEN: Implement hook with platform detection

- [ ] Complete

---

### Task 1.3: Fix sign-up screen theme (P0 Critical)
**Files:** `app/(public)/sign-up.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#theme-consistency`

**Steps:**
1. Import `useTypography` and `useMemo` from existing libs
2. Replace static `StyleSheet.create` with dynamic `createStyles(colors)`
3. Update container backgroundColor from `#fff` to `colors.background`
4. Update all text colors to use `colors.text`, `colors.textSecondary`
5. Update error container to use theme colors
6. Update link colors to use `colors.primary`
7. Match sign-in.tsx pattern exactly

**Verification:**
```bash
npm run lint -- app/(public)/sign-up.tsx
# Manual: Navigate to sign-up screen and verify dark theme
```

**TDD Notes:**
- Visual verification required - no unit test

- [ ] Complete

---

## Phase 2: Core Animations

### Task 2.1: Add button loading morph animation
**Files:** `src/components/ui/Button.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#button-animations`

**Steps:**
1. Import `useSharedValue`, `useAnimatedStyle`, `withTiming` from reanimated
2. Import `Animated` View wrapper
3. Add `animateLoading` prop (default: true)
4. Create `loadingProgress` shared value (0 = button, 1 = circle)
5. Animate width from '100%' to 56px
6. Animate borderRadius from 12 to 28
7. Animate text opacity to 0 when loading
8. Use 400ms duration

**Verification:**
```bash
npm test -- --grep "Button"
# Manual: Test button on sign-in screen
```

**TDD Notes:**
- RED: Write test verifying button shows loading state
- GREEN: Add animation (existing loading logic works)

- [ ] Complete

---

### Task 2.2: Add button haptic feedback
**Files:** `src/components/ui/Button.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#haptic-feedback`

**Steps:**
1. Import useHaptics hook
2. Add `hapticOnPress` prop (default: true)
3. Call `haptics.impact('light')` in onPressIn handler
4. Ensure haptic fires before visual feedback

**Verification:**
```bash
# Manual: Test on physical device, feel haptic on button press
```

- [ ] Complete

---

### Task 2.3: Add button press scale animation
**Files:** `src/components/ui/Button.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#button-animations`

**Steps:**
1. Create `pressedScale` shared value (default: 1)
2. Use `withSpring` for press animation (scale to 0.96)
3. Replace static `transform: [{ scale: 0.97 }]` with animated style
4. Use spring config from animations.ts

**Verification:**
```bash
# Manual: Verify smooth spring animation on press
```

- [ ] Complete

---

### Task 2.4: Add input focus border animation
**Files:** `src/components/ui/Input.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#input-animations`

**Steps:**
1. Import reanimated hooks
2. Create `focusProgress` shared value (0 = unfocused, 1 = focused)
3. Animate border color from `colors.border` to `colors.primary`
4. Use `interpolateColor` for smooth transition
5. Duration: 200ms

**Verification:**
```bash
npm test -- --grep "Input"
# Manual: Focus input and verify border color animates
```

- [ ] Complete

---

### Task 2.5: Add tab bar sliding pill
**Files:** `app/(auth)/(tabs)/_layout.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#tab-bar-animations`

**Steps:**
1. Import reanimated and Animated.View
2. Calculate tab positions based on layout
3. Create `pillPosition` shared value
4. Add animated background pill behind active tab
5. Use spring config: `{ damping: 18, stiffness: 140, mass: 1 }`
6. Style pill: primary color at 15% opacity, border-radius 14

**Verification:**
```bash
# Manual: Navigate between tabs, verify smooth pill slide
```

- [ ] Complete

---

## Phase 3: Screen Animations

### Task 3.1: Add sign-in screen entrance animations
**Files:** `app/(public)/sign-in.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#screen-animations`

**Steps:**
1. Import `FadeInDown` from react-native-reanimated
2. Wrap logo container with Animated.View + entering={FadeInDown.duration(600)}
3. Wrap header with FadeInDown.delay(100)
4. Wrap form elements with staggered delays (100ms each)
5. Wrap button with final delay

**Verification:**
```bash
# Manual: Navigate to sign-in, verify staggered entrance
```

- [ ] Complete

---

### Task 3.2: Add sign-up screen entrance animations
**Files:** `app/(public)/sign-up.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#screen-animations`

**Steps:**
1. Match sign-in pattern exactly
2. Stagger form fields (email, password, confirm password)
3. Button enters last

**Verification:**
```bash
# Manual: Navigate to sign-up, verify staggered entrance
```

- [ ] Complete

---

### Task 3.3: Add dashboard entrance animations
**Files:** `app/(auth)/(tabs)/index.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#screen-animations`

**Steps:**
1. Animate welcome header with FadeInDown
2. Animate stats bar with FadeInDown.delay(100)
3. Animate recent activity list items with stagger

**Verification:**
```bash
# Manual: Navigate to dashboard, verify entrance animations
```

- [ ] Complete

---

### Task 3.4: Add projects grid stagger animation
**Files:** `app/(auth)/(tabs)/projects/index.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#screen-animations`

**Steps:**
1. Wrap each project card in Animated.View
2. Use FadeInDown with 50ms stagger between cards
3. Add entering animation to FAB (rotate entrance)

**Verification:**
```bash
# Manual: Navigate to projects, verify waterfall load effect
```

- [ ] Complete

---

## Phase 4: Visual Polish

### Task 4.1: Add Card press animation
**Files:** `src/components/ui/Card.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#card-animations`

**Steps:**
1. Add `onPress` prop to Card component
2. Wrap in Pressable when onPress provided
3. Add scale animation (0.98) on press
4. Use spring config from animations.ts

**Verification:**
```bash
npm test -- --grep "Card"
# Manual: Press card, verify subtle scale animation
```

- [ ] Complete

---

### Task 4.2: Add card gradient for depth
**Files:** `src/components/ui/Card.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#visual-depth`

**Steps:**
1. Import LinearGradient from expo-linear-gradient (install if needed)
2. Add subtle gradient from surface to surfaceElevated
3. Only apply in dark mode
4. Make optional with `gradient` prop

**Verification:**
```bash
# Manual: Verify cards have subtle depth in dark mode
```

- [ ] Complete

---

### Task 4.3: Add empty ring pulse animation
**Files:** `src/components/engagement/MasteryRing.tsx`
**Spec Reference:** `openspec/changes/add-ui-polish-animations/specs/design-system/spec.md#progress-animations`

**Steps:**
1. Detect when progress === 0
2. Add subtle pulse animation to track stroke
3. Use opacity pulse between 0.3 and 0.6
4. Duration: 2000ms, infinite repeat

**Verification:**
```bash
# Manual: View project card with 0% progress, verify pulsing ring
```

- [ ] Complete

---

## Phase 5: Testing & Verification

### Task 5.1: Run full test suite
**Files:** All test files

**Steps:**
1. Run `npm test` and verify no regressions
2. Run `npm run lint` and fix any issues
3. Run `npx tsc --noEmit` and fix type errors

**Verification:**
```bash
npm test && npm run lint && npx tsc --noEmit
```

- [ ] Complete

---

### Task 5.2: Manual accessibility verification
**Files:** N/A

**Steps:**
1. Enable VoiceOver/TalkBack
2. Navigate through all screens
3. Verify animations don't interfere with screen reader
4. Test with reduced motion preference enabled

**Verification:**
```bash
# Manual testing on device
```

- [ ] Complete

---

### Task 5.3: Performance verification
**Files:** N/A

**Steps:**
1. Enable React Native Performance Monitor
2. Navigate through app with animations
3. Verify 60fps maintained during animations
4. Test on Android emulator (lower-end simulation)

**Verification:**
```bash
# Manual: Check JS/UI frame rates in performance monitor
```

- [ ] Complete

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1. Foundation | 3 tasks | P0 (1.3 critical) |
| 2. Core Animations | 5 tasks | P1 |
| 3. Screen Animations | 4 tasks | P1 |
| 4. Visual Polish | 3 tasks | P2 |
| 5. Testing | 3 tasks | Required |

**Total: 18 tasks**
