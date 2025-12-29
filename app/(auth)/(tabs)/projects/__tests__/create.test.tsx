/**
 * Create Project Screen Tests
 *
 * Tests for the create project form screen including:
 * - Form display with title (required) and description (optional)
 * - Title validation on submit
 * - Successful project creation with navigation and toast
 * - Loading state during submission
 * - Cancel/back navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import CreateProjectScreen from '../create';

// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

// Mock projects service
const mockCreateProject = jest.fn();
jest.mock('@/src/lib/projects', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// Mock projects context
const mockRefreshProjects = jest.fn();
jest.mock('@/src/lib/projects-context', () => ({
  useProjects: () => ({
    refreshProjects: mockRefreshProjects,
  }),
}));

// Mock auth context
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
jest.mock('@/src/lib/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock toast
const mockShowToast = jest.fn();
jest.mock('@/src/components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

describe('CreateProjectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProject.mockResolvedValue({
      data: { id: 'new-project-id', title: 'Test Project' },
      error: null,
    });
  });

  describe('Form Display', () => {
    it('renders title input with label', () => {
      render(<CreateProjectScreen />);

      expect(screen.getByTestId('title-input')).toBeTruthy();
      expect(screen.getByText('Title')).toBeTruthy();
    });

    it('marks title as required', () => {
      render(<CreateProjectScreen />);

      // Title label should indicate it's required
      expect(screen.getByText(/Title/)).toBeTruthy();
    });

    it('renders description input with label', () => {
      render(<CreateProjectScreen />);

      expect(screen.getByTestId('description-input')).toBeTruthy();
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('description input is multiline', () => {
      render(<CreateProjectScreen />);

      const descriptionInput = screen.getByTestId('description-input-input');
      expect(descriptionInput.props.multiline).toBe(true);
    });

    it('renders create button', () => {
      render(<CreateProjectScreen />);

      expect(screen.getByTestId('create-button')).toBeTruthy();
      expect(screen.getByText('Create Project')).toBeTruthy();
    });

    it('renders cancel button', () => {
      render(<CreateProjectScreen />);

      expect(screen.getByTestId('cancel-button')).toBeTruthy();
    });
  });

  describe('Validation on Submit', () => {
    it('shows validation error when title is empty on submit', async () => {
      render(<CreateProjectScreen />);

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('title-input-error')).toBeTruthy();
      });
    });

    it('displays specific error message for empty title', async () => {
      render(<CreateProjectScreen />);

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeTruthy();
      });
    });

    it('does not submit form when title is empty', async () => {
      render(<CreateProjectScreen />);

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });

    it('clears validation error when user types in title', async () => {
      render(<CreateProjectScreen />);

      // Trigger validation error
      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('title-input-error')).toBeTruthy();
      });

      // Type in title field
      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'New Project');

      await waitFor(() => {
        expect(screen.queryByTestId('title-input-error')).toBeNull();
      });
    });

    it('validates title with only whitespace as empty', async () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, '   ');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeTruthy();
        expect(mockCreateProject).not.toHaveBeenCalled();
      });
    });
  });

  describe('Successful Creation', () => {
    it('calls createProject with correct data', async () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      const descriptionInput = screen.getByTestId('description-input-input');

      fireEvent.changeText(titleInput, 'My New Project');
      fireEvent.changeText(descriptionInput, 'Project description');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith('test-user-id', {
          title: 'My New Project',
          description: 'Project description',
        });
      });
    });

    it('calls createProject with null description when empty', async () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith('test-user-id', {
          title: 'My New Project',
          description: null,
        });
      });
    });

    it('refreshes projects after successful creation', async () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockRefreshProjects).toHaveBeenCalled();
      });
    });

    it('navigates to new project detail after successful creation', async () => {
      mockCreateProject.mockResolvedValue({
        data: { id: 'created-project-123', title: 'Test' },
        error: null,
      });

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/projects/created-project-123');
      });
    });

    it('shows success toast after creation', async () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', 'Project created successfully');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state on button during submission', async () => {
      // Make createProject hang to test loading state
      mockCreateProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('create-button-loading')).toBeTruthy();
      });
    });

    it('disables title input during submission', async () => {
      mockCreateProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        const input = screen.getByTestId('title-input-input');
        expect(input.props.editable).toBe(false);
      });
    });

    it('disables description input during submission', async () => {
      mockCreateProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        const descInput = screen.getByTestId('description-input-input');
        expect(descInput.props.editable).toBe(false);
      });
    });

    it('disables cancel button during submission', async () => {
      mockCreateProject.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        const cancelButton = screen.getByTestId('cancel-button');
        expect(cancelButton.props.accessibilityState.disabled).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when creation fails', async () => {
      mockCreateProject.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to create project');
      });
    });

    it('does not navigate on creation error', async () => {
      mockCreateProject.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('re-enables form after error', async () => {
      mockCreateProject.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      fireEvent.changeText(titleInput, 'My New Project');

      const createButton = screen.getByTestId('create-button');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });

      // Form should be re-enabled
      const titleInputAfter = screen.getByTestId('title-input-input');
      expect(titleInputAfter.props.editable).toBe(true);
    });
  });

  describe('Cancel/Back Navigation', () => {
    it('navigates back when cancel button is pressed', () => {
      render(<CreateProjectScreen />);

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('create button has minimum 44px touch target', () => {
      render(<CreateProjectScreen />);

      const createButton = screen.getByTestId('create-button');
      const style = createButton.props.style;

      // Style could be an array or object
      const flatStyle = Array.isArray(style)
        ? style.reduce((acc: Record<string, unknown>, s: Record<string, unknown>) => ({ ...acc, ...s }), {})
        : style;

      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('cancel button has minimum 44px touch target', () => {
      render(<CreateProjectScreen />);

      const cancelButton = screen.getByTestId('cancel-button');
      const style = cancelButton.props.style;

      const flatStyle = Array.isArray(style)
        ? style.reduce((acc: Record<string, unknown>, s: Record<string, unknown>) => ({ ...acc, ...s }), {})
        : style;

      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('title input has accessibility label', () => {
      render(<CreateProjectScreen />);

      const titleInput = screen.getByTestId('title-input-input');
      expect(titleInput.props.accessibilityLabel).toBeTruthy();
    });

    it('description input has accessibility label', () => {
      render(<CreateProjectScreen />);

      const descriptionInput = screen.getByTestId('description-input-input');
      expect(descriptionInput.props.accessibilityLabel).toBeTruthy();
    });
  });
});
