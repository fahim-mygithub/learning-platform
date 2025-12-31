import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DueReviewsCard } from '@/src/components/review';
import { colors } from '@/src/theme';

/**
 * HomeScreen - Learning Dashboard
 *
 * Main entry point showing:
 * - Due reviews summary card
 * - (Future: Recent projects, learning stats)
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome to your learning journey</Text>
        </View>

        {/* Due Reviews Card */}
        <DueReviewsCard />

        {/* Placeholder for future content */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Your learning insights will appear here
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  placeholder: {
    margin: 16,
    padding: 24,
    backgroundColor: colors.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
