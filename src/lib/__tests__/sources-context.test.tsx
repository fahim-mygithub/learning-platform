/**
 * Sources Context Tests
 *
 * Tests for the sources context provider:
 * - Provider renders children
 * - useSources throws outside provider
 * - Loads sources on mount when projectId provided
 * - Doesn't load when projectId is undefined
 * - Loading state during fetch
 * - Error state on failure
 * - refreshSources reloads data
 * - Upload progress tracking
 * - addUrlSource creates URL source
 * - uploadFileSource uploads file with progress
 * - removeSource deletes source
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { User } from '@supabase/supabase-js';

import { SourcesProvider, useSources } from '../sources-context';
import { useAuth } from '../auth-context';
import { getSources, createSource, deleteSource, uploadFile } from '../sources';
import type { Source } from '../../types';

// Mock the auth context
jest.mock('../auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock the sources service
jest.mock('../sources', () => ({
  getSources: jest.fn(),
  createSource: jest.fn(),
  deleteSource: jest.fn(),
  uploadFile: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockGetSources = getSources as jest.Mock;
const mockCreateSource = createSource as jest.Mock;
const mockDeleteSource = deleteSource as jest.Mock;
const mockUploadFile = uploadFile as jest.Mock;

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
 * Helper to create a mock source
 */
