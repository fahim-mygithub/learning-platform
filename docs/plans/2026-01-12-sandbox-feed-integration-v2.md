# Sandbox Feed Integration - Design v2 (Post-Gemini Round 1)

## Changes from v1 Based on Gemini Feedback

### Critical Fixes Applied

1. **Pacing Conflict Resolution**
   - Extended feed pattern to 6 items when sandbox needed
   - AI decides which slot to replace or extend

2. **Cognitive Warm-up Rule**
   - Never place sandbox in first 3 items of session
   - Minimum warm-up period before high cognitive load

3. **Friction Formula Improvements**
   - Hard: Changed from ">2x baseline" to ">1.5x AND 0 hints"
   - Good: Defined as "1st/2nd attempt AND time within 0.8x-1.5x baseline"
   - Easy: Only for cards with difficulty < 5

---

## 1. Feed Construction Architecture

### Window-Based AI Placement (Incremental)

Instead of batching all placement decisions, use incremental window-based calls:

```typescript
interface FeedConstructionWindow {
  // Current window of items being constructed
  windowSize: 5; // 3-5 items per window
  windowIndex: number;

  // Items in this window
  items: FeedItem[];

  // Context for AI decision
  conceptsCovered: string[];
  userPerformance: RecentPerformance;
  lastSandboxIndex: number | null;
}

interface SandboxPlacementDecision {
  shouldInsertSandbox: boolean;
  insertAtPosition: number; // Position within window
  replaceItemType: 'fact' | 'quiz' | 'extend'; // Which slot to use
  conceptIds: string[];
  interactionType: SandboxInteractionType;
  confidence: number;
}
```

### Modified Feed Pattern

```typescript
// Base pattern (can extend to 6 when sandbox needed)
const FEED_PATTERN = ['content', 'quiz', 'content', 'fact', 'content'];

// When AI decides sandbox needed:
// Option A: Replace 'fact' with 'sandbox'
// Option B: Extend to ['content', 'quiz', 'content', 'fact', 'content', 'sandbox']
```

### Placement Rules

```typescript
const PLACEMENT_RULES = {
  // Cognitive Warm-up: No sandbox in first 3 items
  minWarmupItems: 3,

  // Sandbox Fatigue: Cooldown between sandboxes
  minItemsBetweenSandboxes: 8,

  // Optimal placement window (% of session)
  optimalPlacementRange: { min: 0.60, max: 0.85 },

  // Per-session limits
  minSandboxesPerSession: 1,
  maxSandboxesPerSession: 3,

  // Skip if concept is mastered (FSRS stability > 30 days)
  skipIfStabilityAbove: 30,
};
```

---

## 2. Cold Start Strategy: "The Diagnostic Triple"

For users with no interaction history:

```typescript
interface ColdStartStrategy {
  // Fixed placement at 75% for first 3 sessions
  firstThreeSessions: {
    placementPercentage: 0.75;
    // Rotate interaction types to build baseline
    session1InteractionType: 'matching';
    session2InteractionType: 'sequencing';
    session3InteractionType: 'fill_in_blank';
  };

  // After 3 sessions, switch to AI-driven placement
  enableAIPlacement: boolean; // true after session 3
}
```

---

## 3. Improved Friction Formula

### FSRS Rating Derivation v2

```typescript
function deriveFSRSRating(result: SandboxEvaluationResult): FSRSRating {
  const { passed, attemptCount, hintsUsed, timeToCompleteMs, difficulty } = result;
  const baselineMs = calculateBaselineTime(result);
  const timeRatio = timeToCompleteMs / baselineMs;

  // Again (1): Clear lapse
  if (!passed || attemptCount > 3) {
    return 1;
  }

  // Hard (2): Struggled but succeeded
  // Changed: >1 hint OR (time >1.5x AND 0 hints)
  if (hintsUsed > 1 || (timeRatio > 1.5 && hintsUsed === 0)) {
    return 2;
  }

  // Easy (4): Only for low-difficulty cards
  // New: difficulty threshold check
  if (hintsUsed === 0 && timeRatio < 0.8 && difficulty < 5) {
    return 4;
  }

  // Good (3): Standard performance
  // New: Explicit criteria instead of default
  if (attemptCount <= 2 && timeRatio >= 0.8 && timeRatio <= 1.5) {
    return 3;
  }

  // Fallback to Hard if uncertain
  return 2;
}
```

---

## 4. Dual-Track Retention Measurement

### Short-term (24h)
```typescript
interface ShortTermRetentionCheck {
  // Use low-friction quiz card
  checkType: 'quiz' | 'fact_recall';
  conceptId: string;
  timeAfterSandbox: '24h';

  // Compare to baseline
  measureRetrieval: boolean;
}
```

### Long-term (7d)
```typescript
interface LongTermRetentionCheck {
  // Use DIFFERENT sandbox type for skill transfer
  checkType: 'sandbox';
  interactionType: SandboxInteractionType; // Different from original
  conceptId: string;
  timeAfterSandbox: '7d';

  // Measure skill transfer, not just recall
  measureTransfer: boolean;
}
```

### Retention Lift Calculation
```typescript
function calculateRetentionLift(
  userId: string,
  conceptId: string,
  sandboxResult: SandboxEvaluationResult,
  followUpResults: FollowUpResult[]
): RetentionLift {
  const shortTermResult = followUpResults.find(r => r.timeframe === '24h');
  const longTermResult = followUpResults.find(r => r.timeframe === '7d');

  // Compare to quiz-only baseline for this user
  const baseline = getUserQuizOnlyBaseline(userId);

  return {
    shortTermLift: shortTermResult ? shortTermResult.score - baseline.shortTerm : null,
    longTermLift: longTermResult ? longTermResult.score - baseline.longTerm : null,
    transferLift: longTermResult?.interactionType !== sandboxResult.interactionType
      ? longTermResult.score : null,
  };
}
```

