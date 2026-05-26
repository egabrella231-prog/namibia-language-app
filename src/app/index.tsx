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

  // --- DATABASE ENGINE INTEGRATION ---
  const handleTranslate = async () => {
    let cleanInput = inputText.trim().toLowerCase();
    if (!cleanInput) return;
    setLoading(true);

    // 1. Try local dictionary (Offline)
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

    // 2. Try Database Translation Engine
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

  // ... [RETAIN ALL YOUR OTHER FUNCTIONS: useEffects, handleInputMicPress, handleSpeakerMicPress]
  // ... [RETAIN ALL YOUR RENDER AND STYLE CODE EXACTLY AS IT WAS IN YOUR UPLOADED FILE]

  // IMPORTANT: Paste your original render() and styles={} below this comment block.