/**
 * Analysis Context Provider
 *
 * Provides analysis state management scoped to a project:
 * - Holds concepts and roadmap data
 * - Loads analysis data on mount when projectId provided
 * - Tracks pipeline stage and progress
 * - Provides analysis operations (start, retry, refresh)
 * - Exposes useAnalysis() hook for components
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import { getConceptsByProject, getRoadmapByProject, getRelationshipsByProject } from './analysis-queries';
import {
  createContentAnalysisPipeline,
  type PipelineStage,
  type ContentAnalysisPipeline,
} from './content-analysis-pipeline';
import type { Concept, Roadmap, ConceptRelationship } from '../types';

/**
 * Analysis context value interface
 */
interface AnalysisContextValue {
  /** List of project concepts */
  concepts: Concept[];
  /** List of concept relationships (for knowledge graph) */
  relationships: ConceptRelationship[];
  /** Project roadmap (null if not generated) */
  roadmap: Roadmap | null;
  /** Current pipeline stage */
  pipelineStage: PipelineStage;
  /** Pipeline progress (0-100) */
  progress: number;
  /** Error message if analysis failed */
  error: string | null;
  /** True while loading analysis data */
  loading: boolean;
  /** Manually refresh analysis data from server */
  refreshAnalysis: () => Promise<void>;
  /** Start analysis pipeline for a source */
  startAnalysis: (sourceId: string) => Promise<void>;
  /** Retry failed analysis pipeline for a source */
  retryAnalysis: (sourceId: string) => Promise<void>;
}

/**
 * Analysis context - undefined by default to detect usage outside provider
 */
const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

/**
 * Props for AnalysisProvider component
 */
interface AnalysisProviderProps {
  /** Project ID to scope analysis to */
  projectId: string;
  children: ReactNode;
}

/**
 * Analysis Provider Component
 *
 * Wraps project detail screens to provide analysis state to all components.
 * Handles:
 * - Loading concepts and roadmap on mount when projectId is provided
 * - Reloading data when projectId changes
 * - Managing loading, error, and pipeline progress states
 * - Pipeline operations (start, retry, refresh)
 *
 * @example
 * ```tsx
 * <AnalysisProvider projectId={id}>
 *   <RoadmapSection />
 *   <ConceptsSection />
 * </AnalysisProvider>
 * ```
 */
