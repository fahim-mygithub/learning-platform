import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '@/src/lib/auth-context';

/**
 * Root Index - Initial Route Handler
 *
 * Redirects users based on authentication state:
 * - Authenticated users go to the main app (tabs)
 * - Unauthenticated users go to the public welcome screen
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen during session restoration
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect authenticated users to main app
  if (isAuthenticated) {
    return <Redirect href="/(auth)/(tabs)" />;
  }

  // Redirect unauthenticated users to public welcome screen
  return <Redirect href="/(public)" />;
}

const styles = StyleSheet.create({
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
