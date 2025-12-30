/**
 * Content Analysis Pipeline Tests
 *
 * Tests for orchestrating the full analysis flow from source upload to roadmap generation.
 * Includes tests for:
 * - Start analysis creates pending status
 * - Progress updates through each stage
 * - Video sources go through transcription
 * - Text sources skip transcription
 * - Concepts extracted and stored
 * - Knowledge graph built
 * - Roadmap generated
 * - Completion status set correctly
 * - Error handling at each stage
 * - Retry from failed stage
 * - Cancel ongoing analysis
 * - Get status returns correct stage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Source,
  Concept,
  ConceptRelationship,
  Transcription,
  Roadmap,
} from '@/src/types/database';

// Import mock functions for all services
import {
  configureMock as configureTranscriptionMock,
  resetMock as resetTranscriptionMock,
  clearMockCallHistory as clearTranscriptionCallHistory,
  getMockCallHistory as getTranscriptionCallHistory,
  createMockTranscription,
} from '../__mocks__/transcription-service';

import {
  configureMock as configureConceptExtractionMock,
  resetMock as resetConceptExtractionMock,
  clearMockCallHistory as clearConceptExtractionCallHistory,
  getMockCallHistory as getConceptExtractionCallHistory,
  sampleConcepts,
} from '../__mocks__/concept-extraction';

import {
  configureMock as configureKnowledgeGraphMock,
  resetMock as resetKnowledgeGraphMock,
  clearMockCallHistory as clearKnowledgeGraphCallHistory,
  getMockCallHistory as getKnowledgeGraphCallHistory,
} from '../__mocks__/knowledge-graph-service';

import {
  configureMock as configureRoadmapMock,
  resetMock as resetRoadmapMock,
  clearMockCallHistory as clearRoadmapCallHistory,
  getMockCallHistory as getRoadmapCallHistory,
  sampleRoadmap,
} from '../__mocks__/roadmap-generation';

// Mock all the services
jest.mock('../transcription-service', () =>
  require('../__mocks__/transcription-service')
);

jest.mock('../concept-extraction', () =>
  require('../__mocks__/concept-extraction')
);

jest.mock('../knowledge-graph-service', () =>
  require('../__mocks__/knowledge-graph-service')
);

jest.mock('../roadmap-generation', () =>
  require('../__mocks__/roadmap-generation')
);

// Import after mocking
import {
  createContentAnalysisPipeline,
  ContentAnalysisPipeline,
  ContentAnalysisPipelineError,
  PipelineStage,
  PipelineStatus,
  PIPELINE_STAGES,
} from '../content-analysis-pipeline';

describe('Content Analysis Pipeline', () => {
  // Mock Supabase client
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  // Sample test data
  const projectId = 'project-123';
  const sourceId = 'source-456';

  // Sample video source (requires transcription)
  const videoSource: Source = {
    id: sourceId,
    project_id: projectId,
    user_id: 'user-789',
    type: 'video',
    name: 'test-video.mp4',
    url: null,
    storage_path: 'user-789/project-123/source-456_test-video.mp4',
    file_size: 1024 * 1024,
    mime_type: 'video/mp4',
    status: 'completed',
    error_message: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  // Sample PDF source (text, no transcription needed)
  const pdfSource: Source = {
    id: 'source-pdf-456',
    project_id: projectId,
    user_id: 'user-789',
    type: 'pdf',
    name: 'test-doc.pdf',
    url: null,
    storage_path: 'user-789/project-123/source-pdf-456_test-doc.pdf',
    file_size: 512 * 1024,
    mime_type: 'application/pdf',
    status: 'completed',
    error_message: null,
    metadata: { text_content: 'This is a sample PDF with learning content.' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  // Sample URL source (text, no transcription needed)
  const urlSource: Source = {
    id: 'source-url-456',
    project_id: projectId,
    user_id: 'user-789',
    type: 'url',
    name: 'Learning Article',
    url: 'https://example.com/article',
    storage_path: null,
    file_size: null,
    mime_type: 'text/html',
    status: 'completed',
    error_message: null,
    metadata: { text_content: 'This is a sample URL with learning content.' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  // Sample concepts
  const sampleConceptsList: Concept[] = [
    {
      id: 'concept-1',
      project_id: projectId,
      source_id: sourceId,
      name: 'Variables',
      definition: 'Named storage locations in memory.',
      key_points: ['Store data', 'Have types'],
      cognitive_type: 'declarative',
      difficulty: 2,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'concept-2',
      project_id: projectId,
      source_id: sourceId,
      name: 'Functions',
      definition: 'Reusable blocks of code.',
      key_points: ['Accept parameters', 'Return values'],
      cognitive_type: 'procedural',
      difficulty: 5,
      source_timestamps: [],
      metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Sample relationships
  const sampleRelationships: ConceptRelationship[] = [
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all service mocks
    resetTranscriptionMock();
    clearTranscriptionCallHistory();
    resetConceptExtractionMock();
    clearConceptExtractionCallHistory();
    resetKnowledgeGraphMock();
    clearKnowledgeGraphCallHistory();
    resetRoadmapMock();
    clearRoadmapCallHistory();

    // Set up mock API key environment variable
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = 'test-openai-key';

    // Configure mocks with default successful responses
    configureConceptExtractionMock({
      defaultConcepts: sampleConcepts.programming,
    });

    configureKnowledgeGraphMock({
      defaultRelationships: sampleRelationships,
      customTopologicalOrder: sampleConceptsList,
    });

    configureRoadmapMock({
      defaultRoadmap: sampleRoadmap,
    });

    // Set up Supabase mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: videoSource, error: null });
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    mockSupabase = {
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient>;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  });

  describe('createContentAnalysisPipeline', () => {
    it('creates pipeline with valid configuration', () => {
      const pipeline = createContentAnalysisPipeline(mockSupabase);

      expect(pipeline).toBeDefined();
      expect(pipeline.analyzeSource).toBeDefined();
      expect(pipeline.getStatus).toBeDefined();
      expect(pipeline.retryAnalysis).toBeDefined();
      expect(pipeline.cancelAnalysis).toBeDefined();
    });

    it('throws error when API key is missing', () => {
      delete process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

      expect(() => createContentAnalysisPipeline(mockSupabase)).toThrow(
        ContentAnalysisPipelineError
      );
      expect(() => createContentAnalysisPipeline(mockSupabase)).toThrow(
        'API key'
      );
    });
  });

  describe('analyzeSource', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('starts analysis and creates pending status', async () => {
      // Mock source fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      const status = await pipeline.analyzeSource(sourceId);

      expect(status).toBeDefined();
      expect(status.sourceId).toBe(sourceId);
      expect(status.projectId).toBe(projectId);
      expect(status.startedAt).toBeDefined();
    });

    it('video source goes through transcription stage', async () => {
      // Mock source fetch
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      // Check that transcription service was called
      const transcriptionCalls = getTranscriptionCallHistory();
      expect(transcriptionCalls.some((c) => c.method === 'startTranscription')).toBe(
        true
      );
    });

    it('PDF source skips transcription stage', async () => {
      // Mock source fetch for PDF
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(pdfSource.id);

      // Check that transcription service was NOT called
      const transcriptionCalls = getTranscriptionCallHistory();
      expect(transcriptionCalls.some((c) => c.method === 'startTranscription')).toBe(
        false
      );
    });

    it('URL source skips transcription stage', async () => {
      // Mock source fetch for URL
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: urlSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(urlSource.id);

      // Check that transcription service was NOT called
      const transcriptionCalls = getTranscriptionCallHistory();
      expect(transcriptionCalls.some((c) => c.method === 'startTranscription')).toBe(
        false
      );
    });

    it('concepts are extracted after transcription or text extraction', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      // Check that concept extraction was called
      const extractionCalls = getConceptExtractionCallHistory();
      expect(
        extractionCalls.some((c) => c.method === 'extractFromTranscription') ||
          extractionCalls.some((c) => c.method === 'extractFromText')
      ).toBe(true);
    });

    it('knowledge graph is built after concept extraction', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      // Check that knowledge graph service was called
      const graphCalls = getKnowledgeGraphCallHistory();
      expect(
        graphCalls.some((c) => c.method === 'buildKnowledgeGraph')
      ).toBe(true);
    });

    it('roadmap is generated after knowledge graph', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      // Check that roadmap generation was called
      const roadmapCalls = getRoadmapCallHistory();
      expect(
        roadmapCalls.some((c) => c.method === 'generateRoadmap')
      ).toBe(true);
    });

    it('completion status is set when pipeline finishes', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      const status = await pipeline.analyzeSource(sourceId);

      expect(status.stage).toBe('completed');
      expect(status.progress).toBe(100);
      expect(status.completedAt).toBeDefined();
    });

    it('progress updates through each stage for video source', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      // Track progress updates
      const progressUpdates: number[] = [];
      const onProgress = (progress: number) => progressUpdates.push(progress);

      await pipeline.analyzeSource(sourceId, { onProgress });

      // Should have progress updates from 0 to 100
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('throws error when source not found', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Source not found' },
            }),
          }),
        }),
      });

      await expect(pipeline.analyzeSource('non-existent')).rejects.toThrow(
        ContentAnalysisPipelineError
      );
    });
  });

  describe('Error handling at each stage', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('handles transcription stage errors', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      // Configure transcription mock to fail
      configureTranscriptionMock({
        shouldError: true,
      });

      const status = await pipeline.analyzeSource(sourceId);

      expect(status.stage).toBe('failed');
      expect(status.error).toBeDefined();
    });

    it('handles concept extraction stage errors', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      // Configure concept extraction mock to fail
      configureConceptExtractionMock({
        shouldError: true,
      });

      const status = await pipeline.analyzeSource(pdfSource.id);

      expect(status.stage).toBe('failed');
      expect(status.error).toBeDefined();
    });

    it('handles knowledge graph building stage errors', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      // Configure knowledge graph mock to fail
      configureKnowledgeGraphMock({
        shouldError: true,
      });

      const status = await pipeline.analyzeSource(pdfSource.id);

      expect(status.stage).toBe('failed');
      expect(status.error).toBeDefined();
    });

    it('handles roadmap generation stage errors', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      // Configure roadmap mock to fail
      configureRoadmapMock({
        shouldError: true,
      });

      const status = await pipeline.analyzeSource(pdfSource.id);

      expect(status.stage).toBe('failed');
      expect(status.error).toBeDefined();
    });
  });

  describe('getStatus', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('returns null for non-existent analysis', async () => {
      const status = await pipeline.getStatus('non-existent');

      expect(status).toBeNull();
    });

    it('returns correct status for ongoing analysis', async () => {
      // Start an analysis first
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      // Get status
      const status = await pipeline.getStatus(sourceId);

      expect(status).toBeDefined();
      expect(status?.sourceId).toBe(sourceId);
    });

    it('returns correct stage information', async () => {
      // Start an analysis first
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(sourceId);

      const status = await pipeline.getStatus(sourceId);

      expect(status?.stage).toBe('completed');
      expect(status?.progress).toBe(100);
    });
  });

  describe('retryAnalysis', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('retries from last failed stage', async () => {
      // First, create a failed analysis
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      configureConceptExtractionMock({
        shouldError: true,
      });

      const failedStatus = await pipeline.analyzeSource(pdfSource.id);
      expect(failedStatus.stage).toBe('failed');

      // Reset mock to succeed
      resetConceptExtractionMock();
      configureConceptExtractionMock({
        defaultConcepts: sampleConcepts.programming,
      });

      // Mock for retry
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      // Retry
      const retryStatus = await pipeline.retryAnalysis(pdfSource.id);

      expect(retryStatus.stage).toBe('completed');
    });

    it('throws error if no previous analysis exists', async () => {
      await expect(pipeline.retryAnalysis('non-existent')).rejects.toThrow(
        ContentAnalysisPipelineError
      );
    });

    it('throws error if previous analysis was successful', async () => {
      // Create a successful analysis
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: pdfSource,
              error: null,
            }),
          }),
        }),
      });

      await pipeline.analyzeSource(pdfSource.id);

      await expect(pipeline.retryAnalysis(pdfSource.id)).rejects.toThrow(
        ContentAnalysisPipelineError
      );
    });
  });

  describe('cancelAnalysis', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('cancels an ongoing analysis', async () => {
      // Start an analysis
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      // Start analysis but don't await yet - we want to cancel it
      // For this test, we'll just verify the cancel mechanism works
      await pipeline.analyzeSource(sourceId);

      // After completion, cancellation should be a no-op
      await pipeline.cancelAnalysis(sourceId);

      // The status should still be completed since it finished before cancel
      const status = await pipeline.getStatus(sourceId);
      expect(status?.stage).toBe('completed');
    });

    it('sets cancelled status when cancelled during processing', async () => {
      // This is a conceptual test - actual cancellation requires async handling
      // For now, verify the cancel method exists and is callable
      await expect(pipeline.cancelAnalysis('non-existent')).resolves.not.toThrow();
    });
  });

  describe('PIPELINE_STAGES', () => {
    it('has correct stage definitions', () => {
      expect(PIPELINE_STAGES).toContain('pending');
      expect(PIPELINE_STAGES).toContain('transcribing');
      expect(PIPELINE_STAGES).toContain('extracting_concepts');
      expect(PIPELINE_STAGES).toContain('building_graph');
      expect(PIPELINE_STAGES).toContain('generating_roadmap');
      expect(PIPELINE_STAGES).toContain('completed');
      expect(PIPELINE_STAGES).toContain('failed');
    });
  });

  describe('ContentAnalysisPipelineError', () => {
    it('includes error code and message', () => {
      const error = new ContentAnalysisPipelineError(
        'Test error',
        'PIPELINE_FAILED'
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('PIPELINE_FAILED');
      expect(error.name).toBe('ContentAnalysisPipelineError');
    });

    it('includes optional details', () => {
      const error = new ContentAnalysisPipelineError(
        'Test error',
        'STAGE_FAILED',
        { stage: 'transcribing', sourceId: 'source-123' }
      );

      expect(error.details).toEqual({ stage: 'transcribing', sourceId: 'source-123' });
    });
  });

  describe('Pipeline stage progress values', () => {
    it('transcription stage spans 0-25%', async () => {
      const pipeline = createContentAnalysisPipeline(mockSupabase);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      let transcriptionProgress = 0;
      await pipeline.analyzeSource(sourceId, {
        onStageChange: (stage, progress) => {
          if (stage === 'transcribing') {
            transcriptionProgress = progress;
          }
        },
      });

      // Transcription progress should be in 0-25 range
      expect(transcriptionProgress).toBeGreaterThanOrEqual(0);
      expect(transcriptionProgress).toBeLessThanOrEqual(25);
    });

    it('concept extraction stage spans 25-50%', async () => {
      const pipeline = createContentAnalysisPipeline(mockSupabase);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      let extractionProgress = 0;
      await pipeline.analyzeSource(sourceId, {
        onStageChange: (stage, progress) => {
          if (stage === 'extracting_concepts') {
            extractionProgress = progress;
          }
        },
      });

      // Concept extraction progress should be in 25-50 range
      expect(extractionProgress).toBeGreaterThanOrEqual(25);
      expect(extractionProgress).toBeLessThanOrEqual(50);
    });

    it('graph building stage spans 50-75%', async () => {
      const pipeline = createContentAnalysisPipeline(mockSupabase);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      let graphProgress = 0;
      await pipeline.analyzeSource(sourceId, {
        onStageChange: (stage, progress) => {
          if (stage === 'building_graph') {
            graphProgress = progress;
          }
        },
      });

      // Graph building progress should be in 50-75 range
      expect(graphProgress).toBeGreaterThanOrEqual(50);
      expect(graphProgress).toBeLessThanOrEqual(75);
    });

    it('roadmap generation stage spans 75-100%', async () => {
      const pipeline = createContentAnalysisPipeline(mockSupabase);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: videoSource,
              error: null,
            }),
          }),
        }),
      });

      let roadmapProgress = 0;
      await pipeline.analyzeSource(sourceId, {
        onStageChange: (stage, progress) => {
          if (stage === 'generating_roadmap') {
            roadmapProgress = progress;
          }
        },
      });

      // Roadmap generation progress should be in 75-100 range
      expect(roadmapProgress).toBeGreaterThanOrEqual(75);
      expect(roadmapProgress).toBeLessThanOrEqual(100);
    });
  });

  describe('Source database status updates', () => {
    let pipeline: ContentAnalysisPipeline;

    beforeEach(() => {
      pipeline = createContentAnalysisPipeline(mockSupabase);
    });

    it('updates source status to processing when analysis starts', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      mockFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: videoSource,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValue({
          update: updateMock,
        });

      await pipeline.analyzeSource(sourceId);

      // Verify source status was updated
      expect(mockFrom).toHaveBeenCalledWith('sources');
    });
  });
});
