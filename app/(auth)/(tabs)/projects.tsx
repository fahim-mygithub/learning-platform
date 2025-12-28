import { StyleSheet, Text, View } from 'react-native';

export default function ProjectsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projects</Text>
      <Text style={styles.placeholder}>Your learning projects will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholder: {
    fontSize: 14,
    color: '#999',
  },
});
