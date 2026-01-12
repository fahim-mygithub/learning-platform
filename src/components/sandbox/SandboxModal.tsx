/**
 * SandboxModal Component
 *
 * Full-screen modal for interactive sandbox interactions.
 * Opens when user taps "Start Interaction" from a SandboxPreviewCard in the feed.
 *
 * Features:
 * - Full-screen presentation (cognitive mode separation from feed)
 * - Header: Close button, timer, hint button
 * - Body: Canvas area for drag-drop interactions
 * - Footer: Submit button
 * - Timer tracking for FSRS rating derivation
 * - Hint system with usage tracking
 *
 * @see openspec/changes/add-interactive-sandbox/proposal.md
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  AppState,
  Alert,
  type AppStateStatus,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { evaluateSandboxInteraction } from '../../lib/sandbox-evaluation-service';
import { spacing } from '../../theme';
import { useTypography } from '../../lib/typography-context';
import { type ColorTheme } from '../../theme/colors';
import type {
  SandboxInteraction,
  SandboxEvaluationResult,
  ScaffoldLevel,
} from '../../types/sandbox';

/**
 * Props for SandboxModal
 */
export interface SandboxModalProps {
  /** Controls modal visibility */
  visible: boolean;

  /** Sandbox interaction to display */
  interaction: SandboxInteraction | null;

  /** Called when user closes modal (X button or back) */
  onClose: () => void;

  /** Called after exit animation completes (modal fully hidden) */
  onHidden?: () => void;

  /** Called when user submits their answer */
  onSubmit: (result: Omit<SandboxEvaluationResult, 'feedback'>) => void;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Format milliseconds as MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * SandboxModal Component
 *
 * Full-screen modal for interactive learning activities.
 * Separates cognitive mode (System 2 deep processing) from feed (System 1 quick consumption).
 */
export function SandboxModal({
  visible,
  interaction,
  onClose,
  onHidden,
  onSubmit,
  testID = 'sandbox-modal',
}: SandboxModalProps): React.ReactElement {
  // Typography context for theming
  const { getColors } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Timer state - useRef for accurate timing that survives backgrounding
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Hint state
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [currentHintIndex, setCurrentHintIndex] = useState<number>(-1);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Attempt state
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Canvas state (will be populated by child interaction components)
  const [canvasState, setCanvasState] = useState<Record<string, string[]>>({});

  // Reset state when interaction changes
  useEffect(() => {
    if (visible && interaction) {
      console.log('[SandboxModal] Opening:', interaction.interactionId);
      setElapsedMs(0);
      setHintsUsed(0);
      setCurrentHintIndex(-1);
      setShowHint(false);
      setAttemptCount(0);
      setCanvasState({});
    }
  }, [visible, interaction?.interactionId]);

  /**
   * Reset timer when a new interaction starts
   */
  useEffect(() => {
    if (interaction) {
      startTimeRef.current = Date.now();
      pausedAtRef.current = 0;
      console.log('[SandboxModal] Timer reset for new interaction:', interaction.interactionId);
    }
  }, [interaction?.interactionId]);

  /**
   * Handle app backgrounding - pause timer to prevent unfair time tracking
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - record pause time
        pausedAtRef.current = Date.now();
        console.log('[SandboxModal] Timer paused (app backgrounded)');
      } else if (nextAppState === 'active' && pausedAtRef.current > 0) {
        // App returning - adjust start time to exclude paused duration
        const pausedDuration = Date.now() - pausedAtRef.current;
        startTimeRef.current += pausedDuration;
        pausedAtRef.current = 0;
        console.log('[SandboxModal] Timer resumed, excluded:', pausedDuration, 'ms');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  /**
   * Handle hint request
   */
  const handleHintRequest = useCallback(() => {
    if (!interaction) return;

    const nextIndex = currentHintIndex + 1;
    if (nextIndex < interaction.hints.length) {
      console.log('[SandboxModal] Hint requested:', hintsUsed + 1);
      setCurrentHintIndex(nextIndex);
      setHintsUsed((prev) => prev + 1);
      setShowHint(true);
    }
  }, [interaction, currentHintIndex, hintsUsed]);

  /**
   * Handle close modal
   */
  const handleClose = useCallback(() => {
    console.log('[SandboxModal] Closing:', interaction?.interactionId);
    onClose();
  }, [interaction?.interactionId, onClose]);

  /**
   * Handle submit
   */
  const handleSubmit = useCallback(() => {
    if (!interaction) return;

    const timeToCompleteMs = Date.now() - startTimeRef.current;

    try {
      console.log('[SandboxModal] Evaluating submission...');
      const result = evaluateSandboxInteraction(interaction, canvasState, attemptCount + 1, hintsUsed, timeToCompleteMs);

      console.log('[SandboxModal] Evaluation result:', {
        score: result.score,
        passed: result.passed,
        timeToCompleteMs,
      });

      setAttemptCount((prev) => prev + 1);
      onSubmit({
        interactionId: interaction.interactionId,
        conceptId: interaction.conceptId,
        score: result.score,
        passed: result.passed,
        attemptCount: attemptCount + 1,
        hintsUsed,
        timeToCompleteMs,
      });
    } catch (error) {
      console.error('[SandboxModal] Evaluation error:', error);
      Alert.alert(
        'Evaluation Error',
        'Could not evaluate your answer. Please try again.',
        [{ text: 'OK' }]
      );

      // Submit failure result so user can proceed
      setAttemptCount((prev) => prev + 1);
      onSubmit({
        interactionId: interaction.interactionId,
        conceptId: interaction.conceptId,
        score: 0,
        passed: false,
        attemptCount: attemptCount + 1,
        hintsUsed,
        timeToCompleteMs,
      });
    }
  }, [interaction, canvasState, hintsUsed, attemptCount, onSubmit]);

  /**
   * Get scaffold level label
   */
  const getScaffoldLabel = (level: ScaffoldLevel): string => {
    switch (level) {
      case 'worked':
        return 'Guided';
      case 'scaffold':
        return 'Assisted';
      case 'faded':
        return 'Practice';
    }
  };

  if (!interaction) {
    return <></>;
  }

  const hasMoreHints = currentHintIndex < interaction.hints.length - 1;

  return (
    <Modal
      testID={testID}
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      onDismiss={onHidden}  // Called after modal fully closes
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {/* Close button */}
          <Pressable
            testID="sandbox-close-button"
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityLabel="Close interaction"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>{'\u00D7'}</Text>
          </Pressable>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerText} testID="sandbox-timer">
              {formatTime(elapsedMs)}
            </Text>
          </View>

          {/* Scaffold level badge */}
          <View style={styles.scaffoldBadge}>
            <Text style={styles.scaffoldText}>
              {getScaffoldLabel(interaction.scaffoldLevel)}
            </Text>
          </View>

          {/* Hint button */}
          <Pressable
            testID="sandbox-hint-button"
            style={[styles.hintButton, !hasMoreHints && styles.hintButtonDisabled]}
            onPress={handleHintRequest}
            disabled={!hasMoreHints}
            accessibilityLabel={hasMoreHints ? 'Get hint' : 'No more hints'}
            accessibilityRole="button"
          >
            <Text style={[styles.hintButtonText, !hasMoreHints && styles.hintButtonTextDisabled]}>
              Hint ({interaction.hints.length - hintsUsed})
            </Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>{interaction.instructions}</Text>
        </View>

        {/* Hint display */}
        {showHint && currentHintIndex >= 0 && (
          <View style={styles.hintDisplay}>
            <Text style={styles.hintLabel}>Hint {currentHintIndex + 1}:</Text>
            <Text style={styles.hintText}>{interaction.hints[currentHintIndex]}</Text>
            <Pressable
              style={styles.hintDismiss}
              onPress={() => setShowHint(false)}
            >
              <Text style={styles.hintDismissText}>Got it</Text>
            </Pressable>
          </View>
        )}

        {/* Canvas area - children will be rendered here */}
        <View
          style={[
            styles.canvasArea,
            {
              backgroundColor: interaction.canvasConfig.backgroundColor,
            },
          ]}
          testID="sandbox-canvas"
        >
          {/* Child interaction component will render here */}
          <Text style={styles.placeholderText}>
            {interaction.interactionType.replace('_', ' ').toUpperCase()} Interaction
          </Text>
          <Text style={styles.placeholderSubtext}>
            {interaction.elements.length} elements
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            testID="sandbox-submit-button"
            style={styles.submitButton}
            onPress={handleSubmit}
            accessibilityLabel="Submit answer"
            accessibilityRole="button"
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </Pressable>

          {attemptCount > 0 && (
            <Text style={styles.attemptText}>
              Attempt {attemptCount}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Create styles based on theme colors
 */
function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,

    // Header styles
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,

    closeButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,

    closeButtonText: {
      fontSize: 32,
      color: colors.textSecondary,
      lineHeight: 32,
    } as TextStyle,

    timerContainer: {
      flex: 1,
      alignItems: 'center',
    } as ViewStyle,

    timerText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    } as TextStyle,

    scaffoldBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      borderRadius: 4,
      marginRight: spacing[2],
    } as ViewStyle,

    scaffoldText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    } as TextStyle,

