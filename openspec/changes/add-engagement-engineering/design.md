# Design: Add Engagement Engineering

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LEARNING FEED UI                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │VideoChunk   │  │   Quiz      │  │  Synthesis  │             │
│  │   Card      │  │   Card      │  │    Card     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│        ↑                ↑                ↑                      │
│        └────────────────┴────────────────┘                      │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              │   Feed Builder      │                            │
│              │     Service         │                            │
│              └──────────┬──────────┘                            │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                 ENGAGEMENT LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Streak    │  │     XP      │  │  Synthesis  │             │
│  │  Service    │  │   Service   │  │  Detector   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│               DATABASE (SUPABASE)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │user_streaks │  │  xp_ledger  │  │feed_progress│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Chapter Generation (During Analysis)

```
concepts with source_mapping
         │
         ▼
┌─────────────────────────┐
│ Chapter Generation Svc  │
│  1. Filter tier 2-3     │
│  2. Sort by start_sec   │
│  3. Assign sequence     │
│  4. Generate teasers    │
└───────────┬─────────────┘
            │
            ▼
concepts.chapter_sequence
concepts.open_loop_teaser
```

### Feed Playback

```
User taps "Start Learning"
         │
         ▼
┌─────────────────────────┐
│   Feed Builder Service  │
│  - Load chapters        │
│  - Interleave cards     │
│  - Insert synthesis     │
└───────────┬─────────────┘
            │
            ▼
    FeedItem[] array
         │
         ▼
┌─────────────────────────┐
│    LearningFeed.tsx     │
│  - FlatList pagingMode  │
│  - Render card by type  │
│  - Handle gestures      │
└─────────────────────────┘
```

## Database Schema

### New Tables

```sql
-- User engagement streaks
user_streaks (
  user_id UUID PK,
  current_streak INTEGER,
  longest_streak INTEGER,
  last_activity_date DATE
)

-- XP transaction ledger
xp_ledger (
  id UUID PK,
  user_id UUID,
  amount INTEGER,
  reason VARCHAR(50),
  concept_id UUID nullable,
  created_at TIMESTAMPTZ
)

-- Aggregated XP summary
user_xp (
  user_id UUID PK,
  total_xp INTEGER,
  level INTEGER
)

-- Feed progress per source
feed_progress (
  id UUID PK,
  user_id UUID,
  source_id UUID,
  current_index INTEGER,
  completed_items UUID[],
  synthesis_count INTEGER,
  UNIQUE(user_id, source_id)
)

-- Typography preferences
user_typography_preferences (
  user_id UUID PK,
  font_family VARCHAR(50),
  bionic_reading_enabled BOOLEAN,
  dark_mode_enabled BOOLEAN,
  font_scale REAL
)
```

### Extended Columns

```sql
-- Extend concepts table
concepts (
  + chapter_sequence INTEGER,
  + open_loop_teaser TEXT
)
```

## Component Architecture

### Feed Components

```
src/components/feed/
├── FeedCard.tsx          # Base card with swipe gestures
├── VideoChunkCard.tsx    # Video segment with captions
├── QuizCard.tsx          # Interactive quiz
├── FactCard.tsx          # "Did you know?" card
├── SynthesisCard.tsx     # "Connect the dots" exercise
├── CaptionOverlay.tsx    # Yellow active word highlight
├── FeedProgressBar.tsx   # Progress indicator
├── SessionBreakModal.tsx # Break suggestion after 30min
└── index.ts
```

### Engagement Components

```
src/components/engagement/
├── StreakDisplay.tsx     # Flame icon with count
├── XPPopup.tsx           # Animated "+25 XP" popup
├── LevelBadge.tsx        # User level display
├── MasteryRing.tsx       # Circular progress (not linear)
├── ConfettiAnimation.tsx # Celebration animation
└── index.ts
```

### Services

```
src/lib/
├── chapter-generation-service.ts  # Pipeline stage
├── feed-builder-service.ts        # Interleave cards
├── streak-service.ts              # Track streaks
├── xp-service.ts                  # Variable XP rewards
├── synthesis-detector-service.ts  # Synthesis milestones
├── session-timer-service.ts       # Break suggestions
├── haptic-feedback.ts             # Haptic utilities
├── bionic-text.ts                 # Text processing
├── feed-context.tsx               # Feed state
└── typography-context.tsx         # Font preferences
```

## Key Algorithms

### Variable XP Calculation

```typescript
const XP_WEIGHTS = {
  quiz_correct: [
    { amount: 10, weight: 60 },  // 60% chance
    { amount: 15, weight: 25 },  // 25% chance
    { amount: 25, weight: 10 },  // 10% chance
    { amount: 50, weight: 5 },   // 5% chance
  ],
};

function selectXP(reason: XPReason): number {
  const weights = XP_WEIGHTS[reason];
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { amount, weight } of weights) {
    random -= weight;
    if (random <= 0) return amount;
  }
  return weights[0].amount;
}
```

### Feed Interleaving

```typescript
function buildFeed(chapters: Concept[]): FeedItem[] {
  const feed: FeedItem[] = [];
  let chapterCount = 0;

  for (const chapter of chapters) {
    // Add video chunk
    feed.push(createVideoChunk(chapter));
    chapterCount++;

    // Add quiz after odd-numbered chapters
    if (chapterCount % 2 === 1 && chapter.assessment_spec) {
      feed.push(createQuiz(chapter));
    }

    // Add fact card every 3rd chapter
    if (chapterCount % 3 === 0) {
      feed.push(createFact(chapter));
    }

    // Add synthesis every 5-6 chapters
    if (chapterCount % 5 === 0 || chapterCount % 6 === 0) {
      feed.push(createSynthesis(chapters.slice(chapterCount - 5, chapterCount)));
    }
  }

  return feed;
}
```

### Bionic Reading

```typescript
function applyBionicReading(text: string): React.ReactNode[] {
  const words = text.split(/\s+/);
  return words.map((word, i) => {
    const boldLength = Math.max(1, Math.ceil(word.length * 0.4));
    const boldPart = word.slice(0, boldLength);
    const normalPart = word.slice(boldLength);

    return (
      <Text key={i}>
        <Text style={{ fontWeight: 'bold' }}>{boldPart}</Text>
        {normalPart}{' '}
      </Text>
    );
  });
}
```

## Trade-offs

### Decision 1: Chapters = Concepts

**Chosen**: Use existing concept boundaries as chapter boundaries

**Pros**:
- No additional chunking algorithm needed
- Leverages existing `source_mapping` timestamps
- Natural alignment with pedagogical structure

**Cons**:
- Less control over chapter length
- Some concepts may be too short/long

**Mitigation**: Validate and merge/flag during chapter generation

### Decision 2: Pre-process Chapters

**Chosen**: Generate chapters during analysis pipeline

**Alternative**: On-demand chapter generation

**Rationale**: Pre-processing ensures instant playback with no delay when user starts learning. Storage cost is minimal (just sequence number and teaser text).

### Decision 3: Variable XP with Weights

**Chosen**: Weighted random selection (60% low, 5% high)

**Rationale**: Pure random would give too many high rewards. Weighted distribution creates anticipation while maintaining perceived fairness.

## Dependencies

### npm Packages

```json
{
  "@expo-google-fonts/lexend": "^0.2.3",
  "expo-haptics": "~14.0.0",
  "react-native-svg": "~15.8.0"
}
```

### Existing Infrastructure

- `content-analysis-pipeline.ts` - Add chapter generation stage
- `spaced-repetition-service.ts` - Integration for "Review later" action
- `VideoPlayer.tsx` / `YouTubePlayer.tsx` - Base video components
