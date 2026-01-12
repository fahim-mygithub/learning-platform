# Sandbox Feed Integration - Design Draft v1

## Overview

Integrate interactive sandbox activities into the TikTok-style learning feed with AI-driven placement decisions and hybrid usefulness scoring.

**Key Decisions:**
- Placement: AI real-time decision during feed construction
- Usefulness: Hybrid (FSRS retention + engagement metrics)
- Minimum: At least one sandbox per session

---

## 1. Feed Construction Flow

### Current State
```
User clicks "Start Learning"
  -> Check prerequisites (first session only)
  -> Build feed: content -> quiz -> content -> fact -> synthesis (every 5 items)
  -> User swipes through feed
  -> Session complete
```

### Proposed State
```
User clicks "Start Learning"
  -> Check prerequisites (first session only)
  -> AI Feed Construction Phase:
     1. Analyze source content + user history
     2. Identify sandbox placement opportunities
     3. Generate sandbox schemas for chosen placements
     4. Build feed with sandbox items interleaved
  -> User swipes through feed (sandbox opens as modal)
  -> AI evaluates sandbox performance
  -> Update usefulness scores
  -> Session complete
```

---

## 2. AI Placement Decision System

### Input Context for LLM
```typescript
interface SandboxPlacementContext {
  // Content analysis
  concepts: ConceptWithAnalysis[];
  conceptRelationships: ConceptEdge[];

  // User history
  userMasteryStates: Map<string, MasteryState>;
  previousSandboxPerformance: SandboxPerformanceHistory[];
  preferredInteractionTypes: InteractionTypePreference[];

  // Session constraints
  sessionLength: number; // estimated items
  targetSandboxCount: { min: 1, max: 3 };
}

interface SandboxPlacementDecision {
  // Where to insert (after which feed item index)
  insertAfterIndex: number;

  // Which concepts to test
  conceptIds: string[];

  // Recommended interaction type
  interactionType: SandboxInteractionType;

  // Reasoning (for debugging/transparency)
  reasoning: string;

  // Confidence score
  confidence: number; // 0.0-1.0
}
```

### Placement Heuristics (LLM Guidelines)
The AI should consider:

1. **Concept Accumulation**: Insert sandbox when 3+ related concepts have been covered
2. **Cognitive Type Fit**: Prefer sandbox for procedural/conditional concepts over pure factual
3. **Session Pacing**: Place sandbox at ~60-80% completion (after enough context, before fatigue)
4. **User History**: If user struggled with a concept, sandbox provides alternative retrieval practice
5. **Interaction Variety**: Don't repeat same interaction type if user recently did one

### Fallback Rule
If AI confidence < 0.6 or API fails:
- Insert one sandbox after the final synthesis phase
- Use the most complex concept from session
- Default to 'matching' interaction type

---

## 3. Sandbox Evaluation & Pass/Fail

### Deterministic Evaluation (Layer 1)
```typescript
interface DeterministicEvaluation {
  // For matching/fill-in-blank
  zoneAccuracy: number; // correct zones / total zones

  // For sequencing
  sequenceDistance: number; // Levenshtein-style edit distance

  // Composite score
  score: number; // 0.0-1.0
  passed: boolean; // score >= minCorrectPercentage
}
```

### AI Evaluation (Layer 2 - Text Inputs Only)
```typescript
interface AIEvaluation {
  semanticAccuracy: number; // 0.0-1.0
  misconceptionDetected?: string;
  feedback: string;
}
```

### FSRS Rating Derivation (Friction Formula)
```typescript
function deriveFSRSRating(result: SandboxEvaluationResult): FSRSRating {
  const { passed, attemptCount, hintsUsed, timeToCompleteMs } = result;
  const baselineMs = calculateBaselineTime(result.interactionType, result.elementCount);
  const timeRatio = timeToCompleteMs / baselineMs;

  // Rating table
  if (!passed || attemptCount > 3) return 1; // Again
  if (hintsUsed > 1 || timeRatio > 2.0) return 2; // Hard
  if (hintsUsed === 0 && timeRatio < 0.8) return 4; // Easy
  return 3; // Good
}
```

---

## 4. Usefulness Scoring System

### Hybrid Score Components

#### A. FSRS Retention Signal (60% weight)
Track concepts practiced via sandbox vs quiz-only:
```typescript
interface RetentionComparison {
  conceptId: string;
  sandboxReviewRetention: number; // % correct on subsequent reviews
  quizOnlyRetention: number; // baseline
  retentionLift: number; // sandbox - quizOnly
}
```

#### B. Engagement Metrics (40% weight)
```typescript
interface EngagementMetrics {
  completionRate: number; // completed / started
  averageTimeRatio: number; // actual / baseline
  hintUsageRate: number; // avg hints per interaction
  repeatAttemptRate: number; // users who retry after failure
}
```

