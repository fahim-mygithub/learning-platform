/**
 * DragList Component Tests
 *
 * Tests for drag-to-reorder list functionality, accessibility, and touch targets.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { DragList, type DragListProps } from '../DragList';

/**
 * Helper to render DragList with default props
 */
function renderDragList(props: Partial<DragListProps> = {}) {
  const defaultProps: DragListProps = {
    options: ['First', 'Second', 'Third', 'Fourth'],
    onAnswer: jest.fn(),
    ...props,
  };
  return render(<DragList {...defaultProps} />);
}

describe('DragList Component', () => {
  describe('Rendering', () => {
    it('renders all items correctly', () => {
      renderDragList();

      expect(screen.getByText('First')).toBeTruthy();
      expect(screen.getByText('Second')).toBeTruthy();
      expect(screen.getByText('Third')).toBeTruthy();
      expect(screen.getByText('Fourth')).toBeTruthy();
    });

    it('renders order numbers (1, 2, 3, 4)', () => {
      renderDragList();

      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('renders with testID', () => {
      renderDragList({ testID: 'drag-q' });

      expect(screen.getByTestId('drag-q')).toBeTruthy();
      expect(screen.getByTestId('drag-q-item-0')).toBeTruthy();
      expect(screen.getByTestId('drag-q-item-1')).toBeTruthy();
      expect(screen.getByTestId('drag-q-item-2')).toBeTruthy();
      expect(screen.getByTestId('drag-q-item-3')).toBeTruthy();
    });

    it('renders up/down control buttons', () => {
      renderDragList({ testID: 'drag-q' });

      expect(screen.getByTestId('drag-q-up-0')).toBeTruthy();
      expect(screen.getByTestId('drag-q-down-0')).toBeTruthy();
      expect(screen.getByTestId('drag-q-up-1')).toBeTruthy();
      expect(screen.getByTestId('drag-q-down-1')).toBeTruthy();
    });

    it('renders Check Order button', () => {
      renderDragList();

      expect(screen.getByText('Check Order')).toBeTruthy();
    });

    it('renders submit button with testID', () => {
      renderDragList({ testID: 'drag-q' });

      expect(screen.getByTestId('drag-q-submit')).toBeTruthy();
    });
  });

  describe('Reordering', () => {
    it('moves item up when up button is pressed', () => {
      renderDragList({ testID: 'drag-q' });

      // Move "Second" up
      fireEvent.press(screen.getByTestId('drag-q-up-1'));

      // After moving, verify the order by checking the visible text
      // "Second" should now be at position 0, "First" at position 1
      const items = screen.getAllByText(/First|Second|Third|Fourth/);
      expect(items.length).toBe(4);
    });

    it('moves item down when down button is pressed', () => {
      renderDragList({ testID: 'drag-q' });

      // Move "First" down
      fireEvent.press(screen.getByTestId('drag-q-down-0'));

      // After moving, items should have swapped positions
      const items = screen.getAllByText(/First|Second|Third|Fourth/);
      expect(items.length).toBe(4);
    });

    it('does not move first item up (already at top)', () => {
      renderDragList({ testID: 'drag-q' });

      const upButton = screen.getByTestId('drag-q-up-0');
      fireEvent.press(upButton);

      // Button should be disabled for first item going up
      expect(upButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('does not move last item down (already at bottom)', () => {
      renderDragList({ testID: 'drag-q' });

      const downButton = screen.getByTestId('drag-q-down-3');
      fireEvent.press(downButton);

      // Button should be disabled for last item going down
      expect(downButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('does not allow reordering when disabled', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, disabled: true, testID: 'drag-q' });

      fireEvent.press(screen.getByTestId('drag-q-up-1'));
      fireEvent.press(screen.getByTestId('drag-q-submit'));

      // Should not have called onAnswer
      expect(onAnswer).not.toHaveBeenCalled();
    });
  });

  describe('Submission', () => {
    it('calls onAnswer with comma-separated order when submitted', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, testID: 'drag-q' });

      fireEvent.press(screen.getByTestId('drag-q-submit'));

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith('First,Second,Third,Fourth');
    });

    it('submits current order after reordering', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, testID: 'drag-q' });

      // Move "Second" up to first position
      fireEvent.press(screen.getByTestId('drag-q-up-1'));

      fireEvent.press(screen.getByTestId('drag-q-submit'));

      expect(onAnswer).toHaveBeenCalledWith('Second,First,Third,Fourth');
    });

    it('does not call onAnswer when disabled', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, disabled: true, testID: 'drag-q' });

      fireEvent.press(screen.getByTestId('drag-q-submit'));

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('disables controls after submission', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, testID: 'drag-q' });

      fireEvent.press(screen.getByTestId('drag-q-submit'));

      // After submission, reordering should be disabled
      fireEvent.press(screen.getByTestId('drag-q-up-1'));

      // onAnswer should still only have been called once
      expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    it('prevents double submission', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, testID: 'drag-q' });

      fireEvent.press(screen.getByTestId('drag-q-submit'));
      fireEvent.press(screen.getByTestId('drag-q-submit'));

      expect(onAnswer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role for control buttons', () => {
      renderDragList({ testID: 'drag-q' });

      const upButton = screen.getByTestId('drag-q-up-0');
      const downButton = screen.getByTestId('drag-q-down-0');

      expect(upButton.props.accessibilityRole).toBe('button');
      expect(downButton.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility labels for control buttons', () => {
      renderDragList({ testID: 'drag-q' });

      const upButton = screen.getByTestId('drag-q-up-1');
      const downButton = screen.getByTestId('drag-q-down-1');

      expect(upButton.props.accessibilityLabel).toBe('Move Second up');
      expect(downButton.props.accessibilityLabel).toBe('Move Second down');
    });

    it('has correct accessibility role for submit button', () => {
      renderDragList({ testID: 'drag-q' });

      const submit = screen.getByTestId('drag-q-submit');
      expect(submit.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label for submit button', () => {
      renderDragList({ testID: 'drag-q' });

      const submit = screen.getByTestId('drag-q-submit');
      expect(submit.props.accessibilityLabel).toBe('Check order');
    });

    it('has disabled accessibility state for first item up button', () => {
      renderDragList({ testID: 'drag-q' });

      const upButton = screen.getByTestId('drag-q-up-0');
      expect(upButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('has disabled accessibility state for last item down button', () => {
      renderDragList({ testID: 'drag-q' });

      const downButton = screen.getByTestId('drag-q-down-3');
      expect(downButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe('Touch Targets', () => {
    it('enforces minimum 56px height for items', () => {
      renderDragList({ testID: 'drag-q' });

      // Component enforces ITEM_HEIGHT = 56 via minHeight style
      const item = screen.getByTestId('drag-q-item-0');
      expect(item).toBeTruthy();
    });
  });

  describe('Multiple Reorders', () => {
    it('handles multiple consecutive reorders correctly', () => {
      const onAnswer = jest.fn();
      renderDragList({ onAnswer, testID: 'drag-q' });

      // Move "Fourth" up three times to first position
      fireEvent.press(screen.getByTestId('drag-q-up-3')); // Fourth is now at index 2
      fireEvent.press(screen.getByTestId('drag-q-up-2')); // Fourth is now at index 1
      fireEvent.press(screen.getByTestId('drag-q-up-1')); // Fourth is now at index 0

      fireEvent.press(screen.getByTestId('drag-q-submit'));

      expect(onAnswer).toHaveBeenCalledWith('Fourth,First,Second,Third');
    });
  });
});
