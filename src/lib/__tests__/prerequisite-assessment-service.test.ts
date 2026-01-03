/**
 * Prerequisite Assessment Service Tests
 *
 * Tests for detecting prerequisites from mentioned_only concepts and AI inference.
 * Includes tests for:
 * - Extracting mentioned_only concepts as prerequisites
 * - AI-inferred domain prerequisites
 * - Deduplication with mentioned_only precedence
 * - Database storage
 * - Error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Concept } from '@/src/types/database';
import {
  Prerequisite,
  PrerequisiteInsert,
  PretestQuestion,
  MiniLesson,
} from '@/src/types/prerequisite';
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
  createPrerequisiteAssessmentService,
  PrerequisiteAssessmentService,
  PrerequisiteAssessmentError,
  InferredPrerequisite,
  deduplicatePrerequisites,
  GeneratedPretestQuestion,
  GeneratedMiniLesson,
  PretestResponseInput,
} from '../prerequisite-assessment-service';

describe('Prerequisite Assessment Service', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockInsert: jest.Mock;
  let mockIn: jest.Mock;
  let mockDelete: jest.Mock;

  // Sample test data
  const projectId = 'project-123';

  const sampleMentionedOnlyConcepts: Concept[] = [
    {
      id: 'concept-1',
      project_id: projectId,
      source_id: 'source-456',
      name: 'useState Hook',
      definition: 'React hook for state management',
      key_points: ['State management', 'Functional components'],
      cognitive_type: 'procedural',
      difficulty: 3,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      mentioned_only: true,
    },
    {
      id: 'concept-2',
      project_id: projectId,
      source_id: 'source-456',
      name: 'JavaScript Basics',
      definition: 'Fundamental JavaScript concepts',
      key_points: ['Variables', 'Functions'],
      cognitive_type: 'declarative',
      difficulty: 2,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      mentioned_only: true,
    },
  ];

  const sampleAIInferredPrerequisites: InferredPrerequisite[] = [
    {
      name: 'HTML Fundamentals',
      description: 'Understanding of HTML structure and elements',
      domain: 'web development',
      confidence: 0.9,
    },
    {
      name: 'CSS Basics',
      description: 'Knowledge of CSS styling and selectors',
      domain: 'web development',
      confidence: 0.85,
    },
    {
      name: 'JavaScript Basics', // Duplicate with mentioned_only
      description: 'Basic JavaScript programming',
      domain: 'programming',
      confidence: 0.8,
    },
  ];

  // Sample prerequisites for pretest generation tests
  const samplePrerequisites: Prerequisite[] = [
    {
      id: 'prereq-1',
      project_id: projectId,
      name: 'React Basics',
      description: 'Understanding of React fundamentals',
      source: 'mentioned_only',
      confidence: 1.0,
      domain: 'web development',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'prereq-2',
      project_id: projectId,
      name: 'JavaScript ES6',
      description: 'Modern JavaScript features',
      source: 'ai_inferred',
      confidence: 0.9,
      domain: 'programming',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Sample AI-generated question
  const sampleGeneratedQuestion: GeneratedPretestQuestion = {
    question: 'What is the purpose of the useState hook in React?',
    correct_answer: 'To manage component state in functional components',
    distractors: [
      'To define CSS styles',
      'To make HTTP requests',
      'To navigate between pages',
    ],
    explanation: 'useState is a React hook that allows functional components to maintain state.',
  };

  // Sample stored pretest question
  const sampleStoredQuestion: PretestQuestion = {
    id: 'question-1',
    prerequisite_id: 'prereq-1',
    question_text: 'What is the purpose of the useState hook in React?',
    options: [
      'To manage component state in functional components',
      'To define CSS styles',
      'To make HTTP requests',
      'To navigate between pages',
    ],
    correct_index: 0,
    explanation: 'useState is a React hook that allows functional components to maintain state.',
    difficulty: 'basic',
    created_at: '2024-01-01T00:00:00Z',
  };

  // Sample AI-generated mini-lesson
  const sampleGeneratedMiniLesson: GeneratedMiniLesson = {
    title: 'Understanding React Basics',
    content: 'React is a JavaScript library for building user interfaces.\n\nIt uses a component-based architecture where you build encapsulated components that manage their own state.\n\nKey concepts include JSX, components, props, and state.',
    key_points: [
      'React uses a component-based architecture',
      'JSX allows you to write HTML-like syntax in JavaScript',
      'State and props are used for data management',
    ],
  };

  // Sample stored mini-lesson
  const sampleStoredMiniLesson: MiniLesson = {
    id: 'lesson-1',
    prerequisite_id: 'prereq-1',
    title: 'Understanding React Basics',
    content_markdown: 'React is a JavaScript library for building user interfaces.\n\nIt uses a component-based architecture where you build encapsulated components that manage their own state.\n\nKey concepts include JSX, components, props, and state.',
    key_points: [
      'React uses a component-based architecture',
      'JSX allows you to write HTML-like syntax in JavaScript',
      'State and props are used for data management',
    ],
    estimated_minutes: 2,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMock();
    clearMockCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

    // Set up Supabase mock chain
    mockOrder = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockIn = jest.fn().mockResolvedValue({ data: [], error: null });
    mockEq = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: mockOrder,
    });
    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
    });
    mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  });

  describe('createPrerequisiteAssessmentService', () => {
    it('creates service with valid configuration', () => {
      const service = createPrerequisiteAssessmentService(mockSupabase);

      expect(service).toBeDefined();
      expect(service.detectPrerequisites).toBeDefined();
      expect(service.extractMentionedOnlyPrerequisites).toBeDefined();
      expect(service.inferDomainPrerequisites).toBeDefined();
      expect(service.getPrerequisites).toBeDefined();
      expect(service.clearPrerequisites).toBeDefined();
    });

    it('throws error when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createPrerequisiteAssessmentService(mockSupabase)).toThrow(
        PrerequisiteAssessmentError
      );
      expect(() => createPrerequisiteAssessmentService(mockSupabase)).toThrow(
        'API key'
      );
    });
  });

  describe('extractMentionedOnlyPrerequisites', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('extracts mentioned_only concepts as prerequisites', async () => {
      // Mock the concepts query to return mentioned_only concepts
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: sampleMentionedOnlyConcepts,
              error: null,
            }),
          }),
        }),
      });

      const prerequisites = await service.extractMentionedOnlyPrerequisites(
        projectId
      );

      expect(prerequisites).toHaveLength(2);
      expect(prerequisites[0].name).toBe('useState Hook');
      expect(prerequisites[0].source).toBe('mentioned_only');
      expect(prerequisites[0].confidence).toBe(1.0);
      expect(prerequisites[1].name).toBe('JavaScript Basics');
    });

    it('sets source to mentioned_only for all extracted prerequisites', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: sampleMentionedOnlyConcepts,
              error: null,
            }),
          }),
        }),
      });

      const prerequisites = await service.extractMentionedOnlyPrerequisites(
        projectId
      );

      for (const prereq of prerequisites) {
        expect(prereq.source).toBe('mentioned_only');
      }
    });

    it('sets confidence to 1.0 for mentioned_only prerequisites', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: sampleMentionedOnlyConcepts,
              error: null,
            }),
          }),
        }),
      });

      const prerequisites = await service.extractMentionedOnlyPrerequisites(
        projectId
      );

      for (const prereq of prerequisites) {
        expect(prereq.confidence).toBe(1.0);
      }
    });

    it('returns empty array when no mentioned_only concepts exist', async () => {
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

      const prerequisites = await service.extractMentionedOnlyPrerequisites(
        projectId
      );

      expect(prerequisites).toEqual([]);
    });

    it('handles database errors gracefully', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(
        service.extractMentionedOnlyPrerequisites(projectId)
      ).rejects.toThrow(PrerequisiteAssessmentError);
    });
  });

  describe('inferDomainPrerequisites', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('infers prerequisites from source content using AI', async () => {
      const content = 'This is content about Advanced React Patterns...';

      // Configure mock to return AI-inferred prerequisites
      configureMock({
        customStructuredResponses: new Map([
          ['content', sampleAIInferredPrerequisites],
        ]),
      });

      const prerequisites = await service.inferDomainPrerequisites(
        projectId,
        content
      );

      expect(prerequisites).toHaveLength(3);
      expect(prerequisites[0].name).toBe('HTML Fundamentals');
      expect(prerequisites[0].source).toBe('ai_inferred');
      expect(prerequisites[0].confidence).toBe(0.9);
    });

    it('sets source to ai_inferred for all AI prerequisites', async () => {
      const content = 'This is content about Advanced React Patterns...';

      configureMock({
        customStructuredResponses: new Map([
          ['content', sampleAIInferredPrerequisites],
        ]),
      });

      const prerequisites = await service.inferDomainPrerequisites(
        projectId,
        content
      );

      for (const prereq of prerequisites) {
        expect(prereq.source).toBe('ai_inferred');
      }
    });

    it('filters out prerequisites with confidence below 0.3', async () => {
      const content = 'This is content about Advanced React Patterns...';

      const lowConfidencePrereqs: InferredPrerequisite[] = [
        {
          name: 'High Confidence',
          description: 'Important prerequisite',
          confidence: 0.9,
        },
        {
          name: 'Low Confidence',
          description: 'Maybe prerequisite',
          confidence: 0.2,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([
          ['content', lowConfidencePrereqs],
        ]),
      });

      const prerequisites = await service.inferDomainPrerequisites(
        projectId,
        content
      );

      expect(prerequisites).toHaveLength(1);
      expect(prerequisites[0].name).toBe('High Confidence');
    });

    it('normalizes confidence values to 0-1 range', async () => {
      const content = 'This is content about Advanced React Patterns...';

      const outOfRangePrereqs: InferredPrerequisite[] = [
        {
          name: 'Over 1',
          description: 'Confidence over 1',
          confidence: 1.5,
        },
        {
          name: 'Negative',
          description: 'Negative confidence',
          confidence: -0.5,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([['content', outOfRangePrereqs]]),
      });

      const prerequisites = await service.inferDomainPrerequisites(
        projectId,
        content
      );

      // Only the one with normalized confidence >= 0.3 should be included
      expect(prerequisites).toHaveLength(1);
      expect(prerequisites[0].confidence).toBe(1.0); // Clamped to max
    });

    it('returns empty array for empty content', async () => {
      const prerequisites = await service.inferDomainPrerequisites(
        projectId,
        ''
      );

      expect(prerequisites).toEqual([]);
    });

    it('handles AI service failures', async () => {
      const content = 'This is content about Advanced React Patterns...';

      configureMock({
        shouldError: true,
        errorToThrow: new AIError('AI service failed', 'SERVER_ERROR'),
      });

      await expect(
        service.inferDomainPrerequisites(projectId, content)
      ).rejects.toThrow(PrerequisiteAssessmentError);
    });

    it('sends correct prompt to AI with content context', async () => {
      const content = 'This is content about Advanced React Patterns...';

      configureMock({
        customStructuredResponses: new Map([
          ['content', sampleAIInferredPrerequisites],
        ]),
      });

      await service.inferDomainPrerequisites(projectId, content);

      const callHistory = getMockCallHistory();
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].message.systemPrompt).toContain('prerequisite');
      expect(callHistory[0].message.userMessage).toContain('content');
    });
  });

  describe('deduplicatePrerequisites', () => {
    it('removes duplicates by name', () => {
      const mentionedOnly: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'JavaScript Basics',
          description: 'From mentioned_only',
          source: 'mentioned_only',
          confidence: 1.0,
        },
      ];

      const aiInferred: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'JavaScript Basics', // Duplicate
          description: 'From AI',
          source: 'ai_inferred',
          confidence: 0.8,
        },
        {
          project_id: projectId,
          name: 'HTML Basics',
          description: 'From AI',
          source: 'ai_inferred',
          confidence: 0.85,
        },
      ];

      const result = deduplicatePrerequisites(mentionedOnly, aiInferred);

      expect(result).toHaveLength(2);
      // JavaScript Basics should be from mentioned_only (takes precedence)
      const jsDuplicate = result.find((p) => p.name === 'JavaScript Basics');
      expect(jsDuplicate?.source).toBe('mentioned_only');
      expect(jsDuplicate?.description).toBe('From mentioned_only');
    });

    it('mentioned_only takes precedence over ai_inferred', () => {
      const mentionedOnly: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'React Hooks',
          description: 'Mentioned in source',
          source: 'mentioned_only',
          confidence: 1.0,
        },
      ];

      const aiInferred: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'react hooks', // Same name, different case
          description: 'AI inferred',
          source: 'ai_inferred',
          confidence: 0.9,
        },
      ];

      const result = deduplicatePrerequisites(mentionedOnly, aiInferred);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('mentioned_only');
    });

    it('handles case-insensitive matching', () => {
      const mentionedOnly: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'JavaScript',
          description: 'From mentioned',
          source: 'mentioned_only',
          confidence: 1.0,
        },
      ];

      const aiInferred: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'JAVASCRIPT',
          description: 'From AI',
          source: 'ai_inferred',
          confidence: 0.8,
        },
      ];

      const result = deduplicatePrerequisites(mentionedOnly, aiInferred);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('mentioned_only');
    });

    it('preserves all unique prerequisites from both sources', () => {
      const mentionedOnly: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'React',
          description: 'React framework',
          source: 'mentioned_only',
          confidence: 1.0,
        },
      ];

      const aiInferred: PrerequisiteInsert[] = [
        {
          project_id: projectId,
          name: 'TypeScript',
          description: 'TypeScript language',
          source: 'ai_inferred',
          confidence: 0.9,
        },
      ];

      const result = deduplicatePrerequisites(mentionedOnly, aiInferred);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.name).sort()).toEqual(['React', 'TypeScript']);
    });
  });

  describe('detectPrerequisites', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('combines prerequisites from both sources', async () => {
      // Setup mocks with proper chaining
      mockFrom.mockImplementation((table: string) => {
        if (table === 'concepts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: sampleMentionedOnlyConcepts,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sources') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'source-1', type: 'video' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'transcriptions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ full_text: 'Sample transcript about React patterns...' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      // Configure AI mock
      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleAIInferredPrerequisites],
        ]),
      });

      const result = await service.detectPrerequisites(projectId);

      expect(result.mentionedOnly).toHaveLength(2);
      expect(result.aiInferred).toHaveLength(3);
      // Combined should deduplicate "JavaScript Basics"
      expect(result.combined.length).toBeLessThanOrEqual(4);
    });

    it('stores combined prerequisites in database', async () => {
      // Setup mocks
      mockFrom.mockImplementation((table: string) => {
        if (table === 'concepts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: sampleMentionedOnlyConcepts,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sources') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            insert: mockInsert.mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'prereq-1',
                    project_id: projectId,
                    name: 'useState Hook',
                    source: 'mentioned_only',
                    confidence: 1.0,
                    created_at: '2024-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await service.detectPrerequisites(projectId);

      expect(mockInsert).toHaveBeenCalled();
      expect(result.stored).toHaveLength(1);
    });

    it('handles projects with no content', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'concepts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sources') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await service.detectPrerequisites(projectId);

      expect(result.mentionedOnly).toEqual([]);
      expect(result.aiInferred).toEqual([]);
      expect(result.combined).toEqual([]);
    });

    it('accepts optional source content parameter', async () => {
      const customContent = 'Custom content about machine learning...';

      mockFrom.mockImplementation((table: string) => {
        if (table === 'concepts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const mlPrereqs: InferredPrerequisite[] = [
        {
          name: 'Linear Algebra',
          description: 'Matrix operations',
          domain: 'mathematics',
          confidence: 0.95,
        },
      ];

      configureMock({
        customStructuredResponses: new Map([['machine learning', mlPrereqs]]),
      });

      const result = await service.detectPrerequisites(
        projectId,
        customContent
      );

      expect(result.aiInferred).toHaveLength(1);
      expect(result.aiInferred[0].name).toBe('Linear Algebra');
    });
  });

  describe('getPrerequisites', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('returns all prerequisites for a project', async () => {
      const mockPrerequisites: Prerequisite[] = [
        {
          id: 'prereq-1',
          project_id: projectId,
          name: 'JavaScript',
          description: 'JS basics',
          source: 'mentioned_only',
          confidence: 1.0,
          domain: 'programming',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'prereq-2',
          project_id: projectId,
          name: 'HTML',
          description: 'HTML basics',
          source: 'ai_inferred',
          confidence: 0.9,
          domain: 'web',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockPrerequisites,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.getPrerequisites(projectId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('JavaScript');
    });

    it('returns empty array when no prerequisites exist', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.getPrerequisites(projectId);

      expect(result).toEqual([]);
    });

    it('handles database errors', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      await expect(service.getPrerequisites(projectId)).rejects.toThrow(
        PrerequisiteAssessmentError
      );
    });
  });

  describe('clearPrerequisites', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('deletes all prerequisites for a project', async () => {
      const deleteEq = jest.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: deleteEq,
        }),
      });

      await service.clearPrerequisites(projectId);

      expect(mockFrom).toHaveBeenCalledWith('prerequisites');
      expect(deleteEq).toHaveBeenCalledWith('project_id', projectId);
    });

    it('handles database errors', async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Delete failed' },
          }),
        }),
      });

      await expect(service.clearPrerequisites(projectId)).rejects.toThrow(
        PrerequisiteAssessmentError
      );
    });
  });

  describe('PrerequisiteAssessmentError', () => {
    it('includes error code and message', () => {
      const error = new PrerequisiteAssessmentError(
        'Test error',
        'DETECTION_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('DETECTION_FAILED');
      expect(error.name).toBe('PrerequisiteAssessmentError');
    });

    it('includes optional details', () => {
      const error = new PrerequisiteAssessmentError(
        'Test error',
        'DATABASE_ERROR',
        { projectId: 'project-123' }
      );

      expect(error.details).toEqual({ projectId: 'project-123' });
    });
  });

  // ============================================================================
  // TASK 6B.1: generatePretestQuestions Tests
  // ============================================================================
  describe('generatePretestQuestions', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('generates one MC question per prerequisite', async () => {
      // Mock getPrerequisites to return sample prerequisites
      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: samplePrerequisites,
                    error: null,
                  }),
                }),
              }),
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }, // No existing question
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredQuestion,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'pretest_questions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // No existing question
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredQuestion,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      // Configure AI mock to return generated question for any content
      // Using default response since we call for each prerequisite
      configureMock({
        defaultStructuredResponse: sampleGeneratedQuestion,
      });

      const questions = await service.generatePretestQuestions(projectId);

      expect(questions).toHaveLength(2);
    });

    it('includes correct answer and 3 distractors', async () => {
      // Mock a single prerequisite
      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [samplePrerequisites[0]],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pretest_questions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredQuestion,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedQuestion],
        ]),
      });

      const questions = await service.generatePretestQuestions(projectId);

      expect(questions).toHaveLength(1);
      expect(questions[0].options).toHaveLength(4);
      expect(questions[0].correct_index).toBeGreaterThanOrEqual(0);
      expect(questions[0].correct_index).toBeLessThanOrEqual(3);
    });

    it('stores questions in pretest_questions table', async () => {
      const mockInsertFn = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: sampleStoredQuestion,
            error: null,
          }),
        }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [samplePrerequisites[0]],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pretest_questions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: mockInsertFn,
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedQuestion],
        ]),
      });

      await service.generatePretestQuestions(projectId);

      expect(mockInsertFn).toHaveBeenCalled();
    });

    it('throws error when no prerequisites found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      await expect(service.generatePretestQuestions(projectId)).rejects.toThrow(
        PrerequisiteAssessmentError
      );
      await expect(service.generatePretestQuestions(projectId)).rejects.toThrow(
        'No prerequisites found'
      );
    });

    it('returns existing question if already generated', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [samplePrerequisites[0]],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pretest_questions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredQuestion, // Existing question found
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const questions = await service.generatePretestQuestions(projectId);

      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe('question-1');
    });

    it('handles AI generation failure gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [samplePrerequisites[0]],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'pretest_questions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        shouldError: true,
        errorToThrow: new AIError('AI service failed', 'SERVER_ERROR'),
      });

      await expect(service.generatePretestQuestions(projectId)).rejects.toThrow(
        PrerequisiteAssessmentError
      );
    });
  });

  // ============================================================================
  // TASK 6B.2: analyzeGaps Tests
  // ============================================================================
  describe('analyzeGaps', () => {
    let service: PrerequisiteAssessmentService;
    const sessionId = 'session-123';

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('calculates correct/total ratio', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 0, correct_index: 0, is_correct: true },
        { question_id: 'q2', prerequisite_id: 'prereq-2', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [samplePrerequisites[1]],
            error: null,
          }),
        }),
      });

      const result = await service.analyzeGaps(sessionId, responses);

      expect(result.totalPrerequisites).toBe(2);
      expect(result.correct).toBe(1);
      expect(result.percentage).toBe(50);
    });

    it('returns proceed recommendation for 100% score', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 0, correct_index: 0, is_correct: true },
        { question_id: 'q2', prerequisite_id: 'prereq-2', selected_index: 0, correct_index: 0, is_correct: true },
      ];

      const result = await service.analyzeGaps(sessionId, responses);

      expect(result.percentage).toBe(100);
      expect(result.recommendation).toBe('proceed');
      expect(result.gaps).toHaveLength(0);
    });

    it('returns review_suggested recommendation for 50-99% score', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 0, correct_index: 0, is_correct: true },
        { question_id: 'q2', prerequisite_id: 'prereq-2', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [samplePrerequisites[1]],
            error: null,
          }),
        }),
      });

      const result = await service.analyzeGaps(sessionId, responses);

      expect(result.percentage).toBe(50);
      expect(result.recommendation).toBe('review_suggested');
    });

    it('returns review_required recommendation for below 50% score', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 1, correct_index: 0, is_correct: false },
        { question_id: 'q2', prerequisite_id: 'prereq-2', selected_index: 1, correct_index: 0, is_correct: false },
        { question_id: 'q3', prerequisite_id: 'prereq-3', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: samplePrerequisites,
            error: null,
          }),
        }),
      });

      const result = await service.analyzeGaps(sessionId, responses);

      expect(result.percentage).toBe(0);
      expect(result.recommendation).toBe('review_required');
    });

    it('identifies specific prerequisites answered incorrectly', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 0, correct_index: 0, is_correct: true },
        { question_id: 'q2', prerequisite_id: 'prereq-2', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [samplePrerequisites[1]],
            error: null,
          }),
        }),
      });

      const result = await service.analyzeGaps(sessionId, responses);

      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].id).toBe('prereq-2');
    });

    it('handles empty responses', async () => {
      const result = await service.analyzeGaps(sessionId, []);

      expect(result.totalPrerequisites).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.percentage).toBe(100);
      expect(result.recommendation).toBe('proceed');
      expect(result.gaps).toHaveLength(0);
    });

    it('groups multiple questions per prerequisite', async () => {
      // Two questions for same prerequisite, one correct one wrong = gap
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 0, correct_index: 0, is_correct: true },
        { question_id: 'q2', prerequisite_id: 'prereq-1', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [samplePrerequisites[0]],
            error: null,
          }),
        }),
      });

      const result = await service.analyzeGaps(sessionId, responses);

      // Only one prerequisite, and it has a gap (not all correct)
      expect(result.totalPrerequisites).toBe(1);
      expect(result.correct).toBe(0);
      expect(result.gaps).toHaveLength(1);
    });

    it('handles database errors when fetching gaps', async () => {
      const responses: PretestResponseInput[] = [
        { question_id: 'q1', prerequisite_id: 'prereq-1', selected_index: 1, correct_index: 0, is_correct: false },
      ];

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(service.analyzeGaps(sessionId, responses)).rejects.toThrow(
        PrerequisiteAssessmentError
      );
    });
  });

  // ============================================================================
  // TASK 6B.3: generateMiniLesson Tests
  // ============================================================================
  describe('generateMiniLesson', () => {
    let service: PrerequisiteAssessmentService;

    beforeEach(() => {
      service = createPrerequisiteAssessmentService(mockSupabase);
    });

    it('generates AI explanation for gaps', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // No existing lesson
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredMiniLesson,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedMiniLesson],
        ]),
      });

      const lesson = await service.generateMiniLesson('prereq-1');

      expect(lesson).toBeDefined();
      expect(lesson.title).toBe('Understanding React Basics');
      expect(lesson.content_markdown).toContain('React is a JavaScript library');
    });

    it('generates 2-3 paragraph explanation', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredMiniLesson,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedMiniLesson],
        ]),
      });

      const lesson = await service.generateMiniLesson('prereq-1');

      // Check that content has multiple paragraphs
      const paragraphs = lesson.content_markdown.split('\n\n').filter(p => p.trim());
      expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    });

    it('stores lesson in mini_lessons table', async () => {
      const mockInsertFn = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: sampleStoredMiniLesson,
            error: null,
          }),
        }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: mockInsertFn,
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedMiniLesson],
        ]),
      });

      await service.generateMiniLesson('prereq-1');

      expect(mockInsertFn).toHaveBeenCalled();
    });

    it('returns existing mini-lesson if already generated', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredMiniLesson, // Existing lesson found
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      const lesson = await service.generateMiniLesson('prereq-1');

      expect(lesson.id).toBe('lesson-1');
    });

    it('throws error when prerequisite not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      await expect(service.generateMiniLesson('nonexistent')).rejects.toThrow(
        PrerequisiteAssessmentError
      );
      await expect(service.generateMiniLesson('nonexistent')).rejects.toThrow(
        'Prerequisite not found'
      );
    });

    it('includes key points in the lesson', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredMiniLesson,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedMiniLesson],
        ]),
      });

      const lesson = await service.generateMiniLesson('prereq-1');

      expect(lesson.key_points).toBeDefined();
      expect(lesson.key_points.length).toBeGreaterThan(0);
    });

    it('handles AI generation failure gracefully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        shouldError: true,
        errorToThrow: new AIError('AI service failed', 'SERVER_ERROR'),
      });

      await expect(service.generateMiniLesson('prereq-1')).rejects.toThrow(
        PrerequisiteAssessmentError
      );
    });

    it('calculates estimated reading time', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'mini_lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: sampleStoredMiniLesson,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'prerequisites') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: samplePrerequisites[0],
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: jest.fn() };
      });

      configureMock({
        customStructuredResponses: new Map([
          ['React', sampleGeneratedMiniLesson],
        ]),
      });

      const lesson = await service.generateMiniLesson('prereq-1');

      expect(lesson.estimated_minutes).toBeDefined();
      expect(lesson.estimated_minutes).toBeGreaterThanOrEqual(1);
    });
  });
});
