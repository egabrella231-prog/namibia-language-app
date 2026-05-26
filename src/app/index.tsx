import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

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
        if (!error && data) setWords([...OFFLINE_DICTIONARY, ...data]);
      } catch (e) { setWords(OFFLINE_DICTIONARY); }
    };
    fetchPhrases();
  }, []);

  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;
    setLoading(true);
    const targetLangCode = selectedLanguage === 'Oshikwanyama' ? 'kwanyama' : 'herero';
    
    // 1. Local Lookup
    const match = words.find(w => w.language_code?.toLowerCase() === targetLangCode && (w.english_translation?.toLowerCase() === cleanInput || w.native_word?.toLowerCase() === cleanInput));
    if (match) {
      setTranslatedText(isLocalToEnglish ? match.english_translation : match.native_word);
      setLoading(false);
      return;
    }

    // 2. Engine Lookup
    try {
      const { data: mapping } = await supabase.from('translations').select('subject_root, verb_root, tense_prefix').eq('english_phrase', cleanInput).single();
      if (mapping) {
        const { data: result } = await supabase.rpc('build_full_sentence', { p_subject_noun: mapping.subject_root, p_verb: mapping.verb_root, p_tense: mapping.tense_prefix });
        setTranslatedText(result && result.length > 0 ? result[0].full_sentence : "Not found.");
      } else {
        setTranslatedText("Translation not found.");
      }
    } catch (e) { setTranslatedText("Engine error."); }
    setLoading(false);
  };

  const handleSpeakerMicPress = () => {
    if (translatedText && !translatedText.includes("not found")) Speech.speak(translatedText, { rate: 0.95 });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#05030a' }}>
      <ScrollView contentContainerStyle={{ padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 50 }}>
        <Text style={{ fontSize: 48, color: '#fff', textAlign: 'center', fontWeight: '900' }}>Toloka</Text>
        <View style={{ backgroundColor: '#0d0b18', padding: 20, borderRadius: 20, marginTop: 20 }}>
          <TextInput style={{ color: '#fff', fontSize: 17, minHeight: 75 }} placeholder="Type..." value={inputText} onChangeText={setInputText} />
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={{ marginTop: 20, borderTopWidth: 1, borderColor: '#221e3d', paddingTop: 10 }}>
              <Text style={{ fontSize: 24, color: '#00f3ff' }}>{translatedText}</Text>
              <TouchableOpacity onPress={handleSpeakerMicPress}><Text style={{ color: '#ff007f' }}>🔊 Talk</Text></TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={{ backgroundColor: '#00f3ff', padding: 16, borderRadius: 14, marginTop: 14 }} onPress={handleTranslate}>
            <Text style={{ fontWeight: '800' }}>Translate System</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}