/**
 * DifficultyIndicator Component
 *
 * A visual indicator showing difficulty level on a scale of 1-10.
 * Displays as a row of dots with filled/unfilled states.
 * Includes a text label showing Easy/Medium/Hard.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

/**
 * Props for the DifficultyIndicator component
 */
export interface DifficultyIndicatorProps {
  /** Difficulty value from 1-10 (null/undefined shows all unfilled) */
  difficulty: number | null | undefined;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Number of dots to display
 */
const TOTAL_DOTS = 10;

/**
 * Difficulty level thresholds and colors
 */
const DIFFICULTY_LEVELS = {
  easy: { max: 3, color: '#22C55E', label: 'Easy' },
  medium: { max: 6, color: '#F59E0B', label: 'Medium' },
  hard: { max: 10, color: '#EF4444', label: 'Hard' },
} as const;

/**
 * Get difficulty level info based on value
 */
function getDifficultyLevel(value: number | null | undefined): {
  color: string;
  label: string;
} {
  if (value === null || value === undefined || value <= 0) {
    return { color: colors.disabled, label: '' };
  }

  if (value <= DIFFICULTY_LEVELS.easy.max) {
    return {
      color: DIFFICULTY_LEVELS.easy.color,
      label: DIFFICULTY_LEVELS.easy.label,
    };
  }

  if (value <= DIFFICULTY_LEVELS.medium.max) {
    return {
      color: DIFFICULTY_LEVELS.medium.color,
      label: DIFFICULTY_LEVELS.medium.label,
    };
  }

  return {
    color: DIFFICULTY_LEVELS.hard.color,
    label: DIFFICULTY_LEVELS.hard.label,
  };
}

/**
 * Clamp and round a value
 */
function normalizeValue(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Math.min(Math.max(Math.round(value), 0), TOTAL_DOTS);
}

/**
 * DifficultyIndicator Component
 *
 * @example
 * ```tsx
 * <DifficultyIndicator difficulty={7} />
 * ```
 */
export function DifficultyIndicator({
  difficulty,
  testID = 'difficulty-indicator',
}: DifficultyIndicatorProps): React.ReactElement {
  const normalizedValue = normalizeValue(difficulty);
  const { color, label } = getDifficultyLevel(difficulty);

  const accessibilityLabel =
    difficulty === null || difficulty === undefined
      ? 'Difficulty: Unknown'
      : `Difficulty: ${normalizedValue} out of 10`;

  return (
    <View
      testID={testID}
      style={styles.container}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      <View style={styles.dotsContainer}>
        {Array.from({ length: TOTAL_DOTS }, (_, index) => {
          const isFilled = index < normalizedValue;
          return (
            <View
              key={index}
              testID={`${testID}-dot-${index}`}
              style={[
                styles.dot,
                { backgroundColor: color },
                { opacity: isFilled ? 1 : 0.3 },
              ]}
            />
          );
        })}
      </View>
      {label && <Text style={[styles.label, { color }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default DifficultyIndicator;
