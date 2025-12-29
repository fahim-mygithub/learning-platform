/**
 * AddSourceSheet Component Tests
 *
 * Tests for the AddSourceSheet component covering:
 * - Rendering with tabs (Upload File, Add URL)
 * - File upload flow via FileUploadButton
 * - URL submission flow via UrlInputForm
 * - Loading states during operations
 * - Success toast and sheet close on completion
 * - Error toast on failure
 * - Tab switching behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import { AddSourceSheet } from '../AddSourceSheet';
import type { UploadFile } from '../../../lib/sources';

// Mock the useSources hook
const mockUseSources = {
  sources: [],
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

// Mock the useToast hook
const mockShowToast = jest.fn();
const mockHideToast = jest.fn();

jest.mock('../../ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
    hideToast: mockHideToast,
  }),
}));

// Mock expo-document-picker for FileUploadButton
const mockGetDocumentAsync = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

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
  mockUseSources.addUrlSource.mockClear().mockResolvedValue({ error: null });
  mockUseSources.uploadFileSource.mockClear().mockResolvedValue({ error: null });
  mockShowToast.mockClear();
  mockHideToast.mockClear();
  mockGetDocumentAsync.mockClear();
});

describe('AddSourceSheet Component', () => {
  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByTestId('add-source-sheet')).toBeTruthy();
    });

    it('does not render content when visible is false', () => {
      render(<AddSourceSheet visible={false} onClose={jest.fn()} />);

      expect(screen.queryByTestId('add-source-sheet-content')).toBeNull();
    });

    it('renders sheet title', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByText('Add Source')).toBeTruthy();
    });

    it('renders upload file tab option', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByTestId('add-source-sheet-tab-file')).toBeTruthy();
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    it('renders add url tab option', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByTestId('add-source-sheet-tab-url')).toBeTruthy();
      expect(screen.getByText('Add URL')).toBeTruthy();
    });
  });

  describe('Tab Switching', () => {
    it('shows file upload content by default', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByTestId('add-source-sheet-file-content')).toBeTruthy();
      expect(screen.queryByTestId('add-source-sheet-url-content')).toBeNull();
    });

    it('switches to URL content when URL tab is pressed', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      expect(screen.queryByTestId('add-source-sheet-file-content')).toBeNull();
      expect(screen.getByTestId('add-source-sheet-url-content')).toBeTruthy();
    });

    it('switches back to file content when file tab is pressed', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));
      expect(screen.getByTestId('add-source-sheet-url-content')).toBeTruthy();

      // Switch back to file tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-file'));
      expect(screen.getByTestId('add-source-sheet-file-content')).toBeTruthy();
    });

    it('highlights active tab', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      const fileTab = screen.getByTestId('add-source-sheet-tab-file');
      const urlTab = screen.getByTestId('add-source-sheet-tab-url');

      // File tab should be active by default
      expect(fileTab.props.accessibilityState?.selected).toBe(true);
      expect(urlTab.props.accessibilityState?.selected).toBe(false);

      // Switch to URL tab
      fireEvent.press(urlTab);

      expect(screen.getByTestId('add-source-sheet-tab-file').props.accessibilityState?.selected).toBe(false);
      expect(screen.getByTestId('add-source-sheet-tab-url').props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('File Upload Flow', () => {
    it('renders FileUploadButton in file tab', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByTestId('add-source-sheet-file-upload-button')).toBeTruthy();
    });

    it('calls uploadFileSource when file is selected', async () => {
      const mockFile: UploadFile = {
        name: 'test-video.mp4',
        type: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{
          name: mockFile.name,
          mimeType: mockFile.type,
          size: mockFile.size,
          uri: mockFile.uri,
        }],
      });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(mockUseSources.uploadFileSource).toHaveBeenCalledWith(mockFile);
      });
    });

    it('shows success toast on successful file upload', async () => {
      mockUseSources.uploadFileSource.mockResolvedValueOnce({ error: null });

      const mockFile = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', 'File uploaded successfully');
      });
    });

    it('closes sheet on successful file upload', async () => {
      mockUseSources.uploadFileSource.mockResolvedValueOnce({ error: null });
      const onClose = jest.fn();

      const mockFile = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      render(<AddSourceSheet visible={true} onClose={onClose} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error toast on failed file upload', async () => {
      mockUseSources.uploadFileSource.mockResolvedValueOnce({
        error: new Error('Upload failed'),
      });

      const mockFile = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Upload failed');
      });
    });

    it('does not close sheet on failed file upload', async () => {
      mockUseSources.uploadFileSource.mockResolvedValueOnce({
        error: new Error('Upload failed'),
      });
      const onClose = jest.fn();

      const mockFile = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      render(<AddSourceSheet visible={true} onClose={onClose} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Upload failed');
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('shows loading state during file upload', async () => {
      let resolveUpload: (value: { error: Error | null }) => void;
      mockUseSources.uploadFileSource.mockImplementation(
        () => new Promise((resolve) => { resolveUpload = resolve; })
      );

      const mockFile = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockFile],
      });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      fireEvent.press(screen.getByTestId('add-source-sheet-file-upload-button'));

      await waitFor(() => {
        expect(screen.getByTestId('add-source-sheet-file-upload-button-loading')).toBeTruthy();
      });

      await act(async () => {
        resolveUpload!({ error: null });
      });
    });
  });

  describe('URL Submission Flow', () => {
    it('renders UrlInputForm in URL tab', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      expect(screen.getByTestId('add-source-sheet-url-form')).toBeTruthy();
    });

    it('calls addUrlSource when URL form is submitted', async () => {
      mockUseSources.addUrlSource.mockResolvedValueOnce({ error: null });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      // Fill in URL
      const urlInput = screen.getByTestId('add-source-sheet-url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/video');

      // Submit
      fireEvent.press(screen.getByTestId('add-source-sheet-url-form-submit-button'));

      await waitFor(() => {
        expect(mockUseSources.addUrlSource).toHaveBeenCalledWith(
          'https://example.com/video',
          'example.com/video'
        );
      });
    });

    it('shows success toast on successful URL add', async () => {
      mockUseSources.addUrlSource.mockResolvedValueOnce({ error: null });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      // Fill in URL and submit
      const urlInput = screen.getByTestId('add-source-sheet-url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/video');
      fireEvent.press(screen.getByTestId('add-source-sheet-url-form-submit-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', 'URL added successfully');
      });
    });

    it('closes sheet on successful URL add', async () => {
      mockUseSources.addUrlSource.mockResolvedValueOnce({ error: null });
      const onClose = jest.fn();

      render(<AddSourceSheet visible={true} onClose={onClose} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      // Fill in URL and submit
      const urlInput = screen.getByTestId('add-source-sheet-url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/video');
      fireEvent.press(screen.getByTestId('add-source-sheet-url-form-submit-button'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error toast on failed URL add', async () => {
      mockUseSources.addUrlSource.mockResolvedValueOnce({
        error: new Error('Failed to add URL'),
      });

      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      // Fill in URL and submit
      const urlInput = screen.getByTestId('add-source-sheet-url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/video');
      fireEvent.press(screen.getByTestId('add-source-sheet-url-form-submit-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to add URL');
      });
    });

    it('does not close sheet on failed URL add', async () => {
      mockUseSources.addUrlSource.mockResolvedValueOnce({
        error: new Error('Failed to add URL'),
      });
      const onClose = jest.fn();

      render(<AddSourceSheet visible={true} onClose={onClose} />);

      // Switch to URL tab
      fireEvent.press(screen.getByTestId('add-source-sheet-tab-url'));

      // Fill in URL and submit
      const urlInput = screen.getByTestId('add-source-sheet-url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/video');
      fireEvent.press(screen.getByTestId('add-source-sheet-url-form-submit-button'));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to add URL');
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when backdrop is tapped', () => {
      const onClose = jest.fn();

      render(<AddSourceSheet visible={true} onClose={onClose} />);

      const backdrop = screen.getByTestId('bottomsheet-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('tabs have accessibility role', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      const fileTab = screen.getByTestId('add-source-sheet-tab-file');
      const urlTab = screen.getByTestId('add-source-sheet-tab-url');

      expect(fileTab.props.accessibilityRole).toBe('tab');
      expect(urlTab.props.accessibilityRole).toBe('tab');
    });

    it('tabs have accessible labels', () => {
      render(<AddSourceSheet visible={true} onClose={jest.fn()} />);

      expect(screen.getByLabelText('Upload File')).toBeTruthy();
      expect(screen.getByLabelText('Add URL')).toBeTruthy();
    });
  });
});
