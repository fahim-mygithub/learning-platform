/**
 * Projects List Screen - Luminous Focus Design
 *
 * Displays a grid of learning project cards with:
 * - 2-column grid layout on mobile
 * - MasteryRing badges showing progress
 * - Glass card effects with luminous highlights
 * - Premium gaming aesthetic with dark backgrounds
 * - Empty state with compelling CTA
 * - FAB for creating new projects
 *
 * Projects are sorted by most recently accessed.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Dimensions,
  type ListRenderItem,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useProjects } from '@/src/lib/projects-context';
import { useTypography } from '@/src/lib/typography-context';
import { type ColorTheme } from '@/src/theme/colors';
import { entrance, stagger } from '@/src/theme/animations';
import { Card, Button, spacing, fontSize, fontWeight } from '@/src/components/ui';
import { MasteryRing } from '@/src/components/engagement';
import type { Project } from '@/src/types';

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET = 44;

/**
 * Number of skeleton cards to show while loading
 */
const SKELETON_CARD_COUNT = 4;

/**
 * Number of columns in the grid
 */
const NUM_COLUMNS = 2;

/**
 * Get screen width for responsive layout
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Format relative time for last accessed display
 */
function formatLastAccessed(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Format as date for older entries
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Loading skeleton component with grid layout
 */
function LoadingSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }): React.ReactElement {
  return (
    <View testID="loading-skeleton" style={styles.container}>
      <View style={styles.gridContent}>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <View key={index} style={styles.gridItem}>
            <Card
              testID={`skeleton-card-${index}`}
              variant="glass"
              style={styles.skeletonCard}
            >
              <View style={styles.skeletonRing} />
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonMeta} />
            </Card>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Empty state component with illustration and CTA
 */
function EmptyState({ onCreatePress, styles, colors }: { onCreatePress: () => void; styles: ReturnType<typeof createStyles>; colors: ColorTheme }): React.ReactElement {
  return (
    <View testID="empty-state" style={styles.emptyState}>
      {/* Abstract illustration representing potential */}
      <View style={styles.emptyIllustration}>
        <View style={[styles.illustrationRing, { borderColor: colors.primary }]}>
          <View style={[styles.illustrationCore, { backgroundColor: colors.primary }]} />
        </View>
        <View style={[styles.illustrationGlow, { backgroundColor: colors.glowPrimary }]} />
      </View>

      <Text style={styles.emptyTitle}>Start Your Journey</Text>
      <Text style={styles.emptySubtitle}>
        Create your first project and unlock personalized learning paths
      </Text>

      <Button
        testID="empty-state-create-button"
        variant="glow"
        size="large"
        onPress={onCreatePress}
        accessibilityLabel="Create your first project"
        style={styles.emptyButton}
      >
        Create Project
      </Button>
    </View>
  );
}

/**
 * Error state component with retry option
 */
function ErrorState({
  error,
  onRetry,
  styles,
}: {
  error: Error;
  onRetry: () => void;
  styles: ReturnType<typeof createStyles>;
}): React.ReactElement {
  return (
    <View testID="error-state" style={styles.errorState}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Button
        testID="retry-button"
        variant="outline"
        onPress={onRetry}
        accessibilityLabel="Retry loading projects"
      >
        Try Again
      </Button>
    </View>
  );
}

/**
 * Individual project card with MasteryRing badge
 */
function ProjectCard({
  project,
  onPress,
  styles,
  colors,
}: {
  project: Project;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ColorTheme;
}): React.ReactElement {
  const lastAccessedText = formatLastAccessed(project.last_accessed_at);

  return (
    <Pressable
      testID={`project-card-${project.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${project.progress}% complete`}
      accessibilityHint="Double tap to open project"
      style={({ pressed }) => [
        styles.projectCardPressable,
        pressed && styles.projectCardPressed,
      ]}
    >
      <Card variant="glass" style={styles.projectCard}>
        {/* MasteryRing Badge */}
        <View style={styles.masteryRingContainer}>
          <MasteryRing
            progress={project.progress}
            size={72}
            showLabel={true}
            showGlow={project.progress > 0}
            testID={`project-card-${project.id}-mastery`}
          />
        </View>

        {/* Project Title */}
        <Text style={styles.projectTitle} numberOfLines={2}>
          {project.title}
        </Text>

        {/* Progress Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Progress</Text>
            <Text style={styles.metaValue}>{project.progress ?? 0}%</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{project.status}</Text>
          </View>
        </View>

        {/* Last Updated */}
        <Text style={styles.lastAccessed}>{lastAccessedText}</Text>
      </Card>
    </Pressable>
  );
}

/**
 * Floating Action Button for creating new projects
 */
function CreateProjectFAB({ onPress, styles, colors }: { onPress: () => void; styles: ReturnType<typeof createStyles>; colors: ColorTheme }): React.ReactElement {
  return (
    <Pressable
      testID="create-project-fab"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create new project"
      accessibilityHint="Double tap to create a new project"
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.fabPressed,
        { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET },
      ]}
    >
      <Text style={styles.fabIcon}>+</Text>
    </Pressable>
  );
}

/**
 * Projects List Screen Component
 */
