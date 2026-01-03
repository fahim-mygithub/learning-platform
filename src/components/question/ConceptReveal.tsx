/**
 * ConceptReveal Component
 *
 * A component that displays concept explanation after the user answers a question.
 * Shows:
 * - Correct/Incorrect banner (green/red)
 * - Concept name and definition
 * - Pedagogical notes section ("Why this matters")
 * - Misconception section (conditional, only if misconception triggered)
 * - Continue button
 *
 * Used in the Question-First learning flow to reveal concept details
 * after the user has attempted a question.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, lineHeight } from '../../theme';
import { Card } from '../ui';
import { Button } from '../ui/Button';

/**
 * Props for the ConceptReveal component
 */
export interface ConceptRevealProps {
  /** Whether the user's answer was correct */
  isCorrect: boolean;
  /** Name of the concept being revealed */
  conceptName: string;
  /** Full definition of the concept */
  definition: string;
  /** Optional pedagogical notes explaining why this matters */
  pedagogicalNotes?: string;
  /** Optional misconception text, shown when user triggered a misconception */
  misconception?: string;
  /** Callback when user clicks Continue */
  onContinue: () => void;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * ResultBanner Component
 *
 * Displays the correct/incorrect result at the top
 */
function ResultBanner({
  isCorrect,
  testID,
}: {
  isCorrect: boolean;
  testID?: string;
}): React.ReactElement {
  const bannerStyle = isCorrect ? styles.bannerCorrect : styles.bannerIncorrect;
  const icon = isCorrect ? '\u2713' : '\u2717'; // checkmark or X
  const text = isCorrect ? 'Correct!' : 'Not quite';
  const accessibilityLabel = isCorrect
    ? 'Correct answer'
    : 'Incorrect answer';

  return (
    <View
      testID={testID}
      style={[styles.banner, bannerStyle]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <Text style={styles.bannerIcon}>{icon}</Text>
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

/**
 * Section Component
 *
 * A reusable section with icon and title
 */
function Section({
  icon,
  title,
  content,
  testID,
  variant = 'default',
}: {
  icon: string;
  title: string;
  content: string;
  testID?: string;
  variant?: 'default' | 'warning';
}): React.ReactElement {
  const containerStyle =
    variant === 'warning' ? styles.sectionWarning : styles.section;

  return (
    <View testID={testID} style={containerStyle}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text
          style={[
            styles.sectionTitle,
            variant === 'warning' && styles.sectionTitleWarning,
          ]}
        >
          {title}
        </Text>
      </View>
      <Text
        style={[
          styles.sectionContent,
          variant === 'warning' && styles.sectionContentWarning,
        ]}
      >
        {content}
      </Text>
    </View>
  );
}

/**
 * ConceptReveal Component
 *
 * @example
 * ```tsx
 * <ConceptReveal
 *   isCorrect={true}
 *   conceptName="React Hooks"
 *   definition="Hooks are functions that let you use state and lifecycle features in functional components."
 *   pedagogicalNotes="Understanding hooks is crucial for modern React development."
 *   onContinue={handleContinue}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With misconception (shown when user gets it wrong)
 * <ConceptReveal
 *   isCorrect={false}
 *   conceptName="React Hooks"
 *   definition="Hooks are functions that let you use state and lifecycle features in functional components."
 *   misconception="Hooks can only be used at the top level of a component, not inside loops or conditions."
 *   onContinue={handleContinue}
 * />
 * ```
 */
export function ConceptReveal({
  isCorrect,
  conceptName,
  definition,
  pedagogicalNotes,
  misconception,
  onContinue,
  testID = 'concept-reveal',
}: ConceptRevealProps): React.ReactElement {
  const accessibilityLabel = `${isCorrect ? 'Correct' : 'Incorrect'}. Concept: ${conceptName}. ${definition}`;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <Card style={styles.card}>
        {/* Result Banner */}
        <ResultBanner isCorrect={isCorrect} testID={`${testID}-banner`} />

        {/* Concept Name and Definition */}
        <View style={styles.conceptSection}>
          <View style={styles.conceptHeader}>
            <Text style={styles.conceptIcon}>{'\uD83D\uDCDA'}</Text>
            <Text testID={`${testID}-concept-name`} style={styles.conceptName}>
              {conceptName}
            </Text>
          </View>
          <View style={styles.divider} />
          <Text testID={`${testID}-definition`} style={styles.definition}>
            {definition}
          </Text>
        </View>

        {/* Pedagogical Notes (optional) */}
        {pedagogicalNotes && (
          <Section
            icon={'\uD83D\uDCA1'}
            title="Why this matters"
            content={pedagogicalNotes}
            testID={`${testID}-pedagogical-notes`}
          />
        )}

        {/* Misconception Warning (optional) */}
        {misconception && (
          <Section
            icon={'\u26A0\uFE0F'}
            title="Watch out for"
            content={misconception}
            testID={`${testID}-misconception`}
            variant="warning"
          />
        )}

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            testID={`${testID}-continue-button`}
            onPress={onContinue}
            accessibilityLabel="Continue to next question"
            accessibilityHint="Double tap to proceed"
          >
            Continue
          </Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  // Banner styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  bannerCorrect: {
    backgroundColor: colors.success,
  },
  bannerIncorrect: {
    backgroundColor: colors.error,
  },
  bannerIcon: {
    fontSize: fontSize.xl,
    color: colors.white,
    marginRight: spacing[2],
  },
  bannerText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  // Concept section styles
  conceptSection: {
    padding: spacing[4],
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  conceptIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing[2],
  },
  conceptName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing[3],
  },
  definition: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    color: colors.text,
    lineHeight: fontSize.base * lineHeight.relaxed,
  },
  // Section styles
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  sectionWarning: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: '#FEF3C7', // amber-100 for warning background
    borderRadius: 8,
    paddingTop: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionIcon: {
    fontSize: fontSize.base,
    marginRight: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  sectionTitleWarning: {
    color: '#92400E', // amber-800 for warning text
  },
  sectionContent: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  sectionContentWarning: {
    color: '#92400E', // amber-800 for warning text
  },
  // Button container styles
  buttonContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
    alignItems: 'center',
  },
});

export default ConceptReveal;
