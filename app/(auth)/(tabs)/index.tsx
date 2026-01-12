import { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/lib/auth-context';
import { useProjects } from '@/src/lib/projects-context';
import { useTypography } from '@/src/lib/typography-context';
import { type ColorTheme } from '@/src/theme/colors';
import { entrance, stagger } from '@/src/theme/animations';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import {
  XPDisplay,
  StreakDisplay,
  MasteryRing,
  LevelBadge,
} from '@/src/components/engagement';

/**
 * Mock engagement data - replace with real context when available
 */
const MOCK_ENGAGEMENT = {
  totalXp: 1250,
  currentStreak: 7,
  level: 5,
  progressToNextLevel: 65,
  recentActivity: [
    { id: '1', conceptName: 'React Hooks', type: 'quiz_correct', xp: 25, timestamp: '2 hours ago' },
    { id: '2', conceptName: 'State Management', type: 'chapter_complete', xp: 20, timestamp: '3 hours ago' },
    { id: '3', conceptName: 'TypeScript Generics', type: 'synthesis_complete', xp: 75, timestamp: 'Yesterday' },
  ] as const,
};

/**
 * Get XP type display label
 */
function getActivityTypeLabel(type: string): string {
  switch (type) {
    case 'quiz_correct':
      return 'Quiz';
    case 'chapter_complete':
      return 'Chapter';
    case 'synthesis_complete':
      return 'Synthesis';
    case 'streak_bonus':
      return 'Streak Bonus';
    case 'perfect_score':
      return 'Perfect Score';
    default:
      return 'Activity';
  }
}

/**
 * HomeScreen - Learning Dashboard with Luminous Focus Design
 *
 * Premium gaming aesthetic with:
 * - Stats displayed prominently with glowing effects
 * - Mastery rings that feel like achievement badges
 * - Dark background with luminous highlights
 */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();

  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get display name from user
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner';

  // Get the most recent project with analysis completed for "Continue Learning"
  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    // Find an active project, or fall back to the first project
    return projects.find(p => p.status === 'active') || projects[0];
  }, [projects]);

  // Calculate overall mastery progress (mock for now)
  const masteryProgress = 45; // Would be calculated from actual learning data

  // Handle navigation to project
  const handleContinueLearning = () => {
    if (activeProject) {
      router.push(`/(auth)/(tabs)/projects/${activeProject.id}`);
    }
  };

  // Handle navigation to create project
  const handleCreateProject = () => {
    router.push('/(auth)/(tabs)/projects/');
  };

  // Empty state when no projects exist
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Text style={styles.emptyStateIcon}>{'\uD83D\uDE80'}</Text>
      </View>
      <Text style={styles.emptyStateTitle}>Start Your Learning Journey</Text>
      <Text style={styles.emptyStateDescription}>
        Create your first project to unlock personalized learning experiences,
        track your progress, and earn XP as you master new concepts.
      </Text>
      <Button
        onPress={handleCreateProject}
        variant="primary"
        size="large"
        style={styles.emptyStateButton}
        testID="create-first-project-button"
      >
        Create Your First Project
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section - Entrance animation */}
        <Animated.View
          style={styles.header}
          entering={FadeInDown.duration(entrance.primary).delay(0)}
        >
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </Animated.View>

        {/* Stats Row - Glass Card - Staggered entrance */}
        <Animated.View entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements)}>
          <Card style={styles.statsCard} testID="stats-card">
          {/* Gradient overlay effect using semi-transparent background */}
          <View style={[styles.statsGradient, { backgroundColor: `${colors.primary}10` }]} />
          <View style={styles.statsRow}>
            {/* XP Display */}
            <View style={styles.statItem}>
              <XPDisplay
                xp={MOCK_ENGAGEMENT.totalXp}
                size="medium"
                showIcon={true}
                testID="dashboard-xp"
              />
            </View>

            {/* Level Badge */}
            <View style={styles.statItem}>
              <LevelBadge
                level={MOCK_ENGAGEMENT.level}
                progressToNext={MOCK_ENGAGEMENT.progressToNextLevel}
                size="medium"
                showProgress={true}
                testID="dashboard-level"
              />
            </View>

            {/* Streak Display */}
            <View style={styles.statItem}>
              <StreakDisplay
                streak={MOCK_ENGAGEMENT.currentStreak}
                isActive={true}
                size="small"
                showLabel={false}
                testID="dashboard-streak"
              />
            </View>
          </View>
          </Card>
        </Animated.View>

        {/* Conditional Content: Projects or Empty State */}
        {!projectsLoading && projects.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Continue Learning Card - Staggered entrance */}
            {activeProject && (
              <Animated.View entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 2)}>
                <Pressable
                  onPress={handleContinueLearning}
                  style={({ pressed }) => [
                    styles.continueLearningCard,
                    pressed && styles.cardPressed,
                  ]}
                  testID="continue-learning-card"
                >
                {/* Gradient overlay effect using semi-transparent background */}
                <View style={[styles.continueGradient, { backgroundColor: `${colors.primary}12` }]} />

                <View style={styles.continueContent}>
                  {/* Left side: Project info */}
                  <View style={styles.continueInfo}>
                    <Text style={styles.continueLabel}>Continue Learning</Text>
                    <Text style={styles.projectTitle} numberOfLines={2}>
                      {activeProject.title}
                    </Text>
                    <Text style={styles.projectMeta}>
                      {activeProject.status === 'active'
                        ? 'Ready to learn'
                        : activeProject.status === 'draft'
                          ? 'Add sources to begin'
                          : activeProject.status === 'completed'
                            ? 'Completed'
                            : 'Archived'}
                    </Text>
                    <Button
                      onPress={handleContinueLearning}
                      variant="primary"
                      size="medium"
                      style={styles.continueButton}
                      testID="start-session-button"
                    >
                      Start Session
                    </Button>
                  </View>

                  {/* Right side: Mastery Ring */}
                  <View style={styles.masteryContainer}>
                    <MasteryRing
                      progress={masteryProgress}
                      size={100}
                      showLabel={true}
                      label="Mastery"
                      showGlow={true}
                      testID="mastery-ring"
                    />
                  </View>
                </View>
                </Pressable>
              </Animated.View>
            )}

            {/* Recent Activity Section - Staggered entrance */}
            <Animated.View
              style={styles.activitySection}
              entering={FadeInDown.duration(entrance.secondary).delay(stagger.formElements * 3)}
            >
              <Text style={styles.sectionTitle}>Recent Activity</Text>

              {MOCK_ENGAGEMENT.recentActivity.length > 0 ? (
                <Card style={styles.activityCard} testID="activity-card">
                  {MOCK_ENGAGEMENT.recentActivity.map((activity, index) => (
                    <View
                      key={activity.id}
                      style={[
                        styles.activityItem,
                        index < MOCK_ENGAGEMENT.recentActivity.length - 1 && styles.activityItemBorder,
                      ]}
                    >
                      <View style={styles.activityLeft}>
                        <Text style={styles.activityConcept} numberOfLines={1}>
                          {activity.conceptName}
                        </Text>
                        <View style={styles.activityMeta}>
                          <View style={styles.activityTypeBadge}>
                            <Text style={styles.activityTypeText}>
                              {getActivityTypeLabel(activity.type)}
                            </Text>
                          </View>
                          <Text style={styles.activityTime}>{activity.timestamp}</Text>
                        </View>
                      </View>
                      <View style={styles.activityRight}>
                        <Text style={styles.activityXp}>+{activity.xp}</Text>
                        <Text style={styles.activityXpLabel}>XP</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              ) : (
                <Card style={styles.emptyActivityCard} testID="empty-activity-card">
                  <Text style={styles.emptyActivityText}>
                    No recent activity. Start a learning session to earn XP!
                  </Text>
                </Card>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Create dynamic styles based on theme colors
 * Implements "Luminous Focus" design direction
 */
function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 32,
    },
    // Header styles
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    welcomeText: {
      fontSize: 16,
      fontFamily: 'Lexend_400Regular',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    userName: {
      fontSize: 32,
      fontFamily: 'Lexend_700Bold',
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    // Stats card styles
    statsCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 0,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
    },
    statsGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 12,
    },
    statItem: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Continue Learning card styles
    continueLearningCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      borderRadius: 16,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: `${colors.primary}40`,
      overflow: 'hidden',
      // Shadow for glow effect
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    continueGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    continueContent: {
      flexDirection: 'row',
      padding: 20,
      alignItems: 'center',
    },
    continueInfo: {
      flex: 1,
      paddingRight: 16,
    },
    continueLabel: {
      fontSize: 12,
      fontFamily: 'Lexend_500Medium',
      fontWeight: '500',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    projectTitle: {
      fontSize: 20,
      fontFamily: 'Lexend_600SemiBold',
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
      lineHeight: 26,
    },
    projectMeta: {
      fontSize: 14,
      fontFamily: 'Lexend_400Regular',
      color: colors.textSecondary,
      marginBottom: 16,
    },
    continueButton: {
      alignSelf: 'flex-start',
    },
    masteryContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Activity section styles
    activitySection: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Lexend_600SemiBold',
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    activityCard: {
      padding: 0,
      overflow: 'hidden',
    },
    activityItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    activityItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityLeft: {
      flex: 1,
      paddingRight: 12,
    },
    activityConcept: {
      fontSize: 16,
      fontFamily: 'Lexend_500Medium',
      fontWeight: '500',
      color: colors.text,
      marginBottom: 6,
    },
    activityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    activityTypeBadge: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    activityTypeText: {
      fontSize: 11,
      fontFamily: 'Lexend_500Medium',
      fontWeight: '500',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activityTime: {
      fontSize: 12,
      fontFamily: 'Lexend_400Regular',
      color: colors.textTertiary,
    },
    activityRight: {
      alignItems: 'flex-end',
    },
    activityXp: {
      fontSize: 18,
      fontFamily: 'Lexend_700Bold',
      fontWeight: '700',
      color: colors.xpGold || '#fbbf24',
    },
    activityXpLabel: {
      fontSize: 10,
      fontFamily: 'Lexend_500Medium',
      fontWeight: '500',
      color: colors.textTertiary,
      textTransform: 'uppercase',
    },
    emptyActivityCard: {
      padding: 24,
      alignItems: 'center',
    },
    emptyActivityText: {
      fontSize: 14,
      fontFamily: 'Lexend_400Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Empty state styles
    emptyStateContainer: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 40,
      paddingBottom: 20,
    },
    emptyStateIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      // Glow effect
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    emptyStateIcon: {
      fontSize: 48,
    },
    emptyStateTitle: {
      fontSize: 24,
      fontFamily: 'Lexend_700Bold',
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyStateDescription: {
      fontSize: 16,
      fontFamily: 'Lexend_400Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    emptyStateButton: {
      minWidth: 240,
    },
  });
}
