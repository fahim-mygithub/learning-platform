# Sandbox Feed Integration - Final Proposal

## Collaborative Review: Claude + Gemini Flash + Gemini 3 Pro (January 2026)

**Status:** Ready for Implementation
**Gemini Flash Verdict:** "The integration of FSRS as a friction/scaffold driver rather than just a 'next review date' calculator puts this platform in the top 1% of adaptive learning architectures."
**Gemini 3 Pro Verdict:** "Designing a 'TikTok for Learning' that moves beyond passive consumption to active construction requires rigorous architectural and pedagogical choices. This architecture synthesizes modern reactive UI patterns, cognitive load theory, and learning analytics."

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

## 10. Architectural Deep-Dive (Gemini 3 Pro)

### 10.1 Race Condition Pattern: Optimistic Placeholder & Late-Binding

```typescript
/**
 * Pattern: Treat feed as doubly-linked list of "slots", not array of content.
 * This decouples visual stability from content readiness.
 */
interface FeedSlot {
  windowId: string; // Unique key for late-binding
  type: 'content' | 'quiz' | 'sandbox_placeholder' | 'sandbox_ready';
  content: FeedItem | null;
  generationPromise?: Promise<SandboxInteraction>;
}

function handleSandboxGeneration(
  windowId: string,
  currentUserPosition: number
): void {
  // 1. Immediately render placeholder
  renderPlaceholder(windowId, 'Preparing Challenge...');

  // 2. Dispatch async generation
  const promise = generateSandbox(windowId);

  // 3. Late-bind by WindowID, not array index
  promise.then(sandbox => {
    const userNow = getCurrentUserPosition();

    // Race Guard: If user scrolled past WindowID + 2, discard heavy payload
    if (userNow > getWindowIndex(windowId) + 2) {
      cacheForScrollBack(windowId, sandbox);
      return;
    }

    hydrateSlot(windowId, sandbox);
  });
}
```

### 10.2 Latency Budget: N+2 Prefetch Rule

```typescript
/**
 * You cannot generate on-demand. Must prefetch.
 * Scroll swipe budget: <300ms. LLM latency: 1-3s.
 */
const PREFETCH_RULES = {
  // If user is viewing Item N:
  itemNPlus1: 'fully_rendered_hydrated',  // Ready to display
  itemNPlus2: 'asset_loaded_schema_parsed', // Pre-parsed
  itemNPlus3: 'ai_generation_initiated',    // Request in flight
};

function triggerPrefetch(currentIndex: number, dwellTimeMs: number): void {
  // Trigger AI generation when user engages (>2s dwell time)
  if (dwellTimeMs > 2000) {
    initiateGeneration(currentIndex + 3);
  }
}

function handleSpeedScrolling(nextIndex: number): FeedItem {
  // Fallback: If user scrolls faster than generation,
  // inject cached high-quality static quiz to maintain flow
  if (!isReady(nextIndex)) {
    return getCachedFallbackQuiz();
  }
  return getItem(nextIndex);
}
```

### 10.3 A/B Testing: Skill Transfer Efficiency (STE)

```typescript
/**
 * Standard retention is insufficient. Users might return because
 * it's "fun" (gaming), not because they learned.
 *
 * The Validator Metric: Novel Transfer Task
 */
interface SkillTransferTest {
  // Training phase
  groupA: 'quiz_only';
  groupB: 'sandbox';
  concept: string;

  // Test phase (24h later)
  testType: 'novel_transfer_task'; // Unlike training, same principle

  // Success: If Group B performs significantly better on Novel Task,
  // sandbox built a transferable schema. If equal, it's edu-tainment.
}

interface TransferExperimentDesign {
  // Time-Matched Active Control
  treatment: { duration: '10_min', type: 'sandbox_interaction' };
  control: { duration: '10_min', type: 'active_reading' }; // Button press to continue

  // Any difference = interaction modality, not exposure time
  metric: 'day7_novel_task_performance';
}
```

### 10.4 Session Velocity: Velocity/Accuracy Matrix (Gemini 3 Pro)

