/**
 * SessionBreakModal Component
 *
 * Modal suggesting a break after 30 minutes of learning.
 * Shows session statistics and offers options to continue or take a break.
 *
 * @example
 * ```tsx
 * <SessionBreakModal
 *   visible={shouldShowBreak}
 *   sessionStats={{
 *     elapsedMinutes: 32,
 *     cardsCompleted: 15,
 *     xpEarned: 245,
 *     correctAnswers: 12,
 *     totalAnswers: 14,
 *   }}
 *   onContinue={() => setBreakShown(true)}
 *   onTakeBreak={() => handleBreak()}
 * />
 * ```
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { colors, spacing } from '@/src/theme';
import { haptics } from '@/src/lib/haptic-feedback';

/**
 * Session statistics
 */
export interface SessionStats {
  /** Minutes elapsed in the session */
  elapsedMinutes: number;
  /** Number of cards completed */
  cardsCompleted: number;
  /** Total XP earned in the session */
  xpEarned: number;
  /** Number of correct quiz answers */
  correctAnswers: number;
  /** Total quiz answers attempted */
  totalAnswers: number;
  /** Number of syntheses completed */
  synthesisCount?: number;
  /** Current streak count */
  currentStreak?: number;
}

/**
 * Props for the SessionBreakModal component
 */
export interface SessionBreakModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Session statistics to display */
  sessionStats: SessionStats;
  /** Called when user chooses to continue */
  onContinue: () => void;
  /** Called when user chooses to take a break */
  onTakeBreak: () => void;
  /** Suggested break duration in minutes */
  suggestedBreakMinutes?: number;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * Default suggested break duration
 */
const DEFAULT_BREAK_MINUTES = 5;

/**
 * SessionBreakModal Component
 *
 * Encourages healthy learning habits by suggesting breaks.
 */
export function SessionBreakModal({
  visible,
  sessionStats,
  onContinue,
  onTakeBreak,
  suggestedBreakMinutes = DEFAULT_BREAK_MINUTES,
  testID = 'session-break-modal',
}: SessionBreakModalProps): React.ReactElement {
  /**
   * Handle continue with haptic
   */
  const handleContinue = useCallback(async () => {
    await haptics.light();
    onContinue();
  }, [onContinue]);

  /**
   * Handle take break with haptic
   */
  const handleTakeBreak = useCallback(async () => {
    await haptics.success();
    onTakeBreak();
  }, [onTakeBreak]);

  /**
   * Calculate accuracy percentage
   */
  const accuracy = sessionStats.totalAnswers > 0
    ? Math.round((sessionStats.correctAnswers / sessionStats.totalAnswers) * 100)
    : 0;

  /**
   * Get encouragement message based on performance
   */
  const encouragement = getEncouragementMessage(sessionStats);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleContinue}
      testID={testID}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <Animated.View
          entering={SlideInUp.springify().damping(15)}
          exiting={SlideOutDown}
          style={styles.modalContainer}
          testID={`${testID}-content`}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>&#9749;</Text>
            </View>
            <Text style={styles.title}>Time for a Break?</Text>
            <Text style={styles.subtitle}>
              You've been learning for {sessionStats.elapsedMinutes} minutes
            </Text>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatItem
              label="Cards"
              value={sessionStats.cardsCompleted.toString()}
              icon="&#128195;"
              testID={`${testID}-stat-cards`}
            />
            <StatItem
              label="XP Earned"
              value={`+${sessionStats.xpEarned}`}
              icon="&#9733;"
              color={colors.xpGold}
              testID={`${testID}-stat-xp`}
            />
            <StatItem
              label="Accuracy"
              value={`${accuracy}%`}
              icon="&#10003;"
              color={accuracy >= 80 ? colors.success : colors.warning}
              testID={`${testID}-stat-accuracy`}
            />
            {sessionStats.synthesisCount !== undefined && sessionStats.synthesisCount > 0 && (
              <StatItem
                label="Syntheses"
                value={sessionStats.synthesisCount.toString()}
                icon="&#129504;"
                color={colors.secondary}
                testID={`${testID}-stat-synthesis`}
              />
            )}
          </View>

          {/* Encouragement message */}
          <View style={styles.encouragementContainer}>
            <Text style={styles.encouragement}>{encouragement}</Text>
          </View>

          {/* Break suggestion */}
          <View style={styles.breakSuggestion}>
            <Text style={styles.breakText}>
              A {suggestedBreakMinutes}-minute break can help consolidate your learning.
              Your brain needs time to process new information!
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              testID={`${testID}-continue`}
              style={styles.continueButton}
              onPress={handleContinue}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Continue learning"
            >
              <Text style={styles.continueButtonText}>Keep Going</Text>
            </Pressable>

            <Pressable
              testID={`${testID}-break`}
              style={styles.breakButton}
              onPress={handleTakeBreak}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Take a break"
            >
              <Text style={styles.breakButtonText}>Take a Break</Text>
            </Pressable>
          </View>

          {/* Quick tip */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipIcon}>&#128161;</Text>
            <Text style={styles.tipText}>
              Pro tip: Stand up, stretch, or take a short walk!
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * StatItem Component
 */
interface StatItemProps {
  label: string;
  value: string;
  icon: string;
  color?: string;
  testID?: string;
}

function StatItem({
  label,
  value,
  icon,
  color = colors.primary,
  testID,
}: StatItemProps): React.ReactElement {
  return (
    <View style={styles.statItem} testID={testID}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Get encouragement message based on session performance
 */
function getEncouragementMessage(stats: SessionStats): string {
  const accuracy = stats.totalAnswers > 0
    ? (stats.correctAnswers / stats.totalAnswers) * 100
    : 0;

  if (stats.xpEarned >= 200) {
    return "You're on fire! Incredible learning session!";
  }

  if (accuracy >= 90 && stats.totalAnswers >= 5) {
    return "Amazing accuracy! You're mastering this material!";
  }

  if (stats.cardsCompleted >= 15) {
    return "Great progress! You've covered a lot of ground!";
  }

  if (stats.synthesisCount && stats.synthesisCount >= 2) {
    return "Excellent synthesis work! You're building deep connections!";
  }

  if (accuracy >= 70) {
    return "Nice work! Your understanding is growing!";
  }

  return "Keep up the great effort! Every step counts!";
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: spacing[6],
    maxWidth: 400,
    width: '100%',
    // Shadow
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginBottom: spacing[5],
  } as ViewStyle,
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  } as ViewStyle,
  icon: {
    fontSize: 36,
  } as TextStyle,
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
  } as TextStyle,
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  } as TextStyle,
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[5],
  } as ViewStyle,
  statItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing[3],
    minWidth: 80,
  } as ViewStyle,
  statIcon: {
    fontSize: 20,
    marginBottom: spacing[1],
  } as TextStyle,
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  } as TextStyle,
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  } as TextStyle,
  encouragementContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  } as ViewStyle,
  encouragement: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  } as TextStyle,
  breakSuggestion: {
    backgroundColor: colors.info + '10',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[5],
  } as ViewStyle,
  breakText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  } as TextStyle,
  actionsContainer: {
    gap: spacing[3],
    marginBottom: spacing[4],
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  } as ViewStyle,
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  } as TextStyle,
  breakButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing[4],
    alignItems: 'center',
  } as ViewStyle,
  breakButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  } as TextStyle,
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  } as ViewStyle,
  tipIcon: {
    fontSize: 14,
    marginRight: spacing[2],
  } as TextStyle,
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
  } as TextStyle,
});

export default SessionBreakModal;
