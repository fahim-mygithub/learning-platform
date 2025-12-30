/**
 * MasteryGate Component
 *
 * A visual gate component displayed between levels in a learning roadmap.
 * Shows the required mastery score and locked/unlocked state.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import type { MasteryGate as MasteryGateType } from '../../types';

/**
 * Props for the MasteryGate component
 */
export interface MasteryGateProps {
  /** The mastery gate data */
  gate: MasteryGateType;
  /** Whether the gate is unlocked (previous level completed) */
  isUnlocked?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * MasteryGate Component
 *
 * Displays a visual gate between roadmap levels with:
 * - Required score percentage
 * - Lock/unlock visual indicator
 * - Accessibility information
 *
 * @example
 * ```tsx
 * <MasteryGate
 *   gate={{ after_level: 1, required_score: 80, quiz_concept_ids: ['c1', 'c2'] }}
 *   isUnlocked={false}
 * />
 * ```
 */
export function MasteryGate({
  gate,
  isUnlocked = false,
  testID = 'mastery-gate',
}: MasteryGateProps): React.ReactElement {
  const accessibilityLabel = isUnlocked
    ? `Mastery gate after level ${gate.after_level}, ${gate.required_score}% mastery required, unlocked`
    : `Mastery gate after level ${gate.after_level}, ${gate.required_score}% mastery required, locked`;

  return (
    <View
      testID={testID}
      style={[styles.container, !isUnlocked && styles.locked]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      {/* Left connector line */}
      <View style={[styles.line, !isUnlocked && styles.lineLocked]} />

      {/* Gate badge */}
      <View style={[styles.badge, !isUnlocked && styles.badgeLocked]}>
        {/* Lock/Unlock icon */}
        <Text style={[styles.icon, !isUnlocked && styles.iconLocked]}>
          {isUnlocked ? '\u2713' : '\u{1F512}'}
        </Text>
        <Text style={[styles.text, !isUnlocked && styles.textLocked]}>
          {gate.required_score}% mastery required
        </Text>
      </View>

      {/* Right connector line */}
      <View style={[styles.line, !isUnlocked && styles.lineLocked]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  locked: {
    opacity: 0.7,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.secondary,
  },
  lineLocked: {
    backgroundColor: colors.border,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: spacing[1],
  },
  badgeLocked: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  icon: {
    fontSize: 14,
    color: colors.secondary,
  },
  iconLocked: {
    color: colors.textTertiary,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  textLocked: {
    color: colors.textTertiary,
  },
});

export default MasteryGate;
