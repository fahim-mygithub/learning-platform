# Learning Platform - Implementation Tasks

## Technology Stack

- **Platform**: React Native (iOS & Android)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI Provider**: Anthropic Claude (Sonnet for complex, Haiku for simple)
- **Interactive Sandbox**: Pixi.js/Konva via react-native-skia or WebView
- **Testing**: React Native Testing Library + Detox (E2E)

## Implementation Philosophy

- Each phase is self-contained and testable
- Console logging required for all user interactions and state changes
- Screenshot verification at each checkpoint before proceeding
- Chrome DevTools MCP integration for automated testing validation

---

## Phase 1: Foundation Infrastructure

### 1.1 Project Setup

- [ ] 1.1.1 Initialize React Native project with Expo or bare workflow
- [ ] 1.1.2 Configure TypeScript with strict mode
- [ ] 1.1.3 Set up ESLint and Prettier
- [ ] 1.1.4 Configure NativeWind (Tailwind for React Native) with design tokens
- [ ] 1.1.5 Set up testing framework (Jest + React Native Testing Library + Detox)

**Checkpoint 1.1: Project compiles, linting passes, basic test runs**

```
Console verification: "Project initialized successfully"
Screenshot: Empty app shell renders
```

### 1.2 Design System Foundation

- [ ] 1.2.1 Create design tokens file (colors, spacing, typography)
  - Primary: #6366F1 (Indigo)
  - Secondary: #10B981 (Emerald)
  - Accent: #F59E0B (Amber)
  - Mastery states: Gray -> Blue -> Orange -> Yellow -> Lime -> Emerald
- [ ] 1.2.2 Implement Button component (primary, secondary, tertiary, icon)
- [ ] 1.2.3 Implement Card component with variants
- [ ] 1.2.4 Implement Progress indicators (bar, circular, dots)
- [ ] 1.2.5 Implement Form elements (input, toggle, slider, radio)
- [ ] 1.2.6 Implement Feedback components (toast, modal, bottom sheet)

**Checkpoint 1.2: Component library renders all variants**

```
Console verification: All component mounts logged
Screenshot: Storybook/component gallery showing all variants
```

### 1.3 Authentication System

- [ ] 1.3.1 Set up Supabase Auth with React Native client
- [ ] 1.3.2 Implement email/password registration flow
- [ ] 1.3.3 Implement email verification handling
- [ ] 1.3.4 Implement OAuth flows (Google, Apple)
- [ ] 1.3.5 Implement session persistence and management
- [ ] 1.3.6 Create protected route wrapper

**Checkpoint 1.3: Full auth flow works**

```
Console verification:
- "Auth: Registration initiated"
- "Auth: Email verification sent"
- "Auth: OAuth provider [name] initiated"
- "Auth: Session created for user [id]"
Screenshot:
- Registration form
- Verification pending screen
- Logged-in home screen
```

### 1.4 Project Management

- [ ] 1.4.1 Design database schema for projects
- [ ] 1.4.2 Implement project creation API
- [ ] 1.4.3 Implement project listing API
- [ ] 1.4.4 Implement project deletion with confirmation
- [ ] 1.4.5 Create Projects screen UI
- [ ] 1.4.6 Create Project Detail screen UI

**Checkpoint 1.4: CRUD operations for projects work**

```
Console verification:
- "Project: Created [id] - [title]"
- "Project: Listed [count] projects"
- "Project: Deleted [id]"
Screenshot:
- Empty projects screen
- Projects list with sample project
- Project detail view
```

### 1.5 Source Upload & Storage

- [ ] 1.5.1 Set up Supabase Storage buckets for sources
- [ ] 1.5.2 Implement file upload with progress tracking
- [ ] 1.5.3 Implement file validation (type, size limits)
- [ ] 1.5.4 Implement URL submission and metadata extraction
- [ ] 1.5.5 Create upload UI with drag-and-drop
- [ ] 1.5.6 Handle error states (corrupted files, network errors)

**Checkpoint 1.5: Files upload and store successfully**

