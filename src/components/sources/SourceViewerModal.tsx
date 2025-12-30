/**
 * SourceViewerModal Component
 *
 * A full-screen modal for viewing source content.
 * Automatically selects the appropriate viewer based on source type:
 * - VideoPlayer for video files
 * - YouTubePlayer for YouTube URLs
 * - PdfViewer for PDF documents
 * - WebViewer for web articles and other URLs
 */

import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  Pressable,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';

import { colors } from '../../theme';
import { getViewerType, type ViewerType } from '../../lib/source-viewer-utils';
import { getSourceUrl } from '../../lib/sources';
import { VideoPlayer, YouTubePlayer, PdfViewer, WebViewer } from './viewers';
import type { Source } from '../../types/database';

/**
 * Props for the SourceViewerModal component
 */
export interface SourceViewerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** The source to display, or null if no source selected */
  source: Source | null;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Render the appropriate viewer based on source type
 */
function renderViewer(
  source: Source,
  viewerType: ViewerType,
  url: string
): React.ReactElement | null {
  switch (viewerType) {
    case 'video':
      return <VideoPlayer url={url} testID="source-viewer-video" />;
    case 'youtube':
      return <YouTubePlayer url={source.url || url} testID="source-viewer-youtube" />;
    case 'pdf':
      return <PdfViewer url={url} testID="source-viewer-pdf" />;
    case 'web':
    default:
      return <WebViewer url={url} testID="source-viewer-web" />;
  }
}

/**
 * SourceViewerModal Component
 *
 * Full-screen modal that displays source content with the appropriate viewer.
 */
export function SourceViewerModal({
  visible,
  source,
  onClose,
  testID = 'source-viewer-modal',
}: SourceViewerModalProps): React.ReactElement {
  if (!source) {
    return <></>;
  }

  const viewerType = getViewerType(source);
  const url = getSourceUrl(source);

  // Show error if no URL available
  const showError = !url;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView testID={testID} style={styles.container}>
        <StatusBar
          barStyle={viewerType === 'video' || viewerType === 'youtube' ? 'light-content' : 'dark-content'}
          backgroundColor={viewerType === 'video' || viewerType === 'youtube' ? '#000' : colors.background}
        />

        {/* Header */}
        <View style={[
          styles.header,
          (viewerType === 'video' || viewerType === 'youtube') && styles.headerDark,
        ]}>
          <Text
            style={[
              styles.title,
              (viewerType === 'video' || viewerType === 'youtube') && styles.titleDark,
            ]}
            numberOfLines={1}
          >
            {source.name}
          </Text>
          <Pressable
            testID={`${testID}-close-button`}
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close viewer"
          >
            <Text style={[
              styles.closeButtonText,
              (viewerType === 'video' || viewerType === 'youtube') && styles.closeButtonTextDark,
            ]}>
              ✕
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={[
          styles.content,
          (viewerType === 'video' || viewerType === 'youtube') && styles.contentDark,
        ]}>
          {showError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>Unable to load source</Text>
              <Text style={styles.errorSubtext}>
                The source URL is not available. Please try again later.
              </Text>
            </View>
          ) : (
            renderViewer(source, viewerType, url)
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        paddingTop: 8,
      },
      android: {
        paddingTop: 12,
      },
    }),
  },
  headerDark: {
    backgroundColor: '#000',
    borderBottomColor: '#333',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 16,
  },
  titleDark: {
    color: colors.white,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  closeButtonTextDark: {
    color: colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentDark: {
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default SourceViewerModal;
