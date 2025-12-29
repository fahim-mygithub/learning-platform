/**
 * Projects List Screen
 *
 * Displays a list of the user's learning projects with:
 * - Loading skeleton state
 * - Empty state with illustration and CTA
 * - FlatList of project cards showing title, progress, last accessed
 * - Pull-to-refresh functionality
 * - FAB for creating new projects
 * - Error state with retry option
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
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useProjects } from '@/src/lib/projects-context';
import { Card, Progress, Button, colors, spacing, fontSize, fontWeight } from '@/src/components/ui';
import type { Project } from '@/src/types';

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET = 44;

/**
 * Number of skeleton cards to show while loading
 */
const SKELETON_CARD_COUNT = 3;

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
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Format as date for older entries
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton(): React.ReactElement {
  return (
    <View testID="loading-skeleton" style={styles.container}>
      <View style={styles.listContent}>
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <Card
            key={index}
            testID={`skeleton-card-${index}`}
            style={styles.skeletonCard}
          >
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonProgress} />
            <View style={styles.skeletonMeta} />
          </Card>
        ))}
      </View>
    </View>
  );
}

/**
 * Empty state component with illustration and CTA
 */
function EmptyState({ onCreatePress }: { onCreatePress: () => void }): React.ReactElement {
  return (
    <View testID="empty-state" style={styles.emptyState}>
      <View testID="empty-state-illustration" style={styles.emptyIllustration}>
        {/* Simple placeholder illustration using shapes */}
        <View style={styles.illustrationCircle} />
        <View style={styles.illustrationLine1} />
        <View style={styles.illustrationLine2} />
      </View>
      <Text style={styles.emptyTitle}>No projects yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first learning project to get started
      </Text>
      <Button
        testID="empty-state-create-button"
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
}: {
  error: Error;
  onRetry: () => void;
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
 * Individual project card component
 */
function ProjectCard({
  project,
  onPress,
}: {
  project: Project;
  onPress: () => void;
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
      <Card style={styles.projectCard}>
        <Text style={styles.projectTitle} numberOfLines={2}>
          {project.title}
        </Text>

        <View style={styles.progressContainer}>
          <Progress
            testID={`project-card-${project.id}-progress`}
            variant="bar"
            value={project.progress}
            color={colors.primary}
          />
          <Text style={styles.progressText}>{project.progress}%</Text>
        </View>

        <Text style={styles.lastAccessed}>
          Last accessed: {lastAccessedText}
        </Text>
      </Card>
    </Pressable>
  );
}

/**
 * Floating Action Button for creating new projects
 */
function CreateProjectFAB({ onPress }: { onPress: () => void }): React.ReactElement {
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
   * Render individual project card
   */
  const renderProjectCard: ListRenderItem<Project> = useCallback(
    ({ item }) => (
      <ProjectCard
        project={item}
        onPress={() => handleProjectPress(item.id)}
      />
    ),
    [handleProjectPress]
  );

  /**
   * Extract unique key for each project
   */
  const keyExtractor = useCallback((item: Project) => item.id, []);

  // Show loading skeleton
  if (loading && projects.length === 0) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (error && projects.length === 0) {
    return <ErrorState error={error} onRetry={refreshProjects} />;
  }

  // Show empty state
  if (projects.length === 0) {
    return <EmptyState onCreatePress={handleCreateProject} />;
  }

  // Show project list
  return (
    <View style={styles.container}>
      <FlatList
        testID="projects-list"
        data={sortedProjects}
        renderItem={renderProjectCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshProjects}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <CreateProjectFAB onPress={handleCreateProject} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  listContent: {
    padding: spacing[4],
  },
  separator: {
    height: spacing[3],
  },

  // Project Card styles
  projectCardPressable: {
    borderRadius: 12,
  },
  projectCardPressed: {
    opacity: 0.7,
  },
  projectCard: {
    padding: spacing[4],
  },
  projectTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[3],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: spacing[2],
    minWidth: 40,
  },
  lastAccessed: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.backgroundSecondary,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    marginBottom: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing[2],
  },
  illustrationLine1: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginBottom: spacing[1],
  },
  illustrationLine2: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  emptyButton: {
    minWidth: 160,
  },

  // Error state styles
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.backgroundSecondary,
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

  // Loading skeleton styles
  skeletonCard: {
    marginBottom: spacing[3],
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing[3],
  },
  skeletonProgress: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing[2],
  },
  skeletonMeta: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
  },

  // FAB styles
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Elevation for Android
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.white,
    lineHeight: 32,
  },
});
