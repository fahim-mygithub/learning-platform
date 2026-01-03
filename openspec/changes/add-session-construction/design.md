# Design: Session Construction with Prerequisite Assessment

## Overview

This design documents the architecture for Phase 4, which introduces two interconnected systems: **Prerequisite Assessment** and **Session Construction**. Together, they ensure learners have foundational knowledge and receive optimally constructed learning sessions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Analysis Pipeline                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Pass 2     │───▶│ Prereq       │───▶│ Prerequisites    │   │
│  │ Concepts     │    │ Detection    │    │ + AI Inference   │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Prerequisite Assessment                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Pretest     │───▶│   Gap        │───▶│  Mini-Lesson     │   │
│  │  Generator   │    │  Scoring     │    │  Generator       │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│                              │                     │             │
│                              ▼                     ▼             │
│                    ┌──────────────────────────────────────┐     │
│                    │    Prerequisite Roadmap Builder      │     │
│                    └──────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Session Construction                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Cognitive   │───▶│   Session    │───▶│  Sleep-Aware     │   │
│  │  Load Calc   │    │   Builder    │    │  Scheduler       │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Prerequisite Detection Service

**Input**: Concept list from Pass 2 analysis
**Output**: List of prerequisites with sources

```typescript
interface Prerequisite {
  id: string;
  project_id: string;
  name: string;
  description: string;
  source: 'mentioned_only' | 'ai_inferred';
  confidence: number; // 0-1
  domain: string; // e.g., "mathematics", "programming"
  created_at: string;
}
```

**Detection Strategy**:
1. Extract `mentioned_only` concepts from Pass 2 (concepts referenced but not explained)
2. Call AI to infer additional domain prerequisites based on main concepts
3. Deduplicate and merge by semantic similarity
4. Assign confidence scores based on frequency and AI certainty

### 2. Pretest Question Generator

**Input**: List of prerequisites
**Output**: Multiple-choice questions per prerequisite

```typescript
interface PretestQuestion {
  id: string;
  prerequisite_id: string;
  question_text: string;
  options: string[]; // 4 options
  correct_index: number;
  explanation: string;
  difficulty: 'basic' | 'intermediate';
  created_at: string;
}
```

**Generation Strategy**:
- Generate 2-3 questions per prerequisite
- Mix difficulty levels (60% basic, 40% intermediate)
- Include explanation for post-test learning

### 3. Gap Scoring Logic

**Input**: User responses to pretest
**Output**: List of knowledge gaps

```typescript
interface PrerequisiteGap {
  id: string;
  user_id: string;
  prerequisite_id: string;
  pretest_session_id: string;
  score: number; // 0-100
  gap_severity: 'none' | 'minor' | 'significant' | 'critical';
  questions_attempted: number;
  questions_correct: number;
  created_at: string;
}
```

**Scoring Thresholds**:
- 80-100%: No gap (proceed to main content)
- 60-79%: Minor gap (optional mini-lesson)
- 40-59%: Significant gap (recommended mini-lesson)
- 0-39%: Critical gap (required mini-lesson)

### 4. Mini-Lesson Generator

**Input**: Prerequisite with gap
**Output**: Self-contained mini-lesson

```typescript
interface MiniLesson {
  id: string;
  prerequisite_id: string;
  title: string;
  content_markdown: string; // 500-1000 words
  key_points: string[];
  practice_questions: PretestQuestion[];
  estimated_minutes: number;
  created_at: string;
}
```

**Generation Strategy**:
- Generate from scratch (no source material required)
- Target 5-10 minute read time
- Include 2-3 practice questions at end
- Focus on foundational understanding, not depth

### 5. Cognitive Load Service

**Input**: User state, time of day, session history
**Output**: Capacity calculation

```typescript
interface CognitiveCapacity {
  baseCapacity: number; // Always 4
  circadianModifier: number; // 0.7-1.1
  sleepModifier: number; // 0.7-1.0
  fatigueModifier: number; // 0-0.3
  effectiveCapacity: number; // Final calculated value
  percentageUsed: number; // 0-100
  canLearnNew: boolean;
  warningLevel: 'none' | 'caution' | 'blocked';
}
```

**Circadian Rhythm Model**:
```
06:00-09:00: 0.9  (waking up)
09:00-12:00: 1.1  (peak morning)
12:00-14:00: 0.85 (post-lunch dip)
14:00-17:00: 1.0  (afternoon)
17:00-20:00: 0.95 (evening)
20:00-22:00: 0.8  (winding down)
22:00-06:00: 0.7  (late night - discouraged)
```

### 6. Session Builder

**Input**: Due reviews, new concepts, capacity
**Output**: Ordered session with interleaving

```typescript
interface LearningSession {
  id: string;
  user_id: string;
  project_id?: string;
  items: SessionItem[];
  estimated_minutes: number;
  cognitive_load_used: number;
  session_type: 'standard' | 'review_only' | 'morning_check';
  created_at: string;
  completed_at?: string;
}

interface SessionItem {
  type: 'review' | 'new' | 'pretest';
  concept_id: string;
  position: number;
}
```

**Interleaving Algorithm**:
```
Input: reviews[], newConcepts[], capacity

session = []
reviewIndex = 0
newIndex = 0

while newIndex < capacity and newIndex < newConcepts.length:
  # Add 1-2 reviews before each new concept
  if reviewIndex < reviews.length:
    session.push(reviews[reviewIndex++])
  if reviewIndex < reviews.length:
    session.push(reviews[reviewIndex++])

  # Add pretest for new concept
  session.push({ type: 'pretest', concept: newConcepts[newIndex] })

  # Add new concept
  session.push({ type: 'new', concept: newConcepts[newIndex++] })

# Add remaining reviews
while reviewIndex < reviews.length:
  session.push(reviews[reviewIndex++])

return session
```

