# Sandbox Feed Integration - Final Proposal

## Collaborative Review: Claude + Gemini (January 2026)

**Status:** Ready for Implementation
**Gemini Verdict:** "The integration of FSRS as a friction/scaffold driver rather than just a 'next review date' calculator puts this platform in the top 1% of adaptive learning architectures."

---

## Executive Summary

This proposal defines how interactive sandbox activities integrate into the TikTok-style learning feed, including:
- AI-driven placement decisions (window-based)
- FSRS-integrated evaluation with Friction Formula
- Hybrid usefulness scoring (retention + engagement)
- Complete user flow from "Start Learning" to session end

---

## 1. Feed Construction Architecture

### 1.1 Window-Based AI Placement

Instead of batching all placement decisions, use incremental window-based calls (5 items per window).

```typescript
interface FeedWindow {
  windowIndex: number;
  items: FeedItem[];
  conceptsCovered: string[];
  recentPerformance: PerformanceContext;
  lastSandboxIndex: number | null;
}

interface SandboxPlacementDecision {
  shouldInsertSandbox: boolean;
  insertAtPosition: number;
  replaceItemType: 'fact' | 'quiz' | 'extend';
  conceptIds: string[];
  interactionType: SandboxInteractionType;
  confidence: number;
  reasoning: string;
}
```

### 1.2 Cognitive Budget System (Gemini R2)

Instead of adapting window size, vary sandbox density:

```typescript
const COGNITIVE_BUDGET = {
  perWindow: 10,
  weights: {
    fact: 1,
    content: 1,
    quiz: 2,
    sandbox: 5,
  },
};

function calculateWindowBudget(items: FeedItem[]): number {
  return items.reduce((sum, item) =>
    sum + COGNITIVE_BUDGET.weights[item.type] || 1, 0);
}
```

### 1.3 Placement Rules

```typescript
const PLACEMENT_RULES = {
  // Cognitive Warm-up: No sandbox in first 3 items
  minWarmupItems: 3,

  // Sandbox Fatigue: 8-item cooldown
  minItemsBetweenSandboxes: 8,

  // Optimal placement (% of session)
  optimalPlacementRange: { min: 0.60, max: 0.85 },

  // Per-session limits
  minSandboxesPerSession: 1,
  maxSandboxesPerSession: 3,

  // Over-learning skip threshold
  skipIfRetrievabilityAbove: 0.9,
};
```

### 1.4 Adaptive AI Confidence Threshold (Gemini R2)

```typescript
function getConfidenceThreshold(sessionVelocity: SessionVelocity): number {
  // High velocity = user in flow state, can handle experiments
  if (sessionVelocity === 'high') return 0.4;

  // Low velocity = user struggling, stick to safe fallback
  if (sessionVelocity === 'low') return 0.8;

  // Normal velocity
  return 0.6;
}

type SessionVelocity = 'high' | 'normal' | 'low';

function calculateSessionVelocity(recentItems: CompletedItem[]): SessionVelocity {
  const avgTimeRatio = calculateAvgTimeRatio(recentItems);
  const avgScore = calculateAvgScore(recentItems);

  if (avgTimeRatio < 0.8 && avgScore > 0.8) return 'high';
  if (avgTimeRatio > 1.5 || avgScore < 0.5) return 'low';
  return 'normal';
}
```

---

## 2. Cold Start Strategy: "The Diagnostic Triple"

For users with < 3 sessions of history:

```typescript
interface ColdStartConfig {
  // Fixed placement at 75% of session
  placementPercentage: 0.75;

  // Rotate interaction types to build baseline
  // Ordered by cognitive load (Gemini recommendation)
  sessionInteractionTypes: [
    'matching',      // Session 1: Recognition (Low Load)
    'fill_in_blank', // Session 2: Cued Recall (Medium Load)
    'sequencing',    // Session 3: Procedural Logic (High Load)
  ];
}
```

