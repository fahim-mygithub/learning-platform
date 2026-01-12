/**
 * SandboxCanvas Component
 *
 * Wrapper component that provides the DropProvider context for drag-and-drop
 * interactions within the sandbox. All Draggable and Droppable components
 * must be rendered as children of this component.
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DropProvider } from 'react-native-reanimated-dnd';
import type { CanvasConfig } from '../../types/sandbox';
import { MIN_TOUCH_TARGET_SIZE, DEFAULT_CANVAS_CONFIG } from '../../types/sandbox';

/**
 * Props for SandboxCanvas
 */
export interface SandboxCanvasProps {
  /** Canvas configuration */
  config?: CanvasConfig;

  /** Children to render inside the canvas */
  children: React.ReactNode;

  /** Test ID for testing */
  testID?: string;
}

/**
 * SandboxCanvas Component
 *
 * Provides the drag-and-drop context for sandbox interactions.
 * Wraps children in GestureHandlerRootView and DropProvider.
 */
export function SandboxCanvas({
  config = DEFAULT_CANVAS_CONFIG,
  children,
  testID = 'sandbox-canvas',
}: SandboxCanvasProps): React.ReactElement {
  console.log('[SandboxCanvas] Initialized:', {
    width: config.width,
    height: config.height
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        } as ViewStyle,
        canvas: {
          width: config.width,
          height: config.height,
          backgroundColor: config.backgroundColor,
          borderRadius: 12,
          overflow: 'hidden',
          // Ensure minimum touch targets
          minWidth: MIN_TOUCH_TARGET_SIZE,
          minHeight: MIN_TOUCH_TARGET_SIZE,
        } as ViewStyle,
      }),
    [config.width, config.height, config.backgroundColor]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <DropProvider>
        <View style={styles.canvas} testID={testID}>
          {children}
        </View>
      </DropProvider>
    </GestureHandlerRootView>
  );
}

export default SandboxCanvas;
