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
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;
    setLoading(true);

    try {
      if (!isLocalToEnglish) {
        // PATH 1: English -> Native (Engine Driven)
        const { data: mapping } = await supabase
          .from('translations')
          .select('subject_root, verb_root, tense_prefix')
          .eq('english_phrase', cleanInput)
          .maybeSingle();

        if (mapping) {
          const { data: result } = await supabase.rpc('build_full_sentence', {
            p_subject_noun: mapping.subject_root,
            p_verb: mapping.verb_root,
            p_tense: mapping.tense_prefix
          });
          setTranslatedText(result && result.length > 0 ? result[0].full_sentence : "Sentence build error.");
        } else {
          setTranslatedText("Phrase not found in engine.");
        }
      } else {
        // PATH 2: Native -> English (Dictionary Lookup)
        const { data: dict } = await supabase
          .from('universal_dictionary')
          .select('english_translation')
          .eq('native_word', cleanInput)
          .maybeSingle();
        
        setTranslatedText(dict ? dict.english_translation : "Word not found.");
      }
    } catch (e) {
      setTranslatedText("Connection error.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <TouchableOpacity style={styles.neonSwapButton} onPress={() => setIsLocalToEnglish(!isLocalToEnglish)}>
            <Text style={{color: '#fff'}}>{isLocalToEnglish ? 'Native ➔ English' : 'English ➔ Native'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainConsoleCard}>
          <TextInput style={styles.cleanTextArea} value={inputText} onChangeText={setInputText} placeholder="Enter text..." placeholderTextColor="#4a4d61" />
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={styles.neonResultContainer}>
              <Text style={styles.resultValueText}>{translatedText}</Text>
              <TouchableOpacity onPress={() => Speech.speak(translatedText)}><Text style={{color: '#ff007f'}}>🔊 Talk</Text></TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.glowingActionBtn} onPress={handleTranslate}><Text style={styles.glowingActionBtnText}>Translate</Text></TouchableOpacity>
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
  neonSwapButton: { padding: 10, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20 },
  mainConsoleCard: { backgroundColor: '#0d0b18', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  cleanTextArea: { fontSize: 17, color: '#ffffff', minHeight: 75 },
  glowingActionBtn: { backgroundColor: '#00f3ff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  glowingActionBtnText: { color: '#05030a', fontWeight: '800' },
  neonResultContainer: { borderTopWidth: 1, borderColor: '#221e3d', marginTop: 16, paddingTop: 10 },
  resultValueText: { fontSize: 24, fontWeight: '700', color: '#00f3ff' }
} as any;