```
Console verification:
- "Upload: Started [filename] ([size])"
- "Upload: Progress [percentage]%"
- "Upload: Completed [filename]"
- "Upload: Failed - [error reason]"
Screenshot:
- Upload interface
- Progress indicator during upload
- Completed upload confirmation
- Error state for invalid file
```

---

## Phase 2: Content Analysis Pipeline

### 2.1 Transcription Service

- [ ] 2.1.1 Integrate transcription API (Whisper/AssemblyAI/Deepgram)
- [ ] 2.1.2 Implement audio extraction from video
- [ ] 2.1.3 Implement transcription job queue
- [ ] 2.1.4 Implement timestamp alignment
- [ ] 2.1.5 Store transcription results with source links

**Checkpoint 2.1: Video transcription works end-to-end**

```
Console verification:
- "Transcription: Started for source [id]"
- "Transcription: Extracting audio..."
- "Transcription: Processing [duration]"
- "Transcription: Completed with [word_count] words"
Screenshot:
- Analysis in progress screen
- Completed analysis with concept count
```

### 2.2 Concept Extraction

- [ ] 2.2.1 Design prompt for concept extraction
- [ ] 2.2.2 Implement LLM call for concept identification
- [ ] 2.2.3 Parse and validate extracted concepts
- [ ] 2.2.4 Implement modality classification (declarative, conceptual, procedural, conditional, metacognitive)
- [ ] 2.2.5 Implement difficulty estimation
- [ ] 2.2.6 Store concepts with source references

**Checkpoint 2.2: Concepts extracted from sample content**

```
Console verification:
- "Extraction: Processing [source_title]"
- "Extraction: Found [count] concepts"
- "Extraction: Classified modalities - Declarative:[n], Conceptual:[n], Procedural:[n]"
Screenshot:
- Concept list view showing extracted concepts
- Concept detail showing source timestamp link
```

### 2.3 Knowledge Graph Construction

- [ ] 2.3.1 Design knowledge graph data structure
- [ ] 2.3.2 Implement prerequisite relationship inference
- [ ] 2.3.3 Implement relationship type classification
- [ ] 2.3.4 Validate graph is acyclic for prerequisites
- [ ] 2.3.5 Implement graph visualization component

**Checkpoint 2.3: Knowledge graph builds correctly**

```
Console verification:
- "KnowledgeGraph: Building for project [id]"
- "KnowledgeGraph: [count] nodes, [count] edges"
- "KnowledgeGraph: Prerequisite chain depth: [n]"
Screenshot:
- Knowledge graph visualization
- Concept with visible prerequisites
```

### 2.4 Roadmap Generation

- [ ] 2.4.1 Implement level organization algorithm
- [ ] 2.4.2 Implement phase grouping logic
- [ ] 2.4.3 Calculate time estimates per level
- [ ] 2.4.4 Define mastery gates between phases
- [ ] 2.4.5 Create Roadmap view UI (list and visual)

**Checkpoint 2.4: Roadmap displays correctly**

```
Console verification:
- "Roadmap: Generated [count] levels in [count] phases"
- "Roadmap: Total estimated hours: [n]"
- "Roadmap: Mastery gates at levels: [list]"
Screenshot:
- Roadmap list view
- Roadmap visual journey view
- Level detail showing concepts
```

---

## Phase 3: Spaced Repetition Engine

### 3.1 FSRS Algorithm Implementation

- [ ] 3.1.1 Implement FSRS core calculations
- [ ] 3.1.2 Implement stability and difficulty parameters
- [ ] 3.1.3 Implement review scheduling logic
- [ ] 3.1.4 Implement parameter personalization per user
- [ ] 3.1.5 Create unit tests for FSRS correctness

**Checkpoint 3.1: FSRS calculations verified**

```
Console verification:
- "FSRS: Calculated next review for [concept] in [days] days"
- "FSRS: Stability updated from [old] to [new]"
Screenshot: N/A (unit test output)
```

### 3.2 Concept State Machine

