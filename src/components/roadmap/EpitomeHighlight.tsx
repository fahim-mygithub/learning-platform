/**
 * EpitomeHighlight Component
 *
 * Displays the epitome (thesis/core understanding) concept at Level 0.
 * This is the central concept that all other concepts elaborate on.
 * Styled distinctly to indicate it's the "big idea" of the module.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, spacing } from '../../theme';
import type { Concept, RoadmapLevel } from '../../types';
import { Card } from '../ui';
import { formatMinutes } from './TimeEstimate';

/**
 * Props for the EpitomeHighlight component
 */
export interface EpitomeHighlightProps {
  /** The Level 0 data */
  level: RoadmapLevel;
  /** The epitome concept */
  concept?: Concept;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
}

/**
 * EpitomeHighlight Component
 *
 * @example
 * ```tsx
 * <EpitomeHighlight
 *   level={level0}
 *   concept={epitomeConcept}
 * />
 * ```
 */
export function EpitomeHighlight({
  level,
  concept,
  testID = 'epitome-highlight',
  style,
}: EpitomeHighlightProps): React.ReactElement {
  const accessibilityLabel = `Core Understanding: ${level.title}. ${concept?.definition || ''} Estimated time: ${formatMinutes(level.estimated_minutes)}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
      style={style}
    >
      <Card style={styles.card}>
        {/* Header with special Level 0 badge */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Special epitome badge */}
            <View style={styles.epitomeBadge}>
              <Text style={styles.epitomeBadgeText}>0</Text>
            </View>

            {/* Title section */}
            <View style={styles.titleSection}>
              <Text style={styles.subtitle}>Core Understanding (Epitome)</Text>
              <Text style={styles.title} numberOfLines={2}>
                {level.title}
              </Text>
            </View>
          </View>

          {/* Star icon to indicate importance */}
          <View style={styles.starContainer}>
            <Text style={styles.starIcon}>&#9733;</Text>
          </View>
        </View>

        {/* Concept definition if available */}
        {concept?.definition && (
          <View style={styles.definitionContainer}>
            <Text style={styles.definition} numberOfLines={3}>
              {concept.definition}
            </Text>
          </View>
        )}

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Text style={styles.infoPillText}>Thesis</Text>
          </View>
          <Text style={styles.infoText}>
            ~{formatMinutes(level.estimated_minutes)}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF', // Light indigo background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing[3],
  },
  epitomeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  epitomeBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  titleSection: {
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  starContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  definitionContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  definition: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  infoPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 12,
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default EpitomeHighlight;
