import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the public welcome screen by default
  // This will be updated to check auth state and redirect accordingly
  return <Redirect href="/(public)" />;
}
