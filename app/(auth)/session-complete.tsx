/**
 * Session Complete Screen
 *
 * Displays summary after completing a learning session:
 * - Session stats (new concepts, reviews, accuracy, time)
 * - Mastery updates display
 * - Next review preview
 * - Navigation buttons
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { MasteryStateBadge } from '@/src/components/mastery';
import { colors } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/lib/auth-context';
import type { MasteryState } from '@/src/types/database';

/**
 * Mastery update item for display
 */
interface MasteryUpdate {
  conceptId: string;
  conceptName: string;
  previousState: MasteryState;
  newState: MasteryState;
}

/**
 * Session stats for display
 */
interface SessionStats {
  newConcepts: number;
  reviews: number;
  totalResponses: number;
  correctResponses: number;
  accuracy: number;
  durationMinutes: number;
}

/**
 * Next review preview
 */
interface NextReviewPreview {
  dueCount: number;
  nextDueDate: string | null;
}

/**
 * SessionCompleteScreen Component
 *
 * Shows session completion summary with:
 * - Stats (new concepts, reviews, accuracy, time)
 * - Mastery state transitions
 * - Upcoming review preview
 * - Navigation to project or new session
 */
export default function SessionCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId?: string;
    projectId?: string;
  }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [masteryUpdates, setMasteryUpdates] = useState<MasteryUpdate[]>([]);
  const [nextReview, setNextReview] = useState<NextReviewPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load session data and calculate stats
   */
  const loadSessionData = useCallback(async () => {
    if (!params.sessionId || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load session with responses
      const { data: session, error: sessionError } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('id', params.sessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Load session responses
      const { data: responses, error: responsesError } = await supabase
        .from('session_responses')
        .select(`
          *,
          concepts:concept_id (
            id,
            name
          )
        `)
        .eq('session_id', params.sessionId);

      if (responsesError) {
        throw responsesError;
      }

      // Calculate stats from session items and responses
      const sessionItems = session?.items || [];
      const newConceptItems = sessionItems.filter(
        (item: { type: string }) => item.type === 'new'
      );
      const reviewItems = sessionItems.filter(
        (item: { type: string }) => item.type === 'review'
      );

      const correctResponses = responses?.filter((r) => r.is_correct).length || 0;
      const totalResponses = responses?.length || 0;
      const accuracy = totalResponses > 0
        ? Math.round((correctResponses / totalResponses) * 100)
        : 0;

      // Calculate session duration
      const startTime = session?.started_at ? new Date(session.started_at) : null;
      const endTime = session?.completed_at ? new Date(session.completed_at) : new Date();
      const durationMinutes = startTime
        ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
        : session?.estimated_minutes || 0;

      setStats({
        newConcepts: newConceptItems.length,
        reviews: reviewItems.length,
        totalResponses,
        correctResponses,
        accuracy,
        durationMinutes,
      });

      // Load mastery updates from review history for this session
      const { data: reviewHistory, error: historyError } = await supabase
        .from('review_history')
        .select(`
          state_before,
          state_after,
          concept_id,
          concepts:concept_id (
            id,
            name
          )
        `)
        .eq('session_id', params.sessionId)
        .neq('state_before', 'state_after');

      if (!historyError && reviewHistory) {
        const updates: MasteryUpdate[] = reviewHistory.map((history) => ({
          conceptId: history.concept_id,
          conceptName: (history.concepts as { name?: string })?.name || 'Unknown Concept',
          previousState: history.state_before as MasteryState,
          newState: history.state_after as MasteryState,
        }));
        setMasteryUpdates(updates);
      }

      // Load next review preview
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const { data: dueReviews, error: dueError } = await supabase
        .from('concept_states')
        .select('due_date')
        .eq('user_id', user.id)
        .lte('due_date', tomorrow.toISOString())
        .order('due_date', { ascending: true });

      if (!dueError && dueReviews) {
        setNextReview({
          dueCount: dueReviews.length,
          nextDueDate: dueReviews[0]?.due_date || null,
        });
      }
    } catch (err) {
      console.error('Error loading session data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [params.sessionId, user?.id]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  /**
   * Navigate back to project
   */
  const handleBackToProject = () => {
    if (params.projectId) {
      router.replace(`/(auth)/(tabs)/projects/${params.projectId}`);
    } else {
      router.replace('/(auth)/(tabs)/projects');
    }
  };

  /**
   * Start another session
   */
  const handleStartAnother = () => {
    if (params.projectId) {
      // Navigate to project to start a new session
      router.replace(`/(auth)/(tabs)/projects/${params.projectId}`);
    } else {
      router.replace('/(auth)/(tabs)');
    }
  };

  /**
   * Format relative time for next review
   */
  const formatNextReviewTime = (dateStr: string | null): string => {
    if (!dateStr) return 'No reviews scheduled';

    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'overdue';
    if (diffHours < 1) return 'in less than 1 hour';
    if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;

    const diffDays = Math.ceil(diffHours / 24);
    return diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading session summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={handleBackToProject} style={styles.button}>
            Back to Project
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>&#127881;</Text>
          <Text style={styles.title}>Session Complete!</Text>
        </View>

        {/* Stats Card */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>&#128202;</Text>
            <Text style={styles.sectionTitle}>This Session</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.newConcepts || 0}</Text>
              <Text style={styles.statLabel}>New concepts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.reviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.accuracy || 0}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.durationMinutes || 0}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
          </View>
        </Card>

        {/* Mastery Updates Card */}
        {masteryUpdates.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>&#129504;</Text>
              <Text style={styles.sectionTitle}>Mastery Updates</Text>
            </View>
            <View style={styles.updatesList}>
              {masteryUpdates.map((update) => (
                <View key={update.conceptId} style={styles.updateItem}>
                  <Text style={styles.updateConceptName} numberOfLines={1}>
                    {update.conceptName}
                  </Text>
                  <View style={styles.updateTransition}>
                    <MasteryStateBadge state={update.previousState} compact />
                    <Text style={styles.transitionArrow}>&#8594;</Text>
                    <MasteryStateBadge state={update.newState} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Next Review Preview Card */}
        {nextReview && nextReview.dueCount > 0 && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>&#128197;</Text>
              <Text style={styles.sectionTitle}>Upcoming Reviews</Text>
            </View>
            <Text style={styles.nextReviewText}>
              {nextReview.dueCount} concept{nextReview.dueCount === 1 ? '' : 's'} due{' '}
              {formatNextReviewTime(nextReview.nextDueDate)}
            </Text>
          </Card>
        )}

        {/* Empty mastery updates placeholder */}
        {masteryUpdates.length === 0 && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>&#129504;</Text>
              <Text style={styles.sectionTitle}>Mastery Updates</Text>
            </View>
            <Text style={styles.noUpdatesText}>
              No mastery level changes this session. Keep practicing!
            </Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant="outline"
            onPress={handleBackToProject}
            style={styles.button}
          >
            Back to Project
          </Button>
          <Button
            onPress={handleStartAnother}
            style={styles.button}
          >
            Start Another
          </Button>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  updatesList: {
    gap: 12,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  updateConceptName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginRight: 12,
  },
  updateTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transitionArrow: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  nextReviewText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  noUpdatesText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
});