### 7. Sleep-Aware Scheduler

**Input**: User schedule preferences, current time
**Output**: Session recommendations

```typescript
interface UserSchedulePreferences {
  user_id: string;
  bedtime: string; // "22:00" format
  wake_time: string; // "07:00" format
  timezone: string; // "America/New_York"
  created_at: string;
  updated_at: string;
}

interface SessionRecommendation {
  type: 'standard' | 'review_only' | 'skip';
  reason: string;
  suggestedDuration: number;
  newConceptsAllowed: number;
}
```

**Sleep Rules**:
- Within 2 hours of bedtime: Review only
- After bedtime: Suggest waiting until morning
- Morning (within 2 hours of wake): Morning check session (light review)

---

## Database Schema

### Migration 007: Prerequisite Assessment

```sql
-- Prerequisites identified for a project
CREATE TABLE prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT CHECK (source IN ('mentioned_only', 'ai_inferred')),
  confidence NUMERIC(3,2),
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pretest questions per prerequisite
CREATE TABLE pretest_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_id UUID REFERENCES prerequisites(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- ["opt1", "opt2", "opt3", "opt4"]
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('basic', 'intermediate')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User pretest sessions
CREATE TABLE pretest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INTEGER,
  correct_answers INTEGER
);

-- Individual pretest responses
CREATE TABLE pretest_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pretest_session_id UUID REFERENCES pretest_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES pretest_questions(id),
  selected_index INTEGER,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Identified gaps per user
CREATE TABLE prerequisite_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prerequisite_id UUID REFERENCES prerequisites(id) ON DELETE CASCADE,
  pretest_session_id UUID REFERENCES pretest_sessions(id),
  score NUMERIC(5,2),
  gap_severity TEXT CHECK (gap_severity IN ('none', 'minor', 'significant', 'critical')),
  questions_attempted INTEGER,
  questions_correct INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated mini-lessons
CREATE TABLE mini_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prerequisite_id UUID REFERENCES prerequisites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  key_points JSONB,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress on mini-lessons
CREATE TABLE prerequisite_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mini_lesson_id UUID REFERENCES mini_lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  post_test_score NUMERIC(5,2),
  UNIQUE(user_id, mini_lesson_id)
);
```

### Migration 008: Session Construction

```sql
-- Learning sessions with cognitive load tracking
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  session_type TEXT CHECK (session_type IN ('standard', 'review_only', 'morning_check')),
  items JSONB NOT NULL, -- Array of SessionItem
  estimated_minutes INTEGER,
  cognitive_load_used NUMERIC(4,2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- User schedule preferences
CREATE TABLE user_schedule_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bedtime TIME,
  wake_time TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled notifications (future use)
CREATE TABLE session_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## UI Flow

### Prerequisite Assessment Flow

```
[Analysis Completes]
       │
       ▼
┌─────────────────────┐
│  Prerequisites      │
│  Detected?          │
└─────────────────────┘
       │
    Yes│      No
       │       └──────────▶ [Main Roadmap]
       ▼
┌─────────────────────┐
│  PretestOfferModal  │
│  • Take Pretest     │
│  • Skip (warning)   │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  PretestSession     │
│  • Question cards   │
│  • Progress bar     │
│  • Submit answers   │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  PretestResults     │
│  • Score breakdown  │
│  • Gap severity     │
│  • Recommendations  │
└─────────────────────┘
       │
   Gaps│Found?
       │
    Yes│      No
       │       └──────────▶ [Main Roadmap]
       ▼
┌─────────────────────┐
│  PrerequisiteRoadmap│
│  • Mini-lesson list │
│  • Progress tracking│
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  MiniLessonScreen   │
│  • Content display  │
│  • Key points       │
│  • Practice quiz    │
└─────────────────────┘
       │
       ▼
[Prereq Complete] ──▶ [Main Roadmap]
```

### Session Construction Flow

```
[Home Screen]
       │
       ▼
┌─────────────────────────────────────┐
│  SessionPreviewCard                 │
│  • Due reviews count                │
│  • New concepts available           │
│  • Cognitive load indicator         │
│  • Session type recommendation      │
│  • "Start Session" button           │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  SessionScreen                      │
│  • Interleaved item flow            │
│  • Progress tracking                │
│  • Load meter (live update)         │
│  • Early exit option                │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  SessionComplete                    │
│  • Summary stats                    │
│  • Next session suggestion          │
│  • Time until bedtime warning       │
└─────────────────────────────────────┘
```

---

## Error Handling

1. **AI Generation Failures**:
   - Retry with exponential backoff (3 attempts)
   - Fall back to simpler question templates
   - Log failures for monitoring

2. **Network Errors**:
   - Cache prerequisites and questions locally
   - Allow offline review sessions
   - Sync when connection restored

3. **Invalid User Input**:
   - Validate schedule preferences (bedtime must be different from wake time)
   - Clamp capacity modifiers to valid ranges
   - Show clear error messages

---

## Testing Strategy

1. **Unit Tests**:
   - Cognitive load calculations with various modifiers
   - Interleaving algorithm edge cases
   - Gap scoring thresholds
   - Sleep-aware scheduling rules

2. **Integration Tests**:
   - Prerequisite detection pipeline
   - Pretest session flow
   - Session construction with real data

3. **E2E Tests**:
   - Full pretest → gap → mini-lesson flow
   - Session construction and completion
   - Schedule preference persistence
