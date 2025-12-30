/**
 * YouTubePlayer Component
 *
 * Displays YouTube videos using the YouTube embed player.
 * Features:
 * - Embedded YouTube player via WebView/iframe
 * - Loading indicator while player loads
 * - Error handling for invalid URLs
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '../../../theme';
import { extractYouTubeId } from '../../../lib/source-viewer-utils';

/**
 * Props for the YouTubePlayer component
 */
export interface YouTubePlayerProps {
  /** YouTube video URL */
  url: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Generate YouTube embed URL with player parameters
 */
function getYouTubeEmbedUrl(videoId: string): string {
  // Enable controls, allow fullscreen, enable playsinline for mobile
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
}

/**
 * Generate YouTube embed HTML for WebView
 */
function getYouTubeEmbedHtml(videoId: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #000; }
          .container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </body>
    </html>
  `;
}

/**
 * YouTubePlayer Component
 *
 * Renders YouTube videos in an embedded player.
 */
export function YouTubePlayer({
  url,
  testID = 'youtube-player',
}: YouTubePlayerProps): React.ReactElement {
  const [loading, setLoading] = useState(true);

  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <View testID={`${testID}-error`} style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎬</Text>
        <Text style={styles.errorText}>Invalid YouTube URL</Text>
        <Text style={styles.errorSubtext}>Could not extract video ID from the URL</Text>
      </View>
    );
  }

  // For web platform, use iframe directly
  if (Platform.OS === 'web') {
    const embedUrl = getYouTubeEmbedUrl(videoId);
    return (
      <View testID={testID} style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
          title="YouTube video"
        />
      </View>
    );
  }

  const embedHtml = getYouTubeEmbedHtml(videoId);

  return (
    <View testID={testID} style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
      <WebView
        testID={`${testID}-webview`}
        source={{ html: embedHtml }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.white,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default YouTubePlayer;
