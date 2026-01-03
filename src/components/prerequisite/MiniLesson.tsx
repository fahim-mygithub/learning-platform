/**
 * MiniLesson Component
 *
 * A component that displays AI-generated mini-lesson content for a prerequisite.
 * Shows a 2-3 paragraph explanation with key points.
 *
 * Features:
 * - Readable typography with proper line height
 * - Key points highlighted in a callout
 * - Mark as completed button
 * - Loading state for content generation
 * - Mobile-first design
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from 'react-native';

import { Button, Card } from '../ui';
import { colors, spacing, fontSize, fontWeight, lineHeight as lineHeightTokens } from '../../theme';
import type { MiniLesson as MiniLessonType, Prerequisite } from '../../types/prerequisite';

/**
 * Props for the MiniLesson component
 */
export interface MiniLessonProps {
  /** The prerequisite being learned */
  prerequisite: Prerequisite;
  /** The mini-lesson content (null if still loading) */
  miniLesson: MiniLessonType | null;
  /** Callback when user marks the lesson as complete */
  onComplete: () => void;
  /** Callback to go back to gap results */
  onBack?: () => void;
  /** Whether the lesson content is loading */
  isLoading?: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Test ID for testing */
  testID?: string;
}

/**
 * MiniLesson Component
 *
 * @example
 * ```tsx
 * <MiniLesson
 *   prerequisite={prerequisite}
 *   miniLesson={lessonContent}
 *   onComplete={() => completeMiniLesson(prerequisite.id)}
 *   isLoading={isGenerating}
 * />
 * ```
 */
export function MiniLesson({
  prerequisite,
  miniLesson,
  onComplete,
  onBack,
  isLoading = false,
  error = null,
  testID = 'mini-lesson',
}: MiniLessonProps): React.ReactElement {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            Generating lesson for "{prerequisite.name}"...
          </Text>
          <Text style={styles.loadingSubtext}>
            This may take a few seconds
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{error}</Text>
          {onBack && (
            <Button variant="outline" onPress={onBack}>
              Go Back
            </Button>
          )}
        </View>
      </View>
    );
  }

  // No content state
  if (!miniLesson) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lesson content available.</Text>
          {onBack && (
            <Button variant="outline" onPress={onBack}>
              Go Back
            </Button>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Mini-Lesson</Text>
        <Text style={styles.headerTitle} testID={`${testID}-title`}>
          {miniLesson.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>~</Text>
            <Text style={styles.metaText}>
              {miniLesson.estimated_minutes} min read
            </Text>
          </View>
        </View>
      </View>

      {/* Main content */}
      <Card style={styles.contentCard}>
        <Text style={styles.contentText} testID={`${testID}-content`}>
          {miniLesson.content_markdown}
        </Text>
      </Card>

      {/* Key points */}
      {miniLesson.key_points && miniLesson.key_points.length > 0 && (
        <View style={styles.keyPointsSection}>
          <Text style={styles.keyPointsTitle}>Key Takeaways</Text>
          <Card style={styles.keyPointsCard}>
            {miniLesson.key_points.map((point, index) => (
              <View key={index} style={styles.keyPointItem}>
                <View style={styles.keyPointBullet}>
                  <Text style={styles.keyPointBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Complete button */}
      <View style={styles.actionContainer}>
        <Button
          onPress={onComplete}
          variant="primary"
          size="large"
          testID={`${testID}-complete-button`}
          accessibilityLabel="Mark lesson as complete"
        >
          Got It!
        </Button>
        {onBack && (
          <Button
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
            testID={`${testID}-back-button`}
          >
            Back to Results
          </Button>
        )}
      </View>
    </ScrollView>
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

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  loadingText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing[4],
    textAlign: 'center',
  } as TextStyle,
  loadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing[2],
    textAlign: 'center',
  } as TextStyle,

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.error,
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: spacing[4],
    overflow: 'hidden',
  } as TextStyle,
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing[4],
  } as TextStyle,

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  } as ViewStyle,
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  } as TextStyle,

  // Header
  header: {
    marginBottom: spacing[4],
  } as ViewStyle,
  headerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  } as TextStyle,
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing[2],
    lineHeight: fontSize.xl * 1.3,
  } as TextStyle,
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  metaIcon: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing[1],
  } as TextStyle,
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Content
  contentCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  } as ViewStyle,
  contentText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * lineHeightTokens.relaxed,
  } as TextStyle,

  // Key points
  keyPointsSection: {
    marginBottom: spacing[6],
  } as ViewStyle,
  keyPointsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[3],
  } as TextStyle,
  keyPointsCard: {
    padding: spacing[4],
    backgroundColor: `${colors.primary}08`,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  } as ViewStyle,
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  } as ViewStyle,
  keyPointBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  } as ViewStyle,
  keyPointBulletText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  } as TextStyle,
  keyPointText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.4,
  } as TextStyle,

  // Action
  actionContainer: {
    alignItems: 'center',
    paddingTop: spacing[4],
  } as ViewStyle,
  backButton: {
    marginTop: spacing[3],
  } as ViewStyle,
});

export default MiniLesson;
