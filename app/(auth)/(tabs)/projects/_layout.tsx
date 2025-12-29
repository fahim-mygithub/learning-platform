import { Stack } from 'expo-router';

import { ProjectsProvider } from '@/src/lib/projects-context';

/**
 * Projects Stack Layout
 *
 * Provides Stack navigation within the Projects tab for:
 * - index: Projects list screen
 * - [id]: Project detail screen
 * - create: Create new project screen
 *
 * The Stack enables proper back navigation between list/detail/create flows.
 * Wraps all screens in ProjectsProvider for shared projects state.
 */
export default function ProjectsLayout() {
  return (
    <ProjectsProvider>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Projects',
          }}
        />
        <Stack.Screen
          name="[id]"
          options={{
            title: 'Project Details',
          }}
        />
        <Stack.Screen
          name="create"
          options={{
            title: 'Create Project',
            presentation: 'modal',
          }}
        />
      </Stack>
    </ProjectsProvider>
  );
}
