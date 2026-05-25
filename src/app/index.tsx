import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<any[]>([]);

  // Fetch dictionary database items on startup
  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const { data, error } = await supabase.from('dictionary').select('*');
        if (error) throw error;
        if (data) setWords(data);
      } catch (err) {
        console.log('Database fetch notice:', err);
      }
    };
    fetchPhrases();
  }, []);

  // Optimized, Bulletproof Translation Matching Logic Engine
  const handleTranslate = () => {
    const cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) {
      setTranslatedText('');
      return;
    }

    setLoading(true);

    // 1. Isolate entries for the currently active language tab
    const currentLangWords = words.filter(
      (item) => String(item?.language || '').trim().toLowerCase() === selectedLanguage.toLowerCase()
    );

    let match;

    if (isLocalToEnglish) {
      // Local Language -> English translation lookup (Safe matching)
      match = currentLangWords.find(
        (w) => String(w?.translated_word || '').trim().toLowerCase() === cleanInput
      );
      setTranslatedText(match ? match.english_word : "Translation not found in dictionary database.");
    } else {
      // English -> Local Language translation lookup (Safe matching)
      match = currentLangWords.find(
        (w) => String(w?.english_word || '').trim().toLowerCase() === cleanInput
      );
      setTranslatedText(match ? match.translated_word : "Translation not found in dictionary database.");
    }

    setLoading(false);
  };

  // Text-To-Speech Pronunciation Module
  const handleVoicePronounce = () => {
    const textToSpeak = isLocalToEnglish ? inputText : translatedText;
    if (!textToSpeak || textToSpeak.includes("not found")) return;

    try {
      Speech.speak(textToSpeak, { pitch: 1.0, rate: 0.85 });
    } catch (e) {
      console.log('Audio track module exception:', e);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Title Banner */}
        <Text style={styles.title}>Toloka</Text>
        <Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text>

        {/* Language Selection Bar */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TARGET NAMIBIAN LANGUAGE:</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Oshikwanyama' && styles.activeLangButton]}
              onPress={() => setSelectedLanguage('Oshikwanyama')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonText]}>
                Oshikwanyama
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Otjiherero' && styles.activeLangButton]}
              onPress={() => setSelectedLanguage('Otjiherero')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Otjiherero' && styles.activeLangButtonText]}>
                Otjiherero
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Direction Toggle Control Bar */}
        <View style={styles.directionContainer}>
          <Text style={styles.directionText}>
            {isLocalToEnglish ? `${selectedLanguage} ➔ English` : `English ➔ ${selectedLanguage}`}
          </Text>
          <TouchableOpacity 
            style={styles.swapButton} 
            onPress={() => {
              setIsLocalToEnglish(!isLocalToEnglish);
              setInputText('');
              setTranslatedText('');
            }}
          >
            <Text style={styles.swapButtonText}>⇄ Swap Direction</Text>
          </TouchableOpacity>
        </View>

        {/* Input Text Translation Container Card */}
        <View style={styles.inputCard}>
          <View style={styles.textareaWrapper}>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder={isLocalToEnglish ? "Type or click the microphone to speak..." : "Type English text here..."}
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.micButton} onPress={handleVoicePronounce}>
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 10 }} />
          ) : (
            translatedText !== '' && (
              <View style={styles.translationOutputBox}>
                <Text style={styles.outputTextLabel}>Result:</Text>
                <Text style={styles.outputTextValue}>{translatedText}</Text>
              </View>
            )
          )}

          <TouchableOpacity style={styles.translateActionBtn} onPress={handleTranslate}>
            <Text style={styles.translateActionBtnText}>Translate Text</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1d1611' },
  scrollContainer: { padding: 24, width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center', paddingTop: 60 },
  title: { fontSize: 42, fontWeight: '900', color: '#3b82f6', letterSpacing: 1 },
  subtitle: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 2, marginBottom: 30 },
  card: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#6b7280', marginBottom: 10, letterSpacing: 0.5 },
  tabContainer: { flexDirection: 'row', gap: 10 },
  langButton: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  activeLangButton: { backgroundColor: '#2563eb' },
  langButtonText: { fontSize: 14, fontWeight: '700', color: '#4b5563' },
  activeLangButtonText: { color: '#fff' },
  directionContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  directionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  swapButton: { backgroundColor: '#dbeafe', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  swapButtonText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  inputCard: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 16, gap: 14 },
  textareaWrapper: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 100, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb' },
  textInput: { flex: 1, fontSize: 16, color: '#1f2937', padding: 0, textAlignVertical: 'top', minHeight: 80 },