function createMockSource(overrides?: Partial<Source>): Source {
  return {
    id: 'source-1',
    project_id: 'test-project-id',
    user_id: 'test-user-id',
    type: 'pdf',
    name: 'Test Source',
    url: null,
    storage_path: 'test/path/file.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    status: 'completed',
    error_message: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wrapper component for testing hooks with projectId
 */
function createWrapper(projectId?: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SourcesProvider projectId={projectId}>{children}</SourcesProvider>;
  };
}

describe('SourcesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SourcesProvider', () => {
    it('renders children correctly', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      // Provider should render and provide context
      expect(result.current).toBeDefined();
      expect(result.current.sources).toEqual([]);
    });
  });

  describe('useSources hook', () => {
    it('throws error when used outside provider', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Suppress error output for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSources());
      }).toThrow('useSources must be used within a SourcesProvider');

      consoleSpy.mockRestore();
    });

    it('provides context with expected shape', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      expect(result.current).toHaveProperty('sources');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshSources');
      expect(result.current).toHaveProperty('uploadProgress');
      expect(result.current).toHaveProperty('addUrlSource');
      expect(result.current).toHaveProperty('uploadFileSource');
      expect(result.current).toHaveProperty('removeSource');
      expect(typeof result.current.refreshSources).toBe('function');
      expect(typeof result.current.addUrlSource).toBe('function');
      expect(typeof result.current.uploadFileSource).toBe('function');
      expect(typeof result.current.removeSource).toBe('function');
    });
  });

  describe('loading sources on mount', () => {
    it('loads sources when projectId is provided and user is authenticated', async () => {
      const mockUser = createMockUser();
      const mockSources = [
        createMockSource({ id: 'source-1', name: 'Source 1' }),
        createMockSource({ id: 'source-2', name: 'Source 2' }),
      ];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({
        data: mockSources,
        error: null,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSources).toHaveBeenCalledWith('test-project-id');
      expect(result.current.sources).toEqual(mockSources);
      expect(result.current.error).toBeNull();
    });

    it('does not load sources when projectId is undefined', async () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser(),
        isLoading: false,
        isAuthenticated: true,
      });

      const wrapper = createWrapper(undefined);
      const { result } = renderHook(() => useSources(), { wrapper });

      // Give some time for any potential async operations
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSources).not.toHaveBeenCalled();
      expect(result.current.sources).toEqual([]);
    });

    it('does not load sources when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      // Give some time for any potential async operations
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSources).not.toHaveBeenCalled();
      expect(result.current.sources).toEqual([]);
    });
  });

  describe('loading state', () => {
    it('sets loading to true while fetching sources', async () => {
      const mockUser = createMockUser();

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // Create a promise that we control
      let resolveSources: (value: { data: Source[]; error: null }) => void;
      const sourcesPromise = new Promise<{ data: Source[]; error: null }>((resolve) => {
        resolveSources = resolve;
      });

      mockGetSources.mockReturnValue(sourcesPromise);

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      // Should start loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveSources!({ data: [], error: null });
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('sets error state when loading sources fails', async () => {
      const mockUser = createMockUser();
      const mockError = new Error('Failed to fetch sources');

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.sources).toEqual([]);
    });

    it('clears error on successful reload', async () => {
      const mockUser = createMockUser();
      const mockError = new Error('Initial error');
      const mockSources = [createMockSource()];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // First call fails
      mockGetSources.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      // Wait for initial error state
      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Second call succeeds
      mockGetSources.mockResolvedValueOnce({
        data: mockSources,
        error: null,
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refreshSources();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.sources).toEqual(mockSources);
    });
  });

  describe('refreshSources', () => {
    it('reloads data from service', async () => {
      const mockUser = createMockUser();
      const initialSources = [createMockSource({ id: 'source-1', name: 'Initial' })];
      const refreshedSources = [
        createMockSource({ id: 'source-1', name: 'Initial' }),
        createMockSource({ id: 'source-2', name: 'New Source' }),
      ];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // Initial load
      mockGetSources.mockResolvedValueOnce({
        data: initialSources,
        error: null,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.sources).toEqual(initialSources);
      });

      // Refresh returns new data
      mockGetSources.mockResolvedValueOnce({
        data: refreshedSources,
        error: null,
      });

      await act(async () => {
        await result.current.refreshSources();
      });

      expect(mockGetSources).toHaveBeenCalledTimes(2);
      expect(result.current.sources).toEqual(refreshedSources);
    });

    it('does nothing when projectId is not provided', async () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser(),
        isLoading: false,
        isAuthenticated: true,
      });

      const wrapper = createWrapper(undefined);
      const { result } = renderHook(() => useSources(), { wrapper });

      await act(async () => {
        await result.current.refreshSources();
      });

      expect(mockGetSources).not.toHaveBeenCalled();
    });
  });

  describe('uploadProgress', () => {
    it('initially has null uploadProgress', async () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser(),
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: [], error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.uploadProgress).toBeNull();
    });
  });

  describe('addUrlSource', () => {
    it('creates a URL source and refreshes the list', async () => {
      const mockUser = createMockUser();
      const mockSource = createMockSource({
        type: 'url',
        url: 'https://example.com',
        name: 'Example URL',
      });

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: [], error: null });
      mockCreateSource.mockResolvedValue({ data: mockSource, error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Reset mock to track refresh call
      mockGetSources.mockResolvedValue({ data: [mockSource], error: null });

      await act(async () => {
        const response = await result.current.addUrlSource('https://example.com', 'Example URL');
        expect(response.error).toBeNull();
      });

      expect(mockCreateSource).toHaveBeenCalledWith('test-user-id', {
        project_id: 'test-project-id',
        type: 'url',
        url: 'https://example.com',
        name: 'Example URL',
        status: 'completed',
      });
    });

    it('returns error when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await act(async () => {
        const response = await result.current.addUrlSource('https://example.com', 'Test');
        expect(response.error).toEqual(new Error('User not authenticated'));
      });
    });

    it('returns error when projectId is not provided', async () => {
      mockUseAuth.mockReturnValue({
        user: createMockUser(),
        isLoading: false,
        isAuthenticated: true,
      });

      const wrapper = createWrapper(undefined);
      const { result } = renderHook(() => useSources(), { wrapper });

      await act(async () => {
        const response = await result.current.addUrlSource('https://example.com', 'Test');
        expect(response.error).toEqual(new Error('No project selected'));
      });
    });
  });

  describe('uploadFileSource', () => {
    it('uploads a file and tracks progress', async () => {
      const mockUser = createMockUser();
      const mockSource = createMockSource({
        type: 'pdf',
        name: 'test.pdf',
      });
      const mockFile = {
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        uri: 'file:///test.pdf',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: [], error: null });
      mockUploadFile.mockImplementation(
        async (userId, projectId, file, onProgress) => {
          // Simulate progress updates
          if (onProgress) {
            onProgress({ loaded: 512, total: 1024 });
            onProgress({ loaded: 1024, total: 1024 });
          }
          return { data: mockSource, error: null };
        }
      );

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockGetSources.mockResolvedValue({ data: [mockSource], error: null });

      await act(async () => {
        const response = await result.current.uploadFileSource(mockFile);
        expect(response.error).toBeNull();
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
        mockFile,
        expect.any(Function)
      );

      // After upload completes, progress should be reset to null
      expect(result.current.uploadProgress).toBeNull();
    });

    it('returns error when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      const mockFile = {
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        uri: 'file:///test.pdf',
      };

      await act(async () => {
        const response = await result.current.uploadFileSource(mockFile);
        expect(response.error).toEqual(new Error('User not authenticated'));
      });
    });
  });

  describe('removeSource', () => {
    it('deletes a source and refreshes the list', async () => {
      const mockUser = createMockUser();
      const mockSource = createMockSource({ id: 'source-to-delete' });

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: [mockSource], error: null });
      mockDeleteSource.mockResolvedValue({ error: null });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.sources).toEqual([mockSource]);
      });

      // After delete, list should be empty
      mockGetSources.mockResolvedValue({ data: [], error: null });

      await act(async () => {
        const response = await result.current.removeSource('source-to-delete');
        expect(response.error).toBeNull();
      });

      expect(mockDeleteSource).toHaveBeenCalledWith('source-to-delete');
    });

    it('returns error when deletion fails', async () => {
      const mockUser = createMockUser();
      const mockError = new Error('Failed to delete');

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: [], error: null });
      mockDeleteSource.mockResolvedValue({ error: mockError });

      const wrapper = createWrapper('test-project-id');
      const { result } = renderHook(() => useSources(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.removeSource('source-id');
        expect(response.error).toEqual(mockError);
      });
    });
  });

  describe('projectId changes', () => {
    it('reloads sources when projectId changes', async () => {
      const mockUser = createMockUser();
      const project1Sources = [createMockSource({ id: 's1', project_id: 'project-1' })];
      const project2Sources = [createMockSource({ id: 's2', project_id: 'project-2' })];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValueOnce({ data: project1Sources, error: null });

      // Start with project-1
      const { result } = renderHook(() => useSources(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SourcesProvider projectId="project-1">{children}</SourcesProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.sources).toEqual(project1Sources);
      });

      expect(mockGetSources).toHaveBeenCalledWith('project-1');
    });

    it('clears sources when projectId becomes undefined', async () => {
      const mockUser = createMockUser();
      const mockSources = [createMockSource()];

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      });

      mockGetSources.mockResolvedValue({ data: mockSources, error: null });

      let projectId: string | undefined = 'test-project-id';

      const DynamicWrapper = ({ children }: { children: React.ReactNode }) => (
        <SourcesProvider projectId={projectId}>{children}</SourcesProvider>
      );

      const { result, rerender } = renderHook(() => useSources(), {
        wrapper: DynamicWrapper,
      });

      await waitFor(() => {
        expect(result.current.sources).toEqual(mockSources);
      });

      // Change projectId to undefined
      projectId = undefined;
      rerender({});

      await waitFor(() => {
        expect(result.current.sources).toEqual([]);
      });
    });
  });
});
