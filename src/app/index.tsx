import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

const OFFLINE_DICTIONARY = [
  { language_code: 'kwanyama', native_word: 'teka', english_translation: 'to draw water' },
  { language_code: 'kwanyama', native_word: 'teleka', english_translation: 'to cook' },
  { language_code: 'kwanyama', native_word: 'mwa', english_translation: 'to drink' }
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
        if (resultText) setInputText(resultText);
      };
      setRecognition(rec);
    }
  }, []);

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

  useEffect(() => { fetchPhrases(); }, []);

  const handleMicPress = () => {
    if (!recognition) {
      alert("Microphone capture requires a desktop browser like Chrome or Safari.");
      return;
    }
    if (isListening) recognition.stop();
    else recognition.start();
  };

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
        Speech.speak(match.english_translation);
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
        Speech.speak(match.native_word);
      } else {
        setTranslatedText("Translation not found.");
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}><Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text></View>
        </View>

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

        <View style={styles.directionWrapper}>
          <Text style={styles.directionText}>{isLocalToEnglish ? `${selectedLanguage} ➔ English` : `English ➔ ${selectedLanguage}`}</Text>
          <TouchableOpacity style={styles.neonSwapButton} onPress={() => { setIsLocalToEnglish(!isLocalToEnglish); setTranslatedText(''); }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>⇄ Swap Path</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainConsoleCard}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              multiline
              placeholder={isLocalToEnglish ? `Speak or type ${selectedLanguage}...` : "Speak or type English..."}
              placeholderTextColor="#555861"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={[styles.micAudioNode, isListening && { backgroundColor: '#ff007f', borderColor: '#ff007f' }]} onPress={handleMicPress}>
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
  neonResultContainer: { borderTopWidth: 1, borderTopColor: '#1f1c3a', paddingTop: 16, width: '100%', marginBottom: 10 },
  resultHeaderTag: { fontSize: 11, fontWeight: '800', color: '#ff007f', letterSpacing: 2 },
  resultValueText: { fontSize: 22, fontWeight: '700', color: '#00f3ff', marginTop: 4 }
} as any;