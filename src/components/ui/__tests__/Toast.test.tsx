/**
 * Toast Component Tests
 *
 * Tests for ToastProvider, useToast hook, and Toast component.
 * Covers rendering, auto-dismiss, queue behavior, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';

import { ToastProvider, useToast, type ToastType } from '../Toast';

/**
 * Test component that uses the useToast hook
 */
function TestComponent({
  type = 'success' as ToastType,
  message = 'Test message',
  duration,
}: {
  type?: ToastType;
  message?: string;
  duration?: number;
}) {
  const { showToast, hideToast } = useToast();

  return (
    <>
      <Pressable
        testID="show-toast"
        onPress={() => showToast(type, message, duration)}
      >
        <Text>Show Toast</Text>
      </Pressable>
      <Pressable
        testID="hide-toast"
        onPress={() => hideToast('test-id')}
      >
        <Text>Hide Toast</Text>
      </Pressable>
    </>
  );
}

/**
 * Helper to render with ToastProvider
 */
function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Toast Component', () => {
  // Use fake timers for auto-dismiss tests
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Wrap timer cleanup in act() to avoid React warnings
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children correctly', () => {
      renderWithProvider(<Text testID="child">Child Content</Text>);

      expect(screen.getByTestId('child')).toBeTruthy();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('renders without errors', () => {
      const result = renderWithProvider(<Text testID="test-content">Test</Text>);

      expect(result).toBeTruthy();
      expect(screen.getByTestId('test-content')).toBeTruthy();
    });
  });

  describe('useToast Hook', () => {
    it('throws error when used outside ToastProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });

    it('provides showToast and hideToast functions', () => {
      let hookResult: ReturnType<typeof useToast> | null = null;

      function CaptureHook() {
        hookResult = useToast();
        return null;
      }

      renderWithProvider(<CaptureHook />);

      expect(hookResult).not.toBeNull();
      expect(typeof hookResult!.showToast).toBe('function');
      expect(typeof hookResult!.hideToast).toBe('function');
    });
  });

  describe('showToast', () => {
    it('displays toast message when showToast is called', () => {
      renderWithProvider(<TestComponent message="Hello World" />);

      // Toast should not be visible initially
      expect(screen.queryByText('Hello World')).toBeNull();

      // Trigger showToast
      fireEvent.press(screen.getByTestId('show-toast'));

      // Toast should now be visible
      expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('displays success toast', () => {
      renderWithProvider(<TestComponent type="success" message="Success!" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      expect(screen.getByText('Success!')).toBeTruthy();
    });

    it('displays error toast', () => {
      renderWithProvider(<TestComponent type="error" message="Error occurred" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      expect(screen.getByText('Error occurred')).toBeTruthy();
    });

    it('displays info toast', () => {
      renderWithProvider(<TestComponent type="info" message="Information" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      expect(screen.getByText('Information')).toBeTruthy();
    });
  });

  describe('Auto-dismiss', () => {
    it('auto-dismisses success toast after default duration (3000ms)', async () => {
      renderWithProvider(<TestComponent type="success" message="Auto dismiss" />);

      fireEvent.press(screen.getByTestId('show-toast'));
      expect(screen.getByText('Auto dismiss')).toBeTruthy();

      // Advance time by 3000ms (default for success)
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Toast should be dismissed
      await waitFor(() => {
        expect(screen.queryByText('Auto dismiss')).toBeNull();
      });
    });

    it('auto-dismisses info toast after default duration (3000ms)', async () => {
      renderWithProvider(<TestComponent type="info" message="Info toast" />);

      fireEvent.press(screen.getByTestId('show-toast'));
      expect(screen.getByText('Info toast')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Info toast')).toBeNull();
      });
    });

    it('auto-dismisses error toast after longer duration (5000ms)', async () => {
      renderWithProvider(<TestComponent type="error" message="Error toast" />);

      fireEvent.press(screen.getByTestId('show-toast'));
      expect(screen.getByText('Error toast')).toBeTruthy();

      // Should still be visible after 3000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByText('Error toast')).toBeTruthy();

      // Should be dismissed after 5000ms total
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Error toast')).toBeNull();
      });
    });

    it('uses custom duration when provided', async () => {
      renderWithProvider(
        <TestComponent type="success" message="Custom duration" duration={1000} />
      );

      fireEvent.press(screen.getByTestId('show-toast'));
      expect(screen.getByText('Custom duration')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom duration')).toBeNull();
      });
    });

    it('does not dismiss before duration expires', () => {
      renderWithProvider(<TestComponent type="success" message="Still here" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      // Advance time by less than default duration
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Toast should still be visible
      expect(screen.getByText('Still here')).toBeTruthy();
    });
  });

  describe('hideToast', () => {
    it('removes toast when dismiss button is pressed', async () => {
      renderWithProvider(<TestComponent message="Dismissible" />);

      fireEvent.press(screen.getByTestId('show-toast'));
      expect(screen.getByText('Dismissible')).toBeTruthy();

      // Press the dismiss button on the toast
      const dismissButton = screen.getByTestId('toast-dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Dismissible')).toBeNull();
      });
    });
  });

  describe('Toast Queue', () => {
    it('shows only one toast at a time', () => {
      function MultipleToasts() {
        const { showToast } = useToast();

        return (
          <>
            <Pressable
              testID="show-first"
              onPress={() => showToast('success', 'First toast')}
            >
              <Text>First</Text>
            </Pressable>
            <Pressable
              testID="show-second"
              onPress={() => showToast('info', 'Second toast')}
            >
              <Text>Second</Text>
            </Pressable>
          </>
        );
      }

      renderWithProvider(<MultipleToasts />);

      // Show first toast
      fireEvent.press(screen.getByTestId('show-first'));
      expect(screen.getByText('First toast')).toBeTruthy();

      // Show second toast
      fireEvent.press(screen.getByTestId('show-second'));

      // Only one toast should be visible at a time (first one)
      expect(screen.getByText('First toast')).toBeTruthy();
      expect(screen.queryByText('Second toast')).toBeNull();
    });

    it('shows next toast in queue after current one is dismissed', async () => {
      function MultipleToasts() {
        const { showToast } = useToast();

        return (
          <>
            <Pressable
              testID="show-first"
              onPress={() => showToast('success', 'First toast', 1000)}
            >
              <Text>First</Text>
            </Pressable>
            <Pressable
              testID="show-second"
              onPress={() => showToast('info', 'Second toast', 1000)}
            >
              <Text>Second</Text>
            </Pressable>
          </>
        );
      }

      renderWithProvider(<MultipleToasts />);

      // Show both toasts
      fireEvent.press(screen.getByTestId('show-first'));
      fireEvent.press(screen.getByTestId('show-second'));

      // First toast is visible
      expect(screen.getByText('First toast')).toBeTruthy();

      // Dismiss first toast
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Second toast should now be visible
      await waitFor(() => {
        expect(screen.queryByText('First toast')).toBeNull();
        expect(screen.getByText('Second toast')).toBeTruthy();
      });
    });

    it('queues multiple toasts and shows them sequentially', async () => {
      function MultipleToasts() {
        const { showToast } = useToast();

        return (
          <Pressable
            testID="show-all"
            onPress={() => {
              showToast('success', 'Toast 1', 500);
              showToast('info', 'Toast 2', 500);
              showToast('error', 'Toast 3', 500);
            }}
          >
            <Text>Show All</Text>
          </Pressable>
        );
      }

      renderWithProvider(<MultipleToasts />);

      fireEvent.press(screen.getByTestId('show-all'));

      // First toast visible
      expect(screen.getByText('Toast 1')).toBeTruthy();

      // Advance to show second
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Toast 2')).toBeTruthy();
      });

      // Advance to show third
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('Toast 3')).toBeTruthy();
      });

      // Advance to dismiss all
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.queryByText('Toast 3')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('has alert accessibility role', () => {
      renderWithProvider(<TestComponent message="Alert message" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      // Check accessibility role via testID since Animated.View may not expose role properly
      const toast = screen.getByTestId('toast-container');
      expect(toast.props.accessibilityRole).toBe('alert');
    });

    it('has polite live region for success toast', () => {
      renderWithProvider(<TestComponent type="success" message="Success" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      const toast = screen.getByTestId('toast-container');
      expect(toast.props.accessibilityLiveRegion).toBe('polite');
    });

    it('has polite live region for info toast', () => {
      renderWithProvider(<TestComponent type="info" message="Info" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      const toast = screen.getByTestId('toast-container');
      expect(toast.props.accessibilityLiveRegion).toBe('polite');
    });

    it('has assertive live region for error toast', () => {
      renderWithProvider(<TestComponent type="error" message="Error" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      const toast = screen.getByTestId('toast-container');
      expect(toast.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('dismiss button has accessibility label', () => {
      renderWithProvider(<TestComponent message="Toast" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeTruthy();
    });

    it('toast message is accessible to screen readers', () => {
      renderWithProvider(<TestComponent message="Accessible message" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      // The message should be findable by text
      expect(screen.getByText('Accessible message')).toBeTruthy();
    });
  });

  describe('Toast Styling', () => {
    it('renders with dismiss button (X)', () => {
      renderWithProvider(<TestComponent message="With dismiss" />);

      fireEvent.press(screen.getByTestId('show-toast'));

      // Dismiss button should have X text
      expect(screen.getByText('\u00D7')).toBeTruthy(); // Unicode multiplication sign (X)
    });
  });
});
