/**
 * UrlInputForm Component
 *
 * A form component for URL input with validation, name extraction,
 * and submit handling. Used for adding URL-based sources.
 *
 * @example
 * ```tsx
 * <UrlInputForm
 *   onSubmit={async (url, name) => {
 *     await addSource({ url, name, type: 'url' });
 *   }}
 *   loading={isAdding}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { Input } from './Input';
import { Button } from './Button';

/**
 * Props for the UrlInputForm component
 */
export interface UrlInputFormProps {
  /** Callback when form is submitted with valid URL */
  onSubmit: (url: string, name: string) => Promise<void>;
  /** Shows loading indicator and disables form */
  loading?: boolean;
  /** Disables the form */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Validates a URL string using the URL constructor
 * @param urlString - The URL string to validate
 * @returns true if valid URL, false otherwise
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Only allow http and https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts a display name from a URL
 * Combines hostname and path, removing trailing slashes
 * @param urlString - The URL to extract name from
 * @returns The extracted name (hostname + path)
 */
function extractNameFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const path = url.pathname.replace(/\/$/, ''); // Remove trailing slash
    if (path && path !== '/') {
      return `${url.hostname}${path}`;
    }
    return url.hostname;
  } catch {
    return urlString;
  }
}

/**
 * UrlInputForm Component
 *
 * A form for entering and validating URLs with optional custom naming.
 * Validates URLs using the URL constructor and extracts a default name
 * from the hostname and path.
 *
 * Features:
 * - URL validation (must be valid http/https URL)
 * - Optional custom name input
 * - Auto-extraction of name from URL
 * - Loading state support
 * - Error display for validation and submission errors
 */
export function UrlInputForm({
  onSubmit,
  loading: externalLoading = false,
  disabled = false,
  testID,
}: UrlInputFormProps): React.ReactElement {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined loading state from external prop and internal submission
  const isLoading = externalLoading || isSubmitting;
  const isDisabled = disabled || isLoading;

  /**
   * Clears error when user starts typing
   */
  const handleUrlChange = useCallback((text: string) => {
    setUrl(text);
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handles form submission with validation
   */
  const handleSubmit = useCallback(async () => {
    // Don't submit if disabled or loading
    if (isDisabled) {
      return;
    }

    // Trim whitespace
    const trimmedUrl = url.trim();

    // Validate empty URL
    if (!trimmedUrl) {
      setError('URL is required');
      return;
    }

    // Validate URL format
    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    // Determine the name (custom or extracted)
    const submittedName = name.trim() || extractNameFromUrl(trimmedUrl);

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmedUrl, submittedName);
      // Clear form on success
      setUrl('');
      setName('');
    } catch (err) {
      // Display error message
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add URL');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [url, name, isDisabled, onSubmit]);

  return (
    <View style={styles.container} testID={testID}>
      <Input
        label="URL"
        placeholder="Enter URL (e.g., https://example.com)"
        value={url}
        onChangeText={handleUrlChange}
        error={error ?? undefined}
        disabled={isDisabled}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        testID={testID ? `${testID}-url-input` : 'url-input'}
      />
      <Input
        label="Name (optional)"
        placeholder="Custom name for this URL"
        value={name}
        onChangeText={setName}
        disabled={isDisabled}
        testID={testID ? `${testID}-name-input` : 'name-input'}
      />
      <Button
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isDisabled}
        testID={testID ? `${testID}-submit-button` : 'submit-button'}
      >
        Add URL
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default UrlInputForm;
