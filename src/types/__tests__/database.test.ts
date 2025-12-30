/**
 * Database Types Tests
 *
 * Tests for database type definitions related to content analysis.
 * These tests ensure type correctness and completeness.
 */

import {
  // Existing types
  ProjectStatus,
  Project,
  SourceStatus,
  Source,
  // Transcription types
  TranscriptionStatus,
  TranscriptionSegment,
  Transcription,
  TranscriptionInsert,
  // Concept types
  CognitiveType,
  Concept,
  ConceptInsert,
  ConceptUpdate,
  // Concept relationship types
  RelationshipType,
  ConceptRelationship,
  ConceptRelationshipInsert,
  // Roadmap types
  RoadmapStatus,
  RoadmapLevel,
  MasteryGate,
  Roadmap,
  RoadmapInsert,
  RoadmapUpdate,
} from '../database';

describe('TranscriptionStatus enum', () => {
  it('includes all required status values', () => {
    const statuses: TranscriptionStatus[] = ['pending', 'processing', 'completed', 'failed'];

    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('processing');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });

  it('type checks correctly', () => {
    const status: TranscriptionStatus = 'pending';
    expect(status).toBe('pending');
  });
});

describe('TranscriptionSegment interface', () => {
  it('accepts valid segment data', () => {
    const segment: TranscriptionSegment = {
      start: 0,
      end: 5.5,
      text: 'Hello world',
    };

    expect(segment.start).toBe(0);
    expect(segment.end).toBe(5.5);
    expect(segment.text).toBe('Hello world');
  });
});

describe('Transcription interface', () => {
  it('accepts complete transcription data', () => {
    const transcription: Transcription = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      source_id: '123e4567-e89b-12d3-a456-426614174001',
      full_text: 'This is the full transcription text.',
      segments: [{ start: 0, end: 5, text: 'This is' }],
      language: 'en',
      confidence: 0.95,
      provider: 'whisper',
      status: 'completed',
      error_message: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(transcription.id).toBeDefined();
    expect(transcription.source_id).toBeDefined();
    expect(transcription.full_text).toBe('This is the full transcription text.');
    expect(transcription.segments).toHaveLength(1);
    expect(transcription.language).toBe('en');
    expect(transcription.confidence).toBe(0.95);
    expect(transcription.provider).toBe('whisper');
    expect(transcription.status).toBe('completed');
    expect(transcription.error_message).toBeNull();
  });

  it('allows null for optional fields', () => {
    const transcription: Transcription = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      source_id: '123e4567-e89b-12d3-a456-426614174001',
      full_text: 'Text',
      segments: [],
      language: 'en',
      confidence: null,
      provider: null,
      status: 'pending',
      error_message: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(transcription.confidence).toBeNull();
    expect(transcription.provider).toBeNull();
  });
});

describe('TranscriptionInsert interface', () => {
  it('requires only mandatory fields', () => {
    const insert: TranscriptionInsert = {
      source_id: '123e4567-e89b-12d3-a456-426614174001',
      full_text: 'Transcription text',
    };

    expect(insert.source_id).toBeDefined();
    expect(insert.full_text).toBeDefined();
  });

  it('accepts all optional fields', () => {
    const insert: TranscriptionInsert = {
      source_id: '123e4567-e89b-12d3-a456-426614174001',
      full_text: 'Transcription text',
      segments: [{ start: 0, end: 1, text: 'Test' }],
      language: 'en',
      confidence: 0.9,
      provider: 'assemblyai',
      status: 'processing',
      error_message: 'Error occurred',
    };

    expect(insert.segments).toHaveLength(1);
    expect(insert.language).toBe('en');
  });
});

describe('CognitiveType enum', () => {
  it('includes all required cognitive types', () => {
    const types: CognitiveType[] = [
      'declarative',
      'conceptual',
      'procedural',
      'conditional',
      'metacognitive',
    ];

    expect(types).toHaveLength(5);
    expect(types).toContain('declarative');
    expect(types).toContain('conceptual');
    expect(types).toContain('procedural');
    expect(types).toContain('conditional');
    expect(types).toContain('metacognitive');
  });
});

