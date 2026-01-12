# Interactive Sandbox Feature Proposal

## Executive Summary

Add a source-agnostic interactive canvas system where AI dynamically generates learning interactions based on concept cognitive types. This transforms passive content consumption into active retrieval practice through drag-and-drop, sequencing, and branching interactions.

**Collaborative Review:** Claude (Anthropic) + Gemini (Google) - January 2026

---

## Problem Statement

Current learning interactions are limited to:
- Multiple choice questions (passive recognition)
- Text-based free response (single modality)
- True/false questions (binary choice)

Research shows that **active retrieval** and **elaborative encoding** significantly improve retention (d=0.5-0.8). The sandbox enables:
- Spatial manipulation (drag-to-build diagrams)
- Procedural sequencing (step ordering)
- Conditional reasoning (branching consequences)
- Self-explanation (metacognitive prompts)

---

## Technical Architecture

### Framework Decision: React Native Skia

**Recommendation:** Use `@shopify/react-native-skia` instead of Pixi.js or Konva.

**Rationale (Gemini):**
- Pixi.js/Konva are WebView-based, requiring `react-native-webview` or `expo-gl` compatibility layers
- Skia runs on the UI thread via JSI, providing 60/120 FPS for drag-and-drop latency
- Integrates natively with `react-native-gesture-handler` and `react-native-reanimated`
- Same rendering engine as Flutter for consistency

**Trade-offs:**
- Smaller ecosystem than web-based libraries
- Requires learning Skia's declarative API
- Bundle size increase (~2MB)

### UX Architecture: Modal/Full-Screen Mode

**Recommendation:** Sandbox opens as a full-screen modal, NOT embedded in the TikTok-style feed.

**Rationale:**
- **Cognitive mode separation**: Feed is for quick consumption (System 1), Sandbox is for deep processing (System 2)
- **Technical**: WebGL/Skia memory context is expensive to create/destroy repeatedly
- **UX flow**: Feed card shows preview → "Start Interaction" button → Full-screen sandbox modal

```
Feed Card (Preview)
  ↓ [Tap "Start"]
Full-Screen Sandbox Modal
  ↓ [Complete/Exit]
Return to Feed (next card)
```

---

## Cognitive Type to Interaction Mapping

| Cognitive Type | Interaction Patterns | Bloom's Level |
|---------------|---------------------|---------------|
| **Factual** | Fill-in-blank, Matching, Rapid recall | Remember |
| **Conceptual** | Drag-to-build diagrams, Cause-effect chains, Venn diagrams | Understand/Analyze |
| **Procedural** | Step sequencing, Decision trees, Simulated workflows | Apply |
| **Conditional** | Scenario judgment, Branching consequences, If-then chains | Analyze/Evaluate |
| **Metacognitive** | Self-explanation prompts, Confidence calibration, Strategy selection | Evaluate/Create |

---

## Schema Design

### Core Interaction Schema

```typescript
interface SandboxInteraction {
  // Identity
  interactionId: string;
  conceptId: string;
  cognitiveType: CognitiveType;
  bloomLevel: BloomLevel;

  // Canvas Configuration
  canvasConfig: {
    width: number;
    height: number;
    backgroundColor: string;
  };

  // Elements
  elements: SandboxElement[];

  // Evaluation
  correctState: CorrectStateDefinition;
  evaluationMode: 'deterministic' | 'ai_assisted';
  rubric?: SandboxRubric;

  // Scaffolding (Fading Scaffolding Model)
  scaffoldLevel: 'worked' | 'scaffold' | 'faded';
  hints: string[];

  // Metadata
  estimatedTimeSeconds: number;
  difficultyModifier: number; // 0.5-2.0
}

interface SandboxElement {
  id: string;
  type: 'draggable' | 'dropzone' | 'text_input' | 'connector' | 'label' | 'image';
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  content: string | ImageSource;
  style: ElementStyle;

  // Interaction constraints
  draggable: boolean;
  snapTargets?: string[]; // dropzone IDs
  connections?: string[]; // element IDs for connectors
}

interface CorrectStateDefinition {
  // For drag-and-drop
  zoneContents?: Record<string, string[]>; // dropzoneId -> [elementIds]

  // For sequencing
  sequence?: string[]; // ordered element IDs

  // For branching
  pathTaken?: Record<string, string>; // decisionId -> choice

  // For connectors
  connections?: Array<{ from: string; to: string }>;

  // Tolerance for partial credit
  minCorrectPercentage: number; // 0.0-1.0
}
```

### Type Integration (Gemini Round 2: Composition > Inheritance)

**Recommendation:** Do NOT extend `SampleQuestion`. Create a new distinct entity `SandboxInteraction`.

**Why?** `SampleQuestion` assumes a prompt + discrete options (A, B, C, D). A Sandbox schema defines a **scene** (assets, physics rules, initial state, target state).

