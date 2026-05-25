import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// Multi-tier Fallback Dictionary
const OFFLINE_DICTIONARY = [
  { english_word: 'good', translated_word: 'nawa', language: 'oshikwanyama' },
  { english_word: 'hello', translated_word: 'wa aluka', language: 'oshikwanyama' },
  { english_word: 'thank you', translated_word: 'tangi unene', language: 'oshikwanyama' },
  { english_word: 'good', translated_word: 'nawa', language: 'otjiherero' },
  { english_word: 'hello', translated_word: 'tjike', language: 'otjiherero' },
  { english_word: 'thank you', translated_word: 'okuhepa', language: 'otjiherero' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<any[]>(OFFLINE_DICTIONARY);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize database records on bootup
  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const { data, error } = await supabase.from('dictionary').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          setWords(data);
        }
      } catch (err) {
        console.log('Database operating offline securely via cache array fallback.', err);
        setWords(OFFLINE_DICTIONARY);
      }
    };
    fetchPhrases();
  }, []);

  // Secure Translation Computation Engine
  const handleTranslate = () => {
    const cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) {
      setTranslatedText('');
      return;
    }

    setLoading(true);

    const currentLangWords = words.filter(
      (item) => String(item?.language || '').trim().toLowerCase() === selectedLanguage.toLowerCase()
    );

    let match;

    if (isLocalToEnglish) {
      match = currentLangWords.find(
        (w) => String(w?.translated_word || '').trim().toLowerCase() === cleanInput
      );
      setTranslatedText(match ? match.english_word : "Translation not found in dictionary.");
    } else {
      match = currentLangWords.find(
        (w) => String(w?.english_word || '').trim().toLowerCase() === cleanInput
      );
      setTranslatedText(match ? match.translated_word : "Translation not found in dictionary.");
    }

    setLoading(false);
  };

  // Safe Text-To-Speech Pronunciation Module
  const handleVoicePronounce = () => {
    const textToSpeak = isLocalToEnglish ? inputText : translatedText;
    if (!textToSpeak || textToSpeak.includes("not found")) return;

    setIsSpeaking(true);
    try {
      // Direct Native Speech Engine Hook
      Speech.speak(textToSpeak, { 
        pitch: 1.0, 
        rate: 0.85,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    } catch (e) {
      console.log('TTS audio output stream interupt:', e);
      setIsSpeaking(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Neon Digital Header */}
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}>
            <Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text>
          </View>
        </View>

        {/* Target Language Card Selection */}
        <View style={styles.neonCard}>
          <Text style={styles.sectionLabel}>CHOOSE TARGET NAMIBIAN LANGUAGE</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.langButton, selectedLanguage === 'Oshikwanyama' && styles.activeLangButton]}
              onPress={() => setSelectedLanguage('Oshikwanyama')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonText]}>
                Oshikwanyama
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.langButton, selectedLanguage === 'Otjiherero' && styles.activeLangButton]}
              onPress={() => setSelectedLanguage('Otjiherero')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Otjiherero' && styles.activeLangButtonText]}>
                Otjiherero
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Direction Swap Toggle */}
        <View style={styles.directionWrapper}>
          <Text style={styles.directionTextText}>
            {isLocalToEnglish ? `${selectedLanguage} ➔ English` : `English ➔ ${selectedLanguage}`}
          </Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={styles.neonSwapButton} 
            onPress={() => {
              setIsLocalToEnglish(!isLocalToEnglish);
              setInputText('');
              setTranslatedText('');
            }}
          >
            <Text style={styles.swapButtonText}>⇄ Swap Path</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Functional Translation Deck */}
        <View style={[styles.mainConsoleCard, isFocused && styles.mainConsoleCardFocused]}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              multiline
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLocalToEnglish ? `Type ${selectedLanguage} term...` : "Type English text here..."}
              placeholderTextColor="#555861"
              value={inputText}
              onChangeText={setInputText}
            />
            
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.micAudioNode, isSpeaking && styles.micAudioNodeActive]} 
              onPress={handleVoicePronounce}
            >
              <Text style={styles.micEmojiIcon}>{isSpeaking ? "🔊" : "🎤"}</Text>
            </TouchableOpacity>
          </View>

          {/* Real-time Render Outputs */}
          {loading ? (
            <ActivityIndicator size="small" color="#00f3ff" style={{ marginVertical: 14 }} />
          ) : (
            translatedText !== '' && (
              <View style={styles.neonResultContainer}>
                <Text style={styles.resultHeaderTag}>TRANSLATION</Text>
                <Text style={styles.resultValueText}>{translatedText}</Text>
              </View>
            )
          )}

          {/* Action Translation Execution Node */}
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.glowingActionBtn} 
            onPress={handleTranslate}
          >
            <Text style={styles.glowingActionBtnText}>Translate System</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Responsive Cyberpunk Layout Architecture
  container: { flex: 1, backgroundColor: '#0a0813' },
  scrollContainer: { padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingTop: 50 },
  
  // Header Component Styling
  headerWrapper: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 46, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5, textShadowColor: '#00f3ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  neonBadge: { borderBottomWidth: 2, borderBottomColor: '#ff007f', paddingBottom: 4, marginTop: 4 },
  subtitle: { fontSize: 12, fontWeight: '800', color: '#ff007f', letterSpacing: 3 },
  
  // Language Input Shell Cards
  neonCard: { backgroundColor: '#131124', width: '100%', borderRadius: 16, padding: 18, borderHorizontalWidth: 1, borderColor: '#1f1c3a', marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#6a6b83', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', gap: 12 },
  langButton: { flex: 1, backgroundColor: '#1b1931', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  activeLangButton: { backgroundColor: '#15122b', borderColor: '#00f3ff', shadowColor: '#00f3ff', shadowOpacity: 0.3, shadowRadius: 8 },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#767891' },
  activeLangButtonText: { color: '#00f3ff', textShadowColor: '#00f3ff', textShadowRadius: 4 },
  
  // Interactive Swapping Controls
  directionWrapper: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 6 },
  directionTextText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  neonSwapButton: { backgroundColor: '#1b1931', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ff007f' },
  swapButtonText: { fontSize: 12, fontWeight: '700', color: '#ff007f' },
  
  // Translation Core Terminal Dashboard Elements
  mainConsoleCard: { backgroundColor: '#131124', width: '100%', borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: '#1f1c3a' },
  mainConsoleCardFocused: { borderColor: '#00f3ff', shadowColor: '#00f3ff', shadowOpacity: 0.15, shadowRadius: 12 },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 90, padding: 4 },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', padding: 0, minHeight: 75, fontWeight: '600' },
  
  // Animated Interactive Audio Nodes
  micAudioNode: { backgroundColor: '#1b1931', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderHorizontalWidth: 1, borderColor: '#00f3ff' },
  micAudioNodeActive: { backgroundColor: '#ff007f', borderColor: '#ff007f', transform: [{ scale: 1.05 }] },
  micEmojiIcon: { fontSize: 18 },
  
  // Clean Action Execution Control Blocks
  glowingActionBtn: { backgroundColor: '#00f3ff', width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4, shadowColor: '#00f3ff', shadowOpacity: 0.4, shadowRadius: 10 },
  glowingActionBtnText: { color: '#0a0813', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  
  // Neon Outputs Display Boxes
  neonResultContainer: { borderTopWidth: 1, borderTopColor: '#1f1c3a', paddingTop: 16, width: '100%', gap: 4 },
  resultHeaderTag: { fontSize: 11, fontWeight: '800', color: '#ff007f', letterSpacing: 2 },
  resultValueText: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginTop: 2 }
});