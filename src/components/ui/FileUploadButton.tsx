/**
 * FileUploadButton Component
 *
 * A button that triggers expo-document-picker to select files.
 * Features:
 * - Configurable file type acceptance (video/pdf/all)
 * - Minimum 44x44px touch target (WCAG 2.1 AAA compliance)
 * - Loading state with ActivityIndicator
 * - Full accessibility support for screen readers
 * - Disabled state during upload
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme';
import type { UploadFile } from '../../lib/sources';

/**
 * Accepted file type options
 */
export type FileAcceptType = 'video' | 'pdf' | 'all';

/**
 * Props for the FileUploadButton component
 */
export interface FileUploadButtonProps extends Omit<PressableProps, 'style' | 'onPress'> {
  /** File types to accept */
  accept: FileAcceptType;
  /** Callback when a file is selected */
  onFileSelected: (file: UploadFile) => void;
  /** Button text content (defaults to 'Upload File') */
  children?: string;
  /** Shows loading indicator and disables the button */
  loading?: boolean;
  /** Disables the button */
  disabled?: boolean;
  /** Accessibility label for screen readers (defaults to children if not provided) */
  accessibilityLabel?: string;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Custom style for the button container */
  style?: StyleProp<ViewStyle>;
  /** Custom style for the button text */
  textStyle?: StyleProp<TextStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * MIME types for each file type category
 */
const MIME_TYPES: Record<FileAcceptType, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  pdf: ['application/pdf'],
  all: ['video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'],
};

/**
 * FileUploadButton Component
 *
 * A pressable button that opens the document picker to select files.
 *
 * @example
 * ```tsx
 * // Upload video files
 * <FileUploadButton
 *   accept="video"
 *   onFileSelected={(file) => console.log('Selected:', file.name)}
 * >
 *   Upload Video
 * </FileUploadButton>
 *
 * // Upload PDF files with loading state
 * <FileUploadButton
 *   accept="pdf"
 *   loading={isUploading}
 *   onFileSelected={handleFileSelected}
 * >
 *   Upload PDF
 * </FileUploadButton>
 * ```
 */
export function FileUploadButton({
  accept,
  onFileSelected,
  children = 'Upload File',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
  testID,
  ...pressableProps
}: FileUploadButtonProps): React.ReactElement {
  // Button is disabled when loading or explicitly disabled
  const isDisabled = loading || disabled;

  /**
   * Handle button press - opens document picker
   */
  const handlePress = useCallback(async () => {
    if (isDisabled) {
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: MIME_TYPES[accept],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file: UploadFile = {
          name: asset.name,
          type: asset.mimeType || '',
          size: asset.size || 0,
          uri: asset.uri,
        };
        onFileSelected(file);
      }
    } catch (error) {
      // Handle error silently - user may have denied permission
      // or there was an issue with the document picker
      console.warn('Document picker error:', error);
    }
  }, [accept, isDisabled, onFileSelected]);

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator
            testID={testID ? `${testID}-loading` : 'file-upload-button-loading'}
            size="small"
            color={colors.white}
            accessibilityLabel="Loading"
          />
        ) : (
          <Text style={[styles.text, textStyle]} numberOfLines={1}>
            {children}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.white,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FileUploadButton;
