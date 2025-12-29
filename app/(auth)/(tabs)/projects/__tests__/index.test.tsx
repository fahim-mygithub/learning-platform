/**
 * Projects List Screen Tests
 *
 * Tests for the projects list screen including:
 * - Loading state with skeleton
 * - Empty state with illustration and CTA
 * - List of project cards with title, progress, last accessed
 * - Pull-to-refresh functionality
 * - Create project FAB/button
 * - Sorting by most recently accessed
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ProjectsScreen from '../index';
import type { Project } from '@/src/types';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock projects context
const mockRefreshProjects = jest.fn();
const mockUseProjects = jest.fn();
jest.mock('@/src/lib/projects-context', () => ({
  useProjects: () => mockUseProjects(),
}));

/**
 * Helper to create a mock project
 */
function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-1',
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

describe('ProjectsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      refreshProjects: mockRefreshProjects,
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: true,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
    });

    it('shows multiple skeleton cards while loading', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: true,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      // Should show skeleton cards (at least 3)
      expect(screen.getAllByTestId(/skeleton-card-/).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no projects exist', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    it('shows empty state illustration', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('empty-state-illustration')).toBeTruthy();
    });

    it('shows empty state message', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByText('No projects yet')).toBeTruthy();
      expect(
        screen.getByText('Create your first learning project to get started')
      ).toBeTruthy();
    });

    it('shows create project CTA button in empty state', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const createButton = screen.getByTestId('empty-state-create-button');
      expect(createButton).toBeTruthy();
      expect(screen.getByText('Create Project')).toBeTruthy();
    });

    it('navigates to create project when empty state CTA is pressed', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const createButton = screen.getByTestId('empty-state-create-button');
      fireEvent.press(createButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/create');
    });
  });

  describe('Project List', () => {
    it('renders FlatList with projects when projects exist', () => {
      const mockProjects = [
        createMockProject({ id: 'project-1', title: 'Project One' }),
        createMockProject({ id: 'project-2', title: 'Project Two' }),
      ];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('projects-list')).toBeTruthy();
      expect(screen.getByText('Project One')).toBeTruthy();
      expect(screen.getByText('Project Two')).toBeTruthy();
    });

    it('renders project card with title', () => {
      const mockProjects = [createMockProject({ title: 'My Learning Project' })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByText('My Learning Project')).toBeTruthy();
    });

    it('renders project card with progress bar', () => {
      const mockProjects = [createMockProject({ id: 'project-1', progress: 75 })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('project-card-project-1-progress')).toBeTruthy();
    });

    it('renders project card with progress percentage text', () => {
      const mockProjects = [createMockProject({ progress: 75 })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('renders project card with last accessed time', () => {
      // Use a fixed date that we can verify
      const lastAccessed = '2024-01-20T10:00:00Z';
      const mockProjects = [createMockProject({ last_accessed_at: lastAccessed })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      // Should show "Last accessed:" label
      expect(screen.getByText(/Last accessed/)).toBeTruthy();
    });

    it('sorts projects by most recently accessed', () => {
      const mockProjects = [
        createMockProject({
          id: 'old-project',
          title: 'Old Project',
          last_accessed_at: '2024-01-10T00:00:00Z',
        }),
        createMockProject({
          id: 'recent-project',
          title: 'Recent Project',
          last_accessed_at: '2024-01-20T00:00:00Z',
        }),
        createMockProject({
          id: 'middle-project',
          title: 'Middle Project',
          last_accessed_at: '2024-01-15T00:00:00Z',
        }),
      ];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      // Get all project cards by their test IDs
      const projectCards = screen.getAllByTestId(/project-card-/);

      // First card should be the most recent
      expect(projectCards[0].props.testID).toBe('project-card-recent-project');
    });

    it('navigates to project detail when card is pressed', () => {
      const mockProjects = [createMockProject({ id: 'project-123' })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const projectCard = screen.getByTestId('project-card-project-123');
      fireEvent.press(projectCard);

      expect(mockPush).toHaveBeenCalledWith('/projects/project-123');
    });
  });

  describe('Pull to Refresh', () => {
    it('supports pull-to-refresh on FlatList', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const flatList = screen.getByTestId('projects-list');

      // FlatList should have refresh control
      expect(flatList.props.refreshControl).toBeDefined();
    });

    it('calls refreshProjects when pull-to-refresh is triggered', async () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const flatList = screen.getByTestId('projects-list');

      // Simulate refresh
      const refreshControl = flatList.props.refreshControl;
      refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockRefreshProjects).toHaveBeenCalled();
      });
    });

    it('shows refreshing indicator during refresh', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: true, // Loading state during refresh
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const flatList = screen.getByTestId('projects-list');
      const refreshControl = flatList.props.refreshControl;

      // When loading is true, refreshing should be true
      expect(refreshControl.props.refreshing).toBe(true);
    });
  });

  describe('Create Project Button (FAB)', () => {
    it('shows FAB when projects exist', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('create-project-fab')).toBeTruthy();
    });

    it('FAB navigates to create project screen when pressed', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const fab = screen.getByTestId('create-project-fab');
      fireEvent.press(fab);

      expect(mockPush).toHaveBeenCalledWith('/projects/create');
    });

    it('FAB has minimum 44px touch target for accessibility', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const fab = screen.getByTestId('create-project-fab');
      const style = fab.props.style;

      // Check that FAB meets minimum touch target
      // Style could be an array or object
      const flatStyle = Array.isArray(style)
        ? style.reduce((acc, s) => ({ ...acc, ...s }), {})
        : style;

      expect(flatStyle.minWidth).toBeGreaterThanOrEqual(44);
      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('FAB has accessibility label', () => {
      const mockProjects = [createMockProject()];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const fab = screen.getByTestId('create-project-fab');
      expect(fab.props.accessibilityLabel).toBe('Create new project');
    });
  });

  describe('Error State', () => {
    it('shows error message when error occurs', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: new Error('Failed to load projects'),
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('error-state')).toBeTruthy();
      expect(screen.getByText('Failed to load projects')).toBeTruthy();
    });

    it('shows retry button on error', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: new Error('Network error'),
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    it('calls refreshProjects when retry button is pressed', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: false,
        error: new Error('Network error'),
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.press(retryButton);

      expect(mockRefreshProjects).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('project cards are accessible with role', () => {
      const mockProjects = [createMockProject({ id: 'project-1', title: 'Accessible Project' })];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const projectCard = screen.getByTestId('project-card-project-1');
      expect(projectCard.props.accessibilityRole).toBe('button');
    });

    it('project cards have accessibility label with title and progress', () => {
      const mockProjects = [
        createMockProject({ id: 'project-1', title: 'My Project', progress: 75 }),
      ];

      mockUseProjects.mockReturnValue({
        projects: mockProjects,
        loading: false,
        error: null,
        refreshProjects: mockRefreshProjects,
      });

      render(<ProjectsScreen />);

      const projectCard = screen.getByTestId('project-card-project-1');
      expect(projectCard.props.accessibilityLabel).toContain('My Project');
      expect(projectCard.props.accessibilityLabel).toContain('75%');
    });
  });
});
