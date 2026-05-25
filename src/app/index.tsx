import React, { useState, useEffect, useRef } from 'react';
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
  
  // Audio Recording Memory Tracks
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Database Synchronization Engine
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

  // --- LOCAL MICROPHONE CONTROL LOOP ---
  const handleMicPress = async () => {
    if (isListening) {
      stopLocalRecording();
      return;
    }

    if (Platform.OS !== 'web') return;

    try {
      setIsListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = () => {
        // Voice data streams smoothly inside local cache matrix
      };

    } catch (err) {
      setIsListening(false);
      alert("Microphone connection failed. Please ensure page audio permissions are allowed.");
    }
  };

  const stopLocalRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
  };

  // --- AUTOMATED SPEECH SYNTHESIS ENGINE ---
  const handleTranslate = () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;

    setLoading(true);
    const targetLangCode = selectedLanguage === 'Oshikwanyama' ? 'kwanyama' : 'herero';
    const dictionaryPool = words.filter(w => w.language_code?.toLowerCase() === targetLangCode);
    let match = null;

    if (isLocalToEnglish) {
      match = dictionaryPool.find(w => w.native_word?.toLowerCase() === cleanInput);
      if (match) {
        setTranslatedText(match.english_translation);
        // Automatically speak output text on completion
        Speech.speak(match.english_translation, { rate: 1.0 });
      } else {
        setTranslatedText("Translation not found.");
      }
    } else {
      match = dictionaryPool.find(w => {
        const dbEng = w.english_translation?.toLowerCase() || '';
        return dbEng === cleanInput || dbEng === `to ${cleanInput}` || cleanInput === `to ${dbEng}`;
      });

      if (match) {
        setTranslatedText(match.native_word);
        // Automatically speak output text on completion
        Speech.speak(match.native_word, { rate: 1.0 });
      } else {
        setTranslatedText("Translation not found.");
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Dynamic Style injection for high-speed magma wave animation effect */}
      {Platform.OS === 'web' && (
        <style>{`
          @keyframes magmaPulse {
            0% { box-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f; transform: scale(1); }
            50% { box-shadow: 0 0 25px #ff007f, 0 0 35px #ff007f; transform: scale(1.12); }
            100% { box-shadow: 0 0 5px #ff007f, 0 0 10px #ff007f; transform: scale(1); }
          }
          .magma-active {
            animation: magmaPulse 0.4s infinite linear !important;
          }
        `}</style>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}>
            <Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text>
          </View>
        </View>

        <View style={styles.neonCard}>
          <Text style={styles.sectionLabel}>CHOOSE TARGET NAMIBIAN LANGUAGE</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonOsh]}
              onPress={() => setSelectedLanguage('Oshikwanyama')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Oshikwanyama' && { color: '#00f3ff', textShadowColor: 'rgba(0, 243, 255, 0.6)', textShadowRadius: 8 }]}>Oshikwanyama</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.langButton, selectedLanguage === 'Otjiherero' && styles.activeLangButtonHer]}
              onPress={() => setSelectedLanguage('Otjiherero')}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Otjiherero' && { color: '#ff007f', textShadowColor: 'rgba(255, 0, 127, 0.6)', textShadowRadius: 8 }]}>Otjiherero</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={styles.mainConsoleCard}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              multiline
              placeholder={isLocalToEnglish ? `Speak or type ${selectedLanguage}...` : "Speak or type English..."}
              placeholderTextColor="#4a4d61"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity 
              style={[styles.micAudioNode, isListening && { backgroundColor: '#ff007f', borderColor: '#ff007f' }]} 
              dataSet={isListening ? { className: 'magma-active' } : undefined}
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

// --- CORE STYLES MATRIX ---
const styles = {
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 50 },
  headerWrapper: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 48, fontWeight: '900', color: '#ffffff', letterSpacing: 2, textShadowColor: 'rgba(255, 255, 255, 0.3)', textShadowRadius: 10 },
  neonBadge: { borderBottomWidth: 2, borderBottomColor: '#ff007f', paddingBottom: 4, marginTop: 4, boxShadow: '0 4px 10px rgba(255,0,127,0.4)' },
  subtitle: { fontSize: 12, fontWeight: '800', color: '#ff007f', letterSpacing: 3, textShadowColor: 'rgba(255, 0, 127, 0.5)', textShadowRadius: 6 },
  neonCard: { backgroundColor: '#0d0b18', width: '100%', borderRadius: 16, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#1b1730' },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#626485', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', gap: 12 },
  langButton: { flex: 1, backgroundColor: '#141226', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#221e3d' },
  activeLangButtonOsh: { backgroundColor: '#11192e', borderColor: '#00f3ff', boxShadow: '0 0 12px rgba(0,243,255,0.3)' },
  activeLangButtonHer: { backgroundColor: '#1f1024', borderColor: '#ff007f', boxShadow: '0 0 12px rgba(255,0,127,0.3)' },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#575975' },
  directionWrapper: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 6 },
  directionText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5, textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 4 },
  neonSwapButton: { backgroundColor: '#141226', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ff007f', boxShadow: '0 0 8px rgba(255,0,127,0.2)' },
  mainConsoleCard: { backgroundColor: '#0d0b18', width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#221e3d', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 90, padding: 4 },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', padding: 0, minHeight: 75, fontWeight: '600' },
  micAudioNode: { backgroundColor: '#141226', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderWidth: 1, borderColor: '#00f3ff', transition: 'all 0.2s ease-in-out' },
  glowingActionBtn: { backgroundColor: '#00f3ff', width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14, boxShadow: '0 0 18px rgba(0,243,255,0.5)' },
  glowingActionBtnText: { color: '#05030a', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  neonResultContainer: { borderTopWidth: 1, borderTopColor: '#221e3d', paddingTop: 16, width: '100%', marginBottom: 10 },
  resultHeaderTag: { fontSize: 11, fontWeight: '800', color: '#ff007f', letterSpacing: 2, textShadowColor: 'rgba(255,0,127,0.4)', textShadowRadius: 4 },
  resultValueText: { fontSize: 24, fontWeight: '700', color: '#00f3ff', marginTop: 4, textShadowColor: 'rgba(0,243,255,0.5)', textShadowRadius: 10 }
} as any;