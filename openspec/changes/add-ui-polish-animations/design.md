# Design: UI Polish and Animations

## Overview

This document details the architectural decisions for implementing premium UI polish across LearnFlow. The design prioritizes performance, maintainability, and progressive enhancement.

## Architecture Decisions

### 1. Animation Library Choice

**Decision**: Use React Native Reanimated v3 exclusively

**Rationale**:
- Already installed in the project
- Runs on UI thread (60fps guaranteed)
- Supports `useAnimatedProps` for SVG animations
- Spring physics built-in
- Gesture handler integration

**Alternatives Considered**:
- Animated API: Limited to JS thread, no spring physics
- Moti: Additional dependency, less control
- Lottie: Overkill for micro-interactions (reserved for celebrations)

### 2. Animation Configuration Constants

**Decision**: Centralize all animation timings and spring configs in theme

```typescript
// src/theme/animations.ts
export const animations = {
  timing: {
    buttonPress: 100,
    inputFocus: 200,
    logoEntrance: 600,
    xpCountUp: 1000,
    masteryRingFill: 1500,
    buttonMorph: 400,
    glowBreathing: 4000,
  },
  spring: {
    tabBarPill: { damping: 18, stiffness: 140, mass: 1 },
    buttonPress: { damping: 15, stiffness: 150 },
    cardEntrance: { damping: 12, stiffness: 100 },
  },
  scale: {
    buttonPressed: 0.96,
    cardPressed: 0.98,
  },
};
```

**Rationale**:
- Single source of truth for animation values
- Easy to tune across the app
- Matches existing theme token pattern

### 3. Haptic Feedback Strategy

**Decision**: Create a `useHaptics` hook with feature detection

```typescript
// src/hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function useHaptics() {
  const isAvailable = Platform.OS !== 'web';

  return {
    selection: () => isAvailable && Haptics.selectionAsync(),
    impact: (style = 'medium') => isAvailable && Haptics.impactAsync(style),
    notification: (type) => isAvailable && Haptics.notificationAsync(type),
  };
}
```

**Interaction Map**:
| Interaction | Trigger | Haptic Type |
|-------------|---------|-------------|
| Tab press | onPress | selection |
| Toggle switch | onChange | selection |
| Button press | onPressIn | impact (light) |
| Form submit success | onSuccess | notification (success) |
| Validation error | onError | notification (error) |
| Pull-to-refresh snap | threshold | impact (medium) |

### 4. AnimatedButton Component Design

**Decision**: Enhance existing Button component with optional animation props

```typescript
interface ButtonProps {
  // Existing props...

  // New animation props
  animateLoading?: boolean;  // Enable morph animation (default: true)
  hapticOnPress?: boolean;   // Enable haptic feedback (default: true)
}
```

**Loading Morph Animation Approach**:
1. Animate width from `100%` to `56px` (height)
2. Animate borderRadius from `12px` to `28px` (circle)
3. Fade out text, fade in ActivityIndicator
4. Duration: 400ms with `withTiming`

**Rationale**:
- Backwards compatible (existing usage unchanged)
- Opt-out available for specific cases
- Animation values from centralized config

### 5. Tab Bar Sliding Pill

**Decision**: Custom tab bar with Animated.View pill

**Implementation Approach**:
```typescript
// Inside TabsLayout
const tabPositions = [0, tabWidth, tabWidth * 2];
const pillPosition = useSharedValue(0);

// On tab change:
pillPosition.value = withSpring(tabPositions[index], animations.spring.tabBarPill);
```

**Pill Styling**:
- Background: `colors.primary` at 15% opacity
- Border-radius: 14px (pill shape)
- Width: matches icon container
- Spring config: `{ damping: 18, stiffness: 140 }` for "magnetic" feel

### 6. Screen Entrance Animations

**Decision**: Use `Animated.FadeInDown` from Reanimated's layout animations

**Pattern**:
```typescript
import Animated, { FadeInDown } from 'react-native-reanimated';

// Logo entrance (first)
<Animated.View entering={FadeInDown.duration(600).delay(0)}>

// Form elements (staggered)
<Animated.View entering={FadeInDown.duration(400).delay(100)}>
<Animated.View entering={FadeInDown.duration(400).delay(200)}>
```

**Stagger Pattern**:
- Logo/header: 0ms delay, 600ms duration
- Form elements: 100ms stagger, 400ms duration each
- Buttons: 200ms after last form element

### 7. Card Press Animation

**Decision**: Add `Pressable` wrapper with animated scale

```typescript
const pressed = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pressed.value }],
}));

// On press:
pressed.value = withSpring(0.98, animations.spring.buttonPress);
```

## Component Changes Summary

| Component | Change Type | Description |
|-----------|-------------|-------------|
| Button | Enhancement | Add loading morph, haptic feedback |
| Input | Enhancement | Add focus border animation |
| Card | Enhancement | Add press scale animation |
| TabsLayout | Rewrite | Add sliding pill indicator |
| sign-up.tsx | Fix | Convert to theme system |

## File Structure

```
src/
├── theme/
│   ├── animations.ts      # NEW: Animation constants
│   └── colors.ts          # Existing
├── hooks/
│   └── useHaptics.ts      # NEW: Haptic feedback hook
├── components/
│   └── ui/
│       ├── Button.tsx     # Enhanced
│       ├── Input.tsx      # Enhanced
│       ├── Card.tsx       # Enhanced
│       └── AnimatedCard.tsx  # NEW: Card with animations
app/
├── (public)/
│   └── sign-up.tsx        # Fixed: theme system
└── (auth)/(tabs)/
    └── _layout.tsx        # Enhanced: sliding pill
```

## Performance Considerations

1. **Use `useNativeDriver: true`** for all transform/opacity animations
2. **Avoid layout animations** on lists with many items
3. **Memoize animated styles** with `useAnimatedStyle`
4. **Test on Android emulator** before shipping

## Testing Strategy

1. **Visual regression**: Capture screenshots before/after
2. **Animation timing**: Verify durations match specs
3. **Haptic feedback**: Manual test on physical device
4. **Accessibility**: Ensure reduced motion is respected
