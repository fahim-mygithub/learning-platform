/**
 * SessionCompleteCard Component
 *
 * Displays mastery summary at the end of a learning session with soft cap options.
 * Shows score, concepts mastered vs. needing review, XP earned, and streak info.
 * Research suggests brain needs rest, so design is celebratory but calming.
 *
 * @example
 * ```tsx
 * <SessionCompleteCard
 *   masterySummary={summary}
 *   xpEarned={150}
 *   streak={7}
 *   onEndSession={() => navigation.goBack()}
 *   onContinue={() => continueWithReducedXP()}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { spacing } from '@/src/theme';
import { type ColorTheme } from '@/src/theme/colors';
import { useTypography } from '@/src/lib/typography-context';
import { haptics } from '@/src/lib/haptic-feedback';
import type {
  MasterySummary,
  ConceptMastery,
  RubricMasterySummary,
  RubricConceptMastery,
  MasteryStatus,
} from '@/src/lib/mastery-evaluation-service';
import type { RubricEvaluation, DimensionEvaluation, RubricDimension } from '@/src/types/rubric';
import { checkDimensionPassed } from '@/src/types/rubric';

/**
 * Props for the SessionCompleteCard component
 */
export interface SessionCompleteCardProps {
  /** Mastery summary from the synthesis phase evaluation */
  masterySummary: MasterySummary;
  /** XP earned this session */
  xpEarned: number;
  /** Current streak (optional) */
  streak?: number;
  /** Called when user ends the session */
  onEndSession: () => void;
  /** Called when user chooses to continue with reduced XP */
  onContinue: () => void;
  /** Test ID for testing purposes */
  testID?: string;
  /** Optional rubric-based mastery data for AI evaluation results */
  rubricMastery?: RubricMasterySummary;
}

/**
 * SessionCompleteCard Component
 *
 * End-of-session summary with mastery results and soft cap options.
 */
