/**
 * Review Session Screen
 *
 * Displays the current review item and rating buttons.
 * Shows progress through the review queue.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { RatingButtons } from '@/src/components/review';
import { MasteryStateBadge } from '@/src/components/mastery';
import { useReview } from '@/src/lib/review-context';
import { FSRSRating } from '@/src/lib/fsrs';
import { colors } from '@/src/theme';

/**
 * ReviewScreen Component
 *
 * Manages the review session flow:
 * 1. Shows concept name and definition
 * 2. User reveals answer
 * 3. User rates their recall (Again/Hard/Good/Easy)
 * 4. Move to next concept or complete session
 */
export default function ReviewScreen() {
  const router = useRouter();
  const {
    session,
    currentItem,
    submitReview,
    endSession,
    loading,
    error,
  } = useReview();

  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewStartTime, setReviewStartTime] = useState<number>(Date.now());

  // Reset state when moving to next item
  useEffect(() => {
    setShowAnswer(false);
    setReviewStartTime(Date.now());
  }, [currentItem?.conceptId]);

  // Handle rating selection
  const handleRate = async (rating: FSRSRating) => {
    if (!currentItem || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const timeToAnswer = Date.now() - reviewStartTime;
      await submitReview(rating, { timeToAnswerMs: timeToAnswer });
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle session end
  const handleEndSession = () => {
    endSession();
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading review session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No session active
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>No Review Session</Text>
          <Text style={styles.subtitle}>Start a review session from the home screen</Text>
          <Button onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Session complete
  if (!currentItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.title}>Session Complete!</Text>
          <Text style={styles.subtitle}>
            You reviewed {session.itemsReviewed}{' '}
            {session.itemsReviewed === 1 ? 'concept' : 'concepts'}
          </Text>
          <Button onPress={handleEndSession} style={styles.doneButton}>
            Done
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with progress */}
      <View style={styles.header}>
        <Pressable onPress={handleEndSession} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={styles.progress}>
          <Text style={styles.progressText}>
            {session.currentItemIndex + 1} / {session.itemsReviewed +
              (currentItem ? 1 : 0) +
              Math.max(0, session.currentItemIndex - session.itemsReviewed)}
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(100, ((session.currentItemIndex + 1) / Math.max(1, session.currentItemIndex + 1)) * 100)}%`,
            },
          ]}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Concept Card */}
        <Card style={styles.conceptCard}>
          <View style={styles.conceptHeader}>
            <MasteryStateBadge state={currentItem.state} />
          </View>

          <Text style={styles.conceptName}>{currentItem.conceptName}</Text>

          {/* Question: What is this concept? */}
          <Text style={styles.questionLabel}>What is this concept?</Text>

          {/* Show Answer Button or Answer */}
          {!showAnswer ? (
            <Pressable
              style={styles.revealButton}
              onPress={() => setShowAnswer(true)}
            >
              <Text style={styles.revealText}>Tap to reveal answer</Text>
            </Pressable>
          ) : (
            <View style={styles.answerContainer}>
              <Text style={styles.answerLabel}>Definition:</Text>
              <Text style={styles.answerText}>
                {/* We'd need to fetch the concept definition here */}
                (Concept definition would appear here. Full integration requires fetching from concepts table.)
              </Text>
            </View>
          )}
        </Card>

        {/* Rating Buttons (only shown after reveal) */}
        {showAnswer && (
          <RatingButtons
            onRate={handleRate}
            disabled={isSubmitting}
          />
        )}

        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: colors.text,
  },
  progress: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  spacer: {
    width: 40,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  conceptCard: {
    marginBottom: 16,
  },
  conceptHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  conceptName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  questionLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  revealButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  revealText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  answerContainer: {
    backgroundColor: colors.backgroundTertiary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  doneButton: {
    marginTop: 24,
    minWidth: 120,
  },
  errorContainer: {
    backgroundColor: colors.error,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
});
