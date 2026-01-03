/**
 * TFInput Component (True/False)
 *
 * A true/false input component with:
 * - Two large True/False buttons
 * - Binary selection handling
 * - Visual feedback on selection
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
 * Props for the TFInput component
 */
export interface TFInputProps {
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
 * Button height - large touch target (56px)
 */
const BUTTON_HEIGHT = 56;

/**
 * Gap between buttons (12px)
 */
const BUTTON_GAP = 12;

/**
 * TFInput Component
 *
 * Displays True/False buttons for binary choice questions.
 *
 * @example
 * ```tsx
 * <TFInput
 *   onAnswer={(answer) => console.log('Selected:', answer)}
 * />
 * ```
 */
export function TFInput({
  onAnswer,
  disabled = false,
  testID,
  style,
}: TFInputProps): React.ReactElement {
  const [selectedOption, setSelectedOption] = useState<'True' | 'False' | null>(null);

  const handleSelect = (option: 'True' | 'False') => {
    if (disabled) return;
    setSelectedOption(option);
    onAnswer(option);
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Pressable
        testID={testID ? `${testID}-true` : 'tf-true'}
        onPress={() => handleSelect('True')}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityLabel="True"
        accessibilityState={{
          selected: selectedOption === 'True',
          disabled,
        }}
        style={({ pressed }) => [
          styles.button,
          styles.trueButton,
          selectedOption === 'True' && styles.trueButtonSelected,
          disabled && styles.buttonDisabled,
          pressed && !disabled && selectedOption !== 'True' && styles.buttonPressed,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            selectedOption === 'True' && styles.buttonTextSelected,
            disabled && styles.buttonTextDisabled,
          ]}
        >
          True
        </Text>
      </Pressable>

      <Pressable
        testID={testID ? `${testID}-false` : 'tf-false'}
        onPress={() => handleSelect('False')}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityLabel="False"
        accessibilityState={{
          selected: selectedOption === 'False',
          disabled,
        }}
        style={({ pressed }) => [
          styles.button,
          styles.falseButton,
          selectedOption === 'False' && styles.falseButtonSelected,
          disabled && styles.buttonDisabled,
          pressed && !disabled && selectedOption !== 'False' && styles.buttonPressed,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            selectedOption === 'False' && styles.buttonTextSelected,
            disabled && styles.buttonTextDisabled,
          ]}
        >
          False
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    gap: BUTTON_GAP,
  },
  button: {
    flex: 1,
    minHeight: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  trueButton: {
    borderColor: colors.success,
    backgroundColor: colors.background,
  },
  trueButtonSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  falseButton: {
    borderColor: colors.error,
    backgroundColor: colors.background,
  },
  falseButtonSelected: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextSelected: {
    color: colors.white,
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
});

export default TFInput;