**Data Goal:** This reveals the user's "Effort Tolerance" profile from day one.

---

## 3. Improved Friction Formula (FSRS Rating)

### 3.1 Rating Derivation v3

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
  // Gemini R1: Changed from >2x to >1.5x AND 0 hints
  if (hintsUsed > 1 || (timeRatio > 1.5 && hintsUsed === 0)) {
    return 2;
  }

  // Easy (4): Only for low-difficulty cards
  if (hintsUsed === 0 && timeRatio < 0.8 && difficulty < 5) {
    return 4;
  }

  // Good (3): Explicit criteria (not default)
  if (attemptCount <= 2 && timeRatio >= 0.8 && timeRatio <= 1.5) {
    return 3;
  }

  // Fallback to Hard if uncertain
  return 2;
}
```

### 3.2 Baseline Time Calculation

```typescript
function calculateBaselineTime(interaction: SandboxInteraction): number {
  const elementCount = interaction.elements.filter(e => e.draggable).length;
  const instructionWords = interaction.instructions.split(/\s+/).length;
  const hintWords = interaction.hints.reduce(
    (sum, hint) => sum + hint.split(/\s+/).length, 0
  );

  // Formula: (elements * 3.5s) + (words / 3 * 1s)
  return (elementCount * 3500) + ((instructionWords + hintWords) / 3 * 1000);
}
```

---

## 4. Scaffold Progression (Tied to FSRS Retrievability)

### 4.1 Retrievability-Based Scaffolding (Gemini R2 Fix)

**Important:** Use Retrievability (R), not Stability (S).
Stability = how fast they forget; Retrievability = how much they remember NOW.

```typescript
function determineScaffoldLevel(
  conceptId: string,
  fsrsState: FSRSState
): ScaffoldLevel {
  // Calculate current retrievability
  const R = calculateRetrievability(fsrsState);

  // High retrievability = Challenge them
  if (R > 0.9) {
    return 'faded'; // No hints, blank canvas
  }

  // Medium retrievability = Some support
  if (R >= 0.7 && R <= 0.9) {
    return 'scaffold'; // Ghost outlines, some hints
  }

  // Low retrievability = Full guidance
  return 'worked'; // Step-by-step, hints visible
}

function calculateRetrievability(fsrsState: FSRSState): number {
  const { stability, lastReviewDate } = fsrsState;
  const daysSinceReview = getDaysSince(lastReviewDate);

  // FSRS retrievability formula: R = e^(-t/S)
  return Math.exp(-daysSinceReview / stability);
}
```

### 4.2 Lapse Detection & Remediation

```typescript
function handleLapse(
  conceptId: string,
  rating: FSRSRating,
  currentIndex: number
): RemediationAction {
  if (rating !== 1) return null; // Not a lapse

  // Gemini R2: Buffer remediation (N+2 or N+3)
  // Not immediate - allows interleaving for stronger encoding
  return {
    action: 'schedule_remediation',
    insertAtIndex: currentIndex + 2 + Math.floor(Math.random()), // +2 or +3
    scaffoldLevel: 'worked', // High support
    interactionType: 'different', // Use different type for transfer
  };
}
```

---

## 5. Dual-Track Retention Measurement

### 5.1 Short-term (24h)
```typescript
interface ShortTermCheck {
  timeframe: '24h';
  method: 'quiz' | 'fact_recall';
  conceptId: string;
  metric: 'retrieval_accuracy';
}
```

### 5.2 Long-term (7d) - Transfer Measurement

```typescript
interface LongTermCheck {
  timeframe: '7d';
  method: 'sandbox';
  interactionType: SandboxInteractionType; // DIFFERENT from original
  conceptId: string;
  metric: 'transfer_lift';
}

