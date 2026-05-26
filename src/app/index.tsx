import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

const OFFLINE_DICTIONARY = [
  { language_code: 'kwanyama', native_word: 'teka', english_translation: 'to draw water' },
  { language_code: 'kwanyama', native_word: 'teleka', english_translation: 'to cook' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- ENGINE-DRIVEN TRANSLATION LOGIC ---
  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;
    setLoading(true);

    try {
      // Step 1: Check Database Engine via translations table
      const { data: mapping } = await supabase
        .from('translations')
        .select('subject_root, verb_root, tense_prefix')
        .eq('english_phrase', cleanInput)
        .maybeSingle(); // Prevents 406 errors

      if (mapping) {
        const { data: result } = await supabase.rpc('build_full_sentence', {
          p_subject_noun: mapping.subject_root,
          p_verb: mapping.verb_root,
          p_tense: mapping.tense_prefix
        });
        setTranslatedText(result && result.length > 0 ? result[0].full_sentence : "Sentence structure error.");
      } else {
        setTranslatedText("Translation not found.");
      }
    } catch (e) {
      setTranslatedText("Database offline.");
    }
    setLoading(false);
  };

  // --- SPEECH OUTPUT ENGINE ---
  const handleSpeakerMicPress = () => {
    if (translatedText && !translatedText.includes("not found")) {
      Speech.speak(translatedText, { rate: 0.9, language: 'en' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}><Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text></View>
        </View>

        <View style={styles.mainConsoleCard}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              placeholder="Type English phrase..."
              placeholderTextColor="#4a4d61"
              value={inputText}
              onChangeText={setInputText}
            />
            {/* Input Mic (Placeholder for your Web Speech API) */}
            <TouchableOpacity style={styles.micAudioNode} onPress={() => alert("Mic Active")}>
              <Text>🎤</Text>
            </TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={styles.neonResultContainer}>
              <Text style={styles.resultValueText}>{translatedText}</Text>
              {/* New Output Mic */}
              <TouchableOpacity style={styles.speakerNode} onPress={handleSpeakerMicPress}>
                <Text style={{color: '#ff007f'}}>🔊 Talk</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.glowingActionBtn} onPress={handleTranslate}>
            <Text style={styles.glowingActionBtnText}>Translate System</Text>
          </TouchableOpacity>
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
  mainConsoleCard: { backgroundColor: '#0d0b18', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'center' },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', minHeight: 75 },
  micAudioNode: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  glowingActionBtn: { backgroundColor: '#00f3ff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  glowingActionBtnText: { color: '#05030a', fontWeight: '800' },
  neonResultContainer: { borderTopWidth: 1, borderColor: '#221e3d', marginTop: 16, paddingTop: 10 },
  resultValueText: { fontSize: 24, fontWeight: '700', color: '#00f3ff' },
  speakerNode: { marginTop: 10, padding: 8, borderColor: '#ff007f', borderWidth: 1, borderRadius: 10, width: 70 }
} as any;