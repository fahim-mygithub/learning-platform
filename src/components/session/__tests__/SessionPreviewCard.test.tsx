/**
 * SessionPreviewCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionPreviewCard } from '../SessionPreviewCard';
import { LearningSessionType } from '../../../types/session';

describe('SessionPreviewCard', () => {
  const defaultProps = {
    reviewCount: 5,
    newConceptCount: 2,
    estimatedMinutes: 15,
    sessionType: 'standard' as LearningSessionType,
    onStartSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      const { getByTestId } = render(
        <SessionPreviewCard {...defaultProps} testID="test-card" />
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('renders review count correctly', () => {
      const { getByTestId, getByText } = render(
        <SessionPreviewCard {...defaultProps} reviewCount={8} testID="test-card" />
      );

      expect(getByTestId('test-card-review-count')).toBeTruthy();
      expect(getByText('8')).toBeTruthy();
      expect(getByText('Reviews')).toBeTruthy();
    });

    it('renders singular review label for count of 1', () => {
      const { getByText } = render(
        <SessionPreviewCard {...defaultProps} reviewCount={1} testID="test-card" />
      );

      expect(getByText('Review')).toBeTruthy();
    });

    it('renders new concept count correctly', () => {
      const { getByTestId, getByText } = render(
        <SessionPreviewCard {...defaultProps} newConceptCount={3} testID="test-card" />
      );

      expect(getByTestId('test-card-new-count')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('New Concepts')).toBeTruthy();
    });

    it('renders singular new concept label for count of 1', () => {
      const { getByText } = render(
        <SessionPreviewCard {...defaultProps} newConceptCount={1} testID="test-card" />
      );

      expect(getByText('New Concept')).toBeTruthy();
    });

    it('renders estimated duration', () => {
      const { getByTestId, getByText } = render(
        <SessionPreviewCard {...defaultProps} estimatedMinutes={20} testID="test-card" />
      );

      expect(getByTestId('test-card-duration')).toBeTruthy();
      expect(getByText('20')).toBeTruthy();
      expect(getByText('Minutes')).toBeTruthy();
    });
  });

  describe('session type badge', () => {
    it('shows Standard badge for standard session', () => {
      const { getByTestId, getByText } = render(
        <SessionPreviewCard
          {...defaultProps}
          sessionType="standard"
          testID="test-card"
        />
      );

      expect(getByTestId('test-card-type-badge')).toBeTruthy();
      expect(getByText('Standard')).toBeTruthy();
    });

    it('shows Review Only badge for review_only session', () => {
      const { getByText } = render(
        <SessionPreviewCard
          {...defaultProps}
          sessionType="review_only"
          testID="test-card"
        />
      );

      expect(getByText('Review Only')).toBeTruthy();
    });

    it('shows Morning Check badge for morning_check session', () => {
      const { getByText } = render(
        <SessionPreviewCard
          {...defaultProps}
          sessionType="morning_check"
          testID="test-card"
        />
      );

      expect(getByText('Morning Check')).toBeTruthy();
    });
  });

  describe('start session button', () => {
    it('calls onStartSession when button is pressed', () => {
      const onStartSession = jest.fn();
      const { getByTestId } = render(
        <SessionPreviewCard
          {...defaultProps}
          onStartSession={onStartSession}
          testID="test-card"
        />
      );

      const button = getByTestId('test-card-start-button');
      fireEvent.press(button);

      expect(onStartSession).toHaveBeenCalledTimes(1);
    });

    it('disables button when no content (review and new counts are 0)', () => {
      const onStartSession = jest.fn();
      const { getByTestId } = render(
        <SessionPreviewCard
          {...defaultProps}
          reviewCount={0}
          newConceptCount={0}
          onStartSession={onStartSession}
          testID="test-card"
        />
      );

      const button = getByTestId('test-card-start-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('warning message', () => {
    it('shows warning message when provided', () => {
      const { getByTestId, getByText } = render(
        <SessionPreviewCard
          {...defaultProps}
          warningMessage="It's getting late - consider a shorter session"
          testID="test-card"
        />
      );

      expect(getByTestId('test-card-warning')).toBeTruthy();
      expect(getByText("It's getting late - consider a shorter session")).toBeTruthy();
    });

    it('does not show warning container when no warning message', () => {
      const { queryByTestId } = render(
        <SessionPreviewCard {...defaultProps} testID="test-card" />
      );

      expect(queryByTestId('test-card-warning')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has accessible stats container with proper label', () => {
      const { getByLabelText } = render(
        <SessionPreviewCard
          {...defaultProps}
          reviewCount={5}
          newConceptCount={2}
          estimatedMinutes={15}
          sessionType="standard"
          testID="test-card"
        />
      );

      const statsContainer = getByLabelText(/Standard session: 5 reviews, 2 new concepts/);
      expect(statsContainer).toBeTruthy();
    });

    it('includes warning in accessibility label when present', () => {
      const { getByLabelText } = render(
        <SessionPreviewCard
          {...defaultProps}
          warningMessage="Near bedtime"
          testID="test-card"
        />
      );

      const statsContainer = getByLabelText(/Warning: Near bedtime/);
      expect(statsContainer).toBeTruthy();
    });

    it('button has proper accessibility labels', () => {
      const { getByTestId } = render(
        <SessionPreviewCard {...defaultProps} testID="test-card" />
      );

      const button = getByTestId('test-card-start-button');
      expect(button.props.accessibilityLabel).toBe('Start learning session');
      expect(button.props.accessibilityHint).toContain('5 reviews');
      expect(button.props.accessibilityHint).toContain('2 new concepts');
    });
  });
});
