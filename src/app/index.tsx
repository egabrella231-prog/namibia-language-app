import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Picker } from 'react-native';
import * as Speech from 'expo-speech';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [langMode, setLangMode] = useState('wn-en');

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dictionary?search=${encodeURIComponent(inputText.trim())}`);
      const data = await response.json();
      if (data.success) {
        setResult(data.record);
      } else {
        setResult({ english_translation: "No match found in database." });
      }
    } catch (e) {
      setResult({ english_translation: "Error connecting to Neon database." });
    } finally {
      setLoading(false);
    }
  };

  const speak = () => {
    if (result?.english_translation) {
      Speech.speak(result.english_translation, { language: 'en' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Namibia Speech Bridge</Text>

      {/* Language Selector */}
      <Picker selectedValue={langMode} onValueChange={setLangMode} style={styles.picker}>
        <Picker.Item label="Oshikwanyama ↔ English" value="wn-en" />
        <Picker.Item label="English ↔ Oshikwanyama" value="en-wn" />
      </Picker>

      {/* Input Area */}
      <TextInput 
        style={styles.input} 
        placeholder="Type word or phrase..." 
        value={inputText} 
        onChangeText={setInputText} 
      />

      <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
        <Text style={styles.buttonText}>Translate & Query Neon</Text>
      </TouchableOpacity>

      {/* Output Card */}
      <View style={styles.card}>
        {loading ? <ActivityIndicator /> : (
          <>
            <Text style={styles.resultLabel}>Translation:</Text>
            <Text style={styles.resultText}>{result?.english_translation || '---'}</Text>
            {result?.english_translation && (
              <TouchableOpacity style={styles.speakerButton} onPress={speak}>
                <Text>🔊 Speak</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f9fafb', flexGrow: 1 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  picker: { backgroundColor: '#fff', marginBottom: 20 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  mainButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  card: { marginTop: 20, padding: 20, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center' },
  resultLabel: { color: '#666', marginBottom: 5 },
  resultText: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  speakerButton: { padding: 10, backgroundColor: '#e5e7eb', borderRadius: 5 }
});