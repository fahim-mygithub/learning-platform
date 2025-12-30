/**
 * PdfViewer Component
 *
 * Displays PDF documents using Google Docs Viewer via WebView.
 * Features:
 * - Loading indicator while PDF loads
 * - Error handling with retry option
 *
 * Note: Uses Google Docs Viewer for initial implementation.
 * Can be upgraded to a native PDF library for better performance.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '../../../theme';

/**
 * Props for the PdfViewer component
 */
export interface PdfViewerProps {
  /** URL of the PDF to display */
  url: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Generate Google Docs Viewer URL for a PDF
 */
function getGoogleDocsViewerUrl(pdfUrl: string): string {
  const encodedUrl = encodeURIComponent(pdfUrl);
  return `https://docs.google.com/gview?embedded=true&url=${encodedUrl}`;
}

/**
 * PdfViewer Component
 *
 * Renders PDF documents in a WebView using Google Docs Viewer.
 */
export function PdfViewer({ url, testID = 'pdf-viewer' }: PdfViewerProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerUrl = getGoogleDocsViewerUrl(url);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load PDF. Please check your connection and try again.');
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  // For web platform, use iframe
  if (Platform.OS === 'web') {
    return (
      <View testID={testID} style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        )}
        <iframe
          src={viewerUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
          onError={() => handleError()}
          title="PDF document"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View testID={`${testID}-error`} style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📄</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          testID={`${testID}-retry-button`}
          style={styles.retryButton}
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
      <WebView
        testID={`${testID}-webview`}
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        startInLoadingState={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PdfViewer;
