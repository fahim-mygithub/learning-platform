/**
 * DueReviewsCard Component
 *
 * A card component for the home screen showing due reviews.
 * Displays:
 * - Total count of due reviews
 * - Overdue count with warning
 * - Preview of top 3 concepts to review
 * - Start review button
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MasteryStateBadge } from '../mastery/MasteryStateBadge';
import { useReview } from '../../lib/review-context';
import { colors } from '../../theme';

/**
 * Props for the DueReviewsCard component
 */
export interface DueReviewsCardProps {
  /** Optional project ID to filter reviews */
  projectId?: string;
  /** Test ID for testing purposes */
  testID?: string;
}

/**
 * DueReviewsCard Component
 *
 * Shows a summary of due reviews and allows starting a review session.
 *
 * @example
 * ```tsx
 * <DueReviewsCard />
 * <DueReviewsCard projectId="project-123" />
 * ```
 */
export function DueReviewsCard({
  projectId,
  testID = 'due-reviews-card',
}: DueReviewsCardProps): React.ReactElement | null {
  const router = useRouter();
  const { dueReviews, stats, loading, startSession, getProjectReviews } = useReview();

  // Get reviews for this project if specified
  const reviews = projectId ? getProjectReviews(projectId) : dueReviews;
  const reviewCount = reviews.length;
  const overdueCount = reviews.filter((r) => r.daysOverdue > 0).length;

  // Don't show card if no reviews due
  if (!loading && reviewCount === 0) {
    return null;
  }

  const handleStartReview = () => {
    startSession(projectId);
    router.push('/review');
  };

  // Preview of top 3 concepts
  const previewConcepts = reviews.slice(0, 3);

  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Due Reviews</Text>
        {overdueCount > 0 && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>{overdueCount} overdue</Text>
          </View>
        )}
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <>
          <Text style={styles.countText}>
            {reviewCount} {reviewCount === 1 ? 'concept' : 'concepts'} to review
          </Text>

          {previewConcepts.length > 0 && (
            <View style={styles.previewContainer}>
              {previewConcepts.map((item) => (
                <View key={item.conceptId} style={styles.previewItem}>
                  <MasteryStateBadge state={item.state} compact />
                  <Text style={styles.previewName} numberOfLines={1}>
                    {item.conceptName}
                  </Text>
                </View>
              ))}
              {reviews.length > 3 && (
                <Text style={styles.moreText}>+{reviews.length - 3} more</Text>
              )}
            </View>
          )}

          <Button
            testID={`${testID}-start-button`}
            onPress={handleStartReview}
            style={styles.button}
          >
            Start Review Session
          </Button>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  overdueBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewName: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  button: {
    marginTop: 4,
  },
});

export default DueReviewsCard;
