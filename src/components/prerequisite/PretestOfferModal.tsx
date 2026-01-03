/**
 * PretestOfferModal Component
 *
 * A modal that appears when a user starts a learning session and prerequisites exist.
 * Offers the user a choice to:
 * - Take a quick knowledge check (pretest)
 * - Skip the pretest and proceed directly to learning
 *
 * Features:
 * - Shows count of prerequisites to be assessed
 * - Clear call-to-action buttons
 * - Accessible with proper ARIA roles
 * - Mobile-first design with 56px touch targets
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { Modal, Button } from '../ui';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

/**
 * Props for the PretestOfferModal component
 */
export interface PretestOfferModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Number of prerequisites to assess */
  prerequisiteCount: number;
  /** Callback when user chooses to take the pretest */
  onTakePretest: () => void;
  /** Callback when user chooses to skip the pretest */
  onSkip: () => void;
  /** Callback to close the modal (same as onSkip by default) */
  onClose?: () => void;
  /** Whether the pretest is currently loading */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Estimate time to complete pretest (roughly 30 seconds per question)
 */
function estimateTime(count: number): string {
  const minutes = Math.ceil((count * 30) / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/**
 * PretestOfferModal Component
 *
 * @example
 * ```tsx
 * <PretestOfferModal
 *   visible={showModal}
 *   prerequisiteCount={3}
 *   onTakePretest={() => startPretest()}
 *   onSkip={() => skipToLearning()}
 * />
 * ```
 */
export function PretestOfferModal({
  visible,
  prerequisiteCount,
  onTakePretest,
  onSkip,
  onClose,
  isLoading = false,
  testID = 'pretest-offer-modal',
}: PretestOfferModalProps): React.ReactElement {
  const handleClose = onClose ?? onSkip;
  const estimatedTime = estimateTime(prerequisiteCount);

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Quick Knowledge Check"
      testID={testID}
      closeOnBackdrop={false}
      actions={
        <View style={styles.actions}>
          <Button
            testID={`${testID}-skip-button`}
            variant="outline"
            size="large"
            onPress={onSkip}
            disabled={isLoading}
            accessibilityLabel="Skip knowledge check"
            accessibilityHint="Proceed directly to the learning session"
          >
            Skip
          </Button>
          <Button
            testID={`${testID}-take-button`}
            variant="primary"
            size="large"
            onPress={onTakePretest}
            loading={isLoading}
            accessibilityLabel="Take quick check"
            accessibilityHint={`Start a ${estimatedTime} knowledge check`}
          >
            Take Quick Check
          </Button>
        </View>
      }
    >
      <View
        testID={`${testID}-content`}
        accessible={true}
        accessibilityLabel={`This content has ${prerequisiteCount} prerequisite topics. We recommend a quick check taking about ${estimatedTime}.`}
      >
        {/* Icon/Illustration placeholder */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>?</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          This content builds on{' '}
          <Text style={styles.highlight}>{prerequisiteCount} prerequisite topic{prerequisiteCount !== 1 ? 's' : ''}</Text>
          {'. '}
          A quick check can help identify any gaps in your knowledge.
        </Text>

        {/* Time estimate */}
        <View style={styles.timeEstimate}>
          <Text style={styles.timeIcon}>{'~'}</Text>
          <Text style={styles.timeText}>{estimatedTime}</Text>
        </View>

        {/* Benefits list */}
        <View style={styles.benefitsList}>
          <BenefitItem text="Personalized learning path" />
          <BenefitItem text="Fill knowledge gaps first" />
          <BenefitItem text="Better understanding of content" />
        </View>
      </View>
    </Modal>
  );
}

/**
 * BenefitItem Component
 * Displays a single benefit with a checkmark
 */
function BenefitItem({ text }: { text: string }): React.ReactElement {
  return (
    <View style={styles.benefitItem}>
      <Text style={styles.checkmark}>{'check'[0].toUpperCase()}</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  } as ViewStyle,
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  } as TextStyle,
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.5,
    textAlign: 'center',
    marginBottom: spacing[3],
  } as TextStyle,
  highlight: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  } as TextStyle,
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    alignSelf: 'center',
  } as ViewStyle,
  timeIcon: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing[1],
  } as TextStyle,
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  } as TextStyle,
  benefitsList: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing[2],
  } as ViewStyle,
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  } as ViewStyle,
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    color: colors.white,
    fontSize: 12,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: spacing[2],
    overflow: 'hidden',
  } as TextStyle,
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  } as ViewStyle,
});

export default PretestOfferModal;