export function SessionCompleteCard({
  masterySummary,
  xpEarned,
  streak,
  onEndSession,
  onContinue,
  testID = 'session-complete-card',
  rubricMastery,
}: SessionCompleteCardProps): React.ReactElement {
  // Get dynamic colors from typography context
  const { getColors, isDarkMode } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Animation values for button presses
  const endButtonScale = useSharedValue(1);
  const continueButtonScale = useSharedValue(1);

  /**
   * Handle end session press
   */
  const handleEndSession = async () => {
    endButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
      endButtonScale.value = withSpring(1);
    });
    await haptics.medium();
    onEndSession();
  };

  /**
   * Handle continue press
   */
  const handleContinue = async () => {
    continueButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
      continueButtonScale.value = withSpring(1);
    });
    await haptics.light();
    onContinue();
  };

  /**
   * Animated style for end button
   */
  const endButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: endButtonScale.value }],
  }));

  /**
   * Animated style for continue button
   */
  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const { correctCount, totalCount, scorePercentage, conceptsMastered, conceptsNeedingReview } =
    masterySummary;

  return (
    <ScrollView
      testID={testID}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel="Session complete summary"
    >
      {/* Header */}
      <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>&#127942;</Text>
        </View>
        <Text style={styles.headerTitle}>Session Complete</Text>
        <Text style={styles.headerSubtitle}>Great work! Take a moment to rest.</Text>
      </Animated.View>

      {/* Score Section */}
      <Animated.View
        entering={SlideInUp.delay(150)}
        style={styles.scoreSection}
        testID={`${testID}-score`}
        accessible={true}
        accessibilityLabel={`Score: ${correctCount} out of ${totalCount} correct, ${scorePercentage} percent`}
      >
        <View style={styles.scoreCircle}>
          <Text style={styles.scorePercentage}>{scorePercentage}%</Text>
          <Text style={styles.scoreFraction}>{correctCount}/{totalCount}</Text>
        </View>
        <Text style={styles.scoreLabel}>Correct Answers</Text>
      </Animated.View>

      {/* XP and Streak Row */}
      <Animated.View entering={SlideInUp.delay(200)} style={styles.statsRow}>
        {/* XP Earned */}
        <View
          style={styles.statCard}
          accessible={true}
          accessibilityLabel={`${xpEarned} XP earned`}
        >
          <Text style={styles.statValue}>+{xpEarned} XP</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>

        {/* Streak (if available) */}
        {streak !== undefined && (
          <View
            style={styles.statCard}
            accessible={true}
            accessibilityLabel={`${streak} day streak`}
          >
            <View style={styles.streakContainer}>
              <Text style={styles.streakIcon}>&#128293;</Text>
              <Text style={styles.statValue}>{streak}</Text>
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        )}
      </Animated.View>

      {/* Mastery Summary - Rubric or Simple */}
      {rubricMastery && rubricMastery.conceptMasteries.length > 0 ? (
        <Animated.View
          entering={SlideInUp.delay(250)}
          style={styles.masterySection}
          testID="rubric-mastery-section"
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel="Rubric-based mastery summary"
        >
          <Text style={styles.sectionTitle}>Mastery Summary</Text>

          {/* Mastered vs Needs Review Stats */}
          <View style={styles.masteryStatsRow}>
            <View style={[styles.masteryStatCard, styles.masteredCard]}>
              <Text style={[styles.masteryStatValue, styles.masteredValue]}>
                {rubricMastery.conceptsMastered.length}
              </Text>
              <Text style={styles.masteryStatLabel}>Mastered</Text>
            </View>
            <View style={[styles.masteryStatCard, styles.reviewCard]}>
              <Text style={[styles.masteryStatValue, styles.reviewValue]}>
                {rubricMastery.conceptsNeedingReview.length}
              </Text>
              <Text style={styles.masteryStatLabel}>Needs Review</Text>
            </View>
          </View>

          {/* Rubric Concept Cards */}
          {rubricMastery.conceptMasteries.map((concept) => (
            <RubricConceptCard
              key={concept.conceptId}
              concept={concept}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={SlideInUp.delay(250)} style={styles.masterySection}>
          <Text style={styles.sectionTitle}>Mastery Summary</Text>

          {/* Mastered vs Needs Review Stats */}
          <View style={styles.masteryStatsRow}>
            <View style={[styles.masteryStatCard, styles.masteredCard]}>
              <Text style={[styles.masteryStatValue, styles.masteredValue]}>
                {conceptsMastered.length}
              </Text>
              <Text style={styles.masteryStatLabel}>Mastered</Text>
            </View>
            <View style={[styles.masteryStatCard, styles.reviewCard]}>
              <Text style={[styles.masteryStatValue, styles.reviewValue]}>
                {conceptsNeedingReview.length}
              </Text>
              <Text style={styles.masteryStatLabel}>Needs Review</Text>
            </View>
          </View>

          {/* Concepts Mastered List */}
          {conceptsMastered.length > 0 && (
            <View style={styles.conceptSection}>
              <Text style={styles.conceptSectionLabel}>Concepts Mastered</Text>
              <View style={styles.conceptList}>
                {conceptsMastered.map((concept) => (
                  <ConceptChip
                    key={concept.conceptId}
                    concept={concept}
                    type="mastered"
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Concepts Needing Review List */}
          {conceptsNeedingReview.length > 0 && (
            <View style={styles.conceptSection}>
              <Text style={styles.conceptSectionLabel}>Needs Review</Text>
              <View style={styles.conceptList}>
                {conceptsNeedingReview.map((concept) => (
                  <ConceptChip
                    key={concept.conceptId}
                    concept={concept}
                    type="review"
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Action Buttons */}
      <Animated.View entering={SlideInUp.delay(300)} style={styles.actionsSection}>
        {/* End Session Button (Primary) */}
        <Animated.View style={endButtonAnimatedStyle}>
          <Pressable
            testID={`${testID}-end-button`}
            style={styles.endButton}
            onPress={handleEndSession}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="End Session"
            accessibilityHint="Finish your learning session and return"
          >
            <Text style={styles.endButtonText}>End Session</Text>
          </Pressable>
        </Animated.View>

        {/* Continue Button (Secondary) */}
        <Animated.View style={continueButtonAnimatedStyle}>
          <Pressable
            testID={`${testID}-continue-button`}
            style={styles.continueButton}
            onPress={handleContinue}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue learning with 50 percent reduced XP"
            accessibilityHint="Continue learning but earn half XP"
          >
            <Text style={styles.continueButtonText}>Keep Going</Text>
            <Text style={styles.continueButtonSubtext}>-50% XP</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Rest Message */}
      <Animated.View entering={FadeIn.delay(400)} style={styles.restMessage}>
        <Text style={styles.restMessageText}>
          Research shows taking breaks improves retention. Come back refreshed!
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

/**
 * ConceptChip Component
 */
interface ConceptChipProps {
  concept: ConceptMastery;
  type: 'mastered' | 'review';
  colors: ColorTheme;
  isDarkMode: boolean;
}

const ConceptChip = React.memo(function ConceptChip({
  concept,
  type,
  colors,
  isDarkMode,
}: ConceptChipProps): React.ReactElement {
  const chipStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor:
        type === 'mastered'
          ? isDarkMode
            ? colors.success + '30'
            : colors.success + '15'
          : isDarkMode
            ? colors.warning + '30'
            : colors.warning + '15',
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: 16,
      borderWidth: 1,
      borderColor: type === 'mastered' ? colors.success + '40' : colors.warning + '40',
      marginRight: spacing[2],
      marginBottom: spacing[2],
    }),
    [type, colors, isDarkMode]
  );

  const textStyle = useMemo<TextStyle>(
    () => ({
      fontSize: 13,
      fontWeight: '500',
      color: type === 'mastered' ? colors.success : colors.warning,
    }),
    [type, colors]
  );

  return (
    <View style={chipStyle}>
      <Text style={textStyle} numberOfLines={1}>
        {concept.conceptName}
      </Text>
    </View>
  );
});

// ============================================================================
// Rubric Concept Card Component
// ============================================================================

/**
 * RubricConceptCard Component Props
 */
interface RubricConceptCardProps {
  concept: RubricConceptMastery;
  colors: ColorTheme;
  isDarkMode: boolean;
}

/**
 * Get status icon based on mastery status
 */
function getStatusIcon(status: MasteryStatus): string {
  switch (status) {
    case 'mastered':
      return '\u2705'; // Green checkmark
    case 'reinforced':
      return '\u26A0\uFE0F'; // Warning sign (amber)
    case 'needs_review':
      return '\u274C'; // Red X
    default:
      return '';
  }
}

/**
 * Get status colors based on mastery status
 */
function getStatusColors(
  status: MasteryStatus,
  colors: ColorTheme,
  isDarkMode: boolean
): { background: string; border: string; text: string } {
  switch (status) {
    case 'mastered':
      return {
        background: isDarkMode ? colors.success + '20' : colors.success + '10',
        border: colors.success + '40',
        text: colors.success,
      };
    case 'reinforced':
      return {
        background: isDarkMode ? colors.warning + '20' : colors.warning + '10',
        border: colors.warning + '40',
        text: colors.warning,
      };
    case 'needs_review':
      return {
        background: isDarkMode ? colors.error + '20' : colors.error + '10',
        border: colors.error + '40',
        text: colors.error,
      };
    default:
      return {
        background: colors.backgroundSecondary,
        border: colors.borderLight,
        text: colors.textSecondary,
      };
  }
}

/**
 * RubricConceptCard Component
 *
 * Displays a concept with rubric-based dimension scores and feedback.
 */
const RubricConceptCard = React.memo(function RubricConceptCard({
  concept,
  colors,
  isDarkMode,
}: RubricConceptCardProps): React.ReactElement {
  const statusColors = getStatusColors(concept.status, colors, isDarkMode);

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: statusColors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: statusColors.border,
      padding: spacing[4],
      marginTop: spacing[3],
    }),
    [statusColors]
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[3],
    }),
    []
  );

  const conceptNameStyle = useMemo<TextStyle>(
    () => ({
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    }),
    [colors]
  );

  const statusIndicatorStyle = useMemo<TextStyle>(
    () => ({
      fontSize: 18,
      marginLeft: spacing[2],
    }),
    []
  );

  // Get all dimension evaluations from all rubric evaluations
  const allDimensionEvaluations = useMemo(() => {
    const evaluations: DimensionEvaluation[] = [];
    for (const rubricEval of concept.rubricEvaluations) {
      evaluations.push(...rubricEval.dimensions);
    }
    return evaluations;
  }, [concept.rubricEvaluations]);

  // Get overall feedback from the first rubric evaluation
  const overallFeedback = concept.rubricEvaluations[0]?.overallFeedback || '';

  return (
    <View
      style={cardStyle}
      testID={`rubric-concept-${concept.conceptId}-${concept.status}`}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`${concept.conceptName}: ${concept.status}`}
    >
      {/* Header with concept name and status icon */}
      <View style={headerStyle}>
        <Text style={conceptNameStyle} numberOfLines={1}>
          {concept.conceptName}
        </Text>
        <Text style={statusIndicatorStyle}>{getStatusIcon(concept.status)}</Text>
      </View>

      {/* Dimension scores */}
      {allDimensionEvaluations.map((dimEval) => (
        <DimensionScoreRow
          key={dimEval.dimension}
          evaluation={dimEval}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      ))}

      {/* Overall feedback */}
      {overallFeedback && (
        <View
          style={{
            marginTop: spacing[3],
            paddingTop: spacing[3],
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            "{overallFeedback}"
          </Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// Dimension Score Row Component
// ============================================================================

/**
 * DimensionScoreRow Component Props
 */
interface DimensionScoreRowProps {
  evaluation: DimensionEvaluation;
  colors: ColorTheme;
  isDarkMode: boolean;
}

/**
 * DimensionScoreRow Component
 *
 * Displays a single dimension score with progress indicator.
 */
const DimensionScoreRow = React.memo(function DimensionScoreRow({
  evaluation,
  colors,
  isDarkMode,
}: DimensionScoreRowProps): React.ReactElement {
  const { dimension, score, feedback } = evaluation;
  const passed = checkDimensionPassed(dimension, score);

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: spacing[2],
    }),
    []
  );

  const dimensionHeaderStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
    []
  );

  const dimensionLabelStyle = useMemo<TextStyle>(
    () => ({
      fontSize: 13,
      fontWeight: '500',
      color: passed ? colors.textSecondary : colors.error,
      flex: 1,
    }),
    [passed, colors]
  );

  const scoreTextStyle = useMemo<TextStyle>(
    () => ({
      fontSize: 12,
      fontWeight: '600',
      color: passed ? colors.textSecondary : colors.error,
      marginLeft: spacing[2],
    }),
    [passed, colors]
  );

  const progressBarContainerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      backgroundColor: isDarkMode ? colors.backgroundSecondary : colors.borderLight,
      marginTop: spacing[1],
      overflow: 'hidden',
    }),
    [isDarkMode, colors]
  );

  // Create progress bar segments (max score is 3)
  const segments = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const isFilled = i < score;
      result.push(
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: isFilled
              ? passed
                ? colors.success
                : colors.warning
              : 'transparent',
            marginRight: i < 2 ? 2 : 0,
          }}
        />
      );
    }
    return result;
  }, [score, passed, colors]);

  // Feedback shown only for failed dimensions
  const showFeedback = !passed && feedback;

  return (
    <View style={rowStyle}>
      <View style={dimensionHeaderStyle}>
        <Text style={dimensionLabelStyle}>{dimension}</Text>
        {!passed && (
          <Text
            testID={`dimension-${dimension}-warning`}
            style={{ fontSize: 12, color: colors.error }}
          >
            Needs Work
          </Text>
        )}
        <View
          testID={`dimension-${dimension}-score`}
          accessible={true}
          accessibilityLabel={`${dimension} score: ${score} out of 3`}
        >
          <Text style={scoreTextStyle}>{score}/3</Text>
        </View>
      </View>
      <View style={progressBarContainerStyle}>{segments}</View>
      {showFeedback && (
        <Text
          style={{
            fontSize: 11,
            color: colors.error,
            marginTop: spacing[1],
            fontStyle: 'italic',
          }}
        >
          {feedback}
        </Text>
      )}
    </View>
  );
});