- [ ] 3.2.1 Implement state machine (UNSEEN -> EXPOSED -> FRAGILE -> DEVELOPING -> SOLID -> MASTERED)
- [ ] 3.2.2 Implement MISCONCEIVED state handling
- [ ] 3.2.3 Implement state transition criteria
- [ ] 3.2.4 Track session count and timing requirements
- [ ] 3.2.5 Create state visualization in UI

**Checkpoint 3.2: State transitions work correctly**

```
Console verification:
- "ConceptState: [concept] transitioned from [old] to [new]"
- "ConceptState: Mastery requires [n] more sessions"
Screenshot:
- Concept showing current state with colored indicator
- Mastery progression visualization
```

### 3.3 Review Queue Management

- [ ] 3.3.1 Implement due item query
- [ ] 3.3.2 Implement priority ordering (decay urgency)
- [ ] 3.3.3 Implement backlog detection
- [ ] 3.3.4 Display due reviews on home screen
- [ ] 3.3.5 Implement review statistics

**Checkpoint 3.3: Review queue displays correctly**

```
Console verification:
- "ReviewQueue: [count] items due today"
- "ReviewQueue: [count] items overdue"
Screenshot:
- Home screen showing due review count
- Review queue summary
```

---

## Phase 4: Session Construction

### 4.1 Cognitive Load Budgeting

- [ ] 4.1.1 Implement base capacity calculation
- [ ] 4.1.2 Implement sleep modifier (if tracking available)
- [ ] 4.1.3 Implement circadian modifier (time of day)
- [ ] 4.1.4 Implement fatigue modifier (intra-day)
- [ ] 4.1.5 Implement concept load costs by type
- [ ] 4.1.6 Create capacity visualization UI

**Checkpoint 4.1: Capacity limits enforced**

```
Console verification:
- "Capacity: Base [n], Modified [n] (sleep: [x], time: [y])"
- "Capacity: [percentage]% consumed"
- "Capacity: Blocking new material - limit reached"
Screenshot:
- Capacity bar visualization
- Warning dialog at 75% capacity
```

### 4.2 Session Builder

- [ ] 4.2.1 Implement session template construction
- [ ] 4.2.2 Generate pretest questions for new concepts
- [ ] 4.2.3 Implement review item selection (FSRS due)
- [ ] 4.2.4 Implement interleaving algorithm
- [ ] 4.2.5 Calculate session duration estimate
- [ ] 4.2.6 Create session preview UI

**Checkpoint 4.2: Sessions construct correctly**

```
Console verification:
- "Session: Building for project [id]"
- "Session: [n] reviews + [n] new concepts"
- "Session: Estimated duration [m] minutes"
Screenshot:
- Session preview showing content summary
- Session start screen
```

### 4.3 Sleep-Aware Features

- [ ] 4.3.1 Implement bedtime configuration
- [ ] 4.3.2 Implement 2-hour cutoff logic
- [ ] 4.3.3 Implement morning check session type
- [ ] 4.3.4 Implement pre-sleep review suggestion
- [ ] 4.3.5 Create notification scheduling

**Checkpoint 4.3: Sleep awareness functions**

```
Console verification:
- "SleepAware: Bedtime cutoff active - review only mode"
- "SleepAware: Morning consolidation check available"
Screenshot:
- Evening session showing review-only message
- Morning check notification
```

---

## Phase 5: Question Generation & Assessment

### 5.1 Question Generation

- [ ] 5.1.1 Design question generation prompts by type
- [ ] 5.1.2 Implement free recall question generation
- [ ] 5.1.3 Implement cued recall generation
- [ ] 5.1.4 Implement multiple choice with distractor generation
- [ ] 5.1.5 Implement application scenario generation
- [ ] 5.1.6 Implement discrimination question generation
- [ ] 5.1.7 Store generated questions with metadata

**Checkpoint 5.1: Questions generate correctly**

```
Console verification:
- "QuestionGen: Generated [count] questions for [concept]"
- "QuestionGen: Types - FreeRecall:[n], MC:[n], Application:[n]"
Screenshot:
- Question preview showing variety
- Free recall question UI
- Multiple choice question UI
```

