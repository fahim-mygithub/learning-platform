# Tasks: Interactive Sandbox Feature

> Reference: openspec/changes/add-interactive-sandbox/proposal.md
> Specs: openspec/changes/add-interactive-sandbox/specs/
> Plan: C:\Users\fahim\.claude\plans\cached-wandering-abelson.md

---

## Phase 1: Foundation

### Task 1.1: Install Dependencies
**Files:** `package.json`

**Steps:**
1. Run `npx expo install react-native-reanimated-dnd`
2. Verify installation in package.json

**Verification:**
```bash
npm list react-native-reanimated-dnd
```

- [ ] Complete

---

### Task 1.2: Create Type Definitions
**Files:** `src/types/sandbox.ts`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#schema-design`

**Steps:**
1. Create `SandboxInteraction` interface
2. Create `SandboxElement` interface
3. Create `CorrectStateDefinition` interface
4. Create `SandboxEvaluationResult` interface
5. Add type guards: `isSandboxInteraction()`, `isDraggableElement()`
6. Export `ScaffoldLevel`, `EvaluationMode`, `CognitiveType` types

**Console Logging Points:**
```typescript
// No logging needed - pure types
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 1.3: Create SandboxModal Component
**Files:** `src/components/sandbox/SandboxModal.tsx`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#ux-architecture`

**Steps:**
1. Create full-screen modal with `presentationStyle="fullScreen"`
2. Add header: close button, timer display, hint button
3. Add body area for canvas content
4. Add footer: submit button
5. Implement timer using `useEffect` and `useState`
6. Track hints used count

**Console Logging Points:**
```typescript
console.log('[SandboxModal] Opening:', interactionId);
console.log('[SandboxModal] Hint requested:', hintsUsed);
console.log('[SandboxModal] Submit:', { elapsed, hintsUsed });
console.log('[SandboxModal] Closing:', interactionId);
```

**Screenshot Checkpoint:** Modal opens full-screen, close button works

**Verification:**
```bash
npx expo start
# Manually trigger modal open, verify full-screen display
```

- [ ] Complete

---

### Task 1.4: Create SandboxCanvas Component
**Files:** `src/components/sandbox/SandboxCanvas.tsx`
**Spec Reference:** Context7 react-native-reanimated-dnd docs

**Steps:**
1. Import `DropProvider` from `react-native-reanimated-dnd`
2. Wrap children in DropProvider
3. Apply canvas dimensions from interaction config
4. Set background color from config

**Console Logging Points:**
```typescript
console.log('[SandboxCanvas] Initialized:', { width, height });
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 1.5: Create Draggable Component
**Files:** `src/components/sandbox/Draggable.tsx`
**Spec Reference:** Context7 react-native-reanimated-dnd API

**Steps:**
1. Wrap `Draggable` from library
2. Accept `element: SandboxElement` prop
3. Render element content (text or image)
4. Apply element styles (color, border, shadow)
5. Handle drag state visual feedback

**Console Logging Points:**
```typescript
console.log('[Draggable] Drag started:', elementId);
console.log('[Draggable] Drag ended:', elementId, position);
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 1.6: Create Droppable Component
**Files:** `src/components/sandbox/Droppable.tsx`
**Spec Reference:** Context7 react-native-reanimated-dnd API

**Steps:**
1. Wrap `Droppable` from library
2. Accept `zoneId: string` and `onDrop` callback
3. Configure `dropAlignment="center"`
4. Visual feedback for hover state
5. Handle capacity constraints

**Console Logging Points:**
```typescript
console.log('[Droppable] Element dropped:', elementId, 'into:', zoneId);
console.log('[Droppable] Hover state:', zoneId, isHovered);
```

**Screenshot Checkpoint:** Drag element snaps to zone

**Verification:**
```bash
npx expo start
# Test drag-drop interaction
```

- [ ] Complete

---

### Task 1.7: Create Evaluation Service
**Files:** `src/lib/sandbox-evaluation-service.ts`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#evaluation-system`

**Steps:**
1. Create `evaluateDragDrop()` - compare zone contents to target
2. Create `evaluateSequence()` - Levenshtein distance
3. Create `calculateBaselineTime()` - element count formula
4. Create `deriveRating()` - Friction Formula implementation

**Friction Formula Table:**
| Condition | Rating |
|-----------|--------|
| >3 wrong or gives up | Again (1) |
| >1 hint OR time >2x baseline | Hard (2) |
| 0 hints, time 0.8-1.5x baseline | Good (3) |
| 0 hints, time <0.8x baseline | Easy (4) |

