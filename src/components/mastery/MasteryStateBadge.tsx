/**
 * MasteryStateBadge Component
 *
 * A small badge displaying the mastery state of a concept.
 * Color-coded by state for quick visual identification:
 * - unseen: gray (not yet encountered)
 * - exposed: yellow (first exposure)
 * - fragile: orange (early learning)
 * - developing: blue (building strength)
 * - solid: green (well learned)
 * - mastered: emerald (fully mastered)
 * - misconceived: red (needs correction)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MasteryState, STATE_METADATA } from '../../lib/spaced-repetition';
import { colors } from '../../theme';

/**
 * Props for the MasteryStateBadge component
 */
export interface MasteryStateBadgeProps {
  /** The mastery state to display */
  state: MasteryState;
  /** Whether to show a compact (icon-only) version */
  compact?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * MasteryStateBadge Component
 *
 * Displays a color-coded badge representing a concept's mastery state.
 * Supports compact mode for use in lists or small spaces.
 *
 * @example
 * ```tsx
 * <MasteryStateBadge state="developing" />
 * <MasteryStateBadge state="mastered" compact />
 * ```
 */
export function MasteryStateBadge({
  state,
  compact = false,
  testID = 'mastery-state-badge',
}: MasteryStateBadgeProps): React.ReactElement {
  const metadata = STATE_METADATA[state];
  const accessibilityLabel = `Mastery level: ${metadata.label}`;

  if (compact) {
    return (
      <View
        testID={testID}
        style={[styles.compactBadge, { backgroundColor: metadata.color }]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
      />
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: metadata.color }]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{metadata.label}</Text>
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
  compactBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MasteryStateBadge;
