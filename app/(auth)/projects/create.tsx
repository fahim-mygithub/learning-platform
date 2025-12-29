/**
 * Create Project Screen
 *
 * A form screen for creating new learning projects.
 * Features:
 * - Title input (required) with validation
 * - Description textarea (optional)
 * - Submit button with loading state
 * - Cancel/back navigation
 * - Success toast on creation
 * - Keyboard avoidance for form
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useToast } from '@/src/components/ui/Toast';
import { useAuth } from '@/src/lib/auth-context';
import { useProjects } from '@/src/lib/projects-context';
import { createProject } from '@/src/lib/projects';
import { colors, spacing } from '@/src/theme';

/**
 * Create Project Screen Component
 *
 * Displays a form for creating a new project with title and optional description.
 * Handles validation, submission, and navigation.
 */
export default function CreateProjectScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshProjects } = useProjects();
  const { showToast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate form before submission
   */
  const validateForm = useCallback((): boolean => {
    // Title is required and cannot be only whitespace
    if (!title.trim()) {
      setTitleError('Title is required');
      return false;
    }
    return true;
  }, [title]);

  /**
   * Clear title error when user types
   */
  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    if (titleError) {
      setTitleError(null);
    }
  }, [titleError]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Ensure user is authenticated
    if (!user) {
      showToast('error', 'You must be logged in to create a project');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await createProject(user.id, {
        title: title.trim(),
        description: description.trim() || null,
      });

      if (error || !data) {
        showToast('error', 'Failed to create project');
        return;
      }

      // Refresh projects list
      await refreshProjects();

      // Show success toast
      showToast('success', 'Project created successfully');

      // Navigate to the new project
      router.replace(`/projects/${data.id}`);
    } catch {
      showToast('error', 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, user, validateForm, refreshProjects, showToast, router]);

  /**
   * Handle cancel button press
   */
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Input
            testID="title-input"
            label="Title"
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Enter project title"
            error={titleError ?? undefined}
            disabled={isSubmitting}
            autoFocus
            returnKeyType="next"
            accessibilityLabel="Project title"
            accessibilityHint="Enter a title for your project. This field is required."
          />

          <Input
            testID="description-input"
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter project description (optional)"
            multiline
            numberOfLines={4}
            disabled={isSubmitting}
            inputStyle={styles.descriptionInput}
            accessibilityLabel="Project description"
            accessibilityHint="Enter an optional description for your project."
          />

          <View style={styles.buttonContainer}>
            <Button
              testID="cancel-button"
              variant="outline"
              onPress={handleCancel}
              disabled={isSubmitting}
              style={styles.cancelButton}
              accessibilityLabel="Cancel"
              accessibilityHint="Go back without creating a project"
            >
              Cancel
            </Button>

            <Button
              testID="create-button"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.createButton}
              accessibilityLabel="Create project"
              accessibilityHint="Submit the form to create a new project"
            >
              Create Project
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[4],
  },
  form: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[6],
    gap: spacing[4],
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
  },
  createButton: {
    flex: 1,
    minHeight: 44,
  },
});
