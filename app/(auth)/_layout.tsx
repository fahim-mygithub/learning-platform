import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function AuthLayout() {
  // TODO: Add authentication check here
  // If user is not authenticated, redirect to sign-in
  // This will be implemented when Supabase auth is set up

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
});
