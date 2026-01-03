/**
 * DragList Component (Ordering/Sequencing)
 *
 * A drag-to-reorder list component with:
 * - Drag handles for reordering (using simple up/down buttons for accessibility)
 * - Gesture-friendly for mobile
 * - Check order button
 * - Disabled state after answer
 * - Accessibility support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

/**
 * Props for the DragList component
 */
export interface DragListProps {
  /** Array of items to order */
  options: string[];
  /** Callback when the order is submitted */
  onAnswer: (answer: string) => void;
  /** Whether the input is disabled (e.g., after answering) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Custom style for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Item height (56px)
 */
const ITEM_HEIGHT = 56;

/**
 * Gap between items (12px)
 */
const ITEM_GAP = 12;

/**
 * DragList Component
 *
 * Displays a list of items that can be reordered using up/down buttons.
 * Submits the final order as a comma-separated string.
 *
 * @example
 * ```tsx
 * <DragList
 *   options={['First', 'Second', 'Third', 'Fourth']}
 *   onAnswer={(order) => console.log('Order:', order)}
 * />
 * ```
 */
export function DragList({
  options,
  onAnswer,
  disabled = false,
  testID,
  style,
}: DragListProps): React.ReactElement {
  const [items, setItems] = useState<string[]>(options);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    if (disabled || isSubmitted) return;

    setItems((currentItems) => {
      const newItems = [...currentItems];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Bounds check
      if (newIndex < 0 || newIndex >= newItems.length) {
        return currentItems;
      }

      // Swap items
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      return newItems;
    });
  }, [disabled, isSubmitted]);

  const handleSubmit = () => {
    if (disabled || isSubmitted) return;
    setIsSubmitted(true);
    // Submit as comma-separated string of items in their current order
    onAnswer(items.join(','));
  };

  const isDisabled = disabled || isSubmitted;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View
            key={`${item}-${index}`}
            testID={testID ? `${testID}-item-${index}` : `drag-item-${index}`}
            style={[styles.item, isDisabled && styles.itemDisabled]}
          >
            <View style={styles.orderIndicator}>
              <Text style={styles.orderNumber}>{index + 1}</Text>
            </View>

            <Text
              style={[styles.itemText, isDisabled && styles.itemTextDisabled]}
              numberOfLines={2}
            >
              {item}
            </Text>

            <View style={styles.controls}>
              <Pressable
                testID={testID ? `${testID}-up-${index}` : `drag-up-${index}`}
                onPress={() => moveItem(index, 'up')}
                disabled={isDisabled || index === 0}
                accessibilityRole="button"
                accessibilityLabel={`Move ${item} up`}
                accessibilityState={{
                  disabled: isDisabled || index === 0,
                }}
                style={({ pressed }) => [
                  styles.controlButton,
                  (isDisabled || index === 0) && styles.controlButtonDisabled,
                  pressed && !isDisabled && index !== 0 && styles.controlButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.controlButtonText,
                    (isDisabled || index === 0) && styles.controlButtonTextDisabled,
                  ]}
                >
                  ↑
                </Text>
              </Pressable>

              <Pressable
                testID={testID ? `${testID}-down-${index}` : `drag-down-${index}`}
                onPress={() => moveItem(index, 'down')}
                disabled={isDisabled || index === items.length - 1}
                accessibilityRole="button"
                accessibilityLabel={`Move ${item} down`}
                accessibilityState={{
                  disabled: isDisabled || index === items.length - 1,
                }}
                style={({ pressed }) => [
                  styles.controlButton,
                  (isDisabled || index === items.length - 1) && styles.controlButtonDisabled,
                  pressed && !isDisabled && index !== items.length - 1 && styles.controlButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.controlButtonText,
                    (isDisabled || index === items.length - 1) && styles.controlButtonTextDisabled,
                  ]}
                >
                  ↓
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        testID={testID ? `${testID}-submit` : 'drag-submit'}
        onPress={handleSubmit}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel="Check order"
        accessibilityState={{
          disabled: isDisabled,
        }}
        style={({ pressed }) => [
          styles.submitButton,
          isDisabled && styles.submitButtonDisabled,
          pressed && !isDisabled && styles.submitButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.submitButtonText,
            isDisabled && styles.submitButtonTextDisabled,
          ]}
        >
          Check Order
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  listContainer: {
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ITEM_HEIGHT,
    marginBottom: ITEM_GAP,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  itemDisabled: {
    opacity: 0.6,
  },
  orderIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  itemTextDisabled: {
    color: colors.textTertiary,
  },
  controls: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonPressed: {
    backgroundColor: colors.primary,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  controlButtonTextDisabled: {
    color: colors.textTertiary,
  },
  submitButton: {
    minHeight: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.white,
  },
});

export default DragList;