**Integration Pattern:** Use `LearningActivity` union type:
```typescript
// Don't jam this into SampleQuestion
interface SandboxInteraction {
  id: string;
  cognitiveType: CognitiveType; // Shared enum
  sceneConfig: {
    backgroundId: string;
    dimensions: { w: number; h: number };
  };
  // The "Pieces"
  elements: Array<{
    id: string;
    type: 'node' | 'connector' | 'zone';
    content: string; // "Mitochondria"
    initialPos: { x: number; y: number }; // Or null for "inventory"
  }>;
  // The "Win Condition" (Deterministic)
  validationRule: {
    type: 'exact_match' | 'sequence_order' | 'connection_map';
    targetState: any;
  };
}

// Union type for activities
type LearningActivity = SampleQuestion | SandboxInteraction;

// Integration with AssessmentSpec
interface AssessmentSpec {
  appropriate_question_types: QuestionType[];
  sample_questions: SampleQuestion[];
  sandbox_interactions?: SandboxInteraction[];
  sandbox_enabled: boolean;
}
```

---

## Evaluation System

### Hybrid Evaluation Strategy (Gemini Round 2)

**Recommendation:** Deterministic FIRST, AI SECOND. Do NOT use AI for spatial/logic validation - it's too slow and overkill.

#### Layer 1: Deterministic (The "Snap" Check) - Cost: 0ms, $0

For **Drag-and-Drop / Sequencing:**
- Define "Hit Zones" or "Adjacency Matrix" in the schema
- When user hits "Submit," compare their constructed graph against Target Graph
- Use **Graph Edit Distance (GED)** or strict equality check

```typescript
interface ValidationRule {
  type: 'exact_match' | 'sequence_order' | 'connection_map';
  targetState: any;
}
```

#### Layer 2: Semantic (The "Fuzzy" Check) - AI for Text Only

Only use AI if the interaction involves **Free Text Input** (e.g., "Label this node" or "Explain the connection"):
- Send user's label + target label to lightweight model (e.g., GPT-4o-mini or local embedding)
- Check semantic similarity

```typescript
type EvaluationMode = 'deterministic' | 'ai_assisted';

interface SandboxEvaluationResult {
  interactionId: string;
  conceptId: string;
  score: number; // 0.0-1.0
  passed: boolean;
  attemptCount: number;
  hintsUsed: number;
  timeToCompleteMs: number;
  feedback: string;
  misconceptionDetected?: string;
}
```

### FSRS Integration: The "Friction" Formula (Gemini Round 2)

**Key Insight:** Time is noisy; **Hints** and **Mistakes** are the signal.

| Metric | Condition | FSRS Rating | Reasoning |
|--------|-----------|-------------|-----------|
| **Complete Failure** | User gives up, or >3 wrong submissions | **Again** | Total retrieval failure. Reset stability. |
| **High Friction** | Correct, but >1 Hint OR Time >2.0x baseline | **Hard** | Retrieved, but with high cognitive cost. |
| **Standard** | Correct, 0 Hints, Time 0.8x-1.5x baseline | **Good** | Ideal desirable difficulty. |
| **Flow State** | Correct, 0 Hints, Time <0.8x baseline | **Easy** | Too trivial; increase interval aggressively. |

**Time Normalization Formula:**
```typescript
// Normalize time based on interaction complexity
const baselineTimeMs = (elementCount * 3500) + (readingWordCount / 3 * 1000);

function deriveRating(result: SandboxEvaluationResult, baselineTimeMs: number): FSRSRating {
  const { passed, attemptCount, hintsUsed, timeToCompleteMs } = result;
  const timeRatio = timeToCompleteMs / baselineTimeMs;

  if (!passed || attemptCount > 3) return 'Again';
  if (hintsUsed > 1 || timeRatio > 2.0) return 'Hard';
  if (hintsUsed === 0 && timeRatio >= 0.8 && timeRatio <= 1.5) return 'Good';
  if (hintsUsed === 0 && timeRatio < 0.8) return 'Easy';
  return 'Good'; // Default
}
```

---

## Pedagogical Framework: Fading Scaffolding

### Three-Stage Progression (Gemini Recommendation)

| Stage | Name | Description | Cognitive Load |
|-------|------|-------------|----------------|
| 1 | **Worked Example** | AI shows complete solution with annotations. User observes. | Low |
| 2 | **Scaffold** | AI builds 70%, user fills critical 30%. Ghost outlines guide placement. | Medium |
| 3 | **Free Recall** | Blank canvas. User reconstructs from memory. | High |

**Implementation:**
```typescript
type ScaffoldLevel = 'worked' | 'scaffold' | 'faded';

interface SandboxInteraction {
  scaffoldLevel: ScaffoldLevel;

  // For 'worked' - solution to animate
  workedSolution?: SolutionAnimation;

  // For 'scaffold' - elements pre-placed
  preplacedElements?: string[]; // element IDs
  ghostOutlines?: GhostOutline[]; // visual hints
}
```

