/**
 * SynthesisCard Component Tests
 *
 * Tests for synthesis prompt interactions, input handling, and accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { SynthesisCard, type SynthesisCardProps } from '../SynthesisCard';

// Mocks are handled globally in jest.setup.js

// Mock haptic-feedback
jest.mock('@/src/lib/haptic-feedback', () => ({
  haptics: {
    light: jest.fn().mockResolvedValue(undefined),
    success: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

/**
 * Sample synthesis data for testing
 */
const sampleSynthesis = {
  conceptsToConnect: ['Variables', 'Data Types', 'Operators'],
  synthesisPrompt: 'How do these concepts work together to perform calculations?',
  chaptersCompleted: 6,
  totalChapters: 12,
};

/**
 * Helper to render SynthesisCard with default props
 */
function renderSynthesisCard(props: Partial<SynthesisCardProps> = {}) {
  const defaultProps: SynthesisCardProps = {
    ...sampleSynthesis,
    ...props,
  };
  return render(<SynthesisCard {...defaultProps} />);
}

describe('SynthesisCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card')).toBeTruthy();
    });

    it('renders header with "Connect the Dots" title', () => {
      renderSynthesisCard();

      expect(screen.getByText('Connect the Dots')).toBeTruthy();
    });

    it('renders synthesis checkpoint subtitle', () => {
      renderSynthesisCard();

      expect(screen.getByText(/Synthesis checkpoint: 6 of 12 chapters/)).toBeTruthy();
    });

    it('renders progress bar with correct percentage', () => {
      renderSynthesisCard();

      expect(screen.getByText('50% Complete')).toBeTruthy();
    });

    it('renders all concept chips', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByText('Variables')).toBeTruthy();
      expect(screen.getByText('Data Types')).toBeTruthy();
      expect(screen.getByText('Operators')).toBeTruthy();
    });

    it('renders concept chips with testIDs', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card-concept-0')).toBeTruthy();
      expect(screen.getByTestId('synthesis-card-concept-1')).toBeTruthy();
      expect(screen.getByTestId('synthesis-card-concept-2')).toBeTruthy();
    });

    it('renders synthesis prompt', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card-prompt')).toBeTruthy();
      expect(screen.getByText(sampleSynthesis.synthesisPrompt)).toBeTruthy();
    });

    it('renders text input', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card-input')).toBeTruthy();
    });

    it('renders skip and submit buttons', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card-skip')).toBeTruthy();
      expect(screen.getByTestId('synthesis-card-submit')).toBeTruthy();
    });

    it('renders character count', () => {
      renderSynthesisCard();

      expect(screen.getByText(/0 \/ 20\+ characters/)).toBeTruthy();
    });
  });

  describe('Progress Calculation', () => {
    it('calculates 50% progress correctly', () => {
      renderSynthesisCard({ chaptersCompleted: 6, totalChapters: 12 });

      expect(screen.getByText('50% Complete')).toBeTruthy();
    });

    it('calculates 100% progress correctly', () => {
      renderSynthesisCard({ chaptersCompleted: 12, totalChapters: 12 });

      expect(screen.getByText('100% Complete')).toBeTruthy();
    });

    it('calculates 25% progress correctly', () => {
      renderSynthesisCard({ chaptersCompleted: 3, totalChapters: 12 });

      expect(screen.getByText('25% Complete')).toBeTruthy();
    });
  });

  describe('Input Handling', () => {
    it('updates character count when typing', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'Hello world');

      expect(screen.getByText(/11 \/ 20\+ characters/)).toBeTruthy();
    });

    it('disables submit button when response is too short', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const submitButton = screen.getByTestId('synthesis-card-submit');
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables submit button when response meets minimum length', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'This response is long enough to submit.');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      expect(submitButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('Submit Interaction', () => {
    it('calls onComplete with response when submitted', async () => {
      const onComplete = jest.fn();
      renderSynthesisCard({ onComplete, testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      const response = 'This response connects all the concepts together nicely.';
      fireEvent.changeText(input, response);

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(response);
      });
    });

    it('triggers success haptic on submit', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(haptics.success).toHaveBeenCalled();
      });
    });

    it('shows success state after submission', async () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('synthesis-card-submitted')).toBeTruthy();
        expect(screen.getByText('Great synthesis!')).toBeTruthy();
      });
    });

    it('does not submit when response is too short', async () => {
      const onComplete = jest.fn();
      renderSynthesisCard({ onComplete, testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'Too short');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      // onComplete should not be called
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('marks as submitted after first submission', async () => {
      const onComplete = jest.fn();
      renderSynthesisCard({ onComplete, testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');

      // Press submit
      fireEvent.press(submitButton);

      // After submission, the submitted section should appear
      await waitFor(() => {
        expect(screen.getByTestId('synthesis-card-submitted')).toBeTruthy();
      });
    });
  });

  describe('Skip Interaction', () => {
    it('calls onSkip when skip button is pressed', async () => {
      const onSkip = jest.fn();
      renderSynthesisCard({ onSkip, testID: 'synthesis-card' });

      const skipButton = screen.getByTestId('synthesis-card-skip');
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalled();
      });
    });

    it('triggers light haptic on skip', async () => {
      const { haptics } = require('@/src/lib/haptic-feedback');
      renderSynthesisCard({ testID: 'synthesis-card' });

      const skipButton = screen.getByTestId('synthesis-card-skip');
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(haptics.light).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('input has correct accessibility label', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      expect(input.props.accessibilityLabel).toBe('Synthesis response input');
    });

    it('input has accessibility hint', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      expect(input.props.accessibilityHint).toContain('connecting the concepts');
    });

    it('skip button has correct accessibility role', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const skipButton = screen.getByTestId('synthesis-card-skip');
      expect(skipButton.props.accessibilityRole).toBe('button');
    });

    it('submit button has correct accessibility role', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const submitButton = screen.getByTestId('synthesis-card-submit');
      expect(submitButton.props.accessibilityRole).toBe('button');
    });

    it('submit button has accessibility label', () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const submitButton = screen.getByTestId('synthesis-card-submit');
      expect(submitButton.props.accessibilityLabel).toBe('Submit synthesis');
    });
  });

  describe('Props Handling', () => {
    it('handles missing onComplete callback gracefully', async () => {
      renderSynthesisCard({ onComplete: undefined, testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');

      // Should not throw when pressed
      expect(() => {
        fireEvent.press(submitButton);
      }).not.toThrow();
    });

    it('handles missing onSkip callback gracefully', () => {
      renderSynthesisCard({ onSkip: undefined, testID: 'synthesis-card' });

      const skipButton = screen.getByTestId('synthesis-card-skip');

      // Should not throw when pressed
      expect(() => {
        fireEvent.press(skipButton);
      }).not.toThrow();
    });

    it('renders with isActive prop', () => {
      renderSynthesisCard({ isActive: true, testID: 'synthesis-card' });

      expect(screen.getByTestId('synthesis-card')).toBeTruthy();
    });

    it('renders with different concept counts', () => {
      renderSynthesisCard({
        conceptsToConnect: ['Concept1', 'Concept2'],
        testID: 'synthesis-card',
      });

      expect(screen.getByText('Concept1')).toBeTruthy();
      expect(screen.getByText('Concept2')).toBeTruthy();
    });
  });

  describe('Success State', () => {
    it('shows submitted section after submission', async () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        // Submitted section should be visible
        expect(screen.getByTestId('synthesis-card-submitted')).toBeTruthy();
      });
    });

    it('displays success message after submission', async () => {
      renderSynthesisCard({ testID: 'synthesis-card' });

      const input = screen.getByTestId('synthesis-card-input');
      fireEvent.changeText(input, 'A valid response that is long enough.');

      const submitButton = screen.getByTestId('synthesis-card-submit');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/meaningful connections/)).toBeTruthy();
      });
    });
  });
});
