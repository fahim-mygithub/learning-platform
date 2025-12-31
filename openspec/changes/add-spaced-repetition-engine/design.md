# Design: Spaced Repetition Engine

## Context

Phase 3 builds on the content analysis pipeline (Phase 2) to add spaced repetition capabilities. The engine enables active learning through scientifically-grounded review scheduling.

The FSRS-5 algorithm was chosen as the industry's current best practice for spaced repetition scheduling, replacing older SM-2 implementations used by Anki and others.

## Goals / Non-Goals

**Goals:**
- Implement accurate FSRS-5 scheduling calculations
- Track mastery through defined states with clear transition criteria
- Surface due reviews prominently on home screen
- Support self-rating (Forgot/Hard/Good/Easy) after answer reveal
- Per-user-per-concept parameter tracking for personalization

**Non-Goals:**
- Question generation (Phase 5)
- Interactive sandbox (Phase 6)
- Sleep-aware scheduling (Phase 4)
- Review debt management UI (Phase 8)
- Full parameter optimization (future enhancement)

## Decisions

### Decision: FSRS-5 over SM-2

**Why**: FSRS-5 shows 10-15% better prediction accuracy in benchmarks
**Alternatives considered**:
- SM-2 (simpler but less accurate, used by Anki)
- Leitner system (too simplistic for personalization)
- Custom algorithm (no research foundation)

### Decision: Per-concept-per-user state tracking

**Why**: Different users learn different concepts at different rates; enables personalization
**Trade-off**: More database rows but necessary for accuracy

### Decision: 7-state machine (including MISCONCEIVED)

**Why**: Matches spec requirements, provides meaningful progression feedback
**States**: UNSEEN -> EXPOSED -> FRAGILE -> DEVELOPING -> SOLID -> MASTERED + MISCONCEIVED
**Trade-off**: More complex than simple "new/learning/review" but more informative

### Decision: Rating scale 1-4 (Again/Hard/Good/Easy)

**Why**: Standard FSRS rating scale, well-understood by users
**Alternative**: Binary pass/fail (less granular, worse scheduling)

## Database Schema

### concept_states table

Tracks mastery state and FSRS parameters per user per concept:

```sql
CREATE TABLE concept_states (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  concept_id UUID NOT NULL REFERENCES concepts(id),
  state VARCHAR(20) DEFAULT 'unseen',
  stability REAL DEFAULT 1.0,          -- FSRS stability in days
  difficulty REAL DEFAULT 0.3,         -- FSRS difficulty (0-1)
  due_date TIMESTAMPTZ,
  last_review_date TIMESTAMPTZ,
  successful_sessions INTEGER DEFAULT 0,
  consecutive_correct INTEGER DEFAULT 0,
  session_dates JSONB DEFAULT '[]',
  UNIQUE(user_id, concept_id)
);
```

### review_history table

Logs all reviews for analytics and parameter optimization:

```sql
CREATE TABLE review_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  concept_id UUID REFERENCES concepts(id),
  concept_state_id UUID REFERENCES concept_states(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 4),
  state_before VARCHAR(20),
  state_after VARCHAR(20),
  stability_before REAL,
  stability_after REAL,
  interval_days REAL,
  next_due_date TIMESTAMPTZ,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### fsrs_user_parameters table

Stores per-user FSRS weights for future optimization:

```sql
CREATE TABLE fsrs_user_parameters (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  w REAL[],                         -- 19 FSRS-5 weights
  desired_retention REAL DEFAULT 0.9,
  max_interval_days INTEGER DEFAULT 365
);
```

## Service Architecture

```
src/lib/
  |-- fsrs/
  |   |-- fsrs-types.ts           # TypeScript types
  |   |-- fsrs-algorithm.ts       # Pure FSRS-5 calculations
  |
  |-- spaced-repetition/
  |   |-- state-types.ts          # State machine types
  |   |-- concept-state-machine.ts # State transitions
  |   |-- review-queue.ts         # Due item queries
  |   |-- spaced-repetition-service.ts # Orchestration
  |
  |-- review-context.tsx          # React context
```

## State Machine Transitions

```
UNSEEN ─────────> EXPOSED (first exposure)
                     │
                     v
                  FRAGILE (successful review)
                     │
                     v
                DEVELOPING (2+ sessions on different days)
                     │
                     v
                   SOLID (3+ sessions on different days)
                     │
                     v
                  MASTERED (fast + correct + transfer)

Any state ────> MISCONCEIVED (confident wrong answer)
SOLID/DEVELOPING <──── FRAGILE (on failure, regression)
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| FSRS calculations may be slow | Medium | Cache preview intervals, use default params initially |
| State machine confusion | Low | Clear color coding, tooltips, simple labels |
| Large review queues | Medium | Pagination, efficient database indexes |
| Parameter drift | Low | Use sensible defaults, add optimization later |

## Migration Plan

1. Deploy migration 004 (additive, no breaking changes)
2. Deploy service code (new capabilities only)
3. Deploy UI updates
4. No rollback needed (additive changes only)
