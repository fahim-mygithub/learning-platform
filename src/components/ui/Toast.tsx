/**
 * Toast Component
 *
 * A notification system with React Context for displaying toast messages.
 * Features:
 * - ToastProvider: Context provider for managing toast state
 * - useToast: Hook for showing and hiding toasts
 * - Toast: Visual component for displaying messages
 * - Queue support: Shows one toast at a time, queues the rest
 * - Auto-dismiss: Configurable duration with type-specific defaults
 * - Accessibility: Screen reader support with appropriate live regions
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  Animated,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

/**
 * Toast type for styling
 */
export type ToastType = 'success' | 'error' | 'info';

/**
 * Toast message structure
 */
export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

/**
 * Toast context value
 */
export interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

/**
 * Default durations by toast type (in milliseconds)
 */
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  info: 3000,
  error: 5000,
};

/**
 * Background colors by toast type
 */
const TYPE_COLORS: Record<ToastType, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.info,
};

/**
 * Toast Context
 */
const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Generate unique ID for toast messages
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Props for ToastProvider
 */
export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * ToastProvider Component
 *
 * Provides toast context to the application and renders the toast container.
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 */
export function ToastProvider({ children }: ToastProviderProps): React.ReactElement {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Show a toast notification
   */
  const showToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const toast: ToastMessage = {
        id: generateId(),
        type,
        message,
        duration: duration ?? DEFAULT_DURATIONS[type],
      };

      setQueue((prev) => [...prev, toast]);
    },
    []
  );

  /**
   * Hide a toast by ID
   */
  const hideToast = useCallback((id: string) => {
    setCurrentToast((current) => {
      if (current?.id === id) {
        return null;
      }
      return current;
    });
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Process queue: show next toast when current is dismissed
   */
  useEffect(() => {
    if (!currentToast && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentToast(next);
      setQueue(rest);
    }
  }, [currentToast, queue]);

  /**
   * Auto-dismiss timer for current toast
   */
  useEffect(() => {
    if (currentToast) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set auto-dismiss timer
      timeoutRef.current = setTimeout(() => {
        setCurrentToast(null);
      }, currentToast.duration);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [currentToast]);

  /**
   * Dismiss current toast manually
   */
  const dismissCurrent = useCallback(() => {
    if (currentToast) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setCurrentToast(null);
    }
  }, [currentToast]);

  const contextValue: ToastContextValue = {
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {currentToast && (
        <ToastContainer toast={currentToast} onDismiss={dismissCurrent} />
      )}
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 *
 * Returns functions to show and hide toasts.
 * Must be used within a ToastProvider.
 *
 * @example
 * ```tsx
 * const { showToast } = useToast();
 * showToast('success', 'Changes saved!');
 * showToast('error', 'Something went wrong', 5000);
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

/**
 * Props for ToastContainer
 */
interface ToastContainerProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

/**
 * ToastContainer Component
 *
 * Visual representation of a toast notification.
 * Slides in from top with animation.
 */
function ToastContainer({
  toast,
  onDismiss,
}: ToastContainerProps): React.ReactElement {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const backgroundColor = TYPE_COLORS[toast.type];
  const liveRegion = toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <Animated.View
      testID="toast-container"
      accessibilityRole="alert"
      accessibilityLiveRegion={liveRegion}
      style={[
        styles.container,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.message} accessibilityLabel={toast.message}>
        {toast.message}
      </Text>
      <Pressable
        testID="toast-dismiss"
        onPress={onDismiss}
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
        style={styles.dismissButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.dismissText}>{'\u00D7'}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Styles for Toast components
 */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  } as ViewStyle,
  message: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    marginLeft: 12,
    padding: 4,
  },
  dismissText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default ToastProvider;
