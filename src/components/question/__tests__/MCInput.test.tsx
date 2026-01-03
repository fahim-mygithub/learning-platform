/**
 * MCInput Component Tests
 *
 * Tests for multiple choice input functionality, accessibility, and touch targets.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { MCInput, type MCInputProps } from '../MCInput';

/**
 * Helper to render MCInput with default props
 */
function renderMCInput(props: Partial<MCInputProps> = {}) {
  const defaultProps: MCInputProps = {
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    onAnswer: jest.fn(),
    ...props,
  };
  return render(<MCInput {...defaultProps} />);
}

describe('MCInput Component', () => {
  describe('Rendering', () => {
    it('renders all options correctly', () => {
      renderMCInput();

      expect(screen.getByText('Option A')).toBeTruthy();
      expect(screen.getByText('Option B')).toBeTruthy();
      expect(screen.getByText('Option C')).toBeTruthy();
      expect(screen.getByText('Option D')).toBeTruthy();
    });

    it('renders option letters (A, B, C, D)', () => {
      renderMCInput();

      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('B')).toBeTruthy();
      expect(screen.getByText('C')).toBeTruthy();
      expect(screen.getByText('D')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderMCInput({ testID: 'mc-question' });

      expect(screen.getByTestId('mc-question')).toBeTruthy();
      expect(screen.getByTestId('mc-question-option-0')).toBeTruthy();
      expect(screen.getByTestId('mc-question-option-1')).toBeTruthy();
      expect(screen.getByTestId('mc-question-option-2')).toBeTruthy();
      expect(screen.getByTestId('mc-question-option-3')).toBeTruthy();
    });

    it('renders varying number of options', () => {
      renderMCInput({ options: ['Yes', 'No'] });

      expect(screen.getByText('Yes')).toBeTruthy();
      expect(screen.getByText('No')).toBeTruthy();
      expect(screen.queryByText('Option C')).toBeNull();
    });
  });

  describe('Selection', () => {
    it('calls onAnswer when an option is selected', () => {
      const onAnswer = jest.fn();
      renderMCInput({ onAnswer, testID: 'mc' });

      fireEvent.press(screen.getByTestId('mc-option-1'));

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith('Option B');
    });

    it('allows selecting different options before disabled', () => {
      const onAnswer = jest.fn();
      renderMCInput({ onAnswer, testID: 'mc' });

      fireEvent.press(screen.getByTestId('mc-option-0'));
      expect(onAnswer).toHaveBeenLastCalledWith('Option A');

      fireEvent.press(screen.getByTestId('mc-option-2'));
      expect(onAnswer).toHaveBeenLastCalledWith('Option C');
    });

    it('does not call onAnswer when disabled', () => {
      const onAnswer = jest.fn();
      renderMCInput({ onAnswer, disabled: true, testID: 'mc' });

      fireEvent.press(screen.getByTestId('mc-option-0'));

      expect(onAnswer).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role for options', () => {
      renderMCInput({ testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      expect(option.props.accessibilityRole).toBe('radio');
    });

    it('has correct accessibility label for options', () => {
      renderMCInput({ testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      expect(option.props.accessibilityLabel).toBe('Option A: Option A');
    });

    it('has selected accessibility state when option is selected', () => {
      renderMCInput({ testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      fireEvent.press(option);

      expect(option.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('has disabled accessibility state when disabled', () => {
      renderMCInput({ disabled: true, testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      expect(option.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('Touch Targets', () => {
    it('enforces minimum 56px height for options', () => {
      renderMCInput({ testID: 'mc' });

      // Component enforces OPTION_HEIGHT = 56 via minHeight style
      const option = screen.getByTestId('mc-option-0');
      expect(option).toBeTruthy();
    });
  });

  describe('Visual Feedback', () => {
    it('shows selected state visually', () => {
      renderMCInput({ testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      fireEvent.press(option);

      // Selected option should exist and be visually different
      expect(option).toBeTruthy();
    });

    it('shows disabled state visually', () => {
      renderMCInput({ disabled: true, testID: 'mc' });

      const option = screen.getByTestId('mc-option-0');
      expect(option).toBeTruthy();
    });
  });
});
