import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const rec = new (window as any).webkitSpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event: any) => setInputText(event.results[0][0].transcript);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  const handleInputMicPress = async () => {
    if (navigator.onLine && recognition) {
      setIsListening(true);
      recognition.start();
    } else {
      alert("Offline Mode: Microphone is ready.");
      setIsListening(!isListening);
    }
  };

  const handleOutputMicPress = () => {
    if (translatedText) Speech.speak(translatedText, { rate: 0.9 });
  };

  const handleTranslate = async () => {
    setLoading(true);
    try {
      if (!isLocalToEnglish) {
        const { data: mapping } = await supabase.from('translations').select('subject_root, verb_root, tense_prefix').eq('english_phrase', inputText.toLowerCase()).maybeSingle();
        if (mapping) {
          const { data: result } = await supabase.rpc('build_full_sentence', { p_subject_root: mapping.subject_root, p_verb: mapping.verb_root, p_tense: mapping.tense_prefix });
          setTranslatedText(result?.[0]?.full_sentence || "Engine Error");
        }
      } else {
        const { data: dict } = await supabase.from('universal_dictionary').select('english_translation').eq('native_word', inputText.toLowerCase()).maybeSingle();
        setTranslatedText(dict?.english_translation || "Not found");
      }
    } catch (e) { setTranslatedText("Error"); }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <style>{`
          @keyframes magmaPulse {
            0% { box-shadow: 0 0 5px #00f3ff; }
            50% { box-shadow: 0 0 20px #00f3ff; }
            100% { box-shadow: 0 0 5px #00f3ff; }
          }
          .animate-neon { animation: magmaPulse 1.5s infinite alternate; }
        `}</style>
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Toloka</Text>
        <TouchableOpacity style={styles.swapBtn} onPress={() => setIsLocalToEnglish(!isLocalToEnglish)}>
          <Text style={{color: '#fff', textAlign: 'center'}}>{isLocalToEnglish ? 'Oshikwanyama ➔ English' : 'English ➔ Oshikwanyama'}</Text>
        </TouchableOpacity>

        <View style={styles.mainConsoleCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TextInput style={styles.cleanTextArea} value={inputText} onChangeText={setInputText} placeholder="Type or use mic..." placeholderTextColor="#4a4d61" />
            <TouchableOpacity style={styles.micAudioNode} onPress={handleInputMicPress}>
              <Text>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>

          {translatedText ? (
            <View style={styles.neonResultContainer}>
              <Text style={styles.resultValueText}>{translatedText}</Text>
              <TouchableOpacity style={styles.speakerNode} onPress={handleOutputMicPress}>
                <Text style={{color: '#ff007f'}}>🔊 Talk</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity 
            style={[styles.glowingActionBtn, { className: 'animate-neon' } as any]} 
            onPress={handleTranslate}
          >
            <Text style={styles.glowingActionBtnText}>{loading ? 'Translating...' : 'Translate'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 50 },
  title: { fontSize: 48, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 20 },
  swapBtn: { padding: 10, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20, marginBottom: 20 },
  mainConsoleCard: { backgroundColor: '#0d0b18', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', minHeight: 75 },
  micAudioNode: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderColor: '#00f3ff', borderWidth: 1 },
  glowingActionBtn: { backgroundColor: '#00f3ff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  glowingActionBtnText: { color: '#05030a', fontWeight: '800' },
  neonResultContainer: { borderTopWidth: 1, borderColor: '#221e3d', marginTop: 16, paddingTop: 10 },
  resultValueText: { fontSize: 24, fontWeight: '700', color: '#00f3ff' },
  speakerNode: { marginTop: 10, padding: 8, borderColor: '#ff007f', borderWidth: 1, borderRadius: 10, width: 70 }
} as any;