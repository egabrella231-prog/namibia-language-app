import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

interface LibraryItem {
  english: string;
  oshikwanyama: string;
}

const OFFLINE_DB = [
  { native: 'teka', english: 'to draw water' },
  { native: 'teleka', english: 'to cook' },
  { native: 'ombuto', english: 'seed' },
  { native: 'mena', english: 'grow' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isOshikwanyamaToEnglish, setIsOshikwanyamaToEnglish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [customTranslation, setCustomTranslation] = useState('');

  const [testSubject, setTestSubject] = useState('ombuto');
  const [testVerb, setTestVerb] = useState('mena');
  const [testTense, setTestTense] = useState('present');
  const [sandboxResult, setSandboxResult] = useState('');
  const [wordRules, setWordRules] = useState<any[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedLib = localStorage.getItem('toloka_user_library');
      if (savedLib) setUserLibrary(JSON.parse(savedLib));
    }
    const fetchWordRules = async () => {
      const { data } = await supabase.from('word_rules_matrix').select('*');
      if (data) setWordRules(data);
    };
    fetchWordRules();
  }, []);

  const clearScreen = () => {
    setInputText('');
    setTranslatedText('');
    setCustomTranslation('');
  };

  const handleInputMicPress = () => {
    if (Platform.OS === 'web' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        setInputText(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      setIsListening(!isListening);
    }
  };

  const processComplexSentence = async (sentence: string, toEnglish: boolean) => {
    let cleanInput = sentence.trim().toLowerCase().replace(/^(the|a|an)\s+/i, '');
    const words = cleanInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/);
    let assembledTranslation: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word.trim() || ['the', 'a', 'an'].includes(word)) continue;

      if (navigator.onLine) {
        const targetColumn = toEnglish ? 'native_word' : 'english_translation';
        const { data } = await supabase
          .from('universal_dictionary')
          .select('native_word, english_translation')
          .ilike(targetColumn, word)
          .limit(1)
          .maybeSingle();

        if (data) {
          assembledTranslation.push(toEnglish ? data.english_translation : data.native_word);
        } else {
          assembledTranslation.push(word);
        }
      } else {
        assembledTranslation.push(word);
      }
    }
    return assembledTranslation.length > 0 ? assembledTranslation.join(' ') : null;
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const cleanInput = inputText.trim().toLowerCase();
      const targetColumn = isOshikwanyamaToEnglish ? 'native_word' : 'english_translation';
      const { data: directMapping } = await supabase
        .from('universal_dictionary')
        .select('native_word, english_translation')
        .ilike(targetColumn, cleanInput)
        .limit(1)
        .maybeSingle();

      if (directMapping) {
        setTranslatedText(isOshikwanyamaToEnglish ? directMapping.english_translation : directMapping.native_word);
      } else {
        const deepAssembledResult = await processComplexSentence(inputText.trim(), isOshikwanyamaToEnglish);
        setTranslatedText(deepAssembledResult || "Phrase not found.");
      }
    } catch (e) {
      setTranslatedText("Engine parsing conflict.");
    }
    setLoading(false);
  };

  const handleSaveToPreferredSpace = async () => {
    if (!inputText.trim() || !customTranslation.trim()) return;
    const englishWord = isOshikwanyamaToEnglish ? customTranslation.trim().toLowerCase() : inputText.trim().toLowerCase();
    const nativeWord = isOshikwanyamaToEnglish ? inputText.trim().toLowerCase() : customTranslation.trim().toLowerCase();

    try {
      await supabase.from('universal_dictionary').insert([
        { language_code: 'kwanyama', native_word: nativeWord, english_translation: englishWord, pos_tag: 'noun' }
      ]);
      setTranslatedText(`Synced "${nativeWord}" to database!`);
    } catch (dbError) {
      setTranslatedText("Saved locally.");
    }
    setCustomTranslation('');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Toloka</Text>
        <View style={styles.card}>
          <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type words..." placeholderTextColor="#4a4d61" />
          <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
            <Text style={styles.buttonText}>Deconstruct & Translate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 50, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#0d0b18', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  input: { fontSize: 20, color: '#fff', borderBottomWidth: 1, borderBottomColor: '#221e3d', marginBottom: 20 },
  mainButton: { backgroundColor: '#00f3ff', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#05030a', fontWeight: '900', fontSize: 18 },
  resultText: { fontSize: 24, color: '#00f3ff', fontWeight: '700', marginTop: 20 }
});