describe('Concept interface', () => {
  it('accepts complete concept data', () => {
    const concept: Concept = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      source_id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'React Hooks',
      definition: 'Functions that let you use state in functional components',
      key_points: ['useState', 'useEffect', 'Custom hooks'],
      cognitive_type: 'procedural',
      difficulty: 5,
      source_timestamps: [{ start: 120, end: 180 }],
      metadata: { tags: ['react', 'frontend'] },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(concept.name).toBe('React Hooks');
    expect(concept.cognitive_type).toBe('procedural');
    expect(concept.difficulty).toBe(5);
    expect(concept.key_points).toHaveLength(3);
  });

  it('allows null for optional fields', () => {
    const concept: Concept = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      source_id: null,
      name: 'Concept Name',
      definition: 'Definition',
      key_points: [],
      cognitive_type: 'declarative',
      difficulty: null,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(concept.source_id).toBeNull();
    expect(concept.difficulty).toBeNull();
  });
});

describe('ConceptInsert interface', () => {
  it('requires only mandatory fields', () => {
    const insert: ConceptInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'New Concept',
      definition: 'Concept definition',
      cognitive_type: 'conceptual',
    };

    expect(insert.project_id).toBeDefined();
    expect(insert.name).toBeDefined();
    expect(insert.definition).toBeDefined();
    expect(insert.cognitive_type).toBeDefined();
  });

  it('accepts all optional fields', () => {
    const insert: ConceptInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      source_id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'New Concept',
      definition: 'Concept definition',
      key_points: ['Point 1', 'Point 2'],
      cognitive_type: 'procedural',
      difficulty: 7,
      source_timestamps: [{ start: 0, end: 10 }],
      metadata: { category: 'advanced' },
    };

    expect(insert.source_id).toBeDefined();
    expect(insert.key_points).toHaveLength(2);
    expect(insert.difficulty).toBe(7);
  });
});

describe('ConceptUpdate interface', () => {
  it('allows partial updates', () => {
    const update: ConceptUpdate = {
      name: 'Updated Name',
    };

    expect(update.name).toBe('Updated Name');
    expect(update.definition).toBeUndefined();
  });

  it('accepts all updateable fields', () => {
    const update: ConceptUpdate = {
      name: 'Updated Name',
      definition: 'Updated definition',
      key_points: ['New point'],
      cognitive_type: 'metacognitive',
      difficulty: 8,
      source_timestamps: [],
      metadata: {},
    };

    expect(update.cognitive_type).toBe('metacognitive');
    expect(update.difficulty).toBe(8);
  });
});

describe('RelationshipType enum', () => {
  it('includes all required relationship types', () => {
    const types: RelationshipType[] = [
      'prerequisite',
      'causal',
      'taxonomic',
      'temporal',
      'contrasts_with',
    ];

    expect(types).toHaveLength(5);
    expect(types).toContain('prerequisite');
    expect(types).toContain('causal');
    expect(types).toContain('taxonomic');
    expect(types).toContain('temporal');
    expect(types).toContain('contrasts_with');
  });
});

describe('ConceptRelationship interface', () => {
  it('accepts complete relationship data', () => {
    const relationship: ConceptRelationship = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      from_concept_id: '123e4567-e89b-12d3-a456-426614174002',
      to_concept_id: '123e4567-e89b-12d3-a456-426614174003',
      relationship_type: 'prerequisite',
      strength: 0.8,
      metadata: { notes: 'Strong dependency' },
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(relationship.relationship_type).toBe('prerequisite');
    expect(relationship.strength).toBe(0.8);
    expect(relationship.from_concept_id).not.toBe(relationship.to_concept_id);
  });
});

describe('ConceptRelationshipInsert interface', () => {
  it('requires mandatory fields', () => {
    const insert: ConceptRelationshipInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      from_concept_id: '123e4567-e89b-12d3-a456-426614174002',
      to_concept_id: '123e4567-e89b-12d3-a456-426614174003',
      relationship_type: 'causal',
    };

    expect(insert.project_id).toBeDefined();
    expect(insert.from_concept_id).toBeDefined();
    expect(insert.to_concept_id).toBeDefined();
    expect(insert.relationship_type).toBeDefined();
  });

  it('accepts optional fields', () => {
    const insert: ConceptRelationshipInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      from_concept_id: '123e4567-e89b-12d3-a456-426614174002',
      to_concept_id: '123e4567-e89b-12d3-a456-426614174003',
      relationship_type: 'taxonomic',
      strength: 0.5,
      metadata: { reason: 'Partial relationship' },
    };

    expect(insert.strength).toBe(0.5);
    expect(insert.metadata).toBeDefined();
  });
});

describe('RoadmapStatus enum', () => {
  it('includes all required status values', () => {
    const statuses: RoadmapStatus[] = ['draft', 'active', 'completed'];

    expect(statuses).toHaveLength(3);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('active');
    expect(statuses).toContain('completed');
  });
});

