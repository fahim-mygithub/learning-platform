/**
 * Knowledge Graph Service Tests
 *
 * Tests for building prerequisite and relationship graphs from concepts using Claude API.
 * Includes tests for:
 * - Building knowledge graphs from concepts
 * - Relationship type validation
 * - Strength value validation (0.0-1.0)
 * - Circular dependency detection
 * - Topological sort for learning order
 * - Prerequisites/dependents traversal
 * - Database storage with duplicate handling
 * - Error handling for AI failures
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  ConceptRelationship,
  RelationshipType,
} from '@/src/types/database';
import { AIError } from '@/src/types/ai';

// Import the mock functions - Jest will use __mocks__/ai-service.ts automatically
import {
  configureMock,
  resetMock,
  getMockCallHistory,
  clearMockCallHistory,
} from '../__mocks__/ai-service';

// Mock the AI service module
jest.mock('../ai-service', () => require('../__mocks__/ai-service'));

// Import after mocking
import {
  createKnowledgeGraphService,
  KnowledgeGraphService,
  KnowledgeGraphError,
  IdentifiedRelationship,
  RELATIONSHIP_TYPES,
  validateIdentifiedRelationship,
} from '../knowledge-graph-service';

describe('Knowledge Graph Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockEq: jest.Mock;
  let mockUpsert: jest.Mock;

  // Sample test data
  const sampleConcepts: Concept[] = [
    {
      id: 'concept-1',
      project_id: 'project-123',
      source_id: 'source-456',
      name: 'Variables',
      definition: 'Named storage locations in memory that hold data values.',
      key_points: ['Store data', 'Have types', 'Can be modified'],
      cognitive_type: 'declarative',
      difficulty: 2,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-2',
      project_id: 'project-123',
      source_id: 'source-456',
      name: 'Functions',
      definition: 'Reusable blocks of code that perform specific tasks.',
      key_points: ['Accept parameters', 'Return values', 'Promote reuse'],
      cognitive_type: 'procedural',
      difficulty: 4,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-3',
      project_id: 'project-123',
      source_id: 'source-456',
      name: 'Loops',
      definition: 'Control structures that repeat code execution.',
      key_points: ['Iteration', 'For loops', 'While loops'],
      cognitive_type: 'procedural',
      difficulty: 3,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-4',
      project_id: 'project-123',
      source_id: 'source-456',
      name: 'Recursion',
      definition: 'A function that calls itself to solve smaller instances of a problem.',
      key_points: ['Self-reference', 'Base case', 'Recursive case'],
      cognitive_type: 'procedural',
      difficulty: 7,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const sampleIdentifiedRelationships: IdentifiedRelationship[] = [
    {
      from_concept_name: 'Variables',
      to_concept_name: 'Functions',
      relationship_type: 'prerequisite',
      strength: 0.9,
    },
    {
      from_concept_name: 'Variables',
      to_concept_name: 'Loops',
      relationship_type: 'prerequisite',
      strength: 0.8,
    },
    {
      from_concept_name: 'Functions',
      to_concept_name: 'Recursion',
      relationship_type: 'prerequisite',
      strength: 0.95,
    },
    {
      from_concept_name: 'Loops',
      to_concept_name: 'Recursion',
      relationship_type: 'contrasts_with',
      strength: 0.7,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockUpsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createKnowledgeGraphService', () => {
    it('creates service with valid configuration', () => {
      const service = createKnowledgeGraphService(mockSupabase);

      expect(service).toBeDefined();
      expect(service.buildKnowledgeGraph).toBeDefined();
      expect(service.getProjectRelationships).toBeDefined();
      expect(service.getPrerequisites).toBeDefined();
      expect(service.getDependents).toBeDefined();
      expect(service.getTopologicalOrder).toBeDefined();
      expect(service.hasCircularDependency).toBeDefined();
    });

    it('throws error when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createKnowledgeGraphService(mockSupabase)).toThrow(
        KnowledgeGraphError
      );
      expect(() => createKnowledgeGraphService(mockSupabase)).toThrow(
        'API key'
      );
    });
  });

  describe('buildKnowledgeGraph', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('builds knowledge graph from concepts using AI', async () => {
      const projectId = 'project-123';

      // Configure mock to return sample relationships
      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      // Mock database insert for relationships
      const insertedRelationships: ConceptRelationship[] = sampleIdentifiedRelationships.map(
        (r, i) => ({
          id: `rel-${i}`,
          project_id: projectId,
          from_concept_id: sampleConcepts.find(c => c.name === r.from_concept_name)!.id,
          to_concept_id: sampleConcepts.find(c => c.name === r.to_concept_name)!.id,
          relationship_type: r.relationship_type,
          strength: r.strength,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        })
      );

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: insertedRelationships,
            error: null,
          }),
        }),
      });

      const relationships = await service.buildKnowledgeGraph(
        projectId,
        sampleConcepts
      );

      expect(relationships).toHaveLength(4);
      expect(relationships[0].relationship_type).toBe('prerequisite');
    });

    it('maps concept names from AI response to concept IDs', async () => {
      const projectId = 'project-123';
      let insertedData: unknown[] = [];

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockImplementation((data: Record<string, unknown>[]) => {
          insertedData = data;
          return {
            select: jest.fn().mockResolvedValue({
              data: data.map((d, i) => ({
                id: `rel-${i}`,
                ...d,
                created_at: '2024-01-01T00:00:00Z',
              })),
              error: null,
            }),
          };
        }),
      });

      await service.buildKnowledgeGraph(projectId, sampleConcepts);

      expect(insertedData).toHaveLength(4);
      // Check that concept names were mapped to IDs
      expect((insertedData[0] as Record<string, unknown>).from_concept_id).toBe('concept-1'); // Variables
      expect((insertedData[0] as Record<string, unknown>).to_concept_id).toBe('concept-2'); // Functions
    });

    it('sends correct prompt to AI service with concept context', async () => {
      const projectId = 'project-123';

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      await service.buildKnowledgeGraph(projectId, sampleConcepts);

      const callHistory = getMockCallHistory();
      expect(callHistory).toHaveLength(1);
      // Check system prompt explains relationship types
      expect(callHistory[0].message.systemPrompt).toContain('prerequisite');
      expect(callHistory[0].message.systemPrompt).toContain('causal');
      expect(callHistory[0].message.systemPrompt).toContain('taxonomic');
      expect(callHistory[0].message.systemPrompt).toContain('temporal');
      expect(callHistory[0].message.systemPrompt).toContain('contrasts_with');
      // Check user message contains concept information
      expect(callHistory[0].message.userMessage).toContain('Variables');
      expect(callHistory[0].message.userMessage).toContain('Functions');
    });

    it('stores relationships in database with correct fields', async () => {
      const projectId = 'project-123';
      let insertedData: unknown[] = [];

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockImplementation((data: Record<string, unknown>[]) => {
          insertedData = data;
          return {
            select: jest.fn().mockResolvedValue({
              data: data.map((d, i) => ({
                id: `rel-${i}`,
                ...d,
                created_at: '2024-01-01T00:00:00Z',
              })),
              error: null,
            }),
          };
        }),
      });

      await service.buildKnowledgeGraph(projectId, sampleConcepts);

      expect(mockFrom).toHaveBeenCalledWith('concept_relationships');
      expect(insertedData).toHaveLength(4);
      expect((insertedData[0] as Record<string, unknown>).project_id).toBe(projectId);
      expect((insertedData[0] as Record<string, unknown>).relationship_type).toBe('prerequisite');
      expect((insertedData[0] as Record<string, unknown>).strength).toBe(0.9);
    });

    it('handles concepts with no relationships', async () => {
      const projectId = 'project-123';
      const singleConcept: Concept[] = [sampleConcepts[0]];

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', []],
        ]),
      });

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const relationships = await service.buildKnowledgeGraph(
        projectId,
        singleConcept
      );

      expect(relationships).toEqual([]);
    });

    it('handles duplicate relationships with upsert', async () => {
      const projectId = 'project-123';

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      // Mock the upsert function to simulate conflict handling
      const upsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: sampleIdentifiedRelationships.map((r, i) => ({
            id: `rel-${i}`,
            project_id: projectId,
            from_concept_id: sampleConcepts.find(c => c.name === r.from_concept_name)!.id,
            to_concept_id: sampleConcepts.find(c => c.name === r.to_concept_name)!.id,
            relationship_type: r.relationship_type,
            strength: r.strength,
            metadata: {},
            created_at: '2024-01-01T00:00:00Z',
          })),
          error: null,
        }),
      });

      mockFrom.mockReturnValue({
        upsert: upsertMock,
      });

      await service.buildKnowledgeGraph(projectId, sampleConcepts);

      // Verify upsert was used (which handles duplicates)
      expect(upsertMock).toHaveBeenCalled();
    });

    it('skips relationships where concept names are not found', async () => {
      const projectId = 'project-123';
      const relationshipsWithUnknown: IdentifiedRelationship[] = [
        {
          from_concept_name: 'Variables',
          to_concept_name: 'Functions',
          relationship_type: 'prerequisite',
          strength: 0.9,
        },
        {
          from_concept_name: 'Unknown Concept',
          to_concept_name: 'Functions',
          relationship_type: 'prerequisite',
          strength: 0.8,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', relationshipsWithUnknown],
        ]),
      });

      let insertedData: unknown[] = [];
      mockFrom.mockReturnValue({
        upsert: jest.fn().mockImplementation((data: Record<string, unknown>[]) => {
          insertedData = data;
          return {
            select: jest.fn().mockResolvedValue({
              data: data.map((d, i) => ({
                id: `rel-${i}`,
                ...d,
                created_at: '2024-01-01T00:00:00Z',
              })),
              error: null,
            }),
          };
        }),
      });

      await service.buildKnowledgeGraph(projectId, sampleConcepts);

      // Should only insert the valid relationship
      expect(insertedData).toHaveLength(1);
    });
  });

  describe('Relationship type validation', () => {
    it.each([
      'prerequisite',
      'causal',
      'taxonomic',
      'temporal',
      'contrasts_with',
    ] as RelationshipType[])(
      'accepts valid relationship type: %s',
      (relationshipType) => {
        const validRelationship: IdentifiedRelationship = {
          from_concept_name: 'A',
          to_concept_name: 'B',
          relationship_type: relationshipType,
          strength: 0.8,
        };

        expect(() => validateIdentifiedRelationship(validRelationship)).not.toThrow();
        expect(RELATIONSHIP_TYPES).toContain(relationshipType);
      }
    );

    it('all relationship types are valid RelationshipType enum values', () => {
      const validTypes: RelationshipType[] = [
        'prerequisite',
        'causal',
        'taxonomic',
        'temporal',
        'contrasts_with',
      ];

      expect(RELATIONSHIP_TYPES).toEqual(validTypes);
    });

    it('rejects invalid relationship type', () => {
      const invalidRelationship = {
        from_concept_name: 'A',
        to_concept_name: 'B',
        relationship_type: 'invalid_type',
        strength: 0.8,
      } as unknown as IdentifiedRelationship;

      expect(() => validateIdentifiedRelationship(invalidRelationship)).toThrow(
        KnowledgeGraphError
      );
    });
  });

  describe('Strength value validation', () => {
    it.each([0.0, 0.1, 0.5, 0.9, 1.0])(
      'accepts valid strength value: %d',
      (strength) => {
        const validRelationship: IdentifiedRelationship = {
          from_concept_name: 'A',
          to_concept_name: 'B',
          relationship_type: 'prerequisite',
          strength,
        };

        expect(() => validateIdentifiedRelationship(validRelationship)).not.toThrow();
      }
    );

    it('strength values are between 0.0 and 1.0', () => {
      const validRelationship: IdentifiedRelationship = {
        from_concept_name: 'A',
        to_concept_name: 'B',
        relationship_type: 'prerequisite',
        strength: 0.75,
      };

      expect(validRelationship.strength).toBeGreaterThanOrEqual(0.0);
      expect(validRelationship.strength).toBeLessThanOrEqual(1.0);
    });

    it('rejects strength below 0.0', () => {
      const invalidRelationship: IdentifiedRelationship = {
        from_concept_name: 'A',
        to_concept_name: 'B',
        relationship_type: 'prerequisite',
        strength: -0.1,
      };

      expect(() => validateIdentifiedRelationship(invalidRelationship)).toThrow(
        KnowledgeGraphError
      );
    });

    it('rejects strength above 1.0', () => {
      const invalidRelationship: IdentifiedRelationship = {
        from_concept_name: 'A',
        to_concept_name: 'B',
        relationship_type: 'prerequisite',
        strength: 1.1,
      };

      expect(() => validateIdentifiedRelationship(invalidRelationship)).toThrow(
        KnowledgeGraphError
      );
    });
  });

  describe('Circular dependency detection', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('detects circular dependency A->B->C->A', async () => {
      const projectId = 'project-123';

      // Circular relationships: A -> B -> C -> A
      const circularRelationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-b',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-b',
          to_concept_id: 'concept-c',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-3',
          project_id: projectId,
          from_concept_id: 'concept-c',
          to_concept_id: 'concept-a',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: circularRelationships,
            error: null,
          }),
        }),
      });

      const hasCycle = await service.hasCircularDependency(projectId);

      expect(hasCycle).toBe(true);
    });

    it('detects self-referencing cycle A->A', async () => {
      const projectId = 'project-123';

      const selfReferenceRelationship: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-a',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: selfReferenceRelationship,
            error: null,
          }),
        }),
      });

      const hasCycle = await service.hasCircularDependency(projectId);

      expect(hasCycle).toBe(true);
    });

    it('returns false for valid DAG (no circular dependency)', async () => {
      const projectId = 'project-123';

      // Valid DAG: A -> B, A -> C, B -> D, C -> D
      const dagRelationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-b',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-c',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-3',
          project_id: projectId,
          from_concept_id: 'concept-b',
          to_concept_id: 'concept-d',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-4',
          project_id: projectId,
          from_concept_id: 'concept-c',
          to_concept_id: 'concept-d',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: dagRelationships,
            error: null,
          }),
        }),
      });

      const hasCycle = await service.hasCircularDependency(projectId);

      expect(hasCycle).toBe(false);
    });

    it('returns false for empty relationship set', async () => {
      const projectId = 'project-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const hasCycle = await service.hasCircularDependency(projectId);

      expect(hasCycle).toBe(false);
    });

    it('handles longer cycles correctly (A->B->C->D->E->A)', async () => {
      const projectId = 'project-123';

      const longCycleRelationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-b',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-b',
          to_concept_id: 'concept-c',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-3',
          project_id: projectId,
          from_concept_id: 'concept-c',
          to_concept_id: 'concept-d',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-4',
          project_id: projectId,
          from_concept_id: 'concept-d',
          to_concept_id: 'concept-e',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-5',
          project_id: projectId,
          from_concept_id: 'concept-e',
          to_concept_id: 'concept-a',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: longCycleRelationships,
            error: null,
          }),
        }),
      });

      const hasCycle = await service.hasCircularDependency(projectId);

      expect(hasCycle).toBe(true);
    });
  });

  describe('Topological sort', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('returns concepts in correct learning order', async () => {
      const projectId = 'project-123';

      // Relationships: Variables -> Functions -> Recursion, Variables -> Loops
      const relationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-1', // Variables
          to_concept_id: 'concept-2', // Functions
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-2', // Functions
          to_concept_id: 'concept-4', // Recursion
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-3',
          project_id: projectId,
          from_concept_id: 'concept-1', // Variables
          to_concept_id: 'concept-3', // Loops
          relationship_type: 'prerequisite',
          strength: 0.8,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      // First call for relationships
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: relationships,
            error: null,
          }),
        }),
      });

      // Second call for concepts
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: sampleConcepts,
            error: null,
          }),
        }),
      });

      const sortedConcepts = await service.getTopologicalOrder(projectId);

      // Variables should come first (no prerequisites)
      expect(sortedConcepts[0].name).toBe('Variables');

      // Find indices of each concept
      const variablesIndex = sortedConcepts.findIndex(c => c.name === 'Variables');
      const functionsIndex = sortedConcepts.findIndex(c => c.name === 'Functions');
      const loopsIndex = sortedConcepts.findIndex(c => c.name === 'Loops');
      const recursionIndex = sortedConcepts.findIndex(c => c.name === 'Recursion');

      // Variables should come before Functions, Loops
      expect(variablesIndex).toBeLessThan(functionsIndex);
      expect(variablesIndex).toBeLessThan(loopsIndex);

      // Functions should come before Recursion
      expect(functionsIndex).toBeLessThan(recursionIndex);
    });

    it('returns all concepts even if some have no relationships', async () => {
      const projectId = 'project-123';

      // Only one relationship
      const relationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-1',
          to_concept_id: 'concept-2',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: relationships,
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: sampleConcepts,
            error: null,
          }),
        }),
      });

      const sortedConcepts = await service.getTopologicalOrder(projectId);

      // All 4 concepts should be returned
      expect(sortedConcepts).toHaveLength(4);
    });

    it('throws error when circular dependency exists', async () => {
      const projectId = 'project-123';

      // Circular: A -> B -> A
      const circularRelationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-a',
          to_concept_id: 'concept-b',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-b',
          to_concept_id: 'concept-a',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const circularConcepts: Concept[] = [
        { ...sampleConcepts[0], id: 'concept-a', name: 'A' },
        { ...sampleConcepts[1], id: 'concept-b', name: 'B' },
      ];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: circularRelationships,
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: circularConcepts,
            error: null,
          }),
        }),
      });

      await expect(service.getTopologicalOrder(projectId)).rejects.toThrow(
        /circular/i
      );
    });

    it('returns concepts in any valid order when no relationships exist', async () => {
      const projectId = 'project-123';

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: sampleConcepts,
            error: null,
          }),
        }),
      });

      const sortedConcepts = await service.getTopologicalOrder(projectId);

      // All concepts should be returned (order doesn't matter when no relationships)
      expect(sortedConcepts).toHaveLength(4);
      expect(sortedConcepts.map(c => c.id).sort()).toEqual(
        sampleConcepts.map(c => c.id).sort()
      );
    });
  });

  describe('Prerequisites traversal', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('returns direct prerequisites for a concept', async () => {
      const conceptId = 'concept-4'; // Recursion

      // Relationships where concept-4 is the target
      const relationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: 'project-123',
          from_concept_id: 'concept-2', // Functions
          to_concept_id: 'concept-4',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: 'project-123',
          from_concept_id: 'concept-3', // Loops (as contrasts_with, not prerequisite)
          to_concept_id: 'concept-4',
          relationship_type: 'contrasts_with',
          strength: 0.7,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const prerequisiteConcept = sampleConcepts.find(c => c.id === 'concept-2')!;

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: relationships.filter(r => r.relationship_type === 'prerequisite'),
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [prerequisiteConcept],
            error: null,
          }),
        }),
      });

      const prerequisites = await service.getPrerequisites(conceptId);

      expect(prerequisites).toHaveLength(1);
      expect(prerequisites[0].name).toBe('Functions');
    });

    it('returns empty array for concept with no prerequisites', async () => {
      const conceptId = 'concept-1'; // Variables (no prerequisites)

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const prerequisites = await service.getPrerequisites(conceptId);

      expect(prerequisites).toEqual([]);
    });
  });

  describe('Dependents traversal', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('returns concepts that depend on this concept', async () => {
      const conceptId = 'concept-1'; // Variables

      // Relationships where concept-1 is the source
      const relationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: 'project-123',
          from_concept_id: 'concept-1',
          to_concept_id: 'concept-2', // Functions
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: 'project-123',
          from_concept_id: 'concept-1',
          to_concept_id: 'concept-3', // Loops
          relationship_type: 'prerequisite',
          strength: 0.8,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const dependentConcepts = sampleConcepts.filter(c =>
        ['concept-2', 'concept-3'].includes(c.id)
      );

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: relationships,
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: dependentConcepts,
            error: null,
          }),
        }),
      });

      const dependents = await service.getDependents(conceptId);

      expect(dependents).toHaveLength(2);
      expect(dependents.map(d => d.name).sort()).toEqual(['Functions', 'Loops']);
    });

    it('returns empty array for concept with no dependents', async () => {
      const conceptId = 'concept-4'; // Recursion (nothing depends on it)

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const dependents = await service.getDependents(conceptId);

      expect(dependents).toEqual([]);
    });
  });

  describe('getProjectRelationships', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('returns all relationships for a project', async () => {
      const projectId = 'project-123';

      const mockRelationships: ConceptRelationship[] = [
        {
          id: 'rel-1',
          project_id: projectId,
          from_concept_id: 'concept-1',
          to_concept_id: 'concept-2',
          relationship_type: 'prerequisite',
          strength: 0.9,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          project_id: projectId,
          from_concept_id: 'concept-2',
          to_concept_id: 'concept-3',
          relationship_type: 'causal',
          strength: 0.7,
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockRelationships,
            error: null,
          }),
        }),
      });

      const relationships = await service.getProjectRelationships(projectId);

      expect(relationships).toHaveLength(2);
      expect(relationships[0].relationship_type).toBe('prerequisite');
      expect(relationships[1].relationship_type).toBe('causal');
    });

    it('returns empty array for project with no relationships', async () => {
      const projectId = 'project-empty';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const relationships = await service.getProjectRelationships(projectId);

      expect(relationships).toEqual([]);
    });
  });

  describe('Error handling', () => {
    let service: KnowledgeGraphService;

    beforeEach(() => {
      service = createKnowledgeGraphService(mockSupabase);
    });

    it('handles AI service failures', async () => {
      const projectId = 'project-123';

      configureMock({
        shouldError: true,
        errorToThrow: new AIError('AI service failed', 'SERVER_ERROR'),
      });

      await expect(
        service.buildKnowledgeGraph(projectId, sampleConcepts)
      ).rejects.toThrow(KnowledgeGraphError);
    });

    it('handles database insert errors', async () => {
      const projectId = 'project-123';

      configureMock({
        customStructuredResponses: new Map([
          ['Variables', sampleIdentifiedRelationships],
        ]),
      });

      mockFrom.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database insert failed' },
          }),
        }),
      });

      await expect(
        service.buildKnowledgeGraph(projectId, sampleConcepts)
      ).rejects.toThrow(KnowledgeGraphError);
    });

    it('handles database query errors in getProjectRelationships', async () => {
      const projectId = 'project-123';

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database query failed' },
          }),
        }),
      });

      await expect(service.getProjectRelationships(projectId)).rejects.toThrow(
        KnowledgeGraphError
      );
    });
  });

  describe('validateIdentifiedRelationship', () => {
    it('validates from_concept_name is non-empty', () => {
      const invalidRelationship: IdentifiedRelationship = {
        from_concept_name: '',
        to_concept_name: 'B',
        relationship_type: 'prerequisite',
        strength: 0.8,
      };

      expect(() => validateIdentifiedRelationship(invalidRelationship)).toThrow(
        KnowledgeGraphError
      );
    });

    it('validates to_concept_name is non-empty', () => {
      const invalidRelationship: IdentifiedRelationship = {
        from_concept_name: 'A',
        to_concept_name: '',
        relationship_type: 'prerequisite',
        strength: 0.8,
      };

      expect(() => validateIdentifiedRelationship(invalidRelationship)).toThrow(
        KnowledgeGraphError
      );
    });
  });

  describe('KnowledgeGraphError', () => {
    it('includes error code and message', () => {
      const error = new KnowledgeGraphError('Test error', 'GRAPH_BUILD_FAILED');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GRAPH_BUILD_FAILED');
      expect(error.name).toBe('KnowledgeGraphError');
    });

    it('includes optional details', () => {
      const error = new KnowledgeGraphError(
        'Test error',
        'GRAPH_BUILD_FAILED',
        {
          projectId: 'project-123',
        }
      );

      expect(error.details).toEqual({
        projectId: 'project-123',
      });
    });
  });
});
