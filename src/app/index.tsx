import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.flag}>🇳🇦</Text>
          <Text style={styles.title}>Namibia Language App</Text>
          <Text style={styles.subtitle}>Status: Web Dashboard Active 🌐</Text>
          <View style={styles.line} />
          
          <Text style={styles.bodyText}>
            Welcome to the centralized Namibian language and cultural learning platform.
          </Text>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.buttonText}>Explore Languages 🚀</Text>
          </TouchableOpacity>

          <View style={styles.line} />
          <Text style={styles.footer}>Environment: Local Offline Server</Text>
          <Text style={styles.developer}>Developer: egabrella231</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1f2937',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#374151',
  },
  flag: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 10,
  },
  line: {
    width: '100%',
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  developer: {
    fontSize: 13,
    color: '#60a5fa',
    fontWeight: '500',
  },
});
