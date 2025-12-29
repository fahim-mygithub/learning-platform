/**
 * AddSourceSheet Component
 *
 * A BottomSheet that provides options to add sources to a project.
 * Features:
 * - Tab switching between "Upload File" and "Add URL"
 * - FileUploadButton integration for file selection
 * - UrlInputForm integration for URL submission
 * - Loading states during upload/add operations
 * - Success/error toast notifications
 * - Auto-close on successful add
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

import { BottomSheet } from '../ui/BottomSheet';
import { FileUploadButton } from '../ui/FileUploadButton';
import { UrlInputForm } from '../ui/UrlInputForm';
import { useToast } from '../ui/Toast';
import { useSources } from '../../lib/sources-context';
import { colors, spacing } from '../../theme';
import type { UploadFile } from '../../lib/sources';

/**
 * Tab type for the AddSourceSheet
 */
type TabType = 'file' | 'url';

/**
 * Props for the AddSourceSheet component
 */
export interface AddSourceSheetProps {
  /** Controls visibility of the bottom sheet */
  visible: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
}

/**
 * AddSourceSheet Component
 *
 * A bottom sheet with tabs for adding sources via file upload or URL.
 * Uses the sources context for adding operations and toast for notifications.
 *
 * @example
 * ```tsx
 * <AddSourceSheet
 *   visible={showAddSheet}
 *   onClose={() => setShowAddSheet(false)}
 * />
 * ```
 */
export function AddSourceSheet({
  visible,
  onClose,
}: AddSourceSheetProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('file');
  const [isUploading, setIsUploading] = useState(false);

  const { addUrlSource, uploadFileSource } = useSources();
  const { showToast } = useToast();

  /**
   * Handle file selection from FileUploadButton
   */
  const handleFileSelected = useCallback(
    async (file: UploadFile) => {
      setIsUploading(true);

      try {
        const { error } = await uploadFileSource(file);

        if (error) {
          showToast('error', error.message);
        } else {
          showToast('success', 'File uploaded successfully');
          onClose();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        showToast('error', message);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFileSource, showToast, onClose]
  );

  /**
   * Handle URL form submission
   */
  const handleUrlSubmit = useCallback(
    async (url: string, name: string) => {
      const { error } = await addUrlSource(url, name);

      if (error) {
        showToast('error', error.message);
        throw error; // Re-throw to let UrlInputForm handle error state
      } else {
        showToast('success', 'URL added successfully');
        onClose();
      }
    },
    [addUrlSource, showToast, onClose]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add Source"
      testID="add-source-sheet"
    >
      <View testID="add-source-sheet-content" style={styles.content}>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Pressable
            testID="add-source-sheet-tab-file"
            style={[styles.tab, activeTab === 'file' && styles.activeTab]}
            onPress={() => setActiveTab('file')}
            accessibilityRole="tab"
            accessibilityLabel="Upload File"
            accessibilityState={{ selected: activeTab === 'file' }}
          >
            <Text style={[styles.tabText, activeTab === 'file' && styles.activeTabText]}>
              Upload File
            </Text>
          </Pressable>
          <Pressable
            testID="add-source-sheet-tab-url"
            style={[styles.tab, activeTab === 'url' && styles.activeTab]}
            onPress={() => setActiveTab('url')}
            accessibilityRole="tab"
            accessibilityLabel="Add URL"
            accessibilityState={{ selected: activeTab === 'url' }}
          >
            <Text style={[styles.tabText, activeTab === 'url' && styles.activeTabText]}>
              Add URL
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        {activeTab === 'file' && (
          <View testID="add-source-sheet-file-content" style={styles.tabContent}>
            <Text style={styles.description}>
              Select a video or PDF file to upload.
            </Text>
            <FileUploadButton
              testID="add-source-sheet-file-upload-button"
              accept="all"
              onFileSelected={handleFileSelected}
              loading={isUploading}
              disabled={isUploading}
            >
              Choose File
            </FileUploadButton>
          </View>
        )}

        {activeTab === 'url' && (
          <View testID="add-source-sheet-url-content" style={styles.tabContent}>
            <Text style={styles.description}>
              Add a web link as a source.
            </Text>
            <UrlInputForm
              testID="add-source-sheet-url-form"
              onSubmit={handleUrlSubmit}
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

/**
 * Styles for AddSourceSheet component
 */
const styles = StyleSheet.create({
  content: {
    paddingTop: spacing[2],
  } as ViewStyle,
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    padding: 4,
  } as ViewStyle,
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    borderRadius: 6,
  } as ViewStyle,
  activeTab: {
    backgroundColor: colors.background,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  } as TextStyle,
  activeTabText: {
    color: colors.text,
    fontWeight: '600',
  } as TextStyle,
  tabContent: {
    paddingTop: spacing[2],
  } as ViewStyle,
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing[4],
    textAlign: 'center',
  } as TextStyle,
});

export default AddSourceSheet;
