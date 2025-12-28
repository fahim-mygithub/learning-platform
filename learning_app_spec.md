# Learning Engine Product Specification

## Document Information

| Field | Value |
|-------|-------|
| Document Title | AI-Powered Active Learning Platform - Product Specification |
| Version | 1.0 |
| Status | Draft for Validation |
| Last Updated | December 2024 |
| Purpose | Feature validation, development guidance, research alignment verification |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Foundation](#2-research-foundation)
3. [Core Architecture](#3-core-architecture)
4. [Feature Specifications](#4-feature-specifications)
5. [Edge Cases & Exception Handling](#5-edge-cases--exception-handling)
6. [User Experience Flows](#6-user-experience-flows)
7. [Success Metrics](#7-success-metrics)
8. [Technical Requirements](#8-technical-requirements)
9. [Open Questions](#9-open-questions)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Transform passive learning content (videos, PDFs, articles, textbooks) into personalized active learning experiences that produce lasting retention, powered by AI and grounded in cognitive science research.

### 1.2 Core Problem Statement

Knowledge exists predominantly in passive formats (lectures, videos, text), but the brain encodes durably only through active retrieval. Traditional learning asks humans to perform this translation themselves—and they consistently fail, defaulting to ineffective methods (re-reading, highlighting) because they *feel* effective despite producing minimal retention.

### 1.3 Solution Overview

An AI-powered learning engine that:

1. **Analyzes** passive content to extract concepts, relationships, and learning modalities
2. **Generates** active learning materials (retrieval questions, pretests, elaboration prompts)
3. **Schedules** learning optimally using spaced repetition and sleep-aware timing
4. **Assesses** understanding in real-time through multi-signal analysis
5. **Adapts** methods and difficulty to individual learner profiles
6. **Tracks** mastery through evidence-based knowledge modeling

### 1.4 Target User

Adult professionals seeking to learn new domains efficiently, with limited time (10-20 minutes daily) and a history of abandoning passive learning approaches (online courses, video tutorials) due to poor retention.

### 1.5 Key Differentiators

| Traditional Learning Apps | This Platform |
|---------------------------|---------------|
| Deliver content | Transform content into active practice |
| Encourage more consumption | Enforce cognitive limits |
| One-size-fits-all | Personalized method optimization |
| Session-based progress | Mastery-based progression |
| Completion metrics | Retention metrics |

---

## 2. Research Foundation

### 2.1 Foundational Principles

This section maps the scientific research to product decisions. Each finding includes its effect size and how it manifests in the product.

#### 2.1.1 The Testing Effect

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Retrieval practice produces 50-100% better retention than restudying | Primary interaction pattern is generation (user produces answers) not recognition (user selects from options) |
| **Effect Size:** g = 0.50-0.81; free recall g = 0.81 | Free recall prompts ("Explain in your own words...") prioritized over multiple choice |
| **Source:** Roediger & Karpicke (2006); Rowland (2014) meta-analysis | Every concept requires retrieval practice before advancing |
| **Amplification:** Feedback increases effect from d = 0.39 to d = 0.73 | All retrieval attempts receive immediate, explanatory feedback |

#### 2.1.2 Spacing Effect

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Distributed practice dramatically outperforms massed practice | Content broken into multiple sessions across days, never crammed |
| **Effect Size:** d = 0.54-0.85 ("most replicable finding in experimental psychology") | FSRS algorithm schedules optimal review intervals per concept |
| **Source:** Ebbinghaus (1885); Donoghue & Hattie (2021) meta-analysis | Sessions limited by cognitive capacity, not user desire to continue |
| **Key Insight:** Longer gaps = deeper, more durable learning | Intervals expand as mastery increases |

#### 2.1.3 Successive Relearning

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Combining retrieval + spacing + criterion mastery produces extraordinary gains | Default learning protocol requires 3+ successful sessions per concept |
| **Effect Size:** d = 1.52-4.19 (highest in entire research base) | Concepts tracked through state machine (Exposed → Fragile → Developing → Solid → Mastered) |
| **Source:** Rawson & Dunlosky research program | Time per concept tracked and expected to decrease across sessions (40-50s → 10-15s) |
| **Concrete Results:** 68% retention at 1 month vs ~11% baseline | Criterion mastery required before advancing to dependent concepts |

#### 2.1.4 Pretesting Effect

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Testing before learning improves subsequent encoding, even when 95% wrong | Every session begins with pretest on upcoming material |
| **Effect Size:** d = 1.1; 12-13 percentage point advantages | Questions generated from content user hasn't seen yet |
| **Source:** Pan & Yan (2021); Richland et al. (2009) | User explicitly told wrong answers are expected and beneficial |
| **Mechanism:** Activates prior knowledge, creates "knowledge gaps," directs attention | Pretest responses analyzed to identify misconceptions for explicit addressing |

#### 2.1.5 Interleaving

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Mixing topics during practice improves long-term retention and transfer | Review sessions interleave concepts from different topics/sessions |
| **Effect Size:** g = 0.42 overall; d = 0.83 for mathematics | When learning multiple courses, practice mixed across courses |
| **Source:** Brunmair & Richter (2019); Rohrer et al. (2020) | Blocked practice available for true novices, then transitions to interleaved |
| **Mechanism:** Forces discrimination learning, provides natural spacing | Interleaving degree adapts based on user tolerance and performance |

#### 2.1.6 Sleep-Based Consolidation

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Memory consolidation occurs during sleep; critical 24-hour window | No new material introduced within 2 hours of typical bedtime |
| **Effect Size:** Sleep deprivation reduces encoding by up to 40%; post-learning sleep improves retention by 20.6% | Morning sessions test previous day's material to measure consolidation |
| **Source:** Matthew Walker, UC Berkeley; Potkin & Bunney (2012) | Optional pre-sleep review session (light review, not new material) |
| **Mechanism:** Sharp-wave ripples + sleep spindles transfer memories from hippocampus to neocortex | Sleep duration optionally tracked and factors into capacity calculation |

#### 2.1.7 Cognitive Load Theory

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Working memory limited to 3-4 chunks; exceeding capacity blocks learning | Maximum 3-4 new concepts per session (hard limit) |
| **Effect Size:** Foundational constraint on all learning | Cognitive capacity budget calculated and enforced |
| **Source:** Cowan (2010); Sweller (1988) | Complex concepts chunked into sub-concepts automatically |
| **Mechanism:** Architectural constraint of human cognition | Session terminates or shifts to review when capacity depleted |

#### 2.1.8 Desirable Difficulties

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Learning that feels harder during practice produces better long-term results | App deliberately makes practice effortful (spacing, interleaving, generation) |
| **Effect Size:** Meta-principle encompassing spacing, interleaving, retrieval | User education about why difficulty is beneficial |
| **Source:** Robert Bjork research program | "Illusion of fluency" from easy methods explicitly counteracted |
| **Key Insight:** Subjective ease during learning negatively predicts retention | Progress metrics focus on retention, not completion speed |

#### 2.1.9 Feedback Timing and Quality

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Feedback amplifies testing effect by approximately 2x | Every retrieval attempt receives feedback |
| **Effect Size:** d = 0.73 with feedback vs d = 0.39 without | AI generates explanatory feedback (why right/wrong), not just correct/incorrect |
| **Source:** Rowland (2014) meta-analysis | Feedback addresses specific misconceptions revealed in response |
| **Quality Matters:** Elaborative feedback > simple correct/incorrect | Source material referenced in feedback when helpful |

#### 2.1.10 Elaborative Interrogation

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** "Why" and "how" questions deepen understanding | Elaborative prompts generated for conceptual material |
| **Effect Size:** d = 0.59 | Questions connect new concepts to prior knowledge |
| **Source:** Dunlosky et al. (2013) | Method reserved for intermediate+ learners (requires prior knowledge) |
| **Limitation:** Requires sufficient prior knowledge to answer | System tracks prerequisites and applies appropriately |

#### 2.1.11 Protégé Effect

| Research Finding | Product Implementation |
|------------------|------------------------|
| **Finding:** Teaching improves learning dramatically | "Teach-back" feature where AI plays naive student role |
| **Effect Size:** ~50% improvement vs restudying | AI asks clarifying questions, expresses confusion appropriately |
| **Source:** Koh et al. (2018) | Available for conceptual and declarative material |
| **Mechanism:** Increases metacognitive processing, identifies knowledge gaps | User explanations analyzed for completeness and misconceptions |

### 2.2 Methods Explicitly NOT Prioritized

Based on research showing limited effectiveness:

| Method | Research Finding | Product Decision |
|--------|------------------|------------------|
| **Highlighting** | d = 0.44; may impair relational thinking | Not included as a feature |
| **Re-reading** | d = 0.53; creates "illusion of fluency" | Actively discouraged; retrieval substituted |
| **Passive video watching** | 5-10% retention without active elements | Source videos chunked and interspersed with active practice |
| **Massed practice** | Inferior to distributed practice | Sessions enforce breaks; cannot "binge" |
| **Gamification (for learning)** | g = 0.72 engagement but g = 0.49 learning (inconsistent) | Limited gamification; focus on intrinsic motivation via progress |

### 2.3 Modality-Specific Research Applications

| Learning Modality | Applicable Methods | Product Implementation |
|-------------------|-------------------|------------------------|
| **Declarative/Factual** | SRS, retrieval practice, successive relearning | Flashcard-style retrieval with FSRS scheduling |
| **Conceptual** | Elaborative interrogation, productive failure, Socratic dialogue | "Why/how" prompts, problems before instruction, AI dialogue |
| **Procedural (Cognitive)** | Worked examples, step-by-step retrieval | Procedure decomposition, step-cued recall |
| **Procedural (Motor)** | Spacing, mental rehearsal (limited app applicability) | Coaching mode: preparation + consolidation, not primary practice |
| **Software Proficiency** | UI simulation, decision scenarios, shortcut drilling | Interactive mockups, "what would you do" scenarios |
| **Language** | SRS vocabulary, conversation simulation, pronunciation feedback | Full support with speech recognition integration |
| **Perceptual** | Massive example exposure, discrimination training | Example curation, progressive difficulty, contrastive pairs |
| **Strategic** | Problem generation, case-based scenarios | Novel problem generation, transfer testing |

---

## 3. Core Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT LAYER                             │
│              (Video, PDF, Article, Text, Audio Upload)               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    1. CONTENT ANALYSIS PIPELINE                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Extraction  │ │  Concept    │ │  Modality   │ │ Difficulty  │   │
│  │ (transcript,│ │  Mapping    │ │ Classific.  │ │ Estimation  │   │
│  │  OCR, parse)│ │ (knowledge  │ │ (declarative│ │ (1-10 per   │   │
│  │             │ │  graph)     │ │  conceptual)│ │  concept)   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 2. LEARNING MATERIAL GENERATION                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Pretests   │ │  Retrieval  │ │ Elaboration │ │  Transfer   │   │
│  │             │ │  Questions  │ │  Prompts    │ │  Problems   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   3. COGNITIVE LOAD BUDGETING                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Capacity   │ │   Sleep     │ │  Circadian  │ │   Daily     │   │
│  │  Baseline   │ │  Modifier   │ │  Modifier   │ │   Load      │   │
│  │  (100 units)│ │  (-40%/+10%)│ │  (-30%/+15%)│ │  Tracking   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    4. SESSION CONSTRUCTION                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Review     │ │    New      │ │   Method    │ │   Time      │   │
│  │  Selection  │ │  Material   │ │  Selection  │ │  Budgeting  │   │
│  │  (FSRS due) │ │  (capacity) │ │  (user fit) │ │             │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 5. REAL-TIME ASSESSMENT ENGINE                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Accuracy   │ │  Latency    │ │ Explanation │ │ Confidence  │   │
│  │  Tracking   │ │  Analysis   │ │  Quality    │ │ Calibration │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    6. KNOWLEDGE STATE MODEL                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Concept    │ │  Strength   │ │   FSRS      │ │   Mastery   │   │
│  │  States     │ │  Decay      │ │  Scheduling │ │   Gates     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 7. ADAPTIVE OPTIMIZATION ENGINE                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Method    │ │  Explore/   │ │   Session   │ │   Profile   │   │
│  │Effectiveness│ │  Exploit    │ │  Scoring    │ │ Convergence │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Specifications

#### 3.2.1 Content Analysis Pipeline

**Purpose:** Transform raw passive content into structured, sequenced learning units.

**Inputs:**
- Video files (MP4, MOV, WebM)
- PDF documents
- Text/Markdown files
- URLs (YouTube, articles)
- Audio files (MP3, M4A)

**Processing Steps:**

| Step | Description | Output |
|------|-------------|--------|
| Extraction | Transcribe video/audio; OCR images; parse text structure | Raw text + visual elements |
| Concept Identification | Identify discrete learnable units | List of concepts with definitions |
| Relationship Mapping | Determine prerequisites, relationships, hierarchies | Knowledge graph |
| Modality Classification | Categorize each concept by learning type | Modality tags per concept |
| Difficulty Estimation | Score complexity (1-10) | Difficulty scores |
| Sequencing | Order concepts by dependencies | Leveled curriculum |

**Concept Extraction Rules:**

| Content Type | Extraction Pattern |
|--------------|-------------------|
| Definitions | Explicit ("X is...") and implicit definitions |
| Procedures | Step sequences, how-to instructions |
| Relationships | Causal (X causes Y), taxonomic (X is type of Y), temporal |
| Examples | Concrete instances illustrating concepts |
| Analogies | Comparisons used to explain concepts |
| Prerequisites | Knowledge assumed by the content |

**Difficulty Estimation Formula:**

```
Difficulty Score = 
  (0.25 × Abstractness) +
  (0.25 × Prerequisite Depth) +
  (0.20 × Relational Complexity) +
  (0.15 × Procedural Steps) +
  (0.15 × Domain Novelty)

Where each factor is scored 1-10.
```

**Output Structure:**

```json
{
  "course_id": "uuid",
  "source_title": "Options Trading for Beginners",
  "source_type": "video",
  "source_duration": "32:15",
  "total_concepts": 18,
  "levels": [
    {
      "level_id": 1,
      "name": "Foundations",
      "concepts": [
        {
          "concept_id": "c001",
          "name": "What is an Option",
          "modality": "conceptual",
          "difficulty": 4,
          "prerequisites": [],
          "relationships": ["c002", "c003"],
          "source_timestamp": "00:45-02:30",
          "definition": "A contract giving the right...",
          "key_points": ["right not obligation", "fixed price", "expiration date"]
        }
      ],
      "mastery_threshold": 0.80
    }
  ],
  "knowledge_graph": { ... }
}
```

**Research Basis:**
- Cognitive Load Theory: Chunking complex material into manageable units
- Prerequisite mapping: Mastery-based progression (+5-8 months effect)
- Difficulty sequencing: Worked examples for novices, productive failure for intermediates

---

#### 3.2.2 Learning Material Generation

**Purpose:** Create active learning materials from extracted concepts.

**Material Types Generated:**

| Material Type | Description | Research Basis | When Used |
|---------------|-------------|----------------|-----------|
| **Pretest Questions** | Questions about content not yet seen | Pretesting effect (d = 1.1) | Before every new concept introduction |
| **Free Recall Prompts** | Open-ended "explain in your own words" | Testing effect - free recall (g = 0.81) | Primary retrieval method |
| **Cued Recall** | Fill-in-blank, complete the definition | Testing effect - cued recall (g = 0.50) | Supplementary retrieval |
| **Recognition Questions** | Multiple choice, true/false | Testing effect - recognition (lower) | Early exposure, confidence building |
| **Application Scenarios** | Novel situations requiring concept application | Transfer testing | Intermediate to advanced |
| **Elaboration Prompts** | "Why does..." "How does..." questions | Elaborative interrogation (d = 0.59) | Conceptual material, intermediate+ |
| **Discrimination Questions** | "What's the difference between X and Y?" | Interleaving mechanism | Related concepts |
| **Teach-Back Prompts** | "Explain this to someone who doesn't know..." | Protégé effect (~50% improvement) | Conceptual consolidation |
| **Productive Failure Problems** | Problems presented before instruction | Productive failure (d = 0.36, up to 3x) | STEM conceptual material |

**Generation Quality Requirements:**

| Requirement | Specification |
|-------------|---------------|
| Variety | Minimum 5 distinct questions per concept |
| Difficulty gradient | Questions span recognition → application → transfer |
| Distractor quality | MC distractors based on common misconceptions |
| Answer validation | AI can evaluate free-response accuracy |
| Feedback depth | Each question has explanatory feedback prepared |

**Question Generation Prompt Template:**

```
Given this concept:
- Name: {concept_name}
- Definition: {definition}
- Key points: {key_points}
- Related concepts: {relationships}
- Modality: {modality}
- Common misconceptions: {misconceptions}

Generate:
1. One pretest question (to be asked before learning)
2. Two free recall prompts (explain in own words)
3. One application scenario (novel situation)
4. One elaboration prompt (why/how question)
5. One discrimination question (vs related concept)

For each question, also generate:
- Expected correct answer criteria
- Common incorrect patterns to detect
- Explanatory feedback for correct answer
- Corrective feedback for common errors
```

---

#### 3.2.3 Cognitive Load Budgeting System

**Purpose:** Prevent overload by managing daily learning capacity.

**Capacity Model:**

```
Effective Capacity = Base Capacity × Sleep Modifier × Circadian Modifier × Fatigue Modifier

Where:
- Base Capacity = 100 units
- Sleep Modifier = f(hours slept last night)
- Circadian Modifier = f(time of day)
- Fatigue Modifier = f(capacity already consumed today)
```

**Sleep Modifier Table:**

| Hours Slept | Modifier | Research Basis |
|-------------|----------|----------------|
| < 5 hours | 0.60 | Walker: 40% encoding reduction with deprivation |
| 5-6 hours | 0.80 | Partial deprivation effects |
| 6-7 hours | 0.90 | Mild reduction |
| 7-8 hours | 1.00 | Baseline (optimal) |
| 8+ hours | 1.10 | Slight boost from extra sleep |

**Circadian Modifier Table:**

| Time Window | Modifier | Rationale |
|-------------|----------|-----------|
| 6-9 AM | 1.00 | Morning baseline |
| 9-11 AM | 1.15 | Peak alertness for most chronotypes |
| 11 AM - 1 PM | 1.00 | Baseline |
| 1-3 PM | 0.85 | Post-lunch dip |
| 3-6 PM | 1.00 | Afternoon recovery |
| 6-8 PM | 1.00 | Evening baseline |
| 8-10 PM | 0.95 | Evening decline begins |
| 10 PM - 12 AM | 0.85 | Late evening reduction |
| After 12 AM | 0.70 | Consolidation window approaching |

**Fatigue Modifier (Intra-Day):**

| Capacity Used | Modifier on New Material | Behavior |
|---------------|-------------------------|----------|
| 0-50% | 1.00 | Full efficiency |
| 50-75% | 0.90 | Slight reduction, no warning |
| 75-90% | 0.75 | Warn user, suggest stopping |
| 90-100% | 0.50 | Strong warning, recommend review only |
| >100% | 0.00 | Block new material entirely |

**Concept Load Costs:**

| Concept Type | Base Cost | Modifiers |
|--------------|-----------|-----------|
| Simple declarative fact | 3 units | +1 if abstract, +2 if novel domain |
| Definition with relationships | 4 units | +1 per unfamiliar related concept |
| Relational/conceptual | 5 units | +1 per prerequisite learned same session |
| Procedural (3-5 steps) | 7 units | +2 if software-based |
| Procedural (6+ steps) | 12 units | Should be auto-chunked |
| Strategic/decision | 8 units | +3 if multiple conditions |
| Perceptual pattern | 6 units | -2 if multiple examples shown |

**Review Cost:**
- Review items cost 30-50% of original learning cost
- Cost decreases as strength increases

**User-Facing Capacity Display:**

```
┌─────────────────────────────────────────┐
│  TODAY'S LEARNING CAPACITY              │
│  ████████████████░░░░░░░░  65%          │
│                                         │
│  ██████████  Already used (35%)         │
│  ██████      Available for new (30%)    │
│  ░░░░░░░░░░  Reserved buffer (35%)      │
│                                         │
│  Recommended: 2 new concepts + review   │
└─────────────────────────────────────────┘
```

---

#### 3.2.4 Session Construction Engine

**Purpose:** Build optimal learning sessions within capacity constraints.

**Session Structure:**

```
SESSION TEMPLATE
================

1. CAPACITY CHECK (automatic)
   - Calculate available capacity
   - Determine new material budget
   - Identify due reviews

2. PRETEST (2-3 questions, ~2 min)
   - Questions on concepts to be introduced
   - Primes attention, reveals misconceptions

3. REVIEW BLOCK (if due items exist, ~3-5 min)
   - Spaced repetition items due today
   - Interleaved with new material
   
4. NEW MATERIAL BLOCKS (repeated for each concept)
   a. Concept Introduction (~1 min)
   b. Immediate Retrieval (~1 min)
   c. [Next concept or interleaved review]

5. CONSOLIDATION PRACTICE (~3-5 min)
   - Mixed retrieval across all session concepts
   - Application and transfer questions
   - Elaboration prompts

6. SESSION WRAP-UP
   - Update concept states
   - Show progress
   - Schedule next session
```

**Session Construction Algorithm:**

```python
def construct_session(user, course, time_available):
    # Step 1: Calculate capacity
    capacity = calculate_effective_capacity(user)
    
    # Step 2: Get due reviews
    due_reviews = fsrs.get_due_items(user, course)
    review_cost = sum(item.review_cost for item in due_reviews)
    
    # Step 3: Calculate new material budget  
    new_budget = capacity - review_cost
    
    # Step 4: Select new concepts
    available_concepts = get_unlocked_concepts(user, course)
    selected_concepts = []
    running_cost = 0
    
    for concept in prioritize_by_dependency(available_concepts):
        cost = calculate_concept_cost(concept, user, selected_concepts)
        if running_cost + cost <= new_budget and len(selected_concepts) < 4:
            selected_concepts.append(concept)
            running_cost += cost
        if len(selected_concepts) >= 4:  # Hard limit
            break
    
    # Step 5: Select methods based on user profile
    methods = select_methods(user.method_effectiveness, selected_concepts)
    
    # Step 6: Generate session content
    session = Session(
        pretest=generate_pretest(selected_concepts),
        reviews=interleave(due_reviews, selected_concepts),
        new_concepts=selected_concepts,
        methods=methods,
        consolidation=generate_consolidation_practice(selected_concepts),
        estimated_duration=estimate_duration(selected_concepts, due_reviews)
    )
    
    # Step 7: Time-based adjustments
    if is_near_bedtime(user):
        session = shift_to_review_only(session)
    
    return session
```

**Session Length Guidelines:**

| User Preference | Target Duration | New Concepts | Review Items |
|-----------------|-----------------|--------------|--------------|
| 5-10 minutes | 8 min | 1-2 | 5-10 |
| 10-20 minutes | 15 min | 2-3 | 10-15 |
| 20-30 minutes | 25 min | 3-4 | 15-25 |

**Interleaving Strategy:**

- New concepts interleaved with reviews: Review → New → Review → New → Review
- Cross-topic interleaving when multiple courses active
- Interleaving degree adapts to user tolerance (some find it frustrating)

---

#### 3.2.5 Real-Time Assessment Engine

**Purpose:** Measure understanding during sessions to enable in-session adaptation.

**Signal Types:**

| Signal | Measurement | Interpretation |
|--------|-------------|----------------|
| **Accuracy** | Correct/Incorrect/Partial | Direct measure of knowledge state |
| **Latency** | Time from question display to response | Automaticity indicator |
| **Confidence** | Self-reported (1-5 scale) | Calibration assessment |
| **Explanation Quality** | AI-evaluated free response | Depth of understanding |
| **Transfer Success** | Performance on novel applications | True comprehension vs memorization |

**Combined Signal Interpretation Matrix:**

| Accuracy | Latency | Confidence | Interpretation | Action |
|----------|---------|------------|----------------|--------|
| Correct | Fast | High | Strong encoding | Advance, space longer |
| Correct | Fast | Low | Underconfident | Encourage, normal spacing |
| Correct | Slow | High | Developing automaticity | More practice needed |
| Correct | Slow | Low | Fragile knowledge | More practice, shorter spacing |
| Incorrect | Fast | High | **Confident misconception** | **Priority intervention** |
| Incorrect | Fast | Low | Guessing | Re-teach |
| Incorrect | Slow | High | Partial knowledge, overconfidence | Clarify, more examples |
| Incorrect | Slow | Low | Appropriate uncertainty | Re-teach, simpler questions |

**Explanation Quality Evaluation:**

AI evaluates free responses against criteria:

```json
{
  "evaluation_criteria": {
    "key_terms_present": ["list of required terms"],
    "relationships_articulated": ["list of required connections"],
    "common_misconceptions": ["list to check for"],
    "acceptable_variations": ["list of valid alternative phrasings"]
  },
  "scoring": {
    "complete": "All key terms + relationships present",
    "partial": "Some key elements missing but fundamentally correct",
    "misconception": "Contains identified misconception",
    "insufficient": "Too vague or missing critical elements"
  }
}
```

**In-Session Adaptation Rules:**

| Pattern Detected | Adaptation |
|------------------|------------|
| Multiple fast+correct | Skip remaining basic questions, advance to application |
| Fast+incorrect (confident misconception) | Halt progression, address misconception immediately |
| Declining accuracy over session | Suggest shortening session, shift to review |
| Slow responses increasing | Fatigue detected, offer break or end session |
| Consistent overconfidence | Increase difficulty, add more transfer questions |
| Consistent underconfidence | Add encouragement, start with easier questions |

**Misconception Detection Protocol:**

When confident misconception detected:

1. Flag the specific misconception
2. Provide immediate corrective feedback
3. Explain correct understanding with contrast
4. Schedule corrective retrieval within same session (3-5 minutes later)
5. Add discriminative questions to future reviews
6. Track if misconception resurfaces

---

#### 3.2.6 Knowledge State Model

**Purpose:** Track what each user knows at concept-level granularity.

**Concept State Machine:**

```
                    ┌─────────────┐
                    │   UNSEEN    │
                    └──────┬──────┘
                           │ First exposure
                           ▼
                    ┌─────────────┐
                    │   EXPOSED   │
                    └──────┬──────┘
                           │ First retrieval attempt
                           ▼
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌─────────────┐          ┌─────────────┐
      │   FRAGILE   │          │ MISCONCEIVED│
      │  (correct   │          │  (confident │
      │   but weak) │          │   but wrong)│
      └──────┬──────┘          └──────┬──────┘
             │                        │
             │ 2+ successful          │ Corrected +
             │ retrievals             │ re-retrieval
             ▼                        ▼
      ┌─────────────┐          ┌─────────────┐
      │ DEVELOPING  │◄─────────┤  CORRECTED  │
      │ (consistent │          │             │
      │  recall)    │          │             │
      └──────┬──────┘          └─────────────┘
             │
             │ Fast + correct + transfer
             ▼
      ┌─────────────┐
      │    SOLID    │
      │  (ready for │
      │   spacing)  │
      └──────┬──────┘
             │
             │ Criterion met across
             │ 3+ spaced sessions
             ▼
      ┌─────────────┐
      │  MASTERED   │
      └─────────────┘
```

**State Transition Criteria:**

| Transition | Criteria |
|------------|----------|
| UNSEEN → EXPOSED | Concept introduced to user |
| EXPOSED → FRAGILE | First correct retrieval attempt |
| EXPOSED → MISCONCEIVED | First incorrect + high confidence |
| FRAGILE → DEVELOPING | 2+ consecutive correct retrievals |
| DEVELOPING → SOLID | Fast + correct + successful transfer question |
| SOLID → MASTERED | Criterion met across 3+ sessions with expanding intervals |
| MISCONCEIVED → CORRECTED | Corrective feedback + successful re-retrieval |
| CORRECTED → DEVELOPING | 2+ correct retrievals post-correction |
| Any → Degraded | Incorrect after period of success (strength decayed) |

**Strength Decay Model (FSRS-based):**

```
Recall Probability at time t:
R(t) = e^(-t/S)

Where:
- t = time since last review
- S = stability (learned per user per concept)
  
Stability increases with each successful review:
S_new = S_old × (1 + a × e^(-b × S_old))

Where a and b are personalized parameters.
```

**Knowledge Model Data Structure:**

```json
{
  "user_id": "user_123",
  "course_id": "options_trading",
  "concepts": {
    "c001": {
      "name": "What is an Option",
      "state": "MASTERED",
      "strength": 0.94,
      "stability": 45.2,
      "last_review": "2024-12-23T20:15:00Z",
      "next_review": "2024-01-07T00:00:00Z",
      "total_reviews": 7,
      "successful_reviews": 7,
      "average_latency_ms": 4200,
      "misconceptions_history": [],
      "session_history": [
        {"session_id": "s001", "result": "correct", "latency_ms": 8500},
        {"session_id": "s003", "result": "correct", "latency_ms": 5200},
        ...
      ]
    },
    "c005": {
      "name": "Time Value",
      "state": "DEVELOPING",
      "strength": 0.72,
      "stability": 3.1,
      "last_review": "2024-12-24T20:30:00Z",
      "next_review": "2024-12-25T12:00:00Z",
      "misconceptions_history": [
        {
          "misconception": "Confused time value with intrinsic value",
          "detected": "2024-12-22",
          "corrected": "2024-12-22",
          "recurred": false
        }
      ]
    }
  },
  "prerequisite_gaps": [],
  "learning_velocity": {
    "concepts_per_week": 8.3,
    "consolidation_rate": 0.76,
    "avg_sessions_to_mastery": 4.2
  }
}
```

---

#### 3.2.7 Adaptive Optimization Engine

**Purpose:** Learn what methods work best for each individual user.

**Method Effectiveness Tracking:**

For each learning method, track per user:

```json
{
  "method_id": "free_recall",
  "uses": 47,
  "retention_score": 0.82,
  "engagement_score": 0.71,
  "composite_score": 0.78,
  "by_modality": {
    "declarative": {"uses": 23, "retention": 0.85},
    "conceptual": {"uses": 18, "retention": 0.79},
    "procedural": {"uses": 6, "retention": 0.78}
  },
  "trend": "stable"
}
```

**Composite Score Calculation:**

```
Composite Score = (w1 × Retention Score) + (w2 × Engagement Score)

Default weights:
- w1 = 0.70 (retention prioritized)
- w2 = 0.30 (engagement matters but less)

Engagement measured by:
- Completion rate for that method type
- Absence of skips
- Session continuation after method use
```

**Explore/Exploit Algorithm:**

```python
def select_method(user_profile, concept, session_context):
    applicable_methods = get_applicable_methods(concept.modality)
    
    # Calculate selection probability for each method
    probabilities = {}
    for method in applicable_methods:
        effectiveness = user_profile.method_scores.get(method, 0.5)
        uses = user_profile.method_uses.get(method, 0)
        
        # Exploration bonus decays with use
        exploration_bonus = 0.3 / sqrt(uses + 1)
        
        probabilities[method] = effectiveness * (1 + exploration_bonus)
    
    # Normalize probabilities
    total = sum(probabilities.values())
    probabilities = {m: p/total for m, p in probabilities.items()}
    
    # Ensure minimum exploration (10% floor)
    for method in applicable_methods:
        probabilities[method] = max(probabilities[method], 0.10)
    
    # Re-normalize after floor
    total = sum(probabilities.values())
    probabilities = {m: p/total for m, p in probabilities.items()}
    
    # Sample method
    return weighted_random_choice(probabilities)
```

**Exploration Triggers:**

| Trigger | Action |
|---------|--------|
| New content modality encountered | Force exploration of modality-appropriate methods |
| Method effectiveness declining | Increase exploration probability |
| User requests variety | Temporary boost to exploration |
| Every 10th session | Forced exploration session (try 2+ under-tested methods) |
| Profile convergence < 50% | Higher exploration ratio |
| Profile convergence > 80% | Exploitation-heavy ratio |

**Profile Convergence Measurement:**

```
Convergence = (# of methods with 20+ uses and stable trend) / (total applicable methods)

A method trend is "stable" if:
- Retention score variance over last 10 uses < 0.05
- No significant trend (slope of rolling average near 0)
```

**Personalization Dimensions:**

| Dimension | Options | How Learned |
|-----------|---------|-------------|
| Question format preference | Free recall, cued, MC, explain | Retention comparison across formats |
| Optimal session length | 5, 10, 15, 20, 25 min | Completion rates, fatigue patterns |
| Interleaving tolerance | High, medium, low | Performance under different mix ratios |
| Difficulty preference | Gradual, challenging | Engagement + retention at different levels |
| Best time of day | Morning, afternoon, evening | Performance variance by time |
| Feedback preference | Immediate, brief pause, detailed | Engagement signals |

---

### 3.3 Data Architecture & Persistence

#### 3.3.1 Overview

All user data, projects, sources, and learning progress are persistently stored with the following hierarchy:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  USER ACCOUNT                                                        │
│  └── User Profile (preferences, global settings)                    │
│  └── Learning Profile (cross-project analytics)                    │
│  └── PROJECTS[]                                                      │
│       └── Project 1: "Options Trading Mastery"                      │
│            └── SOURCES[]                                             │
│                 └── Source A: "Options Basics" (video)              │
│                 └── Source B: "Advanced Greeks" (PDF)               │
│                 └── Source C: "Trading Strategies" (video)         │
│            └── UNIFIED KNOWLEDGE GRAPH                              │
│            └── ROADMAP (generated from all sources)                 │
│            └── PROGRESS STATE                                        │
│            └── INTERACTION PREFERENCES                              │
│       └── Project 2: "Conversational Spanish"                       │
│            └── SOURCES[]                                             │
│            └── UNIFIED KNOWLEDGE GRAPH                              │
│            └── ROADMAP                                               │
│            └── PROGRESS STATE                                        │
│            └── INTERACTION PREFERENCES                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 User Account Model

**Purpose:** Authenticate users and store cross-project preferences and analytics.

```json
{
  "user_id": "usr_a1b2c3d4",
  "account": {
    "email": "user@example.com",
    "created_at": "2024-01-15T10:00:00Z",
    "last_login": "2024-12-26T08:30:00Z",
    "subscription_tier": "premium",
    "auth_provider": "email | google | apple"
  },
  "global_preferences": {
    "default_session_duration_min": 15,
    "notification_settings": {
      "daily_reminder": true,
      "reminder_time": "09:00",
      "streak_alerts": true
    },
    "accessibility": {
      "font_size": "medium",
      "high_contrast": false,
      "audio_speed": 1.0
    }
  },
  "learning_profile": {
    "total_learning_time_min": 4520,
    "total_concepts_mastered": 342,
    "current_streak_days": 12,
    "longest_streak_days": 45,
    "preferred_time_of_day": "morning",
    "avg_session_duration_min": 14.2,
    "cross_project_method_effectiveness": {
      "dialogue_simulator": 0.87,
      "free_recall": 0.82,
      "spaced_repetition": 0.91
    }
  }
}
```

**Authentication Methods:**
- Email/password with verification
- OAuth (Google, Apple)
- Optional: SSO for enterprise deployments

**Data Privacy:**
- All user data encrypted at rest
- User can export all data (GDPR compliance)
- User can delete account and all associated data
- Learning content stored separately from PII

#### 3.3.3 Project Model

**Purpose:** Group related sources into a coherent learning experience with a unified roadmap.

**Design Principle:** A project represents a learning goal. Multiple sources contribute to that goal. The AI synthesizes all sources into one integrated roadmap.

```json
{
  "project_id": "prj_x7y8z9",
  "user_id": "usr_a1b2c3d4",
  "metadata": {
    "title": "Options Trading Mastery",
    "description": "Complete options education from basics to advanced strategies",
    "created_at": "2024-03-01T10:00:00Z",
    "last_accessed": "2024-12-26T08:30:00Z",
    "status": "active",
    "cover_image": "url_or_generated"
  },
  "sources": [
    {
      "source_id": "src_001",
      "added_at": "2024-03-01T10:00:00Z",
      "status": "analyzed"
    },
    {
      "source_id": "src_002", 
      "added_at": "2024-03-15T14:00:00Z",
      "status": "analyzed"
    },
    {
      "source_id": "src_003",
      "added_at": "2024-06-01T09:00:00Z",
      "status": "analyzing"
    }
  ],
  "roadmap_id": "rmp_abc123",
  "progress_state_id": "pgs_def456",
  "interaction_preferences_id": "ipr_ghi789",
  "settings": {
    "daily_goal_min": 15,
    "target_completion_date": "2024-09-01",
    "difficulty_preference": "challenging",
    "interleave_sources": true
  }
}
```

**Project Lifecycle:**

| State | Description |
|-------|-------------|
| **draft** | Project created, no sources yet |
| **analyzing** | Sources being processed |
| **ready** | Roadmap generated, ready to learn |
| **active** | User actively learning |
| **paused** | User paused (vacation mode) |
| **completed** | All roadmap milestones achieved |
| **maintenance** | In long-term retention mode |

#### 3.3.4 Source Model

**Purpose:** Store individual learning content files and their analysis results.

```json
{
  "source_id": "src_001",
  "project_id": "prj_x7y8z9",
  "user_id": "usr_a1b2c3d4",
  "metadata": {
    "title": "Options Trading Fundamentals",
    "original_filename": "options_course_part1.mp4",
    "source_type": "video",
    "mime_type": "video/mp4",
    "duration_seconds": 3600,
    "file_size_bytes": 524288000,
    "external_url": null,
    "added_at": "2024-03-01T10:00:00Z"
  },
  "storage": {
    "original_file_url": "s3://bucket/users/usr_a1b2c3d4/sources/src_001/original.mp4",
    "transcript_url": "s3://bucket/users/usr_a1b2c3d4/sources/src_001/transcript.json",
    "processed_assets_url": "s3://bucket/users/usr_a1b2c3d4/sources/src_001/assets/"
  },
  "analysis_status": {
    "status": "complete",
    "started_at": "2024-03-01T10:05:00Z",
    "completed_at": "2024-03-01T10:25:00Z",
    "error": null
  },
  "analysis_results": {
    "concepts_extracted": 45,
    "total_duration_covered_seconds": 3540,
    "modality_breakdown": {
      "declarative_factual": 15,
      "declarative_conceptual": 18,
      "procedural": 8,
      "conditional": 4
    },
    "difficulty_range": {"min": 2, "max": 7, "avg": 4.2},
    "prerequisite_concepts_assumed": ["basic_math", "stock_market_basics"],
    "key_topics": ["calls", "puts", "strike_price", "expiration", "premium"]
  },
  "concepts": [
    {
      "concept_id": "cpt_001",
      "name": "Call Option Definition",
      "source_timestamp_start": 120,
      "source_timestamp_end": 240
    }
  ]
}
```

**Supported Source Types:**

| Type | Formats | Processing |
|------|---------|------------|
| Video | MP4, MOV, WebM, YouTube URL | Transcription + visual extraction |
| Audio | MP3, M4A, WAV, podcast URL | Transcription |
| Document | PDF, DOCX | OCR + text extraction |
| Text | MD, TXT, HTML | Direct parsing |
| Web | Article URLs | Content extraction |
| Slides | PPTX, Google Slides | Slide-by-slide extraction |

#### 3.3.5 Unified Knowledge Graph

**Purpose:** Integrate concepts from all sources in a project into a single coherent graph.

**Challenge:** Multiple sources may cover the same concept differently, have overlapping content, or present information in different sequences. The AI must reconcile these into one unified structure.

```json
{
  "knowledge_graph_id": "kg_m1n2o3",
  "project_id": "prj_x7y8z9",
  "version": 3,
  "last_updated": "2024-06-01T10:00:00Z",
  "sources_integrated": ["src_001", "src_002", "src_003"],
  "concepts": [
    {
      "concept_id": "cpt_unified_001",
      "name": "Call Option",
      "description": "Synthesized from multiple sources",
      "source_mappings": [
        {"source_id": "src_001", "original_concept_id": "cpt_001", "timestamp": "2:00-4:00"},
        {"source_id": "src_002", "original_concept_id": "cpt_pdf_12", "pages": "15-17"}
      ],
      "difficulty": 3,
      "cognitive_type": "declarative_conceptual",
      "prerequisites": [],
      "unlocks": ["cpt_unified_005", "cpt_unified_008"],
      "mastery_state": "developing",
      "fsrs_data": {}
    }
  ],
  "relationships": [
    {
      "from": "cpt_unified_001",
      "to": "cpt_unified_002",
      "type": "contrasts_with",
      "notes": "Calls vs Puts"
    },
    {
      "from": "cpt_unified_003",
      "to": "cpt_unified_001",
      "type": "prerequisite_for"
    }
  ],
  "levels": [
    {
      "level": 1,
      "name": "Foundations",
      "concepts": ["cpt_unified_001", "cpt_unified_002", "cpt_unified_003"],
      "sources_contributing": ["src_001"]
    },
    {
      "level": 2,
      "name": "Core Mechanics",
      "concepts": ["cpt_unified_004", "cpt_unified_005"],
      "sources_contributing": ["src_001", "src_002"]
    }
  ]
}
```

**Multi-Source Integration Logic:**

```
WHEN new source added to project:

1. ANALYZE new source independently
   → Extract concepts, relationships, difficulty

2. MATCH to existing knowledge graph
   → Find overlapping concepts (semantic similarity)
   → Identify new concepts not yet covered
   → Detect contradictions or alternative explanations

3. MERGE into unified graph
   FOR each new concept:
       IF matches existing concept (similarity > 0.85):
           → Link as alternative source
           → Keep richer explanation as primary
           → Note both source references
       ELIF extends existing concept:
           → Add as child/detail concept
           → Link to parent
       ELSE:
           → Add as new concept
           → Determine prerequisites from existing graph
           → Place in appropriate level

4. RECOMPUTE roadmap
   → Resequence considering new material
   → Maintain user progress on existing concepts
   → Insert new concepts at appropriate points

5. NOTIFY user
   → "Added 12 new concepts from 'Advanced Greeks'"
   → "3 concepts now have additional source material"
   → "Roadmap updated: 2 new levels added"
```

#### 3.3.6 Roadmap Model

**Purpose:** Define the sequenced learning path through all project content.

```json
{
  "roadmap_id": "rmp_abc123",
  "project_id": "prj_x7y8z9",
  "version": 4,
  "generated_at": "2024-06-01T10:30:00Z",
  "source_versions": {
    "src_001": "v1",
    "src_002": "v1", 
    "src_003": "v1"
  },
  "total_concepts": 87,
  "estimated_duration_hours": 24,
  "structure": {
    "phases": [
      {
        "phase_id": "phase_1",
        "name": "Foundations",
        "description": "Core concepts needed for everything else",
        "levels": [1, 2, 3],
        "estimated_hours": 6,
        "mastery_gate": {
          "required_concepts": ["cpt_001", "cpt_002", "cpt_003"],
          "threshold": 0.8
        }
      },
      {
        "phase_id": "phase_2",
        "name": "Core Mechanics",
        "levels": [4, 5, 6, 7],
        "estimated_hours": 10,
        "mastery_gate": {
          "required_concepts": ["cpt_020", "cpt_021"],
          "threshold": 0.85
        }
      },
      {
        "phase_id": "phase_3",
        "name": "Advanced Strategies",
        "levels": [8, 9, 10],
        "estimated_hours": 8,
        "sources_primary": ["src_002", "src_003"]
      }
    ],
    "levels": [
      {
        "level": 1,
        "name": "What Are Options?",
        "concepts": ["cpt_001", "cpt_002", "cpt_003"],
        "source_primary": "src_001",
        "estimated_sessions": 3,
        "prerequisites_from_prior_levels": []
      }
    ]
  },
  "interleaving_rules": {
    "within_phase": true,
    "across_phases": false,
    "max_concepts_interleaved": 3
  }
}
```

**Roadmap Evolution on New Source:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROADMAP EVOLUTION LOGIC                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SCENARIO: User adds "Part 2" or supplementary source               │
│                                                                      │
│  STEP 1: Analyze new source                                         │
│          → 25 concepts identified                                   │
│                                                                      │
│  STEP 2: Compare to existing roadmap                                │
│          → 5 concepts overlap (reinforcement material)              │
│          → 15 concepts are new (extend the roadmap)                 │
│          → 5 concepts are deeper dives on existing topics           │
│                                                                      │
│  STEP 3: Determine insertion strategy                               │
│                                                                      │
│          IF new_content.is_sequel:                                  │
│              → Append new levels after current roadmap              │
│              → Example: "Part 2" adds Levels 11-15                  │
│                                                                      │
│          ELIF new_content.is_parallel:                              │
│              → Interleave with existing levels by topic             │
│              → Example: PDF adds depth to Levels 4-7                │
│                                                                      │
│          ELIF new_content.is_prerequisite:                          │
│              → Insert BEFORE relevant existing content              │
│              → Adjust user progress if needed                       │
│              → Example: "Basics" prepends Levels 0-2                │
│                                                                      │
│  STEP 4: Preserve user progress                                     │
│          → Concepts already mastered: Keep state                    │
│          → Concepts in progress: Keep state                         │
│          → New concepts: Initialize fresh                           │
│          → Overlapping concepts: Add source reference, keep state   │
│                                                                      │
│  STEP 5: Regenerate sessions                                        │
│          → Future sessions incorporate new material                 │
│          → Due reviews unchanged                                    │
│          → New material enters based on capacity                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Example: Adding "Part 2" to Existing Course**

Before:
```
Project: "Options Trading"
Sources: [Options Basics (video)]
Roadmap: Levels 1-7, 45 concepts
Progress: Level 5, 32/45 concepts at Developing+
```

User adds: "Advanced Options Strategies (Part 2)" (video)

After:
```
Project: "Options Trading"
Sources: [Options Basics, Advanced Strategies Part 2]
Roadmap: Levels 1-12, 78 concepts (33 new from Part 2)
Progress: Level 5, 32/78 concepts at Developing+
         New concepts initialized at Unexposed

User Message:
"Added 'Advanced Options Strategies' to your project!

📊 What changed:
• 33 new concepts added
• 5 existing concepts now have additional material  
• Roadmap extended: Levels 8-12 added
• Your current progress is preserved

The new material builds on what you're learning now.
You'll start seeing it after Level 7."
```

#### 3.3.7 Progress State Model

**Purpose:** Track all learning progress within a project.

```json
{
  "progress_state_id": "pgs_def456",
  "project_id": "prj_x7y8z9",
  "user_id": "usr_a1b2c3d4",
  "last_updated": "2024-12-26T08:45:00Z",
  "summary": {
    "total_concepts": 87,
    "by_state": {
      "unexposed": 12,
      "exposed": 8,
      "fragile": 15,
      "developing": 25,
      "solid": 18,
      "mastered": 9
    },
    "current_level": 7,
    "levels_completed": [1, 2, 3, 4, 5, 6],
    "phases_completed": ["phase_1"],
    "estimated_completion_date": "2024-08-15",
    "total_time_spent_min": 840,
    "sessions_completed": 56
  },
  "concept_states": {
    "cpt_001": {
      "state": "mastered",
      "fsrs": {
        "stability": 45.2,
        "difficulty": 0.3,
        "last_review": "2024-12-20T09:00:00Z",
        "next_review": "2025-02-03T09:00:00Z",
        "review_count": 8
      },
      "history": [
        {"date": "2024-03-05", "action": "exposed", "score": null},
        {"date": "2024-03-06", "action": "tested", "score": 0.6},
        {"date": "2024-03-08", "action": "tested", "score": 0.85}
      ]
    }
  },
  "session_history": [
    {
      "session_id": "ses_001",
      "date": "2024-12-26T08:30:00Z",
      "duration_min": 14,
      "concepts_reviewed": 8,
      "concepts_new": 2,
      "performance_score": 0.82
    }
  ],
  "streaks": {
    "current": 12,
    "longest": 45,
    "last_session_date": "2024-12-26"
  },
  "review_queue": {
    "due_today": 15,
    "overdue": 3,
    "due_this_week": 42
  }
}
```

#### 3.3.8 Interaction Preferences (Per Project)

**Purpose:** Store learned and explicit preferences for interaction styles, specific to each project.

```json
{
  "interaction_preferences_id": "ipr_ghi789",
  "project_id": "prj_x7y8z9",
  "last_updated": "2024-12-26T08:45:00Z",
  "learned_preferences": {
    "dialogue_simulator": {
      "feedback_count": 12,
      "positive_rate": 0.83,
      "weight": "increased",
      "avg_performance": 0.79
    },
    "free_construction": {
      "feedback_count": 8,
      "positive_rate": 0.75,
      "weight": "increased",
      "avg_performance": 0.82
    },
    "word_bank_exercise": {
      "feedback_count": 6,
      "positive_rate": 0.33,
      "weight": "decreased",
      "avg_performance": 0.91
    }
  },
  "explicit_overrides": {
    "word_bank_exercise": "minimal",
    "session_duration": 20
  },
  "by_source": {
    "src_001": {
      "preferred_types": ["ui_simulation", "scenario_judgment"],
      "avoided_types": ["multiple_choice"]
    }
  }
}
```

#### 3.3.9 Storage Architecture

**Cloud Storage Structure:**

```
s3://learning-app-data/
├── users/
│   └── {user_id}/
│       ├── profile.json
│       ├── sources/
│       │   └── {source_id}/
│       │       ├── original.*
│       │       ├── transcript.json
│       │       ├── analysis.json
│       │       └── assets/
│       └── exports/
│           └── {export_id}.zip
├── projects/
│   └── {project_id}/
│       ├── metadata.json
│       ├── knowledge_graph.json
│       ├── roadmap.json
│       ├── progress_state.json
│       └── interaction_preferences.json
└── generated/
    └── {project_id}/
        └── interactions/
            └── {interaction_id}.json
```

**Database Schema (Relational):**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | user_id, email, created_at, subscription |
| `user_profiles` | Preferences, global stats | user_id, preferences_json, learning_stats_json |
| `projects` | Project metadata | project_id, user_id, title, status, settings_json |
| `sources` | Source files | source_id, project_id, type, analysis_status |
| `concepts` | Individual concepts | concept_id, source_id, project_id, name, cognitive_type |
| `concept_states` | User progress per concept | user_id, concept_id, state, fsrs_json |
| `sessions` | Learning session records | session_id, user_id, project_id, started_at, duration |
| `interactions` | Individual interaction records | interaction_id, session_id, concept_id, type, outcome |
| `feedback` | User feedback on interactions | feedback_id, interaction_id, rating, reason |

**Sync & Offline Considerations:**

| Scenario | Behavior |
|----------|----------|
| Offline session | Store locally, sync on reconnect |
| Conflict resolution | Last-write-wins for progress; merge for preferences |
| Large source upload | Background upload with progress indicator |
| Multi-device | Real-time sync of progress state |

---

### 3.4 Account Settings, Subscription Tiers & API Integration

#### 3.4.1 Overview

The platform offers flexible deployment options to accommodate different user needs—from individuals who want a fully managed experience to developers and enterprises who prefer using their own AI infrastructure.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT & BILLING OPTIONS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OPTION A: FULLY MANAGED (Default)                                  │
│  └── We host everything: storage, compute, AI                       │
│  └── Monthly subscription with included AI tokens                   │
│  └── No setup required—just sign up and learn                       │
│                                                                      │
│  OPTION B: BRING YOUR OWN KEY (BYOK)                                │
│  └── We host storage and app infrastructure                         │
│  └── You provide your own AI API keys                               │
│  └── Lower subscription + pay your own AI costs                     │
│                                                                      │
│  OPTION C: LOCAL / SELF-HOSTED                                      │
│  └── Run AI models locally (Ollama, LM Studio)                      │
│  └── Maximum privacy and control                                    │
│  └── Requires technical setup                                       │
│                                                                      │
│  OPTION D: ENTERPRISE                                               │
│  └── Custom deployment (cloud, on-prem, hybrid)                     │
│  └── SSO, audit logs, dedicated support                             │
│  └── Volume pricing and SLAs                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 Subscription Tiers (Fully Managed)

**Pricing Philosophy:** Learning is an investment. Pricing should be accessible enough that cost isn't a barrier, but sustainable enough to fund continuous improvement.

| Tier | Price | AI Tokens Included | Storage | Features |
|------|-------|-------------------|---------|----------|
| **Free** | $0/mo | 50K tokens/mo (~3-5 sessions) | 1 project, 1 source | Basic features, try before you buy |
| **Learner** | $12/mo | 500K tokens/mo (~30-40 sessions) | 5 projects, 20 sources | Full features, email support |
| **Pro** | $29/mo | 2M tokens/mo (~120+ sessions) | Unlimited projects/sources | Priority support, advanced analytics |
| **Team** | $25/user/mo | 3M tokens/user/mo | Shared workspace | Admin controls, team analytics, SSO |
| **Enterprise** | Custom | Custom | Custom | On-prem option, SLA, dedicated support |

**Token Usage Estimates (per learning session):**

| Activity | Estimated Tokens |
|----------|------------------|
| Content analysis (1-hour video) | 50K-100K tokens |
| Daily learning session (15 min) | 10K-20K tokens |
| Interactive simulation (complex) | 5K-15K tokens |
| Open-ended assessment | 2K-5K tokens |
| Roadmap regeneration | 10K-30K tokens |

**Overage Handling:**

```
IF user_exceeds_monthly_tokens:
    → Notify user at 80% and 100%
    → Option to purchase additional tokens ($10 per 500K)
    → Option to upgrade tier
    → Sessions continue but degrade to simpler interactions
    → Never hard-stop mid-session
```

#### 3.4.3 AI Model Strategy

**Default Model Selection:**

The platform uses a tiered model strategy to balance quality and cost:

| Task Type | Default Model | Rationale |
|-----------|---------------|-----------|
| **Content Analysis** | Claude Sonnet | Complex reasoning needed for concept extraction |
| **Interactive Simulations** | Claude Sonnet | Code generation requires strong capabilities |
| **Open-Ended Assessment** | Claude Sonnet | Nuanced evaluation of user responses |
| **Simple Q&A Generation** | Claude Haiku | High volume, lower complexity |
| **Retrieval Practice** | Claude Haiku | Efficient for routine interactions |
| **Troubleshooting Flows** | Claude Sonnet | Requires diagnostic reasoning |

**Model Pricing Reference (as of late 2025):**

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| Claude Opus 4.5 | $15 | $75 | Mission-critical, highest quality |
| Claude Sonnet 4.5 | $3 | $15 | Balanced quality/cost (default) |
| Claude Haiku 4.5 | $1 | $5 | High volume, cost-sensitive |

**Cost Optimization Strategies:**

| Strategy | Implementation | Savings |
|----------|----------------|---------|
| Prompt caching | Cache repeated context (source summaries, user profile) | Up to 90% on cached reads |
| Batch processing | Non-urgent tasks (overnight analysis) use batch API | 50% discount |
| Model routing | Use Haiku for simple tasks, Sonnet for complex | 50-70% overall |
| Response caching | Cache common interaction patterns | Variable |

#### 3.4.4 Bring Your Own Key (BYOK) Mode

**Purpose:** Allow users to use their own API keys, reducing subscription cost while maintaining platform functionality.

**Supported Providers:**

| Provider | Models Supported | Integration Method |
|----------|------------------|-------------------|
| **Anthropic** | Claude Opus, Sonnet, Haiku | Direct API |
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5 | Direct API |
| **Google** | Gemini Pro, Gemini Flash | Direct API |
| **OpenRouter** | 100+ models via unified API | Aggregator API |
| **Amazon Bedrock** | Claude, Titan, others | AWS SDK |
| **Azure OpenAI** | GPT-4, GPT-3.5 | Azure SDK |

**OpenRouter Integration (Recommended for Flexibility):**

OpenRouter is a unified interface for Large Language Models, providing access to various models and prices through a single endpoint. It allows users to access major models through a single, unified interface, compatible with the OpenAI SDK.

Benefits of OpenRouter for BYOK users:
- Single API key for 100+ models
- Automatic fallbacks if a provider is down
- Price optimization across providers
- No vendor lock-in

**BYOK Configuration:**

```json
{
  "api_configuration": {
    "mode": "byok",
    "provider": "openrouter",
    "api_key": "sk-or-v1-xxxx",  // Encrypted at rest
    "model_preferences": {
      "content_analysis": "anthropic/claude-sonnet-4",
      "simulations": "anthropic/claude-sonnet-4",
      "simple_qa": "anthropic/claude-haiku-4",
      "fallback": "openai/gpt-4o"
    },
    "budget_limits": {
      "daily_max_usd": 5.00,
      "monthly_max_usd": 50.00,
      "alert_threshold_percent": 80
    }
  }
}
```

**BYOK Subscription Pricing:**

| Tier | Price | What's Included |
|------|-------|-----------------|
| **BYOK Basic** | $5/mo | Platform access, 5 projects, no AI tokens |
| **BYOK Pro** | $15/mo | Unlimited projects, advanced features, no AI tokens |

**BYOK User Experience:**

```
┌─────────────────────────────────────────────┐
│  ⚙️ API CONFIGURATION                       │
├─────────────────────────────────────────────┤
│                                             │
│  MODE: Bring Your Own Key                   │
│                                             │
│  PROVIDER                                   │
│  ● OpenRouter (recommended)                 │
│  ○ Anthropic Direct                         │
│  ○ OpenAI Direct                            │
│  ○ Google AI                                │
│  ○ Amazon Bedrock                           │
│  ○ Azure OpenAI                             │
│                                             │
│  API KEY                                    │
│  [sk-or-v1-••••••••••••••••]  [Test]       │
│  ✓ Key validated successfully               │
│                                             │
│  MODEL SELECTION                            │
│  ┌─────────────────────────────────────┐   │
│  │ Complex tasks: claude-sonnet-4  [▼] │   │
│  │ Simple tasks:  claude-haiku-4   [▼] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  BUDGET LIMITS                              │
│  Daily max:   [$5.00    ]                  │
│  Monthly max: [$50.00   ]                  │
│  □ Pause learning if budget exceeded        │
│  ☑ Alert me at 80% of budget               │
│                                             │
│  CURRENT MONTH USAGE                        │
│  $12.47 / $50.00 (25%)                     │
│  ████░░░░░░░░░░░░                          │
│                                             │
└─────────────────────────────────────────────┘
```

#### 3.4.5 Local LLM / Self-Hosted Mode

**Purpose:** Maximum privacy and control for users who want to run AI models locally.

**Supported Local Runners:**

| Platform | Setup Complexity | Performance | Models Available |
|----------|------------------|-------------|------------------|
| **Ollama** | Easy | Good (GPU required) | Llama 3, Mistral, Phi, Gemma |
| **LM Studio** | Easy | Good (GPU required) | Wide variety via GGUF |
| **llama.cpp** | Moderate | Excellent | Any GGUF model |
| **vLLM** | Advanced | Production-grade | Most open models |
| **LocalAI** | Moderate | Good | OpenAI-compatible API |

**Local Mode Configuration:**

```json
{
  "api_configuration": {
    "mode": "local",
    "provider": "ollama",
    "endpoint": "http://localhost:11434",
    "model_preferences": {
      "content_analysis": "llama3.1:70b",
      "simulations": "llama3.1:70b",
      "simple_qa": "llama3.1:8b"
    },
    "fallback_to_cloud": {
      "enabled": true,
      "provider": "openrouter",
      "trigger": "model_unavailable"
    }
  }
}
```

**Local Mode Considerations:**

| Aspect | Consideration |
|--------|---------------|
| **Hardware** | Minimum 16GB RAM; 24GB+ VRAM recommended for 70B models |
| **Quality** | Open models approach but don't match Claude Sonnet on complex tasks |
| **Speed** | Depends on hardware; may be slower than cloud |
| **Privacy** | All data stays on device—no external API calls |
| **Offline** | Full functionality without internet (after initial setup) |

**Hybrid Mode:**

Users can configure a hybrid approach:

```
┌─────────────────────────────────────────────┐
│  HYBRID CONFIGURATION                       │
├─────────────────────────────────────────────┤
│                                             │
│  Use local models for:                      │
│  ☑ Simple Q&A and retrieval practice       │
│  ☑ Basic content analysis                  │
│  □ Interactive simulations                  │
│  □ Open-ended assessment                    │
│                                             │
│  Use cloud API for:                         │
│  □ Simple Q&A and retrieval practice       │
│  □ Basic content analysis                  │
│  ☑ Interactive simulations                 │
│  ☑ Open-ended assessment                   │
│                                             │
│  This balances privacy with quality for    │
│  complex tasks.                             │
│                                             │
└─────────────────────────────────────────────┘
```

#### 3.4.6 Enterprise API Gateway Options

For enterprise deployments requiring governance, security, and scale:

**Recommended Enterprise Gateways:**

| Gateway | Best For | Key Features |
|---------|----------|--------------|
| **Kong AI Gateway** | Teams with existing Kong infrastructure | Open-source, policy enforcement, metrics |
| **Portkey** | Cost optimization focus | Smart routing, caching, rate limiting, observability |
| **LiteLLM** | Self-hosted, open-source preference | OpenAI-compatible, budget controls, logging |
| **TrueFoundry** | Regulated industries | VPC deployment, AI guardrails, PII redaction |

For enterprises where compliance, security, and deep debugging are non-negotiable, architectural limitations of public aggregators often necessitate a move toward more robust, dedicated AI Gateways.

**Enterprise Configuration Example:**

```json
{
  "api_configuration": {
    "mode": "enterprise",
    "gateway": {
      "provider": "portkey",
      "endpoint": "https://ai-gateway.company.com",
      "features": {
        "rate_limiting": true,
        "cost_tracking": true,
        "audit_logging": true,
        "pii_redaction": true,
        "model_fallbacks": ["claude-sonnet", "gpt-4o", "gemini-pro"]
      }
    },
    "authentication": {
      "method": "oauth2",
      "provider": "company_sso"
    },
    "compliance": {
      "data_residency": "us-east-1",
      "retention_days": 90,
      "encryption": "aes-256"
    }
  }
}
```

#### 3.4.7 Account Settings UI

**Main Settings Screen:**

```
┌─────────────────────────────────────────────┐
│  ⚙️ SETTINGS                                │
├─────────────────────────────────────────────┤
│                                             │
│  ACCOUNT                                    │
│  ├── Profile & Email                        │
│  ├── Subscription & Billing                 │
│  ├── API Configuration                      │
│  └── Data & Privacy                         │
│                                             │
│  LEARNING PREFERENCES                       │
│  ├── Default Session Duration               │
│  ├── Daily Goal Settings                    │
│  ├── Notification Preferences               │
│  └── Accessibility                          │
│                                             │
│  INTEGRATIONS                               │
│  ├── Calendar Sync                          │
│  ├── Export Options                         │
│  └── Connected Apps                         │
│                                             │
│  SUPPORT                                    │
│  ├── Help Center                            │
│  ├── Contact Support                        │
│  └── Feature Requests                       │
│                                             │
└─────────────────────────────────────────────┘
```

**Profile & Account:**

```
┌─────────────────────────────────────────────┐
│  👤 PROFILE                                 │
├─────────────────────────────────────────────┤
│                                             │
│  EMAIL                                      │
│  user@example.com                    [Edit] │
│                                             │
│  NAME                                       │
│  [Alex Johnson                         ]    │
│                                             │
│  TIMEZONE                                   │
│  [America/New_York                    ▼]    │
│                                             │
│  PASSWORD                                   │
│  ••••••••••••                    [Change]   │
│                                             │
│  TWO-FACTOR AUTHENTICATION                  │
│  [Enabled ✓]                     [Manage]   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  CONNECTED ACCOUNTS                         │
│  🔗 Google    Connected           [Remove]  │
│  🔗 Apple     Not connected         [Link]  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  DANGER ZONE                                │
│  [Export All Data]  [Delete Account]        │
│                                             │
└─────────────────────────────────────────────┘
```

**Subscription & Billing:**

```
┌─────────────────────────────────────────────┐
│  💳 SUBSCRIPTION & BILLING                  │
├─────────────────────────────────────────────┤
│                                             │
│  CURRENT PLAN                               │
│  ┌─────────────────────────────────────┐   │
│  │  PRO PLAN                $29/month  │   │
│  │  2M tokens included                 │   │
│  │  Renews: January 15, 2025           │   │
│  └─────────────────────────────────────┘   │
│                     [Change Plan] [Cancel]  │
│                                             │
│  TOKEN USAGE THIS MONTH                     │
│  ████████████░░░░░░░░ 1.2M / 2M (60%)      │
│                                             │
│  Estimated days remaining: 12               │
│  Average daily usage: 45K tokens            │
│                                             │
│  [Purchase Additional Tokens]               │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  PAYMENT METHOD                             │
│  💳 Visa ending in 4242         [Update]   │
│                                             │
│  BILLING HISTORY                            │
│  Dec 15, 2024   Pro Plan    $29.00  [PDF]  │
│  Nov 15, 2024   Pro Plan    $29.00  [PDF]  │
│  Oct 15, 2024   Pro Plan    $29.00  [PDF]  │
│                                             │
│  [View All Invoices]                        │
│                                             │
└─────────────────────────────────────────────┘
```

**Data & Privacy:**

```
┌─────────────────────────────────────────────┐
│  🔒 DATA & PRIVACY                          │
├─────────────────────────────────────────────┤
│                                             │
│  YOUR DATA                                  │
│                                             │
│  Total storage used: 2.4 GB                 │
│  ├── Source files: 2.1 GB                  │
│  ├── Learning data: 0.2 GB                 │
│  └── Generated content: 0.1 GB             │
│                                             │
│  [Export All Data]                          │
│  Download a complete copy of all your data  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  PRIVACY SETTINGS                           │
│                                             │
│  ☑ Allow anonymous usage analytics          │
│    Helps us improve the product             │
│                                             │
│  □ Allow AI model improvement               │
│    Your data may be used to improve models  │
│                                             │
│  ☑ Store learning history                   │
│    Required for spaced repetition           │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  DATA RETENTION                             │
│                                             │
│  Source files: [Keep forever          ▼]   │
│  Learning history: [Keep forever      ▼]   │
│  Session recordings: [Delete after 30d ▼]  │
│                                             │
│  [Delete All Learning History]              │
│  [Delete All Source Files]                  │
│                                             │
└─────────────────────────────────────────────┘
```

#### 3.4.8 API Configuration Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-API-1 | Users can switch between Managed/BYOK/Local modes | Feature test |
| AC-API-2 | BYOK API keys encrypted at rest (AES-256) | Security audit |
| AC-API-3 | API key validation before saving | API test |
| AC-API-4 | Budget limits enforced for BYOK users | Usage simulation |
| AC-API-5 | Local LLM connection tested before enabling | Connection test |
| AC-API-6 | Graceful degradation when API unavailable | Failure mode test |
| AC-API-7 | Token usage tracked and displayed accurately | Billing verification |
| AC-API-8 | Users can export all data within 24 hours | Export test |
| AC-API-9 | Account deletion removes all user data within 30 days | Deletion verification |
| AC-API-10 | Subscription changes take effect immediately | Billing test |

---

## 4. Feature Specifications

### 4.1 Feature: Content Upload & Analysis

**Feature ID:** F-001  
**Priority:** P0 (Critical)  
**Research Basis:** Foundational — enables all other features

#### User Story

As a learner, I want to upload a video, PDF, or article so that the app can transform it into an active learning experience.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-001-1 | System accepts video files (MP4, MOV, WebM up to 2GB) | Upload test with various formats |
| AC-001-2 | System accepts PDF files (up to 100 pages) | Upload test with various PDFs |
| AC-001-3 | System accepts URLs (YouTube, article links) | URL parsing test |
| AC-001-4 | System transcribes video/audio with >95% accuracy | Transcription quality audit |
| AC-001-5 | System extracts 80%+ of key concepts from source | Expert comparison audit |
| AC-001-6 | Concept prerequisite ordering is logically valid | Expert review |
| AC-001-7 | Processing completes within 5 minutes for typical content | Performance test |
| AC-001-8 | User sees progress indicator during processing | UX verification |
| AC-001-9 | System provides estimated session count after analysis | Output verification |

#### Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Corrupted file uploaded | Clear error message, prompt re-upload |
| Very long video (>2 hours) | Warning about processing time, suggest chunking |
| Poorly structured content | AI attempts best-effort extraction, flags low confidence |
| Non-English content | Currently unsupported, clear message |
| Password-protected PDF | Error message requesting unprotected version |

---

### 4.1b Feature: Project & Source Management

**Feature ID:** F-025  
**Priority:** P0 (Critical)  
**Research Basis:** Foundational infrastructure; Multi-source integration enables comprehensive learning

#### The Core Problem

Learning a complex topic often requires multiple sources—a video course, a textbook chapter, supplementary articles, a "Part 2" sequel. Without project-based organization:
- Sources are siloed and don't inform each other
- Adding new material doesn't integrate with existing progress
- Users can't build comprehensive learning paths from multiple inputs

#### Design Principle

A **Project** represents a learning goal. Multiple **Sources** contribute knowledge toward that goal. The AI synthesizes all sources into one **Unified Roadmap** that evolves as sources are added.

#### User Stories

**Project Creation:**
> As a learner, I want to create a learning project (e.g., "Master Options Trading") so that I can organize all related materials in one place.

**Source Addition:**
> As a learner, I want to add multiple sources to my project (videos, PDFs, articles) so that the AI can build a comprehensive roadmap from all of them.

**Roadmap Evolution:**
> As a learner, when I add "Part 2" or supplementary material to my project, I want my existing progress preserved and the new material integrated appropriately.

**Multi-Source Synthesis:**
> As a learner, I want the AI to recognize when different sources cover the same topic and combine them intelligently rather than treating them as separate concepts.

#### Feature Components

##### 4.1b.1 Project Creation & Management

**Project Home Screen:**

```
┌─────────────────────────────────────────────┐
│  MY PROJECTS                          [+]   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📈 Options Trading Mastery          │   │
│  │ 3 sources • 87 concepts • Level 7   │   │
│  │ ████████████░░░░ 68% complete       │   │
│  │ 15 reviews due today                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🇪🇸 Conversational Spanish           │   │
│  │ 2 sources • 156 concepts • Level 4  │   │
│  │ ██████░░░░░░░░░░ 35% complete       │   │
│  │ 23 reviews due today                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🎬 Video Editing Basics             │   │
│  │ 1 source • Analyzing...             │   │
│  │ ░░░░░░░░░░░░░░░░ Not started        │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Project Detail Screen:**

```
┌─────────────────────────────────────────────┐
│  ← Options Trading Mastery            ⚙️    │
├─────────────────────────────────────────────┤
│                                             │
│  PROGRESS                                   │
│  ████████████░░░░ 68%                      │
│  59/87 concepts at Developing or higher     │
│  Estimated completion: Aug 15, 2024         │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  SOURCES (3)                        [+ Add] │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📹 Options Basics Course            │   │
│  │    2.5 hours • 45 concepts          │   │
│  │    Added Mar 1 • ✓ Analyzed         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📄 Advanced Greeks (PDF)            │   │
│  │    32 pages • 28 concepts           │   │
│  │    Added Mar 15 • ✓ Analyzed        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📹 Trading Strategies Part 2        │   │
│  │    1.5 hours • 14 concepts          │   │
│  │    Added Jun 1 • ✓ Analyzed         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [▶️ Start Today's Session]                 │
│  15 reviews + 2 new concepts (14 min)       │
│                                             │
└─────────────────────────────────────────────┘
```

##### 4.1b.2 Adding Sources to Existing Projects

**Flow: User adds "Part 2" to existing project**

```
┌─────────────────────────────────────────────┐
│  ADD SOURCE TO PROJECT                      │
├─────────────────────────────────────────────┤
│                                             │
│  Project: Options Trading Mastery           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [Upload Video/PDF]          │   │
│  │                                     │   │
│  │         [Paste URL]                 │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Or drag file here                          │
│                                             │
└─────────────────────────────────────────────┘
```

User uploads "Advanced Options Strategies (Part 2).mp4"

```
┌─────────────────────────────────────────────┐
│  ANALYZING NEW SOURCE                       │
├─────────────────────────────────────────────┤
│                                             │
│  📹 Advanced Options Strategies (Part 2)    │
│                                             │
│  ████████████████░░░░ 78%                  │
│                                             │
│  ✓ Transcription complete                   │
│  ✓ Concepts identified (33 found)           │
│  ◐ Comparing to existing roadmap...         │
│  ○ Generating updated roadmap               │
│                                             │
│  This may take a few minutes.               │
│                                             │
└─────────────────────────────────────────────┘
```

**Integration Analysis Complete:**

```
┌─────────────────────────────────────────────┐
│  ✓ SOURCE INTEGRATED                        │
├─────────────────────────────────────────────┤
│                                             │
│  📹 Advanced Options Strategies (Part 2)    │
│     has been added to your project.         │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  WHAT CHANGED:                              │
│                                             │
│  📊 Concepts                                │
│     • 33 new concepts added                 │
│     • 5 existing concepts enriched          │
│       (now have additional source material) │
│     • 0 contradictions detected             │
│                                             │
│  🗺️ Roadmap                                 │
│     • 5 new levels added (Levels 8-12)      │
│     • Phase 3: "Advanced Strategies" added  │
│     • Estimated +8 hours of learning        │
│                                             │
│  📈 Your Progress                           │
│     • All existing progress preserved       │
│     • New material begins after Level 7     │
│     • New completion estimate: Oct 1, 2024  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [View Updated Roadmap]  [Start Learning]   │
│                                             │
└─────────────────────────────────────────────┘
```

##### 4.1b.3 Multi-Source Roadmap Synthesis

**How AI Integrates Multiple Sources:**

| Scenario | AI Behavior |
|----------|-------------|
| **Same concept, different explanations** | Link both sources to unified concept; use richer explanation as primary; offer alternative during review |
| **Sequential content (Part 1, Part 2)** | Append Part 2 levels after Part 1; maintain prerequisite chain |
| **Overlapping with gaps** | Insert new concepts where they fit in prerequisite graph |
| **Contradictory information** | Flag for user review; ask which source to prioritize |
| **Different modalities (video + PDF on same topic)** | Combine—use video for initial exposure, PDF for reference during practice |

**Visual: Unified Roadmap View**

```
┌─────────────────────────────────────────────┐
│  🗺️ ROADMAP: Options Trading Mastery        │
├─────────────────────────────────────────────┤
│                                             │
│  PHASE 1: Foundations                       │
│  ┌─────────────────────────────────────┐   │
│  │ Level 1 ✓  │ Level 2 ✓  │ Level 3 ✓ │   │
│  │ [Basics]   │ [Basics]   │ [Basics]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PHASE 2: Core Mechanics                    │
│  ┌─────────────────────────────────────┐   │
│  │ Level 4 ✓  │ Level 5 ✓  │ Level 6 ◐ │   │
│  │ [Basics]   │ [Basics+   │ [Basics+  │   │
│  │            │  Greeks]   │  Greeks]  │   │
│  └─────────────────────────────────────┘   │
│  │ Level 7 ○                            │   │
│  │ [Greeks PDF]                         │   │
│  └──────────────────────────────────────   │
│                                             │
│  PHASE 3: Advanced Strategies (NEW)         │
│  ┌─────────────────────────────────────┐   │
│  │ Level 8 ○  │ Level 9 ○  │ Level 10 ○│   │
│  │ [Part 2]   │ [Part 2]   │ [Part 2]  │   │
│  └─────────────────────────────────────┘   │
│  │ Level 11 ○ │ Level 12 ○              │   │
│  │ [Part 2]   │ [Part 2]               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Legend: ✓ Complete  ◐ In Progress  ○ Locked│
│  Source tags show where content comes from  │
│                                             │
└─────────────────────────────────────────────┘
```

##### 4.1b.4 Source-Linked References During Learning

When reviewing a concept that has multiple source references:

```
┌─────────────────────────────────────────────┐
│  📚 Call Option - Multiple Sources          │
│                                             │
│  You're reviewing a concept covered in      │
│  multiple sources:                          │
│                                             │
│  📹 Options Basics Course (2:00 - 4:00)     │
│     [Watch this section]                    │
│                                             │
│  📄 Advanced Greeks PDF (pages 15-17)       │
│     [View these pages]                      │
│                                             │
│  Different sources, same concept.           │
│  Tap to revisit the original explanations.  │
│                                             │
└─────────────────────────────────────────────┘
```

##### 4.1b.5 Project Settings & Preferences

```
┌─────────────────────────────────────────────┐
│  ⚙️ PROJECT SETTINGS                        │
│     Options Trading Mastery                 │
├─────────────────────────────────────────────┤
│                                             │
│  DAILY GOAL                                 │
│  [━━━━━━●━━━━━] 15 min                     │
│                                             │
│  TARGET COMPLETION DATE                     │
│  [October 1, 2024]                     📅   │
│                                             │
│  DIFFICULTY PREFERENCE                      │
│  ○ Gradual (more scaffolding)              │
│  ● Challenging (less scaffolding)          │
│                                             │
│  INTERLEAVE SOURCES                         │
│  [ON] Mix concepts from different sources   │
│       within sessions                       │
│                                             │
│  SOURCE PRIORITY                            │
│  (Drag to reorder when concepts overlap)    │
│  1. 📹 Options Basics Course               │
│  2. 📄 Advanced Greeks PDF                 │
│  3. 📹 Trading Strategies Part 2           │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [Archive Project]  [Delete Project]        │
│                                             │
└─────────────────────────────────────────────┘
```

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-025-1 | Users can create projects with title and optional description | Feature test |
| AC-025-2 | Users can add multiple sources (video, PDF, URL) to a project | Feature test |
| AC-025-3 | AI correctly identifies overlapping concepts across sources (>80% precision) | Analysis audit |
| AC-025-4 | Roadmap regenerates correctly when new source added | Roadmap comparison test |
| AC-025-5 | User progress on existing concepts preserved when source added | Progress state verification |
| AC-025-6 | New concepts from added source correctly sequenced in roadmap | Expert review |
| AC-025-7 | User notified of what changed when source integrated | UX verification |
| AC-025-8 | Concepts show all source references when multiple sources cover same topic | Data verification |
| AC-025-9 | Users can view, archive, and delete projects | Feature test |
| AC-025-10 | Interaction preferences stored per-project, not globally | Data model verification |
| AC-025-11 | Project data persists across sessions and devices | Sync test |
| AC-025-12 | Offline changes sync correctly when connection restored | Sync conflict test |

#### Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Sources with contradictory information | Flag contradiction, ask user which source to prioritize |
| Source that's entirely redundant | Notify user: "This covers material already in your project. Add anyway?" |
| Very large project (10+ sources, 500+ concepts) | Performance optimization; consider suggesting project split |
| Source in different language than project | Warning; option to proceed with translation |
| User deletes source mid-project | Confirm impact; option to keep derived concepts or remove |
| Adding source that should be prerequisite to existing content | Offer to "prepend" and adjust roadmap; note user may need review |

---

### 4.2 Feature: Pretest Generation

**Feature ID:** F-002  
**Priority:** P0 (Critical)  
**Research Basis:** Pretesting effect (d = 1.1)

#### User Story

As a learner, before I'm taught new concepts, I want to be tested on them so that my brain is primed for better encoding.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-002-1 | Every session with new material begins with pretest | Session flow audit |
| AC-002-2 | Pretest questions cover all concepts to be introduced | Content matching test |
| AC-002-3 | User is informed that wrong answers are expected | UX copy verification |
| AC-002-4 | Pretest responses are stored for later comparison | Data verification |
| AC-002-5 | Misconceptions detected in pretest are flagged for explicit addressing | Logic verification |
| AC-002-6 | Pretest takes <3 minutes for typical session | Timing test |

#### Research Validation

| Metric | Target | Measurement |
|--------|--------|-------------|
| Post-learning improvement vs no pretest | >10 percentage points | A/B test cohort comparison |
| Misconception identification accuracy | >80% | Expert review of flagged misconceptions |

---

### 4.3 Feature: Retrieval Practice Generation

**Feature ID:** F-003  
**Priority:** P0 (Critical)  
**Research Basis:** Testing effect (g = 0.50-0.81); Free recall (g = 0.81)

#### User Story

As a learner, I want to be asked questions that require me to generate answers from memory so that I encode material more durably.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-003-1 | Every concept has minimum 5 retrieval questions | Content audit |
| AC-003-2 | Question types include: free recall, cued recall, application, discrimination | Question type audit |
| AC-003-3 | Free recall questions comprise >40% of retrieval practice | Distribution analysis |
| AC-003-4 | AI can evaluate free-response accuracy with >90% agreement with human raters | Evaluation quality audit |
| AC-003-5 | Questions span difficulty from recognition to transfer | Difficulty distribution audit |
| AC-003-6 | No two consecutive questions are identical format | Session flow audit |

#### Question Type Distribution Target

| Question Type | Target % | Rationale |
|---------------|----------|-----------|
| Free recall | 40-50% | Highest effect size |
| Application scenario | 20-25% | Tests transfer |
| Cued recall | 15-20% | Supports encoding |
| Elaboration | 10-15% | Deepens conceptual understanding |
| Recognition (MC) | 5-10% | Only for early exposure |

---

### 4.4 Feature: FSRS Spaced Repetition Scheduling

**Feature ID:** F-004  
**Priority:** P0 (Critical)  
**Research Basis:** Spacing effect (d = 0.54-0.85); FSRS algorithm (outperforms SM-2)

#### User Story

As a learner, I want the app to automatically schedule reviews at optimal intervals so that I retain knowledge long-term with minimum time investment.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-004-1 | FSRS algorithm implemented per specification | Algorithm verification |
| AC-004-2 | Each concept has individual stability parameter | Data structure verification |
| AC-004-3 | Review intervals expand with successful retrievals | Interval progression audit |
| AC-004-4 | Intervals contract after failed retrievals | Failure handling audit |
| AC-004-5 | User can see next review date per concept | UX verification |
| AC-004-6 | Due items surfaced in session construction | Session content audit |
| AC-004-7 | System prevents review item backlog >50 items | Backlog management verification |

#### FSRS Parameters

| Parameter | Default Value | Personalization |
|-----------|---------------|-----------------|
| Initial stability | 1.0 day | Adjusted based on first retention measurement |
| Stability growth factor | 2.5 | Adjusted based on individual decay rate |
| Desired retention | 0.90 | User-configurable (0.80-0.95) |
| Review urgency threshold | R < 0.85 | Fixed |

---

### 4.5 Feature: Successive Relearning Protocol

**Feature ID:** F-005  
**Priority:** P0 (Critical)  
**Research Basis:** Successive relearning (d = 1.52-4.19)

#### User Story

As a learner, I want the app to ensure I master concepts through multiple spaced sessions before considering them learned.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-005-1 | Concepts require minimum 3 successful sessions before MASTERED state | State machine verification |
| AC-005-2 | Sessions must be on different calendar days | Timing verification |
| AC-005-3 | Each session requires reaching criterion (correct retrieval) | Criterion logic verification |
| AC-005-4 | Time per concept tracked and shown to decrease across sessions | Metric tracking verification |
| AC-005-5 | User cannot manually mark concepts as "mastered" | Permission verification |

#### Expected Progression

| Session | Expected Time/Concept | Criterion |
|---------|----------------------|-----------|
| 1 | 40-50 seconds | Correct retrieval |
| 2 | 25-35 seconds | Correct retrieval |
| 3 | 15-25 seconds | Correct retrieval |
| 4+ | 10-15 seconds | Correct retrieval |

---

### 4.6 Feature: Cognitive Load Budget

**Feature ID:** F-006  
**Priority:** P0 (Critical)  
**Research Basis:** Cognitive Load Theory (3-4 chunk limit); Working memory constraints

#### User Story

As a learner, I want the app to prevent me from overloading my brain so that I retain what I learn.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-006-1 | Maximum 4 new concepts per session (hard limit) | Session construction audit |
| AC-006-2 | Capacity calculated using sleep + time + fatigue modifiers | Algorithm verification |
| AC-006-3 | User sees capacity visualization | UX verification |
| AC-006-4 | Warning displayed when capacity >75% depleted | Warning trigger test |
| AC-006-5 | New material blocked when capacity >90% depleted | Blocking logic test |
| AC-006-6 | User can choose to continue with warning, but default is stop | UX flow verification |

#### User-Facing Copy

```
75% Capacity Warning:
"You've covered a lot today. Research shows adding more new material 
now may interfere with retaining what you've already learned. 
We recommend stopping here and continuing tomorrow. Your brain 
needs rest to consolidate."

[Stop Here - Recommended] [Continue Anyway]
```

---

### 4.7 Feature: Sleep-Aware Scheduling

**Feature ID:** F-007  
**Priority:** P1 (High)  
**Research Basis:** Sleep consolidation (20-40% effects); 24-hour critical window

#### User Story

As a learner, I want the app to respect my sleep patterns so that my brain can consolidate learning.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-007-1 | User provides typical bedtime during onboarding | Onboarding flow verification |
| AC-007-2 | No new material introduced within 2 hours of bedtime | Timing logic verification |
| AC-007-3 | Morning session prompts review of previous night's material | Session type verification |
| AC-007-4 | Optional pre-sleep light review session suggested | Notification logic verification |
| AC-007-5 | Sleep duration optionally tracked (manual or integration) | Data input verification |
| AC-007-6 | Consolidation success measured by morning retrieval | Metric tracking verification |

#### Notification Schedule

| Time | Notification Type | Content |
|------|-------------------|---------|
| Morning (user-configured) | Morning check | "Quick 3-min check: how much stuck from last night?" |
| 2 hours before bedtime | Learning cutoff | "Last chance for new material today" |
| 1 hour before bedtime | Pre-sleep review | "Optional: 5-min light review before bed" |

---

### 4.8 Feature: Real-Time Understanding Assessment

**Feature ID:** F-008  
**Priority:** P1 (High)  
**Research Basis:** Formative assessment; Feedback timing

#### User Story

As a learner, I want the app to detect when I'm struggling or confused so that it can help me immediately.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-008-1 | Response latency tracked for every question | Data capture verification |
| AC-008-2 | Confidence self-report available (optional, non-intrusive) | UX verification |
| AC-008-3 | Free-response quality evaluated by AI in real-time | Evaluation timing test |
| AC-008-4 | Confident misconceptions trigger immediate intervention | Intervention logic test |
| AC-008-5 | Fatigue pattern (increasing latency) detected | Pattern detection verification |
| AC-008-6 | Session adapts based on signals (difficulty, length, method) | Adaptation verification |

#### Latency Benchmarks

| Latency | Question Type | Interpretation |
|---------|---------------|----------------|
| <3s | Multiple choice | Fast (expected) |
| 3-8s | Multiple choice | Normal |
| >8s | Multiple choice | Slow (possible confusion) |
| <10s | Free recall | Fast (strong encoding) |
| 10-30s | Free recall | Normal (effortful retrieval) |
| >30s | Free recall | Slow (possible difficulty) |
| >60s | Any | May indicate distraction or struggle |

---

### 4.9 Feature: Misconception Detection & Repair

**Feature ID:** F-009  
**Priority:** P1 (High)  
**Research Basis:** Feedback quality; Corrective instruction

#### User Story

As a learner, I want the app to identify and fix my misconceptions before they become entrenched.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-009-1 | Common misconceptions catalogued per concept during content analysis | Content audit |
| AC-009-2 | Misconception detected when answer matches misconception pattern + high confidence | Detection logic verification |
| AC-009-3 | Immediate corrective feedback provided with contrast | UX verification |
| AC-009-4 | Corrective retrieval scheduled within same session | Session flow verification |
| AC-009-5 | Discriminative questions added to future reviews | Review content verification |
| AC-009-6 | Misconception recurrence tracked | Data tracking verification |
| AC-009-7 | Resolved misconceptions eventually removed from active monitoring | State management verification |

#### Misconception Repair Flow

```
1. Detection: Answer matches misconception pattern + confidence ≥4/5
2. Acknowledgment: "I notice you might be thinking X, which is a common confusion"
3. Correction: Explain correct understanding with explicit contrast
4. Immediate re-test: Ask related question within 3-5 minutes
5. Future monitoring: Add discriminative questions to review
6. Resolution: After 3 correct retrievals without recurrence, downgrade monitoring
```

---

### 4.10 Feature: Mastery Gates

**Feature ID:** F-010  
**Priority:** P1 (High)  
**Research Basis:** Mastery-based progression (+5-8 months effect)

#### User Story

As a learner, I want to prove I've mastered foundational concepts before advancing so that I don't build on a shaky foundation.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-010-1 | Course levels have defined mastery thresholds (default 80%) | Configuration verification |
| AC-010-2 | Mastery check includes application and transfer questions | Question type audit |
| AC-010-3 | User cannot access Level N+1 until Level N mastery check passed | Gate enforcement verification |
| AC-010-4 | Failed mastery check provides specific feedback on weak areas | Feedback content verification |
| AC-010-5 | Failed mastery check triggers remediation session | Remediation flow verification |
| AC-010-6 | User can retake mastery check after remediation | Retry logic verification |

#### Mastery Check Structure

| Component | Weight | Purpose |
|-----------|--------|---------|
| Recall questions (each concept) | 40% | Verify basic retention |
| Application scenarios | 30% | Verify usable knowledge |
| Transfer questions | 20% | Verify deep understanding |
| Integration questions | 10% | Verify cross-concept connections |

---

### 4.11 Feature: Adaptive Method Selection

**Feature ID:** F-011  
**Priority:** P1 (High)  
**Research Basis:** Individual differences in learning; Personalization

#### User Story

As a learner, I want the app to learn what teaching methods work best for me so that my learning is increasingly optimized.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-011-1 | Method effectiveness tracked per user per method | Data tracking verification |
| AC-011-2 | Retention score and engagement score calculated per method | Metric calculation verification |
| AC-011-3 | Method selection uses explore/exploit algorithm | Algorithm verification |
| AC-011-4 | Under-tested methods receive exploration bonus | Bonus calculation verification |
| AC-011-5 | No method drops below 10% selection probability | Floor enforcement verification |
| AC-011-6 | User profile convergence tracked and displayed | Dashboard verification |
| AC-011-7 | Method distribution varies by concept modality | Modality-method matching verification |

#### Minimum Method Uses Before Convergence

| Confidence Level | Minimum Uses |
|------------------|--------------|
| Low confidence | 5 uses |
| Medium confidence | 12 uses |
| High confidence | 20+ uses |

---

### 4.12 Feature: Progress Dashboard

**Feature ID:** F-012  
**Priority:** P2 (Medium)  
**Research Basis:** Metacognition (+7-8 months effect); Self-regulated learning

#### User Story

As a learner, I want to see my progress and mastery state so that I understand where I am in my learning journey.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-012-1 | Overall course progress percentage displayed | UX verification |
| AC-012-2 | Per-concept mastery state visible | UX verification |
| AC-012-3 | Learning velocity metrics shown (concepts/week) | Metric display verification |
| AC-012-4 | Streak tracking displayed | UX verification |
| AC-012-5 | Predicted retention shown (with/without continued reviews) | Prediction display verification |
| AC-012-6 | Personalization insights surfaced | UX verification |
| AC-012-7 | Weak areas highlighted with recommended actions | Recommendation display verification |

#### Dashboard Metrics

| Metric | Calculation | User Value |
|--------|-------------|------------|
| Mastery rate | % concepts in MASTERED state | Overall progress |
| Learning velocity | Concepts reaching SOLID per week | Speed indicator |
| Consolidation rate | Morning check success rate | Sleep/retention health |
| Session effectiveness | Average session score | Quality indicator |
| Predicted retention | Model-based estimate at 30/90/180 days | Future outlook |

---

### 4.13 Feature: Maintenance Mode

**Feature ID:** F-013  
**Priority:** P2 (Medium)  
**Research Basis:** Long-term retention requires continued retrieval

#### User Story

As a learner who has completed a course, I want to maintain my knowledge long-term through efficient review sessions.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-013-1 | Course transitions to maintenance mode upon completion | State transition verification |
| AC-013-2 | Review sessions scheduled based on FSRS intervals | Scheduling verification |
| AC-013-3 | Maintenance sessions are brief (3-5 minutes) | Session length verification |
| AC-013-4 | Notification frequency decreases as intervals expand | Notification pattern verification |
| AC-013-5 | Retention estimate updated based on maintenance participation | Estimate update verification |
| AC-013-6 | User can adjust maintenance intensity preference | Settings verification |

#### Maintenance Notification Schedule

| Interval Since Last Review | Notification Urgency |
|---------------------------|---------------------|
| Within FSRS scheduled time | Normal |
| 1-2 days overdue | Gentle reminder |
| 3-7 days overdue | Stronger reminder + retention decay warning |
| >7 days overdue | "Your knowledge is fading" warning |

---

### 4.14 Feature: Teach-Back Mode

**Feature ID:** F-014  
**Priority:** P2 (Medium)  
**Research Basis:** Protégé effect (~50% improvement)

#### User Story

As a learner, I want to explain concepts to an AI "student" so that I deepen my own understanding.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-014-1 | AI assumes role of naive student | UX verification |
| AC-014-2 | AI asks clarifying questions based on user explanation | Question quality audit |
| AC-014-3 | AI identifies gaps in user's explanation | Gap detection verification |
| AC-014-4 | Session provides feedback on explanation completeness | Feedback quality verification |
| AC-014-5 | Available for conceptual and declarative material | Modality matching verification |
| AC-014-6 | Tracked as distinct method in effectiveness matrix | Tracking verification |

#### Teach-Back Prompt Template

```
"I'm new to this topic. Can you explain [concept] to me like 
I've never heard of it before?

I might ask some follow-up questions to make sure I understand."
```

#### AI Follow-Up Question Types

| Question Type | Example |
|---------------|---------|
| Clarification | "What do you mean by [term]?" |
| Connection | "How does that relate to [other concept]?" |
| Example request | "Can you give me an example?" |
| Edge case | "What happens if [unusual condition]?" |
| Application | "How would I use this in [situation]?" |

---

### 4.15 Feature: Transfer-Focused Retrieval (Cognitive Type Matching)

**Feature ID:** F-015  
**Priority:** P0 (Critical)  
**Research Basis:** Transfer deficit research; Cognitive type theory; Application vs recall distinction

#### The Core Problem

**Retention ≠ Application.** A user who perfectly recalls "BATNA stands for Best Alternative to a Negotiated Agreement" but cannot deploy that concept in a real negotiation has not truly learned. Optimizing for atomized fact retention without ensuring transfer to professional contexts is a fundamental failure mode.

#### Research Context

| Finding | Implication |
|---------|-------------|
| Retrieval of procedures and principles transfers better than retrieval of isolated facts | Generate retrieval prompts that match cognitive demands of application |
| Transfer requires practicing the target skill, not just recalling information about it | Declarative knowledge needs different prompts than procedural knowledge |
| Near transfer (similar contexts) is easier than far transfer (novel contexts) | Build transfer scaffolding from near to far |
| Worked examples help novices; retrieval practice helps intermediates | Adapt approach based on learner stage |

**Design Principle:** Every retrieval prompt must be calibrated to the cognitive type of the content and the real-world application context. Definition recall is necessary but never sufficient.

#### User Story

As a learner, I want retrieval practice that prepares me to *use* knowledge in real situations, not just recall definitions on demand.

#### Cognitive Type Taxonomy

During content analysis, each concept must be tagged with its cognitive type:

| Cognitive Type | Definition | Example | Retrieval Prompt Type |
|----------------|------------|---------|----------------------|
| **Factual** | Discrete information that must be recalled accurately | "Strike price" definition | Definition recall + usage context |
| **Conceptual** | Ideas that explain why/how things work | "Why options have time value" | Explanation generation, causal reasoning |
| **Procedural** | Step sequences to accomplish tasks | "How to place an options order" | Step recall, sequencing, simulation |
| **Conditional** | When/where to apply knowledge | "When to use calls vs puts" | Scenario judgment, decision trees |
| **Metacognitive** | Self-monitoring and strategy selection | "How to evaluate if a trade fits your risk profile" | Self-explanation, strategy selection |

#### Retrieval Prompt Generation by Cognitive Type

| Cognitive Type | ❌ Insufficient Prompt | ✅ Transfer-Focused Prompt |
|----------------|------------------------|---------------------------|
| **Factual** | "What does BATNA stand for?" | "Your client is negotiating a salary. Their BATNA would be ___" |
| **Conceptual** | "Define time value" | "A call option expires in 2 months vs 2 weeks. Explain why one costs more." |
| **Procedural** | "List the steps to place an options order" | "You want to buy 5 AAPL calls. Walk through exactly what you'd do in the trading interface." |
| **Conditional** | "When should you buy a put?" | "The market is volatile and you hold 1000 shares of TSLA. What would you consider and why?" |
| **Metacognitive** | "What is position sizing?" | "You're considering this trade. How would you decide if it's appropriate for your portfolio?" |

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-015-1 | Every concept tagged with cognitive type during content analysis | Content audit |
| AC-015-2 | Retrieval prompts match cognitive type (see table above) | Prompt-type alignment audit |
| AC-015-3 | >50% of retrieval prompts require application, not just recall | Prompt distribution analysis |
| AC-015-4 | Scenario-based questions use realistic professional contexts | Context realism review |
| AC-015-5 | Transfer questions progress from near to far transfer | Difficulty progression audit |
| AC-015-6 | AI evaluation criteria account for application quality, not just factual accuracy | Evaluation rubric review |

#### Transfer Scaffolding Progression

| Stage | Transfer Distance | Example |
|-------|-------------------|---------|
| 1. Recognition | Identify concept in described scenario | "Is this an example of X?" |
| 2. Near Transfer | Apply to very similar scenario | Same domain, slightly different parameters |
| 3. Mid Transfer | Apply to related but distinct scenario | Same principles, different surface features |
| 4. Far Transfer | Apply to novel domain | Underlying principle in unexpected context |

**Progression Rule:** User must demonstrate near transfer before far transfer questions appear. Mastery gates include transfer performance, not just recall.

#### Impact on Mastery Definition

**Updated Mastery Criteria:**

| Component | Previous | Updated |
|-----------|----------|---------|
| Recall accuracy | Required | Required but insufficient |
| Application scenarios | Included | **Weighted 40% of mastery check** |
| Transfer questions | Included | **Must pass near + mid transfer** |
| Real-world judgment | Not specified | **Must demonstrate conditional reasoning** |

---

### 4.16 Feature: Forgiveness-First Scheduling (Review Debt Management)

**Feature ID:** F-016  
**Priority:** P0 (Critical)  
**Research Basis:** "Wall of debt" problem documented in SRS communities; Adult learning constraints

#### The Core Problem

Life happens. A professional who disappears for two weeks during a work crunch shouldn't return to 500 overdue reviews and feel like a failure. Traditional SRS systems punish inconsistency, creating anxiety and abandonment.

**Current gap:** Section 5.2 addresses re-engagement after missed days, but doesn't address the *review debt* that accumulates or give users agency over how to handle it.

#### Design Principle: Forgiveness by Default

The system should assume life happens and design for graceful recovery, not punishment for inconsistency. Emotional and motivational load matter as much as cognitive load.

#### User Stories

1. As a learner who got busy, I want to return without being overwhelmed so that I don't abandon the app entirely.
2. As a learner, I want to declare "bankruptcy" on old reviews if needed so that I can start fresh without guilt.
3. As a learner, I want the system to spread my review load intelligently so that I never face an impossible backlog.

#### Feature Components

##### 4.16.1 Review Debt Detection

| Debt Level | Definition | System Response |
|------------|------------|-----------------|
| **Healthy** | <20 overdue items | Normal operation |
| **Elevated** | 20-50 overdue items | Gentle notification, offer extended session |
| **High** | 50-100 overdue items | "Catch-up mode" offered, load spreading |
| **Critical** | >100 overdue items | Bankruptcy option prominently offered |

##### 4.16.2 Load Spreading Algorithm

When debt exceeds healthy threshold:

```
Instead of: "You have 75 reviews due today"

System behavior:
1. Calculate sustainable daily review load (user preference, typically 15-25)
2. Spread overdue items across next N days
3. Prioritize by: (a) highest decay, (b) prerequisite importance, (c) user goals
4. Accept that some items may decay further—this is okay
```

**User Communication:**

```
"You have 75 reviews that built up while you were away.

We've spread these across the next 5 days so you can 
catch up without burnout:

Today: 20 reviews (most critical)
Tomorrow: 18 reviews
...

Some items may have decayed more, but we'll strengthen 
them when we get there. Progress > perfection."
```

##### 4.16.3 Bankruptcy Mode

**When offered:** Review debt >100 items OR user explicitly requests

**Options:**

| Option | Description | Consequence |
|--------|-------------|-------------|
| **Soft Reset** | Reset all items to "due now" with fresh intervals | Restarts spacing, preserves all content |
| **Selective Bankruptcy** | Choose which courses/topics to reset | Focused recovery |
| **Priority Triage** | Keep only items user explicitly wants, archive rest | Reduced scope, maintains engagement |
| **Full Reset** | Reset course to beginning | Nuclear option, rarely needed |

**User Communication:**

```
"Life happens. You have 150+ overdue reviews and that's 
genuinely overwhelming.

You can declare bankruptcy—there's no shame in this. 
Options:

○ Spread it out (10 weeks to catch up gradually)
○ Reset spacing (start fresh, keep your progress)  
○ Focus mode (pick your priorities, archive the rest)
○ Start over (reset the course entirely)

What works best for your situation right now?"
```

##### 4.16.4 Proactive Debt Prevention

| Mechanism | Description |
|-----------|-------------|
| **Ceiling enforcement** | Never let single day exceed 2x normal load, even if algorithm says otherwise |
| **Vacation mode** | User can pre-declare absence; system pauses new scheduling |
| **Auto-spreading** | If user misses a day, automatically spread those reviews forward |
| **Early warning** | "You're on track to have 50 reviews due Monday—want us to spread some to this weekend?" |

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-016-1 | Review debt level calculated and categorized in real-time | System monitoring |
| AC-016-2 | Load spreading activates automatically at "Elevated" threshold | Threshold testing |
| AC-016-3 | Bankruptcy options accessible within 2 taps when debt is "Critical" | UX testing |
| AC-016-4 | User never sees >2x normal daily load without explicit override | Load cap verification |
| AC-016-5 | Vacation mode pauses scheduling without negative consequence | Feature testing |
| AC-016-6 | Zero guilt/shame language in all debt-related messaging | Copy review |

---

### 4.17 Feature: Learner Autonomy & Override Controls

**Feature ID:** F-017  
**Priority:** P0 (Critical)  
**Research Basis:** Andragogy (adult learning theory); Self-determination theory; Autonomy motivation

#### The Core Problem

Adult professionals will not tolerate being bossed around by an algorithm. Unlike captive students, they can (and will) abandon any system that doesn't respect their agency. The algorithm should be a trusted advisor, not an authoritarian scheduler.

#### Design Principles

1. **Recommendations, not commands:** The system suggests; the user decides
2. **Visible rationale:** Users can always see *why* the system recommends something
3. **Frictionless override:** Changing the system's recommendation is easy, not punished
4. **Just-in-time access:** Users can access any content anytime without penalty

#### User Stories

1. As a professional, I want to override the algorithm when I have specific needs so that the tool serves me, not vice versa.
2. As a learner, I want to understand why the system is showing me something so that I can make informed decisions.
3. As an adult, I want to access any content on demand so that I can prepare for real-world needs.

#### Feature Components

##### 4.17.1 Just-In-Time Mode

**Trigger:** User searches for specific content or selects "I need this now"

**Behavior:**

| Scenario | System Response |
|----------|-----------------|
| User requests content scheduled for later | Immediately available, no penalty |
| User requests content from higher level | Warning about prerequisites, but allowed |
| User requests content from completed course | Available for quick review |
| User requests content never started | Full introduction, adds to learning path |

**User Interface:**

```
"Showing you 'Options Greeks' early because you requested it.

Note: This normally comes after 'Intrinsic Value'—some 
concepts may reference things you haven't covered yet.

[Continue anyway] [Learn prerequisites first]"
```

##### 4.17.2 Schedule Override

**Types of Override:**

| Override Type | Description | System Response |
|---------------|-------------|-----------------|
| **Defer** | "Not today" | Reschedule to tomorrow, no penalty |
| **Skip** | "Skip this item" | Remove from today, FSRS adjusts accordingly |
| **Prioritize** | "I need this first" | Move to front of session |
| **Deep Dive** | "More on this topic" | Generate additional practice on demand |
| **Rush** | "I have 5 min only" | Abbreviated session, highest priority only |

**User Communication:**

```
"Today's session: 15 min, 3 new concepts, 12 reviews

You're in control:
[Start as planned]
[Just reviews today - skip new material]
[Quick session - 5 min, essentials only]  
[I need specific content...]"
```

##### 4.17.3 Visible Scheduling Rationale

Every recommendation should be explainable. Users can tap "Why?" on any element.

| Element | Rationale Shown |
|---------|-----------------|
| "Why this concept now?" | "This is the next concept in sequence. You've mastered its prerequisites: [list]" |
| "Why this review?" | "Last reviewed 5 days ago. Your predicted recall is 78%, below our 85% threshold." |
| "Why limited new material?" | "You've already covered 65% of today's capacity. Adding more may interfere with retention." |
| "Why this order?" | "We're interleaving topics to improve long-term retention. Here's the research: [link]" |

**Example "Why?" Response:**

```
Why are you showing me "Time Value Decay"?

"This concept is scheduled because:
• Your last review: 4 days ago
• Predicted recall: 81% (below 85% target)
• Optimal review window: Today through tomorrow

If you don't review it today, predicted recall drops to 
74% by end of week.

[Got it - review now] [Defer to tomorrow] [I know this - skip]"
```

##### 4.17.4 Learning Goal Integration

Users can set explicit goals that influence prioritization:

| Goal Type | Example | System Adaptation |
|-----------|---------|-------------------|
| **Deadline** | "I have a meeting about options on Friday" | Prioritize options content, accelerate schedule |
| **Topic focus** | "I need to understand Greeks specifically" | Weight Greeks-related content higher |
| **Breadth vs depth** | "Overview of everything" vs "Deep on fundamentals" | Adjust mastery thresholds and coverage |

**User Interface:**

```
"Do you have any specific goals right now?

○ No, just continue my learning path
● Yes, I have a deadline:
    [Meeting about options] [Friday]
    
We'll prioritize options content and adjust your 
schedule to maximize readiness by Friday."
```

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-017-1 | Any content accessible via search within 2 taps | UX testing |
| AC-017-2 | "Why?" explanation available for every recommendation | Feature audit |
| AC-017-3 | All override options (defer, skip, prioritize) accessible | Feature testing |
| AC-017-4 | Override actions do not trigger negative feedback or punishment | Behavioral audit |
| AC-017-5 | Goal-based prioritization demonstrably changes content order | Algorithm testing |
| AC-017-6 | Quick session mode available from session start | UX testing |

---

### 4.18 Feature: Variable Executive Function Support

**Feature ID:** F-018  
**Priority:** P1 (High)  
**Research Basis:** Executive function variability; Cognitive resource depletion; Adult life constraints

#### The Core Problem

Executive function varies dramatically day-to-day based on sleep, stress, workload, and life circumstances. A system optimized for "average" cognitive capacity will frequently mismatch the user's actual state—leading to either under-challenge (boring) or over-challenge (overwhelming).

#### User Stories

1. As a learner having a rough day, I want an "easy mode" so that I can stay consistent without being overwhelmed.
2. As a learner with high energy, I want to do more so that I can capitalize on good days.
3. As a learner, I want the system to detect when I'm struggling and adapt automatically.

#### Feature Components

##### 4.18.1 Self-Reported Energy Level

At session start (optional, not required):

```
"How's your brain today?

🔋🔋🔋 High energy - challenge me
🔋🔋   Normal - standard session
🔋     Low energy - take it easy
⚡     Quick check-in only (2 min)"
```

**System Adaptation by Energy Level:**

| Level | New Concepts | Question Difficulty | Session Length |
|-------|--------------|--------------------| ---------------|
| High | Up to 4 | Include far transfer | Up to 25 min |
| Normal | 2-3 | Standard mix | 12-18 min |
| Low | 0-1 | Recognition + near transfer only | 8-12 min |
| Quick | 0 | Review only, easiest format | 2-5 min |

##### 4.18.2 Automatic Energy Detection

If user doesn't self-report, detect from behavior:

| Signal | Interpretation | Adaptation |
|--------|----------------|------------|
| Response times 50%+ slower than baseline | Low energy | Reduce difficulty, shorten session |
| Error rate 2x normal | Struggling | Offer to pause, simplify |
| Multiple "I don't know" responses | Overwhelmed | Switch to review, offer encouragement |
| Fast + accurate | High energy | Can offer additional challenge |

##### 4.18.3 "Easy Day" Explicit Mode

User can always select this from home screen:

```
"Easy Day Mode

Today isn't a full learning day, and that's okay.
You'll get:
• Review only (no new material)
• Simpler question formats
• Half the usual session length

Consistency > intensity. Showing up matters most.

[Start Easy Session]"
```

##### 4.18.4 Flexible Daily Caps

User-configurable ceiling for overwhelming days:

| Setting | Description |
|---------|-------------|
| **Max new concepts** | "Never more than N new concepts per day" |
| **Max session time** | "Stop suggesting content after N minutes" |
| **Max review items** | "Cap reviews at N per day" |
| **Weekly budget** | "I can do X hours total this week—spread it out" |

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-018-1 | Energy level selection available at session start | UX testing |
| AC-018-2 | Session adapts measurably based on reported energy | Session comparison |
| AC-018-3 | Automatic energy detection triggers within-session adaptation | Behavior trigger testing |
| AC-018-4 | "Easy Day" mode accessible from home screen | UX testing |
| AC-018-5 | User-configurable caps honored by session construction | Cap enforcement testing |

---

### 4.19 Feature: Confidence-Based Metacognition

**Feature ID:** F-019  
**Priority:** P1 (High)  
**Research Basis:** Metacognition (+7-8 months effect); Calibration training; Overconfidence detection

#### The Core Problem

Users often don't know what they don't know. Overconfidence leads to premature advancement; underconfidence leads to unnecessary repetition. Confidence ratings before answer reveal enhance metacognitive awareness and improve calibration.

#### Design Enhancement

The current spec mentions confidence in real-time assessment (Section 3.2.5) but doesn't make it a user-facing metacognitive feature. This feature promotes it to an explicit learning tool.

#### User Story

As a learner, I want to track how well-calibrated my confidence is so that I can identify blind spots and build accurate self-assessment.

#### Feature Components

##### 4.19.1 Pre-Answer Confidence Rating

After user completes answer, before feedback:

```
"Before I show you if you're right...

How confident are you?

[Guessing] [Unsure] [Fairly sure] [Certain]"
```

**This is optional but encouraged.** Can be disabled in settings.

##### 4.19.2 Calibration Tracking

| Confidence + Outcome | Label | User Insight |
|---------------------|-------|--------------|
| Certain + Correct | Well-calibrated | "Your confidence matches your knowledge" |
| Certain + Incorrect | **Overconfident** | "You thought you knew this but didn't—worth extra attention" |
| Guessing + Correct | Lucky or Underconfident | "You knew more than you thought!" |
| Guessing + Incorrect | Appropriate uncertainty | "Good self-awareness—you knew you weren't sure" |

##### 4.19.3 Calibration Dashboard

```
"Your Confidence Calibration

When you say 'Certain':     82% actually correct
When you say 'Fairly sure': 71% actually correct  
When you say 'Unsure':      54% actually correct
When you say 'Guessing':    31% actually correct

📊 You're slightly overconfident on Options Greeks—
   you said 'Certain' but got 3 of 5 wrong.
   
This is a blind spot worth addressing."
```

##### 4.19.4 System Use of Confidence Data

| Pattern | System Response |
|---------|-----------------|
| Consistent overconfidence on topic X | Add more difficult questions; flag as blind spot |
| Consistent underconfidence | Provide encouragement; surface past successes |
| High confidence + incorrect | **Priority intervention** (likely misconception) |
| Improving calibration over time | Celebrate metacognitive growth |

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-019-1 | Confidence prompt appears after answer, before feedback | UX flow testing |
| AC-019-2 | Confidence is optional and can be disabled | Settings testing |
| AC-019-3 | Calibration calculated and displayed in dashboard | Feature testing |
| AC-019-4 | Overconfidence patterns flagged as blind spots | Detection logic testing |
| AC-019-5 | High confidence + incorrect triggers priority handling | Intervention testing |

---

### 4.20 Feature: Integrated Question-Context Display (Mobile Optimization)

**Feature ID:** F-020  
**Priority:** P1 (High)  
**Research Basis:** Split-attention effect (Cognitive Load Theory); Mobile UX constraints

#### The Core Problem

On mobile devices, questions that require referencing source material create split attention—users must hold information in working memory while switching contexts. This increases cognitive load unnecessarily and impairs learning.

#### Design Principle

Questions and relevant context must be **visually integrated** on the same screen whenever possible. Users should never need to tap away to find information needed to answer a question.

#### Feature Components

##### 4.20.1 Contextual Question Display

| Question Type | Context Integration |
|---------------|---------------------|
| Recall question | No context shown (testing memory) |
| Application scenario | Scenario fully visible while answering |
| Reference-based question | Relevant excerpt/diagram shown alongside |
| Comparison question | Both elements visible simultaneously |

**Example: Application Scenario**

```
┌─────────────────────────────────────────┐
│ SCENARIO                                │
│ ─────────────────────────────────────── │
│ Apple stock is at $175. You own a call  │
│ option with a $170 strike price that    │
│ expires in 2 weeks. You paid $8 for it. │
│                                         │
│ ─────────────────────────────────────── │
│ QUESTION                                │
│ Is this option in the money, at the     │
│ money, or out of the money?             │
│                                         │
│ [In the money]                          │
│ [At the money]                          │
│ [Out of the money]                      │
│                                         │
│ ─────────────────────────────────────── │
│ All information needed is above.        │
└─────────────────────────────────────────┘
```

##### 4.20.2 Progressive Disclosure for Complex Scenarios

For longer scenarios, show key information first with option to expand:

```
┌─────────────────────────────────────────┐
│ KEY FACTS                               │
│ • Stock: $175                           │
│ • Strike: $170 (call)                   │
│ • Expires: 2 weeks                      │
│ • Premium paid: $8                      │
│                                         │
│ [Show full scenario]                    │
│                                         │
│ ─────────────────────────────────────── │
│ What's the intrinsic value?             │
│                                         │
│ [Answer field]                          │
└─────────────────────────────────────────┘
```

##### 4.20.3 Diagram and Visual Integration

When source material contains diagrams:

| Content Type | Display Approach |
|--------------|------------------|
| Simple diagram | Show inline with question |
| Complex diagram | Zoomable, stays on screen while answering |
| Multiple visuals | Carousel that doesn't dismiss question |
| Video timestamp | Link to exact timestamp, opens in split view |

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-020-1 | Application scenarios display context + question on single screen | UX audit |
| AC-020-2 | No question requires navigation away to find answer information | Question review |
| AC-020-3 | Complex scenarios use progressive disclosure | UX testing |
| AC-020-4 | Diagrams remain visible while answering | Feature testing |
| AC-020-5 | Mobile layout tested on smallest supported screen (iPhone SE) | Device testing |

---

### 4.21 Feature: AI-Powered Interactive Practice Environment (Dynamic Playground)

**Feature ID:** F-021  
**Priority:** P0 (Critical)  
**Research Basis:** Productive failure (d = 0.36, up to 3x); Desirable difficulties; Procedural learning requires execution; Transfer requires practicing the target skill

#### The Core Problem

Multiple choice and fill-in-the-blank questions, while useful for basic recall, are fundamentally **recognition tasks**—the user identifies the correct answer from options rather than **generating** solutions or **executing** skills. The research is clear: learning that involves struggle, generation, and execution produces dramatically better retention and transfer.

Traditional apps are limited to static interaction patterns. **An AI-powered app can dynamically generate custom interactive experiences**—simulations, games, puzzles, mini-applications—that force users to actually *do* the thing they're learning, not just answer questions *about* it.

#### Research Foundation

| Finding | Effect Size | Implication |
|---------|-------------|-------------|
| Productive failure | d = 0.36 (up to 3x teacher effect) | Struggling before instruction deepens learning |
| Free recall > recognition | g = 0.81 vs lower | Generation is harder but more effective |
| Procedural knowledge requires practice | Strong | Can't learn video editing by answering questions about it |
| Transfer requires practicing target skill | Strong | Must execute, not just recall |
| Desirable difficulties | Meta-principle | Harder practice = better long-term retention |

**Key Insight:** AI can generate code on-the-fly to create interactive environments that were previously impossible in learning apps. This transforms the app from a "question-answer" system into a **"practice-execute-feedback"** system.

#### Design Principle

For any learnable skill, the app should create the **closest possible approximation to actual practice** within mobile constraints. AI generates custom interactive experiences matched to the content—not generic templates, but bespoke challenges derived from the specific source material.

#### User Story

As a learner, I want to practice skills by actually doing them in interactive environments so that I develop real capability, not just knowledge about capability.

#### Architectural Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC PLAYGROUND ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    CONTENT ANALYSIS                          │    │
│  │  Identifies: What skill/task does this content teach?       │    │
│  │  Outputs: Interaction type, complexity, success criteria    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               AI INTERACTION GENERATOR                       │    │
│  │  Generates: Custom code for interactive experience          │    │
│  │  Types: Simulations, games, puzzles, mini-apps, sandboxes   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 SECURE RUNTIME ENVIRONMENT                   │    │
│  │  Executes: AI-generated interactive components safely       │    │
│  │  Captures: User actions, decisions, timing, outcomes        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 AI ASSESSMENT ENGINE                         │    │
│  │  Evaluates: User performance against success criteria       │    │
│  │  Provides: Contextual feedback, identifies gaps             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 ADAPTIVE ITERATION LOOP                      │    │
│  │  Generates: Next challenge based on performance             │    │
│  │  Adjusts: Difficulty, scaffolding, focus areas              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Interaction Types by Content Modality

| Content Modality | Traditional Approach | Dynamic Playground Approach |
|------------------|---------------------|----------------------------|
| **Software Proficiency** (video editing, Excel) | "Where is the ripple edit tool?" | AI generates simplified UI mockup; user performs the actual operation |
| **Procedural** (following steps) | "List the steps to..." | Interactive walkthrough where user executes each step in sequence |
| **Strategic/Decision** (options trading) | "What would you do if..." | Trading simulator with real-time feedback on decisions |
| **Conceptual** (physics, economics) | "Explain why..." | Interactive visualization user can manipulate to test hypotheses |
| **Language** | "Translate this sentence" | Conversation simulator with branching dialogue |
| **Perceptual** (medical imaging, design) | "Is this X or Y?" | Pattern recognition game with progressive difficulty |
| **Mathematical** | "Solve for X" | Step-by-step solver where user executes each transformation |
| **Creative** (writing, design) | "What would be a good..." | Open canvas with AI feedback on user creation |

#### Feature Components

##### 4.21.1 Interaction Type Classification

During content analysis, each concept is tagged with its optimal interaction type:

```json
{
  "concept_id": "c042",
  "name": "Ripple Edit in Video Editing",
  "cognitive_type": "procedural_software",
  "optimal_interaction": {
    "type": "ui_simulation",
    "complexity": "medium",
    "requires": ["timeline_display", "clip_objects", "edit_tool_buttons"],
    "success_criteria": {
      "action_sequence": ["select_clip", "choose_ripple_tool", "drag_edge", "observe_shift"],
      "outcome": "Adjacent clips shift to fill gap"
    }
  }
}
```

##### 4.21.2 AI Interaction Generator

The AI generates custom interactive components based on content analysis:

**Input:** Concept metadata, interaction type, difficulty level, user history  
**Output:** Executable code for interactive experience

**Generation Prompt Template:**

```
Given this learning objective:
- Concept: {concept_name}
- Skill type: {procedural_software}
- Context: {video_editing}
- Key operation: {ripple_edit}
- Success criteria: {criteria}

Generate an interactive React component that:
1. Simulates a simplified video editing timeline
2. Contains 4 clips on the timeline
3. Allows user to select the ripple edit tool
4. Allows user to drag clip edges
5. Demonstrates ripple behavior (adjacent clips shift)
6. Tracks user actions for assessment
7. Provides visual feedback on correct/incorrect operations

Constraints:
- Mobile-optimized (touch interactions)
- Self-contained (no external dependencies)
- Captures: action sequence, timing, errors, completion
```

**Example Generated Interactions:**

| Learning Objective | Generated Interaction |
|-------------------|----------------------|
| Options profit/loss calculation | Interactive P&L chart where user drags stock price and sees option value change |
| SQL JOIN operations | Mini database sandbox where user writes and executes queries against sample data |
| Color theory | Interactive color wheel where user mixes colors to match targets |
| Negotiation tactics | Branching dialogue simulator where user chooses responses and sees outcomes |
| Financial statement analysis | Interactive balance sheet where user identifies red flags |
| Git branching | Visual git tree where user executes merge/rebase operations |

##### 4.21.3 Secure Runtime Environment

**Purpose:** Execute AI-generated interactive components safely within the app.

**Technical Requirements:**

| Requirement | Specification |
|-------------|---------------|
| Sandboxing | Isolated execution environment, no access to device APIs |
| Code review | AI-generated code validated against safety rules before execution |
| Resource limits | CPU, memory, and execution time caps |
| State capture | All user interactions logged for assessment |
| Error handling | Graceful degradation if component fails |
| Offline capability | Generated components can be cached and run offline |

**Technology Options:**

| Approach | Pros | Cons |
|----------|------|------|
| React Native WebView | Full web capabilities, flexible | Performance overhead |
| Custom renderer | Optimized for specific interaction types | Limited flexibility |
| Server-side rendering | Offloads computation | Requires connectivity |
| Hybrid | Different approaches for different complexity levels | Implementation complexity |

**State Capture Schema:**

```json
{
  "interaction_id": "int_12345",
  "concept_id": "c042",
  "user_id": "u789",
  "interaction_type": "ui_simulation",
  "events": [
    {"timestamp": 0, "action": "view_start", "state": {}},
    {"timestamp": 2340, "action": "tap", "target": "clip_2", "state": {"selected": "clip_2"}},
    {"timestamp": 4120, "action": "tap", "target": "ripple_tool", "state": {"tool": "ripple"}},
    {"timestamp": 6890, "action": "drag", "target": "clip_2_edge", "delta": -50, "state": {"clips_shifted": true}},
    {"timestamp": 8200, "action": "complete", "outcome": "success"}
  ],
  "total_duration_ms": 8200,
  "errors": [],
  "hints_used": 0
}
```

##### 4.21.4 AI Assessment Engine

**Purpose:** Evaluate user performance on open-ended, interactive tasks.

**Challenge:** Unlike multiple choice (objectively correct/incorrect), interactive tasks require nuanced assessment of process and outcome.

**Assessment Dimensions:**

| Dimension | What It Measures | How Assessed |
|-----------|------------------|--------------|
| **Outcome correctness** | Did user achieve the goal? | Compare final state to success criteria |
| **Process quality** | Did user take an efficient/correct path? | Analyze action sequence |
| **Error patterns** | What mistakes were made? | Detect deviation from optimal path |
| **Time efficiency** | How quickly did user complete? | Compare to baseline |
| **Independence** | Did user need hints? | Track hint requests |
| **Conceptual understanding** | Does user understand *why*? | Follow-up explanation prompt |

**Assessment Prompt Template:**

```
Given this interaction record:
- Task: {task_description}
- Success criteria: {criteria}
- User action sequence: {events}
- Final outcome: {outcome}
- Time taken: {duration}

Evaluate:
1. Did the user achieve the correct outcome? (yes/partial/no)
2. Was the process efficient? (optimal/acceptable/inefficient/incorrect)
3. What specific errors or hesitations occurred?
4. What does this reveal about user understanding?
5. What feedback would help the user improve?
6. What follow-up practice would reinforce weak areas?

Provide structured assessment:
{
  "outcome_score": 0.0-1.0,
  "process_score": 0.0-1.0,
  "identified_gaps": [],
  "feedback": "",
  "follow_up_recommendation": ""
}
```

**Example Assessment:**

```json
{
  "outcome_score": 1.0,
  "process_score": 0.7,
  "identified_gaps": [
    "User tried regular trim before ripple edit (may not understand the difference)"
  ],
  "feedback": "You got the right result! I noticed you first tried the regular trim tool. The difference is: regular trim leaves a gap, ripple edit automatically closes the gap. This matters when you want to keep clips tightly connected.",
  "follow_up_recommendation": "Generate comparison task: regular trim vs ripple edit side-by-side"
}
```

##### 4.21.5 Adaptive Iteration Loop

**Purpose:** Generate progressively challenging interactions based on user performance.

**Iteration Logic:**

```
AFTER each interactive task:

IF outcome_score < 0.5:
    → Re-teach concept with simpler example
    → Generate scaffolded version (with hints visible)
    
ELIF outcome_score >= 0.5 AND process_score < 0.7:
    → User got it but inefficiently
    → Generate same difficulty with focus on identified_gaps
    → Add process guidance ("Try to do it in fewer steps")
    
ELIF outcome_score >= 0.8 AND process_score >= 0.7:
    → User has basic competency
    → Generate harder variation:
        - More complex scenario
        - Time pressure
        - Combined with other skills
        - Novel context (transfer challenge)
        
IF user_completes(3 variations at high_difficulty):
    → Mark skill as "execution competent"
    → Schedule spaced review with new variations
```

**Difficulty Progression Example (Video Editing - Ripple Edit):**

| Level | Task Variation |
|-------|----------------|
| 1. Basic | 4 clips, ripple edit middle clip |
| 2. Context | 6 clips, ripple edit while maintaining sync with audio track |
| 3. Combined | Perform ripple edit + add transition + adjust timing |
| 4. Problem-solving | "This edit created a jump cut—how would you fix it?" |
| 5. Transfer | Apply same concept in different NLE interface mockup |

##### 4.21.6 Interaction Library (Pre-Built + Custom)

**Pre-Built Templates:**

For common learning domains, maintain a library of customizable interaction templates:

| Domain | Template Type | Customization Points |
|--------|---------------|---------------------|
| Software UI | Generic toolbar + canvas | Icons, tool behaviors, canvas content |
| Trading/Finance | Chart + order entry | Instrument, price data, order types |
| Data/Analytics | Table + query interface | Schema, sample data, expected queries |
| Language | Conversation interface | Characters, scenario, vocabulary |
| Math/Logic | Step-by-step solver | Problem type, operations allowed |
| Design | Canvas + tools | Color palette, shapes, constraints |
| Flowchart/Process | Node editor | Node types, connection rules, goal state |

**Custom Generation:**

When no template fits, AI generates from scratch within component library constraints.

##### 4.21.7 Mobile-Optimized Interaction Patterns

| Interaction Need | Mobile Pattern |
|------------------|----------------|
| Precise positioning | Snap-to-grid, zoom + fine adjust |
| Multi-step operations | Guided overlay, step indicator |
| Text entry | Smart suggestions, voice input option |
| Complex selection | Tap-and-hold context menus |
| Visualization manipulation | Pinch-zoom, swipe to adjust |
| Timing-based tasks | Generous touch targets, visual cue timing |

##### 4.21.8 Mode-Switching Logic: Simulation vs. Orchestration

**Core Principle:** The Dynamic Playground operates in two distinct modes based on whether the skill can be meaningfully practiced within the app.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODE SELECTION LOGIC                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DURING CONTENT ANALYSIS:                                           │
│                                                                      │
│  FOR EACH concept/skill:                                            │
│      ASSESS simulation_feasibility:                                 │
│          - Can the core action be performed on a screen?            │
│          - Can success/failure be detected programmatically?        │
│          - Does in-app practice transfer to real-world use?         │
│                                                                      │
│      IF simulation_feasibility >= "good":                           │
│          mode = SIMULATION                                          │
│          → Generate interactive practice environments               │
│          → User executes skill within app                           │
│          → AI assesses performance directly                         │
│                                                                      │
│      ELIF simulation_feasibility == "partial":                      │
│          mode = HYBRID                                              │
│          → Simulate what's possible (knowledge, perception)         │
│          → Orchestrate real-world practice for rest                 │
│          → Combine both assessment sources                          │
│                                                                      │
│      ELSE (simulation_feasibility == "none"):                       │
│          mode = ORCHESTRATION                                       │
│          → Generate practice assignments with focus cues            │
│          → Provide troubleshooting based on reported problems       │
│          → Optionally analyze user recordings                       │
│          → Track self-reported progress                             │
│          → Space technique knowledge reviews                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Mode Definitions:**

| Mode | When Used | App Role | Examples |
|------|-----------|----------|----------|
| **SIMULATION** | Core skill executable on screen | Practice environment | Language conversation, trading decisions, software UI, coding, math solving |
| **HYBRID** | Some components simulable, others not | Partial practice + coach | Music theory (simulable) + instrument playing (not); Presentation design (simulable) + delivery (not) |
| **ORCHESTRATION** | Physical/motor skill, real-world only | Practice coach | Whistling, sports techniques, cooking, handwriting, public speaking |

**Simulation Feasibility Assessment Criteria:**

```json
{
  "concept_id": "c042",
  "skill_name": "Ripple Edit in Video Editing",
  "feasibility_assessment": {
    "can_perform_on_screen": true,
    "success_detectable": true,
    "transfers_to_real_world": true,
    "requires_physical_feedback": false,
    "requires_real_materials": false,
    "requires_real_environment": false
  },
  "simulation_feasibility": "excellent",
  "mode": "SIMULATION"
}
```

```json
{
  "concept_id": "c108",
  "skill_name": "Pucker Whistle Technique",
  "feasibility_assessment": {
    "can_perform_on_screen": false,
    "success_detectable": "partial (audio analysis)",
    "transfers_to_real_world": "N/A",
    "requires_physical_feedback": true,
    "requires_real_materials": false,
    "requires_real_environment": false
  },
  "simulation_feasibility": "none",
  "mode": "ORCHESTRATION",
  "orchestration_capabilities": {
    "can_analyze_recordings": true,
    "can_provide_troubleshooting": true,
    "can_train_perception": true,
    "can_test_technique_knowledge": true
  }
}
```

```json
{
  "concept_id": "c095",
  "skill_name": "Piano - Playing a C Major Scale",
  "feasibility_assessment": {
    "can_perform_on_screen": "partial (virtual keyboard)",
    "success_detectable": true,
    "transfers_to_real_world": "limited (no tactile feedback)",
    "requires_physical_feedback": true,
    "requires_real_materials": "preferred (real piano)",
    "requires_real_environment": false
  },
  "simulation_feasibility": "partial",
  "mode": "HYBRID",
  "simulation_components": ["note_recognition", "rhythm", "music_theory", "sight_reading"],
  "orchestration_components": ["finger_technique", "hand_position", "dynamics", "pedaling"]
}
```

**Mode-Specific Interaction Generation:**

| Mode | Interaction Types Generated |
|------|----------------------------|
| **SIMULATION** | UI simulations, dialogue simulators, construction exercises, trading games, coding sandboxes, interactive visualizations |
| **HYBRID** | Simulations for knowledge components + practice assignments for physical components + integration exercises |
| **ORCHESTRATION** | Practice assignments with focus cues, troubleshooting flows, recording analysis, perceptual training, self-report check-ins |

**User Transparency:**

When in ORCHESTRATION mode, the app explicitly communicates:

```
┌─────────────────────────────────────────────┐
│  🎯 This skill requires real-world practice │
│                                             │
│  Whistling is a physical skill that can't   │
│  be learned through an app alone.           │
│                                             │
│  HERE'S HOW I'LL HELP:                      │
│  ✓ Teach you the technique                  │
│  ✓ Give you focused practice assignments    │
│  ✓ Help troubleshoot when you're stuck      │
│  ✓ Analyze recordings of your attempts      │
│  ✓ Track your progress over time            │
│                                             │
│  The learning happens when YOU practice.    │
│  I'm your coach, not your simulator.        │
│                                             │
│              [Let's begin →]                │
└─────────────────────────────────────────────┘
```

##### 4.21.9 Interaction Feedback & Adaptation System

**Purpose:** Learn what interaction styles actually help each user learn from each specific source, and adapt accordingly.

**Core Principle:** Performance data tells us if the user *got it right*. Feedback data tells us if the interaction style *felt helpful*. Both signals matter for optimization.

**Feedback Capture:**

After each interaction, offer lightweight feedback option:

```
┌─────────────────────────────────────────────┐
│  [Interaction just completed]               │
│                                             │
│  Was this helpful for learning?             │
│                                             │
│  [👎]  [😐]  [👍]                           │
│                                             │
│  (Optional—tap to skip)                     │
└─────────────────────────────────────────────┘
```

**Feedback Data Schema:**

```json
{
  "feedback_id": "fb_29481",
  "interaction_id": "int_12345",
  "user_id": "u789",
  "source_id": "spanish_travel_01",
  "concept_id": "c042",
  "interaction_type": "dialogue_simulator",
  "interaction_subtype": "restaurant_ordering",
  "difficulty_level": 2,
  "user_performance": {
    "outcome_score": 0.88,
    "process_score": 0.82,
    "time_taken_ms": 145000
  },
  "user_feedback": {
    "helpful_rating": "positive",  // "negative" | "neutral" | "positive"
    "timestamp": "2024-12-26T14:32:00Z"
  }
}
```

**Adaptation Logic:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERACTION ADAPTATION ENGINE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AGGREGATION LEVEL: Per source × per interaction type               │
│                                                                      │
│  FOR source_id, interaction_type IN user_feedback_history:          │
│                                                                      │
│      positive_rate = count(positive) / count(all_feedback)          │
│      negative_rate = count(negative) / count(all_feedback)          │
│      sample_size = count(all_feedback)                              │
│                                                                      │
│      IF sample_size >= 3:  // Minimum for pattern detection         │
│                                                                      │
│          IF positive_rate >= 0.7:                                   │
│              interaction_weight[source][type] = INCREASE            │
│              → Generate MORE of this interaction type               │
│              → Use as template for similar concepts                 │
│                                                                      │
│          ELIF negative_rate >= 0.5:                                 │
│              interaction_weight[source][type] = DECREASE            │
│              → Generate FEWER of this interaction type              │
│              → Try alternative approaches                           │
│              → Flag for review if consistently negative             │
│                                                                      │
│          ELSE:                                                      │
│              interaction_weight[source][type] = NEUTRAL             │
│              → Continue normal generation                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Source-Specific Profiles:**

Each source material develops its own interaction preference profile:

```json
{
  "source_id": "spanish_travel_01",
  "user_id": "u789",
  "interaction_preferences": {
    "dialogue_simulator": {
      "feedback_count": 8,
      "positive_rate": 0.875,
      "weight": "increased",
      "notes": "User finds conversation practice highly valuable"
    },
    "word_bank_construction": {
      "feedback_count": 5,
      "positive_rate": 0.40,
      "weight": "decreased",
      "notes": "User finds word banks too easy/unhelpful"
    },
    "free_construction": {
      "feedback_count": 4,
      "positive_rate": 0.75,
      "weight": "increased",
      "notes": "Prefers unscaffolded generation"
    },
    "audio_discrimination": {
      "feedback_count": 3,
      "positive_rate": 0.67,
      "weight": "neutral",
      "notes": "Acceptable but not preferred"
    }
  },
  "generated_insight": "This user prefers harder, less scaffolded interactions for language learning. Prioritize dialogue simulators and free construction over word banks."
}
```

**Cross-Source Learning (with caution):**

```
IF user has preferences from similar source:
    
    similar_source = find_similar(current_source, user_sources)
    
    IF similar_source.domain == current_source.domain:
        // E.g., both are language courses
        → Use similar_source preferences as STARTING POINT
        → But still collect feedback for current source
        → Allow divergence if feedback differs
        
    ELSE:
        // Different domains—don't assume transfer
        → Start fresh for current source
```

**Feedback-Driven Generation Example:**

User is learning Spanish from "Conversational Spanish for Travelers":

```
Session 8 - Generating practice for "Asking for Directions"

USER PROFILE FOR THIS SOURCE:
- Dialogue simulators: 👍👍👍👍👍👍👍 (87.5% positive) → INCREASE
- Word bank exercises: 👍👎👎👍👎 (40% positive) → DECREASE  
- Free construction: 👍👍👍👎 (75% positive) → INCREASE
- Scene discovery: 👍👍👎 (67% positive) → NEUTRAL

GENERATION DECISION:
- Skip word bank scaffolding (user finds unhelpful)
- Go directly to free construction for vocabulary
- Prioritize dialogue simulator for main practice
- Include scene discovery only if time permits

GENERATED SESSION:
1. Pretest: Free response (no word bank)
2. Brief vocabulary in context
3. Direction-giving dialogue simulator (extended version)
4. Skip: word bank grammar exercise
5. Add: Second dialogue scenario (because user loves these)
```

**Explicit Preference Controls:**

Users can also explicitly set preferences:

```
┌─────────────────────────────────────────────┐
│  ⚙️ Learning Preferences                    │
│     for "Conversational Spanish"            │
│                                             │
│  CONVERSATION PRACTICE                      │
│  [━━━━━━━━━━━━━━━●] More                    │
│  You've rated these 👍 consistently         │
│                                             │
│  WORD BANK EXERCISES                        │
│  [●━━━━━━━━━━━━━━━] Less                    │
│  You've rated these 👎 often                │
│                                             │
│  GRAMMAR CONSTRUCTION                       │
│  [━━━━━━━●━━━━━━━━] Balanced                │
│                                             │
│  FREE RECALL PROMPTS                        │
│  [━━━━━━━━━━━━●━━━] More                    │
│                                             │
│  These are auto-adjusted based on your      │
│  feedback. Override anytime.                │
│                                             │
│         [Reset to default]  [Save]          │
└─────────────────────────────────────────────┘
```

**Feedback Timing & Frequency:**

| Scenario | Feedback Prompt |
|----------|-----------------|
| New interaction type (first 3 uses) | Always prompt |
| Established interaction type | Prompt 1 in 5 times (20%) |
| After major difficulty change | Always prompt |
| User skipped/abandoned interaction | Prompt with "What went wrong?" |
| User explicitly requested type | Don't prompt (implicit positive) |

**Negative Feedback Deep Dive:**

When user gives 👎, optionally ask why:

```
┌─────────────────────────────────────────────┐
│  What didn't work about this?               │
│                                             │
│  ○ Too easy / didn't challenge me           │
│  ○ Too hard / got frustrated                │
│  ○ Confusing instructions                   │
│  ○ Took too long                            │
│  ○ Not relevant to what I'm learning        │
│  ○ Technical issue / didn't work right      │
│  ○ Other: [____________]                    │
│                                             │
│  [Skip]              [Submit]               │
└─────────────────────────────────────────────┘
```

**System Response to Feedback Patterns:**

| Pattern Detected | System Response |
|------------------|-----------------|
| Consistent 👍 on dialogue simulators | Generate more, extend duration, add complexity |
| Consistent 👎 on word banks | Remove scaffolding, go to free construction |
| 👎 with "too easy" | Increase difficulty, skip scaffolded versions |
| 👎 with "too hard" | Add scaffolding, break into smaller steps |
| 👎 with "took too long" | Generate shorter interactions, split into parts |
| 👎 with "confusing" | Simplify instructions, add examples first |
| Mixed feedback (no pattern) | Continue balanced generation, keep sampling |

**Interaction Quality Metrics (Internal):**

Beyond user feedback, track objective quality signals:

| Metric | What It Indicates |
|--------|-------------------|
| Completion rate | Did users finish the interaction? |
| Time-to-completion | Appropriate difficulty? |
| Retry rate | User wanted to try again (positive) |
| Skip rate | User avoided this type (negative) |
| Help/hint usage | Needed more scaffolding? |
| Post-interaction retention | Did this interaction style produce durable learning? |

**The Ultimate Validation:**

```
BEST SIGNAL = Retention correlation

FOR each interaction_type:
    
    concepts_learned_via_type = get_concepts(interaction_type)
    retention_30_day = measure_retention(concepts, days=30)
    
    IF retention_30_day > baseline:
        → This interaction type WORKS for this user/source
        → Weight it higher even if user feedback is neutral
        
    IF user_feedback == positive AND retention_30_day > baseline:
        → Perfect alignment—maximize this interaction type
        
    IF user_feedback == positive BUT retention_30_day <= baseline:
        → User likes it but it's not working
        → Gently introduce alternatives, explain why
        → "You enjoy word banks, but your retention is higher 
           with free construction. Want to try more of those?"
```

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-021-1 | Content analysis identifies optimal interaction type per concept | Analysis audit |
| AC-021-2 | AI generates functional interactive components for identified types | Generation testing |
| AC-021-3 | Generated components execute safely in sandboxed environment | Security audit |
| AC-021-4 | All user actions captured with sufficient granularity for assessment | Data capture verification |
| AC-021-5 | AI assessment produces meaningful feedback on open-ended tasks | Assessment quality audit (human comparison) |
| AC-021-6 | Iteration loop adjusts difficulty appropriately based on performance | Adaptation testing |
| AC-021-7 | Interactive components work on smallest supported device (iPhone SE) | Device testing |
| AC-021-8 | Components can run offline after initial generation | Offline testing |
| AC-021-9 | Assessment latency <5 seconds for typical interactions | Performance testing |
| AC-021-10 | Mode selection (Simulation/Hybrid/Orchestration) correctly identifies skill type | Mode classification audit |
| AC-021-11 | Orchestration mode generates appropriate practice assignments and troubleshooting | Content review |
| AC-021-12 | User transparently informed when skill requires real-world practice | UX audit |
| AC-021-13 | Feedback prompt appears at appropriate frequency (100% for new types, 20% for established) | Frequency verification |
| AC-021-14 | Interaction preferences tracked per source × interaction type | Data model verification |
| AC-021-15 | Generation adapts to user feedback within 3 feedback samples | Adaptation testing |
| AC-021-16 | User can view and override learned preferences | Feature testing |
| AC-021-17 | Retention correlation tracked and surfaced when misaligned with user preference | Analytics verification |

#### Example: Complete Flow for "Video Editing - Ripple Edit"

**1. Content Analysis Output:**
```json
{
  "concept": "Ripple Edit",
  "source": "Video editing tutorial, timestamp 4:32-6:15",
  "cognitive_type": "procedural_software",
  "interaction_type": "ui_simulation",
  "prerequisite_concepts": ["timeline_basics", "clip_selection"],
  "success_criteria": "User performs ripple edit that closes gap between clips"
}
```

**2. AI Generates Interactive Component:**
```jsx
// AI-generated simplified NLE timeline
<TimelineSimulator
  clips={[
    {id: 1, duration: 5, color: 'blue'},
    {id: 2, duration: 3, color: 'green'},
    {id: 3, duration: 4, color: 'red'},
    {id: 4, duration: 6, color: 'purple'}
  ]}
  tools={['select', 'trim', 'ripple']}
  task="Use the ripple edit tool to shorten clip 2. Watch what happens to clip 3."
  onComplete={captureState}
/>
```

**3. User Interacts:**
- Sees simplified timeline with 4 colored clips
- Taps ripple tool
- Drags edge of clip 2
- Observes clip 3 shift to fill the gap
- All actions logged

**4. AI Assesses:**
```json
{
  "outcome_score": 1.0,
  "process_score": 0.85,
  "feedback": "Perfect! You correctly used the ripple tool and the timeline stayed gap-free. You hesitated before selecting the tool—remember, ripple is for when you want to keep everything connected.",
  "next_challenge": "Now try it with an audio track that needs to stay in sync."
}
```

**5. Iteration:**
- User succeeded → Generate harder variation
- Next task includes audio sync requirement
- Continue until mastery criteria met

#### Research Validation Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| Interactive vs Q&A retention | Compare 30-day retention for concepts learned via interaction vs text Q&A | Interactive +25% |
| Transfer performance | Test application in novel context | Interactive +30% |
| Time to competency | Sessions required to reach execution proficiency | Interactive -20% |
| User engagement | Session completion rate, return rate | Interactive +15% |
| Real-world application | Self-reported use of skill in actual context (survey) | Interactive +40% |

---

### 4.22 Feature: Open-Ended Generation Tasks

**Feature ID:** F-022  
**Priority:** P1 (High)  
**Research Basis:** Generation effect; Free recall (g = 0.81); Creative production deepens encoding

#### The Core Problem

The hardest—and most effective—form of retrieval is **generation without cues**: creating something from scratch rather than recognizing or recalling. For many professional skills, the ultimate test is "can you produce this yourself?"

#### Design Principle

Move beyond "answer questions about X" to "create X." AI evaluates open-ended production against flexible criteria, providing substantive feedback on user-created work.

#### Task Types

| Task Type | Description | Example |
|-----------|-------------|---------|
| **Explanation generation** | User explains concept as if teaching | "Explain options time decay to a colleague" |
| **Example creation** | User invents examples that demonstrate understanding | "Create a scenario where a put option would be valuable" |
| **Problem construction** | User creates problems that test a concept | "Write a question that tests understanding of strike price" |
| **Application proposal** | User proposes how to apply concept in their context | "How would you use this in your work?" |
| **Critique/Analysis** | User evaluates a provided example | "What's wrong with this trading strategy?" |
| **Creative synthesis** | User combines multiple concepts | "Design an options strategy for this market outlook" |

#### AI Evaluation Framework

**Evaluation Prompt:**

```
The user was asked to: {task_description}
Concept being assessed: {concept}
Key elements that should be present: {required_elements}
Common errors to check for: {common_errors}

User's response:
{user_response}

Evaluate on:
1. Conceptual accuracy (0-100): Are the core ideas correct?
2. Completeness (0-100): Are all key elements addressed?
3. Clarity (0-100): Would someone else understand this?
4. Depth (0-100): Does this show surface or deep understanding?
5. Application (0-100): Is this practically useful/realistic?

Provide:
- Overall score (weighted average)
- Specific strengths
- Specific gaps or errors
- Constructive feedback
- Follow-up question to probe deeper understanding
```

#### Iteration on User Work

Unlike binary correct/incorrect, open-ended tasks support iterative improvement:

```
FLOW:
1. User submits initial response
2. AI provides feedback + specific suggestions
3. User can revise and resubmit
4. AI evaluates improvement
5. Continue until quality threshold OR user moves on

SCORING:
- Final score used for mastery tracking
- Improvement from v1 to v2+ is itself a positive signal
- High initial quality indicates strong understanding
```

#### Example: Complete Flow

**Task:** "Explain why a call option's time value decreases as expiration approaches."

**User Response v1:** 
"Because there's less time for the stock to go up."

**AI Feedback v1:**
```
Score: 62/100

You've got the basic intuition—time value does relate to potential 
for movement. But this explanation has gaps:

What's missing:
• WHY does less time mean less potential? (The concept of opportunity)
• The option can go up OR down—why does that matter for value?
• What happens to time value right at expiration?

Stronger explanation would include:
• Time = opportunity for favorable movement
• More time = more uncertainty = more value to option holder
• At expiration, only intrinsic value remains

Want to revise your explanation? [Revise] [See example answer]
```

**User Response v2:**
"Time value exists because there's uncertainty about where the stock will be. More time means more chances for favorable movement. As expiration approaches, there's less uncertainty—you can see where the stock actually is. At expiration, only the intrinsic value matters because there's no more time for things to change."

**AI Feedback v2:**
```
Score: 91/100

Excellent revision! You've captured the key insight: time value 
represents uncertainty/opportunity value.

Strong points:
✓ Connected time to uncertainty
✓ Explained why uncertainty has value
✓ Correctly noted that only intrinsic value remains at expiration

Minor refinement:
The rate of time decay accelerates near expiration (theta decay 
isn't linear). But that's advanced—you've nailed the core concept.

[Mark as understood] [Learn about theta decay]
```

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-022-1 | Open-ended tasks available for all conceptual content | Content coverage audit |
| AC-022-2 | AI evaluation produces scores consistent with human raters (>85% agreement) | Human comparison study |
| AC-022-3 | Feedback is specific, actionable, and constructive | Feedback quality audit |
| AC-022-4 | Revision flow allows iterative improvement | UX testing |
| AC-022-5 | Score improvement from v1 to v2 tracked as positive signal | Metric verification |

---

### 4.23 Feature: Learning Roadmap & Session Planning

**Feature ID:** F-023  
**Priority:** P0 (Critical)  
**Research Basis:** Goal visibility improves motivation; Mastery-based progression (+5-8 months); Self-regulated learning

#### The Core Problem

Users uploading content have no visibility into their learning journey. How long will this take? What's the structure? Where am I? Without a roadmap, learning feels like wandering in fog—demotivating and directionless.

#### Design Principle

Transform content analysis into a **visible, navigable roadmap** that shows the user exactly what they're learning, how it's structured, and how they're progressing. Gamification should celebrate meaningful progress through the roadmap, not arbitrary engagement metrics.

#### User Story

As a learner, I want to see a clear roadmap of my learning journey so that I know what to expect, can track my progress, and feel motivated by visible advancement.

#### Feature Components

##### 4.23.1 Roadmap Generation (Content Analysis Output)

When content is analyzed, the system generates a structured learning roadmap:

**Roadmap Structure:**

```json
{
  "course_id": "options_trading_101",
  "source_title": "Options Trading for Beginners",
  "source_duration": "32:15",
  
  "roadmap": {
    "total_concepts": 18,
    "total_levels": 4,
    "estimated_sessions": {
      "minimum": 8,
      "typical": 12,
      "with_mastery": 14
    },
    "estimated_time": {
      "total_minutes": 180,
      "per_session_avg": 15
    },
    "estimated_completion": {
      "aggressive": "6 days",
      "typical": "2 weeks",
      "relaxed": "3 weeks"
    },
    
    "levels": [
      {
        "level_id": 1,
        "name": "Foundations",
        "description": "Core concepts: what options are and how they work",
        "concepts": ["What is an Option", "Calls vs Puts", "Strike Price", "Premium"],
        "estimated_sessions": 2,
        "mastery_gate": true,
        "unlocks": "Level 2: Option Mechanics"
      },
      {
        "level_id": 2,
        "name": "Option Mechanics",
        "description": "Understanding option value and behavior",
        "concepts": ["Intrinsic Value", "Time Value", "Moneyness", "Expiration"],
        "estimated_sessions": 3,
        "mastery_gate": true,
        "unlocks": "Level 3: Trading Basics"
      }
    ]
  }
}
```

**Session Estimation Logic:**

```
Sessions = f(concepts, complexity, user_pace)

Base calculation:
- Simple concepts: 3-4 per session
- Medium concepts: 2-3 per session  
- Complex concepts: 1-2 per session
- Each concept needs 3+ sessions for mastery (successive relearning)

Adjustments:
- User's historical learning velocity (if available)
- Content density and prerequisite depth
- Include review session overhead
```

##### 4.23.2 Visual Roadmap Display

**Roadmap Visualization:**

```
┌─────────────────────────────────────────────────────────────────┐
│  OPTIONS TRADING FOR BEGINNERS                                   │
│  ═══════════════════════════════════════════════════════════════│
│                                                                  │
│  Your Learning Journey: ~12 sessions over 2 weeks               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LEVEL 1: Foundations                           ██████░░ │    │
│  │ What options are and how they work              75%     │    │
│  │ 4 concepts · 2 sessions · Mastery gate                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LEVEL 2: Option Mechanics                      🔒 Locked │    │
│  │ Understanding option value and behavior                  │    │
│  │ 4 concepts · 3 sessions · Mastery gate                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LEVEL 3: Trading Basics                        🔒 Locked │    │
│  │ How to actually place and manage trades                  │    │
│  │ 5 concepts · 4 sessions · Mastery gate                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LEVEL 4: Strategy & Risk                       🔒 Locked │    │
│  │ Building strategies and managing risk                    │    │
│  │ 5 concepts · 3 sessions · Final mastery check           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ───────────────────────────────────────────────────────────    │
│  Current: Level 1 · Session 3 of ~12 · 25% complete             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.23.3 Roadmap Gamification (Progress-Based)

**Design Principles for Gamification:**

| Do | Don't |
|----|-------|
| Celebrate mastery milestones | Reward mere activity |
| Visualize genuine progress | Create arbitrary streaks |
| Acknowledge difficulty overcome | Trivialize with points |
| Show capability growth | Create anxiety about maintaining metrics |

**Gamification Elements:**

| Element | Description | Trigger |
|---------|-------------|---------|
| **Level Completion** | Visual unlock animation, summary of what was learned | Passing mastery gate |
| **Milestone Badges** | Meaningful achievements tied to capability | "First concept mastered", "Level 2 unlocked", "Course complete" |
| **Progress Path** | Visual journey showing where user started vs now | Always visible on roadmap |
| **Capability Statements** | "You can now explain X" | After mastery of application-level concepts |
| **Time Investment** | Show total time invested productively | Session end, course end |
| **Retention Forecast** | "Based on your progress, you'll retain 85% at 6 months" | Milestone points |

**What We Avoid:**

| Anti-Pattern | Why Avoided |
|--------------|-------------|
| Leaderboards | Extrinsic competition doesn't improve learning (g = 0.49) |
| Daily streaks with penalties | Creates anxiety, punishes life circumstances |
| Points/XP for completion | Rewards volume over quality |
| Surprise rewards | Intermittent reinforcement creates addiction, not learning |

##### 4.23.4 Dynamic Roadmap Updates

The roadmap updates based on user performance:

| Signal | Roadmap Update |
|--------|----------------|
| Faster than expected mastery | "You're ahead of schedule—could finish in 10 sessions" |
| Slower than expected | "Taking more time on foundations—completion now ~14 sessions" (no judgment) |
| Failed mastery gate | Add remediation sessions to estimate |
| Skipped days | Adjust calendar estimate, not session count |
| Partial completion + stop | Show "You've learned X, Y, Z. Return anytime to continue." |

##### 4.23.5 Session Preview

Before each session, user sees:

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 4 OF ~12                                                │
│                                                                  │
│  Today's Focus:                                                  │
│  • Review: Strike Price, Premium (from yesterday)               │
│  • New: Intrinsic Value, Time Value                             │
│  • Practice: Application scenarios                               │
│                                                                  │
│  Estimated time: 15 minutes                                      │
│                                                                  │
│  After this session, you'll be able to:                         │
│  ✓ Calculate whether an option is in/out of the money          │
│  ✓ Explain why options lose value over time                     │
│                                                                  │
│  [Start Session]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-025-1 | Every uploaded content generates a structured roadmap | Analysis output verification |
| AC-025-2 | Session estimates are within ±20% of actual for 80% of users | Tracking vs prediction |
| AC-025-3 | Roadmap visualization clearly shows current position and path ahead | UX testing |
| AC-025-4 | Level completion triggers meaningful celebration (not just points) | UX verification |
| AC-025-5 | Roadmap updates dynamically based on user performance | Update logic verification |
| AC-025-6 | Session preview shows what user will learn and be able to do | UX verification |
| AC-025-7 | No anxiety-inducing gamification (streaks with penalties, leaderboards) | Design audit |

---

### 4.24 Feature: Direct Call-to-Action (Real-World Practice Assignment)

**Feature ID:** F-024  
**Priority:** P0 (Critical)  
**Research Basis:** Procedural learning requires actual execution; Transfer requires practicing target skill; App limitations for motor/software skills

#### The Core Problem

For many skills—especially software proficiency, motor skills, and creative tasks—**the app cannot adequately simulate the real environment**. Learning Blender by tapping on a phone screen is fundamentally limited. The app should recognize this and assign real-world practice with structured follow-up.

#### Design Principle

When the optimal learning activity cannot happen inside the app, **the app should orchestrate practice outside itself**. This means: assigning specific tasks, setting expectations, and following up to assess and reinforce.

The AI must intelligently decide for each concept: should this be a problem, puzzle, interactive simulation, game, **or a direct call-to-action requiring real-world execution?**

#### User Story

As a learner of practical skills, I want the app to assign me real-world practice tasks so that I develop genuine capability, not just app-based familiarity.

#### Feature Components

##### 4.24.1 Practice Modality Decision Engine

During content analysis and session construction, the AI determines the optimal practice modality for each concept:

**Decision Framework:**

```
FOR each concept:
  EVALUATE:
    - Can the skill be meaningfully practiced in-app?
    - What is lost by simulating vs doing the real thing?
    - Is the real tool accessible to the user?
    - What is the cost/risk of real-world practice?
  
  ASSIGN practice modality:
    - PROBLEM: Conceptual/analytical (can be fully in-app)
    - PUZZLE: Logic/pattern-based (can be fully in-app)
    - INTERACTION: Simplified simulation sufficient (in-app with F-021)
    - GAME: Skill benefits from gamified practice (in-app)
    - CALL_TO_ACTION: Real-world execution required (outside app)
```

**Practice Modality Decision Matrix:**

| Concept Type | Example | In-App Option | Call-to-Action Better? | Decision |
|--------------|---------|---------------|----------------------|----------|
| Conceptual | "What is intrinsic value" | Problem/explanation | No | PROBLEM |
| Strategic | "When to use a put" | Scenario simulation | No | INTERACTION |
| Software UI | "How to use ripple edit" | UI mockup works | Maybe | INTERACTION or CTA |
| Software workflow | "Edit a complete video" | Mockup insufficient | Yes | CALL_TO_ACTION |
| 3D modeling | "Create a box in Blender" | Can't simulate | Yes | CALL_TO_ACTION |
| Physical skill | "Knead bread dough" | Can't simulate | Yes | CALL_TO_ACTION |
| Creative output | "Design a logo" | Limited canvas | Yes | CALL_TO_ACTION |
| Language conversation | "Order food in Spanish" | Simulation okay | Maybe | INTERACTION or CTA |

##### 4.24.2 Call-to-Action Structure

When CTA is assigned, the app provides:

**CTA Assignment Message:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 PRACTICE ASSIGNMENT                                          │
│                                                                  │
│  Concept: Creating Basic 3D Objects in Blender                   │
│                                                                  │
│  Your task:                                                      │
│  Open Blender and create a simple scene with:                   │
│  • A cube                                                        │
│  • A sphere                                                      │
│  • A plane (as a ground surface)                                │
│  • Move and scale at least one object                           │
│                                                                  │
│  This should take: ~10-15 minutes                               │
│                                                                  │
│  Focus on:                                                       │
│  • Finding the Add menu                                          │
│  • Using the transform tools (G, S, R keys)                     │
│  • Navigating the 3D viewport                                   │
│                                                                  │
│  When you're done:                                               │
│  [I completed it] [I got stuck] [Skip for now]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**CTA Data Structure:**

```json
{
  "cta_id": "cta_12345",
  "concept_id": "c089",
  "type": "CALL_TO_ACTION",
  "task": {
    "title": "Create Basic 3D Objects in Blender",
    "description": "Open Blender and create a simple scene...",
    "specific_actions": [
      "Create a cube using Add > Mesh > Cube",
      "Create a sphere",
      "Create a plane as ground",
      "Move at least one object using G key",
      "Scale at least one object using S key"
    ],
    "estimated_time_minutes": 15,
    "tool_required": "Blender",
    "difficulty": "beginner"
  },
  "success_criteria": {
    "self_report": ["completed", "stuck", "skipped"],
    "follow_up_questions": [
      "Which transform tool did you find easiest to use?",
      "Did you discover any keyboard shortcuts?",
      "What was confusing or unexpected?"
    ],
    "evidence_optional": "Screenshot of your scene (optional)"
  }
}
```

##### 4.24.3 CTA Follow-Up & Assessment

When user returns after CTA:

**Completion Flow:**

```
User taps: [I completed it]

┌─────────────────────────────────────────────────────────────────┐
│  Great! Let's check your understanding.                         │
│                                                                  │
│  Quick questions about what you just did:                       │
│                                                                  │
│  1. Which key did you use to move objects?                      │
│     [Answer field]                                               │
│                                                                  │
│  2. How did you add a new object to the scene?                  │
│     [Answer field]                                               │
│                                                                  │
│  3. What happened when you pressed S and moved your mouse?      │
│     [Answer field]                                               │
│                                                                  │
│  (Optional) Upload a screenshot of your scene:                  │
│  [Upload image]                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**"I Got Stuck" Flow:**

```
User taps: [I got stuck]

┌─────────────────────────────────────────────────────────────────┐
│  No problem! Where did you get stuck?                           │
│                                                                  │
│  ○ Couldn't find how to add objects                            │
│  ○ Confused by the 3D navigation                               │
│  ○ Transform tools didn't work as expected                      │
│  ○ Blender crashed or something went wrong                      │
│  ○ Something else: [describe]                                   │
│                                                                  │
│  [Submit]                                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Stuck Response (AI-generated based on issue):**

```
"Ah, the 3D navigation in Blender is notoriously confusing at first!

Here's the key insight: Middle mouse button rotates the view, 
Shift + Middle mouse pans, and scroll wheel zooms.

If you don't have a middle mouse button, go to Edit > Preferences > 
Input and enable 'Emulate 3-Button Mouse.'

Want to try again with this in mind?
[Try again] [Show me a video] [Move on for now]"
```

##### 4.24.4 CTA Scheduling & Integration

**When to Assign CTAs:**

| Trigger | CTA Assignment |
|---------|----------------|
| End of concept introduction | "Now go practice this in the real tool" |
| Before mastery gate | "Complete these real-world tasks before testing" |
| After in-app simulation | "You did it in the simulation—now try the real thing" |
| Spaced review | "It's been a week—open Blender and recreate your scene" |

**Integration with Roadmap:**

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 5: Blender Basics                                       │
│                                                                  │
│  In-App:                                                         │
│  ✓ Concept: 3D viewport navigation (completed)                  │
│  ✓ Concept: Object creation (completed)                         │
│  ◐ Concept: Transform tools (in progress)                       │
│                                                                  │
│  Practice Assignment:                                            │
│  ⬜ Create a basic scene in Blender (~15 min, outside app)      │
│                                                                  │
│  Next session unlocks after practice assignment completed.       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

##### 4.24.5 CTA for Different Domains

| Domain | Example CTA |
|--------|-------------|
| **Software (Blender)** | "Create a scene with 3 objects, position them, and render an image" |
| **Software (Excel)** | "Open a real spreadsheet and create a pivot table from your data" |
| **Software (Video editing)** | "Edit 30 seconds of footage using the techniques from this session" |
| **Language** | "Have a 5-minute conversation with a language partner or tutor" |
| **Cooking** | "Make this recipe and note what you learned" |
| **Music** | "Practice this chord progression for 10 minutes on your instrument" |
| **Writing** | "Write a 500-word draft applying these principles" |
| **Photography** | "Go outside and take 10 photos using the composition rules" |

##### 4.24.6 AI Decision: Practice Modality Selection

The AI makes the final call on practice modality during session construction:

**Decision Prompt:**

```
Given this learning objective:
- Concept: {concept_name}
- Skill type: {cognitive_type}
- Context: {domain}
- Prerequisites mastered: {list}
- User's tool access: {available_tools}

Determine the optimal practice modality:

1. PROBLEM - Analytical/conceptual question (in-app)
2. PUZZLE - Logic/pattern challenge (in-app) 
3. INTERACTION - Interactive simulation (in-app, F-021)
4. GAME - Gamified skill practice (in-app)
5. CALL_TO_ACTION - Real-world practice assignment (outside app)

Consider:
- Can this skill be meaningfully practiced without the real tool?
- What percentage of the learning value is lost in simulation?
- Is real-world practice safe and accessible for this user?
- Should in-app practice come before or after real-world practice?

Output:
{
  "primary_modality": "CALL_TO_ACTION",
  "rationale": "3D modeling requires actual tool interaction; phone simulation would teach wrong muscle memory",
  "in_app_supplement": "INTERACTION for viewport navigation concepts before CTA",
  "sequence": ["concept_intro", "interaction", "call_to_action", "follow_up_retrieval"]
}
```

##### 4.24.7 CTA Completion Tracking

| Completion State | System Response |
|------------------|-----------------|
| Completed | Update concept to DEVELOPING, schedule retrieval follow-up |
| Stuck + resolved | Provide help, offer retry, don't penalize |
| Stuck + unresolved | Flag concept for remediation, suggest alternative approach |
| Skipped | Concept remains EXPOSED, offer again later, note pattern |
| Not attempted (24h) | Gentle reminder, don't block all progress |

**Flexibility Principle:** CTAs should enhance learning, not become blockers. If user consistently skips CTAs, system adapts—perhaps they don't have access to the tool, or they're learning for different reasons.

#### Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-024-1 | AI correctly identifies when CTA is superior to in-app practice | Decision audit (human review) |
| AC-024-2 | CTA assignments are specific, actionable, and appropriately scoped | Content review |
| AC-024-3 | Follow-up questions assess real understanding from practice | Question quality audit |
| AC-024-4 | "Got stuck" flow provides genuinely helpful guidance | UX testing |
| AC-024-5 | CTA completion integrates properly with mastery tracking | Integration testing |
| AC-024-6 | CTAs don't completely block progress for users who can't complete them | Flexibility testing |
| AC-024-7 | Roadmap clearly shows CTA assignments as part of session | UX verification |

---

### 5.1 Failed Mastery Gate

**Scenario:** User fails to reach mastery threshold on level completion test.

**Expected Behavior:**

| Step | System Action |
|------|---------------|
| 1 | Display specific feedback: "You scored 68%. Needed: 80%. Areas to review: [concepts]" |
| 2 | Identify specific weak concepts from test performance |
| 3 | Generate remediation session focused on weak areas |
| 4 | Schedule remediation session (can be same day if capacity allows) |
| 5 | After remediation, offer mastery check retry |
| 6 | Maximum 3 retries before suggesting: "Consider reviewing source material" |
| 7 | No advancement until threshold met |

**User Communication:**

```
"You're close! You scored 68%, and we need 80% to move forward.

This isn't a setback — it's the system working as intended. 
Building on a shaky foundation leads to problems later.

Here's what we'll focus on:
• Time Value Decay (struggled with application questions)
• Moneyness concepts (mixed up ITM and OTM)

Ready for a focused review session? (~8 minutes)"
```

---

### 5.2 Missed Multiple Days

**Scenario:** User hasn't opened app in 3+ days.

**Expected Behavior:**

| Days Missed | System Response |
|-------------|-----------------|
| 1-2 days | Normal session, due reviews prioritized |
| 3-4 days | "Welcome back" session, capacity adjusted for decay |
| 5-7 days | Consolidation assessment before new material |
| 8-14 days | Suggested review of most decayed concepts |
| 14+ days | "Recovery mode" — systematic assessment of retained knowledge |

**Recovery Mode Protocol:**

1. Run quick assessment across all previously-learned concepts
2. Identify concepts below strength threshold
3. Rebuild from weakest concepts up
4. Resume new material only after foundation restored
5. Adjust FSRS stability parameters based on decay observed

**User Communication (7 days missed):**

```
"Welcome back! It's been 7 days.

Before we continue, let's check what's still solid. 
Some decay is normal — that's why we have review systems.

Quick assessment: ~5 minutes

This will help us rebuild efficiently rather than 
moving forward on a shaky foundation."
```

---

### 5.3 Multiple Concurrent Courses

**Scenario:** User is learning Options Trading AND Spanish simultaneously.

**Expected Behavior:**

| Challenge | Solution |
|-----------|----------|
| Capacity competition | Single daily capacity budget shared across courses |
| Review prioritization | FSRS urgency + user priority setting |
| Session construction | Can be single-course or mixed (user preference) |
| Interleaving | Cross-course interleaving optional (high cognitive load) |
| Progress tracking | Per-course and aggregate dashboards |

**Capacity Allocation Options:**

| Mode | Description |
|------|-------------|
| Balanced | Equal allocation to each active course |
| Priority | User sets primary course (gets 60-70% of capacity) |
| Automatic | System allocates based on due reviews and proximity to goals |
| Single-focus | Only one course per session, alternating days |

**User Setting:**

```
"You have 2 active courses. How should we balance them?

○ Balanced — Equal time on each
● Primary focus — Options Trading gets priority
○ Automatic — Let us optimize based on your schedule
○ Single focus — One course per session"
```

---

### 5.4 Poorly Structured Source Content

**Scenario:** User uploads video that is disorganized, tangential, or low-quality.

**Expected Behavior:**

| Quality Issue | Detection | Response |
|---------------|-----------|----------|
| No clear concepts | Concept extraction yields <3 items | "This content doesn't appear to have enough structured material. Consider a different source." |
| Tangential content | High ratio of off-topic segments | Filter to relevant portions, flag confidence level |
| Contradictory information | Conflicting statements detected | Flag contradictions, ask user to resolve |
| Missing prerequisites | References unexplained concepts | Warn user of assumed knowledge, suggest supplementary sources |
| Very advanced | High difficulty + many prerequisites | Warn about difficulty, suggest foundational content first |

**Confidence Flagging:**

```
"Analysis complete, but with some concerns:

⚠️ Content structure: Low confidence
   The video jumps between topics frequently. We've extracted 
   what we can, but learning may be choppy.

⚠️ Prerequisites assumed:
   This content assumes you know: Black-Scholes model, Greeks
   We don't see these in your knowledge base.

Options:
[Continue anyway] [Find different source] [Learn prerequisites first]"
```

---

### 5.5 User Disputes AI Evaluation

**Scenario:** User believes their free-response answer was correct but AI marked it wrong.

**Expected Behavior:**

1. Provide explanation of why answer was evaluated as incorrect
2. Show expected answer criteria
3. Offer appeal mechanism: "I think my answer was correct"
4. On appeal:
   - Re-evaluate with broader criteria
   - If still incorrect, explain with more detail
   - If borderline, give benefit of doubt + flag for human review
5. Track disputed evaluations for model improvement
6. Never penalize user for disputing

**User Communication:**

```
"Your answer: [user's response]

We marked this as incomplete because it didn't mention 
[missing key element], which is essential to this concept.

Expected answer would include: [criteria list]

Disagree? [I think my answer was correct]

Note: Disputing never hurts your progress. 
We use this feedback to improve."
```

---

### 5.6 Extremely Fast or Slow Learner

**Scenario:** User's learning velocity is significantly above or below average.

**Fast Learner (>2x average velocity):**

| Observation | Adaptation |
|-------------|------------|
| High accuracy + fast responses | Reduce scaffolding, advance faster |
| Consistently exceeds mastery thresholds | Allow earlier mastery gates |
| High transfer performance | Emphasize application over recall |
| Risk: Overconfidence | Maintain challenging transfer questions |

**Slow Learner (<0.5x average velocity):**

| Observation | Adaptation |
|-------------|------------|
| Lower accuracy, needs more repetition | Extend practice, delay advancement |
| Longer response times | No penalty; more processing time allowed |
| Struggles with transfer | More worked examples, scaffolded practice |
| Risk: Discouragement | Celebrate incremental progress, adjust expectations |

**User Communication (Slow Learner):**

```
"Everyone learns at their own pace. Your pace is giving your 
brain more time to deeply encode these concepts.

Research shows: faster isn't better for retention. 
What matters is reaching mastery, not speed.

Your progress: [visualization showing steady improvement]"
```

---

### 5.7 Session Interruption

**Scenario:** User closes app mid-session.

**Expected Behavior:**

| State at Interruption | Recovery Behavior |
|----------------------|-------------------|
| During pretest | Restart pretest |
| During new concept | Option to re-read or skip to retrieval |
| During retrieval practice | Resume from interruption point |
| During consolidation | Resume from interruption point |

**Session State Persistence:**

- Save state every 30 seconds
- Save state on every question completion
- Persist: current position, answers given, time spent
- Expire partial sessions after 24 hours

**User Communication:**

```
"Welcome back! You have an unfinished session from earlier.

Progress: 60% complete (Concept 3 of 5)
Time spent: 7 minutes

[Resume session] [Start fresh]"
```

---

### 5.8 Conflicting User Actions

**Scenario:** User tries to add more content when capacity is depleted.

**Expected Behavior:**

```
"You're trying to start new material, but your learning 
capacity for today is depleted (92% used).

Adding more now would likely:
• Interfere with today's learning
• Reduce tonight's consolidation quality
• Lower retention on everything learned today

Instead, you could:
[Light review only] [Schedule for tomorrow] [Proceed anyway*]

*Not recommended. Proceeding tracks poorly in retention data."
```

**Override Tracking:**

- If user overrides, track the session separately
- Measure retention impact in that cohort
- Use data to refine capacity model
- Surface insight: "Sessions when you overrode capacity limits show 23% lower retention"

---

## 6. User Experience Flows

### 6.1 First-Time User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING FLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Welcome Screen                                                   │
│     • Value proposition                                             │
│     • Key differentiators (active not passive, respects limits)    │
│                                                                      │
│  2. Quick Setup (2 min)                                             │
│     • Typical bedtime                                               │
│     • Preferred learning time                                       │
│     • Daily time commitment                                         │
│     • [Optional] Sleep tracker integration                          │
│                                                                      │
│  3. First Upload                                                     │
│     • Upload video/PDF/link                                         │
│     • Wait for processing (~2-3 min)                                │
│     • View course structure                                         │
│                                                                      │
│  4. First Session                                                    │
│     • Pretest (with explanation of purpose)                         │
│     • First concepts with retrieval                                 │
│     • Session wrap-up with preview of tomorrow                      │
│                                                                      │
│  5. Next-Day Reinforcement                                           │
│     • Morning notification                                          │
│     • Consolidation check                                           │
│     • "This is how it works" explanation                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Daily Learning Session Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  DAILY SESSION FLOW                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Session Start                                                    │
│     • Capacity check (automatic)                                    │
│     • Today's focus summary                                         │
│     • Estimated duration                                            │
│                                                                      │
│  2. Pretest (if new material)                                       │
│     • 2-3 questions on upcoming concepts                            │
│     • "Wrong answers expected" messaging                            │
│                                                                      │
│  3. Learning Blocks                                                  │
│     FOR EACH new concept:                                           │
│       • Concept introduction (~1 min)                               │
│       • Immediate retrieval (~1 min)                                │
│       • [Optional] Interleaved review question                      │
│                                                                      │
│  4. Review Block (if due items)                                      │
│     • FSRS-scheduled items                                          │
│     • Interleaved with new material or separate                     │
│                                                                      │
│  5. Consolidation Practice                                           │
│     • Mixed questions across all session content                    │
│     • Application and transfer questions                            │
│                                                                      │
│  6. Session Wrap-Up                                                  │
│     • Concepts learned summary                                      │
│     • Progress update                                               │
│     • Next session preview                                          │
│                                                                      │
│  ADAPTIVE TRIGGERS (can occur anytime):                             │
│     • Fatigue detected → Offer to shorten                           │
│     • Misconception detected → Immediate intervention               │
│     • Capacity depleted → Suggest stopping                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Morning Consolidation Check Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  MORNING CHECK FLOW                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Push Notification                                                │
│     • "Quick 3-min check: how much stuck from last night?"         │
│                                                                      │
│  2. Brief Introduction                                               │
│     • Concepts learned yesterday                                    │
│     • Purpose explanation (measuring consolidation)                 │
│                                                                      │
│  3. Retrieval Questions                                              │
│     • 3-5 questions on yesterday's material                         │
│     • Free recall prioritized                                       │
│     • No hints available                                            │
│                                                                      │
│  4. Results                                                          │
│     • Consolidation success rate                                    │
│     • Concept state updates                                         │
│     • Any areas needing reinforcement flagged                       │
│                                                                      │
│  5. Next Steps                                                       │
│     • Schedule next learning session                                │
│     • Preview what's next                                           │
│                                                                      │
│  Duration: 3-5 minutes                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Success Metrics

### 7.1 North Star Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **30-Day Retention Rate** | % of concepts correctly recalled 30 days after MASTERED state | >75% | Delayed testing cohort |
| **Course Completion Rate** | % of users who complete courses they start | >60% | Funnel analysis |
| **Active Usage Retention** | % of users active at D7, D30, D90 | D7: 70%, D30: 50%, D90: 30% | Cohort analysis |

### 7.2 Learning Effectiveness Metrics

| Metric | Definition | Target | Research Benchmark |
|--------|------------|--------|-------------------|
| Immediate recall accuracy | % correct on same-session retrieval | >80% | Baseline |
| Next-day consolidation | % correct on morning check | >70% | Expected with sleep |
| 7-day retention | % correct on 7-day delayed test | >65% | Above massed practice |
| Transfer performance | % correct on novel application questions | >50% | Indicates deep learning |
| Mastery achievement rate | % of concepts reaching MASTERED | >90% | With successive relearning |

### 7.3 Engagement Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Sessions per week | Average sessions completed | 4-5 |
| Session completion rate | % of started sessions completed | >85% |
| Streak length | Average consecutive days active | 7+ days |
| Time to first mastery | Days until first concept MASTERED | <7 days |
| Method satisfaction | User rating of learning experience | >4.2/5 |

### 7.4 System Health Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Content analysis success rate | % of uploads successfully processed | >95% |
| AI evaluation accuracy | Agreement with human raters | >90% |
| Session construction time | Time to build personalized session | <2 seconds |
| FSRS prediction accuracy | Predicted vs actual recall probability | MAE <0.10 |
| Profile convergence time | Sessions to reach stable preferences | <20 sessions |

### 7.5 Research Validation Metrics

| Research Claim | Validation Metric | Target |
|----------------|-------------------|--------|
| Testing effect (g = 0.50) | Retrieval vs re-reading cohort comparison | Retrieval cohort >25% higher retention |
| Spacing effect (d = 0.54) | Spaced vs massed practice comparison | Spaced cohort >20% higher at 30 days |
| Pretesting effect (d = 1.1) | Pretest vs no-pretest cohort | Pretest cohort >10% higher |
| Successive relearning (d = 1.52) | Protocol adherence vs partial | Full protocol >40% higher at 30 days |
| Sleep consolidation | Well-slept vs sleep-deprived sessions | Well-slept >25% higher next-day |

---

## 8. Technical Requirements

### 8.1 Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TECH STACK                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FRONTEND (Mobile-First)                                            │
│  ├── Framework: Next.js 14+ (App Router)                            │
│  ├── Language: TypeScript 5+                                        │
│  ├── Styling: Tailwind CSS 3.4+                                     │
│  ├── Components: shadcn/ui (Radix primitives)                       │
│  ├── Animation: Framer Motion 11+                                   │
│  ├── State: Zustand + React Query (TanStack Query)                  │
│  ├── Forms: React Hook Form + Zod                                   │
│  └── Mobile: Capacitor (iOS/Android native wrapper)                 │
│                                                                      │
│  BACKEND                                                            │
│  ├── Runtime: Node.js 20+ / Bun                                     │
│  ├── API: tRPC (type-safe) or Hono (edge-first)                    │
│  ├── Auth: Clerk or Auth.js (NextAuth)                             │
│  ├── Database: PostgreSQL 16+ (via Supabase or Neon)               │
│  ├── ORM: Drizzle ORM (type-safe, edge-ready)                      │
│  ├── Cache: Redis (Upstash for serverless)                         │
│  ├── Queue: Inngest or Trigger.dev (background jobs)               │
│  └── Storage: S3-compatible (Cloudflare R2 or AWS S3)              │
│                                                                      │
│  AI/ML                                                              │
│  ├── Primary LLM: Anthropic Claude (Sonnet/Haiku)                   │
│  ├── Fallback LLM: OpenAI GPT-4o / GPT-4o-mini                     │
│  ├── Aggregator: OpenRouter (for BYOK flexibility)                  │
│  ├── Embeddings: OpenAI text-embedding-3-small                      │
│  ├── Vector DB: Pinecone or pgvector (PostgreSQL)                   │
│  ├── Speech-to-Text: Whisper (via Replicate or local)              │
│  └── OCR: Tesseract or Claude Vision                               │
│                                                                      │
│  INFRASTRUCTURE                                                      │
│  ├── Hosting: Vercel (frontend) + Railway/Fly.io (backend)         │
│  ├── CDN: Cloudflare                                                │
│  ├── Monitoring: Sentry (errors) + PostHog (analytics)             │
│  ├── Logging: Axiom or Betterstack                                  │
│  └── CI/CD: GitHub Actions                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Detailed Stack Decisions

#### 8.2.1 Frontend Stack

| Layer | Choice | Rationale | Alternatives Considered |
|-------|--------|-----------|------------------------|
| **Framework** | Next.js 14+ (App Router) | SSR/SSG flexibility, React Server Components, excellent DX, Vercel optimization | Remix, SvelteKit |
| **Language** | TypeScript 5+ | Type safety critical for AI contracts, better DX | - |
| **Styling** | Tailwind CSS 3.4+ | Utility-first, design system tokens, small bundle | Styled Components, CSS Modules |
| **UI Components** | shadcn/ui | Radix primitives, fully customizable, accessible by default | Chakra UI, Mantine |
| **Animation** | Framer Motion 11+ | Spring physics, layout animations, gesture support | React Spring, CSS animations |
| **State (Global)** | Zustand | Lightweight, TypeScript-first, no boilerplate | Redux Toolkit, Jotai |
| **State (Server)** | TanStack Query | Cache management, optimistic updates, offline support | SWR |
| **Forms** | React Hook Form + Zod | Performance, validation, type inference | Formik |
| **Mobile Wrapper** | Capacitor | Access to native APIs, single codebase | React Native, Expo |

**Package.json (Frontend Core):**

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.0.0",
    
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-progress": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.28.0",
    
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    
    "lucide-react": "^0.363.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/android": "^6.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

#### 8.2.2 Backend Stack

| Layer | Choice | Rationale | Alternatives Considered |
|-------|--------|-----------|------------------------|
| **Runtime** | Node.js 20+ or Bun | Mature ecosystem, edge compatibility | Deno |
| **API Layer** | tRPC | End-to-end type safety with Next.js | GraphQL, REST |
| **Auth** | Clerk | Managed auth, great DX, social logins | Auth.js, Supabase Auth |
| **Database** | PostgreSQL 16 (Supabase) | Relational + pgvector, managed scaling | PlanetScale (MySQL), MongoDB |
| **ORM** | Drizzle ORM | Type-safe, edge-ready, SQL-like syntax | Prisma |
| **Cache** | Upstash Redis | Serverless-compatible, low latency | Vercel KV |
| **Background Jobs** | Inngest | Event-driven, retries, observability | Trigger.dev, BullMQ |
| **File Storage** | Cloudflare R2 | S3-compatible, no egress fees | AWS S3 |

**Package.json (Backend Core):**

```json
{
  "dependencies": {
    "@trpc/server": "^10.45.0",
    "@trpc/client": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "@trpc/next": "^10.45.0",
    
    "@clerk/nextjs": "^4.29.0",
    
    "drizzle-orm": "^0.30.0",
    "@neondatabase/serverless": "^0.9.0",
    "postgres": "^3.4.0",
    
    "@upstash/redis": "^1.28.0",
    "@upstash/ratelimit": "^1.0.0",
    
    "inngest": "^3.0.0",
    
    "@aws-sdk/client-s3": "^3.540.0",
    "@aws-sdk/s3-request-presigner": "^3.540.0",
    
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0"
  }
}
```

#### 8.2.3 AI/ML Stack

| Component | Choice | Rationale | Alternatives |
|-----------|--------|-----------|--------------|
| **Primary LLM** | Claude Sonnet 4.5 | Best reasoning, code gen, safety | GPT-4o |
| **Fast LLM** | Claude Haiku 4.5 | Cost-efficient for simple tasks | GPT-4o-mini |
| **API Routing** | OpenRouter | Multi-provider, fallbacks, BYOK support | Direct APIs |
| **Embeddings** | text-embedding-3-small | Good quality/cost ratio | Cohere, Voyage |
| **Vector Store** | pgvector | Same DB as main data, simpler ops | Pinecone |
| **Speech-to-Text** | Whisper (via Replicate) | Accuracy, language support | AssemblyAI, Deepgram |
| **Document Processing** | LlamaParse or Unstructured | PDF/DOCX extraction | Custom pipeline |

**AI Integration Package.json:**

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.33.0",
    
    "ai": "^3.0.0",
    
    "@pinecone-database/pinecone": "^2.2.0",
    
    "replicate": "^0.25.0",
    
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    
    "langchain": "^0.1.0"
  }
}
```

#### 8.2.4 Infrastructure & DevOps

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Frontend Hosting** | Vercel | Next.js optimization, edge functions, preview deploys |
| **Backend Hosting** | Railway or Fly.io | Container support, auto-scaling, global regions |
| **Database Hosting** | Supabase or Neon | Managed Postgres, connection pooling, branching |
| **CDN** | Cloudflare | Global edge, DDoS protection, R2 integration |
| **Error Monitoring** | Sentry | Stack traces, performance monitoring, releases |
| **Analytics** | PostHog | Product analytics, feature flags, session replay |
| **Logging** | Axiom | Serverless-friendly, fast queries |
| **CI/CD** | GitHub Actions | Native GitHub integration, marketplace actions |
| **Secrets Management** | Doppler or Vercel Env | Encrypted, environment syncing |

### 8.3 AI/ML Components

| Component | Technology | Requirements |
|-----------|------------|--------------|
| Content extraction | Speech-to-text, OCR, NLP | >95% accuracy, <5 min processing |
| Concept extraction | LLM-based | >80% key concept coverage |
| Question generation | LLM-based | Quality: human-competitive |
| Answer evaluation | LLM-based | >90% agreement with humans |
| FSRS algorithm | Mathematical model | Per-user parameter fitting |
| Adaptive optimization | Multi-armed bandit | Convergence within 20 sessions |

### 8.4 Data Requirements

| Data Type | Retention | Privacy Consideration |
|-----------|-----------|----------------------|
| User profile | Account lifetime | PII, encrypted |
| Learning history | Account lifetime | Used for personalization |
| Session recordings | 90 days | Used for model improvement |
| Method effectiveness | Account lifetime | Anonymized for research |
| Content uploads | User-controlled | User owns, can delete |

### 8.5 Performance Requirements

| Requirement | Target |
|-------------|--------|
| Session start latency | <2 seconds |
| Question load latency | <500ms |
| AI evaluation latency | <3 seconds |
| Offline capability | Review sessions playable offline |
| Sync latency | <5 seconds on reconnection |
| Time to Interactive (TTI) | <3 seconds on 3G |
| Lighthouse Performance Score | >90 |
| Bundle size (initial) | <200KB gzipped |

### 8.6 Platform Requirements

| Platform | Support Level | Notes |
|----------|---------------|-------|
| iOS | Primary (iPhone) | Capacitor wrapper, native feel |
| Android | Primary | Capacitor wrapper, Material adaptations |
| Web | Secondary | Full functionality, dashboard focus |
| Tablet | Optimized | Responsive layouts, larger touch targets |
| Desktop | Supported | Web app, optional Electron wrapper |

### 8.7 Database Schema Summary

**Core Tables:**

```sql
-- Users & Auth (managed by Clerk, referenced here)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  daily_goal_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  status TEXT DEFAULT 'draft', -- draft, analyzing, ready, active, paused, completed
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources (uploaded content)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- video, pdf, audio, article, url
  status TEXT DEFAULT 'uploading', -- uploading, analyzing, analyzed, error
  storage_url TEXT,
  metadata JSONB DEFAULT '{}',
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concepts (extracted knowledge units)
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cognitive_type TEXT, -- factual, conceptual, procedural, metacognitive
  difficulty_estimate FLOAT DEFAULT 0.5,
  prerequisites UUID[] DEFAULT '{}',
  source_refs JSONB DEFAULT '[]', -- [{source_id, timestamp/page}]
  embedding VECTOR(1536), -- For semantic search
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept States (per-user mastery tracking)
CREATE TABLE concept_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  mastery_state TEXT DEFAULT 'unexposed', -- unexposed, exposed, fragile, developing, solid, mastered
  fsrs_stability FLOAT DEFAULT 0,
  fsrs_difficulty FLOAT DEFAULT 0.5,
  fsrs_elapsed_days FLOAT DEFAULT 0,
  fsrs_scheduled_days FLOAT DEFAULT 0,
  fsrs_reps INTEGER DEFAULT 0,
  fsrs_lapses INTEGER DEFAULT 0,
  last_review_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  UNIQUE(user_id, concept_id)
);

-- Sessions (learning sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  interactions_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  new_concepts_count INTEGER DEFAULT 0,
  reviewed_concepts_count INTEGER DEFAULT 0,
  energy_level INTEGER, -- 1-5 at session start
  metadata JSONB DEFAULT '{}'
);

-- Interactions (individual Q&A within sessions)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id),
  type TEXT NOT NULL, -- multiple_choice, free_recall, application, simulation, etc.
  prompt JSONB NOT NULL,
  user_response JSONB,
  is_correct BOOLEAN,
  confidence_rating INTEGER, -- 1-4
  time_to_respond_ms INTEGER,
  feedback_given JSONB,
  fsrs_rating INTEGER, -- 1-4 (Again, Hard, Good, Easy)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmaps (generated learning paths)
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  phases JSONB NOT NULL, -- [{id, name, levels: [{id, name, concept_ids}]}]
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Streaks
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  freezes_remaining INTEGER DEFAULT 2,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_concept_states_user_next ON concept_states(user_id, next_review_at);
CREATE INDEX idx_concepts_project ON concepts(project_id);
CREATE INDEX idx_sessions_user_date ON sessions(user_id, started_at DESC);
CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_concepts_embedding ON concepts USING ivfflat (embedding vector_cosine_ops);
```

### 8.8 API Structure (tRPC Routers)

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc';
import { authRouter } from './auth';
import { projectRouter } from './project';
import { sourceRouter } from './source';
import { learningRouter } from './learning';
import { sessionRouter } from './session';
import { progressRouter } from './progress';
import { settingsRouter } from './settings';

export const appRouter = router({
  auth: authRouter,
  project: projectRouter,     // CRUD projects
  source: sourceRouter,       // Upload, analyze sources
  learning: learningRouter,   // Get next question, submit answer
  session: sessionRouter,     // Start, end, track sessions
  progress: progressRouter,   // Stats, mastery, streaks
  settings: settingsRouter,   // User preferences, API config
});

export type AppRouter = typeof appRouter;
```

### 8.9 Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
OPENROUTER_API_KEY=sk-or-xxx

# Storage (R2/S3)
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=learning-app-uploads

# Background Jobs
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Feature Flags
ENABLE_LOCAL_LLM=false
ENABLE_BYOK=true
```

---

## 9. Open Questions

### 9.1 Product Questions

| Question | Options | Decision Needed By |
|----------|---------|-------------------|
| Should users be able to skip pretests? | Allow skip vs Require all | Design phase |
| How to handle users who want to "binge"? | Hard block vs Soft warning vs Allow with tracking | Design phase |
| Should streaks include maintenance mode? | Yes vs Only active learning | Design phase |
| Allow user to manually adjust FSRS intervals? | No adjustment vs Power user setting | Post-MVP |
| Support user-generated content (custom questions)? | Yes vs No vs Suggest only | Post-MVP |

### 9.2 Technical Questions

| Question | Options | Decision Needed By |
|----------|---------|-------------------|
| LLM provider for generation/evaluation | OpenAI vs Anthropic vs Multiple vs Self-hosted | Architecture phase |
| FSRS implementation | Open-source Anki vs Custom | Architecture phase |
| Offline support scope | Reviews only vs Full sessions | Architecture phase |
| Sleep tracking integration | Manual only vs Apple Health vs Multiple | Design phase |

### 9.3 Research Questions

| Question | How to Answer |
|----------|---------------|
| Does app-delivered pretesting match lab effect sizes? | A/B test with controlled cohort |
| What is optimal new concept limit per session? | Vary 2-5 concepts, measure retention |
| Does teach-back mode improve retention in app context? | A/B test with matched users |
| What interleaving ratio is optimal? | Vary ratio, measure retention + engagement |

---

## 10. Appendices

### Appendix A: Research Reference Summary

| Finding | Effect Size | Source | Feature Implemented |
|---------|-------------|--------|---------------------|
| Testing effect | g = 0.50-0.81 | Rowland (2014) | Retrieval practice |
| Free recall advantage | g = 0.81 | Rowland (2014) | Prioritize free recall |
| Spacing effect | d = 0.54-0.85 | Donoghue & Hattie (2021) | FSRS scheduling |
| Successive relearning | d = 1.52-4.19 | Rawson & Dunlosky | 3+ session protocol |
| Pretesting | d = 1.1 | Richland et al. (2009) | Pretest feature |
| Feedback amplification | d = 0.73 vs 0.39 | Rowland (2014) | AI feedback |
| Interleaving | g = 0.42-0.83 | Brunmair & Richter (2019) | Mixed review |
| Sleep consolidation | 20-40% effects | Walker (UC Berkeley) | Sleep-aware scheduling |
| Working memory limit | 3-4 chunks | Cowan (2010) | Max 4 new concepts |
| Elaborative interrogation | d = 0.59 | Dunlosky (2013) | Why/how prompts |
| Protégé effect | ~50% improvement | Koh et al. (2018) | Teach-back mode |
| Mastery-based progression | +5-8 months | EEF | Mastery gates |
| Metacognition | +7-8 months | EEF | Progress dashboard |

### Appendix B: Concept State Definitions

| State | Definition | Transition To | Transition From |
|-------|------------|---------------|-----------------|
| UNSEEN | Concept not yet encountered | EXPOSED | — |
| EXPOSED | Seen but not yet retrieved | FRAGILE, MISCONCEIVED | UNSEEN |
| FRAGILE | Correct but weak retrieval | DEVELOPING | EXPOSED |
| MISCONCEIVED | Incorrect with high confidence | CORRECTED | EXPOSED |
| CORRECTED | Misconception addressed | DEVELOPING | MISCONCEIVED |
| DEVELOPING | Consistent but effortful recall | SOLID | FRAGILE, CORRECTED |
| SOLID | Fast, accurate, transfers | MASTERED | DEVELOPING |
| MASTERED | Criterion met across 3+ sessions | — | SOLID |

### Appendix C: Method Types and Applicability

| Method | Declarative | Conceptual | Procedural | Perceptual | Strategic |
|--------|-------------|------------|------------|------------|-----------|
| Free recall | ✓ | ✓ | ○ | ○ | ✓ |
| Cued recall | ✓ | ○ | ✓ | ○ | ○ |
| Multiple choice | ✓ | ○ | ○ | ✓ | ○ |
| Application scenario | ○ | ✓ | ✓ | ✓ | ✓ |
| Elaboration (why/how) | ○ | ✓ | ○ | ○ | ✓ |
| Discrimination | ✓ | ✓ | ○ | ✓ | ○ |
| Teach-back | ✓ | ✓ | ○ | ○ | ✓ |
| Productive failure | ✗ | ✓ | ○ | ○ | ✓ |
| Worked example | ○ | ✓ | ✓ | ○ | ✓ |

✓ = Primary fit | ○ = Secondary fit | ✗ = Not applicable

### Appendix D: Capacity Cost Reference

| Concept Type | Base Cost | Modifier Examples |
|--------------|-----------|-------------------|
| Simple fact | 3 | +1 abstract, +2 novel domain |
| Definition | 4 | +1 per unfamiliar related concept |
| Relational concept | 5 | +1 per prerequisite same session |
| Procedure (3-5 steps) | 7 | +2 software-based |
| Procedure (6+ steps) | 12 | Should be chunked |
| Decision/strategic | 8 | +3 multiple conditions |
| Perceptual pattern | 6 | -2 multiple examples |

### Appendix E: Glossary

| Term | Definition |
|------|------------|
| FSRS | Free Spaced Repetition Scheduler — ML-based algorithm for optimal review timing |
| Successive relearning | Protocol combining retrieval + spacing + criterion mastery |
| Desirable difficulty | Learning that feels harder but produces better retention |
| Interleaving | Mixing different topics during practice |
| Pretesting | Testing before instruction to prime encoding |
| Consolidation | Brain process of stabilizing memories, primarily during sleep |
| Criterion mastery | Requirement to achieve correct recall before advancing |
| Transfer | Ability to apply knowledge to novel situations |
| Elaborative interrogation | "Why" and "how" questions that deepen understanding |
| Protégé effect | Learning improvement from teaching others |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Engineering Lead | | | |
| Research Advisor | | | |
| UX Lead | | | |

### Appendix F: Review Integration Matrix

This appendix documents how critical insights from external review were incorporated into the specification.

#### Review Source: Blind Spot Analysis

| Review Insight | Severity | Feature Added | Section |
|----------------|----------|---------------|---------|
| **Transfer deficit: Retention ≠ Application** | Critical | F-015: Transfer-Focused Retrieval | 4.15 |
| Cognitive type tagging needed | Critical | Cognitive Type Taxonomy | 4.15 |
| Retrieval prompts must match application demands | Critical | Retrieval Prompt Generation by Type | 4.15 |
| **Wall of Debt / Review overload** | Critical | F-016: Forgiveness-First Scheduling | 4.16 |
| Bankruptcy options needed | Critical | Bankruptcy Mode | 4.16.3 |
| Load balancing across days | Critical | Load Spreading Algorithm | 4.16.2 |
| Forgiveness by default | Critical | Design Principle | 4.16 |
| **Adult autonomy / Andragogical concerns** | Critical | F-017: Learner Autonomy & Override | 4.17 |
| Override controls | Critical | Schedule Override | 4.17.2 |
| Just-in-time access | Critical | Just-In-Time Mode | 4.17.1 |
| Visible rationale | Critical | Visible Scheduling Rationale | 4.17.3 |
| **Variable executive function** | High | F-018: Variable Executive Function | 4.18 |
| Flexible daily caps | High | Flexible Daily Caps | 4.18.4 |
| "Easy day" options | High | Easy Day Mode | 4.18.3 |
| **Metacognition enhancement** | High | F-019: Confidence-Based Metacognition | 4.19 |
| Confidence ratings | High | Pre-Answer Confidence Rating | 4.19.1 |
| Calibration tracking | High | Calibration Dashboard | 4.19.3 |
| **Cognitive load in UI / Mobile** | High | F-020: Integrated Question-Context | 4.20 |
| Split-attention prevention | High | Contextual Question Display | 4.20.1 |
| Mobile-optimized layouts | High | Progressive Disclosure | 4.20.2 |

#### Review Validations (Existing Strengths Confirmed)

| Review Point | Spec Alignment |
|--------------|----------------|
| "Spacing and testing effects are robust" | Core architecture unchanged |
| "Cognitive load budgeting well-positioned" | F-006 validated, extended with F-018 |
| "Build measurement from day one" | Section 7: Success Metrics includes research validation |
| "Self-referential progress over leaderboards" | F-012: Progress Dashboard (no leaderboards) |
| "Single-player experience first" | Social features deprioritized |

#### Review Corrections Incorporated

| Review Claim | Spec Response |
|--------------|---------------|
| "Retrieval doesn't help problem-solving" | Clarified: retrieval of *procedures and principles* transfers; F-015 ensures prompt type matching |
| "Delayed feedback superior" | Maintained immediate feedback with added confidence rating for metacognitive benefit |
| "Gamification concerns" | Avoided game mechanics; focused on competence visualization and intrinsic motivation |

#### Design Philosophy Additions from Review

| Principle | Implementation |
|-----------|----------------|
| **Recommendations, not commands** | All scheduling framed as suggestions (F-017) |
| **Forgiveness by default** | System assumes life happens (F-016) |
| **Autonomy preserves motivation** | User can override anything without penalty (F-017) |
| **Emotional load matters** | Capacity budgeting extended to motivational state (F-016, F-018) |
| **Transfer is the goal** | Mastery definition updated to require application (F-015) |

---

### Appendix G: Updated Feature Priority Matrix

Following review integration, feature priorities have been re-assessed:

| Priority | Feature ID | Feature Name | Rationale |
|----------|------------|--------------|-----------|
| **P0 Critical** | F-001 | Content Upload & Analysis | Foundational |
| **P0 Critical** | F-025 | **Project & Source Management** | *Infrastructure: Multi-source integration, persistence* |
| **P0 Critical** | F-002 | Pretest Generation | High effect size (d=1.1) |
| **P0 Critical** | F-003 | Retrieval Practice Generation | Core methodology |
| **P0 Critical** | F-004 | FSRS Scheduling | Core methodology |
| **P0 Critical** | F-005 | Successive Relearning | Highest effect size (d=1.52-4.19) |
| **P0 Critical** | F-006 | Cognitive Load Budget | Prevents failure mode |
| **P0 Critical** | F-015 | Transfer-Focused Retrieval | *Review insight: Retention ≠ application* |
| **P0 Critical** | F-016 | Forgiveness-First Scheduling | *Review insight: Wall of debt* |
| **P0 Critical** | F-017 | Learner Autonomy & Override | *Review insight: Adult autonomy* |
| **P0 Critical** | F-021 | AI-Powered Interactive Practice | *Productive struggle; execution > recognition* |
| **P0 Critical** | F-023 | Learning Roadmap & Session Planning | *User visibility, motivation, gamification* |
| **P0 Critical** | F-024 | Direct Call-to-Action | *Real-world practice for unsimulable skills* |
| **P1 High** | F-007 | Sleep-Aware Scheduling | Consolidation (20-40% effects) |
| **P1 High** | F-008 | Real-Time Assessment | Enables adaptation |
| **P1 High** | F-009 | Misconception Detection | Prevents entrenchment |
| **P1 High** | F-010 | Mastery Gates | Ensures foundations |
| **P1 High** | F-011 | Adaptive Method Selection | Personalization |
| **P1 High** | F-018 | Variable Executive Function | *Review insight: Flexible capacity* |
| **P1 High** | F-019 | Confidence-Based Metacognition | *Review insight: Calibration* |
| **P1 High** | F-020 | Integrated Question-Context | *Review insight: Mobile UX* |
| **P1 High** | F-022 | Open-Ended Generation Tasks | *Generation > recognition* |
| **P2 Medium** | F-012 | Progress Dashboard | Metacognition support |
| **P2 Medium** | F-013 | Maintenance Mode | Long-term retention |
| **P2 Medium** | F-014 | Teach-Back Mode | Protégé effect |

**Note:** Thirteen features at P0 Critical. F-025 provides data infrastructure for multi-source projects. F-021 + F-023 + F-024 form the "Active Practice System"—the core differentiator from traditional Q&A apps.

### Appendix H: Interaction Hierarchy (Learning Effectiveness)

Based on research, interactions are ranked by learning effectiveness:

| Rank | Interaction Type | Effectiveness | App Implementation |
|------|------------------|---------------|-------------------|
| 1 | **Execute actual skill (real tool)** | Highest | F-024: Direct Call-to-Action |
| 2 | **Execute in simulation** | Very High | F-021: Dynamic Playground |
| 3 | **Generate without cues** | Very High | F-022: Open-ended generation |
| 4 | **Free recall explanation** | High (g=0.81) | F-003: "Explain in own words" |
| 5 | **Application scenarios** | High | F-015: Transfer-focused retrieval |
| 6 | **Cued recall** | Medium (g=0.50) | F-003: Fill-in-blank |
| 7 | **Recognition (MC)** | Lower | Early exposure only |
| 8 | **Re-reading** | Low (d=0.53) | **Not included** |
| 9 | **Highlighting** | Low (d=0.44) | **Not included** |

**Design Principle:** Default to highest-effectiveness interactions. The app should feel harder than traditional apps because productive struggle drives retention.

### Appendix I: Practice Modality Decision Framework

The AI determines the optimal practice modality for each concept.

#### Decision Matrix

| Skill Type | Examples | Primary Modality | Fallback |
|------------|----------|------------------|----------|
| **Pure Conceptual** | Economics, physics laws | PROBLEM | — |
| **Analytical** | Financial analysis, debugging | PUZZLE | PROBLEM |
| **Software (UI)** | Tool locations, menus | INTERACTION | CTA |
| **Software (Workflow)** | Complete edit, full process | CALL_TO_ACTION | INTERACTION |
| **3D/Creative Software** | Blender, CAD | CALL_TO_ACTION | — |
| **Motor/Physical** | Sports, cooking | CALL_TO_ACTION | — |
| **Language Speaking** | Conversation | INTERACTION + CTA | INTERACTION |
| **Writing/Creative** | Essays, design | CALL_TO_ACTION | — |
| **Strategic/Decision** | Trading, negotiation | INTERACTION | GAME |

#### Modality Definitions

| Modality | Location | Best For |
|----------|----------|----------|
| **PROBLEM** | In-app | Conceptual understanding |
| **PUZZLE** | In-app | Logic, patterns |
| **INTERACTION** | In-app | Simplified skill practice |
| **GAME** | In-app | Pattern recognition, speed |
| **CALL_TO_ACTION** | Outside app | Genuine skill execution |

#### AI Decision Logic

```
FOR each concept:
  IF skill cannot be meaningfully simulated:
    → CALL_TO_ACTION
  ELIF simulation loses >40% learning value:
    → CALL_TO_ACTION with INTERACTION scaffold
  ELIF conceptual/analytical:
    → PROBLEM or PUZZLE
  ELIF benefits from gamification:
    → GAME
  ELSE:
    → INTERACTION
```

### Appendix J: Roadmap Estimation Formulas

#### Session Count Estimation

```
Total Sessions = Learning Sessions + Review Sessions + Buffer

Learning Sessions = Σ(concepts / concepts_per_session)
  - Simple: 3-4 per session
  - Medium: 2-3 per session
  - Complex: 1-2 per session

Review Sessions = Learning Sessions × 0.4

Buffer = Total × 0.15
```

#### Calendar Estimation

```
Completion = Start + (Total Sessions / Sessions Per Week)

Sessions Per Week:
  - Aggressive: 7/week
  - Typical: 4-5/week
  - Relaxed: 2-3/week
```

---

*End of Specification Document*
