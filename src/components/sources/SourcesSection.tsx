/**
 * SourcesSection Component
 *
 * A section component for displaying project sources:
 * - Uses useSources() hook to get sources data
 * - Shows loading spinner when loading
 * - Shows empty state with add source CTA when no sources
 * - Shows list of SourceCards when sources exist
 * - Passes uploadProgress to SourceCard when source is uploading
 * - Handles delete via useSources().removeSource
 *
 * Follows accessibility guidelines from the Base Component Library spec.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import { Button } from '../ui/Button';
import { SourceCard } from '../ui/SourceCard';
import { useSources } from '../../lib/sources-context';
import { colors } from '../../theme';
import type { Source } from '../../types/database';

/**
 * Props for the SourcesSection component
 */
export interface SourcesSectionProps {
  /** Called when add source button is pressed */
  onAddSource: () => void;
}

/**
 * SourcesSection Component
 *
 * Displays project sources in a section with appropriate states:
 * - Loading state with spinner
 * - Empty state with add source CTA
 * - Sources list with SourceCards
 *
 * @example
 * ```tsx
 * <SourcesSection onAddSource={() => setAddSourceSheetOpen(true)} />
 * ```
 */
export function SourcesSection({
  onAddSource,
}: SourcesSectionProps): React.ReactElement {
  const { sources, loading, uploadProgress, removeSource } = useSources();

  /**
   * Handle delete button press on SourceCard
   */
  const handleDelete = (sourceId: string) => {
    removeSource(sourceId);
  };

  /**
   * Render a single source card
   */
  const renderSourceCard = ({ item }: { item: Source }) => {
    // Pass uploadProgress only to sources that are uploading
    const progress = item.status === 'uploading' ? uploadProgress ?? 0 : undefined;

    return (
      <SourceCard
        source={item}
        onDelete={() => handleDelete(item.id)}
        uploadProgress={progress}
        style={styles.sourceCard}
      />
    );
  };

  /**
   * Render the content based on state
   */
  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <View testID="sources-section-loading" style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            accessibilityLabel="Loading sources"
          />
        </View>
      );
    }

    // Empty state
    if (sources.length === 0) {
      return (
        <View testID="sources-section-empty" style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No sources yet</Text>
          <Text style={styles.emptyDescription}>
            Add videos, PDFs, or web links to start learning
          </Text>
          <Button
            testID="sources-section-empty-add-button"
            onPress={onAddSource}
            accessibilityLabel="Add your first source"
            accessibilityHint="Opens the add source menu"
            style={styles.emptyAddButton}
          >
            Add Source
          </Button>
        </View>
      );
    }

    // Sources list
    return (
      <View testID="sources-section-list" style={styles.listContainer}>
        <FlatList
          data={sources}
          renderItem={renderSourceCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
        <Button
          testID="sources-section-add-button"
          variant="outline"
          onPress={onAddSource}
          accessibilityLabel="Add another source"
          accessibilityHint="Opens the add source menu"
          style={styles.addButton}
        >
          Add Source
        </Button>
      </View>
    );
  };

  return (
    <View testID="sources-section" style={styles.container}>
      <Text style={styles.sectionHeader}>Sources</Text>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyAddButton: {
    minWidth: 140,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  sourceCard: {
    marginBottom: 0,
  },
  addButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
});

export default SourcesSection;
