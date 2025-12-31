/**
 * RatingButtons Component
 *
 * Four buttons for rating a review: Again, Hard, Good, Easy.
 * Shows predicted intervals below each button.
 * Colors match the FSRS rating scale.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FSRSRating, RATING_LABELS, previewIntervals, FSRSCard } from '../../lib/fsrs';
import { colors } from '../../theme';

/**
 * Props for the RatingButtons component
 */
export interface RatingButtonsProps {
  /** Callback when a rating is selected */
  onRate: (rating: FSRSRating) => void;
  /** Current FSRS card for interval preview (optional) */
  card?: FSRSCard;
  /** Whether buttons are disabled */
  disabled?: boolean;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Rating button colors
 */
const RATING_COLORS: Record<FSRSRating, string> = {
  1: colors.error, // Again - red
  2: '#F97316', // Hard - orange
  3: colors.success, // Good - green
  4: '#22D3EE', // Easy - cyan
};

/**
 * Format interval for display
 */
function formatInterval(days: number): string {
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    return `${minutes}m`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  const months = Math.round(days / 30);
  return `${months}mo`;
}

/**
 * RatingButtons Component
 *
 * Displays four rating buttons with optional interval previews.
 *
 * @example
 * ```tsx
 * <RatingButtons onRate={handleRate} />
 * <RatingButtons onRate={handleRate} card={fsrsCard} />
 * ```
 */
export function RatingButtons({
  onRate,
  card,
  disabled = false,
  testID = 'rating-buttons',
}: RatingButtonsProps): React.ReactElement {
  // Get interval previews if card is provided
  const intervals = card ? previewIntervals(card) : null;

  const handlePress = (rating: FSRSRating) => {
    if (!disabled) {
      onRate(rating);
    }
  };

  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.title}>How did you do?</Text>

      <View style={styles.buttonsRow}>
        {([1, 2, 3, 4] as FSRSRating[]).map((rating) => {
          const color = RATING_COLORS[rating];
          const label = RATING_LABELS[rating];
          const interval =
            intervals && rating === 1
              ? intervals.again
              : intervals && rating === 2
                ? intervals.hard
                : intervals && rating === 3
                  ? intervals.good
                  : intervals && rating === 4
                    ? intervals.easy
                    : null;

          return (
            <Pressable
              key={rating}
              testID={`${testID}-${label.toLowerCase()}`}
              onPress={() => handlePress(rating)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: color },
                pressed && !disabled && styles.pressed,
                disabled && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Rate as ${label}`}
              accessibilityHint={interval ? `Next review in ${formatInterval(interval)}` : undefined}
            >
              <Text style={styles.buttonText}>{label}</Text>
              {interval !== null && (
                <Text style={styles.intervalText}>{formatInterval(interval)}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  intervalText: {
    color: colors.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default RatingButtons;
