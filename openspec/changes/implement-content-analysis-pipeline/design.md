# Design: Content Analysis Pipeline

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Content Analysis Pipeline                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────────┐ │
│  │   Source    │───▶│  Transcription  │───▶│   Concept Extraction     │ │
│  │   Upload    │    │    Service      │    │                          │ │
│  │ (existing)  │    │                 │    │  • Identify concepts     │ │
│  └─────────────┘    │  • Audio extract│    │  • Classify cognitive    │ │
│                     │  • Whisper API  │    │    type                  │ │
│                     │  • Timestamps   │    │  • Estimate difficulty   │ │
│                     └─────────────────┘    └──────────────────────────┘ │
│                                                        │                 │
│                                                        ▼                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────────┐ │
│  │   Roadmap   │◀───│ Knowledge Graph │◀───│   Concept Storage        │ │
│  │  Generation │    │  Construction   │    │                          │ │
│  │             │    │                 │    │  • Database records      │ │
│  │  • Levels   │    │  • Prereqs      │    │  • Metadata              │ │
│  │  • Time est │    │  • Relations    │    │  • Source references     │ │
│  └─────────────┘    └─────────────────┘    └──────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### transcriptions table

```sql
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    full_text TEXT NOT NULL,
    segments JSONB NOT NULL DEFAULT '[]',
    -- segments: [{start: 0.0, end: 5.5, text: "Hello world"}, ...]
    language VARCHAR(10) DEFAULT 'en',
    confidence REAL,
    provider VARCHAR(50), -- 'whisper', 'assemblyai', etc.
    status VARCHAR(20) DEFAULT 'pending',
    -- status: pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transcriptions_source_id ON transcriptions(source_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
```

### concepts table

```sql
CREATE TABLE concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    -- key_points: ["point 1", "point 2", ...]
    cognitive_type VARCHAR(50) NOT NULL,
    -- cognitive_type: declarative, conceptual, procedural, conditional, metacognitive
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
    source_timestamps JSONB DEFAULT '[]',
    -- source_timestamps: [{start: 120.5, end: 180.0}, ...]
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_concepts_project_id ON concepts(project_id);
CREATE INDEX idx_concepts_source_id ON concepts(source_id);
CREATE INDEX idx_concepts_cognitive_type ON concepts(cognitive_type);
```

### concept_relationships table

```sql
CREATE TABLE concept_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    to_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    -- relationship_type: prerequisite, causal, taxonomic, temporal, contrasts_with
    strength REAL DEFAULT 1.0,
    -- strength: 0.0-1.0 confidence in relationship
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(from_concept_id, to_concept_id, relationship_type)
);

CREATE INDEX idx_concept_relationships_project_id ON concept_relationships(project_id);
CREATE INDEX idx_concept_relationships_from ON concept_relationships(from_concept_id);
CREATE INDEX idx_concept_relationships_to ON concept_relationships(to_concept_id);
```

### roadmaps table

```sql
CREATE TABLE roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    levels JSONB NOT NULL DEFAULT '[]',
    -- levels: [{level: 1, name: "Fundamentals", concepts: [id1, id2], estimated_minutes: 30}, ...]
    total_estimated_minutes INTEGER,
    mastery_gates JSONB DEFAULT '[]',
    -- mastery_gates: [{after_level: 1, required_mastery: 0.8}, ...]
    status VARCHAR(20) DEFAULT 'draft',
    -- status: draft, active, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_roadmaps_project_id ON roadmaps(project_id);
```

## Service Architecture

### AIService

Central service for all Claude API interactions.

```typescript
// src/lib/ai-service.ts
interface AIService {
  // Extract concepts from transcription/content
  extractConcepts(content: string, sourceType: string): Promise<ExtractedConcept[]>;

  // Build knowledge graph from concepts
  buildKnowledgeGraph(concepts: Concept[]): Promise<ConceptRelationship[]>;

  // Generate roadmap from knowledge graph
  generateRoadmap(concepts: Concept[], relationships: ConceptRelationship[]): Promise<Roadmap>;
}
```

### TranscriptionService

Handles audio extraction and transcription.

```typescript
// src/lib/transcription-service.ts
interface TranscriptionService {
  // Start transcription job for source
  startTranscription(sourceId: string): Promise<TranscriptionJob>;

  // Check transcription status
  getStatus(jobId: string): Promise<TranscriptionStatus>;

  // Get completed transcription
  getTranscription(sourceId: string): Promise<Transcription>;
}
```

