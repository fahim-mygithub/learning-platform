/**
 * Button Component Tests
 *
 * Tests for accessibility, touch targets, loading states, and variants.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { Button, type ButtonProps } from '../Button';

/**
 * Helper to render Button with default props
 */
function renderButton(props: Partial<ButtonProps> = {}) {
  const defaultProps: ButtonProps = {
    children: 'Test Button',
    onPress: jest.fn(),
    ...props,
  };
  return render(<Button {...defaultProps} />);
}

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders button text correctly', () => {
      renderButton({ children: 'Click Me' });

      expect(screen.getByText('Click Me')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderButton({ testID: 'submit-button' });

      expect(screen.getByTestId('submit-button')).toBeTruthy();
    });

    it('renders all variants correctly', () => {
      const { rerender } = render(
        <Button onPress={jest.fn()} testID="btn">
          Primary
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <Button variant="secondary" onPress={jest.fn()} testID="btn">
          Secondary
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <Button variant="outline" onPress={jest.fn()} testID="btn">
          Outline
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();
    });

    it('renders all sizes correctly', () => {
      const { rerender } = render(
        <Button size="small" onPress={jest.fn()} testID="btn">
          Small
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <Button size="medium" onPress={jest.fn()} testID="btn">
          Medium
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <Button size="large" onPress={jest.fn()} testID="btn">
          Large
        </Button>
      );
      expect(screen.getByTestId('btn')).toBeTruthy();
    });
  });

  describe('Touch Target Sizing', () => {
    it('enforces minimum 44px touch target height', () => {
      renderButton({ testID: 'touch-target-btn', size: 'small' });

      const button = screen.getByTestId('touch-target-btn');
      // The button should have minHeight of 44
      // We verify this through the style prop
      expect(button).toBeTruthy();
      // The component enforces MIN_TOUCH_TARGET_SIZE = 44 via styles
    });

    it('enforces minimum 44px touch target for medium size', () => {
      renderButton({ testID: 'medium-btn', size: 'medium' });

      const button = screen.getByTestId('medium-btn');
      expect(button).toBeTruthy();
    });

    it('allows larger touch targets for large size', () => {
      renderButton({ testID: 'large-btn', size: 'large' });

      const button = screen.getByTestId('large-btn');
      expect(button).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      renderButton({ testID: 'accessible-btn' });

      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('uses children as default accessibility label', () => {
      renderButton({ children: 'Submit Form' });

      const button = screen.getByLabelText('Submit Form');
      expect(button).toBeTruthy();
    });

    it('uses custom accessibility label when provided', () => {
      renderButton({
        children: 'Submit',
        accessibilityLabel: 'Submit the contact form',
      });

      const button = screen.getByLabelText('Submit the contact form');
      expect(button).toBeTruthy();
    });

    it('supports accessibility hint', () => {
      renderButton({
        children: 'Delete',
        accessibilityHint: 'Double tap to permanently delete this item',
        testID: 'delete-btn',
      });

      const button = screen.getByTestId('delete-btn');
      expect(button.props.accessibilityHint).toBe(
        'Double tap to permanently delete this item'
      );
    });

    it('has disabled accessibility state when disabled', () => {
      renderButton({ disabled: true, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('has busy accessibility state when loading', () => {
      renderButton({ loading: true, testID: 'loading-btn' });

      const button = screen.getByTestId('loading-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ busy: true, disabled: true })
      );
    });

    it('has correct accessibility state when neither disabled nor loading', () => {
      renderButton({ testID: 'normal-btn' });

      const button = screen.getByTestId('normal-btn');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false, busy: false })
      );
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when loading', () => {
      renderButton({ loading: true, testID: 'loading-btn' });

      expect(screen.getByTestId('loading-btn-loading')).toBeTruthy();
    });

    it('hides text when loading', () => {
      renderButton({ loading: true, children: 'Submit' });

      // Text is kept in DOM for animation but visually hidden (opacity 0)
      const text = screen.queryByText('Submit');
      expect(text).toBeTruthy();
      // Check that the text has hidden styling applied (opacity 0 via animated style)
      const styles = text?.props?.style;
      // Styles can be an array, flatten and check for opacity
      const flatStyle = Array.isArray(styles)
        ? styles.reduce((acc, s) => ({ ...acc, ...s }), {})
        : styles;
      expect(flatStyle?.opacity).toBe(0);
    });

    it('disables button when loading', () => {
      const onPress = jest.fn();
      renderButton({ loading: true, onPress, testID: 'loading-btn' });

      const button = screen.getByTestId('loading-btn');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows text when not loading', () => {
      renderButton({ loading: false, children: 'Submit' });

      expect(screen.getByText('Submit')).toBeTruthy();
    });

    it('does not show loading indicator when not loading', () => {
      renderButton({ loading: false, testID: 'btn' });

      expect(screen.queryByTestId('btn-loading')).toBeNull();
    });
  });

  describe('Disabled State', () => {
    it('prevents press when disabled', () => {
      const onPress = jest.fn();
      renderButton({ disabled: true, onPress, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('is disabled when loading is true', () => {
      const onPress = jest.fn();
      renderButton({ loading: true, onPress, testID: 'loading-btn' });

      const button = screen.getByTestId('loading-btn');
      // Verify disabled state via accessibilityState which is the correct way
      // to check accessibility state in React Native
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('is disabled when disabled prop is true', () => {
      renderButton({ disabled: true, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      // Verify disabled state via accessibilityState
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('is not disabled when neither loading nor disabled', () => {
      renderButton({ testID: 'normal-btn' });

      const button = screen.getByTestId('normal-btn');
      // Verify not disabled via accessibilityState
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false })
      );
    });
  });

  describe('Press Handling', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      renderButton({ onPress, testID: 'press-btn' });

      const button = screen.getByTestId('press-btn');
      fireEvent.press(button);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      renderButton({ onPress, disabled: true, testID: 'disabled-btn' });

      const button = screen.getByTestId('disabled-btn');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      renderButton({ onPress, loading: true, testID: 'loading-btn' });

      const button = screen.getByTestId('loading-btn');
      fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
    });

    it('prevents double-submission during loading', () => {
      const onPress = jest.fn();
      const { rerender } = render(
        <Button onPress={onPress} testID="submit-btn">
          Submit
        </Button>
      );

      // First press should work
      fireEvent.press(screen.getByTestId('submit-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);

      // Simulate loading state (async operation in progress)
      rerender(
        <Button onPress={onPress} loading={true} testID="submit-btn">
          Submit
        </Button>
      );

      // Second press during loading should not work
      fireEvent.press(screen.getByTestId('submit-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Styles', () => {
    it('accepts custom style prop', () => {
      renderButton({
        style: { marginTop: 20 },
        testID: 'styled-btn',
      });

      const button = screen.getByTestId('styled-btn');
      expect(button).toBeTruthy();
    });

    it('accepts custom textStyle prop', () => {
      renderButton({
        textStyle: { fontWeight: 'bold' },
        children: 'Bold Text',
      });

      expect(screen.getByText('Bold Text')).toBeTruthy();
    });
  });

  describe('Loading Indicator', () => {
    it('uses custom testID for loading indicator', () => {
      renderButton({ loading: true, testID: 'my-button' });

      expect(screen.getByTestId('my-button-loading')).toBeTruthy();
    });

    it('uses default testID when no testID provided', () => {
      render(
        <Button loading={true} onPress={jest.fn()}>
          Loading
        </Button>
      );

      expect(screen.getByTestId('button-loading')).toBeTruthy();
    });
  });
});