export function AnalysisProvider({ projectId, children }: AnalysisProviderProps): React.ReactElement {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [relationships, setRelationships] = useState<ConceptRelationship[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('pending');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Track the current project ID to detect changes
  const currentProjectIdRef = useRef<string | null>(null);

  // Pipeline instance ref (lazy initialized)
  const pipelineRef = useRef<ContentAnalysisPipeline | null>(null);

  /**
   * Get or create pipeline instance
   */
  const getPipeline = useCallback((): ContentAnalysisPipeline => {
    if (!pipelineRef.current) {
      pipelineRef.current = createContentAnalysisPipeline(supabase);
    }
    return pipelineRef.current;
  }, []);

  /**
   * Load analysis data from the service
   */
  const loadAnalysisData = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch concepts, relationships, and roadmap in parallel
      const [conceptsResult, relationshipsResult, roadmapResult] = await Promise.all([
        getConceptsByProject(pid),
        getRelationshipsByProject(pid),
        getRoadmapByProject(pid),
      ]);

      if (conceptsResult.error) {
        setError(conceptsResult.error.message);
        setConcepts([]);
      } else {
        setConcepts(conceptsResult.data ?? []);
      }

      if (relationshipsResult.error) {
        // Relationships might not exist yet, which is okay
        setRelationships([]);
      } else {
        setRelationships(relationshipsResult.data ?? []);
      }

      if (roadmapResult.error) {
        // Roadmap might not exist yet, which is okay
        // Only set error if it's not a "no rows" error (Supabase .single() returns this when no data)
        const isNoRowsError = roadmapResult.error.message?.includes('no rows') ||
                              roadmapResult.error.message?.includes('(or no)');
        if (!isNoRowsError) {
          setError((prev) => prev ? `${prev}; ${roadmapResult.error!.message}` : roadmapResult.error!.message);
        }
        setRoadmap(null);
      } else {
        setRoadmap(roadmapResult.data);
      }
    } catch (err) {
      console.error('Unexpected error loading analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis data');
      setConcepts([]);
      setRelationships([]);
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh analysis data - exposed to consumers
   */
  const refreshAnalysis = useCallback(async () => {
    if (!projectId) {
      return;
    }
    await loadAnalysisData(projectId);
  }, [projectId, loadAnalysisData]);

  /**
   * Start analysis pipeline for a source
   */
  const startAnalysis = useCallback(
    async (sourceId: string): Promise<void> => {
      setError(null);
      setPipelineStage('pending');
      setProgress(0);

      try {
        const pipeline = getPipeline();
        const status = await pipeline.analyzeSource(sourceId, {
          onProgress: (p) => setProgress(p),
          onStageChange: (stage, p) => {
            setPipelineStage(stage);
            setProgress(p);
          },
        });

        if (status.error) {
          setError(status.error);
          setPipelineStage('failed');
        } else {
          // Refresh data after successful analysis
          await refreshAnalysis();
        }
      } catch (err) {
        console.error('Unexpected error starting analysis:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to start analysis';
        setError(errorMessage);
        setPipelineStage('failed');
      }
    },
    [getPipeline, refreshAnalysis]
  );

  /**
   * Retry failed analysis pipeline for a source
   */
  const retryAnalysis = useCallback(
    async (sourceId: string): Promise<void> => {
      setError(null);
      setPipelineStage('pending');
      setProgress(0);

      try {
        const pipeline = getPipeline();
        const status = await pipeline.retryAnalysis(sourceId);

        if (status.error) {
          setError(status.error);
          setPipelineStage('failed');
        } else {
          setPipelineStage(status.stage);
          setProgress(status.progress);
          // Refresh data after successful retry
          await refreshAnalysis();
        }
      } catch (err) {
        console.error('Unexpected error retrying analysis:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to retry analysis';
        setError(errorMessage);
        setPipelineStage('failed');
      }
    },
    [getPipeline, refreshAnalysis]
  );

  /**
   * Load analysis data on mount and when projectId changes
   */
  useEffect(() => {
    // If projectId is undefined or empty, clear data
    if (!projectId) {
      if (currentProjectIdRef.current !== null) {
        setConcepts([]);
        setRelationships([]);
        setRoadmap(null);
        setError(null);
        setLoading(false);
        setPipelineStage('pending');
        setProgress(0);
      }
      currentProjectIdRef.current = null;
      return;
    }

    // If projectId changed, reload data
    if (projectId !== currentProjectIdRef.current) {
      currentProjectIdRef.current = projectId;
      loadAnalysisData(projectId);
    }
  }, [projectId, loadAnalysisData]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<AnalysisContextValue>(
    () => ({
      concepts,
      relationships,
      roadmap,
      pipelineStage,
      progress,
      error,
      loading,
      refreshAnalysis,
      startAnalysis,
      retryAnalysis,
    }),
    [concepts, relationships, roadmap, pipelineStage, progress, error, loading, refreshAnalysis, startAnalysis, retryAnalysis]
  );

  return <AnalysisContext.Provider value={contextValue}>{children}</AnalysisContext.Provider>;
}

/**
 * Hook to access analysis state and actions
 *
 * Must be used within an AnalysisProvider.
 *
 * @returns Analysis context value with concepts, roadmap, pipeline state, and actions
 * @throws Error if used outside of AnalysisProvider
 *
 * @example
 * ```tsx
 * function RoadmapDisplay() {
 *   const { roadmap, concepts, loading, error, pipelineStage, progress } = useAnalysis();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} />;
 *   }
 *
 *   if (pipelineStage !== 'completed' && pipelineStage !== 'pending') {
 *     return <ProgressBar stage={pipelineStage} progress={progress} />;
 *   }
 *
 *   return (
 *     <View>
 *       {roadmap && <RoadmapView roadmap={roadmap} />}
 *       <ConceptsList concepts={concepts} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAnalysis(): AnalysisContextValue {
  const context = useContext(AnalysisContext);

  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type { AnalysisContextValue, AnalysisProviderProps };
