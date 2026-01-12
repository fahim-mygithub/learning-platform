/**
 * SandboxDroppable Component
 *
 * Wrapper around react-native-reanimated-dnd Droppable component.
 * Renders a drop zone that accepts draggable elements.
 *
 * Features:
 * - Visual feedback for hover state
 * - Capacity constraints
 * - Accessibility support (44px min touch targets)
 * - Console logging for debugging
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Droppable } from 'react-native-reanimated-dnd';
import type { SandboxElement, Position } from '../../types/sandbox';
import { MIN_TOUCH_TARGET_SIZE } from '../../types/sandbox';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';
import type { DragData } from './SandboxDraggable';

/**
 * Props for SandboxDroppable
 */
export interface SandboxDroppableProps {
  /** Unique zone ID */
  zoneId: string;

  /** Position of the drop zone */
  position: Position;

  /** Dimensions of the drop zone */
  dimensions: { width: number; height: number };

  /** Label to display in the zone */
  label?: string;

  /** Maximum number of elements this zone can hold */
  capacity?: number;

  /** Current number of elements in this zone */
  currentCount?: number;

  /** Called when an element is dropped */
  onDrop: (zoneId: string, data: DragData) => void;

  /** Whether this zone is disabled */
  disabled?: boolean;

  /** Style overrides */
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
  };

  /** Test ID for testing */
  testID?: string;

  /** Children (dropped elements) */
  children?: React.ReactNode;
}

/**
 * SandboxDroppable Component
 *
 * Renders a drop zone that accepts draggable elements.
 */
export function SandboxDroppable({
  zoneId,
  position,
  dimensions,
  label,
  capacity = 1,
  currentCount = 0,
  onDrop,
  disabled = false,
  style: customStyle,
  testID,
  children,
}: SandboxDroppableProps): React.ReactElement {
  const { getColors } = useTypography();
  const colors = getColors();

  // Hover state for visual feedback
  const [isHovered, setIsHovered] = useState(false);

  // Check if zone is at capacity
  const isAtCapacity = currentCount >= capacity;

  // Handle drop
  const handleDrop = useCallback(
    (data: DragData) => {
      if (isAtCapacity || disabled) {
        console.log('[Droppable] Rejected (at capacity):', zoneId);
        return;
      }

      console.log('[Droppable] Element dropped:', data.id, 'into:', zoneId);
      onDrop(zoneId, data);
    },
    [zoneId, isAtCapacity, disabled, onDrop]
  );

  // Handle active state changes (when item hovers over drop zone)
  const handleActiveChange = useCallback(
    (isActive: boolean) => {
      if (!isAtCapacity && !disabled) {
        console.log('[Droppable] Hover state:', zoneId, isActive);
        setIsHovered(isActive);
      }
    },
    [zoneId, isAtCapacity, disabled]
  );

  // Build styles
  const styles = useMemo(() => {
    const baseBackgroundColor = customStyle?.backgroundColor || colors.backgroundSecondary;
    const baseBorderColor = customStyle?.borderColor || colors.border;

    // Determine colors based on state
    let backgroundColor = baseBackgroundColor;
    let borderColor = baseBorderColor;

    if (isHovered && !isAtCapacity) {
      backgroundColor = colors.primary + '30'; // 30% opacity
      borderColor = colors.primary;
    } else if (isAtCapacity) {
      backgroundColor = colors.success + '20'; // 20% opacity
      borderColor = colors.success;
    }

    return StyleSheet.create({
      container: {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: Math.max(dimensions.width, MIN_TOUCH_TARGET_SIZE),
        height: Math.max(dimensions.height, MIN_TOUCH_TARGET_SIZE),
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      dropZone: {
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor,
        borderColor,
        borderWidth: customStyle?.borderWidth ?? 2,
        borderRadius: customStyle?.borderRadius ?? 8,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      } as ViewStyle,
      label: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        opacity: children ? 0 : 1, // Hide label when has children
      } as TextStyle,
      capacityBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: isAtCapacity ? colors.success : colors.textSecondary,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
      } as ViewStyle,
      capacityText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '600',
      } as TextStyle,
      disabled: {
        opacity: 0.5,
      } as ViewStyle,
      childrenContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
    });
  }, [colors, position, dimensions, customStyle, isHovered, isAtCapacity, children]);

  return (
    <View style={styles.container}>
      <Droppable
        onDrop={handleDrop}
        onActiveChange={handleActiveChange}
        dropAlignment="center"
        dropDisabled={disabled || isAtCapacity}
        droppableId={zoneId}
      >
        <View
          style={[styles.dropZone, disabled && styles.disabled]}
          testID={testID || `droppable-${zoneId}`}
          accessibilityLabel={`Drop zone: ${label || zoneId}. ${currentCount} of ${capacity} items.`}
          accessibilityRole="button"
          accessibilityHint={isAtCapacity ? 'Zone is full' : 'Drop an item here'}
        >
          {/* Label (hidden when has children) */}
          {label && <Text style={styles.label}>{label}</Text>}

          {/* Dropped children */}
          {children && <View style={styles.childrenContainer}>{children}</View>}

          {/* Capacity badge (only show if capacity > 1) */}
          {capacity > 1 && (
            <View style={styles.capacityBadge}>
              <Text style={styles.capacityText}>
                {currentCount}/{capacity}
              </Text>
            </View>
          )}
        </View>
      </Droppable>
    </View>
  );
}

export default SandboxDroppable;
