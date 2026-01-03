# Design: Learning Session UI

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    app/(auth)/learning.tsx                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              LearningSessionContext                      │ │
│  │  - currentItem: SessionItem                              │ │
│  │  - phase: 'question' | 'reveal' | 'followup'            │ │
│  │  - progress: { current, total }                         │ │
│  │  - responses: SessionResponse[]                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐  │
│  │                           ▼                           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            QuestionRenderer                      │  │  │
│  │  │  ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │  │  │
│  │  │  │ MCInput │ │TFInput │ │TextIn  │ │DragList │ │  │  │
│  │  │  └─────────┘ └────────┘ └────────┘ └─────────┘ │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                           │                           │  │
│  │                           ▼                           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            ConceptReveal                         │  │  │
│  │  │  - Correct/Incorrect banner                     │  │  │
│  │  │  - Concept definition                           │  │  │
│  │  │  - Pedagogical notes                           │  │  │
│  │  │  - Misconception (if triggered)                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. User clicks "Start Learning" on LearningAgendaCard
   └─> Navigate to /learning?projectId=xxx

2. LearningSessionScreen mounts
   └─> Fetch concepts for project (with sample_questions)
   └─> Build session via session-builder-service (interleaving)
   └─> Initialize LearningSessionContext

3. For each SessionItem:
   └─> If type='pretest' or type='new':
       └─> Select question via question-weighting-service
       └─> Display QuestionCard + appropriate input
       └─> On answer: Record response, show ConceptReveal
       └─> Optional follow-up question (if not pretest)
   └─> If type='review':
       └─> Delegate to existing review flow or inline

4. On session complete:
   └─> Navigate to /session-complete
   └─> Persist responses via session-response-service
   └─> Update mastery states
   └─> Show stats and next review preview
```

## Question Type Weighting

### Phase-Based Defaults
| Phase    | MC   | T/F  | Free-text | Interactive |
|----------|------|------|-----------|-------------|
| Pretest  | 100% | 0%   | 0%        | 0%          |
| Learning | 30%  | 10%  | 40%       | 20%         |
| Review   | 40%  | 10%  | 40%       | 10%         |

### Adaptive Adjustments
- Recent accuracy < 50% → +20% MC weight
- Mastery state SOLID+ → +20% application weight
- Cognitive capacity < 50% → +20% simple types
- Bloom level 'analyze'+ → +20% free-text weight

## Mobile Considerations

### Touch Targets
- All interactive elements: 56px minimum height
- MC options: Full-width buttons with 12px gap
- Drag handles: Left-aligned grip icon

### Keyboard Handling
- TextInput: Auto-scroll to keep input visible
- Submit button: Sticky above keyboard
- Max 4 lines for free-text (auto-expand)

### Gestures
- Swipe to continue (optional enhancement)
- Haptic feedback on selection

## State Machine

```
┌──────────┐    answer    ┌──────────┐   continue   ┌──────────┐
│ QUESTION │─────────────>│  REVEAL  │─────────────>│ FOLLOWUP │
└──────────┘              └──────────┘              └──────────┘
     ▲                                                    │
     │                                                    │
     └────────────────────────────────────────────────────┘
                        next item (or complete)
```

## Database Schema

### session_responses
```sql
CREATE TABLE session_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  misconception_triggered TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### misconception_log
```sql
CREATE TABLE misconception_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  misconception TEXT NOT NULL,
  triggered_count INTEGER DEFAULT 1,
  last_triggered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, concept_id, misconception)
);
```

## Error Handling

- No questions available → Show "Analysis incomplete" message
- Session builder fails → Fallback to review-only
- Response persistence fails → Queue for retry, don't block UI
- Navigation back during session → Confirm discard dialog
