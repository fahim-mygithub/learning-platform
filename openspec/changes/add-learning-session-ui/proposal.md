# Change: Add Learning Session UI

## Why

Users can access the learning platform and view analyzed content, but there is no screen to actually **learn new concepts**. The existing `review.tsx` handles FSRS-based reviews (reveal + rate), but new concept introduction with pretesting, concept reveals, and mixed question types is missing.

Research supports:
- **Pretesting Effect (d=1.1)**: Showing questions before concept reveal creates desirable difficulty
- **Desirable Difficulty (d=0.8)**: Mixed question types force active engagement
- **Immediate Feedback (d=0.73)**: Instant right/wrong with explanation improves learning
- **Misconception Correction (d=0.95)**: Explicit misconception addressing prevents entrenchment

## What Changes

### Learning Session Screen (NEW)
- **NEW**: `app/(auth)/learning.tsx` - Main learning session screen
- **NEW**: Question-First flow: Show question → Answer → Reveal concept
- **NEW**: Progress and cognitive load indicators
- **NEW**: Session item progression (interleaved review/new/pretest)

### Question Components (NEW)
- **NEW**: `QuestionCard` - Display question text
- **NEW**: `MCInput` - Multiple choice input (56px touch targets)
- **NEW**: `TFInput` - True/False input
- **NEW**: `TextInput` - Free-text input with keyboard handling
- **NEW**: `DragList` - Sequence/ordering input
- **NEW**: `QuestionRenderer` - Routes to appropriate input type
- **NEW**: `ConceptReveal` - Post-answer concept explanation

### Question Weighting Service (NEW)
- **NEW**: Phase-based weighting (Pretest=100% MC, Learning=mixed)
- **NEW**: Adaptive adjustments based on accuracy/mastery/capacity
- **NEW**: Question type selection algorithm

### Session Response Tracking (NEW)
- **NEW**: `session_responses` table for answer persistence
- **NEW**: `misconception_log` table for pattern detection
- **NEW**: Response service for mastery state updates

### Session Completion (NEW)
- **NEW**: `app/(auth)/session-complete.tsx` - Stats and mastery updates
- **NEW**: Next review preview

### Integration (MODIFIED)
- **MODIFIED**: LearningAgendaCard wires "Start Learning" button
- **MODIFIED**: Project detail navigation to learning screen

## Impact

- Affected specs: NEW `learning-session-ui` capability
- Affected code:
  - `app/(auth)/learning.tsx` - Main learning screen
  - `app/(auth)/session-complete.tsx` - Completion screen
  - `src/components/question/*` - Question UI components
  - `src/lib/session/question-weighting-service.ts` - Type selection
  - `src/lib/session/session-response-service.ts` - Response persistence
  - `src/lib/learning-session-context.tsx` - React context
  - `src/components/learning-agenda/LearningAgendaCard.tsx` - Wire button
  - `supabase/migrations/010_learning_session_responses.sql`

## Dependencies

- Phase 4 (Session Construction) provides `session-builder-service.ts`, `SessionItem`, `SessionContext`
- Phase 2 (Content Analysis) provides `SampleQuestion` from three-pass analysis
- Phase 3 (Spaced Repetition) provides mastery states and FSRS review flow