### ContentAnalysisPipeline

Orchestrates the full analysis flow.

```typescript
// src/lib/content-analysis-pipeline.ts
interface ContentAnalysisPipeline {
  // Run full analysis on source
  analyzeSource(sourceId: string): Promise<AnalysisResult>;

  // Get analysis status
  getAnalysisStatus(sourceId: string): Promise<AnalysisStatus>;
}
```

## AI Prompt Design

### Concept Extraction Prompt

```
You are analyzing educational content to extract discrete learnable concepts.

For each concept, provide:
1. name: Short descriptive name (2-5 words)
2. definition: Clear, concise definition (1-2 sentences)
3. key_points: 3-5 essential points to remember
4. cognitive_type: One of [declarative, conceptual, procedural, conditional, metacognitive]
5. difficulty: 1-10 based on abstractness, prerequisite depth, relational complexity

Content to analyze:
{transcription_text}

Respond in JSON format:
{
  "concepts": [
    {
      "name": "...",
      "definition": "...",
      "key_points": ["...", "..."],
      "cognitive_type": "...",
      "difficulty": N
    }
  ]
}
```

### Knowledge Graph Prompt

```
You are building a knowledge graph showing relationships between learning concepts.

For each pair of related concepts, identify:
1. relationship_type: One of [prerequisite, causal, taxonomic, temporal, contrasts_with]
   - prerequisite: Must understand A before B
   - causal: A causes or leads to B
   - taxonomic: A is a type of B, or B contains A
   - temporal: A comes before B in time/sequence
   - contrasts_with: A and B are often confused or contrasted
2. strength: 0.0-1.0 confidence in this relationship

Concepts:
{concepts_json}

Respond in JSON format:
{
  "relationships": [
    {
      "from": "concept_name",
      "to": "concept_name",
      "type": "...",
      "strength": 0.N
    }
  ]
}
```

## Processing Flow

### 1. Transcription (Video/Audio Sources)

```
1. Source upload completed
2. If source is video/audio:
   a. Extract audio track (ffmpeg or cloud service)
   b. Send to Whisper API
   c. Receive timestamped segments
   d. Store in transcriptions table
3. Update source status to 'transcribed'
```

### 2. Concept Extraction

```
1. Transcription completed (or text content ready)
2. Prepare content for analysis:
   - Video/Audio: Use transcription text
   - PDF: Extract text content
   - URL: Fetch and extract article content
3. Send to Claude API with extraction prompt
4. Parse response and validate
5. Store concepts in database
6. Link concepts to source timestamps (if available)
```

### 3. Knowledge Graph Construction

```
1. Concepts extracted for project
2. Send concept list to Claude API
3. Receive relationship predictions
4. Validate relationships (no cycles in prerequisites)
5. Store relationships in database
```

### 4. Roadmap Generation

```
1. Knowledge graph complete
2. Topological sort of prerequisites
3. Group concepts into levels
4. Calculate time estimates
5. Define mastery gates
6. Store roadmap in database
```

## Error Handling

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000,    // 30 seconds
  backoffMultiplier: 2,
};
```

### Status Tracking

Each processing stage updates source/project status:
- `pending` - Queued for processing
- `transcribing` - Audio being transcribed
- `analyzing` - AI extracting concepts
- `building_graph` - Knowledge graph construction
- `generating_roadmap` - Roadmap creation
- `ready` - Analysis complete
- `failed` - Processing failed (with error message)

## Security Considerations

1. **API Keys**: Store Anthropic/Whisper keys in environment variables only
2. **Rate Limiting**: Implement client-side rate limiting for API calls
3. **Data Privacy**: All content processed belongs to user, no sharing
4. **Cost Control**: Track token usage, implement per-user limits

## Trade-offs

### Decision: External Transcription Service vs Local

**Choice**: External (Whisper API or AssemblyAI)

**Rationale**:
- Better accuracy than local models
- No need to run heavy ML models on client
- Proven reliability
- Cost is reasonable for expected usage

### Decision: Single AI Call vs Multi-Stage

**Choice**: Multi-stage with separate API calls

**Rationale**:
- Better prompt focus for each task
- Easier to debug and iterate
- Can retry failed stages independently
- More predictable token usage

### Decision: Eager vs Lazy Processing

**Choice**: Eager (process immediately after upload)

**Rationale**:
- User expects content to be ready when they return
- Background processing doesn't block UI
- Can show progress indicators
- Simpler UX than manual "analyze" button
