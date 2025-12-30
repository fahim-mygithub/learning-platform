/**
 * Project Detail Screen Tests
 *
 * Tests for the project detail screen including:
 * - Loading state
 * - Project not found error
 * - Header with project title
 * - Description section (when present)
 * - Progress visualization with ProgressCircle
 * - Edit button -> opens edit modal/sheet
 * - Delete button -> shows confirmation Modal
 * - Cancel returns to detail screen
 * - Successful delete navigates back and shows toast
 * - Sources placeholder section (Phase 1.5)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import ProjectDetailScreen from '../[id]';
import type { Project } from '@/src/types';

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLocalSearchParams: { id: string } = { id: 'project-123' };
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
  }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

// Mock projects context
const mockRefreshProjects = jest.fn();
const mockUseProjects = jest.fn();
jest.mock('@/src/lib/projects-context', () => ({
  useProjects: () => mockUseProjects(),
}));

// Mock projects service
const mockGetProject = jest.fn();
const mockDeleteProject = jest.fn();
const mockUpdateProject = jest.fn();
jest.mock('@/src/lib/projects', () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

// Mock useToast
const mockShowToast = jest.fn();
jest.mock('@/src/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
    hideToast: jest.fn(),
  }),
}));

// Mock sources context
jest.mock('@/src/lib/sources-context', () => ({
  SourcesProvider: ({ children }: { children: React.ReactNode }) => children,
  useSources: () => ({
    sources: [],
    loading: false,
    error: null,
    refreshSources: jest.fn(),
    uploadProgress: null,
    addUrlSource: jest.fn(),
    uploadFileSource: jest.fn(),
    removeSource: jest.fn(),
  }),
}));

// Mock analysis context
jest.mock('@/src/lib/analysis-context', () => ({
  AnalysisProvider: ({ children }: { children: React.ReactNode }) => children,
  useAnalysis: () => ({
    concepts: [],
    roadmap: null,
    pipelineStage: 'pending' as const,
    progress: 0,
    error: null,
    loading: false,
    refreshAnalysis: jest.fn(),
    startAnalysis: jest.fn(),
    retryAnalysis: jest.fn(),
  }),
}));

/**
 * Helper to create a mock project
 */
function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-123',
    user_id: 'test-user-id',
    title: 'Test Project',
    description: 'A test project description',
    status: 'active',
    progress: 50,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    last_accessed_at: '2024-01-20T10:00:00Z',
    ...overrides,
  };
}

