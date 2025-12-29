/**
 * UrlInputForm Component Tests
 *
 * Tests for URL input form functionality including:
 * - URL validation
 * - Submit handling
 * - Error state display
 * - Loading state
 * - Disabled state
 * - Name extraction from URL
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

import { UrlInputForm, type UrlInputFormProps } from '../UrlInputForm';

/**
 * Helper to render UrlInputForm with default props
 */
function renderUrlInputForm(props: Partial<UrlInputFormProps> = {}) {
  const defaultProps: UrlInputFormProps = {
    onSubmit: jest.fn(),
    ...props,
  };
  return render(<UrlInputForm {...defaultProps} />);
}

describe('UrlInputForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders URL input field', () => {
      renderUrlInputForm({ testID: 'url-form' });

      expect(screen.getByTestId('url-form-url-input')).toBeTruthy();
    });

    it('renders submit button', () => {
      renderUrlInputForm({ testID: 'url-form' });

      expect(screen.getByTestId('url-form-submit-button')).toBeTruthy();
    });

    it('renders with URL input placeholder', () => {
      renderUrlInputForm();

      expect(screen.getByPlaceholderText('Enter URL (e.g., https://example.com)')).toBeTruthy();
    });

    it('renders with URL label', () => {
      renderUrlInputForm();

      expect(screen.getByText('URL')).toBeTruthy();
    });

    it('renders optional name input field', () => {
      renderUrlInputForm({ testID: 'url-form' });

      expect(screen.getByTestId('url-form-name-input')).toBeTruthy();
    });
  });

  describe('URL Validation', () => {
    it('shows error for empty URL on submit', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('URL is required')).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows error for invalid URL format', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'not-a-valid-url');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows error for URL without protocol', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'example.com/path');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeTruthy();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('accepts valid http URL', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'http://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('accepts valid https URL', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/path/to/resource');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('accepts valid URL with query parameters', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/search?q=test&page=1');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('clears error when user starts typing', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      // Trigger error
      fireEvent.press(screen.getByTestId('url-form-submit-button'));
      await waitFor(() => {
        expect(screen.getByText('URL is required')).toBeTruthy();
      });

      // Type in URL field
      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'h');

      await waitFor(() => {
        expect(screen.queryByText('URL is required')).toBeNull();
      });
    });
  });

  describe('Submit Handling', () => {
    it('calls onSubmit with URL and extracted name', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/article/my-article');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://example.com/article/my-article',
          'example.com/article/my-article'
        );
      });
    });

    it('calls onSubmit with custom name when provided', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      const nameInput = screen.getByTestId('url-form-name-input-input');

      fireEvent.changeText(urlInput, 'https://example.com/article');
      fireEvent.changeText(nameInput, 'My Custom Name');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://example.com/article',
          'My Custom Name'
        );
      });
    });

    it('extracts name from URL hostname when no path', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://example.com',
          'example.com'
        );
      });
    });

    it('clears form after successful submission', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      const nameInput = screen.getByTestId('url-form-name-input-input');

      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.changeText(nameInput, 'Test Name');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });

      // Form should be cleared
      expect(urlInput.props.value).toBe('');
      expect(nameInput.props.value).toBe('');
    });
  });

  describe('Loading State', () => {
    it('shows loading state on submit button during submission', async () => {
      let resolveSubmit: () => void;
      const onSubmit = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
      );
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('url-form-submit-button-loading')).toBeTruthy();
      });

      // Resolve the promise and wait for state updates
      await act(async () => {
        resolveSubmit!();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('url-form-submit-button-loading')).toBeNull();
      });
    });

    it('disables inputs during loading', async () => {
      let resolveSubmit: () => void;
      const onSubmit = jest.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
      );
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        const urlInputDuringLoad = screen.getByTestId('url-form-url-input-input');
        expect(urlInputDuringLoad.props.editable).toBe(false);
      });

      await act(async () => {
        resolveSubmit!();
      });
    });

    it('accepts loading prop from parent', () => {
      renderUrlInputForm({ loading: true, testID: 'url-form' });

      expect(screen.getByTestId('url-form-submit-button-loading')).toBeTruthy();
    });

    it('prevents submission when loading prop is true', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ loading: true, onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      // Give time for any async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables form when disabled prop is true', () => {
      renderUrlInputForm({ disabled: true, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      const nameInput = screen.getByTestId('url-form-name-input-input');

      expect(urlInput.props.editable).toBe(false);
      expect(nameInput.props.editable).toBe(false);
    });

    it('prevents submission when disabled', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ disabled: true, onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      // Give time for any async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('displays submission error from onSubmit rejection', async () => {
      const onSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('displays generic error for non-Error rejection', async () => {
      const onSubmit = jest.fn().mockRejectedValue('Unknown error');
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Failed to add URL')).toBeTruthy();
      });
    });

    it('does not clear form on submission error', async () => {
      const onSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      // Form should NOT be cleared on error
      expect(urlInput.props.value).toBe('https://example.com');
    });
  });

  describe('Accessibility', () => {
    it('has accessible URL input label', () => {
      renderUrlInputForm();

      expect(screen.getByLabelText('URL')).toBeTruthy();
    });

    it('has accessible name input label', () => {
      renderUrlInputForm();

      expect(screen.getByLabelText('Name (optional)')).toBeTruthy();
    });

    it('submit button has accessibility role', () => {
      renderUrlInputForm({ testID: 'url-form' });

      const button = screen.getByTestId('url-form-submit-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('error message has alert role', async () => {
      const onSubmit = jest.fn();
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        const errorElement = screen.getByTestId('url-form-url-input-error');
        expect(errorElement.props.accessibilityRole).toBe('alert');
      });
    });
  });

  describe('Name Extraction', () => {
    it('extracts name from hostname and path', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://docs.example.com/guide/intro');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://docs.example.com/guide/intro',
          'docs.example.com/guide/intro'
        );
      });
    });

    it('handles URL with trailing slash', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, 'https://example.com/path/');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://example.com/path/',
          'example.com/path'
        );
      });
    });

    it('trims whitespace from URL before validation', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      renderUrlInputForm({ onSubmit, testID: 'url-form' });

      const urlInput = screen.getByTestId('url-form-url-input-input');
      fireEvent.changeText(urlInput, '  https://example.com  ');
      fireEvent.press(screen.getByTestId('url-form-submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'https://example.com',
          'example.com'
        );
      });
    });
  });
});