**Console Logging Points:**
```typescript
console.log('[SandboxEval] Evaluating:', interactionId);
console.log('[SandboxEval] Result:', { score, passed, attemptCount });
console.log('[FSRS] Rating derived:', rating, { hintsUsed, timeRatio });
```

**TDD Notes:**
- RED: Write test expecting `deriveRating({ passed: false })` returns 1
- GREEN: Implement Friction Formula
- REFACTOR: Extract constants

**Verification:**
```bash
npm test -- --grep "sandbox-evaluation"
```

- [ ] Complete

---

### Task 1.8: Create Component Index
**Files:** `src/components/sandbox/index.ts`

**Steps:**
1. Export SandboxModal
2. Export SandboxCanvas
3. Export Draggable, Droppable

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

## Phase 2: Factual Interactions

### Task 2.1: Create MatchingInteraction Component
**Files:** `src/components/sandbox/interactions/MatchingInteraction.tsx`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#cognitive-type-mapping`

**Steps:**
1. Left column: render draggable terms
2. Right column: render droppable definitions
3. Track zone contents in state
4. Single capacity per zone
5. Submit handler calls evaluation service
6. Scaffold mode: pre-place some matches

**Console Logging Points:**
```typescript
console.log('[Matching] Match made:', termId, '->', definitionId);
console.log('[Matching] State:', zoneContents);
console.log('[Matching] Submit:', { correct, total });
```

**Screenshot Checkpoint:** Two-column layout, drag feedback visible

**Verification:**
```bash
npx expo start
# Test matching interaction
```

- [ ] Complete

---

### Task 2.2: Create FillInBlankInteraction Component
**Files:** `src/components/sandbox/interactions/FillInBlankInteraction.tsx`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#cognitive-type-mapping`

**Steps:**
1. Parse statement with blank placeholders `[___]`
2. Render inline drop zones
3. Word bank at bottom as draggables
4. Track filled blanks in state
5. Deterministic evaluation (exact match)

**Console Logging Points:**
```typescript
console.log('[FillInBlank] Blank filled:', blankIndex, word);
console.log('[FillInBlank] Submit:', filledBlanks);
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 2.3: Create Interaction Factory
**Files:** `src/lib/sandbox-interaction-factory.ts`

**Steps:**
1. `createInteractionForConcept(concept, cognitiveType)` function
2. Map cognitive types to interaction components
3. Generate elements based on concept content
4. Return appropriate `SandboxInteraction` schema

**Console Logging Points:**
```typescript
console.log('[InteractionFactory] Creating:', cognitiveType, conceptId);
```

**Verification:**
```bash
npm test -- --grep "interaction-factory"
```

- [ ] Complete

---

## Phase 3: Procedural Interactions

### Task 3.1: Create SequencingInteraction Component
**Files:** `src/components/sandbox/interactions/SequencingInteraction.tsx`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#cognitive-type-mapping`

**Steps:**
1. Vertical list of steps (initially shuffled)
2. Drag to reorder using reanimated-dnd
3. Step numbers update in real-time
4. Submit validates sequence order

**Console Logging Points:**
```typescript
console.log('[Sequencing] Initial order:', shuffledOrder);
console.log('[Sequencing] Reorder:', { from, to });
console.log('[Sequencing] Submit:', userSequence);
```

**Screenshot Checkpoint:** Smooth reorder animation

**Verification:**
```bash
npx expo start
# Test sequence reordering
```

- [ ] Complete

---

### Task 3.2: Create Graph Distance Utility
**Files:** `src/lib/sandbox-graph-distance.ts`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#layer-1-deterministic`

**Steps:**
1. `calculateSequenceDistance(user, correct)` - Levenshtein
2. `calculatePartialCredit(distance, length)` - score 0-1
3. Handle edge cases (empty arrays, single element)

**TDD Notes:**
- RED: `calculateSequenceDistance([1,2,3], [1,3,2])` should return 2
- GREEN: Implement Levenshtein
- REFACTOR: Optimize for common cases

**Verification:**
```bash
npm test -- --grep "graph-distance"
```

- [ ] Complete

---

## Phase 4: FSRS Integration

### Task 4.1: Extend Spaced Repetition Service
**Files:** `src/lib/spaced-repetition/spaced-repetition-service.ts`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#fsrs-integration`

**Steps:**
1. Add `recordSandboxReview(userId, conceptId, fsrsRating)` method
2. Map rating number (1-4) to FSRS state update
3. Update concept's spaced repetition schedule

**Console Logging Points:**
```typescript
console.log('[SpacedRep] Recording sandbox review:', { conceptId, rating });
```

**Verification:**
```bash
npm test -- --grep "spaced-repetition"
```

- [ ] Complete

---

## Phase 5: Feed Integration

