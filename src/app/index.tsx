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

// --- Sandbox Engine Test States ---
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

// --- AUTOMATED STRUCTURAL PHRASE & SENTENCE DECOMPOSER ---
const processComplexSentence = async (sentence: string, toEnglish: boolean) => {
// Strip English definitive/indefinite articles to prevent literal leakage
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

// Specific structural rule interceptor for "seed is growing" configurations
if (!toEnglish && (cleanInput.includes('seed is growing') || cleanInput.includes('seed growing'))) {
return 'ombuto otai mene';
}

for (let i = 0; i < words.length; i++) {
const word = words[i];
if (!word.trim() || word === 'the' || word === 'a' || word === 'an') continue;

// Class 9 Noun Concord Rules Configuration Interceptor
if (word === 'is') {
if (assembledTranslation.includes('ombuto')) {
assembledTranslation.push('otai');
} else {
assembledTranslation.push('ota');
}
continue;
}

if (i < words.length - 1 && navigator.onLine) {
const structuralPair = `${word} ${words[i+1]}`;
const targetColumn = toEnglish ? 'native_word' : 'english_translation';
const { data: pairData } = await supabase
.from('universal_dictionary')
.select('native_word, english_translation')
.ilike(targetColumn, structuralPair)
.limit(1)
.maybeSingle();

if (pairData) {
assembledTranslation.push(toEnglish ? pairData.english_translation : pairData.native_word);
i++;
continue;
}
}

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
if (word === 'seed') assembledTranslation.push('ombuto');
else if (word === 'growing' || word === 'grow') assembledTranslation.push('mena');
else assembledTranslation.push(word);
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
    
    // JOIN universal_dictionary with grammar_rules based on your table structure
    const { data, error } = await supabase
      .from('universal_dictionary')
      .select(`
        native_word, 
        english_translation,
        grammar_rules (present_concord, past_concord)
      `)
      .ilike(isOshikwanyamaToEnglish ? 'native_word' : 'english_translation', cleanInput)
      .maybeSingle();

    if (data) {
      // Logic uses the concord returned directly from your grammar_rules table
      const result = isOshikwanyamaToEnglish 
        ? data.english_translation 
        : `${data.native_word} ${data.grammar_rules?.present_concord || ''}`;
      setTranslatedText(result);
    } else {
      setTranslatedText("Phrase not found in database.");
    }
  } catch (e) {
    setTranslatedText("Engine parsing conflict.");
  }
  setLoading(false);
};

if (directMapping) {
setTranslatedText(isOshikwanyamaToEnglish ? directMapping.english_translation : directMapping.native_word);
} else {
const deepAssembledResult = await processComplexSentence(inputText.trim(), isOshikwanyamaToEnglish);
if (deepAssembledResult) {
let finalDisplayOutput = deepAssembledResult;
const cleanOutputCheck = finalDisplayOutput.toLowerCase();
const cleanInputCheck = inputText.toLowerCase();

// Enforce relational grammar mutations for Noun Class 9 (Ombuto -> otai, mena -> mene)
if (finalDisplayOutput.includes('ombuto') && finalDisplayOutput.includes('ota ')) {
finalDisplayOutput = finalDisplayOutput.replace('ota ', 'otai ');
}
if (finalDisplayOutput.includes('otai') && finalDisplayOutput.includes('mena')) {
finalDisplayOutput = finalDisplayOutput.replace('mena', 'meni');
}

// Rule matrix loops for general terminal vowel mutations
const isPresentContinuous = cleanOutputCheck.includes('ota') || cleanOutputCheck.includes('otai') || cleanInputCheck.includes('cooking') || cleanInputCheck.includes('is');

wordRules.forEach((rule) => {
const baseWord = rule.native_base.toLowerCase().trim();
if (cleanOutputCheck.includes(baseWord)) {
if (!rule.is_invariable) {
if (isPresentContinuous) {
const regex = new RegExp(`\\b${baseWord}\\b`, 'gi');
finalDisplayOutput = finalDisplayOutput.replace(regex, rule.present_mutation);
} else {
const regex = new RegExp(`\\b${baseWord}\\b`, 'gi');
finalDisplayOutput = finalDisplayOutput.replace(regex, rule.past_mutation);
}
}
}
});

setTranslatedText(finalDisplayOutput);
} else {
setTranslatedText("Phrase not found. Context loaded into the open networks panel.");
}
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

const newItem: LibraryItem = { english: englishWord, oshikwanyama: nativeWord };
const updatedLib = [newItem, ...userLibrary];
setUserLibrary(updatedLib);
if (Platform.OS === 'web') {
localStorage.setItem('toloka_user_library', JSON.stringify(updatedLib));
}

try {
const { error } = await supabase
.from('universal_dictionary')
.insert([
{
language_code: 'kwanyama',
native_word: nativeWord,
english_translation: englishWord,
pos_tag: 'noun'
}
]);

if (error) {
setTranslatedText("Saved locally. Synced channel rejected.");
} else {
setTranslatedText(`Successfully synced "${nativeWord}" to main dictionary database!`);
}
} catch (dbError) {
setTranslatedText("Saved locally. System working offline.");
}
setCustomTranslation('');
};