    hintButton: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      backgroundColor: colors.primary,
      borderRadius: 8,
    } as ViewStyle,

    hintButtonDisabled: {
      backgroundColor: colors.border,
    } as ViewStyle,

    hintButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.white,
    } as TextStyle,

    hintButtonTextDisabled: {
      color: colors.textSecondary,
    } as TextStyle,

    // Instructions styles
    instructionsContainer: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      backgroundColor: colors.backgroundSecondary,
    } as ViewStyle,

    instructionsText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    } as TextStyle,

    // Hint display styles
    hintDisplay: {
      marginHorizontal: spacing[4],
      marginVertical: spacing[2],
      padding: spacing[3],
      backgroundColor: colors.warning + '20',
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    } as ViewStyle,

    hintLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.warning,
      marginBottom: spacing[1],
    } as TextStyle,

    hintText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    } as TextStyle,

    hintDismiss: {
      marginTop: spacing[2],
      alignSelf: 'flex-end',
    } as ViewStyle,

    hintDismissText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary,
    } as TextStyle,

    // Canvas area styles
    canvasArea: {
      flex: 1,
      marginHorizontal: spacing[4],
      marginVertical: spacing[3],
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,

    placeholderText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
      opacity: 0.7,
    } as TextStyle,

    placeholderSubtext: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.5,
      marginTop: spacing[1],
    } as TextStyle,

    // Footer styles
    footer: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    } as ViewStyle,

    submitButton: {
      width: '100%',
      paddingVertical: spacing[4],
      backgroundColor: colors.primary,
      borderRadius: 12,
      alignItems: 'center',
    } as ViewStyle,

    submitButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.white,
    } as TextStyle,

    attemptText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing[2],
    } as TextStyle,
  });
}

export default SandboxModal;
