import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

const OFFLINE_DB = [
  { native: 'teka', english: 'to draw water' },
  { native: 'teleka', english: 'to cook' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isOshikwanyamaToEnglish, setIsOshikwanyamaToEnglish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Input Mic: Web Speech API for Online, simple toggle for Offline
  const handleInputMicPress = () => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        setInputText(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.start();
    } else {
      alert("Offline Mode: Microphone ready.");
      setIsListening(!isListening);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    const cleanInput = inputText.trim().toLowerCase();

    try {
      const offlineMatch = OFFLINE_DB.find(item => 
        isOshikwanyamaToEnglish ? item.native === cleanInput : item.english === cleanInput
      );

      if (offlineMatch) {
        setTranslatedText(isOshikwanyamaToEnglish ? offlineMatch.english : offlineMatch.native);
      } else if (navigator.onLine) {
        const { data: mapping } = await supabase.from('translations').select('*').eq('english_phrase', cleanInput).maybeSingle();
        if (mapping) {
          const { data: result } = await supabase.rpc('build_full_sentence', { p_subject_root: mapping.subject_root, p_verb: mapping.verb_root, p_tense: mapping.tense_prefix });
          setTranslatedText(result?.[0]?.full_sentence || "Result error");
        } else {
          setTranslatedText("Not found in system.");
        }
      } else {
        setTranslatedText("No match found (Offline).");
      }
    } catch (e) {
      setTranslatedText("Engine error.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Toloka</Text>
        <TouchableOpacity style={styles.swapButton} onPress={() => setIsOshikwanyamaToEnglish(!isOshikwanyamaToEnglish)}>
          <Text style={styles.swapText}>{isOshikwanyamaToEnglish ? 'Oshikwanyama ➔ English' : 'English ➔ Oshikwanyama'}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type or use mic..." placeholderTextColor="#4a4d61" />
            <TouchableOpacity style={styles.micButton} onPress={handleInputMicPress}>
              <Text>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{translatedText}</Text>
              <TouchableOpacity onPress={() => Speech.speak(translatedText)}><Text style={{color: '#ff007f'}}>🔊 Speak</Text></TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
            <Text style={styles.buttonText}>Translate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 60 },
  title: { fontSize: 50, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
  swapButton: { padding: 12, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
  swapText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#0d0b18', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, fontSize: 20, color: '#fff', borderBottomWidth: 1, borderBottomColor: '#221e3d', paddingBottom: 10 },
  micButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  resultBox: { marginBottom: 20, padding: 15, backgroundColor: '#1a1829', borderRadius: 10 },
  resultText: { fontSize: 28, color: '#00f3ff', fontWeight: '700' },
  mainButton: { backgroundColor: '#00f3ff', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#05030a', fontWeight: '900', fontSize: 18 }
} as any;