describe('RoadmapLevel interface', () => {
  it('accepts valid level data', () => {
    const level: RoadmapLevel = {
      level: 1,
      title: 'Fundamentals',
      concept_ids: ['uuid1', 'uuid2'],
      estimated_minutes: 60,
    };

    expect(level.level).toBe(1);
    expect(level.title).toBe('Fundamentals');
    expect(level.concept_ids).toHaveLength(2);
    expect(level.estimated_minutes).toBe(60);
  });
});

describe('MasteryGate interface', () => {
  it('accepts valid mastery gate data', () => {
    const gate: MasteryGate = {
      after_level: 1,
      required_score: 80,
      quiz_concept_ids: ['uuid1', 'uuid2'],
    };

    expect(gate.after_level).toBe(1);
    expect(gate.required_score).toBe(80);
    expect(gate.quiz_concept_ids).toHaveLength(2);
  });
});

describe('Roadmap interface', () => {
  it('accepts complete roadmap data', () => {
    const roadmap: Roadmap = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'React Learning Path',
      description: 'Complete guide to learning React',
      levels: [
        { level: 1, title: 'Basics', concept_ids: ['uuid1'], estimated_minutes: 30 },
        { level: 2, title: 'Advanced', concept_ids: ['uuid2'], estimated_minutes: 60 },
      ],
      total_estimated_minutes: 90,
      mastery_gates: [{ after_level: 1, required_score: 70, quiz_concept_ids: ['uuid1'] }],
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(roadmap.title).toBe('React Learning Path');
    expect(roadmap.levels).toHaveLength(2);
    expect(roadmap.total_estimated_minutes).toBe(90);
    expect(roadmap.mastery_gates).toHaveLength(1);
    expect(roadmap.status).toBe('active');
  });

  it('allows null for optional fields', () => {
    const roadmap: Roadmap = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Minimal Roadmap',
      description: null,
      levels: [],
      total_estimated_minutes: null,
      mastery_gates: [],
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(roadmap.description).toBeNull();
    expect(roadmap.total_estimated_minutes).toBeNull();
  });
});

describe('RoadmapInsert interface', () => {
  it('requires only mandatory fields', () => {
    const insert: RoadmapInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'New Roadmap',
    };

    expect(insert.project_id).toBeDefined();
    expect(insert.title).toBeDefined();
  });

  it('accepts all optional fields', () => {
    const insert: RoadmapInsert = {
      project_id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Complete Roadmap',
      description: 'A comprehensive roadmap',
      levels: [{ level: 1, title: 'Start', concept_ids: [], estimated_minutes: 10 }],
      total_estimated_minutes: 100,
      mastery_gates: [],
      status: 'active',
    };

    expect(insert.description).toBe('A comprehensive roadmap');
    expect(insert.levels).toHaveLength(1);
    expect(insert.status).toBe('active');
  });
});

describe('RoadmapUpdate interface', () => {
  it('allows partial updates', () => {
    const update: RoadmapUpdate = {
      title: 'Updated Title',
    };

    expect(update.title).toBe('Updated Title');
  });

  it('accepts all updateable fields', () => {
    const update: RoadmapUpdate = {
      title: 'Updated Roadmap',
      description: 'Updated description',
      levels: [],
      total_estimated_minutes: 200,
      mastery_gates: [],
      status: 'completed',
    };

    expect(update.status).toBe('completed');
    expect(update.total_estimated_minutes).toBe(200);
  });
});

// Type compilation tests - these tests verify that the types compile correctly
// If these tests compile without errors, the types are correct
describe('Type compilation verification', () => {
  it('verifies all types are exported and accessible', () => {
    // This test ensures all types are exported
    // If any type is missing, TypeScript will fail to compile
    const typeChecks = {
      transcriptionStatus: 'pending' as TranscriptionStatus,
      cognitiveType: 'declarative' as CognitiveType,
      relationshipType: 'prerequisite' as RelationshipType,
      roadmapStatus: 'draft' as RoadmapStatus,
    };

    expect(typeChecks.transcriptionStatus).toBe('pending');
    expect(typeChecks.cognitiveType).toBe('declarative');
    expect(typeChecks.relationshipType).toBe('prerequisite');
    expect(typeChecks.roadmapStatus).toBe('draft');
  });

  it('verifies type constraints work correctly', () => {
    // Verify that difficulty must be a number when provided
    const concept: Partial<Concept> = {
      difficulty: 5,
    };
    expect(typeof concept.difficulty).toBe('number');

    // Verify that strength must be a number when provided
    const relationship: Partial<ConceptRelationship> = {
      strength: 0.8,
    };
    expect(typeof relationship.strength).toBe('number');
  });
});
