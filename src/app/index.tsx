import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// --- STABLE LOCAL VOCABULARY MATRIX ---
const OFFLINE_DICTIONARY = [
  { language_code: 'kwanyama', native_word: 'teka', english_translation: 'to draw water' },
  { language_code: 'kwanyama', native_word: 'teleka', english_translation: 'to cook' },
  { language_code: 'kwanyama', native_word: 'mwa', english_translation: 'to drink' },
  { language_code: 'kwanyama', native_word: 'nwa', english_translation: 'to drink' },
  { language_code: 'kwanyama', native_word: 'pela', english_translation: 'to give' },
  { language_code: 'kwanyama', native_word: 'lesha', english_translation: 'to read' },
  { language_code: 'kwanyama', native_word: 'shanga', english_translation: 'to write' }
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

  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const { data, error } = await supabase
          .from('universal_dictionary')
          .select('language_code, native_word, english_translation');
        if (!error && data && data.length > 0) {
          setWords([...OFFLINE_DICTIONARY, ...data]);
        }
      } catch (e) {
        setWords(OFFLINE_DICTIONARY); 
      }
    };
    fetchPhrases();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recInstance = new SpeechRecognition();
        recInstance.continuous = false;
        recInstance.interimResults = false;
        recInstance.onstart = () => setIsListening(true);
        recInstance.onend = () => setIsListening(false);
        recInstance.onerror = () => setIsListening(false);
        recInstance.onresult = (event: any) => {
          const spokenText = event.results[0][0].transcript;
          if (spokenText) {
            setInputText(spokenText.replace(/\.$/, ''));
          }
        };
        setRecognition(recInstance);
      }
    }
  }, []);

  const handleInputMicPress = async () => {
    if (Platform.OS !== 'web') return;
    if (isListening) {
      if (recognition) { try { recognition.stop(); } catch(e) {} }
      if ((window as any).offlineStreamActive) {
        (window as any).offlineStreamActive.getTracks().forEach((t: any) => t.stop());
      }
      setIsListening(false);
      return;
    }
    if (navigator.onLine && recognition) {
      recognition.lang = isLocalToEnglish ? 'pt-PT' : 'en-US'; 
      try { recognition.start(); } catch (e) { setIsListening(true); }
    } else {
      try {
        setIsListening(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        (window as any).offlineStreamActive = stream;
      } catch (err) {
        setIsListening(false);
        alert("Microphone active. Please allow audio permissions.");
      }
    }
  };

  const handleSpeakerMicPress = () => {
    if (translatedText && translatedText !== "Translation not found in dictionary.") {
      Speech.speak(translatedText, { rate: 0.95 });
    }
  };

  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;
    setLoading(true);

    const targetLangCode = selectedLanguage === 'Oshikwanyama' ? 'kwanyama' : 'herero';
    const dictionaryPool = words.filter(w => w.language_code?.toLowerCase() === targetLangCode);
    let match = null;

    if (isLocalToEnglish) {
      match = dictionaryPool.find(w => w.native_word?.toLowerCase() === cleanInput);
      if (match) { setTranslatedText(match.english_translation); setLoading(false); return; }
    } else {
      match = dictionaryPool.find(w => {
        const dbEng = w.english_translation?.toLowerCase() || '';
        return dbEng === cleanInput || dbEng === `to ${cleanInput}` || cleanInput === `to ${dbEng}`;
      });
      if (match) { setTranslatedText(match.native_word); setLoading(false); return; }
    }

    try {
      const { data: mapping } = await supabase
        .from('translations')
        .select('subject_root, verb_root, tense_prefix')
        .eq('english_phrase', cleanInput)
        .single();

      if (mapping) {
        const { data: result } = await supabase.rpc('build_full_sentence', {
          p_subject_noun: mapping.subject_root,
          p_verb: mapping.verb_root,
          p_tense: mapping.tense_prefix
        });
        setTranslatedText(result && result.length > 0 ? result[0].full_sentence : "Translation not found.");
      } else {
        setTranslatedText("Translation not found in dictionary.");
      }
    } catch (e) { setTranslatedText("Translation not found in dictionary."); }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <style>{`
          @keyframes magmaPulse {
            0% { box-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f; transform: scale(1); }
            50% { box-shadow: 0 0 25px #ff007f, 0 0 35px #ff007f; transform: scale(1.12); }
            100% { box-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f; transform: scale(1); }
          }
          .magma-active { animation: magmaPulse 0.4s infinite linear !important; }
        `}</style>
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}><Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text></View>
        </View>
        <View style={styles.neonCard}>
          <Text style={styles.sectionLabel}>CHOOSE TARGET NAMIBIAN LANGUAGE</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.langButton, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonOsh]} onPress={() => setSelectedLanguage('Oshikwanyama')}>
              <Text style={styles.langButtonText}>Oshikwanyama</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langButton, selectedLanguage === 'Otjiherero' && styles.activeLangButtonHer]} onPress={() => setSelectedLanguage('Otjiherero')}>
              <Text style={styles.langButtonText}>Otjiherero</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.mainConsoleCard}>
          <View style={styles.interactiveInputRow}>
            <TextInput style={styles.cleanTextArea} multiline value={inputText} onChangeText={setInputText} />
            <TouchableOpacity style={[styles.micAudioNode, isListening && { backgroundColor: '#ff007f' }]} onPress={handleInputMicPress}>
              <Text>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText !== '' && (
            <View style={styles.neonResultContainer}>
              <Text style={styles.resultValueText}>{translatedText}</Text>
              <TouchableOpacity onPress={handleSpeakerMicPress}><Text style={{color: '#ff007f'}}>🔊 Talk</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.glowingActionBtn} onPress={handleTranslate}><Text style={styles.glowingActionBtnText}>Translate System</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 50 },
  headerWrapper: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 48, fontWeight: '900', color: '#ffffff' },
  neonBadge: { borderBottomWidth: 2, borderBottomColor: '#ff007f', paddingBottom: 4 },
  subtitle: { fontSize: 12, fontWeight: '800', color: '#ff007f', letterSpacing: 3 },
  neonCard: { backgroundColor: '#0d0b18', padding: 18, borderRadius: 16, marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#626485', textAlign: 'center' },
  tabContainer: { flexDirection: 'row', gap: 12 },
  langButton: { flex: 1, backgroundColor: '#141226', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  activeLangButtonOsh: { borderColor: '#00f3ff', borderWidth: 1 },
  activeLangButtonHer: { borderColor: '#ff007f', borderWidth: 1 },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#575975' },
  mainConsoleCard: { backgroundColor: '#0d0b18', padding: 20, borderRadius: 20 },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'center' },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff' },
  micAudioNode: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  glowingActionBtn: { backgroundColor: '#00f3ff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  glowingActionBtnText: { color: '#05030a', fontWeight: '800' },
  neonResultContainer: { borderTopWidth: 1, borderColor: '#221e3d', marginTop: 16 },
  resultValueText: { fontSize: 24, fontWeight: '700', color: '#00f3ff', marginTop: 10 }
} as any;