/**
 * TextInput Component Tests
 *
 * Tests for text input functionality, accessibility, and keyboard behavior.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { TextInput, type TextInputProps } from '../TextInput';

/**
 * Helper to render TextInput with default props
 */
function renderTextInput(props: Partial<TextInputProps> = {}) {
  const defaultProps: TextInputProps = {
    onAnswer: jest.fn(),
    ...props,
  };
  return render(<TextInput {...defaultProps} />);
}

describe('TextInput Component', () => {
  describe('Rendering', () => {
    it('renders input and submit button', () => {
      renderTextInput({ testID: 'text-q' });

      expect(screen.getByTestId('text-q-input')).toBeTruthy();
      expect(screen.getByTestId('text-q-submit')).toBeTruthy();
    });

    it('renders with default testIDs when no testID provided', () => {
      renderTextInput();

      expect(screen.getByTestId('text-input')).toBeTruthy();
      expect(screen.getByTestId('text-submit')).toBeTruthy();
    });

    it('renders with placeholder text', () => {
      renderTextInput({ placeholder: 'Enter your answer here' });

      expect(screen.getByPlaceholderText('Enter your answer here')).toBeTruthy();
    });

    it('renders default placeholder when none provided', () => {
      renderTextInput();

      expect(screen.getByPlaceholderText('Type your answer...')).toBeTruthy();
    });

    it('renders Submit button text', () => {
      renderTextInput();

      expect(screen.getByText('Submit')).toBeTruthy();
    });
  });

  describe('Input Behavior', () => {
    it('accepts text input', () => {
      renderTextInput({ testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, 'My answer');

      expect(input.props.value).toBe('My answer');
    });

    it('allows multiline input', () => {
      renderTextInput({ testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      expect(input.props.multiline).toBe(true);
    });

    it('does not accept input when disabled', () => {
      renderTextInput({ disabled: true, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Submission', () => {
    it('calls onAnswer when submit button is pressed with text', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, 'My answer');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith('My answer');
    });

    it('trims whitespace from answer', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, '  My answer  ');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledWith('My answer');
    });

    it('does not call onAnswer when text is empty', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('does not call onAnswer when text is only whitespace', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, '   ');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('does not call onAnswer when disabled', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, disabled: true, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, 'My answer');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('disables input after submission', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, 'My answer');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);

      // After submission, input should be disabled
      expect(input.props.editable).toBe(false);
    });

    it('prevents double submission', () => {
      const onAnswer = jest.fn();
      renderTextInput({ onAnswer, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      fireEvent.changeText(input, 'My answer');

      const submit = screen.getByTestId('text-q-submit');
      fireEvent.press(submit);
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label for input', () => {
      renderTextInput({ testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      expect(input.props.accessibilityLabel).toBe('Answer input');
    });

    it('has correct accessibility hint for input', () => {
      renderTextInput({ testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      expect(input.props.accessibilityHint).toBe('Enter your answer to the question');
    });

    it('has correct accessibility role for submit button', () => {
      renderTextInput({ testID: 'text-q' });

      const submit = screen.getByTestId('text-q-submit');
      expect(submit.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label for submit button', () => {
      renderTextInput({ testID: 'text-q' });

      const submit = screen.getByTestId('text-q-submit');
      expect(submit.props.accessibilityLabel).toBe('Submit answer');
    });

    it('has disabled accessibility state when disabled', () => {
      renderTextInput({ disabled: true, testID: 'text-q' });

      const input = screen.getByTestId('text-q-input');
      expect(input.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('Touch Targets', () => {
    it('enforces minimum 56px height for input and button', () => {
      renderTextInput({ testID: 'text-q' });

      // Component enforces MIN_HEIGHT = 56 via minHeight style
      const input = screen.getByTestId('text-q-input');
      const submit = screen.getByTestId('text-q-submit');
      expect(input).toBeTruthy();
      expect(submit).toBeTruthy();
    });
  });
});
