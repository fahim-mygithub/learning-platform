/**
 * ConceptReveal Component Tests
 *
 * Tests for the ConceptReveal component covering:
 * - Renders correct/incorrect banner with appropriate styling
 * - Displays concept name and definition
 * - Shows pedagogical notes when provided
 * - Shows misconception warning when provided
 * - Continue button works correctly
 * - Accessibility labels present
 * - testID props work correctly
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ConceptReveal } from '../ConceptReveal';

describe('ConceptReveal Component', () => {
  const defaultProps = {
    isCorrect: true,
    conceptName: 'React Hooks',
    definition: 'Hooks are functions that let you use state and lifecycle features.',
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default testID', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(screen.getByTestId('concept-reveal')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      render(<ConceptReveal {...defaultProps} testID="my-reveal" />);

      expect(screen.getByTestId('my-reveal')).toBeTruthy();
      expect(screen.queryByTestId('concept-reveal')).toBeNull();
    });

    it('renders concept name', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(screen.getByText('React Hooks')).toBeTruthy();
    });

    it('renders definition', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(
        screen.getByText('Hooks are functions that let you use state and lifecycle features.')
      ).toBeTruthy();
    });

    it('renders Continue button', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });

  describe('Result Banner', () => {
    it('renders correct banner when isCorrect is true', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={true} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      expect(banner).toBeTruthy();
      expect(screen.getByText('Correct!')).toBeTruthy();
      expect(screen.getByText('\u2713')).toBeTruthy(); // checkmark
    });

    it('renders incorrect banner when isCorrect is false', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={false} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      expect(banner).toBeTruthy();
      expect(screen.getByText('Not quite')).toBeTruthy();
      expect(screen.getByText('\u2717')).toBeTruthy(); // X mark
    });

    it('correct banner has green background', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={true} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      const styles = banner.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce(
            (acc: Record<string, unknown>, s: Record<string, unknown>) => ({
              ...acc,
              ...s,
            }),
            {}
          )
        : styles;

      expect(flatStyles.backgroundColor).toBe('#22C55E'); // colors.success
    });

    it('incorrect banner has red background', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={false} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      const styles = banner.props.style;
      const flatStyles = Array.isArray(styles)
        ? styles.reduce(
            (acc: Record<string, unknown>, s: Record<string, unknown>) => ({
              ...acc,
              ...s,
            }),
            {}
          )
        : styles;

      expect(flatStyles.backgroundColor).toBe('#EF4444'); // colors.error
    });
  });

  describe('Pedagogical Notes', () => {
    it('does not render pedagogical notes section when not provided', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(screen.queryByTestId('concept-reveal-pedagogical-notes')).toBeNull();
      expect(screen.queryByText('Why this matters')).toBeNull();
    });

    it('renders pedagogical notes section when provided', () => {
      render(
        <ConceptReveal
          {...defaultProps}
          pedagogicalNotes="Understanding hooks is crucial for modern React."
        />
      );

      expect(screen.getByTestId('concept-reveal-pedagogical-notes')).toBeTruthy();
      expect(screen.getByText('Why this matters')).toBeTruthy();
      expect(
        screen.getByText('Understanding hooks is crucial for modern React.')
      ).toBeTruthy();
    });
  });

  describe('Misconception Warning', () => {
    it('does not render misconception section when not provided', () => {
      render(<ConceptReveal {...defaultProps} />);

      expect(screen.queryByTestId('concept-reveal-misconception')).toBeNull();
      expect(screen.queryByText('Watch out for')).toBeNull();
    });

    it('renders misconception section when provided', () => {
      render(
        <ConceptReveal
          {...defaultProps}
          misconception="Hooks cannot be called inside loops or conditions."
        />
      );

      expect(screen.getByTestId('concept-reveal-misconception')).toBeTruthy();
      expect(screen.getByText('Watch out for')).toBeTruthy();
      expect(
        screen.getByText('Hooks cannot be called inside loops or conditions.')
      ).toBeTruthy();
    });

    it('can render both pedagogical notes and misconception', () => {
      render(
        <ConceptReveal
          {...defaultProps}
          pedagogicalNotes="Understanding hooks is crucial."
          misconception="Hooks cannot be called conditionally."
        />
      );

      expect(screen.getByTestId('concept-reveal-pedagogical-notes')).toBeTruthy();
      expect(screen.getByTestId('concept-reveal-misconception')).toBeTruthy();
      expect(screen.getByText('Why this matters')).toBeTruthy();
      expect(screen.getByText('Watch out for')).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('calls onContinue when pressed', () => {
      const onContinue = jest.fn();
      render(<ConceptReveal {...defaultProps} onContinue={onContinue} />);

      const button = screen.getByTestId('concept-reveal-continue-button');
      fireEvent.press(button);

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('button has correct testID', () => {
      render(<ConceptReveal {...defaultProps} testID="my-reveal" />);

      expect(screen.getByTestId('my-reveal-continue-button')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible container', () => {
      render(<ConceptReveal {...defaultProps} />);

      const container = screen.getByTestId('concept-reveal');
      expect(container.props.accessible).toBe(true);
    });

    it('has accessibility label for correct answer', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={true} />);

      const container = screen.getByTestId('concept-reveal');
      expect(container.props.accessibilityLabel).toContain('Correct');
      expect(container.props.accessibilityLabel).toContain('React Hooks');
    });

    it('has accessibility label for incorrect answer', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={false} />);

      const container = screen.getByTestId('concept-reveal');
      expect(container.props.accessibilityLabel).toContain('Incorrect');
    });

    it('banner has correct accessibility label for correct answer', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={true} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      expect(banner.props.accessibilityLabel).toBe('Correct answer');
    });

    it('banner has correct accessibility label for incorrect answer', () => {
      render(<ConceptReveal {...defaultProps} isCorrect={false} />);

      const banner = screen.getByTestId('concept-reveal-banner');
      expect(banner.props.accessibilityLabel).toBe('Incorrect answer');
    });

    it('container has correct accessibility role', () => {
      render(<ConceptReveal {...defaultProps} />);

      const container = screen.getByTestId('concept-reveal');
      expect(container.props.accessibilityRole).toBe('text');
    });
  });

  describe('Test ID Propagation', () => {
    it('applies testID prefix to banner', () => {
      render(<ConceptReveal {...defaultProps} testID="my-reveal" />);

      expect(screen.getByTestId('my-reveal-banner')).toBeTruthy();
    });

    it('applies testID prefix to concept name', () => {
      render(<ConceptReveal {...defaultProps} testID="my-reveal" />);

      expect(screen.getByTestId('my-reveal-concept-name')).toBeTruthy();
    });

    it('applies testID prefix to definition', () => {
      render(<ConceptReveal {...defaultProps} testID="my-reveal" />);

      expect(screen.getByTestId('my-reveal-definition')).toBeTruthy();
    });

    it('applies testID prefix to pedagogical notes when present', () => {
      render(
        <ConceptReveal
          {...defaultProps}
          testID="my-reveal"
          pedagogicalNotes="Important notes"
        />
      );

      expect(screen.getByTestId('my-reveal-pedagogical-notes')).toBeTruthy();
    });

    it('applies testID prefix to misconception when present', () => {
      render(
        <ConceptReveal
          {...defaultProps}
          testID="my-reveal"
          misconception="Common mistake"
        />
      );

      expect(screen.getByTestId('my-reveal-misconception')).toBeTruthy();
    });
  });

  describe('Full Render Scenarios', () => {
    it('renders complete correct answer with all optional fields', () => {
      render(
        <ConceptReveal
          isCorrect={true}
          conceptName="Closures"
          definition="A closure is a function that has access to variables from its outer scope."
          pedagogicalNotes="Closures are fundamental to JavaScript and enable powerful patterns."
          misconception="Closures do not copy values, they maintain references."
          onContinue={jest.fn()}
        />
      );

      expect(screen.getByText('Correct!')).toBeTruthy();
      expect(screen.getByText('Closures')).toBeTruthy();
      expect(
        screen.getByText(
          'A closure is a function that has access to variables from its outer scope.'
        )
      ).toBeTruthy();
      expect(screen.getByText('Why this matters')).toBeTruthy();
      expect(screen.getByText('Watch out for')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('renders minimal incorrect answer', () => {
      render(
        <ConceptReveal
          isCorrect={false}
          conceptName="Promises"
          definition="A Promise represents an eventual completion or failure of an async operation."
          onContinue={jest.fn()}
        />
      );

      expect(screen.getByText('Not quite')).toBeTruthy();
      expect(screen.getByText('Promises')).toBeTruthy();
      expect(
        screen.getByText(
          'A Promise represents an eventual completion or failure of an async operation.'
        )
      ).toBeTruthy();
      expect(screen.queryByText('Why this matters')).toBeNull();
      expect(screen.queryByText('Watch out for')).toBeNull();
      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });
});