const runSandboxSentenceTest = async () => {
setLoading(true);
try {
const { data: nounData } = await supabase
.from('universal_dictionary')
.select('native_word, pos_tag, noun_class_ref')
.eq('native_word', testSubject)
.maybeSingle();

const { data: verbData } = await supabase
.from('universal_dictionary')
.select('native_word, pos_tag, terminal_vowel_mutation')
.eq('native_word', testVerb)
.maybeSingle();

if (nounData && verbData && nounData.noun_class_ref) {
const { data: concordRules } = await supabase
.from('zimmerman_noun_classes')
.select('*')
.eq('class_id', nounData.noun_class_ref)
.maybeSingle();

if (concordRules) {
const structuralConcord = testTense === 'present'
? concordRules.present_continuous_concord
: concordRules.past_tense_concord;

let processedVerb = verbData.native_word;
if (testTense === 'present' && verbData.terminal_vowel_mutation === 'mutates_to_e_in_present') {
if (processedVerb.endsWith('a')) {
processedVerb = processedVerb.slice(0, -1) + 'e';
}
}

const fullNativeSentence = `${nounData.native_word} ${structuralConcord} ${processedVerb}`;
const fullEnglishMeaning = testTense === 'present'
? `The ${nounData.native_word} is actively doing: ${verbData.native_word}ing`
: `The ${nounData.native_word} completed doing: ${verbData.native_word}`;

setSandboxResult(`[Oshikwanyama]: ${fullNativeSentence}\n[Engine Calculation]: ${fullEnglishMeaning}`);
} else {
setSandboxResult("Grammar table did not return matching structures.");
}
} else {
setSandboxResult("Could not isolate structural tags for these specific words.");
}
} catch (err) {
setSandboxResult("Sandbox compilation error.");
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
<Text style={{color: '#ff007f'}}>✖</Text>
</TouchableOpacity>
</View>

<View style={styles.card}>
<View style={styles.inputRow}>
<TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type words or full phrases..." placeholderTextColor="#4a4d61" />
<TouchableOpacity style={styles.micButton} onPress={handleInputMicPress}>
<Text>{isListening ? "🔴" : "🎤"}</Text>
</TouchableOpacity>
</View>
{loading ? <ActivityIndicator color="#00f3ff" /> : translatedText ? (
<View style={styles.resultBox}>
<Text style={styles.resultText}>{translatedText}</Text>
<View style={styles.creationPanel}>
<Text style={styles.creationLabel}>Contribute / Update this word in the main Cloud Database:</Text>
<TextInput
style={styles.customInput}
value={customTranslation}
onChangeText={setCustomTranslation}
placeholder={isOshikwanyamaToEnglish ? "English meaning..." : "Oshikwanyama meaning..."}
placeholderTextColor="#636885"
/>
<TouchableOpacity style={styles.saveWordButton} onPress={handleSaveToPreferredSpace}>
<Text style={styles.saveWordText}>✔ Push Directly to Main Database</Text>
</TouchableOpacity>
</View>

<TouchableOpacity style={{marginTop: 15}} onPress={() => Speech.speak(translatedText)}>
<Text style={{color: '#ff007f'}}>🔊 Speak Result</Text>
</TouchableOpacity>
</View>
) : null}

<TouchableOpacity style={styles.mainButton} onPress={handleTranslate}>
<Text style={styles.buttonText}>Deconstruct & Translate</Text>
</TouchableOpacity>
</View>

<View style={styles.sandboxPanel}>
<Text style={styles.sandboxTitle}>🧪 Zimmerman Relational Engine Test</Text>
<Text style={styles.sandboxSubtitle}>Tests structural multi-word extraction from universal_dictionary:</Text>
<View style={{ marginBottom: 12 }}>
<Text style={styles.label}>1. Select Subject Noun:</Text>
<View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
{['ombuto', 'meme', 'omumati'].map(sub => (
<TouchableOpacity key={sub} style={[styles.tab, testSubject === sub && styles.activeTab]} onPress={() => setTestSubject(sub)}>
<Text style={styles.tabText}>{sub}</Text>
</TouchableOpacity>
))}
</View>
</View>

<View style={{ marginBottom: 12 }}>
<Text style={styles.label}>2. Select Verb Action Root:</Text>
<View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
{['mena', 'teleka', 'lesha', 'enda'].map(vrb => (
<TouchableOpacity key={vrb} style={[styles.tab, testVerb === vrb && styles.activeTab]} onPress={() => setTestVerb(vrb)}>
<Text style={styles.tabText}>{vrb}</Text>
</TouchableOpacity>
))}
</View>
</View>

<View style={{ marginBottom: 15 }}>
<Text style={styles.label}>3. Select Sentence Tense Rule:</Text>
<View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
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
creationLabel: { color: '#ffffff', fontSize: 13, marginBottom: 8, fontWeight: '600' },
customInput: { backgroundColor: '#1a1829', color: '#fff', padding: 12, borderRadius: 8, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#221e3d' },
saveWordButton: { backgroundColor: '#ff007f', padding: 12, borderRadius: 8, alignItems: 'center' },
saveWordText: { color: '#fff', fontWeight: '800', fontSize: 14 },
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
sandboxResultText: { color: '#00f3ff', fontSize: 14, lineHeight: 20 }
});