/**
 * Create dynamic styles based on theme colors
 */
function createStyles(colors: ColorTheme, isDarkMode: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,
    contentContainer: {
      padding: spacing[4],
      paddingTop: spacing[6],
      paddingBottom: spacing[8],
    } as ViewStyle,
    header: {
      alignItems: 'center',
      marginBottom: spacing[6],
    } as ViewStyle,
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDarkMode ? colors.secondary + '20' : colors.secondary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing[3],
    } as ViewStyle,
    icon: {
      fontSize: 40,
    } as TextStyle,
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing[1],
    } as TextStyle,
    headerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    } as TextStyle,
    scoreSection: {
      alignItems: 'center',
      marginBottom: spacing[5],
    } as ViewStyle,
    scoreCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: isDarkMode ? colors.primary + '20' : colors.primary + '10',
      borderWidth: 4,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing[2],
    } as ViewStyle,
    scorePercentage: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primary,
    } as TextStyle,
    scoreFraction: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    } as TextStyle,
    scoreLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    } as TextStyle,
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing[4],
      marginBottom: spacing[6],
    } as ViewStyle,
    statCard: {
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[5],
      borderRadius: 16,
      alignItems: 'center',
      minWidth: 100,
    } as ViewStyle,
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    } as TextStyle,
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing[1],
    } as TextStyle,
    streakContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    } as ViewStyle,
    streakIcon: {
      fontSize: 20,
    } as TextStyle,
    masterySection: {
      marginBottom: spacing[6],
    } as ViewStyle,
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing[4],
    } as TextStyle,
    masteryStatsRow: {
      flexDirection: 'row',
      gap: spacing[3],
      marginBottom: spacing[4],
    } as ViewStyle,
    masteryStatCard: {
      flex: 1,
      paddingVertical: spacing[4],
      borderRadius: 12,
      alignItems: 'center',
    } as ViewStyle,
    masteredCard: {
      backgroundColor: isDarkMode ? '#1B5E2020' : '#E8F5E9',
    } as ViewStyle,
    reviewCard: {
      backgroundColor: isDarkMode ? '#E65100' + '20' : '#FFF3E0',
    } as ViewStyle,
    masteryStatValue: {
      fontSize: 28,
      fontWeight: '800',
    } as TextStyle,
    masteredValue: {
      color: colors.success,
    } as TextStyle,
    reviewValue: {
      color: colors.warning,
    } as TextStyle,
    masteryStatLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing[1],
    } as TextStyle,
    conceptSection: {
      marginTop: spacing[3],
    } as ViewStyle,
    conceptSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing[2],
    } as TextStyle,
    conceptList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    } as ViewStyle,
    actionsSection: {
      gap: spacing[3],
      marginBottom: spacing[4],
    } as ViewStyle,
    endButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing[4],
      borderRadius: 12,
      alignItems: 'center',
    } as ViewStyle,
    endButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
    } as TextStyle,
    continueButton: {
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: spacing[3],
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,
    } as ViewStyle,
    continueButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    } as TextStyle,
    continueButtonSubtext: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: spacing[1],
    } as TextStyle,
    restMessage: {
      backgroundColor: isDarkMode ? colors.info + '15' : colors.info + '10',
      padding: spacing[4],
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.info,
    } as ViewStyle,
    restMessageText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      fontStyle: 'italic',
    } as TextStyle,
  });
}

export default SessionCompleteCard;