### 5.2 AI Response Evaluation

- [ ] 5.2.1 Design evaluation prompt template
- [ ] 5.2.2 Implement free response evaluation
- [ ] 5.2.3 Implement partial credit logic
- [ ] 5.2.4 Implement misconception pattern matching
- [ ] 5.2.5 Generate evaluation criteria per question
- [ ] 5.2.6 Measure evaluation accuracy vs human baseline

**Checkpoint 5.2: Evaluation works accurately**

```
Console verification:
- "Evaluation: Analyzing response for [question_id]"
- "Evaluation: Score [n]/[max] - [complete|partial|misconception|insufficient]"
- "Evaluation: Misconception detected - [pattern]"
Screenshot:
- Correct answer feedback screen
- Incorrect answer with explanation
```

### 5.3 Feedback System

- [ ] 5.3.1 Implement correct answer feedback component
- [ ] 5.3.2 Implement incorrect answer feedback component
- [ ] 5.3.3 Implement misconception correction flow
- [ ] 5.3.4 Link feedback to source material
- [ ] 5.3.5 Implement confidence calibration tracking

**Checkpoint 5.3: Feedback displays correctly**

```
Console verification:
- "Feedback: Displaying [correct|incorrect] for [question_id]"
- "Feedback: Misconception repair scheduled"
Screenshot:
- Correct feedback with checkmark
- Incorrect feedback with explanation
- Misconception warning
```

---

## Phase 6: Source-Agnostic Interactive Sandbox

### 6.1 Sandbox Framework

- [ ] 6.1.1 Create canvas container component with Pixi.js/Konva integration
- [ ] 6.1.2 Implement responsive canvas sizing (100% container width)
- [ ] 6.1.3 Implement touch-first event handling (44px minimum targets)
- [ ] 6.1.4 Define interaction schema JSON specification
- [ ] 6.1.5 Implement schema parser/renderer
- [ ] 6.1.6 Create state tracking system for user actions
- [ ] 6.1.7 Implement evaluation output protocol (timestamped action log)

**Checkpoint 6.1: Sandbox renders AI-generated interaction**

```
Console verification:
- "Sandbox: Pixi/Konva canvas initialized"
- "Sandbox: Schema received [type: conceptual, complexity: medium]"
- "Sandbox: Rendering interaction with [n] elements"
- "Sandbox: User action captured [action_type]"
Screenshot:
- Blank sandbox initializing
- Rendered interaction from AI schema
```

### 6.2 AI Interaction Generator

- [ ] 6.2.1 Design prompt for interaction generation by cognitive type:
  - Factual: Fill-in-blank, matching, rapid recall
  - Conceptual: Drag-to-build diagrams, cause-effect chains
  - Procedural: Step sequencing, decision trees, workflows
  - Conditional: Scenario judgment, branching consequences
  - Metacognitive: Self-explanation, confidence calibration
- [ ] 6.2.2 Implement LLM call to generate interaction schemas
- [ ] 6.2.3 Validate generated schemas against specification
- [ ] 6.2.4 Implement smart hybrid caching (cache base, regenerate variations)
- [ ] 6.2.5 Store generated interactions with concept links

**Checkpoint 6.2: AI generates valid interaction schemas**

```
Console verification:
- "InteractionGen: Generating for concept [id] (type: [cognitive_type])"
- "InteractionGen: Schema validated successfully"
- "InteractionGen: Cached base schema, will generate variations for reviews"
Screenshot:
- Generated schema preview (developer view)
```

### 6.3 Core Interaction Primitives

- [ ] 6.3.1 Implement drag-and-drop primitives (draggable + dropzone)
- [ ] 6.3.2 Implement text input/completion primitives
- [ ] 6.3.3 Implement selection/matching primitives
- [ ] 6.3.4 Implement sequencing/ordering primitives
- [ ] 6.3.5 Implement drawing/diagramming primitives
- [ ] 6.3.6 Implement branching narrative primitives

**Checkpoint 6.3: All primitive types render and interact**

