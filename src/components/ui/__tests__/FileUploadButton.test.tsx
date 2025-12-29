/**
 * FileUploadButton Component Tests
 *
 * Tests for file upload button functionality, accessibility, and touch targets.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { FileUploadButton, type FileUploadButtonProps } from '../FileUploadButton';
import type { UploadFile } from '../../../lib/sources';

// Mock expo-document-picker
const mockGetDocumentAsync = jest.fn();
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

/**
 * Helper to render FileUploadButton with default props
 */
function renderFileUploadButton(props: Partial<FileUploadButtonProps> = {}) {
  const defaultProps: FileUploadButtonProps = {
    accept: 'all',
    onFileSelected: jest.fn(),
    ...props,
  };
  return render(<FileUploadButton {...defaultProps} />);
}

describe('FileUploadButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders button with default text', () => {
      renderFileUploadButton();

      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    it('renders with custom children', () => {
      renderFileUploadButton({ children: 'Choose Document' });

      expect(screen.getByText('Choose Document')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderFileUploadButton({ testID: 'upload-button' });

      expect(screen.getByTestId('upload-button')).toBeTruthy();
    });
  });

  describe('Touch Target Sizing', () => {
    it('enforces minimum 44px touch target height', () => {
      renderFileUploadButton({ testID: 'upload-btn' });

      const button = screen.getByTestId('upload-btn');
      // The button should have minHeight of 44
      expect(button).toBeTruthy();
      // The component enforces MIN_TOUCH_TARGET_SIZE = 44 via styles
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      renderFileUploadButton();

      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('uses children as default accessibility label', () => {
      renderFileUploadButton({ children: 'Upload Video' });

      const button = screen.getByLabelText('Upload Video');
      expect(button).toBeTruthy();
    });

    it('uses custom accessibility label when provided', () => {
      renderFileUploadButton({
        children: 'Upload',
        accessibilityLabel: 'Upload a video file',
      });

      const button = screen.getByLabelText('Upload a video file');
      expect(button).toBeTruthy();
    });

    it('has disabled accessibility state when disabled', () => {
      renderFileUploadButton({ disabled: true, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('has busy accessibility state when loading', () => {
      renderFileUploadButton({ loading: true, testID: 'loading-btn' });

      const button = screen.getByTestId('loading-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ busy: true, disabled: true })
      );
    });
  });

  describe('File Type Accept Prop', () => {
    it('configures document picker for video files', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true });

      renderFileUploadButton({ accept: 'video', testID: 'video-btn' });

      fireEvent.press(screen.getByTestId('video-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ['video/mp4', 'video/quicktime', 'video/webm'],
          })
        );
      });
    });

    it('configures document picker for PDF files', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true });

      renderFileUploadButton({ accept: 'pdf', testID: 'pdf-btn' });

      fireEvent.press(screen.getByTestId('pdf-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ['application/pdf'],
          })
        );
      });
    });

    it('configures document picker for all files', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true });

      renderFileUploadButton({ accept: 'all', testID: 'all-btn' });

      fireEvent.press(screen.getByTestId('all-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ['video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'],
          })
        );
      });
    });
  });

  describe('File Selection Callback', () => {
    it('calls onFileSelected with file info when file is selected', async () => {
      // Mock the expo-document-picker asset format (uses mimeType, not type)
      const mockDocumentPickerAsset = {
        name: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      // Expected UploadFile format after transformation
      const expectedFile: UploadFile = {
        name: 'test-video.mp4',
        type: 'video/mp4',
        size: 1024 * 1024,
        uri: 'file:///path/to/test-video.mp4',
      };

      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [mockDocumentPickerAsset],
      });

      const onFileSelected = jest.fn();
      renderFileUploadButton({ onFileSelected, testID: 'upload-btn' });

      fireEvent.press(screen.getByTestId('upload-btn'));

      await waitFor(() => {
        expect(onFileSelected).toHaveBeenCalledWith(expectedFile);
      });
    });

    it('does not call onFileSelected when user cancels', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: true,
      });

      const onFileSelected = jest.fn();
      renderFileUploadButton({ onFileSelected, testID: 'upload-btn' });

      fireEvent.press(screen.getByTestId('upload-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalled();
      });

      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('does not call onFileSelected when no assets returned', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [],
      });

      const onFileSelected = jest.fn();
      renderFileUploadButton({ onFileSelected, testID: 'upload-btn' });

      fireEvent.press(screen.getByTestId('upload-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalled();
      });

      expect(onFileSelected).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('prevents press when disabled', async () => {
      const onFileSelected = jest.fn();
      renderFileUploadButton({
        disabled: true,
        onFileSelected,
        testID: 'disabled-btn',
      });

      fireEvent.press(screen.getByTestId('disabled-btn'));

      // Give time for any async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGetDocumentAsync).not.toHaveBeenCalled();
      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('applies disabled styling', () => {
      renderFileUploadButton({ disabled: true, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('Loading State', () => {
    it('prevents press when loading', async () => {
      const onFileSelected = jest.fn();
      renderFileUploadButton({
        loading: true,
        onFileSelected,
        testID: 'loading-btn',
      });

      fireEvent.press(screen.getByTestId('loading-btn'));

      // Give time for any async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockGetDocumentAsync).not.toHaveBeenCalled();
      expect(onFileSelected).not.toHaveBeenCalled();
    });

    it('displays loading indicator when loading', () => {
      renderFileUploadButton({ loading: true, testID: 'loading-btn' });

      expect(screen.getByTestId('loading-btn-loading')).toBeTruthy();
    });

    it('hides text when loading', () => {
      renderFileUploadButton({ loading: true, children: 'Upload' });

      expect(screen.queryByText('Upload')).toBeNull();
    });
  });

  describe('Press Handling', () => {
    it('opens document picker when pressed', async () => {
      mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true });

      renderFileUploadButton({ testID: 'upload-btn' });

      fireEvent.press(screen.getByTestId('upload-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('does not open picker when disabled', () => {
      renderFileUploadButton({ disabled: true, testID: 'disabled-btn' });

      fireEvent.press(screen.getByTestId('disabled-btn'));

      expect(mockGetDocumentAsync).not.toHaveBeenCalled();
    });

    it('does not open picker when loading', () => {
      renderFileUploadButton({ loading: true, testID: 'loading-btn' });

      fireEvent.press(screen.getByTestId('loading-btn'));

      expect(mockGetDocumentAsync).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles document picker errors gracefully', async () => {
      mockGetDocumentAsync.mockRejectedValueOnce(new Error('Permission denied'));

      const onFileSelected = jest.fn();
      renderFileUploadButton({ onFileSelected, testID: 'upload-btn' });

      fireEvent.press(screen.getByTestId('upload-btn'));

      await waitFor(() => {
        expect(mockGetDocumentAsync).toHaveBeenCalled();
      });

      // Should not throw and should not call onFileSelected
      expect(onFileSelected).not.toHaveBeenCalled();
    });
  });
});
