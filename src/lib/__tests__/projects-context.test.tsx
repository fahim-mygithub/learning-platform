/**
 * Projects Context Tests
 *
 * Tests for the projects context provider:
 * - Provider renders children
 * - useProjects throws outside provider
 * - Loads projects on mount when authenticated
 * - Doesn't load when not authenticated
 * - Loading state during fetch
 * - Error state on failure
 * - refreshProjects reloads data
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { User } from '@supabase/supabase-js';

import { ProjectsProvider, useProjects } from '../projects-context';
import { useAuth } from '../auth-context';
import { getProjects } from '../projects';
import type { Project } from '../../types';

// Mock the auth context
jest.mock('../auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock the projects service
jest.mock('../projects', () => ({
  getProjects: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockGetProjects = getProjects as jest.Mock;

/**
 * Helper to create a mock user
 */
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

/**
 * Helper to create a mock project
 */
function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-1',
    user_id: 'test-user-id',
    title: 'Test Project',
    description: 'A test project',
    status: 'active',
    progress: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wrapper component for testing hooks
 */
function wrapper({ children }: { children: React.ReactNode }) {
  return <ProjectsProvider>{children}</ProjectsProvider>;
}

describe('ProjectsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ProjectsProvider', () => {
    it('renders children correctly', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      // Provider should render and provide context
      expect(result.current).toBeDefined();
      expect(result.current.projects).toEqual([]);
    });
  });

  describe('useProjects hook', () => {
    it('throws error when used outside provider', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Suppress error output for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useProjects());
      }).toThrow('useProjects must be used within a ProjectsProvider');

      consoleSpy.mockRestore();
    });

    it('provides context with expected shape', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      expect(result.current).toHaveProperty('projects');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshProjects');
      expect(typeof result.current.refreshProjects).toBe('function');
    });
  });

  describe('loading projects on mount', () => {
    it('loads projects when user is authenticated', async () => {
      const mockUser = createMockUser();
      const mockProjects = [
        createMockProject({ id: 'project-1', title: 'Project 1' }),
        createMockProject({ id: 'project-2', title: 'Project 2' }),
      ];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetProjects.mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetProjects).toHaveBeenCalledWith('test-user-id');
      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.error).toBeNull();
    });

    it('does not load projects when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      // Give some time for any potential async operations
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(result.current.projects).toEqual([]);
    });

    it('does not load projects while auth is still loading', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      renderHook(() => useProjects(), { wrapper });

      // Give some time for any potential async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGetProjects).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('sets loading to true while fetching projects', async () => {
      const mockUser = createMockUser();

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // Create a promise that we control
      let resolveProjects: (value: { data: Project[]; error: null }) => void;
      const projectsPromise = new Promise<{ data: Project[]; error: null }>((resolve) => {
        resolveProjects = resolve;
      });

      mockGetProjects.mockReturnValue(projectsPromise);

      const { result } = renderHook(() => useProjects(), { wrapper });

      // Should start loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveProjects!({ data: [], error: null });
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('sets error state when loading projects fails', async () => {
      const mockUser = createMockUser();
      const mockError = new Error('Failed to fetch projects');

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetProjects.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.projects).toEqual([]);
    });

    it('clears error on successful reload', async () => {
      const mockUser = createMockUser();
      const mockError = new Error('Initial error');
      const mockProjects = [createMockProject()];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // First call fails
      mockGetProjects.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      // Wait for initial error state
      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Second call succeeds
      mockGetProjects.mockResolvedValueOnce({
        data: mockProjects,
        error: null,
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refreshProjects();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.projects).toEqual(mockProjects);
    });
  });

  describe('refreshProjects', () => {
    it('reloads data from service', async () => {
      const mockUser = createMockUser();
      const initialProjects = [createMockProject({ id: 'project-1', title: 'Initial' })];
      const refreshedProjects = [
        createMockProject({ id: 'project-1', title: 'Initial' }),
        createMockProject({ id: 'project-2', title: 'New Project' }),
      ];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // Initial load
      mockGetProjects.mockResolvedValueOnce({
        data: initialProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.projects).toEqual(initialProjects);
      });

      // Refresh returns new data
      mockGetProjects.mockResolvedValueOnce({
        data: refreshedProjects,
        error: null,
      });

      await act(async () => {
        await result.current.refreshProjects();
      });

      expect(mockGetProjects).toHaveBeenCalledTimes(2);
      expect(result.current.projects).toEqual(refreshedProjects);
    });

    it('does nothing when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useProjects(), { wrapper });

      await act(async () => {
        await result.current.refreshProjects();
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
    });
  });

  describe('auth state changes', () => {
    it('reloads projects when user changes', async () => {
      const mockUser1 = createMockUser({ id: 'user-1' });
      const mockUser2 = createMockUser({ id: 'user-2' });
      const user1Projects = [createMockProject({ id: 'p1', user_id: 'user-1' })];
      const user2Projects = [createMockProject({ id: 'p2', user_id: 'user-2' })];

      mockUseAuth.mockReturnValue({
        user: mockUser1,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetProjects.mockResolvedValueOnce({
        data: user1Projects,
        error: null,
      });

      const { result, rerender } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.projects).toEqual(user1Projects);
      });

      // User changes
      mockUseAuth.mockReturnValue({
        user: mockUser2,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetProjects.mockResolvedValueOnce({
        data: user2Projects,
        error: null,
      });

      // Trigger re-render with new auth state
      rerender({});

      await waitFor(() => {
        expect(result.current.projects).toEqual(user2Projects);
      });

      expect(mockGetProjects).toHaveBeenCalledWith('user-1');
      expect(mockGetProjects).toHaveBeenCalledWith('user-2');
    });

    it('clears projects when user logs out', async () => {
      const mockUser = createMockUser();
      const mockProjects = [createMockProject()];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetProjects.mockResolvedValueOnce({
        data: mockProjects,
        error: null,
      });

      const { result, rerender } = renderHook(() => useProjects(), { wrapper });

      await waitFor(() => {
        expect(result.current.projects).toEqual(mockProjects);
      });

      // User logs out
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      rerender({});

      await waitFor(() => {
        expect(result.current.projects).toEqual([]);
      });
    });
  });
});
