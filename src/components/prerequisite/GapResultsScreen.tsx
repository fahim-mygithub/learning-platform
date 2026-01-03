/**
 * GapResultsScreen Component
 *
 * A screen component that displays the results of the prerequisite pretest.
 * Shows the user's score, identified knowledge gaps, and offers remediation options.
 *
 * Features:
 * - Visual score indicator
 * - List of knowledge gaps with "Learn Now" buttons
 * - Clear recommendation based on score
 * - "Continue Anyway" option
 * - Mobile-first design with 56px touch targets
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { Button, Card, Progress } from '../ui';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import type { Prerequisite } from '../../types/prerequisite';
import type { GapRecommendation, GapAnalysisResult } from '../../lib/prerequisite-assessment-service';

/**
 * Props for the GapResultsScreen component
 */
export interface GapResultsScreenProps {
  /** Gap analysis result from pretest */
  gapAnalysis: GapAnalysisResult;
  /** Set of completed mini-lesson prerequisite IDs */
  completedMiniLessons: Set<string>;
  /** Callback when user wants to learn a specific gap */
  onLearnGap: (prerequisiteId: string) => void;
  /** Callback when user wants to continue to learning */
  onContinue: () => void;
  /** Whether any operation is loading */
  isLoading?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Get display info for recommendation level
 */
function getRecommendationInfo(recommendation: GapRecommendation): {
  title: string;
  description: string;
  color: string;
} {
  switch (recommendation) {
    case 'proceed':
      return {
        title: 'Great job!',
        description: 'You have a solid foundation for this content.',
        color: colors.success,
      };
    case 'review_suggested':
      return {
        title: 'Almost there!',
        description: 'We recommend reviewing a few topics before continuing.',
        color: colors.warning,
      };
    case 'review_required':
      return {
        title: 'Let\'s build your foundation',
        description: 'Reviewing these topics will help you understand the content better.',
        color: colors.error,
      };
  }
}

/**
 * GapResultsScreen Component
 *
 * @example
 * ```tsx
 * <GapResultsScreen
 *   gapAnalysis={analysis}
 *   completedMiniLessons={completed}
 *   onLearnGap={(id) => startMiniLesson(id)}
 *   onContinue={() => proceedToLearning()}
 * />
 * ```
 */
export function GapResultsScreen({
  gapAnalysis,
  completedMiniLessons,
  onLearnGap,
  onContinue,
  isLoading = false,
  testID = 'gap-results-screen',
}: GapResultsScreenProps): React.ReactElement {
  const { totalPrerequisites, correct, percentage, gaps, recommendation } = gapAnalysis;
  const recommendationInfo = getRecommendationInfo(recommendation);
  const hasGaps = gaps.length > 0;
  const allGapsAddressed = hasGaps && gaps.every((g) => completedMiniLessons.has(g.id));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
    >
      {/* Header with score */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Results</Text>
      </View>

      {/* Score circle */}
      <View style={styles.scoreContainer}>
        <Progress
          variant="circle"
          value={percentage}
          size={120}
          showLabel
          color={recommendationInfo.color}
          testID={`${testID}-score`}
          accessibilityLabel={`Score: ${percentage}%`}
        />
        <Text style={styles.scoreLabel}>
          {correct} of {totalPrerequisites} correct
        </Text>
      </View>

      {/* Recommendation card */}
      <Card
        style={[
          styles.recommendationCard,
          { borderColor: recommendationInfo.color },
        ]}
      >
        <View
          style={[
            styles.recommendationBadge,
            { backgroundColor: recommendationInfo.color },
          ]}
        >
          <Text style={styles.recommendationBadgeText}>
            {recommendation === 'proceed'
              ? 'V'
              : recommendation === 'review_suggested'
              ? '!'
              : '!!'}
          </Text>
        </View>
        <Text
          style={[styles.recommendationTitle, { color: recommendationInfo.color }]}
          testID={`${testID}-recommendation-title`}
        >
          {recommendationInfo.title}
        </Text>
        <Text style={styles.recommendationDescription}>
          {recommendationInfo.description}
        </Text>
      </Card>

      {/* Gaps list */}
      {hasGaps && (
        <View style={styles.gapsSection}>
          <Text style={styles.sectionTitle}>Knowledge Gaps ({gaps.length})</Text>
          <Text style={styles.sectionDescription}>
            {allGapsAddressed
              ? 'You\'ve reviewed all gaps. Ready to continue!'
              : 'Tap "Learn" to review a topic before continuing.'}
          </Text>

          {gaps.map((gap) => {
            const isCompleted = completedMiniLessons.has(gap.id);
            return (
              <GapItem
                key={gap.id}
                prerequisite={gap}
                isCompleted={isCompleted}
                onLearn={() => onLearnGap(gap.id)}
                testID={`${testID}-gap-${gap.id}`}
              />
            );
          })}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <Button
          onPress={onContinue}
          variant={hasGaps && !allGapsAddressed ? 'outline' : 'primary'}
          size="large"
          loading={isLoading}
          testID={`${testID}-continue-button`}
          accessibilityLabel={
            hasGaps && !allGapsAddressed
              ? 'Continue anyway'
              : 'Continue to learning'
          }
        >
          {hasGaps && !allGapsAddressed ? 'Continue Anyway' : 'Start Learning'}
        </Button>

        {hasGaps && !allGapsAddressed && (
          <Text style={styles.warningText}>
            You may find some concepts harder to understand without reviewing the gaps.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * GapItem Component
 * Displays a single knowledge gap with learn button
 */
interface GapItemProps {
  prerequisite: Prerequisite;
  isCompleted: boolean;
  onLearn: () => void;
  testID?: string;
}

function GapItem({
  prerequisite,
  isCompleted,
  onLearn,
  testID,
}: GapItemProps): React.ReactElement {
  return (
    <Pressable
      style={[styles.gapItem, isCompleted && styles.gapItemCompleted]}
      onPress={isCompleted ? undefined : onLearn}
      disabled={isCompleted}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${prerequisite.name}${isCompleted ? ', completed' : ', tap to learn'}`}
      accessibilityState={{ disabled: isCompleted }}
    >
      <View style={styles.gapItemContent}>
        <View style={styles.gapItemHeader}>
          <Text
            style={[styles.gapItemName, isCompleted && styles.gapItemNameCompleted]}
            numberOfLines={1}
          >
            {prerequisite.name}
          </Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>V</Text>
            </View>
          )}
        </View>
        {prerequisite.description && (
          <Text
            style={styles.gapItemDescription}
            numberOfLines={2}
          >
            {prerequisite.description}
          </Text>
        )}
      </View>
      {!isCompleted && (
        <View style={styles.learnButton}>
          <Text style={styles.learnButtonText}>Learn</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  contentContainer: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  } as ViewStyle,
  header: {
    marginBottom: spacing[4],
  } as ViewStyle,
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  } as TextStyle,
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
  } as ViewStyle,
  scoreLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing[3],
  } as TextStyle,
  recommendationCard: {
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 2,
    alignItems: 'center',
  } as ViewStyle,
  recommendationBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  } as ViewStyle,
  recommendationBadgeText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  } as TextStyle,
  recommendationTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing[2],
    textAlign: 'center',
  } as TextStyle,
  recommendationDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
  } as TextStyle,
  gapsSection: {
    marginBottom: spacing[6],
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[2],
  } as TextStyle,
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing[4],
  } as TextStyle,
  gapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: spacing[3],
    minHeight: 56, // Touch target
  } as ViewStyle,
  gapItemCompleted: {
    backgroundColor: `${colors.success}10`,
    borderWidth: 1,
    borderColor: colors.success,
  } as ViewStyle,
  gapItemContent: {
    flex: 1,
    marginRight: spacing[3],
  } as ViewStyle,
  gapItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  } as ViewStyle,
  gapItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  } as TextStyle,
  gapItemNameCompleted: {
    color: colors.success,
  } as TextStyle,
  gapItemDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  } as TextStyle,
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  } as ViewStyle,
  completedBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: fontWeight.bold,
  } as TextStyle,
  learnButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44, // Touch target
    justifyContent: 'center',
  } as ViewStyle,
  learnButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  } as TextStyle,
  actionsContainer: {
    alignItems: 'center',
  } as ViewStyle,
  warningText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
  } as TextStyle,
});

export default GapResultsScreen;
