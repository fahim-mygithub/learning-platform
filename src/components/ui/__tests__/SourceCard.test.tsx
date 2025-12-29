/**
 * SourceCard Component Tests
 *
 * Tests for the SourceCard UI component covering:
 * - Rendering with different source types
 * - Status indicator states (pending, uploading, processing, completed, failed)
 * - Progress bar display during uploading
 * - Delete button functionality
 * - Touch feedback on press
 * - Error message display for failed status
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { SourceCard } from '../SourceCard';
import type { Source, SourceType, SourceStatus } from '../../../types/database';

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
    status: 'pending',
    error_message: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SourceCard Component', () => {
  describe('Rendering', () => {
    it('renders source name correctly', () => {
      const source = createMockSource({ name: 'My Video File' });

      render(<SourceCard source={source} />);

      expect(screen.getByText('My Video File')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const source = createMockSource();

      render(<SourceCard source={source} testID="custom-source-card" />);

      expect(screen.getByTestId('custom-source-card')).toBeTruthy();
    });

    it('renders default testID when not provided', () => {
      const source = createMockSource();

      render(<SourceCard source={source} />);

      expect(screen.getByTestId('source-card')).toBeTruthy();
    });
  });

  describe('Type Icons', () => {
    it.each<[SourceType, string]>([
      ['video', '\uD83C\uDFAC'],
      ['pdf', '\uD83D\uDCC4'],
      ['url', '\uD83D\uDD17'],
    ])('renders correct icon for type: %s', (type, expectedIcon) => {
      const source = createMockSource({ type });

      render(<SourceCard source={source} />);

      expect(screen.getByText(expectedIcon)).toBeTruthy();
    });
  });

  describe('Status States', () => {
    describe('pending status', () => {
      it('renders gray indicator for pending status', () => {
        const source = createMockSource({ status: 'pending' });

        render(<SourceCard source={source} />);

        const statusIndicator = screen.getByTestId('source-card-status-indicator');
        expect(statusIndicator).toBeTruthy();
        expect(screen.getByText('Pending')).toBeTruthy();
      });
    });

    describe('uploading status', () => {
      it('renders progress bar with percentage for uploading status', () => {
        const source = createMockSource({ status: 'uploading' });

        render(<SourceCard source={source} uploadProgress={45} />);

        const progressBar = screen.getByTestId('source-card-progress');
        expect(progressBar).toBeTruthy();
        expect(screen.getByText('45%')).toBeTruthy();
      });

      it('renders 0% progress when uploadProgress is not provided', () => {
        const source = createMockSource({ status: 'uploading' });

        render(<SourceCard source={source} />);

        expect(screen.getByText('0%')).toBeTruthy();
      });

      it('handles edge case of 100% progress', () => {
        const source = createMockSource({ status: 'uploading' });

        render(<SourceCard source={source} uploadProgress={100} />);

        expect(screen.getByText('100%')).toBeTruthy();
      });
    });

    describe('processing status', () => {
      it('renders spinner indicator for processing status', () => {
        const source = createMockSource({ status: 'processing' });

        render(<SourceCard source={source} />);

        const spinner = screen.getByTestId('source-card-spinner');
        expect(spinner).toBeTruthy();
        expect(screen.getByText('Processing')).toBeTruthy();
      });
    });

    describe('completed status', () => {
      it('renders green checkmark for completed status', () => {
        const source = createMockSource({ status: 'completed' });

        render(<SourceCard source={source} />);

        expect(screen.getByText('\u2713')).toBeTruthy();
        expect(screen.getByText('Completed')).toBeTruthy();
      });
    });

    describe('failed status', () => {
      it('renders red X for failed status', () => {
        const source = createMockSource({ status: 'failed' });

        render(<SourceCard source={source} />);

        expect(screen.getByText('\u2717')).toBeTruthy();
        expect(screen.getByText('Failed')).toBeTruthy();
      });

      it('displays error message when source has error_message', () => {
        const source = createMockSource({
          status: 'failed',
          error_message: 'Upload failed: Network error',
        });

        render(<SourceCard source={source} />);

        expect(screen.getByText('Upload failed: Network error')).toBeTruthy();
      });

      it('does not display error message section when error_message is null', () => {
        const source = createMockSource({
          status: 'failed',
          error_message: null,
        });

        render(<SourceCard source={source} />);

        expect(screen.queryByTestId('source-card-error-message')).toBeNull();
      });
    });
  });

  describe('Touch Feedback', () => {
    it('calls onPress when card is pressed', () => {
      const source = createMockSource();
      const onPress = jest.fn();

      render(<SourceCard source={source} onPress={onPress} />);

      const pressable = screen.getByTestId('source-card-pressable');
      fireEvent.press(pressable);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onPress is not provided', () => {
      const source = createMockSource();

      render(<SourceCard source={source} />);

      const pressable = screen.getByTestId('source-card-pressable');
      // Should not throw
      fireEvent.press(pressable);
    });
  });

  describe('Delete Button', () => {
    it('renders delete button', () => {
      const source = createMockSource();

      render(<SourceCard source={source} />);

      expect(screen.getByTestId('source-card-delete-button')).toBeTruthy();
    });

    it('calls onDelete when delete button is pressed', () => {
      const source = createMockSource();
      const onDelete = jest.fn();

      render(<SourceCard source={source} onDelete={onDelete} />);

      const deleteButton = screen.getByTestId('source-card-delete-button');
      fireEvent.press(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when delete button is pressed', () => {
      const source = createMockSource();
      const onPress = jest.fn();
      const onDelete = jest.fn();

      render(<SourceCard source={source} onPress={onPress} onDelete={onDelete} />);

      const deleteButton = screen.getByTestId('source-card-delete-button');
      fireEvent.press(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('has accessible label for delete button', () => {
      const source = createMockSource({ name: 'My Video' });

      render(<SourceCard source={source} />);

      const deleteButton = screen.getByTestId('source-card-delete-button');
      expect(deleteButton.props.accessibilityLabel).toBe('Delete My Video');
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role on card', () => {
      const source = createMockSource();

      render(<SourceCard source={source} />);

      const card = screen.getByTestId('source-card');
      expect(card.props.accessibilityRole).toBe('none');
    });

    it('has correct accessibility role on pressable', () => {
      const source = createMockSource();
      const onPress = jest.fn();

      render(<SourceCard source={source} onPress={onPress} />);

      const pressable = screen.getByTestId('source-card-pressable');
      expect(pressable.props.accessibilityRole).toBe('button');
    });

    it('provides accessibility label for the card', () => {
      const source = createMockSource({ name: 'Test File', type: 'pdf', status: 'completed' });

      render(<SourceCard source={source} />);

      const pressable = screen.getByTestId('source-card-pressable');
      expect(pressable.props.accessibilityLabel).toBe('Test File, pdf, Completed');
    });
  });
});
