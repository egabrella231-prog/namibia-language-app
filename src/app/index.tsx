import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// --- OFFLINE COMPREHENSIVE FALLBACK ENGINE ---
const OFFLINE_DICTIONARY = [
  { language_code: 'oshikwanyama', native_word: 'wa aluka', english_translation: 'hello' },
  { language_code: 'oshikwanyama', native_word: 'tangi', english_translation: 'thank you' },
  { language_code: 'oshikwanyama', native_word: 'nawa', english_translation: 'good' },
  { language_code: 'oshikwanyama', native_word: 'ongeipi', english_translation: 'how is it going' },
  { language_code: 'otjiherero', native_word: 'kora', english_translation: 'hello' },
  { language_code: 'otjiherero', native_word: 'ondangi', english_translation: 'thank you' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(false);
  const [words, setWords] = useState(OFFLINE_DICTIONARY);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Voice Speech-To-Text Setup (Writes text dynamically into the box)
  useEffect(() => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const WebSpeech = (window as any).webkitSpeechRecognition;
      const rec = new WebSpeech();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      
      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          setInputText(resultText);
        }
      };
      setRecognition(rec);
    }
  }, []);

  // Fetch words dynamically from Supabase
  const fetchPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from('universal_dictionary')
        .select('language_code, native_word, english_translation');
      
      if (!error && data && data.length > 0) {
        // Merge Supabase entries with the robust offline layout
        setWords([...OFFLINE_DICTIONARY, ...data]);
      } else {
        setWords(OFFLINE_DICTIONARY);
      }
    } catch (e) {
      setWords(OFFLINE_DICTIONARY); // Fail-safe offline array trigger
    }
  };

  useEffect(() => {
    fetchPhrases();
  }, []);

  // Mic Activation
  const handleMicPress = () => {
    if (!recognition) {
      alert("Voice speech entry requires Chrome/Safari browser configurations.");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // Translation Core Engine
  const handleTranslate = () => {
    let cleanInput = inputText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    if (!cleanInput) return;

    setLoading(true);
    
    const targetLangCode = selectedLanguage === 'Oshikwanyama' ? 'kwanyama' : 'herero';
    
    // Filter database array matching selected language targets
    const dictionaryPool = words.filter(w => w.language_code?.toLowerCase() === targetLangCode);

    let match = null;

    if (isLocalToEnglish) {
      // Native to English
      match = dictionaryPool.find(w => w.native_word?.toLowerCase() === cleanInput);
      if (match) {
        setTranslatedText(match.english_translation);
        Speech.speak(match.english_translation);
      } else {
        setTranslatedText("Translation not found in dictionary.");
      }
    } else {
      // English to Native
      match = dictionaryPool.find(w => w.english_translation?.toLowerCase() === cleanInput);
      if (match) {
        setTranslatedText(match.native_word);
        Speech.speak(match.native_word);
      } else {
        setTranslatedText("Translation not found in dictionary.");
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        
        {/* Neon Title Headers */}
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}>
            <Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text>
          </View>
        </View>

        {/* Interactive Language Selector Cards */}
        <View style={styles.neonCard}>
          <Text style={styles.sectionLabel}>CHOOSE TARGET NAMIBIAN LANGUAGE</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonOsh]}
              onPress={() => setSelectedLanguage('Oshikwanyama')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Oshikwanyama' && { color: '#00f3ff' }]}>Oshikwanyama</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Otjiherero' && styles.activeLangButtonHer]}
              onPress={() => setSelectedLanguage('Otjiherero')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Otjiherero' && { color: '#ff007f' }]}>Otjiherero</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Direction Switch Row */}
        <View style={styles.directionWrapper}>
          <Text style={styles.directionText}>
            {isLocalToEnglish ? `${selectedLanguage} ➔ English` : `English ➔ ${selectedLanguage}`}
          </Text>
          <TouchableOpacity 
            style={styles.neonSwapButton} 
            onPress={() => {
              setIsLocalToEnglish(!isLocalToEnglish);
              setTranslatedText('');
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>⇄ Swap Path</Text>
          </TouchableOpacity>
        </View>

        {/* Input Text Box Deck */}
        <View style={styles.mainConsoleCard}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              multiline
              placeholder={isLocalToEnglish ? `Type or speak ${selectedLanguage}...` : "Type or speak English..."}
              placeholderTextColor="#555861"
              value={inputText}
              onChangeText={setInputText}
            />
            
            <TouchableOpacity 
              style={[styles.micAudioNode, isListening && { backgroundColor: '#ff007f', borderColor: '#ff007f' }]} 
              onPress={handleMicPress}
            >
              <Text style={{ fontSize: 18 }}>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#00f3ff" style={{ marginVertical: 14 }} />
          ) : (
            translatedText !== '' && (
              <View style={styles.neonResultContainer}>
                <Text style={styles.resultHeaderTag}>TRANSLATION RESULT</Text>
                <Text style={styles.resultValueText}>{translatedText}</Text>
                <TouchableOpacity 
                  style={styles.speakOutputBadge}
                  onPress={() => Speech.speak(translatedText)}
                >
                  <Text style={{ color: '#ff007f', fontSize: 12, fontWeight: '700' }}>🔊 Repeat Translation Out Loud</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          <TouchableOpacity style={styles.glowingActionBtn} onPress={handleTranslate}>
            <Text style={styles.glowingActionBtnText}>Translate System</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// Inline objects replace StyleSheet.create to protect layout from compilation failures
const styles = {
  container: { flex: 1, backgroundColor: '#0a0813' },
  scroll: { padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 50 },
  headerWrapper: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 46, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5 },
  neonBadge: { borderBottomWidth: 2, borderBottomColor: '#ff007f', paddingBottom: 4, marginTop: 4 },
  subtitle: { fontSize: 12, fontWeight: '800', color: '#ff007f', letterSpacing: 3 },
  neonCard: { backgroundColor: '#131124', width: '100%', borderRadius: 16, padding: 18, marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#6a6b83', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', gap: 12 },
  langButton: { flex: 1, backgroundColor: '#1b1931', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  activeLangButtonOsh: { backgroundColor: '#15122b', borderColor: '#00f3ff' },
  activeLangButtonHer: { backgroundColor: '#15122b', borderColor: '#ff007f' },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#767891' },
  directionWrapper: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 6 },
  directionText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  neonSwapButton: { backgroundColor: '#1b1931', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ff007f' },
  mainConsoleCard: { backgroundColor: '#131124', width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f1c3a' },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 90, padding: 4 },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', padding: 0, minHeight: 75, fontWeight: '600' },
  micAudioNode: { backgroundColor: '#1b1931', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderWidth: 1, borderColor: '#00f3ff' },
  glowingActionBtn: { backgroundColor: '#00f3ff', width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  glowingActionBtnText: { color: '#0a0813', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  neonResultContainer: { borderTopWidth: 1, borderTopColor: '#1f1c3a', paddingTop: 16, width: '100%' },
  resultHeaderTag: { fontSize: 11, fontWeight: '800', color: '#ff007f', letterSpacing: 2 },
  resultValueText: { fontSize: 22, fontWeight: '700', color: '#00f3ff', marginTop: 4 },
  speakOutputBadge: { marginTop: 8, backgroundColor: '#1b1931', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ff007f' }
} as any;