```
Console verification:
- "Primitive: [type] element created at [position]"
- "Primitive: Drag started for [element_id]"
- "Primitive: Drop accepted at [zone_id]"
Screenshot:
- Each primitive type in isolation
- Combined interaction using multiple primitives
```

### 6.4 Evaluation Integration

- [ ] 6.4.1 Capture user performance data in standard format
- [ ] 6.4.2 Implement real-time AI evaluation during interaction
- [ ] 6.4.3 Generate feedback based on AI assessment
- [ ] 6.4.4 Track success criteria completion
- [ ] 6.4.5 Feed results to FSRS for scheduling updates

**Checkpoint 6.4: AI evaluates user performance**

```
Console verification:
- "Evaluation: Collecting [n] user actions"
- "Evaluation: AI assessing against criteria..."
- "Evaluation: Score [n]/[max], feedback generated"
- "Evaluation: Updating FSRS with performance data"
Screenshot:
- User mid-interaction
- Feedback display after completion
```

### 6.5 Active Learning Enforcement

- [ ] 6.5.1 Ensure interactions require retrieval (never show answers first)
- [ ] 6.5.2 Implement productive failure patterns (1-2 attempts before hints)
- [ ] 6.5.3 Track struggle time (some struggle is desirable)
- [ ] 6.5.4 Integrate immediate feedback loop
- [ ] 6.5.5 Require success state before advancing (criterion mastery)
- [ ] 6.5.6 Connect failed attempts to FSRS for re-scheduling

**Checkpoint 6.5: Active learning principles enforced**

```
Console verification:
- "ActiveLearning: Attempt [n] - no hints shown yet"
- "ActiveLearning: Struggle time [seconds] - within desirable range"
- "ActiveLearning: Hint revealed after [n] attempts"
- "ActiveLearning: Criterion not met - scheduling review"
Screenshot:
- Interaction before hints
- Hint appearing after attempts
- Success celebration
```

---

## Phase 7: User Interface & Experience

### 7.1 Navigation Structure

- [ ] 7.1.1 Implement bottom tab navigation (Home, Projects, Learn, Progress, Profile)
- [ ] 7.1.2 Style Learn tab with prominence (larger, primary color)
- [ ] 7.1.3 Implement screen transitions (slide)
- [ ] 7.1.4 Implement back navigation gestures

**Checkpoint 7.1: Navigation works smoothly**

```
Console verification:
- "Navigation: Tab changed to [tab]"
- "Navigation: Screen pushed [screen]"
Screenshot:
- Home screen with bottom nav
- Each tab active state
```

### 7.2 Home Screen

- [ ] 7.2.1 Implement greeting with time of day
- [ ] 7.2.2 Implement streak display
- [ ] 7.2.3 Implement Today's Learning cards
- [ ] 7.2.4 Implement week calendar view
- [ ] 7.2.5 Implement quick stats section

**Checkpoint 7.2: Home screen displays all elements**

```
Console verification:
- "Home: Loaded for user [id]"
- "Home: Streak [n] days, [n] reviews due"
Screenshot:
- Full home screen
- Streak indicator
- Today's learning card
```

### 7.3 Learning Session Flow

- [ ] 7.3.1 Implement session start screen
- [ ] 7.3.2 Implement question display loop
- [ ] 7.3.3 Implement progress bar
- [ ] 7.3.4 Implement session summary screen
- [ ] 7.3.5 Implement celebration animations

**Checkpoint 7.3: Full session flow works**

```
Console verification:
- "Session: Started with [n] items"
- "Session: Question [n] of [total] - [type]"
- "Session: Completed - [correct]/[total] correct"
Screenshot:
- Session start
- Question mid-session
- Session complete with confetti
```

### 7.4 Gamification Elements

- [ ] 7.4.1 Implement mastery celebration (particle burst)
- [ ] 7.4.2 Implement level complete animation
- [ ] 7.4.3 Implement achievement unlock display
- [ ] 7.4.4 Implement streak freeze display
- [ ] 7.4.5 Create achievements gallery screen

**Checkpoint 7.4: Celebrations feel rewarding**