**Progression Logic:**
- First exposure (UNSEEN/EXPOSED): Start at 'worked' or 'scaffold'
- After correct answer (FRAGILE/DEVELOPING): Progress to 'scaffold' or 'faded'
- Review (SOLID/MASTERED): Always 'faded' (full retrieval)

---

## Offline Support Strategy

### Pre-fetch During Session Construction

**Recommendation:** Generate sandbox schemas during Session Construction phase (Step 3 in current architecture).

```typescript
interface SessionSyncPayload {
  sessionId: string;
  feedCards: FeedCard[];

  // Pre-generated sandbox schemas
  sandboxSchemas: SandboxInteraction[];

  // Fallback for offline variations
  variationSeeds: number[]; // For regenerating without LLM
}
```

**Offline Fallback:**
- Cache base schemas to SQLite/AsyncStorage
- Use simple string shuffling for review variations (no LLM needed)
- Queue AI evaluations for sync when online

---

## Accessibility

### Hidden View Technique (Gemini Recommendation)

Canvas elements (Skia/Pixi) are invisible to screen readers. Solution:

```typescript
// Render transparent View layer on top of canvas
<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
  {elements.map(element => (
    <TouchableOpacity
      key={element.id}
      style={{
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: element.dimensions.width,
        height: element.dimensions.height,
        opacity: 0, // Invisible but accessible
      }}
      accessibilityLabel={`${element.type}: ${element.content}`}
      accessibilityHint={getHintForElement(element)}
      accessibilityRole="button"
      onPress={() => handleElementInteraction(element.id)}
    />
  ))}
</View>
```

**Accessibility Requirements:**
- 44px minimum touch targets
- VoiceOver/TalkBack compatible labels
- Haptic feedback on snap-to-target
- Audio cues for successful placement

---

## Branching State Machines (Gemini Round 2: Flat Normalized State)

### For Conditional/Procedural Cognitive Types

**Recommendation:** Use **Flat List with Adjacency** (Redux/Database pattern), NOT nested objects.

**Problem with Nesting:** If you model trees as `{ id: 1, children: [{ id: 2... }] }`, updating Node 5 deep in the tree requires complex recursive immutable updates which hurts React Native performance.

**Solution:** Normalized State
```json
{
  "nodes": {
    "step_1": { "id": "step_1", "text": "Start Engine", "next": ["step_2", "step_3"] },
    "step_2": { "id": "step_2", "text": "Check Fuel", "next": ["step_4"] },
    "step_3": { "id": "step_3", "text": "Check Battery", "next": [] }
  }
}
```

**For Canvas Rendering:** This makes it easy - just iterate through `Object.values(nodes)` and draw lines to `node.next`.

```typescript
interface BranchingInteraction extends SandboxInteraction {
  cognitiveType: 'conditional' | 'procedural';

  // Normalized state machine (flat)
  nodes: Record<string, BranchingNode>;
  initialNodeId: string;
  terminalNodeIds: string[];
}

interface BranchingNode {
  id: string;
  text: string;
  position: { x: number; y: number }; // For canvas rendering
  next: string[]; // IDs of connected nodes
  isCorrectPath: boolean;
  feedback?: string;
}

// Validation: Check if user's traversal matches correct path
interface BranchingValidation {
  type: 'path_traversal';
  correctPath: string[]; // ["step_1", "step_2", "step_4"]
  allowPartialCredit: boolean;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Core Canvas)
- Set up `@shopify/react-native-skia` integration
- Implement basic draggable/dropzone primitives
- Create `SandboxModal` component with gesture handlers
- Implement deterministic evaluation for simple schemas

### Phase 2: Cognitive Type Coverage
- Factual: Fill-in-blank, matching interactions
- Conceptual: Drag-to-build diagram builder
- Procedural: Step sequencer with reordering

### Phase 3: Advanced Interactions
- Conditional: Branching state machine renderer
- Metacognitive: Self-explanation capture + AI evaluation
- Accessibility: Hidden View layer implementation

### Phase 4: Integration
- Schema generation during content analysis
- FSRS rating derivation
- Offline caching and sync
- Session construction integration

---

## Open Questions for User Review

1. **Priority Order:** Which cognitive type interactions should we implement first? (Recommend: Factual → Procedural → Conceptual → Conditional)

2. **AI Evaluation Cost:** For complex interactions, each AI evaluation costs ~$0.002-0.01. Acceptable for v1?

3. **Scaffold Progression:** Should scaffold level be tied to FSRS state automatically, or user-configurable?

4. **Canvas Library:** Confirm React Native Skia vs alternative (Pixi.js with WebView)?

5. **Partial Progress:** If user exits mid-interaction, save state or reset?

---

## References

- [React Native Skia Documentation](https://shopify.github.io/react-native-skia/)
- [Fading Scaffolding in Education](https://en.wikipedia.org/wiki/Instructional_scaffolding)
- [FSRS-5 Algorithm](https://github.com/open-spaced-repetition/fsrs4anki)
- Current specs: `openspec/specs/learning-platform/spec.md` (Phase 6)
