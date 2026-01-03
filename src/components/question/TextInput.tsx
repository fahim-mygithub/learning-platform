/**
 * TextInput Component (Free-form text answer)
 *
 * A text input component for free-form answers with:
 * - Auto-expand up to 4 lines
 * - Keyboard-aware behavior
 * - Submit button
 * - Disabled state after answer
 * - Accessibility support
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

/**
 * Props for the TextInput component
 */
export interface TextInputProps {
  /** Callback when the answer is submitted */
  onAnswer: (answer: string) => void;
  /** Whether the input is disabled (e.g., after answering) */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Test ID for testing */
  testID?: string;
  /** Custom style for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Minimum touch target height (56px)
 */
const MIN_HEIGHT = 56;

/**
 * Maximum number of lines before scrolling
 */
const MAX_LINES = 4;

/**
 * Line height for calculating max height
 */
const LINE_HEIGHT = 24;

/**
 * TextInput Component
 *
 * Displays a text input for free-form answer questions.
 *
 * @example
 * ```tsx
 * <TextInput
 *   placeholder="Type your answer..."
 *   onAnswer={(answer) => console.log('Answer:', answer)}
 * />
 * ```
 */
export function TextInput({
  onAnswer,
  disabled = false,
  placeholder = 'Type your answer...',
  testID,
  style,
}: TextInputProps): React.ReactElement {
  const [value, setValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const inputRef = useRef<RNTextInput>(null);

  const handleSubmit = () => {
    if (disabled || !value.trim()) return;
    setIsSubmitted(true);
    onAnswer(value.trim());
  };

  const isDisabled = disabled || isSubmitted;
  const canSubmit = value.trim().length > 0 && !isDisabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
      testID={testID}
    >
      <View style={styles.inputWrapper}>
        <RNTextInput
          ref={inputRef}
          testID={testID ? `${testID}-input` : 'text-input'}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!isDisabled}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Answer input"
          accessibilityHint="Enter your answer to the question"
          accessibilityState={{
            disabled: isDisabled,
          }}
          style={[
            styles.input,
            isDisabled && styles.inputDisabled,
          ]}
          maxLength={1000}
        />
      </View>

      <Pressable
        testID={testID ? `${testID}-submit` : 'text-submit'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Submit answer"
        accessibilityState={{
          disabled: !canSubmit,
        }}
        style={({ pressed }) => [
          styles.submitButton,
          !canSubmit && styles.submitButtonDisabled,
          pressed && canSubmit && styles.submitButtonPressed,
        ]}
      >
        <Text
          style={[
            styles.submitButtonText,
            !canSubmit && styles.submitButtonTextDisabled,
          ]}
        >
          Submit
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  input: {
    minHeight: MIN_HEIGHT,
    maxHeight: LINE_HEIGHT * MAX_LINES + 24, // 4 lines + padding
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    fontSize: 16,
    lineHeight: LINE_HEIGHT,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textTertiary,
    opacity: 0.6,
  },
  submitButton: {
    minHeight: MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.white,
  },
});

export default TextInput;