```
Console verification:
- "Gamification: Concept [id] mastered - triggering celebration"
- "Gamification: Achievement unlocked - [name]"
Screenshot:
- Mastery animation in action
- Achievement popup
```

### 7.5 Accessibility

- [ ] 7.5.1 Add semantic HTML/ARIA labels
- [ ] 7.5.2 Implement keyboard navigation
- [ ] 7.5.3 Test color contrast (4.5:1 minimum)
- [ ] 7.5.4 Add screen reader announcements for state changes
- [ ] 7.5.5 Implement reduce motion support

**Checkpoint 7.5: Accessibility audit passes**

```
Console verification:
- "A11y: Screen reader announced [message]"
Screenshot:
- VoiceOver/TalkBack highlighting elements
- High contrast mode if available
```

---

## Phase 8: Forgiveness & Autonomy Features

### 8.1 Review Debt Management

- [ ] 8.1.1 Implement debt level calculation (Healthy/Elevated/High/Critical)
- [ ] 8.1.2 Implement load spreading algorithm
- [ ] 8.1.3 Implement bankruptcy options UI
- [ ] 8.1.4 Implement vacation mode toggle
- [ ] 8.1.5 Write zero-guilt messaging

**Checkpoint 8.1: Debt handling is compassionate**

```
Console verification:
- "DebtManagement: Level [Healthy|Elevated|High|Critical]"
- "DebtManagement: Spreading [n] items across [n] days"
Screenshot:
- Elevated debt warning
- Bankruptcy options dialog
```

### 8.2 Autonomy Controls

- [ ] 8.2.1 Implement just-in-time content access
- [ ] 8.2.2 Implement defer/skip/prioritize actions
- [ ] 8.2.3 Implement "Why?" rationale popups
- [ ] 8.2.4 Implement goal-based prioritization
- [ ] 8.2.5 Implement quick session mode

**Checkpoint 8.2: User feels in control**

```
Console verification:
- "Autonomy: User deferred [concept] to tomorrow"
- "Autonomy: Showing rationale for [recommendation]"
Screenshot:
- Override options menu
- Why explanation popup
```

### 8.3 Executive Function Support

- [ ] 8.3.1 Implement energy level selector (High/Normal/Low/Quick)
- [ ] 8.3.2 Implement automatic energy detection from behavior
- [ ] 8.3.3 Implement Easy Day mode
- [ ] 8.3.4 Implement configurable daily caps
- [ ] 8.3.5 Adapt session based on energy

**Checkpoint 8.3: Energy adaptation works**

```
Console verification:
- "EnergySupport: User selected [level]"
- "EnergySupport: Detected low energy - adapting session"
Screenshot:
- Energy selector at session start
- Easy Day mode confirmation
```

---

## Phase 9: Account Settings & Subscription

### 9.1 Settings Infrastructure

- [ ] 9.1.1 Create settings navigation structure
- [ ] 9.1.2 Implement profile editing
- [ ] 9.1.3 Implement learning preferences
- [ ] 9.1.4 Implement notification preferences
- [ ] 9.1.5 Implement data export (GDPR)

**Checkpoint 9.1: Settings screens functional**

```
Console verification:
- "Settings: Updated [field] to [value]"
- "Settings: Export initiated"
Screenshot:
- Settings main screen
- Profile editing
```

### 9.2 Subscription Management

- [ ] 9.2.1 Integrate payment provider (Stripe/RevenueCat)
- [ ] 9.2.2 Implement tier display and comparison
- [ ] 9.2.3 Implement upgrade/downgrade flows
- [ ] 9.2.4 Implement token usage tracking
- [ ] 9.2.5 Implement billing history

**Checkpoint 9.2: Subscriptions work**

```
Console verification:
- "Subscription: Current tier [name]"
- "Subscription: Token usage [used]/[limit]"
Screenshot:
- Subscription status screen
- Token usage bar
```

### 9.3 BYOK Configuration

