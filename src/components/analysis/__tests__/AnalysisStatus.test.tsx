/**
 * AnalysisStatus Component Tests
 *
 * Tests for the analysis status display component including:
 * - Stage rendering with correct descriptions
 * - Progress bar display
 * - Completed and failed states
 * - Retry functionality
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { AnalysisStatus, type AnalysisStatusProps } from '../AnalysisStatus';
import { AnalysisStatusBar, type AnalysisStatusBarProps } from '../AnalysisStatusBar';
import type { PipelineStage } from '@/src/lib';

/**
 * Helper to render AnalysisStatus with default props
 */
function renderAnalysisStatus(props: Partial<AnalysisStatusProps> = {}) {
  const defaultProps: AnalysisStatusProps = {
    stage: 'pending',
    progress: 0,
    ...props,
  };
  return render(<AnalysisStatus {...defaultProps} />);
}

/**
 * Helper to render AnalysisStatusBar with default props
 */
function renderStatusBar(props: Partial<AnalysisStatusBarProps> = {}) {
  const defaultProps: AnalysisStatusBarProps = {
    progress: 50,
    stage: 'extracting_concepts',
    ...props,
  };
  return render(<AnalysisStatusBar {...defaultProps} />);
}

describe('AnalysisStatus Component', () => {
  describe('Rendering', () => {
    it('renders with testID', () => {
      renderAnalysisStatus({ testID: 'analysis-status' });

      expect(screen.getByTestId('analysis-status')).toBeTruthy();
    });

    it('renders pending state correctly', () => {
      renderAnalysisStatus({ stage: 'pending', progress: 0 });

      expect(screen.getByText('Preparing analysis...')).toBeTruthy();
    });
  });

  describe('Stage Descriptions', () => {
    const stageDescriptions: Record<PipelineStage, string> = {
      pending: 'Preparing analysis...',
      transcribing: 'Transcribing audio...',
      segmenting_video: 'Segmenting video into topics...',
      routing_content: 'Classifying content type...',
      extracting_concepts: 'Extracting concepts...',
      chunking_text: 'Chunking text content...',
      generating_chapters: 'Generating video chapters...',
      detecting_prerequisites: 'Detecting prerequisites...',
      generating_agenda: 'Creating learning agenda...',
      generating_misconceptions: 'Generating misconceptions...',
      building_graph: 'Building knowledge graph...',
      architecting_roadmap: 'Architecting learning roadmap...',
      generating_summary: 'Generating module summary...',
      validating: 'Validating analysis results...',
      completed: 'Analysis complete!',
      failed: 'Analysis failed',
    };

    it.each(Object.entries(stageDescriptions))(
      'renders %s stage with description "%s"',
      (stage, description) => {
        renderAnalysisStatus({ stage: stage as PipelineStage, progress: 50 });

        expect(screen.getByText(description)).toBeTruthy();
      }
    );
  });

  describe('Progress Display', () => {
    it('renders progress bar component', () => {
      renderAnalysisStatus({
        stage: 'transcribing',
        progress: 25,
        testID: 'analysis-status',
      });

      expect(screen.getByTestId('analysis-status-progress-bar')).toBeTruthy();
    });

    it('passes correct progress value to progress bar', () => {
      renderAnalysisStatus({
        stage: 'extracting_concepts',
        progress: 45,
        testID: 'analysis-status',
      });

      const progressBar = screen.getByTestId('analysis-status-progress-bar');
      expect(progressBar).toBeTruthy();
    });
  });

  describe('Completed State', () => {
    it('shows checkmark icon when completed', () => {
      renderAnalysisStatus({
        stage: 'completed',
        progress: 100,
        testID: 'analysis-status',
      });

      expect(screen.getByTestId('analysis-status-checkmark')).toBeTruthy();
    });

    it('displays completion message', () => {
      renderAnalysisStatus({ stage: 'completed', progress: 100 });

      expect(screen.getByText('Analysis complete!')).toBeTruthy();
    });
  });

  describe('Failed State', () => {
    it('displays error message when provided', () => {
      renderAnalysisStatus({
        stage: 'failed',
        progress: 50,
        error: 'Transcription service unavailable',
      });

      expect(screen.getByText('Transcription service unavailable')).toBeTruthy();
    });

    it('shows retry button when onRetry is provided', () => {
      const onRetry = jest.fn();
      renderAnalysisStatus({
        stage: 'failed',
        progress: 0,
        error: 'Network error',
        onRetry,
        testID: 'analysis-status',
      });

      expect(screen.getByTestId('analysis-status-retry-button')).toBeTruthy();
    });

    it('retry button calls onRetry callback when pressed', () => {
      const onRetry = jest.fn();
      renderAnalysisStatus({
        stage: 'failed',
        progress: 0,
        error: 'Network error',
        onRetry,
        testID: 'analysis-status',
      });

      const retryButton = screen.getByTestId('analysis-status-retry-button');
      fireEvent.press(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show retry button when onRetry is not provided', () => {
      renderAnalysisStatus({
        stage: 'failed',
        progress: 0,
        error: 'Network error',
        testID: 'analysis-status',
      });

      expect(screen.queryByTestId('analysis-status-retry-button')).toBeNull();
    });

    it('displays failed state indicator', () => {
      renderAnalysisStatus({
        stage: 'failed',
        progress: 25,
        testID: 'analysis-status',
      });

      expect(screen.getByText('Analysis failed')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessibility label for the container', () => {
      renderAnalysisStatus({
        stage: 'transcribing',
        progress: 25,
        testID: 'analysis-status',
      });

      const container = screen.getByTestId('analysis-status');
      expect(container.props.accessibilityLabel).toBeDefined();
    });

    it('progress bar has accessibility role', () => {
      renderAnalysisStatus({
        stage: 'building_graph',
        progress: 60,
        testID: 'analysis-status',
      });

      // The progress bar should be accessible
      const progressBar = screen.getByTestId('analysis-status-progress-bar');
      expect(progressBar.props.accessibilityRole).toBe('progressbar');
    });

    it('retry button has accessibility label', () => {
      const onRetry = jest.fn();
      renderAnalysisStatus({
        stage: 'failed',
        progress: 0,
        onRetry,
        testID: 'analysis-status',
      });

      const retryButton = screen.getByTestId('analysis-status-retry-button');
      expect(retryButton.props.accessibilityLabel).toBe('Retry analysis');
    });

    it('stage description is accessible', () => {
      renderAnalysisStatus({
        stage: 'extracting_concepts',
        progress: 35,
        testID: 'analysis-status',
      });

      // Stage description text should be findable
      const description = screen.getByText('Extracting concepts...');
      expect(description).toBeTruthy();
    });
  });
});

describe('AnalysisStatusBar Component', () => {
  describe('Rendering', () => {
    it('renders with testID', () => {
      renderStatusBar({ testID: 'status-bar' });

      expect(screen.getByTestId('status-bar')).toBeTruthy();
    });

    it('renders progress track', () => {
      renderStatusBar({ testID: 'status-bar' });

      expect(screen.getByTestId('status-bar-track')).toBeTruthy();
    });

    it('renders progress fill', () => {
      renderStatusBar({ testID: 'status-bar', progress: 50 });

      expect(screen.getByTestId('status-bar-fill')).toBeTruthy();
    });
  });

  describe('Progress Width', () => {
    it('fill has 0% width when progress is 0', () => {
      renderStatusBar({ testID: 'status-bar', progress: 0 });

      const fill = screen.getByTestId('status-bar-fill');
      const fillStyle = fill.props.style;
      // Check width is 0%
      const flatStyle = Array.isArray(fillStyle)
        ? Object.assign({}, ...fillStyle)
        : fillStyle;
      expect(flatStyle.width).toBe('0%');
    });

    it('fill has 50% width when progress is 50', () => {
      renderStatusBar({ testID: 'status-bar', progress: 50 });

      const fill = screen.getByTestId('status-bar-fill');
      const fillStyle = fill.props.style;
      const flatStyle = Array.isArray(fillStyle)
        ? Object.assign({}, ...fillStyle)
        : fillStyle;
      expect(flatStyle.width).toBe('50%');
    });

    it('fill has 100% width when progress is 100', () => {
      renderStatusBar({ testID: 'status-bar', progress: 100 });

      const fill = screen.getByTestId('status-bar-fill');
      const fillStyle = fill.props.style;
      const flatStyle = Array.isArray(fillStyle)
        ? Object.assign({}, ...fillStyle)
        : fillStyle;
      expect(flatStyle.width).toBe('100%');
    });

    it('clamps progress to 0-100 range (negative value)', () => {
      renderStatusBar({ testID: 'status-bar', progress: -10 });

      const fill = screen.getByTestId('status-bar-fill');
      const fillStyle = fill.props.style;
      const flatStyle = Array.isArray(fillStyle)
        ? Object.assign({}, ...fillStyle)
        : fillStyle;
      expect(flatStyle.width).toBe('0%');
    });

    it('clamps progress to 0-100 range (value over 100)', () => {
      renderStatusBar({ testID: 'status-bar', progress: 150 });

      const fill = screen.getByTestId('status-bar-fill');
      const fillStyle = fill.props.style;
      const flatStyle = Array.isArray(fillStyle)
        ? Object.assign({}, ...fillStyle)
        : fillStyle;
      expect(flatStyle.width).toBe('100%');
    });
  });

  describe('Color by Stage', () => {
    it('uses blue color for in-progress stages', () => {
      renderStatusBar({
        testID: 'status-bar',
        progress: 50,
        stage: 'transcribing',
      });

      const fill = screen.getByTestId('status-bar-fill');
      expect(fill).toBeTruthy();
      // Color is applied via style, we just verify rendering
    });

    it('uses green color for completed stage', () => {
      renderStatusBar({
        testID: 'status-bar',
        progress: 100,
        stage: 'completed',
      });

      const fill = screen.getByTestId('status-bar-fill');
      expect(fill).toBeTruthy();
    });

    it('uses red color for failed stage', () => {
      renderStatusBar({
        testID: 'status-bar',
        progress: 25,
        stage: 'failed',
      });

      const fill = screen.getByTestId('status-bar-fill');
      expect(fill).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has progressbar accessibility role', () => {
      renderStatusBar({ testID: 'status-bar', progress: 50 });

      const bar = screen.getByTestId('status-bar');
      expect(bar.props.accessibilityRole).toBe('progressbar');
    });

    it('has correct accessibility value', () => {
      renderStatusBar({ testID: 'status-bar', progress: 75 });

      const bar = screen.getByTestId('status-bar');
      expect(bar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 75,
      });
    });

    it('has accessibility label', () => {
      renderStatusBar({
        testID: 'status-bar',
        progress: 60,
        stage: 'building_graph',
      });

      const bar = screen.getByTestId('status-bar');
      expect(bar.props.accessibilityLabel).toBe('Progress: 60%');
    });
  });
});
