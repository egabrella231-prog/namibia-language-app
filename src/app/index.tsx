import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('Oshikwanyama → English');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dictionary?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResult(data.success ? data.record.english_translation : "No translation found.");
    } catch (e) {
      setResult("Error connecting to database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Namibia Speech Bridge</Text>
      
      {/* Language Switcher */}
      <TouchableOpacity style={styles.switchButton} onPress={() => setDirection(d => d.includes('Oshi') ? 'English → Oshikwanyama' : 'Oshikwanyama → English')}>
        <Text style={styles.switchText}>{direction} ⇄</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Type a word..." value={query} onChangeText={setQuery} />
      
      <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
        <Text style={styles.buttonText}>Translate</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.resultLabel}>Translation:</Text>
        {loading ? <ActivityIndicator color="#007AFF" /> : <Text style={styles.resultText}>{result}</Text>}
        
        <View style={styles.audioRow}>
          <TouchableOpacity onPress={() => Speech.speak(query)}><Text>🎤 Input</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => Speech.speak(result)}><Text>🔊 Result</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  switchButton: { backgroundColor: '#e9ecef', padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  switchText: { fontWeight: '600', color: '#495057' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6', marginBottom: 15 },
  mainButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { marginTop: 30, padding: 20, backgroundColor: '#fff', borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
  resultLabel: { color: '#666', marginBottom: 10 },
  resultText: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  audioRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: '#eee', paddingTop: 15 }
});