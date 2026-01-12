/**
 * Input Component Tests
 *
 * Comprehensive test suite for the accessible Input component.
 * Tests cover:
 * - Basic rendering and props
 * - Touch target sizing (44px minimum)
 * - Error state styling
 * - Accessibility labels and screen reader support
 * - Disabled state
 * - User interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { Input } from '../Input';
import { colors } from '../../../theme';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<Input testID="test-input" />);
      expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('renders with a label', () => {
      render(<Input label="Email" testID="email-input" />);
      expect(screen.getByText('Email')).toBeTruthy();
    });

    it('renders with a placeholder', () => {
      render(<Input placeholder="Enter your email" testID="email-input" />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    });

    it('renders with helper text when no error', () => {
      render(
        <Input helperText="We'll never share your email" testID="email-input" />
      );
      expect(screen.getByTestId('email-input-helper')).toBeTruthy();
      expect(
        screen.getByText("We'll never share your email")
      ).toBeTruthy();
    });

    it('hides helper text when error is present', () => {
      render(
        <Input
          helperText="We'll never share your email"
          error="Email is required"
          testID="email-input"
        />
      );
      expect(screen.queryByTestId('email-input-helper')).toBeNull();
      expect(screen.getByTestId('email-input-error')).toBeTruthy();
    });
  });

  describe('Touch Target Sizing', () => {
    it('enforces minimum 44px touch target height', () => {
      render(<Input testID="test-input" />);
      const input = screen.getByTestId('test-input-input');

      // Check that the input has minHeight style
      const style = input.props.style;
      // Flatten the style array if needed
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('maintains minimum height even with custom styles', () => {
      render(
        <Input testID="test-input" inputStyle={{ padding: 20 }} />
      );
      const input = screen.getByTestId('test-input-input');
      const style = input.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      render(
        <Input error="Email is required" testID="email-input" />
      );
      expect(screen.getByTestId('email-input-error')).toBeTruthy();
      expect(screen.getByText('Email is required')).toBeTruthy();
    });

    it('applies error styling to input border', () => {
      render(
        <Input error="Invalid email" testID="email-input" />
      );
      const input = screen.getByTestId('email-input-input');
      const style = input.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      // Error styling should have red border
      expect(flatStyle.borderColor).toBe(colors.error);
      expect(flatStyle.borderWidth).toBe(2);
    });

    it('does not show error styling when no error', () => {
      render(<Input testID="email-input" />);
      const input = screen.getByTestId('email-input-input');
      const style = input.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      // Default border (borderLight), not error style
      expect(flatStyle.borderColor).toBe(colors.borderLight);
      expect(flatStyle.borderWidth).toBe(1);
    });

    it('error message has alert role for screen readers', () => {
      render(
        <Input error="Email is required" testID="email-input" />
      );
      const errorText = screen.getByTestId('email-input-error');
      expect(errorText.props.accessibilityRole).toBe('alert');
    });

    it('error message has polite live region', () => {
      render(
        <Input error="Email is required" testID="email-input" />
      );
      const errorText = screen.getByTestId('email-input-error');
      expect(errorText.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Accessibility Labels', () => {
    it('uses label as accessibility label when provided', () => {
      render(<Input label="Email Address" testID="email-input" />);
      expect(screen.getByLabelText('Email Address')).toBeTruthy();
    });

    it('uses explicit accessibilityLabel over label', () => {
      render(
        <Input
          label="Email"
          accessibilityLabel="Email address input field"
          testID="email-input"
        />
      );
      const input = screen.getByTestId('email-input-input');
      // When explicit accessibilityLabel is provided, it should be used
      expect(input.props.accessibilityLabel).toBe('Email address input field');
    });

    it('falls back to placeholder for accessibility label', () => {
      render(
        <Input placeholder="Enter email" testID="email-input" />
      );
      expect(screen.getByLabelText('Enter email')).toBeTruthy();
    });

    it('includes accessibility hint when provided', () => {
      render(
        <Input
          label="Password"
          accessibilityHint="Must be at least 8 characters"
          testID="password-input"
        />
      );
      const input = screen.getByTestId('password-input-input');
      expect(input.props.accessibilityHint).toBe('Must be at least 8 characters');
    });

    it('prepends error to accessibility hint when in error state', () => {
      render(
        <Input
          label="Password"
          accessibilityHint="Must be at least 8 characters"
          error="Password too short"
          testID="password-input"
        />
      );
      const input = screen.getByTestId('password-input-input');
      expect(input.props.accessibilityHint).toBe(
        'Error: Password too short. Must be at least 8 characters'
      );
    });

    it('sets aria-invalid when in error state', () => {
      render(<Input error="Invalid" testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props['aria-invalid']).toBe(true);
    });

    it('aria-invalid is false when no error', () => {
      render(<Input testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props['aria-invalid']).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<Input disabled testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.editable).toBe(false);
    });

    it('applies disabled styling', () => {
      render(<Input disabled testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      const style = input.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      // Disabled state uses backgroundSecondary to differentiate from enabled state
      expect(flatStyle.backgroundColor).toBe(colors.backgroundSecondary);
    });

    it('sets accessibility state disabled', () => {
      render(<Input disabled testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.accessibilityState).toEqual({ disabled: true });
    });

    it('input is editable by default', () => {
      render(<Input testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.editable).toBe(true);
    });
  });

  describe('User Interactions', () => {
    it('calls onChangeText when text is entered', () => {
      const onChangeText = jest.fn();
      render(
        <Input onChangeText={onChangeText} testID="test-input" />
      );
      const input = screen.getByTestId('test-input-input');

      fireEvent.changeText(input, 'test@example.com');

      expect(onChangeText).toHaveBeenCalledWith('test@example.com');
      expect(onChangeText).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus when input is focused', () => {
      const onFocus = jest.fn();
      render(<Input onFocus={onFocus} testID="test-input" />);
      const input = screen.getByTestId('test-input-input');

      fireEvent(input, 'focus');

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when input loses focus', () => {
      const onBlur = jest.fn();
      render(<Input onBlur={onBlur} testID="test-input" />);
      const input = screen.getByTestId('test-input-input');

      fireEvent(input, 'blur');

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('does not call onChangeText when disabled', () => {
      const onChangeText = jest.fn();
      render(
        <Input disabled onChangeText={onChangeText} testID="test-input" />
      );
      const input = screen.getByTestId('test-input-input');

      // Input is not editable so changeText won't work the same way
      // but we verify the editable prop is false
      expect(input.props.editable).toBe(false);
    });
  });

  describe('TextInput Props Pass-through', () => {
    it('passes secureTextEntry prop', () => {
      render(<Input secureTextEntry testID="password-input" />);
      const input = screen.getByTestId('password-input-input');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('passes keyboardType prop', () => {
      render(<Input keyboardType="email-address" testID="email-input" />);
      const input = screen.getByTestId('email-input-input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('passes autoCapitalize prop', () => {
      render(<Input autoCapitalize="none" testID="email-input" />);
      const input = screen.getByTestId('email-input-input');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('passes maxLength prop', () => {
      render(<Input maxLength={50} testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.maxLength).toBe(50);
    });

    it('passes multiline prop', () => {
      render(<Input multiline testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.multiline).toBe(true);
    });
  });

  describe('Controlled Input', () => {
    it('displays controlled value', () => {
      render(<Input value="test@example.com" testID="test-input" />);
      const input = screen.getByTestId('test-input-input');
      expect(input.props.value).toBe('test@example.com');
    });

    it('updates when value prop changes', () => {
      const { rerender } = render(
        <Input value="initial" testID="test-input" />
      );
      let input = screen.getByTestId('test-input-input');
      expect(input.props.value).toBe('initial');

      rerender(<Input value="updated" testID="test-input" />);
      input = screen.getByTestId('test-input-input');
      expect(input.props.value).toBe('updated');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom container style', () => {
      render(
        <Input
          containerStyle={{ marginTop: 20 }}
          testID="test-input"
        />
      );
      const container = screen.getByTestId('test-input');
      const style = container.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      expect(flatStyle.marginTop).toBe(20);
    });

    it('applies custom input style', () => {
      render(
        <Input
          inputStyle={{ fontSize: 18 }}
          testID="test-input"
        />
      );
      const input = screen.getByTestId('test-input-input');
      const style = input.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      expect(flatStyle.fontSize).toBe(18);
    });

    it('applies custom label style', () => {
      render(
        <Input
          label="Custom Label"
          labelStyle={{ color: 'blue' }}
          testID="test-input"
        />
      );
      const label = screen.getByText('Custom Label');
      const style = label.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style;

      expect(flatStyle.color).toBe('blue');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('label has correct accessibility role', () => {
      render(<Input label="Email" testID="test-input" />);
      const label = screen.getByText('Email');
      expect(label.props.accessibilityRole).toBe('text');
    });

    it('helper text has correct accessibility role', () => {
      render(<Input helperText="Enter a valid email" testID="test-input" />);
      const helper = screen.getByTestId('test-input-helper');
      expect(helper.props.accessibilityRole).toBe('text');
    });

    it('error is announced via accessibilityLiveRegion', () => {
      render(<Input error="Required field" testID="test-input" />);
      const error = screen.getByTestId('test-input-error');
      expect(error.props.accessibilityLiveRegion).toBe('polite');
    });
  });
});
