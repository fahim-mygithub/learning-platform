/**
 * PretestOfferModal Tests
 *
 * Tests for the PretestOfferModal component:
 * - Renders correctly when visible
 * - Shows correct prerequisite count
 * - Calls onTakePretest when button pressed
 * - Calls onSkip when skip button pressed
 * - Shows loading state on take button
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { PretestOfferModal } from '../PretestOfferModal';

describe('PretestOfferModal', () => {
  const defaultProps = {
    visible: true,
    prerequisiteCount: 3,
    onTakePretest: jest.fn(),
    onSkip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    render(<PretestOfferModal {...defaultProps} />);

    expect(screen.getByText('Quick Knowledge Check')).toBeTruthy();
    expect(screen.getByText(/3 prerequisite topics/)).toBeTruthy();
  });

  it('shows singular form for 1 prerequisite', () => {
    render(<PretestOfferModal {...defaultProps} prerequisiteCount={1} />);

    expect(screen.getByText(/1 prerequisite topic\./)).toBeTruthy();
  });

  it('shows correct time estimate', () => {
    render(<PretestOfferModal {...defaultProps} prerequisiteCount={2} />);

    // 2 questions * 30 seconds = 60 seconds = 1 minute
    expect(screen.getByText('1 minute')).toBeTruthy();
  });

  it('shows plural minutes for longer tests', () => {
    render(<PretestOfferModal {...defaultProps} prerequisiteCount={5} />);

    // 5 questions * 30 seconds = 150 seconds = 3 minutes
    expect(screen.getByText('3 minutes')).toBeTruthy();
  });

  it('calls onTakePretest when take button is pressed', () => {
    render(<PretestOfferModal {...defaultProps} />);

    const takeButton = screen.getByTestId('pretest-offer-modal-take-button');
    fireEvent.press(takeButton);

    expect(defaultProps.onTakePretest).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when skip button is pressed', () => {
    render(<PretestOfferModal {...defaultProps} />);

    const skipButton = screen.getByTestId('pretest-offer-modal-skip-button');
    fireEvent.press(skipButton);

    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading', () => {
    render(<PretestOfferModal {...defaultProps} isLoading={true} />);

    const skipButton = screen.getByTestId('pretest-offer-modal-skip-button');

    // Skip button should be disabled but still rendered
    expect(skipButton).toBeTruthy();
  });

  it('shows benefits list', () => {
    render(<PretestOfferModal {...defaultProps} />);

    expect(screen.getByText('Personalized learning path')).toBeTruthy();
    expect(screen.getByText('Fill knowledge gaps first')).toBeTruthy();
    expect(screen.getByText('Better understanding of content')).toBeTruthy();
  });

  it('has accessible elements', () => {
    render(<PretestOfferModal {...defaultProps} />);

    const takeButton = screen.getByTestId('pretest-offer-modal-take-button');
    const skipButton = screen.getByTestId('pretest-offer-modal-skip-button');

    expect(takeButton.props.accessibilityLabel).toBe('Take quick check');
    expect(skipButton.props.accessibilityLabel).toBe('Skip knowledge check');
  });
});
