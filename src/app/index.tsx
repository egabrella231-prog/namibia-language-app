import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// --- TS INTERFACES FOR TYPE SAFETY ---
interface DictionaryRow {
  id: number;
  language_code: string;
  native_word: string;
  english_translation: string;
  audio_url?: string | null; // Placeholder column for actual recorded native pronunciations
}

// Global window extension interface for standard Web Speech APIs
interface WebSpeechWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export default function App() {
  // --- STATE HOOKS WITH STRICT TYPES ---
  const [inputText, setInputText] = useState<string>(''); 
  const [translation, setTranslation] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 
  
  const [selectedLanguage, setSelectedLanguage] = useState<'kwanyama' | 'ndonga' | 'herero'>('kwanyama');
  const [translationDirection, setTranslationDirection] = useState<'NATIVE_TO_ENG' | 'ENG_TO_NATIVE'>('NATIVE_TO_ENG');
  const [isListening, setIsListening] = useState<boolean>(false); 
  const [webRecognition, setWebRecognition] = useState<any>(null); 

  // --- ENGINE INITIALIZATION ---
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const customWindow = window as unknown as WebSpeechWindow;
      const SpeechRecognition = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false; 
        recog.interimResults = false; 
        
        recog.onstart = () => setIsListening(true);
        recog.onend = () => setIsListening(false);
        recog.onresult = (event: any) => {
          const transcript: string = event.results[0][0].transcript;
          setInputText(transcript); 
        };
        recog.onerror = () => setIsListening(false);
        setWebRecognition(recog);
      }
    }
  }, []);

  // --- QUERY CONTROLLER ---
  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setTranslation('');

    try {
      let query = supabase
        .from('universal_dictionary')
        .select('*')
        .eq('language_code', selectedLanguage);

      if (translationDirection === 'NATIVE_TO_ENG') {
        query = query.ilike('native_word', inputText.trim()); 
      } else {
        query = query.ilike('english_translation', inputText.trim());
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      // Cast returned data structure safely onto data schema interfaces
      const typedData = data as DictionaryRow | null;

      if (typedData) {
        setTranslation(translationDirection === 'NATIVE_TO_ENG' ? typedData.english_translation : typedData.native_word);
      } else {
        setTranslation('Translation not found / Inga i monika.');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Network connection or database error.');
    } finally {
      setIsLoading(false); 
    }
  };

  // --- STT CONTROLLER ---
  const toggleListening = async () => {
    if (Platform.OS === 'web') {
      if (!webRecognition) {
        alert('Voice recognition not supported on this browser version. Use Google Chrome!');
        return;
      }
      if (isListening) {
        webRecognition.stop();
      } else {
        setInputText(''); 
        webRecognition.lang = translationDirection === 'NATIVE_TO_ENG' ? 'en-ZA' : 'en-US';
        try { webRecognition.start(); } catch (e) { webRecognition.stop(); }
      }
    } else {
      alert('Native mobile microphone engine ready for device compilation!');
    }
  };

  // --- TTS CONTROLLER ---
  const speakOutput = () => {
    if (!translation) return;
    
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(translation);
        utterance.lang = translationDirection === 'NATIVE_TO_ENG' ? 'en-US' : 'en-ZA';
        window.speechSynthesis.speak(utterance);
      }
    } else {
      Speech.stop();
      const speechLocale = translationDirection === 'NATIVE_TO_ENG' ? 'en-US' : 'en-ZA';
      Speech.speak(translation, { language: speechLocale, pitch: 1.0, rate: 0.9 });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Toloka</Text>
        <Text style={styles.headerSubtitle}>Namibia Speech Bridge</Text>
      </View>

      <View style={styles.languageSelectorCard}>
        <Text style={styles.selectorLabel}>Target Namibian Language:</Text>
        <View style={styles.pickerRow}>
          <TouchableOpacity 
            style={[styles.pickerTab, selectedLanguage === 'kwanyama' && styles.pickerTabActive]}
            onPress={() => { setSelectedLanguage('kwanyama'); setTranslation(''); }}
          >
            <Text style={[styles.pickerTabText, selectedLanguage === 'kwanyama' && styles.pickerTabActiveText]}>Oshikwanyama</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pickerTab, selectedLanguage === 'herero' && styles.pickerTabActive]}
            onPress={() => { setSelectedLanguage('herero'); setTranslation(''); }}
          >
            <Text style={[styles.pickerTabText, selectedLanguage === 'herero' && styles.pickerTabActiveText]}>Otjiherero</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.switcherContainer}>
        <Text style={styles.directionText}>
          {translationDirection === 'NATIVE_TO_ENG' ? 'Local Language ➔ English' : 'English ➔ Local Language'}
        </Text>
        <TouchableOpacity style={styles.switchButton} onPress={() => {
          setTranslationDirection(prev => prev === 'NATIVE_TO_ENG' ? 'ENG_TO_NATIVE' : 'NATIVE_TO_ENG');
          setInputText(''); setTranslation('');
        }}>
          <Text style={styles.switchIconText}>⇄ Swap Direction</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type or click the microphone to speak..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={[styles.micBigButton, isListening && styles.micListeningActive]} onPress={toggleListening}>
            <Text style={styles.buttonEmojiIcon}>{isListening ? '🛑' : '🎤'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.translateActionBtn} onPress={handleTranslate}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.translateActionBtnText}>Translate Text</Text>}
        </TouchableOpacity>

        {translation ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{translation}</Text>
            </View>
            <TouchableOpacity style={styles.speakOutputButton} onPress={speakOutput}>
              <Text style={styles.speakOutputButtonText}>🔊 Tap to Listen (Hear Word)</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F8FAFC', padding: 16, alignItems: 'center', justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 42, fontWeight: '900', color: '#2563EB', textAlign: 'center', letterSpacing: -1 },
  headerSubtitle: { fontSize: 16, color: '#475569', fontWeight: '700', textAlign: 'center', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  languageSelectorCard: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 450, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  pickerRow: { flexDirection: 'row', gap: 8 },
  pickerTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' },
  pickerTabActive: { backgroundColor: '#2563EB' },
  pickerTabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  pickerTabActiveText: { color: '#FFFFFF' },
  switcherContainer: { width: '100%', maxWidth: 450, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  directionText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  switchButton: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  switchIconText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 8, marginBottom: 12 },
  input: { flex: 1, minHeight: 70, fontSize: 16, color: '#0F172A', textAlignVertical: 'top' },
  micBigButton: { backgroundColor: '#E2E8F0', width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  micListeningActive: { backgroundColor: '#EF4444' },
  buttonEmojiIcon: { fontSize: 24, textAlign: 'center' },
  translateActionBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  translateActionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resultContainer: { marginTop: 12, gap: 8 },
  resultBox: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#DCFCE7', borderRadius: 14, padding: 16 },
  resultText: { fontSize: 20, color: '#166534', fontWeight: '800', textAlign: 'center' },
  speakOutputButton: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  speakOutputButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});