// Gemini R2: Isolate transfer vs re-learning
function calculateTransferLift(
  userId: string,
  conceptId: string,
  typeBResult: SandboxResult
): TransferLift {
  // Compare against global baseline for first-timers on Type B
  const globalBaseline = getGlobalBaselineForInteractionType(
    typeBResult.interactionType
  );

  // If user solves Type B faster than first-timers, despite only
  // having done Type A for this concept, that's transfer
  const latencyRatio = typeBResult.firstActionLatency / globalBaseline.avgLatency;

  return {
    isTransfer: latencyRatio < 0.8, // 20%+ faster = transfer
    transferScore: 1 - latencyRatio,
  };
}
```

---

## 6. Usefulness Scoring System

### 6.1 Per-Pair Tracking

Track usefulness per `(interactionType, cognitiveType)` pair:

```typescript
interface UsefulnessPair {
  interactionType: SandboxInteractionType;
  cognitiveType: CognitiveType;

  // Retention component (60% weight)
  shortTermRetention: number; // 24h
  longTermRetention: number;  // 7d
  transferLift: number;

  // Engagement component (40% weight)
  completionRate: number;
  avgTimeRatio: number;
  hintUsageRate: number;

  // Composite
  usefulnessScore: number;
  sampleSize: number;
}
```

### 6.2 Placement Quality Score (Gemini R2)

Feed back to AI for self-correction:

```typescript
interface PlacementQuality {
  placementIndex: number;
  qualityScore: number; // (completionRate * fsrsGrade) / timeRatio
  wasSuccess: boolean;
}

function calculatePlacementQuality(result: SandboxResult): number {
  return (result.completionRate * result.fsrsRating) / result.timeRatio;
}

// Include in AI prompt:
// "Last 5 placements: [Success, Success, Failure, Success, Success]"
```

---

## 7. Edge Case Handling

### 7.1 Bus Stop vs Bounce Detection (Gemini R2)

```typescript
interface AbandonmentAnalysis {
  timeOnTask: number;
  progressMade: number; // 0-1
  exitType: 'bus_stop' | 'bounce' | 'completion';
}

function analyzeAbandonment(session: SandboxSession): AbandonmentAnalysis {
  const { startTime, lastActivityTime, progressPercentage } = session;
  const timeOnTask = lastActivityTime - startTime;

  // < 10 seconds: External interruption (bus stop)
  if (timeOnTask < 10000) {
    return { timeOnTask, progressMade: progressPercentage, exitType: 'bus_stop' };
  }

  // > 40 seconds + 0 progress: Cognitive overload (bounce)
  if (timeOnTask > 40000 && progressPercentage < 0.1) {
    return { timeOnTask, progressMade: progressPercentage, exitType: 'bounce' };
  }

  // Otherwise: Normal exit
  return { timeOnTask, progressMade: progressPercentage, exitType: 'bus_stop' };
}

function handleAbandonment(analysis: AbandonmentAnalysis): void {
  if (analysis.exitType === 'bounce') {
    // Downgrade difficulty/scaffold for next session
    scheduleEasierSandbox();
  }
}
```

### 7.2 Resume Window

```typescript
const RESUME_CONFIG = {
  // Resume if return within 1 hour
  resumeWindowMs: 60 * 60 * 1000,

  // After 1 hour: context loss
  contextLossRating: 2, // Hard

  // After 24 hours: treat as lapse
  lapseThresholdMs: 24 * 60 * 60 * 1000,
};
```

### 7.3 Sandbox Fatigue Prevention

```typescript
function checkSandboxFatigue(
  feedItems: FeedItem[],
  currentIndex: number
): boolean {
  const lookbackWindow = 8;
  const recentItems = feedItems.slice(
    Math.max(0, currentIndex - lookbackWindow),
    currentIndex
  );

  return recentItems.some(item => item.type === 'sandbox');
}
```

---

## 8. Visual Micro-Transitions (Gemini R2)

Add a transition card before sandbox to reset user's mindset:

```typescript
interface TransitionCard {
  type: 'transition';
  duration: 1500; // 1.5 seconds
  message: 'Apply what you just learned';
  animation: 'fade_scale';
}

