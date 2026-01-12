/**
 * SandboxDraggable Component
 *
 * Wrapper around react-native-reanimated-dnd Draggable component.
 * Renders a draggable element from a SandboxElement definition.
 *
 * Features:
 * - Accessibility support (44px min touch targets)
 * - Visual feedback during drag
 * - Console logging for debugging
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native';
import { Draggable } from 'react-native-reanimated-dnd';
import type { SandboxElement, ImageSource } from '../../types/sandbox';
import { MIN_TOUCH_TARGET_SIZE } from '../../types/sandbox';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';

/**
 * Data passed when dragging
 */
export interface DragData {
  id: string;
  content: string | ImageSource;
  elementType: SandboxElement['type'];
}

/**
 * Props for SandboxDraggable
 */
export interface SandboxDraggableProps {
  /** The element to render as draggable */
  element: SandboxElement;

  /** Whether this element is currently disabled */
  disabled?: boolean;

  /** Called when drag starts */
  onDragStart?: (elementId: string) => void;

  /** Called when drag ends */
  onDragEnd?: (elementId: string, position: { x: number; y: number }) => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Check if content is an ImageSource
 */
function isImageSource(content: string | ImageSource): content is ImageSource {
  return typeof content === 'object' && 'uri' in content;
}

/**
 * SandboxDraggable Component
 *
 * Renders a draggable element from a SandboxElement definition.
 */
export function SandboxDraggable({
  element,
  disabled = false,
  onDragStart,
  onDragEnd,
  testID,
}: SandboxDraggableProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  // Build drag data
  const dragData: DragData = useMemo(
    () => ({
      id: element.id,
      content: element.content,
      elementType: element.type,
    }),
    [element.id, element.content, element.type]
  );

  // Handle drag start (receives data object)
  const handleDragStart = useCallback(
    (data: DragData) => {
      console.log('[Draggable] Drag started:', data.id);
      onDragStart?.(data.id);
    },
    [onDragStart]
  );

  // Handle drag end (receives data object)
  const handleDragEnd = useCallback(
    (data: DragData) => {
      console.log('[Draggable] Drag ended:', data.id);
      // Note: Position tracking would require onDragging callback
      onDragEnd?.(data.id, { x: 0, y: 0 });
    },
    [onDragEnd]
  );

  // Build styles from element definition
  const styles = useMemo(() => {
    const { style, dimensions } = element;

    return StyleSheet.create({
      container: {
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: Math.max(dimensions.width, MIN_TOUCH_TARGET_SIZE),
        height: Math.max(dimensions.height, MIN_TOUCH_TARGET_SIZE),
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      content: {
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: style.backgroundColor || colors.primary,
        borderColor: style.borderColor || colors.border,
        borderWidth: style.borderWidth ?? 1,
        borderRadius: style.borderRadius ?? 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        // Shadow (React Native uses width/height for shadowOffset)
        shadowColor: style.shadowColor || colors.black,
        shadowOffset: {
          width: style.shadowOffset?.x ?? 0,
          height: style.shadowOffset?.y ?? 2
        },
        shadowRadius: style.shadowRadius ?? 4,
        shadowOpacity: 0.2,
        elevation: 4,
      } as ViewStyle,
      text: {
        color: style.textColor || colors.white,
        fontSize: style.fontSize ?? 14,
        fontWeight: style.fontWeight || 'normal',
        textAlign: 'center',
      } as TextStyle,
      image: {
        width: dimensions.width - 4,
        height: dimensions.height - 4,
        borderRadius: (style.borderRadius ?? 8) - 2,
      } as ImageStyle,
      disabled: {
        opacity: 0.5,
      } as ViewStyle,
    });
  }, [element, colors]);

  // Render content based on type
  const renderContent = () => {
    if (isImageSource(element.content)) {
      return (
        <Image
          source={{ uri: element.content.uri }}
          style={styles.image}
          accessibilityLabel={element.content.alt || 'Draggable image'}
        />
      );
    }

    return <Text style={styles.text}>{element.content}</Text>;
  };

  return (
    <View style={styles.container}>
      <Draggable
        data={dragData}
        dragDisabled={disabled || !element.draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <View
          style={[styles.content, disabled && styles.disabled]}
          testID={testID || `draggable-${element.id}`}
          accessibilityLabel={element.accessibilityLabel || `Draggable: ${typeof element.content === 'string' ? element.content : 'element'}`}
          accessibilityRole="button"
          accessibilityHint="Drag to a drop zone"
        >
          {renderContent()}
        </View>
      </Draggable>
    </View>
  );
}

export default SandboxDraggable;
