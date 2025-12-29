/**
 * BottomSheet Component
 *
 * A mobile-friendly drawer component that slides up from the bottom.
 * Features:
 * - Controlled visibility via `visible` prop
 * - Slides up from bottom with animation
 * - Semi-transparent backdrop with optional close on tap
 * - White sheet with rounded top corners
 * - Optional drag handle at top
 * - Optional title below handle
 * - Scrollable content area
 * - KeyboardAvoidingView for form inputs
 * - Accessibility support with proper roles and modal flag
 */

import React, { type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type DimensionValue,
} from 'react-native';
import { colors, spacing } from '../../theme';

/**
 * Props for the BottomSheet component
 */
export interface BottomSheetProps {
  /** Controls bottom sheet visibility */
  visible: boolean;
  /** Called when bottom sheet should close */
  onClose: () => void;
  /** Optional title displayed below the handle */
  title?: string;
  /** Content to render inside the bottom sheet */
  children: ReactNode;
  /** Height of the sheet (number in pixels or percentage string) */
  height?: number | string;
  /** Whether tapping backdrop closes sheet (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether to show drag handle at top (default: true) */
  showHandle?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * BottomSheet Component
 *
 * A styled drawer that slides up from the bottom of the screen.
 * Supports title, scrollable content, and keyboard avoidance for forms.
 *
 * @example
 * ```tsx
 * <BottomSheet
 *   visible={showSheet}
 *   onClose={() => setShowSheet(false)}
 *   title="Select Option"
 *   height="50%"
 * >
 *   <Text>Sheet content here</Text>
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height,
  closeOnBackdrop = true,
  showHandle = true,
  testID = 'bottomsheet',
}: BottomSheetProps): React.ReactElement {
  /**
   * Handle backdrop press
   */
  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  /**
   * Prevent event propagation from sheet to backdrop
   */
  const handleSheetPress = () => {
    // Do nothing - prevents backdrop press handler from triggering
  };

  /**
   * Get container style with optional height
   */
  const containerStyle: ViewStyle[] = [styles.container];
  if (height !== undefined) {
    containerStyle.push({ height: height as DimensionValue });
  }

  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      accessibilityRole="none"
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          testID="bottomsheet-backdrop"
          style={styles.backdrop}
          onPress={handleBackdropPress}
        >
          <Pressable
            testID="bottomsheet-container"
            style={containerStyle}
            onPress={handleSheetPress}
            accessibilityViewIsModal={true}
          >
            {/* Drag handle */}
            {showHandle && (
              <View
                testID="bottomsheet-handle"
                style={styles.handleContainer}
                accessibilityHint="Drag down to close"
              >
                <View style={styles.handle} />
              </View>
            )}

            {/* Title */}
            {title && (
              <Text
                testID="bottomsheet-title"
                style={styles.title}
                accessibilityRole="header"
              >
                {title}
              </Text>
            )}

            {/* Scrollable content area */}
            <ScrollView
              testID="bottomsheet-scrollview"
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Styles for BottomSheet component
 */
const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  } as ViewStyle,
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    // Shadow for iOS
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
  } as ViewStyle,
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  } as ViewStyle,
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  } as TextStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollViewContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  } as ViewStyle,
});

export default BottomSheet;
