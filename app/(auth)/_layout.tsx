import { Redirect, Slot, useSegments, useRootNavigationState } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '@/src/lib/auth-context';

/**
 * Auth Layout - Protected Route Guard
 *
 * This layout wraps all authenticated routes and ensures:
 * - Unauthenticated users are redirected to sign-in
 * - Loading state is shown during session restoration
 * - Original destination is preserved for post-auth redirect
 */
export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Wait for navigation state to be ready
  if (!navigationState?.key) {
    return null;
  }

  // Show loading screen during session restoration
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect to sign-in if not authenticated
  // The redirect URL preserves the original destination for post-auth navigation
  if (!isAuthenticated) {
    // Build the current path from segments for post-auth redirect
    const currentPath = '/' + segments.join('/');
    return <Redirect href={`/(public)/sign-in?redirect=${encodeURIComponent(currentPath)}`} />;
  }

  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});
