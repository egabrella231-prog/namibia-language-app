import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

interface LibraryItem {
  english: string;
  oshikwanyama: string;
}

const OFFLINE_DB = [
  { native: 'teka', english: 'to draw water' },
  { native: 'teleka', english: 'to cook' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isOshikwanyamaToEnglish, setIsOshikwanyamaToEnglish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // --- USER PREFERRED DICTIONARY STORAGE ---
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [customTranslation, setCustomTranslation] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedLib = localStorage.getItem('toloka_user_library');
      if (savedLib) setUserLibrary(JSON.parse(savedLib));
    }
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

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    const cleanInput = inputText.trim().toLowerCase();

    try {
      // 1. High Priority: Look through the user's saved library space first
      const customMatch = userLibrary.find(item => 
        isOshikwanyamaToEnglish ? item.oshikwanyama.toLowerCase() === cleanInput : item.english.toLowerCase() === cleanInput
      );

      // 2. Medium Priority: Main offline array lookup
      const offlineMatch = OFFLINE_DB.find(item => 
        isOshikwanyamaToEnglish ? item.native === cleanInput : item.english === cleanInput
      );

      if (customMatch) {
        setTranslatedText(isOshikwanyamaToEnglish ? customMatch.english : customMatch.oshikwanyama);
      } else if (offlineMatch) {
        setTranslatedText(isOshikwanyamaToEnglish ? offlineMatch.english : offlineMatch.native);
      } else if (navigator.onLine) {
        // 3. Low Priority: Supabase dynamic lookup fallback
        const { data: mapping } = await supabase.from('translations').select('*').ilike('english_phrase', cleanInput).maybeSingle();
        
        if (mapping) {
          const { data: result } = await supabase.rpc('build_full_sentence', { p_subject_root: mapping.subject_root, p_verb: mapping.verb_root, p_tense: mapping.tense_prefix });
          setTranslatedText(result?.[0]?.full_sentence || "Engine Error");
        } else {
          await supabase.from('missing_translations').insert([{ searched_word: cleanInput }]);
          setTranslatedText("Phrase not found. Suggestion logged.");
        }
      } else {
        setTranslatedText("Phrase not found (System Offline).");
      }
    } catch (e) {
      setTranslatedText("Engine error.");
    }
    setLoading(false);
  };

  // NEW: Saves locally AND feeds the word back into the global database
  const handleSaveToPreferredSpace = async () => {
    if (!inputText.trim() || !customTranslation.trim()) return;
    
    const englishWord = isOshikwanyamaToEnglish ? customTranslation.trim().toLowerCase() : inputText.trim().toLowerCase();
    const nativeWord = isOshikwanyamaToEnglish ? inputText.trim().toLowerCase() : customTranslation.trim().toLowerCase();

    const newItem: LibraryItem = {
      english: englishWord,
      oshikwanyama: nativeWord
    };

    // Update Local Workspace View immediately
    const updatedLib = [newItem, ...userLibrary];
    setUserLibrary(updatedLib);
    if (Platform.OS === 'web') {
      localStorage.setItem('toloka_user_library', JSON.stringify(updatedLib));
    }

    // FEED BACK TO SUPABASE MASTER DATABASE
    if (navigator.onLine) {
      try {
        await supabase.from('translations').insert([
          { 
            english_phrase: englishWord, 
            verb_root: nativeWord, // Map straight to baseline root for user scaling
            subject_root: '', 
            tense_prefix: '' 
          }
        ]);
      } catch (dbError) {
        console.log("Global sync paused, saved locally.");
      }
    }
    
    setTranslatedText(isOshikwanyamaToEnglish ? newItem.english : newItem.oshikwanyama);
    setCustomTranslation('');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Toloka</Text>
        
        <View style={{flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20}}>
          <TouchableOpacity style={styles.swapButton} onPress={() => setIsOshikwanyamaToEnglish(!isOshikwanyamaToEnglish)}>
            <Text style={styles.swapText}>{isOshikwanyamaToEnglish ? 'Oshikwanyama ➔ English' : 'English ➔ Oshikwanyama'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearScreen}>
            <Text style={{color: '#ff007f'}}>✖</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type or use mic..." placeholderTextColor="#4a4d61" />
            <TouchableOpacity style={styles.micButton} onPress={handleInputMicPress}>
              <Text>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{translatedText}</Text>
              
              {/* Active Workspace Interaction Area */}
              {translatedText.includes("not found") && (
                <View style={styles.creationPanel}>
                  <Text style={styles.creationLabel}>Contribute this translation to the Global App Database:</Text>
                  <TextInput 
                    style={styles.customInput} 
                    value={customTranslation} 
                    onChangeText={setCustomTranslation} 
                    placeholder={isOshikwanyamaToEnglish ? "What does this mean in English?" : "What does this mean in Oshikwanyama?"}
                    placeholderTextColor="#636885"
                  />
                  <TouchableOpacity style={styles.saveWordButton} onPress={handleSaveToPreferredSpace}>
                    <Text style={styles.saveWordText}>✔ Contribute & Save Word</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={{marginTop: 10}} onPress={() => Speech.speak(translatedText)}>
                <Text style={{color: '#ff007f'}}>🔊 Speak</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
            <Text style={styles.buttonText}>Translate</Text>
          </TouchableOpacity>
        </View>

        {/* --- DYNAMIC WORKSPACE PREFERENCES PANEL --- */}
        <View style={styles.libraryPanel}>
          <Text style={styles.libraryTitle}>📁 My Contributions ({userLibrary.length})</Text>
          {userLibrary.length === 0 ? (
            <Text style={styles.emptyText}>Words you add to the global network database will appear here.</Text>
          ) : (
            <ScrollView style={{maxHeight: 220}} nestedScrollEnabled={true}>
              {userLibrary.map((item, idx) => (
                <View key={idx} style={styles.libraryRow}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={styles.libEngText}>{item.english}</Text>
                    <Text style={styles.libNatText}>➔ {item.oshikwanyama}</Text>
                  </View>
                  <TouchableOpacity style={styles.loadNode} onPress={() => {
                    setInputText(item.english);
                    setTranslatedText(item.oshikwanyama);
                  }}>
                    <Text style={{color: '#00f3ff', fontWeight: '700'}}>Use Word</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 50, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
  swapButton: { padding: 12, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20, alignItems: 'center' },
  clearButton: { padding: 12, borderColor: '#4a4d61', borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swapText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#0d0b18', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, fontSize: 20, color: '#fff', borderBottomWidth: 1, borderBottomColor: '#221e3d', paddingBottom: 10 },
  micButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  resultBox: { marginBottom: 20, padding: 15, backgroundColor: '#1a1829', borderRadius: 10 },
  resultText: { fontSize: 24, color: '#00f3ff', fontWeight: '700' },
  mainButton: { backgroundColor: '#00f3ff', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#05030a', fontWeight: '900', fontSize: 18 },
  
  creationPanel: { marginTop: 15, padding: 12, backgroundColor: '#0d0b18', borderRadius: 10, borderWidth: 1, borderColor: '#ff007f' },
  creationLabel: { color: '#ffffff', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  customInput: { backgroundColor: '#1a1829', color: '#fff', padding: 12, borderRadius: 8, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#221e3d' },
  saveWordButton: { backgroundColor: '#ff007f', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveWordText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  libraryPanel: { marginTop: 30, backgroundColor: '#0d0b18', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d' },
  libraryTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 15 },
  emptyText: { color: '#4a4d61', fontStyle: 'italic', fontSize: 14 },
  libraryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1829' },
  libEngText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  libNatText: { color: '#00f3ff', fontSize: 14, marginTop: 2 },
  loadNode: { paddingVertical: 6, paddingHorizontal: 12, borderColor: '#00f3ff', borderWidth: 1, borderRadius: 8 }
} as any;