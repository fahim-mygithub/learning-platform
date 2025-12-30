# Proposal: Implement Content Analysis Pipeline

## Summary

Implement Phase 2 of the Learning Platform: the Content Analysis Pipeline that transforms uploaded source content (videos, PDFs, URLs) into structured learning materials through AI-powered transcription, concept extraction, knowledge graph construction, and roadmap generation.

## Motivation

Phase 1 (Foundation Infrastructure) is complete with:
- User authentication
- Project management
- Source upload & storage
- In-app source viewing

Users can now upload content but cannot learn from it. Phase 2 enables the core value proposition: transforming passive content into active learning experiences.

## Scope

### In Scope

1. **Transcription Service**
   - Extract audio from video sources
   - Transcribe using external service (Whisper API or AssemblyAI)
   - Align transcription with video timestamps
   - Store transcription results with source metadata

2. **Concept Extraction**
   - Use Claude API to identify discrete learnable concepts
   - Extract: name, definition, key points for each concept
   - Classify cognitive type (declarative, conceptual, procedural, conditional, metacognitive)
   - Estimate difficulty (1-10 scale)

3. **Knowledge Graph Construction**
   - Identify prerequisite relationships between concepts
   - Map relationship types (causal, taxonomic, temporal, contrasts_with)
   - Store graph structure in database

4. **Roadmap Generation**
   - Organize concepts into levels by prerequisites
   - Define mastery gates between phases
   - Estimate time per level and total duration

### Out of Scope

- Question generation (Phase 5)
- Spaced repetition scheduling (Phase 3)
- Interactive sandbox (Phase 6)
- Actual learning sessions (Phase 4)

## Technical Approach

### AI Provider Integration

Use Anthropic Claude API for:
- Content analysis and concept extraction
- Cognitive type classification
- Difficulty estimation
- Prerequisite relationship identification
- Roadmap generation

### Database Schema Changes

New tables required:
- `transcriptions` - Store transcription text and timestamps
- `concepts` - Store extracted concepts with metadata
- `concept_relationships` - Store knowledge graph edges
- `roadmaps` - Store generated learning paths

### Processing Pipeline

```
Source Upload → Transcription → Concept Extraction → Knowledge Graph → Roadmap
     ↓               ↓                ↓                    ↓              ↓
  (existing)    Whisper/AI      Claude API           Claude API      Claude API
```

## Dependencies

- Phase 1 complete (source upload, viewing)
- Anthropic Claude API access
- Transcription service (Whisper API or AssemblyAI)

## Success Criteria

| Metric | Target |
|--------|--------|
| Transcription accuracy | >95% |
| Concept extraction coverage | >80% of key concepts |
| Prerequisite identification | Correct dependency ordering |
| Processing time | <5 minutes for 30-60 min video |

## Risks

1. **AI API costs** - Mitigated by caching, batch processing
2. **Transcription accuracy** - Mitigated by using proven services
3. **Concept quality** - Mitigated by prompt engineering, user feedback