```typescript
/**
 * 4-zone matrix for detecting user behavior patterns.
 * Uses rolling median to flag anomalies.
 */
type UserBehaviorZone = 'gamer' | 'guesser' | 'struggler' | 'learner';

interface VelocityAccuracyMatrix {
  // The Gamer: Fast + Inaccurate
  gamer: {
    criteria: { time: '< P10', accuracy: '< 20%' };
    response: 'cooldown'; // Forced 10s explainer video
  };

  // The Guess-er: Fast + Accurate
  guesser: {
    criteria: { time: '< P10', accuracy: '> 80%' };
    response: 'promotion'; // Skip priming, jump to Hard Sandbox
  };

  // The Struggler: Slow + Inaccurate
  struggler: {
    criteria: { time: '> P90', accuracy: '< 20%' };
    response: 'scaffold'; // Inject hint card, break into simpler steps
  };

  // The Learner: Slow + Accurate (ideal state)
  learner: {
    criteria: { time: '> P50', accuracy: '> 80%' };
    response: 'baseline'; // No intervention
  };
}

function detectBehaviorZone(recentItems: CompletedItem[]): UserBehaviorZone {
  const medianTime = calculateRollingMedian(recentItems, 5);
  const userTime = recentItems[recentItems.length - 1].timeMs;
  const accuracy = calculateAccuracy(recentItems);

  const isFast = userTime < medianTime * 0.3;
  const isAccurate = accuracy > 0.8;

  if (isFast && !isAccurate) return 'gamer';
  if (isFast && isAccurate) return 'guesser';
  if (!isFast && !isAccurate) return 'struggler';
  return 'learner';
}
```

### 10.5 Database Optimization (Gemini 3 Pro)

```sql
-- Composite B-Tree index for usefulness queries
CREATE INDEX idx_usefulness_lookup
ON sandbox_results (interaction_type, cognitive_type, score);

-- Materialized view for read-heavy ranking (update hourly)
CREATE MATERIALIZED VIEW usefulness_rankings AS
SELECT
  interaction_type,
  cognitive_type,
  AVG(retention_lift) as avg_retention_lift,
  COUNT(*) as sample_size
FROM sandbox_results
GROUP BY interaction_type, cognitive_type;

-- Refresh strategy: async, not on every write
-- REFRESH MATERIALIZED VIEW CONCURRENTLY usefulness_rankings;
```

### 10.6 Cognitive Load Validation (Gemini 3 Pro)

```typescript
/**
 * Working memory capacity: ~4 chunks
 * Sandbox consumes all 4 chunks (high intrinsic load)
 *
 * Optimal 5-item window structure:
 * Items 1-3: Priming (low load, passive) → Builds mental model
 * Item 4: Bridging (simple active choice)
 * Item 5: Sandbox (high load, synthesis) → Applies model
 *
 * Risk: 1 per 2 items = Cognitive Depletion = "zombie scroll"
 */
const COGNITIVE_LOAD_STRUCTURE = {
  priming: { slots: [1, 2, 3], load: 'low' },
  bridging: { slots: [4], load: 'medium' },
  synthesis: { slots: [5], load: 'high' },
};
```

---

## 11. Implementation Priority

### Phase 1: Core Integration
1. Window-based feed builder with sandbox slots
2. Placement rules (warm-up, fatigue, cooldown)
3. Transition card component
4. Basic FSRS rating derivation

### Phase 2: AI Placement & Latency
1. Placement decision service
2. N+2 Prefetch system (Gemini 3 Pro)
3. Optimistic placeholder pattern (Gemini 3 Pro)
4. Cognitive budget system
5. Cold start (Diagnostic Triple)

### Phase 3: Feedback Loop
1. Placement quality scoring
2. Usefulness tracking per pair
3. Dual-track retention measurement
4. Skill Transfer Efficiency metric (Gemini 3 Pro)

### Phase 4: Edge Cases & Intelligence
1. Abandonment analysis (bus stop vs bounce)
2. Resume window handling
3. Buffered lapse remediation
4. Retrievability-based scaffolding
5. Velocity/Accuracy Matrix (Gemini 3 Pro)

---

## 12. Summary

This proposal provides a complete architecture for integrating interactive sandbox activities into the learning feed with:

- **AI-driven placement** with adaptive confidence thresholds
- **Cognitive budget system** for sandbox density (validated by cognitive load theory)
- **FSRS friction formula** for accurate rating derivation
- **Retrievability-based scaffolding** (not stability)
- **Dual-track retention** with transfer measurement
- **Comprehensive edge case handling**
- **Visual micro-transitions** for smooth UX

**Gemini 3 Pro Additions:**
- **Race condition handling** via Optimistic Placeholder & Late-Binding pattern
- **N+2 Prefetch Rule** for latency budget management
- **Skill Transfer Efficiency (STE)** metric with Novel Transfer Task
- **Velocity/Accuracy Matrix** for detecting user behavior patterns (Gamer/Guesser/Struggler/Learner)
- **Database optimization** with composite indexes and materialized views
- **Cognitive load validation** confirming 1 sandbox per 5 items is optimal

**Final Verdict:** Ready for Implementation - rigorously validated by both Gemini Flash (pedagogical) and Gemini 3 Pro (architectural).
