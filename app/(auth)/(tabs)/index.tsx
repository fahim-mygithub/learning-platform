import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DueReviewsCard } from '@/src/components/review';
import { SessionPreviewCard } from '@/src/components/session';
import { useSession } from '@/src/lib/session-context';
import { useReview } from '@/src/lib/review-context';
import { colors } from '@/src/theme';

/**
 * HomeScreen - Learning Dashboard
 *
 * Main entry point showing:
 * - Due reviews summary card
 * - Session preview card with cognitive capacity
 */
export default function HomeScreen() {
  const router = useRouter();
  const { recommendation, getPreview } = useSession();
  const { dueReviews } = useReview();

  // Calculate session preview from due reviews
  // For now, we use due reviews and no new concepts (new concepts would come from project selection)
  const reviews = dueReviews.map((r) => ({ conceptId: r.conceptId }));
  const newConcepts: { conceptId: string }[] = []; // No new concepts on home screen
  const preview = getPreview(reviews, newConcepts);

  // Determine warning message from recommendation
  const warningMessage =
    recommendation?.type === 'skip'
      ? recommendation.reason
      : recommendation?.type === 'review_only'
        ? recommendation.reason
        : undefined;

  // Map session recommendation type to LearningSessionType
  const sessionType =
    recommendation?.type === 'skip' || recommendation?.type === 'review_only'
      ? 'review_only'
      : preview.sessionType;

  // Handle start session
  const handleStartSession = () => {
    // Navigate to review session (for now)
    router.push('/(auth)/review');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome to your learning journey</Text>
        </View>

        {/* Due Reviews Card */}
        <DueReviewsCard />

        {/* Session Preview Card */}
        <SessionPreviewCard
          reviewCount={preview.reviewCount}
          newConceptCount={preview.newConceptCount}
          estimatedMinutes={preview.estimatedMinutes}
          sessionType={sessionType}
          warningMessage={warningMessage}
          onStartSession={handleStartSession}
          testID="home-session-preview"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
