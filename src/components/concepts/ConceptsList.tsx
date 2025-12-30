/**
 * ConceptsList Component
 *
 * A list component that displays multiple concepts using FlatList
 * for efficient rendering of large lists. Supports:
 * - Efficient virtualized rendering
 * - Empty state message
 * - Concept press handling
 * - Timestamp press handling
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import type { Concept } from '../../types';
import { colors, spacing } from '../../theme';
import { ConceptCard } from './ConceptCard';

/**
 * Timestamp structure for source references
 */
interface Timestamp {
  start: number;
  end: number;
}

/**
 * Props for the ConceptsList component
 */
export interface ConceptsListProps {
  /** Array of concepts to display */
  concepts: Concept[];
  /** Callback when a concept card is pressed */
  onConceptPress?: (concept: Concept) => void;
  /** Callback when a timestamp is pressed */
  onTimestampPress?: (conceptId: string, timestamp: Timestamp) => void;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Default empty state message
 */
const DEFAULT_EMPTY_MESSAGE = 'No concepts found';

/**
 * ConceptsList Component
 *
 * @example
 * ```tsx
 * <ConceptsList
 *   concepts={concepts}
 *   onConceptPress={(concept) => navigateToConcept(concept.id)}
 *   onTimestampPress={(conceptId, timestamp) => seekToTime(timestamp.start)}
 *   emptyMessage="No concepts extracted yet"
 * />
 * ```
 */
export function ConceptsList({
  concepts,
  onConceptPress,
  onTimestampPress,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  testID = 'concepts-list',
}: ConceptsListProps): React.ReactElement {
  // Memoized render function for FlatList items
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Concept>) => {
      const handlePress = onConceptPress
        ? () => onConceptPress(item)
        : undefined;

      const handleTimestampPress = onTimestampPress
        ? (timestamp: Timestamp) => onTimestampPress(item.id, timestamp)
        : undefined;

      return (
        <ConceptCard
          concept={item}
          onPress={handlePress}
          onTimestampPress={handleTimestampPress}
          testID={`${testID}-item-${item.id}`}
          style={styles.card}
        />
      );
    },
    [onConceptPress, onTimestampPress, testID]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Concept) => item.id, []);

  // Render empty state
  const renderEmpty = useCallback(
    () => (
      <View
        testID={`${testID}-empty`}
        style={styles.emptyContainer}
        accessible={true}
        accessibilityLabel={emptyMessage}
        accessibilityRole="text"
      >
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    ),
    [emptyMessage, testID]
  );

  // Item separator
  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  return (
    <FlatList
      testID={testID}
      data={concepts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={renderSeparator}
      contentContainerStyle={[
        styles.contentContainer,
        concepts.length === 0 && styles.emptyContentContainer,
      ]}
      showsVerticalScrollIndicator={true}
      accessible={true}
      accessibilityLabel={
        concepts.length > 0
          ? `Concepts list, ${concepts.length} items`
          : emptyMessage
      }
      accessibilityRole="list"
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: spacing[4],
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 0, // Separator handles spacing
  },
  separator: {
    height: spacing[3],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ConceptsList;
