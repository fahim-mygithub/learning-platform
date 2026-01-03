/**
 * MCInput Component (Multiple Choice)
 *
 * A multiple choice input component with:
 * - 4 options with 56px height, 12px gap
 * - Visual feedback on selection (highlight selected)
 * - Disabled state after answer
 * - Accessibility support
 */

import React, { useState } from 'react';
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
 * Props for the MCInput component
 */
export interface MCInputProps {
  /** Array of option strings to display */
  options: string[];
  /** Callback when an option is selected */
  onAnswer: (answer: string) => void;
  /** Whether the input is disabled (e.g., after answering) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Custom style for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Option height as per spec (56px)
 */
const OPTION_HEIGHT = 56;

/**
 * Gap between options as per spec (12px)
 */
const OPTION_GAP = 12;

/**
 * MCInput Component
 *
 * Displays multiple choice options for quiz questions.
 *
 * @example
 * ```tsx
 * <MCInput
 *   options={['Option A', 'Option B', 'Option C', 'Option D']}
 *   onAnswer={(answer) => console.log('Selected:', answer)}
 * />
 * ```
 */
export function MCInput({
  options,
  onAnswer,
  disabled = false,
  testID,
  style,
}: MCInputProps): React.ReactElement {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (disabled) return;
    setSelectedOption(option);
    onAnswer(option);
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {options.map((option, index) => {
        const isSelected = selectedOption === option;
        const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...

        return (
          <Pressable
            key={`${option}-${index}`}
            testID={testID ? `${testID}-option-${index}` : `mc-option-${index}`}
            onPress={() => handleSelect(option)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={`Option ${optionLetter}: ${option}`}
            accessibilityState={{
              selected: isSelected,
              disabled,
            }}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              disabled && styles.optionDisabled,
              pressed && !disabled && !isSelected && styles.optionPressed,
            ]}
          >
            <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
              <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>
                {optionLetter}
              </Text>
            </View>
            <Text
              style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
                disabled && styles.optionTextDisabled,
              ]}
              numberOfLines={2}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OPTION_HEIGHT,
    marginBottom: OPTION_GAP,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`, // 10% opacity primary
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionPressed: {
    backgroundColor: colors.backgroundSecondary,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterSelected: {
    backgroundColor: colors.primary,
  },
  letterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  letterTextSelected: {
    color: colors.white,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  optionTextDisabled: {
    color: colors.textTertiary,
  },
});

export default MCInput;
