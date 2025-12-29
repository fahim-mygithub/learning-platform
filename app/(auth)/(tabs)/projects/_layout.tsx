import { Stack } from 'expo-router';

/**
 * Projects Stack Layout
 *
 * Provides Stack navigation within the Projects tab for:
 * - index: Projects list screen
 * - [id]: Project detail screen
 * - create: Create new project screen
 *
 * The Stack enables proper back navigation between list/detail/create flows.
 */
export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
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
  );
}
