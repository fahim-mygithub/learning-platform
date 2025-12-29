/**
 * Project Detail Screen
 *
 * Displays detailed view of a single project with:
 * - Header with project title
 * - Description section (if present)
 * - Progress visualization (ProgressCircle)
 * - Edit button -> opens edit modal/sheet
 * - Delete button -> shows confirmation Modal
 * - Sources placeholder section (for Phase 1.5)
 *
 * Accessible and follows WCAG 2.1 AAA guidelines.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useProjects } from '@/src/lib/projects-context';
import { getProject, deleteProject, updateProject } from '@/src/lib/projects';
import {
  Button,
  Card,
  Progress,
  Modal,
  useToast,
  colors,
  spacing,
  fontSize,
  fontWeight,
} from '@/src/components/ui';
import type { Project } from '@/src/types';

/**
 * Minimum touch target size per WCAG 2.1 AAA guidelines
 */
const MIN_TOUCH_TARGET = 44;

/**
 * Project Detail Screen Component
 */
export default function ProjectDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshProjects } = useProjects();
  const { showToast } = useToast();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Load project data on mount
   */
  useEffect(() => {
    async function loadProject() {
      if (!id) {
        setError(new Error('Project ID is required'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await getProject(id);

        if (fetchError) {
          setError(fetchError);
          setProject(null);
        } else if (!data) {
          setError(new Error('Project not found'));
          setProject(null);
        } else {
          setProject(data);
          setEditTitle(data.title);
          setEditDescription(data.description ?? '');
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err : new Error('Failed to load project'));
        setProject(null);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  /**
   * Open edit modal
   */
  const handleOpenEdit = useCallback(() => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description ?? '');
    }
    setShowEditModal(true);
  }, [project]);

  /**
   * Close edit modal
   */
  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
  }, []);

  /**
   * Save edit changes
   */
  const handleSaveEdit = useCallback(async () => {
    if (!id || !project) return;

    setIsSaving(true);

    try {
      const { data, error: updateError } = await updateProject(id, {
        title: editTitle,
        description: editDescription || null,
      });

      if (updateError) {
        showToast('error', 'Failed to update project');
      } else if (data) {
        setProject(data);
        showToast('success', 'Project updated successfully');
        setShowEditModal(false);
        await refreshProjects();
      }
    } catch (err) {
      console.error('Error updating project:', err);
      showToast('error', 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  }, [id, project, editTitle, editDescription, showToast, refreshProjects]);

  /**
   * Open delete confirmation modal
   */
  const handleOpenDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  /**
   * Close delete confirmation modal
   */
  const handleCloseDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  /**
   * Confirm and execute delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!id) return;

    setIsDeleting(true);

    try {
      const { error: deleteError } = await deleteProject(id);

      if (deleteError) {
        showToast('error', 'Failed to delete project');
        setIsDeleting(false);
      } else {
        showToast('success', 'Project deleted successfully');
        await refreshProjects();
        router.back();
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      showToast('error', 'Failed to delete project');
      setIsDeleting(false);
    }
  }, [id, showToast, refreshProjects, router]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          testID="loading-indicator"
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <View testID="error-state" style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Project not found</Text>
        <Text style={styles.errorMessage}>
          {error?.message ?? 'The project you are looking for does not exist.'}
        </Text>
        <Button
          testID="back-button"
          variant="outline"
          onPress={handleBack}
          accessibilityLabel="Go back to projects list"
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text
            testID="project-title"
            style={styles.title}
            accessibilityRole="header"
          >
            {project.title}
          </Text>
        </View>

        {/* Description Section */}
        {project.description && project.description.trim() !== '' && (
          <Card testID="project-description" style={styles.descriptionCard}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{project.description}</Text>
          </Card>
        )}

        {/* Progress Section */}
        <Card style={styles.progressCard}>
          <Text style={styles.sectionLabel}>Progress</Text>
          <View style={styles.progressContainer}>
            <Progress
              testID="progress-circle"
              variant="circle"
              value={project.progress}
              size={120}
              showLabel
              color={colors.primary}
              accessibilityLabel={`Progress: ${project.progress}%`}
            />
          </View>
        </Card>

        {/* Sources Placeholder Section */}
        <Card testID="sources-section" style={styles.sourcesCard}>
          <Text style={styles.sectionLabel}>Sources</Text>
          <View style={styles.sourcesPlaceholder}>
            <Text style={styles.placeholderText}>
              Sources management coming soon in Phase 1.5
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            testID="edit-button"
            style={[styles.actionButton, styles.editButton]}
            onPress={handleOpenEdit}
            accessibilityLabel="Edit project"
            accessibilityRole="button"
            accessibilityHint="Opens edit form for this project"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>

          <Pressable
            testID="delete-button"
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleOpenDelete}
            accessibilityLabel="Delete project"
            accessibilityRole="button"
            accessibilityHint="Opens confirmation dialog to delete this project"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          testID="edit-modal"
          visible={showEditModal}
          onClose={handleCloseEdit}
          title="Edit Project"
          actions={
            <>
              <Button
                testID="edit-cancel-button"
                variant="outline"
                onPress={handleCloseEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                testID="edit-save-button"
                onPress={handleSaveEdit}
                disabled={isSaving || !editTitle.trim()}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          }
        >
          <View style={styles.editForm}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              testID="edit-title-input"
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Project title"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="sentences"
              returnKeyType="next"
              editable={!isSaving}
            />

            <Text style={[styles.inputLabel, styles.inputLabelMargin]}>
              Description (optional)
            </Text>
            <TextInput
              testID="edit-description-input"
              style={[styles.textInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Add a description..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          testID="delete-modal"
          visible={showDeleteModal}
          onClose={handleCloseDelete}
          title="Delete Project"
          closeOnBackdrop={!isDeleting}
          actions={
            <>
              <Button
                testID="delete-cancel-button"
                variant="outline"
                onPress={handleCloseDelete}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                testID="delete-confirm-button"
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                style={styles.deleteConfirmButton}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          }
        >
          <Text style={styles.deleteWarning}>
            Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be
            undone.
          </Text>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },

  // Header
  header: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Description Card
  descriptionCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: fontSize.base * 1.5,
  },

  // Progress Card
  progressCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },

  // Sources Card
  sourcesCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  sourcesPlaceholder: {
    paddingVertical: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  actionButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  deleteButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },

  // Error state
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },

  // Edit Modal
  editForm: {
    paddingTop: spacing[2],
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing[1],
  },
  inputLabelMargin: {
    marginTop: spacing[4],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 100,
  },

  // Delete Modal
  deleteWarning: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: fontSize.base * 1.5,
  },
  deleteConfirmButton: {
    backgroundColor: colors.error,
  },
});
