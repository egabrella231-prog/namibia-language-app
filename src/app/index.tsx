```tsx
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
    
    if (navigator.onLine && words.length > 1) {
      const targetColumn = toEnglish ? 'native_word' : 'english_translation';
      const { data: structuralMatch } = await supabase
        .from('universal_dictionary')
        .select('native_word, english_translation')
        .ilike(targetColumn, `%${cleanInput}%`)
        .limit(1)
        .maybeSingle();

      if (structuralMatch) {
        return toEnglish ? structuralMatch.english_translation : structuralMatch.native_word;
      }
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word.trim() || word === 'the' || word === 'a' || word === 'an') continue;

      const customMatch = userLibrary.find(item =>
        toEnglish ? item.oshikwanyama.toLowerCase() === word : item.english.toLowerCase() === word
      );
      const offlineMatch = OFFLINE_DB.find(item =>
        toEnglish ? item.native === word : item.english === word
      );

      if (customMatch) {
        assembledTranslation.push(toEnglish ? customMatch.english : customMatch.oshikwanyama);
      } else if (offlineMatch) {
        assembledTranslation.push(toEnglish ? offlineMatch.english : offlineMatch.native);
      } else if (navigator.onLine) {
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
      
      const { data, error } = await supabase
        .from('universal_dictionary')
        .select(`
          native_word, 
          english_translation,
          grammar_rules (present_continuous_concord, past_tense_concord)
        `)
        .ilike(targetColumn, cleanInput)
        .maybeSingle();

      if (data) {
        const rule = data.grammar_rules;
        const display = rule 
          ? `${data.native_word} ${isOshikwanyamaToEnglish ? '' : rule.present_continuous_concord}` 
          : data.native_word;
        setTranslatedText(isOshikwanyamaToEnglish ? data.english_translation : display);
      } else {
        const result = await processComplexSentence(inputText.trim(), isOshikwanyamaToEnglish);
        setTranslatedText(result || "Word not found.");
      }
    } catch (e) {
      setTranslatedText("Engine parsing conflict.");
    }
    setLoading(false);
  };

  const runSandboxSentenceTest = async () => {
    setLoading(true);
    try {
      const { data: nounData } = await supabase
        .from('universal_dictionary')
        .select('native_word, noun_class_ref')
        .eq('native_word', testSubject)
        .maybeSingle();

      if (nounData?.noun_class_ref) {
        const { data: classData } = await supabase
          .from('zimmerman_noun_classes')
          .select('*')
          .eq('class_id', nounData.noun_class_ref)
          .maybeSingle();

        if (classData) {
          const concord = testTense === 'present' 
            ? classData.present_continuous_concord 
            : classData.past_tense_concord;
          setSandboxResult(`[Engine]: ${nounData.native_word} ${concord} ${testVerb}`);
        }
      } else {
        setSandboxResult("Missing noun class reference in database.");
      }
    } catch (err) {
      setSandboxResult("Database connection error.");
    }
    setLoading(false);
  };

  const handleSaveToPreferredSpace = async () => {
    if (!inputText.trim() || !customTranslation.trim()) return;
    const englishWord = isOshikwanyamaToEnglish ? customTranslation.trim().toLowerCase() : inputText.trim().toLowerCase();
    const nativeWord = isOshikwanyamaToEnglish ? inputText.trim().toLowerCase() : customTranslation.trim().toLowerCase();

    const newItem: LibraryItem = { english: englishWord, oshikwanyama: nativeWord };
    const updatedLib = [newItem, ...userLibrary];
    setUserLibrary(updatedLib);
    if (Platform.OS === 'web') {
      localStorage.setItem('toloka_user_library', JSON.stringify(updatedLib));
    }

    try {
      const { error } = await supabase
        .from('universal_dictionary')
        .insert([{ language_code: 'kwanyama', native_word: nativeWord, english_translation: englishWord, pos_tag: 'noun' }]);

      if (!error) setTranslatedText(`Successfully synced "${nativeWord}"!`);
    } catch (dbError) {
      setTranslatedText("Saved locally.");
    }
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
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type..." placeholderTextColor="#4a4d61" />
            <TouchableOpacity style={styles.micButton} onPress={handleInputMicPress}>
              <Text>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{translatedText}</Text>
              <View style={styles.creationPanel}>
                <TextInput style={styles.customInput} value={customTranslation} onChangeText={setCustomTranslation} placeholder="Contribute translation..." placeholderTextColor="#636885" />
                <TouchableOpacity style={styles.saveWordButton} onPress={handleSaveToPreferredSpace}>
                  <Text style={styles.saveWordText}>✔ Push to Database</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
            <Text style={styles.buttonText}>Deconstruct & Translate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sandboxPanel}>
          <Text style={styles.sandboxTitle}>🧪 Zimmerman Relational Engine Test</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
            {['ombuto', 'meme', 'omumati'].map(sub => (
              <TouchableOpacity key={sub} style={[styles.tab, testSubject === sub && styles.activeTab]} onPress={() => setTestSubject(sub)}>
                <Text style={styles.tabText}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.sandboxRunButton} onPress={runSandboxSentenceTest}>
            <Text style={styles.runButtonText}>⚡ Extract Tags & Assemble</Text>
          </TouchableOpacity>
          {sandboxResult ? <Text style={styles.sandboxResultText}>{sandboxResult}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 60 },
  title: { fontSize: 50, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
  swapButton: { padding: 12, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20, alignItems: 'center' },
  clearButton: { padding: 12, borderColor: '#4a4d61', borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swapText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#0d0b18', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d', marginBottom: 25 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, fontSize: 20, color: '#fff', borderBottomWidth: 1, borderBottomColor: '#221e3d', paddingBottom: 10 },
  micButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  resultBox: { marginBottom: 20, padding: 15, backgroundColor: '#1a1829', borderRadius: 10 },
  resultText: { fontSize: 24, color: '#00f3ff', fontWeight: '700' },
  mainButton: { backgroundColor: '#00f3ff', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#05030a', fontWeight: '900', fontSize: 18 },
  creationPanel: { marginTop: 15, padding: 12, backgroundColor: '#0d0b18', borderRadius: 10, borderWidth: 1, borderColor: '#ff007f' },
  customInput: { backgroundColor: '#1a1829', color: '#fff', padding: 12, borderRadius: 8, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#221e3d' },
  saveWordButton: { backgroundColor: '#ff007f', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveWordText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sandboxPanel: { backgroundColor: '#110e24', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#3b2d75' },
  sandboxTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1a1636', borderWidth: 1, borderColor: '#2b2457' },
  activeTab: { backgroundColor: '#ff007f', borderColor: '#ff007f' },
  tabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sandboxRunButton: { backgroundColor: '#ff007f', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  runButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sandboxResultText: { color: '#00f3ff', marginTop: 15, fontSize: 14 }
});

```