### Task 5.1: Update Engagement Types
**Files:** `src/types/engagement.ts`
**Spec Reference:** `openspec/changes/add-interactive-sandbox/proposal.md#type-integration`

**Steps:**
1. Add `'sandbox'` to `FeedItemType` union
2. Create `SandboxItem` interface
3. Update `FeedItem` union type

```typescript
export type FeedItemType = ... | 'sandbox';

export interface SandboxItem {
  id: string;
  type: 'sandbox';
  conceptId: string;
  interaction: SandboxInteraction;
  scaffoldLevel: ScaffoldLevel;
}
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 5.2: Create SandboxPreviewCard Component
**Files:** `src/components/feed/SandboxPreviewCard.tsx`

**Steps:**
1. Concept name header
2. Interaction type badge (Matching, Sequencing, etc.)
3. "Start Interaction" button with onPress handler
4. Estimated time indicator
5. Scaffold level indicator

**Console Logging Points:**
```typescript
console.log('[SandboxPreview] Render:', interactionId);
console.log('[SandboxPreview] Start pressed:', interactionId);
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 5.3: Update Feed Context
**Files:** `src/lib/feed-context.tsx`
**Spec Reference:** Verified integration points from feed-builder-service.ts

**Steps:**
1. Add `sandboxModalVisible: boolean` state
2. Add `currentSandboxItem: SandboxItem | null` state
3. Add `startSandboxInteraction(itemId)` method
4. Add `completeSandboxInteraction(itemId, result)` method
5. Integrate with session stats tracking

**Console Logging Points:**
```typescript
console.log('[FeedContext] Starting sandbox:', itemId);
console.log('[FeedContext] Sandbox complete:', { itemId, score });
```

**Verification:**
```bash
npx tsc --noEmit
```

- [ ] Complete

---

### Task 5.4: Update Feed Builder Service
**Files:** `src/lib/feed-builder-service.ts`
**Spec Reference:** SYNTHESIS_INTERVAL pattern

**Steps:**
1. Add `createSandboxItem(concept, cognitiveType)` function
2. Insert sandbox items every 6-8 feed items
3. Select appropriate cognitive type based on concept
4. Follow existing `buildFeedWithSynthesis()` pattern

**Console Logging Points:**
```typescript
console.log('[FeedBuilder] Creating sandbox item:', conceptId);
console.log('[FeedBuilder] Sandbox inserted at index:', index);
```

**Verification:**
```bash
npm test -- --grep "feed-builder"
```

- [ ] Complete

---

### Task 5.5: Update Learning Screen
**Files:** `app/(auth)/learning.tsx`

**Steps:**
1. Import SandboxPreviewCard and SandboxModal
2. Render SandboxPreviewCard for `type === 'sandbox'` items
3. Add SandboxModal overlay controlled by feed context
4. Handle modal open/close transitions

**Screenshot Checkpoint:** Preview card visible in feed, modal overlay works

**Verification:**
```bash
npx expo start
# Navigate to learning feed, verify sandbox card appears
```

- [ ] Complete

---

## Phase 6: Final Verification

### Task 6.1: Full Integration Test
**Steps:**
1. Start dev server: `npx expo start`
2. Navigate through feed until sandbox card appears
3. Tap "Start Interaction" - verify modal opens
4. Complete interaction - verify evaluation works
5. Verify FSRS rating is recorded
6. Check console logs at each step

**Screenshot Checkpoints:**
- [ ] Preview card in feed
- [ ] Modal open with drag elements
- [ ] Successful drop with feedback
- [ ] Completion screen with score

- [ ] Complete

---

### Task 6.2: Type Check and Tests
**Verification:**
```bash
npx tsc --noEmit
npm test -- --grep "sandbox"
```

- [ ] Complete

---

### Task 6.3: Git Commit
**Steps:**
1. Stage all changes: `git add .`
2. Create commit with message from plan
3. Verify commit succeeded

```bash
git add .
git commit -m "feat: add interactive sandbox for active learning

- Add SandboxModal with full-screen drag-drop canvas
- Implement Matching, FillInBlank, Sequencing interactions
- Integrate with FSRS via Friction Formula rating
- Add SandboxPreviewCard to feed stream
- TDD with console logging at critical junctures

Cognitive types supported: factual, procedural
Scaffold levels: worked, scaffold, faded

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

- [ ] Complete

---

## Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1: Foundation | 8 tasks | - |
| Phase 2: Factual Interactions | 3 tasks | - |
| Phase 3: Procedural Interactions | 2 tasks | - |
| Phase 4: FSRS Integration | 1 task | - |
| Phase 5: Feed Integration | 5 tasks | - |
| Phase 6: Final Verification | 3 tasks | - |
| **Total** | **22 tasks** | - |