// Insert before sandbox preview card
function insertTransitionCard(
  feedItems: FeedItem[],
  sandboxIndex: number
): FeedItem[] {
  const transitionCard: TransitionCard = {
    type: 'transition',
    duration: 1500,
    message: 'Apply what you just learned',
    animation: 'fade_scale',
  };

  return [
    ...feedItems.slice(0, sandboxIndex),
    transitionCard,
    ...feedItems.slice(sandboxIndex),
  ];
}
```

---

## 9. Complete User Flow

```
[Start Learning]
       |
       v
[Prerequisites Check] (first session only)
       |
       v
[Initialize Feed Construction]
  - Check session count
  - If < 3 sessions: Use Diagnostic Triple (cold start)
  - If >= 3 sessions: Enable AI placement
       |
       v
[Build Feed Window-by-Window]
  |
  +-- Window 1 (items 1-5):
  |     - Apply cognitive warm-up (no sandbox)
  |     - Build: content -> quiz -> content -> fact -> content
  |
  +-- Window 2+ (items 6+):
  |     - Calculate session velocity
  |     - Get adaptive confidence threshold
  |     - Call AI for placement decision
  |     - Check: fatigue, retrievability, cooldown
  |     - If sandbox approved:
  |       - Insert transition card
  |       - Insert sandbox preview card
  |       - Generate sandbox schema
  |
       |
       v
[User Swipes Through Feed]
  |
  +-> [Content Cards] -> passive consumption
  +-> [Quiz Cards] -> quick retrieval
  +-> [Transition Card] -> "Apply what you just learned" (1.5s)
  +-> [Sandbox Preview Card]
         |
         v
      [Tap "Start Interaction"]
         |
         v
      [Full-Screen Sandbox Modal]
        - Timer starts
        - Scaffold based on Retrievability
        - Save state every 10s
        - Track hints, attempts
        - Submit answer
         |
         v
      [Evaluation]
        - Deterministic check
        - AI check (text only)
        - Derive FSRS rating (v3 formula)
        - Analyze abandonment if early exit
        - If lapse: schedule buffered remediation
         |
         v
      [Close Modal -> Return to Feed]
  |
  +-> [Buffered Remediation] (if lapse at N, insert at N+2/N+3)
  +-> [More content...]
  +-> [Session Complete]
         |
         v
      [Post-Session Processing]
        - Record FSRS ratings
        - Calculate placement quality scores
        - Schedule 24h retention check
        - Schedule 7d transfer check
        - Update usefulness scores per (type, cognitive) pair
```

---

## 10. Implementation Priority

### Phase 1: Core Integration
1. Window-based feed builder with sandbox slots
2. Placement rules (warm-up, fatigue, cooldown)
3. Transition card component
4. Basic FSRS rating derivation

### Phase 2: AI Placement
1. Placement decision service
2. Cognitive budget system
3. Adaptive confidence threshold
4. Cold start (Diagnostic Triple)

### Phase 3: Feedback Loop
1. Placement quality scoring
2. Usefulness tracking per pair
3. Dual-track retention measurement
4. Transfer lift calculation

### Phase 4: Edge Cases
1. Abandonment analysis (bus stop vs bounce)
2. Resume window handling
3. Buffered lapse remediation
4. Retrievability-based scaffolding

---

## Summary

This proposal provides a complete architecture for integrating interactive sandbox activities into the learning feed with:

- **AI-driven placement** with adaptive confidence thresholds
- **Cognitive budget system** for sandbox density
- **FSRS friction formula** for accurate rating derivation
- **Retrievability-based scaffolding** (not stability)
- **Dual-track retention** with transfer measurement
- **Comprehensive edge case handling**
- **Visual micro-transitions** for smooth UX

**Gemini Final Verdict:** Ready for Implementation.
