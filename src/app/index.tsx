import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

interface LibraryItem {
  english: string;
  oshikwanyama: string;
}

// True Offline Dictionary Matrix used for offline fallbacks
const OFFLINE_LEXICON = [
  { native_word: 'teka', english_translation: 'draw water', pos_tag: 'verb_root' },
  { native_word: 'teleka', english_translation: 'cook', pos_tag: 'verb_root' },
  { native_word: 'lesha', english_translation: 'read', pos_tag: 'verb_root' },
  { native_word: 'enda', english_translation: 'walk', pos_tag: 'verb_root' },
  { native_word: 'mena', english_translation: 'grow', pos_tag: 'verb_root' },
  { native_word: 'ombuto', english_translation: 'seed', pos_tag: 'noun', noun_class_ref: 9 },
  { native_word: 'meme', english_translation: 'mother', pos_tag: 'noun', noun_class_ref: 1 },
  { native_word: 'omumati', english_translation: 'boy', pos_tag: 'noun', noun_class_ref: 1 },
  { native_word: 'tate', english_translation: 'father', pos_tag: 'noun', noun_class_ref: 1 }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isOshikwanyamaToEnglish, setIsOshikwanyamaToEnglish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [customTranslation, setCustomTranslation] = useState('');

  // Sandbox State Management
  const [testSubject, setTestSubject] = useState('ombuto');
  const [testVerb, setTestVerb] = useState('mena');
  const [testTense, setTestTense] = useState('present');
  const [sandboxResult, setSandboxResult] = useState('');

  // Hydrate user library safely if running via web instance
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

  // Offline Engine Word Binder
  const lookupOfflineWord = (word: string, toEnglish: boolean) => {
    const clean = word.trim().toLowerCase();
    const match = OFFLINE_LEXICON.find(item => 
      toEnglish ? item.native_word === clean : item.english_translation === clean
    );
    if (match) {
      return toEnglish ? match.english_translation : match.native_word;
    }
    return null;
  };

  // AI Online Translation Engine Fallback Core
  const callAIFallbackTranslation = async (text: string, toEnglish: boolean) => {
    try {
      const prompt = toEnglish 
        ? `Translate this Oshikwanyama text to English. Provide only the direct translation string, nothing else: "${text}"`
        : `Translate this English text to Oshikwanyama. Provide only the direct translation string, nothing else: "${text}"`;

      // Trigger Edge AI API endpoint route setup
      const response = await fetch('/api/translate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const aiData = await response.json();
      return aiData.text || null;
    } catch (err) {
      return null;
    }
  };

  // Split, deconstruct, and match strings using dynamic hybrid network configurations
  const processComplexSentence = async (sentence: string, toEnglish: boolean) => {
    let cleanInput = sentence.trim().toLowerCase().replace(/^(the|a|an)\s+/i, '');
    const words = cleanInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/);
    let assembledTranslation: string[] = [];
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word.trim() || word === 'the' || word === 'a' || word === 'an') continue;
        
        if (!isOnline) {
          // Rule 1: Offline mode exclusively tracks the local array matrix definitions
          const offlineMatch = lookupOfflineWord(word, toEnglish);
          assembledTranslation.push(offlineMatch || word);
        } else {
          // Rule 2: Online tracks Supabase data records directly
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
        }
    }
    return assembledTranslation.length > 0 ? assembledTranslation.join(' ') : null;
  };

  // Main Hybrid Online/Offline Translation Router Engine
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const cleanInput = inputText.trim().toLowerCase();
      const targetColumn = isOshikwanyamaToEnglish ? 'native_word' : 'english_translation';
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // --- OFFLINE MODE OPERATION ---
      if (!isOnline) {
        const offlineResult = lookupOfflineWord(cleanInput, isOshikwanyamaToEnglish);
        if (offlineResult) {
          setTranslatedText(offlineResult);
        } else {
          const complexOfflineResult = await processComplexSentence(inputText, isOshikwanyamaToEnglish);
          setTranslatedText(complexOfflineResult || "[Offline Mode]: Word variant not saved locally.");
        }
        setLoading(false);
        return;
      }

      // --- ONLINE MODE HYBRID STEP (Supabase Cache -> AI Engine) ---
      const { data } = await supabase
        .from('universal_dictionary')
        .select('*')
        .ilike(targetColumn, cleanInput)
        .maybeSingle();

      if (data) {
        setTranslatedText(isOshikwanyamaToEnglish ? data.english_translation : data.native_word);
      } else {
        // Step A: Attempt structural phrase segmentation mapping
        const processedSentence = await processComplexSentence(inputText, isOshikwanyamaToEnglish);
        
        // Step B: If phrase matching falls through, activate full context AI Translation
        if (!processedSentence || processedSentence === inputText) {
          const aiText = await callAIFallbackTranslation(inputText, isOshikwanyamaToEnglish);
          setTranslatedText(aiText || "Translation threshold unmatched across current services.");
        } else {
          setTranslatedText(processedSentence);
        }
      }
    } catch (e) {
      setTranslatedText("Linguistic interpretation interface error.");
    }
    setLoading(false);
  };

  // Safe cascading sentence assembler (checks noun_classes then falls back to zimmerman_noun_classes)
  const runSandboxSentenceTest = async () => {
    setLoading(true);
    setSandboxResult('');
    try {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        let nounData: any = null;
        let verbData: any = null;

        if (!isOnline) {
          // Offline evaluation from local constants
          nounData = OFFLINE_LEXICON.find(w => w.native_word === testSubject && w.pos_tag === 'noun');
          verbData = OFFLINE_LEXICON.find(w => w.native_word === testVerb && w.pos_tag === 'verb_root');
        } else {
          // Online live cloud system database pulling
          const { data: nD } = await supabase.from('universal_dictionary').select('*').eq('native_word', testSubject).maybeSingle();
          const { data: vD } = await supabase.from('universal_dictionary').select('*').eq('native_word', testVerb).maybeSingle();
          nounData = nD;
          verbData = vD;
        }

        if (nounData && verbData) {
            let concord = '';
            const targetClassId = nounData.noun_class_ref || 1;

            if (!isOnline) {
              // Static concord map evaluation for complete offline execution
              if (targetClassId === 1) concord = testTense === 'present' ? 'ota' : 'okwa';
              if (targetClassId === 9) concord = testTense === 'present' ? 'otai' : 'oda';
            } else {
              // FIRST TRY: Production 'noun_classes' table
              const { data: ncData } = await supabase.from('noun_classes').select('*').eq('class_id', targetClassId).maybeSingle();
              if (ncData) {
                  concord = testTense === 'present' ? ncData.present_continuous_concord : ncData.past_tense_concord;
              }
              // SECOND TRY FALLBACK: If nothing found, check 'zimmerman_noun_classes'
              if (!concord) {
                  const { data: zncData } = await supabase.from('zimmerman_noun_classes').select('*').eq('class_id', targetClassId).maybeSingle();
                  if (zncData) {
                      concord = testTense === 'present' ? zncData.present_continuous_concord : zncData.past_tense_concord;
                  }
              }
            }

            // Execute syntax mutations based on terminal variables
            let finalVerbText = verbData.native_word;
            if (testTense === 'present' && verbData.terminal_vowel_mutation === 'mutates_to_e_in_present') {
                if (finalVerbText.endsWith('a')) {
                    finalVerbText = finalVerbText.slice(0, -1) + 'e';
                }
            }

            if (concord) {
                setSandboxResult(`[Oshikwanyama]: ${nounData.native_word} ${concord} ${finalVerbText}`);
            } else {
                setSandboxResult(`[Oshikwanyama]: ${nounData.native_word} ${finalVerbText} (Concord definitions missing from your active class matrices)`);
            }
        } else {
            setSandboxResult("Engine Error: The selected variables could not be found or processed.");
        }
    } catch (err) {
        setSandboxResult("Linguistic relational engine processing failure.");
    }
    setLoading(false);
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
            <Text style={{color: '#ff007f', fontWeight: 'bold'}}>✖</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Translation Card */}
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type words here..." placeholderTextColor="#4a4d61" />
            <TouchableOpacity style={styles.micButton} onPress={handleInputMicPress}>
              <Text style={{fontSize: 18}}>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? <ActivityIndicator color="#00f3ff" style={{marginVertical: 10}} /> : translatedText ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{translatedText}</Text>
              <TouchableOpacity style={{marginTop: 15}} onPress={() => Speech.speak(translatedText)}>
                <Text style={{color: '#ff007f', fontWeight: '700'}}>🔊 Play Phoneme Audio</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
            <Text style={styles.buttonText}>Deconstruct & Translate</Text>
          </TouchableOpacity>
        </View>

        {/* Relational Parsing Sandbox Panel */}
        <View style={styles.sandboxPanel}>
          <Text style={styles.sandboxTitle}>🧪 Zimmerman Relational Engine Test</Text>
          <Text style={styles.sandboxSubtitle}>Synchronizes cross-compatible components across tables:</Text>
          
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>1. Select Subject Noun:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {['ombuto', 'meme', 'omumati'].map(sub => (
                <TouchableOpacity key={sub} style={[styles.tab, testSubject === sub && styles.activeTab]} onPress={() => setTestSubject(sub)}>
                  <Text style={styles.tabText}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>2. Select Verb Action Root:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {['mena', 'teleka', 'lesha', 'enda'].map(vrb => (
                <TouchableOpacity key={vrb} style={[styles.tab, testVerb === vrb && styles.activeTab]} onPress={() => setTestVerb(vrb)}>
                  <Text style={styles.tabText}>{vrb}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginBottom: 18 }}>
            <Text style={styles.label}>3. Select Sentence Tense Rule:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {['present', 'past'].map(tns => (
                <TouchableOpacity key={tns} style={[styles.tab, testTense === tns && styles.activeTab]} onPress={() => setTestTense(tns)}>
                  <Text style={styles.tabText}>{tns === 'present' ? 'Present Continuous' : 'Past Tense'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.sandboxRunButton} onPress={runSandboxSentenceTest}>
            <Text style={styles.runButtonText}>⚡ Extract Tags & Assemble Sentence</Text>
          </TouchableOpacity>

          {sandboxResult ? (
            <View style={styles.sandboxResultBox}>
              <Text style={styles.sandboxResultText}>{sandboxResult}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05030a' },
  scroll: { padding: 20, maxWidth: 480, alignSelf: 'center', paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 50, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
  swapButton: { padding: 12, borderColor: '#ff007f', borderWidth: 1, borderRadius: 20, alignItems: 'center', flex: 1 },
  clearButton: { width: 45, height: 45, borderColor: '#4a4d61', borderWidth: 1, borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' },
  swapText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#0d0b18', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#221e3d', marginBottom: 25 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: { flex: 1, fontSize: 20, color: '#fff', borderBottomWidth: 1, borderBottomColor: '#221e3d', paddingBottom: 10 },
  micButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderColor: '#00f3ff', borderWidth: 1 },
  resultBox: { marginBottom: 20, padding: 15, backgroundColor: '#1a1829', borderRadius: 10 },
  resultText: { fontSize: 24, color: '#00f3ff', fontWeight: '700' },
  mainButton: { backgroundColor: '#00f3ff', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#05030a', fontWeight: '900', fontSize: 18 },
  sandboxPanel: { backgroundColor: '#110e24', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#3b2d75', marginBottom: 25 },
  sandboxTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sandboxSubtitle: { color: '#6e679a', fontSize: 13, marginBottom: 15 },
  label: { color: '#b4aee8', fontSize: 14, fontWeight: '600' },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1a1636', borderWidth: 1, borderColor: '#2b2457' },
  activeTab: { backgroundColor: '#ff007f', borderColor: '#ff007f' },
  tabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sandboxRunButton: { backgroundColor: '#ff007f', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  runButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sandboxResultBox: { marginTop: 15, padding: 12, backgroundColor: '#080614', borderRadius: 8, borderWidth: 1, borderColor: '#00f3ff' },
  sandboxResultText: { color: '#00f3ff', fontSize: 14, fontWeight: '600', lineHeight: 20 }
});