/**
 * BottomSheet Component Tests
 *
 * Tests for the BottomSheet UI component covering:
 * - Visibility control
 * - Close interactions (backdrop tap)
 * - Title rendering
 * - Content scrollability
 * - Handle visibility
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet } from '../BottomSheet';

describe('BottomSheet Component', () => {
  describe('Visibility', () => {
    it('renders content when visible is true', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text testID="sheet-content">Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.getByTestId('sheet-content')).toBeTruthy();
      expect(screen.getByText('Sheet content')).toBeTruthy();
    });

    it('does not render content when visible is false', () => {
      render(
        <BottomSheet visible={false} onClose={jest.fn()}>
          <Text testID="sheet-content">Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.queryByTestId('sheet-content')).toBeNull();
      expect(screen.queryByText('Sheet content')).toBeNull();
    });

    it('toggles visibility based on visible prop', () => {
      const { rerender } = render(
        <BottomSheet visible={false} onClose={jest.fn()}>
          <Text testID="sheet-content">Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.queryByTestId('sheet-content')).toBeNull();

      rerender(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text testID="sheet-content">Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.getByTestId('sheet-content')).toBeTruthy();
    });
  });

  describe('Close Interactions', () => {
    it('calls onClose when backdrop is tapped (closeOnBackdrop default true)', () => {
      const onClose = jest.fn();

      render(
        <BottomSheet visible={true} onClose={onClose}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const backdrop = screen.getByTestId('bottomsheet-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is tapped and closeOnBackdrop is true', () => {
      const onClose = jest.fn();

      render(
        <BottomSheet visible={true} onClose={onClose} closeOnBackdrop={true}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const backdrop = screen.getByTestId('bottomsheet-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is tapped and closeOnBackdrop is false', () => {
      const onClose = jest.fn();

      render(
        <BottomSheet visible={true} onClose={onClose} closeOnBackdrop={false}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const backdrop = screen.getByTestId('bottomsheet-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when sheet area is pressed', () => {
      const onClose = jest.fn();

      render(
        <BottomSheet visible={true} onClose={onClose}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottomsheet-container');
      fireEvent.press(sheet);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} title="Test Title">
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('does not render title when not provided', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.queryByTestId('bottomsheet-title')).toBeNull();
    });

    it('title has header accessibility role', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} title="Accessible Title">
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const title = screen.getByText('Accessible Title');
      expect(title.props.accessibilityRole).toBe('header');
    });
  });

  describe('Content Scrollable', () => {
    it('renders ScrollView for content', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const scrollView = screen.getByTestId('bottomsheet-scrollview');
      expect(scrollView).toBeTruthy();
    });

    it('renders multiple children in scrollable area', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text testID="first-child">First</Text>
          <Text testID="second-child">Second</Text>
          <Text testID="third-child">Third</Text>
        </BottomSheet>
      );

      expect(screen.getByTestId('first-child')).toBeTruthy();
      expect(screen.getByTestId('second-child')).toBeTruthy();
      expect(screen.getByTestId('third-child')).toBeTruthy();
    });
  });

  describe('Handle', () => {
    it('renders handle by default (showHandle default true)', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const handle = screen.getByTestId('bottomsheet-handle');
      expect(handle).toBeTruthy();
    });

    it('renders handle when showHandle is true', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} showHandle={true}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const handle = screen.getByTestId('bottomsheet-handle');
      expect(handle).toBeTruthy();
    });

    it('does not render handle when showHandle is false', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} showHandle={false}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      expect(screen.queryByTestId('bottomsheet-handle')).toBeNull();
    });

    it('handle has accessibility hint', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const handle = screen.getByTestId('bottomsheet-handle');
      expect(handle.props.accessibilityHint).toBe('Drag down to close');
    });
  });

  describe('Height', () => {
    it('applies numeric height', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} height={300}>
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottomsheet-container');
      const flattenedStyle = Array.isArray(sheet.props.style)
        ? Object.assign({}, ...sheet.props.style)
        : sheet.props.style;
      expect(flattenedStyle.height).toBe(300);
    });

    it('applies percentage height', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} height="50%">
          <Text>Sheet content</Text>
        </BottomSheet>
      );

      const sheet = screen.getByTestId('bottomsheet-container');
      const flattenedStyle = Array.isArray(sheet.props.style)
        ? Object.assign({}, ...sheet.props.style)
        : sheet.props.style;
      expect(flattenedStyle.height).toBe('50%');
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </BottomSheet>
      );

      expect(screen.getByTestId('bottomsheet')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()} testID="custom-sheet">
          <Text>Content</Text>
        </BottomSheet>
      );

      expect(screen.getByTestId('custom-sheet')).toBeTruthy();
      expect(screen.queryByTestId('bottomsheet')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has accessibilityViewIsModal set to true on container', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </BottomSheet>
      );

      const container = screen.getByTestId('bottomsheet-container');
      expect(container.props.accessibilityViewIsModal).toBe(true);
    });

    it('modal has transparent background', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </BottomSheet>
      );

      const modal = screen.getByTestId('bottomsheet');
      expect(modal.props.transparent).toBe(true);
    });

    it('modal has slide animation type', () => {
      render(
        <BottomSheet visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </BottomSheet>
      );

      const modal = screen.getByTestId('bottomsheet');
      expect(modal.props.animationType).toBe('slide');
    });
  });
});
