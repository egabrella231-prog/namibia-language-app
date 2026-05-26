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

  // --- ENGINE-INTEGRATED TRANSLATION LOGIC ---
  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;

    setLoading(true);
    const targetLangCode = selectedLanguage === 'Oshikwanyama' ? 'kwanyama' : 'herero';
    const dictionaryPool = words.filter(w => w.language_code?.toLowerCase() === targetLangCode);

    // 1. LOCAL/OFFLINE LOOKUP
    let match = null;
    if (isLocalToEnglish) {
      match = dictionaryPool.find(w => w.native_word?.toLowerCase() === cleanInput);
      if (match) {
        setTranslatedText(match.english_translation);
        setLoading(false);
        return;
      }
    } else {
      match = dictionaryPool.find(w => {
        const dbEng = w.english_translation?.toLowerCase() || '';
        return dbEng === cleanInput || dbEng === `to ${cleanInput}` || cleanInput === `to ${dbEng}`;
      });
      if (match) {
        setTranslatedText(match.native_word);
        setLoading(false);
        return;
      }
    }

    // 2. DATABASE ENGINE LOOKUP (If not found locally)
    try {
      const { data: mapping } = await supabase
        .from('translations')
        .select('subject_root, verb_root, tense_prefix')
        .eq('english_phrase', cleanInput)
        .single();

      if (mapping) {
        const { data: engineResult, error: engineError } = await supabase.rpc('build_full_sentence', {
          p_subject_noun: mapping.subject_root,
          p_verb: mapping.verb_root,
          p_tense: mapping.tense_prefix
        });

        if (engineResult && engineResult.length > 0) {
          setTranslatedText(engineResult[0].full_sentence);
        } else {
          setTranslatedText("Translation not found.");
        }
      } else {
        setTranslatedText("Translation not found.");
      }
    } catch (e) {
      setTranslatedText("Connection error.");
    }
    setLoading(false);
  };

  // ... (Keep existing useEffects for Speech Recognition and handleSpeakerMicPress)
  // [Rest of your UI code remains exactly as you had it]
  // ... (Paste your previous handleInputMicPress and render code below this point)