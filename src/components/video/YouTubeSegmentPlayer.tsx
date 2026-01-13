/**
 * YouTubeSegmentPlayer Component
 *
 * Plays a specific segment of a YouTube video using iframe embed.
 * Supports segment bounds (startSec to endSec) for chapter-based playback.
 *
 * @example
 * ```tsx
 * <YouTubeSegmentPlayer
 *   videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   startSec={30}
 *   endSec={60}
 *   isActive={true}
 *   onSegmentComplete={() => console.log('Segment done!')}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/src/theme';
import { extractVideoId } from '@/src/lib/youtube-url-utils';

/**
 * Props for the YouTubeSegmentPlayer component
 */
export interface YouTubeSegmentPlayerProps {
  /** YouTube video URL */
  videoUrl: string;
  /** Start time in seconds for the segment */
  startSec: number;
  /** End time in seconds for the segment */
  endSec: number;
  /** Whether the video should auto-play */
  isActive?: boolean;
  /** Called when the segment playback completes */
  onSegmentComplete?: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Build YouTube embed URL with segment and playback parameters
 * @exported for testing
 */
export function buildEmbedUrl(
  videoId: string,
  startSec: number,
  endSec: number,
  autoplay: boolean
): string {
  const params = new URLSearchParams({
    start: String(Math.floor(startSec)),
    end: String(Math.floor(endSec)),
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    fs: '0', // Disable fullscreen button to keep user in app
    loop: '1', // Enable looping to prevent YouTube recommendations
    playlist: videoId, // Required for single video looping
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generate HTML for WebView on native platforms
 */
function getEmbedHtml(
  videoId: string,
  startSec: number,
  endSec: number,
  autoplay: boolean
): string {
  const embedUrl = buildEmbedUrl(videoId, startSec, endSec, autoplay);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <iframe
            id="player"
            src="${embedUrl}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <script>
          // Post message when iframe loads
          document.getElementById('player').onload = function() {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'loaded' }));
          };
        </script>
      </body>
    </html>
  `;
}

/**
 * YouTubeSegmentPlayer Component
 *
 * Renders a YouTube video segment using iframe embed.
 * Works on both web (native iframe) and mobile (WebView).
 */
export function YouTubeSegmentPlayer({
  videoUrl,
  startSec,
  endSec,
  isActive = false,
  onSegmentComplete,
  onError,
  testID = 'youtube-segment-player',
}: YouTubeSegmentPlayerProps): React.ReactElement {
  const [loading, setLoading] = useState(true);

  // Extract video ID from URL
  const videoId = extractVideoId(videoUrl);

  // Handle invalid URL - call onError and render error state
  useEffect(() => {
    if (!videoId && onError) {
      onError(new Error('Invalid YouTube URL'));
    }
  }, [videoId, onError]);

  // Handle WebView messages from native
  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'loaded') {
        setLoading(false);
      } else if (message.type === 'ended') {
        onSegmentComplete?.();
      }
    } catch {
      // Ignore parse errors
    }
  }, [onSegmentComplete]);

  // Error state - invalid URL
  if (!videoId) {
    return (
      <View testID={`${testID}-error`} style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🎬</Text>
        <Text style={styles.errorText}>Invalid YouTube URL</Text>
        <Text style={styles.errorSubtext}>Could not extract video ID from the URL</Text>
      </View>
    );
  }

  // Web platform - use native iframe
  if (Platform.OS === 'web') {
    const embedUrl = buildEmbedUrl(videoId, startSec, endSec, isActive);

    return (
      <View
        testID={testID}
        style={styles.container}
        accessibilityLabel="YouTube video player"
        accessibilityRole="none"
      >
        {loading && (
          <View style={styles.loadingOverlay} testID={`${testID}-loading`}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
          onLoad={() => setLoading(false)}
          title="YouTube video"
        />
      </View>
    );
  }

  // Native platform (iOS/Android) - use WebView
  const embedHtml = getEmbedHtml(videoId, startSec, endSec, isActive);

  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityLabel="YouTube video player"
      accessibilityRole="none"
    >
      {loading && (
        <View style={styles.loadingOverlay} testID={`${testID}-loading`}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
      <WebView
        testID={`${testID}-webview`}
        source={{ html: embedHtml }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  } as ViewStyle,
  webview: {
    flex: 1,
    backgroundColor: '#000',
  } as ViewStyle,
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  } as ViewStyle,
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.white,
  } as TextStyle,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  } as ViewStyle,
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  } as TextStyle,
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
});

export default YouTubeSegmentPlayer;