---

## 5. Usefulness Tracking: (interactionType, cognitiveType) Pairs

```typescript
interface UsefulnessPair {
  interactionType: SandboxInteractionType; // matching, sequencing, fill_in_blank
  cognitiveType: CognitiveType; // declarative, procedural, conceptual, conditional

  // Per-pair metrics
  completionRate: number;
  avgRetentionLift: number;
  avgEngagementScore: number;
  sampleSize: number;

  // Composite usefulness
  usefulnessScore: number;
}

// Example insights:
// - User learns best with 'fill_in_blank' for 'declarative' (vocabulary)
// - User prefers 'sequencing' for 'procedural' (step-by-step)
// - User struggles with 'matching' for 'conceptual' (abstract)
```

---

## 6. Scaffold Progression Tied to FSRS

```typescript
function determineScaffoldLevel(
  conceptId: string,
  fsrsState: FSRSState
): ScaffoldLevel {
  const stabilityDays = fsrsState.stability;

  // Low stability = High scaffolding
  if (stabilityDays < 3) {
    return 'worked'; // Full guidance, hints visible
  }

  // Medium stability = Partial scaffolding
  if (stabilityDays >= 3 && stabilityDays <= 10) {
    return 'scaffold'; // Some hints, ghost outlines
  }

  // High stability = Faded scaffolding
  return 'faded'; // No hints, blank canvas
}

// Edge case: Lapse detection
function handleLapse(conceptId: string, rating: FSRSRating): void {
  if (rating === 1) { // "Again"
    // Immediately schedule high-scaffold sandbox
    scheduleRemediationSandbox(conceptId, 'worked');
  }
}
```

---

## 7. Edge Case Handling

### Bus Stop Scenario (Mid-Sandbox Exit)
```typescript
interface SandboxSessionState {
  interactionId: string;
  startedAt: Date;
  lastActivityAt: Date;
  currentState: Record<string, string[]>; // Element positions
  hintsUsed: number;
  attemptCount: number;
}

function handleSandboxResume(savedState: SandboxSessionState): ResumeAction {
  const hoursSinceActivity = getHoursSince(savedState.lastActivityAt);

  if (hoursSinceActivity < 1) {
    // Resume where they left off
    return { action: 'resume', state: savedState };
  } else {
    // Context loss - treat as Hard/Again
    return {
      action: 'restart',
      rating: hoursSinceActivity < 24 ? 2 : 1, // Hard or Again
    };
  }
}
```

### Over-Learning Prevention
```typescript
function shouldSkipSandbox(
  conceptId: string,
  fsrsState: FSRSState
): boolean {
  // Skip if stability is very high (mastered)
  if (fsrsState.stability > 30) {
    return true;
  }

  // Skip if recent sandbox on same concept (< 3 days)
  const lastSandbox = getLastSandboxForConcept(conceptId);
  if (lastSandbox && getDaysSince(lastSandbox) < 3) {
    return true;
  }

  return false;
}
```

### Sandbox Fatigue Prevention
```typescript
function checkSandboxFatigue(
  feedItems: FeedItem[],
  currentIndex: number
): boolean {
  const recentItems = feedItems.slice(
    Math.max(0, currentIndex - 8),
    currentIndex
  );

  const recentSandboxCount = recentItems.filter(
    item => item.type === 'sandbox'
  ).length;

  // Fatigue if any sandbox in last 8 items
  return recentSandboxCount > 0;
}
```

---

## 8. Complete User Flow (Updated)

```
[Start Learning]
       |
       v
[Prerequisites Check] (first session only)
       |
       v
[Initialize Feed Construction]
  - Check if cold start (< 3 sessions)
  - If cold start: use Diagnostic Triple strategy
  - If not: enable AI placement
       |
       v
[Build Feed Window-by-Window]
  |
  +-- Window 1 (items 1-5):
  |     - Apply cognitive warm-up rule (no sandbox)
  |     - Build content -> quiz -> content -> fact -> content
  |
  +-- Window 2+ (items 6+):
  |     - Call AI for placement decision
  |     - Check: fatigue, mastery, cooldown
  |     - If sandbox approved: extend/replace slot
  |     - Generate sandbox schema
  |
       |
       v
[User Swipes Through Feed]
  |
  +-> [Content Cards] -> passive consumption
  +-> [Quiz Cards] -> quick retrieval
  +-> [Sandbox Preview Card]
         |
         v
      [Tap "Start Interaction"]
         |
         v
      [Full-Screen Sandbox Modal]
        - Timer starts
        - Scaffold level based on FSRS
        - Save state every 10s (bus stop protection)
        - Submit answer
         |
         v
      [Evaluation]
        - Deterministic first
        - AI if text input
        - Derive FSRS rating (v2 formula)
        - Check for lapse -> trigger remediation
         |
         v
      [Close Modal -> Return to Feed]
  |
  +-> [More content...]
  +-> [Session Complete]
         |
         v
      [Schedule Follow-up]
        - 24h: Quiz card for short-term retention
        - 7d: Different sandbox type for transfer
         |
         v
      [Update Usefulness Scores]
        - Per (interactionType, cognitiveType) pair
        - Feed back to AI placement
```

---

## Open Questions for Gemini Round 2

1. **Window Size**: Is 5 items optimal, or should window size adapt based on content complexity?

2. **Lapse Remediation Timing**: When a lapse is detected, should remediation sandbox be immediate (same session) or scheduled for next session?

3. **Transfer Measurement**: For 7-day retention check with different interaction type, how do we isolate "transfer" vs "re-learning"?

4. **AI Confidence Threshold**: Is 0.6 the right threshold for fallback, or should it adapt based on user history?
