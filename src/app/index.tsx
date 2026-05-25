import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// 1. THE RELIABLE OFFLINE ENGINE
const OFFLINE_DICTIONARY = [
  { language_code: 'oshikwanyama', native_word: 'nawa', english_translation: 'good' },
  { language_code: 'oshikwanyama', native_word: 'wa aluka', english_translation: 'hello' },
  { language_code: 'oshikwanyama', native_word: 'ongula', english_translation: 'morning' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [words, setWords] = useState(OFFLINE_DICTIONARY);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // 2. VOICE-TO-TEXT: Interactive Input
  useEffect(() => {
    if (Platform.OS === 'web' && ('webkitSpeechRecognition' in window)) {
      const rec = new (window as any).webkitSpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e: any) => setInputText(e.results[0][0].transcript);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  // 3. SUPABASE SYNC: Fetching the "Live Brain"
  const fetchPhrases = async () => {
    try {
      const { data } = await supabase
        .from('universal_dictionary')
        .select('language_code, native_word, english_translation');
      
      if (data && data.length > 0) {
        setWords([...OFFLINE_DICTIONARY, ...data]);
      }
    } catch (e) {
      console.log("Offline mode active: Using local dictionary.");
    }
  };

  useEffect(() => { fetchPhrases(); }, []);

  // 4. THE INTERACTIVE TRANSLATOR
  const handleTranslate = () => {
    const term = inputText.toLowerCase().trim();
    const match = words.find(w => 
      w.english_translation.toLowerCase() === term || 
      w.native_word.toLowerCase() === term
    );
    
    if (match) {
      const result = match.native_word; 
      setTranslatedText(result);
      Speech.speak(result); // Speaking the result out loud
    } else {
      setTranslatedText("Translation not found.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Toloka</Text>
        
        <View style={styles.card}>
          <TextInput 
            style={styles.input} 
            value={inputText} 
            onChangeText={setInputText} 
            placeholder="Type or speak..." 
            placeholderTextColor="#555"
          />
          <TouchableOpacity 
            style={[styles.mic, isListening && styles.micActive]} 
            onPress={() => { setIsListening(true); recognition?.start(); }}
          >
            <Text style={styles.icon}>🎤</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={handleTranslate}>
          <Text style={styles.btnText}>Translate</Text>
        </TouchableOpacity>

        {translatedText !== "" && (
          <View style={styles.resultBox}>
            <Text style={styles.result}>{translatedText}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0813' },
  scroll: { alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 48, fontWeight: '900', color: '#00f3ff', marginBottom: 40 },
  card: { flexDirection: 'row', width: '100%', alignItems: 'center'