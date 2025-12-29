/**
 * Sources Context Provider
 *
 * Provides source state management scoped to a project:
 * - Holds list of project sources
 * - Loads sources on mount when projectId provided
 * - Tracks upload progress state
 * - Provides CRUD operations for sources
 * - Exposes useSources() hook for components
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

import { useAuth } from './auth-context';
import {
  getSources,
  createSource,
  deleteSource,
  uploadFile,
  type UploadFile,
  type OnProgressCallback,
} from './sources';
import type { Source } from '../types';

/**
 * Sources context value interface
 */
interface SourcesContextValue {
  /** List of project sources */
  sources: Source[];
  /** True while loading sources */
  loading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Manually refresh sources from server */
  refreshSources: () => Promise<void>;
  /** Upload progress (0-100) during upload, null when idle */
  uploadProgress: number | null;
  /** Add a URL source to the project */
  addUrlSource: (url: string, name: string) => Promise<{ error: Error | null }>;
  /** Upload a file source to the project */
  uploadFileSource: (file: UploadFile) => Promise<{ error: Error | null }>;
  /** Remove a source from the project */
  removeSource: (id: string) => Promise<{ error: Error | null }>;
}

/**
 * Sources context - undefined by default to detect usage outside provider
 */
const SourcesContext = createContext<SourcesContextValue | undefined>(undefined);

/**
 * Props for SourcesProvider component
 */
interface SourcesProviderProps {
  /** Project ID to scope sources to */
  projectId?: string;
  children: ReactNode;
}

/**
 * Sources Provider Component
 *
 * Wraps project detail screens to provide sources state to all components.
 * Handles:
 * - Loading sources on mount when projectId is provided
 * - Reloading sources when projectId changes
 * - Managing loading, error, and upload progress states
 * - CRUD operations for sources
 *
 * @example
 * ```tsx
 * <SourcesProvider projectId={id}>
 *   <SourcesSection />
 * </SourcesProvider>
 * ```
 */
export function SourcesProvider({ projectId, children }: SourcesProviderProps): React.ReactElement {
  const { user } = useAuth();

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Track the current project ID to detect changes
  const currentProjectIdRef = useRef<string | null>(null);

  /**
   * Load sources from the service
   */
  const loadSources = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getSources(pid);

      if (fetchError) {
        setError(fetchError);
        setSources([]);
      } else {
        setSources(data ?? []);
      }
    } catch (err) {
      console.error('Unexpected error loading sources:', err);
      setError(err instanceof Error ? err : new Error('Failed to load sources'));
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh sources - exposed to consumers
   */
  const refreshSources = useCallback(async () => {
    if (!projectId) {
      return;
    }
    await loadSources(projectId);
  }, [projectId, loadSources]);

  /**
   * Add a URL source to the project
   */
  const addUrlSource = useCallback(
    async (url: string, name: string): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      if (!projectId) {
        return { error: new Error('No project selected') };
      }

      try {
        const { error: createError } = await createSource(user.id, {
          project_id: projectId,
          type: 'url',
          url,
          name,
          status: 'completed',
        });

        if (createError) {
          return { error: createError };
        }

        // Refresh sources list after adding
        await refreshSources();
        return { error: null };
      } catch (err) {
        console.error('Unexpected error adding URL source:', err);
        return { error: err instanceof Error ? err : new Error('Failed to add URL source') };
      }
    },
    [user, projectId, refreshSources]
  );

  /**
   * Upload a file source to the project
   */
  const uploadFileSource = useCallback(
    async (file: UploadFile): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      if (!projectId) {
        return { error: new Error('No project selected') };
      }

      // Reset progress
      setUploadProgress(0);

      try {
        // Progress callback to track upload
        const onProgress: OnProgressCallback = ({ loaded, total }) => {
          const progress = Math.round((loaded / total) * 100);
          setUploadProgress(progress);
        };

        const { error: uploadError } = await uploadFile(user.id, projectId, file, onProgress);

        if (uploadError) {
          setUploadProgress(null);
          return { error: uploadError };
        }

        // Refresh sources list after uploading
        await refreshSources();
        setUploadProgress(null);
        return { error: null };
      } catch (err) {
        console.error('Unexpected error uploading file:', err);
        setUploadProgress(null);
        return { error: err instanceof Error ? err : new Error('Failed to upload file') };
      }
    },
    [user, projectId, refreshSources]
  );

  /**
   * Remove a source from the project
   */
  const removeSource = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      try {
        const { error: deleteError } = await deleteSource(id);

        if (deleteError) {
          return { error: deleteError };
        }

        // Refresh sources list after deleting
        await refreshSources();
        return { error: null };
      } catch (err) {
        console.error('Unexpected error removing source:', err);
        return { error: err instanceof Error ? err : new Error('Failed to remove source') };
      }
    },
    [refreshSources]
  );

  /**
   * Load sources on mount and when projectId changes
   */
  useEffect(() => {
    // If projectId is undefined or empty, clear sources
    if (!projectId) {
      if (currentProjectIdRef.current !== null) {
        setSources([]);
        setError(null);
        setLoading(false);
      }
      currentProjectIdRef.current = null;
      return;
    }

    // Don't load if user is not authenticated
    if (!user) {
      setSources([]);
      setError(null);
      setLoading(false);
      currentProjectIdRef.current = null;
      return;
    }

    // If projectId changed, reload sources
    if (projectId !== currentProjectIdRef.current) {
      currentProjectIdRef.current = projectId;
      loadSources(projectId);
    }
  }, [projectId, user, loadSources]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<SourcesContextValue>(
    () => ({
      sources,
      loading,
      error,
      refreshSources,
      uploadProgress,
      addUrlSource,
      uploadFileSource,
      removeSource,
    }),
    [sources, loading, error, refreshSources, uploadProgress, addUrlSource, uploadFileSource, removeSource]
  );

  return <SourcesContext.Provider value={contextValue}>{children}</SourcesContext.Provider>;
}

/**
 * Hook to access sources state and actions
 *
 * Must be used within a SourcesProvider.
 *
 * @returns Sources context value with sources list, loading state, error, and actions
 * @throws Error if used outside of SourcesProvider
 *
 * @example
 * ```tsx
 * function SourcesList() {
 *   const { sources, loading, error, refreshSources, uploadProgress } = useSources();
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (error) {
 *     return <ErrorMessage error={error} />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={sources}
 *       onRefresh={refreshSources}
 *       refreshing={loading}
 *       renderItem={({ item }) => <SourceCard source={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useSources(): SourcesContextValue {
  const context = useContext(SourcesContext);

  if (context === undefined) {
    throw new Error('useSources must be used within a SourcesProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type { SourcesContextValue, SourcesProviderProps };
