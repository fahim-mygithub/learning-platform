/**
 * Roadmap Generation Service Tests
 *
 * Tests for generating sequenced learning paths from knowledge graphs.
 * Includes tests for:
 * - Generate roadmap from concepts
 * - Level 1 has concepts with no prerequisites
 * - Subsequent levels respect prerequisite order
 * - Time estimates calculated correctly
 * - Mastery gates created after each level
 * - Roadmap stored in database
 * - Get roadmap returns null for non-existent
 * - Status updates work correctly
 * - Handles empty project (no concepts)
 * - Handles single concept project
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Concept,
  ConceptRelationship,
  Roadmap,
  RoadmapLevel,
  MasteryGate,
  RoadmapStatus,
  CognitiveType,
} from '@/src/types/database';

// Import mock functions for knowledge graph service
import {
  configureMock as configureKnowledgeGraphMock,
  resetMock as resetKnowledgeGraphMock,
  clearMockCallHistory as clearKnowledgeGraphCallHistory,
} from '../__mocks__/knowledge-graph-service';

// Mock the knowledge graph service module
jest.mock('../knowledge-graph-service', () =>
  require('../__mocks__/knowledge-graph-service')
);

// Import after mocking
import {
  createRoadmapGenerationService,
  RoadmapGenerationService,
  RoadmapGenerationError,
  calculateConceptTime,
  DIFFICULTY_BASE_TIME,
  COGNITIVE_TYPE_MODIFIER,
} from '../roadmap-generation';

describe('Roadmap Generation Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  // Sample test data
  const projectId = 'project-123';

  // Sample concepts with varying difficulties and cognitive types
  const sampleConcepts: Concept[] = [
    {
      id: 'concept-1',
      project_id: projectId,
      source_id: 'source-456',
      name: 'Variables',
      definition: 'Named storage locations in memory.',
      key_points: ['Store data', 'Have types'],
      cognitive_type: 'declarative',
      difficulty: 2, // Easy
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-2',
      project_id: projectId,
      source_id: 'source-456',
      name: 'Functions',
      definition: 'Reusable blocks of code.',
      key_points: ['Accept parameters', 'Return values'],
      cognitive_type: 'procedural',
      difficulty: 5, // Medium
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-3',
      project_id: projectId,
      source_id: 'source-456',
      name: 'Loops',
      definition: 'Control structures that repeat code.',
      key_points: ['Iteration', 'For loops'],
      cognitive_type: 'procedural',
      difficulty: 4, // Medium
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-4',
      project_id: projectId,
      source_id: 'source-456',
      name: 'Recursion',
      definition: 'A function that calls itself.',
      key_points: ['Self-reference', 'Base case'],
      cognitive_type: 'conditional',
      difficulty: 8, // Hard
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Concepts in topological order: Variables -> Functions, Loops -> Recursion
  // Variables has no prerequisites (Level 1)
  // Functions and Loops depend on Variables (Level 2)
  // Recursion depends on Functions (Level 3)
  const topologicalOrder: Concept[] = [
    sampleConcepts[0], // Variables
    sampleConcepts[1], // Functions
    sampleConcepts[2], // Loops
    sampleConcepts[3], // Recursion
  ];

  // Sample relationships
  const sampleRelationships: ConceptRelationship[] = [
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
      from_concept_id: 'concept-1', // Variables
      to_concept_id: 'concept-3', // Loops
      relationship_type: 'prerequisite',
      strength: 0.8,
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'rel-3',
      project_id: projectId,
      from_concept_id: 'concept-2', // Functions
      to_concept_id: 'concept-4', // Recursion
      relationship_type: 'prerequisite',
      strength: 0.95,
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    resetKnowledgeGraphMock();
    clearKnowledgeGraphCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
    mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;

    // Configure knowledge graph mock with default topological order
    configureKnowledgeGraphMock({
      customTopologicalOrder: topologicalOrder,
      defaultRelationships: sampleRelationships,
    });
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createRoadmapGenerationService', () => {
    it('creates service with valid configuration', () => {
      const service = createRoadmapGenerationService(mockSupabase);

      expect(service).toBeDefined();
      expect(service.generateRoadmap).toBeDefined();
      expect(service.getRoadmap).toBeDefined();
      expect(service.updateRoadmapStatus).toBeDefined();
      expect(service.recalculateEstimates).toBeDefined();
    });

    it('throws error when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createRoadmapGenerationService(mockSupabase)).toThrow(
        RoadmapGenerationError
      );
      expect(() => createRoadmapGenerationService(mockSupabase)).toThrow(
        'API key'
      );
    });
  });

  describe('generateRoadmap', () => {
    let service: RoadmapGenerationService;

    beforeEach(() => {
      service = createRoadmapGenerationService(mockSupabase);
    });

    it('generates roadmap from concepts', async () => {
      const mockRoadmap: Roadmap = {
        id: 'roadmap-1',
        project_id: projectId,
        title: 'Learning Path',
        description: null,
        levels: [],
        total_estimated_minutes: 60,
        mastery_gates: [],
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockRoadmap,
              error: null,
            }),
          }),
        }),
      });

      const roadmap = await service.generateRoadmap(projectId, 'Learning Path');

      expect(roadmap).toBeDefined();
      expect(roadmap.project_id).toBe(projectId);
      expect(roadmap.title).toBe('Learning Path');
    });

    it('Level 1 has concepts with no prerequisites', async () => {
      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      await service.generateRoadmap(projectId);

      expect(insertedData).toBeDefined();
      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      const levels = (roadmapData as Record<string, unknown>).levels as RoadmapLevel[];

      // Level 1 should contain only Variables (no prerequisites)
      expect(levels[0].level).toBe(1);
      expect(levels[0].concept_ids).toContain('concept-1'); // Variables
      expect(levels[0].concept_ids).not.toContain('concept-2'); // Functions has prereq
      expect(levels[0].concept_ids).not.toContain('concept-3'); // Loops has prereq
      expect(levels[0].concept_ids).not.toContain('concept-4'); // Recursion has prereq
    });

    it('subsequent levels respect prerequisite order', async () => {
      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      await service.generateRoadmap(projectId);

      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      const levels = (roadmapData as Record<string, unknown>).levels as RoadmapLevel[];

      // Variables (Level 1) should come before Functions and Loops (Level 2)
      // Functions (Level 2) should come before Recursion (Level 3)
      const level1ConceptIds = levels[0].concept_ids;
      const level2ConceptIds = levels[1]?.concept_ids || [];
      const level3ConceptIds = levels[2]?.concept_ids || [];

      // Variables should be in Level 1
      expect(level1ConceptIds).toContain('concept-1');

      // Functions and Loops should be in Level 2
      expect(level2ConceptIds).toContain('concept-2');
      expect(level2ConceptIds).toContain('concept-3');

      // Recursion should be in Level 3
      expect(level3ConceptIds).toContain('concept-4');
    });

    it('time estimates calculated correctly by difficulty', async () => {
      // Test with concepts of different difficulties
      // difficulty 2 (declarative) = 5 * 1.0 = 5 min
      // difficulty 5 (procedural) = 10 * 1.5 = 15 min
      // difficulty 4 (procedural) = 10 * 1.5 = 15 min
      // difficulty 8 (conditional) = 15 * 1.3 = 19.5 min (rounds to 20)
      // Total should be around 55 min

      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      await service.generateRoadmap(projectId);

      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      const totalMinutes = (roadmapData as Record<string, unknown>)
        .total_estimated_minutes as number;

      // Total should be sum of all concept times
      expect(totalMinutes).toBeGreaterThan(0);
      expect(totalMinutes).toBe(55); // 5 + 15 + 15 + 20
    });

    it('mastery gates created after each level', async () => {
      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      await service.generateRoadmap(projectId);

      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      const levels = (roadmapData as Record<string, unknown>).levels as RoadmapLevel[];
      const masteryGates = (roadmapData as Record<string, unknown>)
        .mastery_gates as MasteryGate[];

      // Should have one gate after each level
      expect(masteryGates).toHaveLength(levels.length);

      // Each gate should have correct structure
      masteryGates.forEach((gate, index) => {
        expect(gate.after_level).toBe(index + 1);
        expect(gate.required_score).toBe(0.8); // 80% mastery required
        expect(gate.quiz_concept_ids).toEqual(levels[index].concept_ids);
      });
    });

    it('roadmap stored in database', async () => {
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'roadmap-1',
              project_id: projectId,
              title: 'Test Roadmap',
              description: null,
              levels: [],
              total_estimated_minutes: 60,
              mastery_gates: [],
              status: 'draft',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValue({
        insert: insertMock,
      });

      await service.generateRoadmap(projectId, 'Test Roadmap');

      expect(mockFrom).toHaveBeenCalledWith('roadmaps');
      expect(insertMock).toHaveBeenCalled();
    });

    it('handles empty project (no concepts)', async () => {
      // Configure mock to return empty topological order
      configureKnowledgeGraphMock({
        customTopologicalOrder: [],
        defaultRelationships: [],
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'roadmap-1',
                project_id: projectId,
                title: 'Empty Roadmap',
                description: null,
                levels: [],
                total_estimated_minutes: 0,
                mastery_gates: [],
                status: 'draft',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      const roadmap = await service.generateRoadmap(projectId, 'Empty Roadmap');

      expect(roadmap.levels).toEqual([]);
      expect(roadmap.mastery_gates).toEqual([]);
      expect(roadmap.total_estimated_minutes).toBe(0);
    });

    it('handles single concept project', async () => {
      const singleConcept = [sampleConcepts[0]]; // Just Variables

      configureKnowledgeGraphMock({
        customTopologicalOrder: singleConcept,
        defaultRelationships: [],
      });

      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      const roadmap = await service.generateRoadmap(projectId);

      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      const levels = (roadmapData as Record<string, unknown>).levels as RoadmapLevel[];

      expect(levels).toHaveLength(1);
      expect(levels[0].concept_ids).toContain('concept-1');
    });

    it('uses default title when not provided', async () => {
      let insertedData: unknown = null;

      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation((data: unknown) => {
          insertedData = data;
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'roadmap-1',
                  ...((Array.isArray(data) ? data[0] : data) as object),
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        }),
      });

      await service.generateRoadmap(projectId);

      const roadmapData = Array.isArray(insertedData)
        ? insertedData[0]
        : insertedData;
      expect((roadmapData as Record<string, unknown>).title).toBe('Learning Roadmap');
    });
  });

  describe('getRoadmap', () => {
    let service: RoadmapGenerationService;

    beforeEach(() => {
      service = createRoadmapGenerationService(mockSupabase);
    });

    it('returns roadmap for existing project', async () => {
      const mockRoadmap: Roadmap = {
        id: 'roadmap-1',
        project_id: projectId,
        title: 'Test Roadmap',
        description: null,
        levels: [],
        total_estimated_minutes: 60,
        mastery_gates: [],
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockRoadmap,
              error: null,
            }),
          }),
        }),
      });

      const roadmap = await service.getRoadmap(projectId);

      expect(roadmap).toBeDefined();
      expect(roadmap?.id).toBe('roadmap-1');
      expect(roadmap?.project_id).toBe(projectId);
    });

    it('returns null for non-existent project', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      });

      const roadmap = await service.getRoadmap('non-existent-project');

      expect(roadmap).toBeNull();
    });
  });

  describe('updateRoadmapStatus', () => {
    let service: RoadmapGenerationService;

    beforeEach(() => {
      service = createRoadmapGenerationService(mockSupabase);
    });

    it('updates roadmap status correctly', async () => {
      const roadmapId = 'roadmap-1';
      const newStatus: RoadmapStatus = 'active';

      const updatedRoadmap: Roadmap = {
        id: roadmapId,
        project_id: projectId,
        title: 'Test Roadmap',
        description: null,
        levels: [],
        total_estimated_minutes: 60,
        mastery_gates: [],
        status: newStatus,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedRoadmap,
                error: null,
              }),
            }),
          }),
        }),
      });

      const roadmap = await service.updateRoadmapStatus(roadmapId, newStatus);

      expect(roadmap.status).toBe('active');
    });

    it('throws error for non-existent roadmap', async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Roadmap not found' },
              }),
            }),
          }),
        }),
      });

      await expect(
        service.updateRoadmapStatus('non-existent', 'active')
      ).rejects.toThrow(RoadmapGenerationError);
    });

    it('status can be updated to any valid status', async () => {
      const statuses: RoadmapStatus[] = ['draft', 'active', 'completed'];

      for (const status of statuses) {
        const updatedRoadmap: Roadmap = {
          id: 'roadmap-1',
          project_id: projectId,
          title: 'Test',
          description: null,
          levels: [],
          total_estimated_minutes: 0,
          mastery_gates: [],
          status: status,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        mockFrom.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedRoadmap,
                  error: null,
                }),
              }),
            }),
          }),
        });

        const roadmap = await service.updateRoadmapStatus('roadmap-1', status);
        expect(roadmap.status).toBe(status);
      }
    });
  });

  describe('recalculateEstimates', () => {
    let service: RoadmapGenerationService;

    beforeEach(() => {
      service = createRoadmapGenerationService(mockSupabase);
    });

    it('recalculates time estimates for roadmap', async () => {
      const existingRoadmap: Roadmap = {
        id: 'roadmap-1',
        project_id: projectId,
        title: 'Test Roadmap',
        description: null,
        levels: [
          { level: 1, title: 'Basics', concept_ids: ['concept-1'], estimated_minutes: 0 },
          {
            level: 2,
            title: 'Intermediate',
            concept_ids: ['concept-2', 'concept-3'],
            estimated_minutes: 0,
          },
          { level: 3, title: 'Advanced', concept_ids: ['concept-4'], estimated_minutes: 0 },
        ],
        total_estimated_minutes: 0,
        mastery_gates: [],
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // First call to get the existing roadmap
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingRoadmap,
              error: null,
            }),
          }),
        }),
      });

      // Second call to get concepts
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: sampleConcepts,
            error: null,
          }),
        }),
      });

      // Third call to update the roadmap
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...existingRoadmap,
                  total_estimated_minutes: 55,
                  levels: [
                    { level: 1, title: 'Basics', concept_ids: ['concept-1'], estimated_minutes: 5 },
                    {
                      level: 2,
                      title: 'Intermediate',
                      concept_ids: ['concept-2', 'concept-3'],
                      estimated_minutes: 30,
                    },
                    { level: 3, title: 'Advanced', concept_ids: ['concept-4'], estimated_minutes: 20 },
                  ],
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const roadmap = await service.recalculateEstimates('roadmap-1');

      expect(roadmap.total_estimated_minutes).toBeGreaterThan(0);
      expect(roadmap.levels[0].estimated_minutes).toBeGreaterThan(0);
    });

    it('throws error for non-existent roadmap', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      await expect(
        service.recalculateEstimates('non-existent')
      ).rejects.toThrow(RoadmapGenerationError);
    });
  });

  describe('calculateConceptTime', () => {
    it('calculates time for difficulty 1-3 (base 5 min)', () => {
      const concept: Concept = {
        ...sampleConcepts[0],
        difficulty: 2,
        cognitive_type: 'declarative',
      };

      const time = calculateConceptTime(concept);

      // difficulty 2 -> base 5 min, declarative -> 1.0x modifier
      expect(time).toBe(5);
    });

    it('calculates time for difficulty 4-6 (base 10 min)', () => {
      const concept: Concept = {
        ...sampleConcepts[0],
        difficulty: 5,
        cognitive_type: 'declarative',
      };

      const time = calculateConceptTime(concept);

      // difficulty 5 -> base 10 min, declarative -> 1.0x modifier
      expect(time).toBe(10);
    });

    it('calculates time for difficulty 7-8 (base 15 min)', () => {
      const concept: Concept = {
        ...sampleConcepts[0],
        difficulty: 7,
        cognitive_type: 'declarative',
      };

      const time = calculateConceptTime(concept);

      // difficulty 7 -> base 15 min, declarative -> 1.0x modifier
      expect(time).toBe(15);
    });

    it('calculates time for difficulty 9-10 (base 20 min)', () => {
      const concept: Concept = {
        ...sampleConcepts[0],
        difficulty: 10,
        cognitive_type: 'declarative',
      };

      const time = calculateConceptTime(concept);

      // difficulty 10 -> base 20 min, declarative -> 1.0x modifier
      expect(time).toBe(20);
    });

    it('applies cognitive type modifiers correctly', () => {
      const baseConcept = { ...sampleConcepts[0], difficulty: 5 }; // base 10 min

      const declarative = calculateConceptTime({
        ...baseConcept,
        cognitive_type: 'declarative',
      });
      const conceptual = calculateConceptTime({
        ...baseConcept,
        cognitive_type: 'conceptual',
      });
      const procedural = calculateConceptTime({
        ...baseConcept,
        cognitive_type: 'procedural',
      });
      const conditional = calculateConceptTime({
        ...baseConcept,
        cognitive_type: 'conditional',
      });
      const metacognitive = calculateConceptTime({
        ...baseConcept,
        cognitive_type: 'metacognitive',
      });

      expect(declarative).toBe(10); // 10 * 1.0
      expect(conceptual).toBe(12); // 10 * 1.2
      expect(procedural).toBe(15); // 10 * 1.5
      expect(conditional).toBe(13); // 10 * 1.3
      expect(metacognitive).toBe(14); // 10 * 1.4
    });

    it('handles null difficulty (defaults to medium)', () => {
      const concept: Concept = {
        ...sampleConcepts[0],
        difficulty: null,
        cognitive_type: 'declarative',
      };

      const time = calculateConceptTime(concept);

      // null difficulty defaults to 5 (medium), base 10 min
      expect(time).toBe(10);
    });
  });

  describe('Time estimation constants', () => {
    it('DIFFICULTY_BASE_TIME has correct values', () => {
      expect(DIFFICULTY_BASE_TIME).toEqual({
        easy: 5,
        medium: 10,
        hard: 15,
        expert: 20,
      });
    });

    it('COGNITIVE_TYPE_MODIFIER has correct values', () => {
      expect(COGNITIVE_TYPE_MODIFIER).toEqual({
        declarative: 1.0,
        conceptual: 1.2,
        procedural: 1.5,
        conditional: 1.3,
        metacognitive: 1.4,
      });
    });
  });

  describe('RoadmapGenerationError', () => {
    it('includes error code and message', () => {
      const error = new RoadmapGenerationError(
        'Test error',
        'GENERATION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('GENERATION_FAILED');
      expect(error.name).toBe('RoadmapGenerationError');
    });

    it('includes optional details', () => {
      const error = new RoadmapGenerationError(
        'Test error',
        'DATABASE_ERROR',
        { projectId: 'project-123' }
      );

      expect(error.details).toEqual({ projectId: 'project-123' });
    });
  });

  describe('Error handling', () => {
    let service: RoadmapGenerationService;

    beforeEach(() => {
      service = createRoadmapGenerationService(mockSupabase);
    });

    it('handles knowledge graph service errors', async () => {
      configureKnowledgeGraphMock({
        shouldError: true,
      });

      await expect(service.generateRoadmap(projectId)).rejects.toThrow(
        RoadmapGenerationError
      );
    });

    it('handles database insert errors', async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database insert failed' },
            }),
          }),
        }),
      });

      await expect(service.generateRoadmap(projectId)).rejects.toThrow(
        RoadmapGenerationError
      );
    });
  });
});
