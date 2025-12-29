/**
 * Projects Context Provider
 *
 * Provides project state management for the app:
 * - Holds list of user's projects
 * - Loads projects on mount when authenticated
 * - Reloads on auth state changes
 * - Provides refreshProjects for manual reload
 * - Exposes useProjects() hook for components
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
import { getProjects } from './projects';
import type { Project } from '../types';

/**
 * Projects context value interface
 */
interface ProjectsContextValue {
  /** List of user's projects */
  projects: Project[];
  /** True while loading projects */
  loading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Manually refresh projects from server */
  refreshProjects: () => Promise<void>;
}

/**
 * Projects context - undefined by default to detect usage outside provider
 */
const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

/**
 * Props for ProjectsProvider component
 */
interface ProjectsProviderProps {
  children: ReactNode;
}

/**
 * Projects Provider Component
 *
 * Wraps the app to provide projects state to all components.
 * Handles:
 * - Loading projects on mount when authenticated
 * - Reloading projects when auth state changes
 * - Managing loading and error states
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <ProjectsProvider>
 *     <App />
 *   </ProjectsProvider>
 * </AuthProvider>
 * ```
 */
export function ProjectsProvider({ children }: ProjectsProviderProps): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track the current user ID to detect changes
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Load projects from the service
   */
  const loadProjects = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getProjects(userId);

      if (fetchError) {
        setError(fetchError);
        setProjects([]);
      } else {
        setProjects(data ?? []);
      }
    } catch (err) {
      console.error('Unexpected error loading projects:', err);
      setError(err instanceof Error ? err : new Error('Failed to load projects'));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh projects - exposed to consumers
   */
  const refreshProjects = useCallback(async () => {
    if (!user) {
      return;
    }
    await loadProjects(user.id);
  }, [user, loadProjects]);

  /**
   * Load projects on mount and when user changes
   */
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      return;
    }

    // If user logged out, clear projects
    if (!user) {
      if (currentUserIdRef.current !== null) {
        setProjects([]);
        setError(null);
        setLoading(false);
      }
      currentUserIdRef.current = null;
      return;
    }

    // If user changed (or first load), reload projects
    if (user.id !== currentUserIdRef.current) {
      currentUserIdRef.current = user.id;
      loadProjects(user.id);
    }
  }, [user, authLoading, loadProjects]);

  /**
   * Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      loading,
      error,
      refreshProjects,
    }),
    [projects, loading, error, refreshProjects]
  );

  return <ProjectsContext.Provider value={contextValue}>{children}</ProjectsContext.Provider>;
}

/**
 * Hook to access projects state and actions
 *
 * Must be used within a ProjectsProvider.
 *
 * @returns Projects context value with projects list, loading state, error, and refresh function
 * @throws Error if used outside of ProjectsProvider
 *
 * @example
 * ```tsx
 * function ProjectsList() {
 *   const { projects, loading, error, refreshProjects } = useProjects();
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
 *       data={projects}
 *       onRefresh={refreshProjects}
 *       refreshing={loading}
 *       renderItem={({ item }) => <ProjectCard project={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);

  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }

  return context;
}

/**
 * Re-export types for consumers
 */
export type { ProjectsContextValue, ProjectsProviderProps };