### Usefulness Score Calculation
```typescript
interface InteractionTypeUsefulness {
  interactionType: SandboxInteractionType;
  cognitiveType: CognitiveType;

  // Component scores
  retentionLift: number; // -1.0 to +1.0
  engagementScore: number; // 0.0 to 1.0

  // Composite
  usefulnessScore: number; // weighted combination
  sampleSize: number; // statistical confidence
}

function calculateUsefulness(type: InteractionTypeUsefulness): number {
  const retentionWeight = 0.6;
  const engagementWeight = 0.4;

  // Normalize retention lift to 0-1 scale
  const normalizedRetention = (type.retentionLift + 1) / 2;

  return (normalizedRetention * retentionWeight) +
         (type.engagementScore * engagementWeight);
}
```

### Feedback Loop
```
Session Complete
  -> Record sandbox results + FSRS rating
  -> On subsequent reviews of same concept:
     -> Compare retention to quiz-only baseline
     -> Update interactionType usefulness score
  -> AI uses updated scores for future placement decisions
```

---

## 5. Complete User Flow

### Flow Diagram
```
[Start Learning Button]
       |
       v
[Prerequisites Check] (first session only)
       |
       v
[AI Feed Construction]
  - Analyze content + user history
  - Decide sandbox placements (min 1, max 3)
  - Generate sandbox schemas
  - Build interleaved feed
       |
       v
[Feed Experience]
  |
  +-> [Video Chunk] -> swipe
  +-> [Quiz Card] -> answer -> swipe
  +-> [Video Chunk] -> swipe
  +-> [Sandbox Preview Card]
         |
         v
      [Tap "Start Interaction"]
         |
         v
      [Full-Screen Sandbox Modal]
        - Timer running
        - Drag/drop elements
        - Request hints (tracked)
        - Submit answer
         |
         v
      [Evaluation]
        - Deterministic check first
        - AI check if needed
        - Show feedback
        - Award XP
         |
         v
      [Close Modal -> Return to Feed]
  |
  +-> [More content...]
  +-> [Synthesis Phase]
  +-> [Session Complete Card]
         |
         v
      [Update Usefulness Scores]
      [Record FSRS ratings]
```

---

## 6. Database Schema Additions

### sandbox_results Table
```sql
CREATE TABLE sandbox_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source_id UUID NOT NULL REFERENCES sources(id),
  concept_id UUID NOT NULL REFERENCES concepts(id),
  interaction_type sandbox_interaction_type NOT NULL,

  -- Performance
  score DECIMAL(3,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  attempt_count INTEGER NOT NULL,
  hints_used INTEGER NOT NULL,
  time_to_complete_ms INTEGER NOT NULL,

  -- FSRS
  fsrs_rating INTEGER NOT NULL CHECK (fsrs_rating BETWEEN 1 AND 4),

  -- Metadata
  scaffold_level scaffold_level NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### interaction_type_usefulness Table
```sql
CREATE TABLE interaction_type_usefulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  interaction_type sandbox_interaction_type NOT NULL,
  cognitive_type cognitive_type NOT NULL,

  -- Aggregated metrics
  total_attempts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  avg_retention_lift DECIMAL(4,3) DEFAULT 0,
  avg_engagement_score DECIMAL(4,3) DEFAULT 0,
  usefulness_score DECIMAL(4,3) DEFAULT 0,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, interaction_type, cognitive_type)
);
```

---

## 7. Service Architecture

### New Services
```typescript
// 1. Sandbox Placement Service
interface SandboxPlacementService {
  decidePlacements(context: SandboxPlacementContext): Promise<SandboxPlacementDecision[]>;
}

// 2. Sandbox Generation Service
interface SandboxGenerationService {
  generateInteraction(
    concepts: Concept[],
    interactionType: SandboxInteractionType,
    scaffoldLevel: ScaffoldLevel
  ): Promise<SandboxInteraction>;
}

// 3. Sandbox Usefulness Service
interface SandboxUsefulnessService {
  recordResult(result: SandboxEvaluationResult): Promise<void>;
  updateRetentionMetrics(userId: string, conceptId: string, quizResult: QuizResult): Promise<void>;
  getUsefulnessScores(userId: string): Promise<InteractionTypeUsefulness[]>;
}
```

### Modified Services
- `FeedBuilderService`: Add sandbox placement integration
- `FeedContext`: Already updated with sandbox modal state
- `SpacedRepetitionService`: Add sandbox FSRS recording

---

## 8. Open Questions for Gemini Review

1. **AI Cost**: Each placement decision requires LLM call. Should we batch all decisions in one call, or make decisions incrementally as feed builds?

2. **Cold Start**: For new users with no history, what default placement strategy?

3. **Retention Measurement**: How long should we wait before measuring retention lift? 1 day? 1 week?

4. **Usefulness Granularity**: Should usefulness be tracked per (interactionType, cognitiveType) pair, or just interactionType?

5. **Scaffold Progression**: Should scaffold level (worked/scaffold/faded) be tied to FSRS state automatically?

---

## Summary

This design integrates sandbox activities into the learning feed with:
- AI-driven placement decisions based on content + user history
- Hybrid usefulness scoring (retention + engagement)
- Minimum one sandbox per session
- Full evaluation pipeline with FSRS integration
- Feedback loop for continuous improvement
