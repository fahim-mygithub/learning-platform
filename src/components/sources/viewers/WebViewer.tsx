/**
 * WebViewer Component
 *
 * Displays web content (articles, websites) in an embedded WebView.
 * Features:
 * - Loading indicator while content loads
 * - Error handling with retry option
 * - Safe area handling
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '../../../theme';

/**
 * Props for the WebViewer component
 */
export interface WebViewerProps {
  /** URL to display */
  url: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * WebViewer Component
 *
 * Renders web content in an embedded WebView with loading and error states.
 */
export function WebViewer({ url, testID = 'web-viewer' }: WebViewerProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load content. Please check your connection and try again.');
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
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
        <iframe
          src={url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
          onError={() => handleError()}
          title="Web content"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View testID={`${testID}-error`} style={styles.errorContainer}>
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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <WebView
        testID={`${testID}-webview`}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        startInLoadingState={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        allowsFullscreenVideo={true}
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

export default WebViewer;
