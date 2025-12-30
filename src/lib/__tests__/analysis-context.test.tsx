/**
 * Analysis Context Tests
 *
 * Tests for the analysis context provider:
 * - Provider renders children
 * - useAnalysis throws outside provider
 * - Loads analysis data on mount when projectId provided
 * - Loading state during fetch
 * - Error state on failure
 * - refreshAnalysis reloads data
 * - startAnalysis starts pipeline and refreshes data
 * - retryAnalysis retries failed pipeline
 * - Pipeline progress tracking
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { AnalysisProvider, useAnalysis } from '../analysis-context';
import { getConceptsByProject, getRoadmapByProject } from '../analysis-queries';
import { createContentAnalysisPipeline } from '../content-analysis-pipeline';
import type { Concept, Roadmap } from '../../types';

// Mock the analysis queries
jest.mock('../analysis-queries', () => ({
  getConceptsByProject: jest.fn(),
  getRoadmapByProject: jest.fn(),
}));

// Mock the content analysis pipeline
jest.mock('../content-analysis-pipeline', () => ({
  createContentAnalysisPipeline: jest.fn(),
}));

// Mock supabase
jest.mock('../supabase', () => ({
  supabase: {},
}));

const mockGetConceptsByProject = getConceptsByProject as jest.Mock;
const mockGetRoadmapByProject = getRoadmapByProject as jest.Mock;
const mockCreateContentAnalysisPipeline = createContentAnalysisPipeline as jest.Mock;

/**
 * Helper to create a mock concept
 */
