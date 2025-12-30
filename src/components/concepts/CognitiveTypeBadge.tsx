/**
 * CognitiveTypeBadge Component
 *
 * A small badge displaying the cognitive type of a concept.
 * Color-coded by type for quick visual identification:
 * - declarative: blue (factual knowledge)
 * - conceptual: purple (understanding relationships)
 * - procedural: green (how-to knowledge)
 * - conditional: orange (when/why knowledge)
 * - metacognitive: pink (self-awareness knowledge)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CognitiveType } from '../../types';
import { colors } from '../../theme';

/**
 * Props for the CognitiveTypeBadge component
 */
export interface CognitiveTypeBadgeProps {
  /** The cognitive type to display */
  type: CognitiveType;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Color mapping for each cognitive type
 */
const COGNITIVE_TYPE_COLORS: Record<CognitiveType, string> = {
  declarative: '#3B82F6', // blue
  conceptual: '#8B5CF6', // purple
  procedural: '#22C55E', // green
  conditional: '#F97316', // orange
  metacognitive: '#EC4899', // pink
};

/**
 * Format cognitive type for display (capitalize first letter)
 */
function formatCognitiveType(type: CognitiveType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * CognitiveTypeBadge Component
 *
 * @example
 * ```tsx
 * <CognitiveTypeBadge type="procedural" />
 * ```
 */
export function CognitiveTypeBadge({
  type,
  testID = 'cognitive-type-badge',
}: CognitiveTypeBadgeProps): React.ReactElement {
  const backgroundColor = COGNITIVE_TYPE_COLORS[type];
  const displayText = formatCognitiveType(type);
  const accessibilityLabel = `Cognitive type: ${displayText}`;

  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor }]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CognitiveTypeBadge;