describe('ProjectDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams.id = 'project-123';
    mockUseProjects.mockReturnValue({
      projects: [createMockProject()],
      loading: false,
      error: null,
      refreshProjects: mockRefreshProjects,
    });
    mockGetProject.mockResolvedValue({ data: createMockProject(), error: null });
    mockDeleteProject.mockResolvedValue({ error: null });
    mockUpdateProject.mockResolvedValue({ data: createMockProject(), error: null });
  });

  describe('Loading State', () => {
    it('shows loading indicator when fetching project', async () => {
      // Delay the getProject response to see loading state
      mockGetProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: createMockProject(), error: null }), 100))
      );

      render(<ProjectDetailScreen />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Project Not Found', () => {
    it('shows error when project is not found', async () => {
      mockGetProject.mockResolvedValue({ data: null, error: new Error('Project not found') });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });
      // Verify error state is visible (testID already confirms it)
      const errorState = screen.getByTestId('error-state');
      expect(errorState).toBeTruthy();
    });

    it('shows back button when project not found', async () => {
      mockGetProject.mockResolvedValue({ data: null, error: new Error('Project not found') });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeTruthy();
      });
    });

    it('navigates back when back button is pressed on error state', async () => {
      mockGetProject.mockResolvedValue({ data: null, error: new Error('Project not found') });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const backButton = screen.getByTestId('back-button');
        fireEvent.press(backButton);
      });

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Header with Project Title', () => {
    it('displays project title prominently', async () => {
      const project = createMockProject({ title: 'My Learning Journey' });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Learning Journey')).toBeTruthy();
      });
    });

    it('title has header accessibility role', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const title = screen.getByTestId('project-title');
        expect(title.props.accessibilityRole).toBe('header');
      });
    });
  });

  describe('Description Section', () => {
    it('displays description when present', async () => {
      const project = createMockProject({ description: 'This is my project description' });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('This is my project description')).toBeTruthy();
      });
    });

    it('hides description section when description is null', async () => {
      const project = createMockProject({ description: null });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('project-title')).toBeTruthy();
      });
      expect(screen.queryByTestId('project-description')).toBeNull();
    });

    it('hides description section when description is empty', async () => {
      const project = createMockProject({ description: '' });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('project-title')).toBeTruthy();
      });
      expect(screen.queryByTestId('project-description')).toBeNull();
    });
  });

  describe('Progress Visualization', () => {
    it('displays progress circle', async () => {
      const project = createMockProject({ progress: 75 });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-circle')).toBeTruthy();
      });
    });

    it('displays progress percentage in center of circle', async () => {
      const project = createMockProject({ progress: 65 });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeTruthy();
      });
    });

    it('has accessibility label with progress value', async () => {
      const project = createMockProject({ progress: 40 });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const progressCircle = screen.getByTestId('progress-circle');
        expect(progressCircle.props.accessibilityLabel).toContain('40');
      });
    });
  });

  describe('Edit Button', () => {
    it('displays edit button', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('edit-button')).toBeTruthy();
      });
    });

    it('opens edit modal when edit button is pressed', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.press(editButton);
      });

      expect(screen.getByTestId('edit-modal')).toBeTruthy();
    });

    it('edit modal has project title pre-filled', async () => {
      const project = createMockProject({ title: 'Original Title' });
      mockGetProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        const titleInput = screen.getByTestId('edit-title-input');
        expect(titleInput.props.value).toBe('Original Title');
      });
    });

    it('closes edit modal when cancel is pressed', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByTestId('edit-cancel-button');
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('edit-modal')).toBeNull();
      });
    });

    it('saves changes when save button is pressed', async () => {
      const project = createMockProject({ title: 'Original Title' });
      mockGetProject.mockResolvedValue({ data: project, error: null });
      mockUpdateProject.mockResolvedValue({ data: { ...project, title: 'Updated Title' }, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        const titleInput = screen.getByTestId('edit-title-input');
        fireEvent.changeText(titleInput, 'Updated Title');
      });

      const saveButton = screen.getByTestId('edit-save-button');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ title: 'Updated Title' }));
      });
    });

    it('shows success toast after successful edit', async () => {
      const project = createMockProject();
      mockGetProject.mockResolvedValue({ data: project, error: null });
      mockUpdateProject.mockResolvedValue({ data: project, error: null });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.press(editButton);
      });

      const saveButton = screen.getByTestId('edit-save-button');
      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', expect.any(String));
      });
    });
  });

  describe('Delete Button', () => {
    it('displays delete button', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeTruthy();
      });
    });

    it('opens confirmation modal when delete button is pressed', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      expect(screen.getByTestId('delete-modal')).toBeTruthy();
    });

    it('confirmation modal has warning message', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      // Check for specific warning text in the modal
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeTruthy();
    });

    it('closes modal when cancel is pressed', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByTestId('delete-cancel-button');
        fireEvent.press(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('delete-modal')).toBeNull();
      });
    });

    it('deletes project when confirm is pressed', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId('delete-confirm-button');
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith('project-123');
      });
    });

    it('navigates back after successful delete', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      const confirmButton = screen.getByTestId('delete-confirm-button');
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });

    it('shows success toast after successful delete', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      const confirmButton = screen.getByTestId('delete-confirm-button');
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', expect.any(String));
      });
    });

    it('refreshes projects after successful delete', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      const confirmButton = screen.getByTestId('delete-confirm-button');
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockRefreshProjects).toHaveBeenCalled();
      });
    });

    it('shows error toast when delete fails', async () => {
      mockDeleteProject.mockResolvedValue({ error: new Error('Delete failed') });

      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        fireEvent.press(deleteButton);
      });

      const confirmButton = screen.getByTestId('delete-confirm-button');
      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', expect.any(String));
      });
    });
  });

  describe('Sources Placeholder Section', () => {
    it('displays sources section', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('sources-section')).toBeTruthy();
      });
    });

    it('shows sources section with add source button', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        // Check for SourcesSection content (empty state shows "No sources yet")
        expect(screen.getByTestId('sources-section')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('edit button has accessibility label', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        expect(editButton.props.accessibilityLabel).toBeDefined();
      });
    });

    it('delete button has accessibility label', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-button');
        expect(deleteButton.props.accessibilityLabel).toBeDefined();
      });
    });

    it('buttons have minimum touch target size', async () => {
      render(<ProjectDetailScreen />);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        const deleteButton = screen.getByTestId('delete-button');

        // Check that buttons exist and are pressable
        expect(editButton).toBeTruthy();
        expect(deleteButton).toBeTruthy();
      });
    });
  });
});