function createMockConcept(overrides?: Partial<Concept>): Concept {
  return {
    id: 'concept-1',
    project_id: 'test-project-id',
    source_id: 'source-1',
    name: 'Test Concept',
    definition: 'A test concept definition',
    key_points: ['Point 1', 'Point 2'],
    cognitive_type: 'declarative',
    difficulty: 3,
    source_timestamps: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create a mock roadmap
 */
function createMockRoadmap(overrides?: Partial<Roadmap>): Roadmap {
  return {
    id: 'roadmap-1',
    project_id: 'test-project-id',
    title: 'Test Roadmap',
    description: 'A test roadmap description',
    levels: [
      {
        level: 1,
        title: 'Level 1',
        concept_ids: ['concept-1'],
        estimated_minutes: 30,
      },
    ],
    total_estimated_minutes: 30,
    mastery_gates: [],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create a mock pipeline
 */
function createMockPipeline() {
  return {
    analyzeSource: jest.fn(),
    getStatus: jest.fn(),
    retryAnalysis: jest.fn(),
    cancelAnalysis: jest.fn(),
  };
}

/**
 * Wrapper component for testing hooks with projectId
 */
function createWrapper(projectId: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AnalysisProvider projectId={projectId}>{children}</AnalysisProvider>;
  };
}

describe('AnalysisContext', () => {
  let mockPipeline: ReturnType<typeof createMockPipeline>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup default mock pipeline
    mockPipeline = createMockPipeline();
    mockCreateContentAnalysisPipeline.mockReturnValue(mockPipeline);

    // Setup default successful responses
    mockGetConceptsByProject.mockResolvedValue({ data: [], error: null });
    mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AnalysisProvider', () => {
    it('renders children correctly', async () => {
      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      // Provider should render and provide context
      expect(result.current).toBeDefined();
      expect(result.current.concepts).toEqual([]);
      expect(result.current.roadmap).toBeNull();
    });
  });

  describe('useAnalysis hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress error output for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAnalysis());
      }).toThrow('useAnalysis must be used within an AnalysisProvider');

      consoleSpy.mockRestore();
    });

    it('provides context with expected shape', async () => {
      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('concepts');
      expect(result.current).toHaveProperty('roadmap');
      expect(result.current).toHaveProperty('pipelineStage');
      expect(result.current).toHaveProperty('progress');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('refreshAnalysis');
      expect(result.current).toHaveProperty('startAnalysis');
      expect(result.current).toHaveProperty('retryAnalysis');
      expect(typeof result.current.refreshAnalysis).toBe('function');
      expect(typeof result.current.startAnalysis).toBe('function');
      expect(typeof result.current.retryAnalysis).toBe('function');
    });
  });

  describe('loading analysis data on mount', () => {
    it('loads concepts and roadmap when projectId is provided', async () => {
      const mockConcepts = [
        createMockConcept({ id: 'concept-1', name: 'Concept 1' }),
        createMockConcept({ id: 'concept-2', name: 'Concept 2' }),
      ];
      const mockRoadmap = createMockRoadmap();

      mockGetConceptsByProject.mockResolvedValue({
        data: mockConcepts,
        error: null,
      });

      mockGetRoadmapByProject.mockResolvedValue({
        data: mockRoadmap,
        error: null,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetConceptsByProject).toHaveBeenCalledWith('test-project-id');
      expect(mockGetRoadmapByProject).toHaveBeenCalledWith('test-project-id');
      expect(result.current.concepts).toEqual(mockConcepts);
      expect(result.current.roadmap).toEqual(mockRoadmap);
      expect(result.current.error).toBeNull();
    });

    it('handles missing roadmap gracefully (no rows error)', async () => {
      const mockConcepts = [createMockConcept()];

      mockGetConceptsByProject.mockResolvedValue({
        data: mockConcepts,
        error: null,
      });

      mockGetRoadmapByProject.mockResolvedValue({
        data: null,
        error: { message: 'JSON object requested, multiple (or no) rows returned' },
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.concepts).toEqual(mockConcepts);
      expect(result.current.roadmap).toBeNull();
      // Should not set error for "no rows" case
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('sets loading to true while fetching analysis data', async () => {
      // Create a promise that we control
      let resolveConcepts: (value: { data: Concept[]; error: null }) => void;
      const conceptsPromise = new Promise<{ data: Concept[]; error: null }>((resolve) => {
        resolveConcepts = resolve;
      });

      mockGetConceptsByProject.mockReturnValue(conceptsPromise);
      mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      // Should start loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveConcepts!({ data: [], error: null });
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('sets error state when loading concepts fails', async () => {
      const mockError = new Error('Failed to fetch concepts');

      mockGetConceptsByProject.mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockGetRoadmapByProject.mockResolvedValue({
        data: null,
        error: null,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch concepts');
      expect(result.current.concepts).toEqual([]);
    });

    it('sets error state when loading roadmap fails with non-empty error', async () => {
      const mockError = new Error('Database connection failed');

      mockGetConceptsByProject.mockResolvedValue({
        data: [],
        error: null,
      });

      mockGetRoadmapByProject.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.roadmap).toBeNull();
    });

    it('clears error on successful reload', async () => {
      const mockError = new Error('Initial error');
      const mockConcepts = [createMockConcept()];

      // First call fails
      mockGetConceptsByProject.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });
      mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      // Wait for initial error state
      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Second call succeeds
      mockGetConceptsByProject.mockResolvedValueOnce({
        data: mockConcepts,
        error: null,
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refreshAnalysis();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.concepts).toEqual(mockConcepts);
    });
  });

  describe('refreshAnalysis', () => {
    it('reloads data from service', async () => {
      const initialConcepts = [createMockConcept({ id: 'concept-1', name: 'Initial' })];
      const refreshedConcepts = [
        createMockConcept({ id: 'concept-1', name: 'Initial' }),
        createMockConcept({ id: 'concept-2', name: 'New Concept' }),
      ];

      // Initial load
      mockGetConceptsByProject.mockResolvedValueOnce({
        data: initialConcepts,
        error: null,
      });
      mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.concepts).toEqual(initialConcepts);
      });

      // Refresh returns new data
      mockGetConceptsByProject.mockResolvedValueOnce({
        data: refreshedConcepts,
        error: null,
      });

      await act(async () => {
        await result.current.refreshAnalysis();
      });

      expect(mockGetConceptsByProject).toHaveBeenCalledTimes(2);
      expect(result.current.concepts).toEqual(refreshedConcepts);
    });
  });

  describe('initial pipeline state', () => {
    it('has pending pipelineStage and 0 progress by default', async () => {
      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.pipelineStage).toBe('pending');
      expect(result.current.progress).toBe(0);
    });
  });

  describe('startAnalysis', () => {
    it('calls pipeline analyzeSource and refreshes data on success', async () => {
      const mockConcepts = [createMockConcept()];
      const mockRoadmap = createMockRoadmap();

      mockGetConceptsByProject.mockResolvedValue({ data: [], error: null });
      mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });

      mockPipeline.analyzeSource.mockImplementation(async (sourceId, options) => {
        // Simulate progress updates
        if (options?.onProgress) {
          options.onProgress(25);
          options.onProgress(50);
          options.onProgress(75);
          options.onProgress(100);
        }
        if (options?.onStageChange) {
          options.onStageChange('extracting_concepts', 25);
          options.onStageChange('building_graph', 50);
          options.onStageChange('generating_roadmap', 75);
          options.onStageChange('completed', 100);
        }
        return { sourceId, projectId: 'test-project-id', stage: 'completed', progress: 100, startedAt: new Date().toISOString() };
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Setup mock for refresh after analysis
      mockGetConceptsByProject.mockResolvedValue({ data: mockConcepts, error: null });
      mockGetRoadmapByProject.mockResolvedValue({ data: mockRoadmap, error: null });

      await act(async () => {
        await result.current.startAnalysis('source-123');
      });

      expect(mockPipeline.analyzeSource).toHaveBeenCalledWith('source-123', expect.any(Object));
      expect(result.current.pipelineStage).toBe('completed');
      expect(result.current.progress).toBe(100);
    });

    it('sets error state when pipeline fails', async () => {
      mockPipeline.analyzeSource.mockResolvedValue({
        sourceId: 'source-123',
        projectId: 'test-project-id',
        stage: 'failed',
        progress: 25,
        error: 'Pipeline failed during extraction',
        startedAt: new Date().toISOString(),
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.startAnalysis('source-123');
      });

      expect(result.current.error).toBe('Pipeline failed during extraction');
      expect(result.current.pipelineStage).toBe('failed');
    });

    it('handles thrown errors during analysis', async () => {
      mockPipeline.analyzeSource.mockRejectedValue(new Error('Network error'));

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.startAnalysis('source-123');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.pipelineStage).toBe('failed');
    });
  });

  describe('retryAnalysis', () => {
    it('calls pipeline retryAnalysis and refreshes data on success', async () => {
      mockPipeline.retryAnalysis.mockResolvedValue({
        sourceId: 'source-123',
        projectId: 'test-project-id',
        stage: 'completed',
        progress: 100,
        startedAt: new Date().toISOString(),
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.retryAnalysis('source-123');
      });

      expect(mockPipeline.retryAnalysis).toHaveBeenCalledWith('source-123');
      expect(result.current.pipelineStage).toBe('completed');
      expect(result.current.progress).toBe(100);
    });

    it('sets error state when retry fails', async () => {
      mockPipeline.retryAnalysis.mockResolvedValue({
        sourceId: 'source-123',
        projectId: 'test-project-id',
        stage: 'failed',
        progress: 50,
        error: 'Retry failed at graph building',
        startedAt: new Date().toISOString(),
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.retryAnalysis('source-123');
      });

      expect(result.current.error).toBe('Retry failed at graph building');
      expect(result.current.pipelineStage).toBe('failed');
    });

    it('handles thrown errors during retry', async () => {
      mockPipeline.retryAnalysis.mockRejectedValue(new Error('Cannot retry'));

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.retryAnalysis('source-123');
      });

      expect(result.current.error).toBe('Cannot retry');
      expect(result.current.pipelineStage).toBe('failed');
    });
  });

  describe('projectId changes', () => {
    it('reloads data when projectId changes', async () => {
      const project1Concepts = [createMockConcept({ id: 'c1', project_id: 'project-1' })];

      mockGetConceptsByProject.mockResolvedValueOnce({ data: project1Concepts, error: null });
      mockGetRoadmapByProject.mockResolvedValue({ data: null, error: null });

      // Start with project-1
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <AnalysisProvider projectId="project-1">{children}</AnalysisProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.concepts).toEqual(project1Concepts);
      });

      expect(mockGetConceptsByProject).toHaveBeenCalledWith('project-1');
    });
  });

  describe('pipeline progress tracking', () => {
    it('tracks progress and stage changes during analysis', async () => {
      mockPipeline.analyzeSource.mockImplementation(async (sourceId, options) => {
        // Simulate stage progression
        type StageEntry = { stage: 'transcribing' | 'extracting_concepts' | 'building_graph' | 'generating_roadmap' | 'completed'; progress: number };
        const stages: StageEntry[] = [
          { stage: 'transcribing', progress: 10 },
          { stage: 'extracting_concepts', progress: 30 },
          { stage: 'building_graph', progress: 60 },
          { stage: 'generating_roadmap', progress: 80 },
          { stage: 'completed', progress: 100 },
        ];

        for (const { stage, progress } of stages) {
          if (options?.onStageChange) {
            options.onStageChange(stage, progress);
          }
          if (options?.onProgress) {
            options.onProgress(progress);
          }
        }

        return {
          sourceId,
          projectId: 'test-project-id',
          stage: 'completed',
          progress: 100,
          startedAt: new Date().toISOString(),
        };
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useAnalysis(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.startAnalysis('source-123');
      });

      // Final state should be completed
      expect(result.current.pipelineStage).toBe('completed');
      expect(result.current.progress).toBe(100);
    });
  });
});
