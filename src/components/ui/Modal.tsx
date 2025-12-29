/**
 * Modal Component
 *
 * A dialog component for confirmations and alerts.
 * Features:
 * - Controlled visibility via `visible` prop
 * - Semi-transparent backdrop with optional close on tap
 * - Centered card with title, content, and actions areas
 * - Close button (X) in top-right corner
 * - Slide/fade animation
 * - Accessibility support with proper roles and modal flag
 */

import React, { type ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, spacing } from '../../theme';

/**
 * Props for the Modal component
 */
export interface ModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Optional title displayed at the top */
  title?: string;
  /** Content to render inside the modal */
  children: ReactNode;
  /** Optional footer actions (buttons) */
  actions?: ReactNode;
  /** Whether tapping backdrop closes modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Modal Component
 *
 * A styled dialog that displays content in a centered card overlay.
 * Supports title, custom content, and action buttons.
 *
 * @example
 * ```tsx
 * <Modal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 *   actions={
 *     <>
 *       <Button onPress={() => setShowModal(false)}>Cancel</Button>
 *       <Button onPress={handleConfirm}>Confirm</Button>
 *     </>
 *   }
 * >
 *   <Text>Are you sure you want to proceed?</Text>
 * </Modal>
 * ```
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  actions,
  closeOnBackdrop = true,
  testID = 'modal',
}: ModalProps): React.ReactElement {
  /**
   * Handle backdrop press
   */
  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  /**
   * Prevent event propagation from card to backdrop
   */
  const handleCardPress = () => {
    // Do nothing - prevents backdrop press handler from triggering
  };

  return (
    <RNModal
      testID={testID}
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityRole="none"
    >
      <Pressable
        testID="modal-backdrop"
        style={styles.backdrop}
        onPress={handleBackdropPress}
      >
        <Pressable
          testID="modal-card"
          style={styles.card}
          onPress={handleCardPress}
          accessibilityRole="alert"
          accessibilityViewIsModal={true}
        >
          {/* Header with title and close button */}
          <View style={styles.header}>
            {title ? (
              <Text
                testID="modal-title"
                style={styles.title}
                accessibilityRole="header"
              >
                {title}
              </Text>
            ) : (
              <View style={styles.titlePlaceholder} />
            )}
            <Pressable
              testID="modal-close-button"
              onPress={onClose}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>{'\u00D7'}</Text>
            </Pressable>
          </View>

          {/* Content area */}
          <View style={styles.content}>{children}</View>

          {/* Actions area (if provided) */}
          {actions && (
            <View testID="modal-actions" style={styles.actions}>
              {actions}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

/**
 * Styles for Modal component
 */
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    minWidth: 280,
    maxWidth: '90%',
    // Shadow for iOS
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 8,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing[2],
  } as TextStyle,
  titlePlaceholder: {
    flex: 1,
  } as ViewStyle,
  closeButton: {
    padding: spacing[1],
  } as ViewStyle,
  closeButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 24,
  } as TextStyle,
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  } as ViewStyle,
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  } as ViewStyle,
});

export default Modal;
