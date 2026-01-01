/**
 * KnowledgeGraphView Component
 *
 * Displays an interactive knowledge graph showing concepts and their relationships.
 * Uses vis-network library inside a WebView (native) or iframe (web) for full interactivity:
 * - Drag nodes to rearrange
 * - Pinch/scroll to zoom
 * - Pan to navigate
 * - Tap nodes to select
 *
 * @example
 * ```tsx
 * <KnowledgeGraphView
 *   concepts={concepts}
 *   relationships={relationships}
 *   onNodeSelect={(id) => console.log('Selected:', id)}
 *   height={400}
 * />
 * ```
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { Concept, ConceptRelationship } from '@/src/types';
import { generateGraphHTML } from './graph-html';
import { colors, spacing } from '@/src/theme';

// Conditionally import WebView only for native platforms
const WebView = Platform.OS !== 'web'
  ? require('react-native-webview').WebView
  : null;

/**
 * Props for KnowledgeGraphView component
 */
export interface KnowledgeGraphViewProps {
  /** List of concepts to display as nodes */
  concepts: Concept[];
  /** List of relationships to display as edges */
  relationships: ConceptRelationship[];
  /** Callback when a node is selected */
  onNodeSelect?: (conceptId: string) => void;
  /** Height of the graph view */
  height?: number;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
}

/**
 * Message type from WebView
 */
interface WebViewMessage {
  type: 'nodeSelect';
  nodeId: string;
}

/**
 * Web iframe component for knowledge graph
 */
function WebGraphView({
  html,
  height,
  testID,
  onNodeSelect,
}: {
  html: string;
  height: number;
  testID?: string;
  onNodeSelect?: (nodeId: string) => void;
}): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message.type === 'nodeSelect' && onNodeSelect) {
          onNodeSelect(message.nodeId);
        }
      } catch {
        // Ignore parse errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNodeSelect]);

  // Create blob URL for the HTML content
  const blobUrl = useMemo(() => {
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [html]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  return (
    <iframe
      ref={iframeRef}
      data-testid={testID ? `${testID}-iframe` : undefined}
      src={blobUrl}
      style={{
        width: '100%',
        height,
        border: 'none',
        borderRadius: 12,
      }}
      title="Knowledge Graph"
    />
  );
}

/**
 * KnowledgeGraphView Component
 *
 * Renders an interactive graph visualization of concepts and their relationships.
 */
export function KnowledgeGraphView({
  concepts,
  relationships,
  onNodeSelect,
  height = 400,
  testID,
  style,
}: KnowledgeGraphViewProps): React.ReactElement {
  // Generate HTML only when data changes
  const graphHTML = useMemo(() => {
    if (concepts.length === 0) {
      return null;
    }
    return generateGraphHTML(concepts, relationships);
  }, [concepts, relationships]);

  // Handle messages from WebView (native only)
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
        if (message.type === 'nodeSelect' && onNodeSelect) {
          onNodeSelect(message.nodeId);
        }
      } catch {
        // Ignore parse errors
      }
    },
    [onNodeSelect]
  );

  // Empty state
  if (concepts.length === 0) {
    return (
      <View testID={testID} style={[styles.emptyContainer, { height }, style]}>
        <Text style={styles.emptyText}>No concepts to display</Text>
      </View>
    );
  }

  // No relationships state
  if (relationships.length === 0) {
    return (
      <View testID={testID} style={[styles.emptyContainer, { height }, style]}>
        <Text style={styles.emptyTitle}>Knowledge Graph</Text>
        <Text style={styles.emptyText}>
          {concepts.length} concepts found, but no relationships detected.
        </Text>
      </View>
    );
  }

  // Web platform: use iframe
  if (Platform.OS === 'web') {
    return (
      <View testID={testID} style={[styles.container, { height }, style]}>
        <WebGraphView
          html={graphHTML!}
          height={height}
          testID={testID}
          onNodeSelect={onNodeSelect}
        />
      </View>
    );
  }

  // Native platforms: use WebView
  return (
    <View testID={testID} style={[styles.container, { height }, style]}>
      <WebView
        testID={testID ? `${testID}-webview` : undefined}
        source={{ html: graphHTML! }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        onMessage={handleMessage}
        // Disable scroll in WebView, let vis.js handle zoom/pan
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Allow pinch zoom for the graph
        scalesPageToFit={Platform.OS === 'android'}
        // Improve performance
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing[4],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default KnowledgeGraphView;
