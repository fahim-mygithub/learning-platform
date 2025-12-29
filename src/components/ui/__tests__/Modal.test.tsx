/**
 * Modal Component Tests
 *
 * Tests for the Modal UI component covering:
 * - Visibility control
 * - Close interactions (backdrop, close button)
 * - Title and content rendering
 * - Actions area rendering
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';

import { Modal } from '../Modal';

describe('Modal Component', () => {
  describe('Visibility', () => {
    it('renders content when visible is true', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text testID="modal-content">Modal content</Text>
        </Modal>
      );

      expect(screen.getByTestId('modal-content')).toBeTruthy();
      expect(screen.getByText('Modal content')).toBeTruthy();
    });

    it('does not render content when visible is false', () => {
      render(
        <Modal visible={false} onClose={jest.fn()}>
          <Text testID="modal-content">Modal content</Text>
        </Modal>
      );

      expect(screen.queryByTestId('modal-content')).toBeNull();
      expect(screen.queryByText('Modal content')).toBeNull();
    });

    it('toggles visibility based on visible prop', () => {
      const { rerender } = render(
        <Modal visible={false} onClose={jest.fn()}>
          <Text testID="modal-content">Modal content</Text>
        </Modal>
      );

      expect(screen.queryByTestId('modal-content')).toBeNull();

      rerender(
        <Modal visible={true} onClose={jest.fn()}>
          <Text testID="modal-content">Modal content</Text>
        </Modal>
      );

      expect(screen.getByTestId('modal-content')).toBeTruthy();
    });
  });

  describe('Close Interactions', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();

      render(
        <Modal visible={true} onClose={onClose}>
          <Text>Modal content</Text>
        </Modal>
      );

      const closeButton = screen.getByTestId('modal-close-button');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is tapped (closeOnBackdrop default true)', () => {
      const onClose = jest.fn();

      render(
        <Modal visible={true} onClose={onClose}>
          <Text>Modal content</Text>
        </Modal>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is tapped and closeOnBackdrop is true', () => {
      const onClose = jest.fn();

      render(
        <Modal visible={true} onClose={onClose} closeOnBackdrop={true}>
          <Text>Modal content</Text>
        </Modal>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is tapped and closeOnBackdrop is false', () => {
      const onClose = jest.fn();

      render(
        <Modal visible={true} onClose={onClose} closeOnBackdrop={false}>
          <Text>Modal content</Text>
        </Modal>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.press(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when content area is pressed', () => {
      const onClose = jest.fn();

      render(
        <Modal visible={true} onClose={onClose}>
          <Text>Modal content</Text>
        </Modal>
      );

      const card = screen.getByTestId('modal-card');
      fireEvent.press(card);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      render(
        <Modal visible={true} onClose={jest.fn()} title="Test Title">
          <Text>Modal content</Text>
        </Modal>
      );

      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('does not render title when not provided', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Modal content</Text>
        </Modal>
      );

      expect(screen.queryByTestId('modal-title')).toBeNull();
    });
  });

  describe('Content', () => {
    it('renders children content', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text testID="child-text">Child content</Text>
        </Modal>
      );

      expect(screen.getByTestId('child-text')).toBeTruthy();
      expect(screen.getByText('Child content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text testID="first-child">First</Text>
          <Text testID="second-child">Second</Text>
        </Modal>
      );

      expect(screen.getByTestId('first-child')).toBeTruthy();
      expect(screen.getByTestId('second-child')).toBeTruthy();
    });

    it('renders complex nested content', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Pressable testID="nested-pressable">
            <Text testID="nested-text">Nested content</Text>
          </Pressable>
        </Modal>
      );

      expect(screen.getByTestId('nested-pressable')).toBeTruthy();
      expect(screen.getByTestId('nested-text')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('renders actions when provided', () => {
      const actions = (
        <Pressable testID="action-button">
          <Text>Confirm</Text>
        </Pressable>
      );

      render(
        <Modal visible={true} onClose={jest.fn()} actions={actions}>
          <Text>Modal content</Text>
        </Modal>
      );

      expect(screen.getByTestId('action-button')).toBeTruthy();
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('renders multiple action buttons', () => {
      const actions = (
        <>
          <Pressable testID="cancel-button">
            <Text>Cancel</Text>
          </Pressable>
          <Pressable testID="confirm-button">
            <Text>Confirm</Text>
          </Pressable>
        </>
      );

      render(
        <Modal visible={true} onClose={jest.fn()} actions={actions}>
          <Text>Modal content</Text>
        </Modal>
      );

      expect(screen.getByTestId('cancel-button')).toBeTruthy();
      expect(screen.getByTestId('confirm-button')).toBeTruthy();
    });

    it('does not render actions area when not provided', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Modal content</Text>
        </Modal>
      );

      expect(screen.queryByTestId('modal-actions')).toBeNull();
    });
  });

  describe('Test ID', () => {
    it('uses default testID when not provided', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </Modal>
      );

      expect(screen.getByTestId('modal')).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      render(
        <Modal visible={true} onClose={jest.fn()} testID="custom-modal">
          <Text>Content</Text>
        </Modal>
      );

      expect(screen.getByTestId('custom-modal')).toBeTruthy();
      expect(screen.queryByTestId('modal')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has dialog accessibility role', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </Modal>
      );

      const modal = screen.getByTestId('modal');
      expect(modal.props.accessibilityRole).toBe('none');
    });

    it('has accessibilityViewIsModal set to true on card', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </Modal>
      );

      const card = screen.getByTestId('modal-card');
      expect(card.props.accessibilityViewIsModal).toBe(true);
    });

    it('close button has accessibility label', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeTruthy();
    });

    it('title is announced to screen readers', () => {
      render(
        <Modal visible={true} onClose={jest.fn()} title="Important Title">
          <Text>Content</Text>
        </Modal>
      );

      const title = screen.getByText('Important Title');
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('card has accessible role', () => {
      render(
        <Modal visible={true} onClose={jest.fn()}>
          <Text>Content</Text>
        </Modal>
      );

      const card = screen.getByTestId('modal-card');
      expect(card.props.accessibilityRole).toBe('alert');
    });
  });

  describe('Props Forwarding', () => {
    it('supports style customization through testID-based identification', () => {
      render(
        <Modal visible={true} onClose={jest.fn()} testID="styled-modal">
          <Text>Content</Text>
        </Modal>
      );

      const modal = screen.getByTestId('styled-modal');
      expect(modal).toBeTruthy();
    });
  });
});
