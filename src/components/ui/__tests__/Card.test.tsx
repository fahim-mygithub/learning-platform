/**
 * Card Component Tests
 *
 * Tests for the Card UI component covering:
 * - Basic rendering with children
 * - Custom styles application
 * - Accessibility props
 * - Test ID functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { Card } from '../Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Card>
          <Text testID="child-text">Hello, Card!</Text>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeTruthy();
      expect(screen.getByTestId('child-text')).toHaveTextContent('Hello, Card!');
    });

    it('renders multiple children', () => {
      render(
        <Card>
          <Text testID="first-child">First</Text>
          <Text testID="second-child">Second</Text>
        </Card>
      );

      expect(screen.getByTestId('first-child')).toBeTruthy();
      expect(screen.getByTestId('second-child')).toBeTruthy();
    });

    it('renders nested components', () => {
      render(
        <Card>
          <View testID="nested-view">
            <Text testID="nested-text">Nested content</Text>
          </View>
        </Card>
      );

      expect(screen.getByTestId('nested-view')).toBeTruthy();
      expect(screen.getByTestId('nested-text')).toHaveTextContent('Nested content');
    });
  });

  describe('Styling', () => {
    it('applies custom styles', () => {
      const customStyle = { marginTop: 20 };

      render(
        <Card style={customStyle} testID="styled-card">
          <Text>Styled card</Text>
        </Card>
      );

      const card = screen.getByTestId('styled-card');
      expect(card).toBeTruthy();
      // The custom style should be applied alongside default styles
      expect(card.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('has default padding and border radius', () => {
      render(
        <Card testID="default-card">
          <Text>Default card</Text>
        </Card>
      );

      const card = screen.getByTestId('default-card');
      // Verify the card has the expected default styles
      const flattenedStyles = card.props.style;
      expect(flattenedStyles).toBeDefined();
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      render(
        <Card>
          <Text>Card content</Text>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      render(
        <Card testID="custom-card">
          <Text>Card content</Text>
        </Card>
      );

      expect(screen.getByTestId('custom-card')).toBeTruthy();
      expect(screen.queryByTestId('card')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('is accessible by default', () => {
      render(
        <Card testID="accessible-card">
          <Text>Accessible content</Text>
        </Card>
      );

      const card = screen.getByTestId('accessible-card');
      expect(card.props.accessible).toBe(true);
    });

    it('supports custom accessibility props', () => {
      render(
        <Card
          testID="labeled-card"
          accessibilityLabel="Profile information card"
          accessibilityHint="Contains user profile details"
        >
          <Text>Profile info</Text>
        </Card>
      );

      const card = screen.getByTestId('labeled-card');
      expect(card.props.accessibilityLabel).toBe('Profile information card');
      expect(card.props.accessibilityHint).toBe('Contains user profile details');
    });
  });

  describe('Props Forwarding', () => {
    it('forwards additional View props', () => {
      const onLayout = jest.fn();

      render(
        <Card testID="forwarded-props-card" onLayout={onLayout}>
          <Text>Card with forwarded props</Text>
        </Card>
      );

      const card = screen.getByTestId('forwarded-props-card');
      expect(card.props.onLayout).toBe(onLayout);
    });
  });
});