export default function ProjectsScreen(): React.ReactElement {
  const router = useRouter();
  const { projects, loading, error, refreshProjects } = useProjects();

  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /**
   * Sort projects by most recently accessed
   */
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = new Date(a.last_accessed_at).getTime();
      const dateB = new Date(b.last_accessed_at).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [projects]);

  /**
   * Handle navigation to create project screen
   */
  const handleCreateProject = useCallback(() => {
    router.push('/projects/create');
  }, [router]);

  /**
   * Handle navigation to project detail screen
   */
  const handleProjectPress = useCallback(
    (projectId: string) => {
      router.push(`/projects/${projectId}`);
    },
    [router]
  );

  /**
   * Render individual project card with staggered entrance animation
   */
  const renderProjectCard: ListRenderItem<Project> = useCallback(
    ({ item, index }) => (
      <Animated.View
        style={[styles.gridItem, index % 2 === 0 && styles.gridItemLeft]}
        entering={FadeInDown.duration(entrance.secondary).delay(stagger.gridItems * index)}
      >
        <ProjectCard
          project={item}
          onPress={() => handleProjectPress(item.id)}
          styles={styles}
          colors={colors}
        />
      </Animated.View>
    ),
    [handleProjectPress, styles, colors]
  );

  /**
   * Extract unique key for each project
   */
  const keyExtractor = useCallback((item: Project) => item.id, []);

  // Show loading skeleton
  if (loading && projects.length === 0) {
    return <LoadingSkeleton styles={styles} />;
  }

  // Show error state
  if (error && projects.length === 0) {
    return <ErrorState error={error} onRetry={refreshProjects} styles={styles} />;
  }

  // Show empty state
  if (projects.length === 0) {
    return <EmptyState onCreatePress={handleCreateProject} styles={styles} colors={colors} />;
  }

  // Show project grid
  return (
    <View style={styles.container}>
      <FlatList
        testID="projects-list"
        data={sortedProjects}
        renderItem={renderProjectCard}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshProjects}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
      />
      <CreateProjectFAB onPress={handleCreateProject} styles={styles} colors={colors} />
    </View>
  );
}

/**
 * Create dynamic styles based on theme colors - Luminous Focus design
 */
function createStyles(colors: ColorTheme) {
  // Calculate card width for 2-column grid
  const gridPadding = spacing[4];
  const gridGap = spacing[3];
  const cardWidth = (SCREEN_WIDTH - gridPadding * 2 - gridGap) / 2;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    gridContent: {
      padding: gridPadding,
      paddingBottom: 80, // Extra space for FAB
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
    gridItem: {
      width: cardWidth,
    },
    gridItemLeft: {
      marginRight: gridGap,
    },
    rowSeparator: {
      height: spacing[3],
    },

    // Project Card styles - Luminous Focus
    projectCardPressable: {
      borderRadius: 16,
    },
    projectCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    projectCard: {
      padding: spacing[4],
      alignItems: 'center',
      minHeight: 200,
    },
    masteryRingContainer: {
      marginBottom: spacing[3],
    },
    projectTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing[3],
      lineHeight: fontSize.base * 1.3,
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    metaRow: {
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: fontSize.xs,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textSecondary,
    },
    metaDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
      marginHorizontal: spacing[3],
    },
    lastAccessed: {
      fontSize: fontSize.xs,
      color: colors.textTertiary,
    },

    // Empty state styles - Luminous Focus
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[6],
      backgroundColor: colors.background,
    },
    emptyIllustration: {
      width: 160,
      height: 160,
      marginBottom: spacing[8],
      justifyContent: 'center',
      alignItems: 'center',
    },
    illustrationRing: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    illustrationCore: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    illustrationGlow: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      opacity: 0.3,
    },
    emptyTitle: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing[2],
    },
    emptySubtitle: {
      fontSize: fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing[8],
      maxWidth: 280,
      lineHeight: fontSize.base * 1.5,
    },
    emptyButton: {
      minWidth: 200,
    },

    // Error state styles
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[6],
      backgroundColor: colors.background,
    },
    errorTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing[2],
    },
    errorMessage: {
      fontSize: fontSize.base,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing[6],
    },

    // Loading skeleton styles - Luminous Focus
    skeletonCard: {
      padding: spacing[4],
      alignItems: 'center',
      minHeight: 200,
    },
    skeletonRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.backgroundTertiary,
      marginBottom: spacing[3],
    },
    skeletonTitle: {
      width: '80%',
      height: 16,
      borderRadius: 4,
      backgroundColor: colors.backgroundTertiary,
      marginBottom: spacing[3],
    },
    skeletonMeta: {
      width: '60%',
      height: 12,
      borderRadius: 4,
      backgroundColor: colors.backgroundTertiary,
    },

    // FAB styles - Luminous Focus with glow
    fab: {
      position: 'absolute',
      right: spacing[4],
      bottom: spacing[6],
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      // Premium glow shadow
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      // Elevation for Android
      elevation: 10,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.95 }],
      shadowOpacity: 0.8,
      shadowRadius: 16,
    },
    fabIcon: {
      fontSize: 32,
      fontWeight: fontWeight.bold,
      color: colors.white,
      lineHeight: 36,
    },
  });
}