- [ ] 9.3.1 Implement API key input with encryption (AES-256)
- [ ] 9.3.2 Implement key validation
- [ ] 9.3.3 Implement model selection per task type
- [ ] 9.3.4 Implement budget limits
- [ ] 9.3.5 Route AI calls through user's key

**Checkpoint 9.3: BYOK mode functional**

```
Console verification:
- "BYOK: Key validated for provider [name]"
- "BYOK: Using user key for [task_type]"
Screenshot:
- API configuration screen
- Budget limit settings
```

### 9.4 Local LLM Support

- [ ] 9.4.1 Implement local endpoint configuration (Ollama)
- [ ] 9.4.2 Implement connection testing
- [ ] 9.4.3 Implement model selection
- [ ] 9.4.4 Implement hybrid routing (local for simple, cloud for complex)
- [ ] 9.4.5 Handle fallback when local unavailable

**Checkpoint 9.4: Local LLM works**

```
Console verification:
- "LocalLLM: Connected to [endpoint]"
- "LocalLLM: Using model [name] for [task]"
- "LocalLLM: Falling back to cloud - [reason]"
Screenshot:
- Local LLM configuration
- Connection success indicator
```

---

## Phase 10: Multi-Source Integration

### 10.1 Source Comparison

- [ ] 10.1.1 Implement concept similarity detection (embedding-based)
- [ ] 10.1.2 Implement overlap identification (>0.85 similarity threshold)
- [ ] 10.1.3 Detect contradictions between sources
- [ ] 10.1.4 Classify source relationship (sequel, parallel, prerequisite)

**Checkpoint 10.1: Sources compared correctly**

```
Console verification:
- "SourceComparison: Found [n] overlapping concepts"
- "SourceComparison: Relationship detected: [type]"
Screenshot:
- Integration analysis progress
```

### 10.2 Unified Knowledge Graph

- [ ] 10.2.1 Merge overlapping concepts into unified nodes
- [ ] 10.2.2 Add new concepts to graph preserving structure
- [ ] 10.2.3 Link multiple sources to unified concepts
- [ ] 10.2.4 Maintain source references for each concept

**Checkpoint 10.2: Graph unifies correctly**

```
Console verification:
- "KGMerge: Unified [n] concepts, added [n] new"
- "KGMerge: Concept [name] now has [n] source references"
Screenshot:
- Unified concept showing multiple source links
```

### 10.3 Roadmap Evolution

- [ ] 10.3.1 Regenerate roadmap preserving user progress
- [ ] 10.3.2 Insert new levels at appropriate positions
- [ ] 10.3.3 Notify user of changes
- [ ] 10.3.4 Handle user-initiated source removal

**Checkpoint 10.3: Roadmap evolves correctly**

```
Console verification:
- "RoadmapEvolution: Added [n] levels, preserved [n] concepts at current state"
- "RoadmapEvolution: New completion estimate: [date]"
Screenshot:
- Integration complete summary
- Updated roadmap showing new levels
```

---

## Testing Integration: Chrome DevTools MCP

### Setup

- [ ] Install and configure Chrome DevTools MCP
- [ ] Create test scripts for each checkpoint
- [ ] Implement screenshot capture automation
- [ ] Configure console log filtering and capture

### Per-Phase Testing Protocol

1. Clear console before test
2. Execute user flow
3. Capture console logs
4. Take screenshot at checkpoint
5. Verify expected logs present
6. Compare screenshot against baseline
7. Document any deviations

### Verification Commands

```bash
# Capture console logs for phase
mcp capture-console --phase [n] --output logs/

# Take verification screenshot
mcp screenshot --name [checkpoint_name] --output screenshots/

# Compare against baseline
mcp compare --baseline baselines/ --current screenshots/

# Generate test report
mcp report --logs logs/ --screenshots screenshots/ --output report.html
```

---

## Definition of Done (Per Phase)

- [ ] All tasks completed
- [ ] Console logging implemented for all interactions
- [ ] Screenshots captured at all checkpoints
- [ ] No console errors
- [ ] Accessibility audit passed
- [ ] Mobile responsiveness verified
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Code reviewed
- [ ] Documentation updated
