/**
 * SourcesSection Component Tests
 *
 * Tests for the SourcesSection component covering:
 * - Empty state display with add source CTA
 * - Sources list display with SourceCards
 * - Loading state
 * - Delete functionality
 * - Upload progress passing to SourceCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { SourcesSection } from '../SourcesSection';
import type { Source } from '../../../types/database';

// Mock the useSources hook
const mockUseSources = {
  sources: [] as Source[],
  loading: false,
  error: null as Error | null,
  uploadProgress: null as number | null,
  removeSource: jest.fn(),
  refreshSources: jest.fn(),
  addUrlSource: jest.fn(),
  uploadFileSource: jest.fn(),
};

jest.mock('../../../lib/sources-context', () => ({
  useSources: () => mockUseSources,
}));

/**
 * Helper function to create a mock Source object
 */
function createMockSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'source-1',
    project_id: 'project-1',
    user_id: 'user-1',
    type: 'video',
    name: 'Test Source',
    url: null,
    storage_path: null,
    file_size: null,
    mime_type: null,
    status: 'completed',
    error_message: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Reset mock state before each test
 */
beforeEach(() => {
  mockUseSources.sources = [];
  mockUseSources.loading = false;
  mockUseSources.error = null;
  mockUseSources.uploadProgress = null;
  mockUseSources.removeSource.mockClear();
  mockUseSources.refreshSources.mockClear();
  mockUseSources.addUrlSource.mockClear();
  mockUseSources.uploadFileSource.mockClear();
});

describe('SourcesSection Component', () => {
  describe('Loading State', () => {
    it('renders loading spinner when loading is true', () => {
      mockUseSources.loading = true;

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByTestId('sources-section-loading')).toBeTruthy();
    });

    it('does not render empty state or sources list when loading', () => {
      mockUseSources.loading = true;

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.queryByTestId('sources-section-empty')).toBeNull();
      expect(screen.queryByTestId('sources-section-list')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when sources array is empty', () => {
      mockUseSources.sources = [];
      mockUseSources.loading = false;

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByTestId('sources-section-empty')).toBeTruthy();
    });

    it('displays empty state message', () => {
      mockUseSources.sources = [];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByText(/no sources/i)).toBeTruthy();
    });

    it('renders add source CTA button in empty state', () => {
      mockUseSources.sources = [];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByTestId('sources-section-empty-add-button')).toBeTruthy();
    });

    it('calls onAddSource when empty state CTA is pressed', () => {
      mockUseSources.sources = [];
      const onAddSource = jest.fn();

      render(<SourcesSection onAddSource={onAddSource} />);

      const addButton = screen.getByTestId('sources-section-empty-add-button');
      fireEvent.press(addButton);

      expect(onAddSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sources List Display', () => {
    it('renders sources list when sources exist', () => {
      mockUseSources.sources = [createMockSource()];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByTestId('sources-section-list')).toBeTruthy();
    });

    it('does not render empty state when sources exist', () => {
      mockUseSources.sources = [createMockSource()];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.queryByTestId('sources-section-empty')).toBeNull();
    });

    it('renders a SourceCard for each source', () => {
      mockUseSources.sources = [
        createMockSource({ id: 'source-1', name: 'Video 1' }),
        createMockSource({ id: 'source-2', name: 'PDF Document' }),
        createMockSource({ id: 'source-3', name: 'Web Link' }),
      ];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByText('Video 1')).toBeTruthy();
      expect(screen.getByText('PDF Document')).toBeTruthy();
      expect(screen.getByText('Web Link')).toBeTruthy();
    });

    it('renders add source button when sources exist', () => {
      mockUseSources.sources = [createMockSource()];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByTestId('sources-section-add-button')).toBeTruthy();
    });

    it('calls onAddSource when add button is pressed', () => {
      mockUseSources.sources = [createMockSource()];
      const onAddSource = jest.fn();

      render(<SourcesSection onAddSource={onAddSource} />);

      const addButton = screen.getByTestId('sources-section-add-button');
      fireEvent.press(addButton);

      expect(onAddSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Functionality', () => {
    it('calls removeSource when SourceCard delete is pressed', () => {
      const source = createMockSource({ id: 'source-to-delete' });
      mockUseSources.sources = [source];

      render(<SourcesSection onAddSource={jest.fn()} />);

      const deleteButton = screen.getByTestId('source-card-delete-button');
      fireEvent.press(deleteButton);

      expect(mockUseSources.removeSource).toHaveBeenCalledWith('source-to-delete');
    });
  });

  describe('Upload Progress', () => {
    it('passes uploadProgress to SourceCard when source is uploading', () => {
      mockUseSources.sources = [createMockSource({ id: 'uploading-source', status: 'uploading' })];
      mockUseSources.uploadProgress = 65;

      render(<SourcesSection onAddSource={jest.fn()} />);

      // The progress should be displayed on the uploading source card
      expect(screen.getByText('65%')).toBeTruthy();
    });

    it('does not show upload progress on non-uploading sources', () => {
      mockUseSources.sources = [
        createMockSource({ id: 'uploading-source', status: 'uploading' }),
        createMockSource({ id: 'completed-source', status: 'completed', name: 'Completed Source' }),
      ];
      mockUseSources.uploadProgress = 50;

      render(<SourcesSection onAddSource={jest.fn()} />);

      // Only the uploading source should show progress
      expect(screen.getByText('50%')).toBeTruthy();
      // Completed source should show its status, not progress
      expect(screen.getByText('Completed Source')).toBeTruthy();
    });
  });

  describe('Section Header', () => {
    it('renders section header', () => {
      mockUseSources.sources = [];

      render(<SourcesSection onAddSource={jest.fn()} />);

      expect(screen.getByText('Sources')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      mockUseSources.sources = [];

      render(<SourcesSection onAddSource={jest.fn()} />);

      const container = screen.getByTestId('sources-section');
      expect(container).toBeTruthy();
    });

    it('add button has accessibility label', () => {
      mockUseSources.sources = [createMockSource()];

      render(<SourcesSection onAddSource={jest.fn()} />);

      const addButton = screen.getByTestId('sources-section-add-button');
      expect(addButton.props.accessibilityLabel).toBeDefined();
    });
  });
});
