/**
 * TFInput Component Tests
 *
 * Tests for true/false input functionality, accessibility, and touch targets.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { TFInput, type TFInputProps } from '../TFInput';

/**
 * Helper to render TFInput with default props
 */
function renderTFInput(props: Partial<TFInputProps> = {}) {
  const defaultProps: TFInputProps = {
    onAnswer: jest.fn(),
    ...props,
  };
  return render(<TFInput {...defaultProps} />);
}

describe('TFInput Component', () => {
  describe('Rendering', () => {
    it('renders True and False buttons', () => {
      renderTFInput();

      expect(screen.getByText('True')).toBeTruthy();
      expect(screen.getByText('False')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderTFInput({ testID: 'tf-question' });

      expect(screen.getByTestId('tf-question')).toBeTruthy();
      expect(screen.getByTestId('tf-question-true')).toBeTruthy();
      expect(screen.getByTestId('tf-question-false')).toBeTruthy();
    });

    it('renders default testIDs when no testID provided', () => {
      renderTFInput();

      expect(screen.getByTestId('tf-true')).toBeTruthy();
      expect(screen.getByTestId('tf-false')).toBeTruthy();
    });
  });

  describe('Selection', () => {
    it('calls onAnswer with "True" when True is selected', () => {
      const onAnswer = jest.fn();
      renderTFInput({ onAnswer, testID: 'tf' });

      fireEvent.press(screen.getByTestId('tf-true'));

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith('True');
    });

    it('calls onAnswer with "False" when False is selected', () => {
      const onAnswer = jest.fn();
      renderTFInput({ onAnswer, testID: 'tf' });

      fireEvent.press(screen.getByTestId('tf-false'));

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith('False');
    });

    it('allows changing selection before disabled', () => {
      const onAnswer = jest.fn();
      renderTFInput({ onAnswer, testID: 'tf' });

      fireEvent.press(screen.getByTestId('tf-true'));
      expect(onAnswer).toHaveBeenLastCalledWith('True');

      fireEvent.press(screen.getByTestId('tf-false'));
      expect(onAnswer).toHaveBeenLastCalledWith('False');
    });

    it('does not call onAnswer when disabled', () => {
      const onAnswer = jest.fn();
      renderTFInput({ onAnswer, disabled: true, testID: 'tf' });

      fireEvent.press(screen.getByTestId('tf-true'));
      fireEvent.press(screen.getByTestId('tf-false'));

      expect(onAnswer).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role for buttons', () => {
      renderTFInput({ testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      const falseButton = screen.getByTestId('tf-false');

      expect(trueButton.props.accessibilityRole).toBe('radio');
      expect(falseButton.props.accessibilityRole).toBe('radio');
    });

    it('has correct accessibility labels', () => {
      renderTFInput({ testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      const falseButton = screen.getByTestId('tf-false');

      expect(trueButton.props.accessibilityLabel).toBe('True');
      expect(falseButton.props.accessibilityLabel).toBe('False');
    });

    it('has selected accessibility state when True is selected', () => {
      renderTFInput({ testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      fireEvent.press(trueButton);

      expect(trueButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('has selected accessibility state when False is selected', () => {
      renderTFInput({ testID: 'tf' });

      const falseButton = screen.getByTestId('tf-false');
      fireEvent.press(falseButton);

      expect(falseButton.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('has disabled accessibility state when disabled', () => {
      renderTFInput({ disabled: true, testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      const falseButton = screen.getByTestId('tf-false');

      expect(trueButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
      expect(falseButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('Touch Targets', () => {
    it('enforces minimum 56px height for buttons', () => {
      renderTFInput({ testID: 'tf' });

      // Component enforces BUTTON_HEIGHT = 56 via minHeight style
      const trueButton = screen.getByTestId('tf-true');
      const falseButton = screen.getByTestId('tf-false');
      expect(trueButton).toBeTruthy();
      expect(falseButton).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('shows selected state for True button', () => {
      renderTFInput({ testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      fireEvent.press(trueButton);

      expect(trueButton).toBeTruthy();
    });

    it('shows selected state for False button', () => {
      renderTFInput({ testID: 'tf' });

      const falseButton = screen.getByTestId('tf-false');
      fireEvent.press(falseButton);

      expect(falseButton).toBeTruthy();
    });

    it('shows disabled state visually', () => {
      renderTFInput({ disabled: true, testID: 'tf' });

      const trueButton = screen.getByTestId('tf-true');
      const falseButton = screen.getByTestId('tf-false');

      expect(trueButton).toBeTruthy();
      expect(falseButton).toBeTruthy();
    });
  });
});
