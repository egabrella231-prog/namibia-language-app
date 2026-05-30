import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

export default function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    setLoading(true);
    
    // The query fetches the word and the associated grammar rule in one operation
    const words = input.toLowerCase().split(' ');
    
    const { data, error } = await supabase
      .from('universal_dictionary')
      .select(`
        native_word, 
        grammar_rules (present_concord)
      `)
      .ilike('english_translation', `%${words[0]}%`)
      .single();

    if (data && data.grammar_rules) {
      // Dynamic Assembly: The UI doesn't know the rules, it just displays what the DB provides
      const concord = data.grammar_rules.present_concord;
      const verb = "teleka"; // Placeholder: In a full implementation, fetch this from DB too
      
      const finalOutput = `${data.native_word} ${concord} ${verb}`;
      setResult(finalOutput);
      Speech.speak(finalOutput, { language: 'kwanyama' });
    } else {
      setResult("Word/Rule not found in database.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Toloka Engine</Text>
      <TextInput 
        style={styles.input} 
        onChangeText={setInput} 
        placeholder="Enter subject (e.g., seed, boy)..." 
        placeholderTextColor="#666"
      />
      <TouchableOpacity style={styles.button} onPress={handleTranslate}>
        <Text style={styles.buttonText}>Deconstruct & Translate</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color="#00f3ff" style={{marginTop: 20}} /> : null}
      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#05030a' },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 30, textAlign: 'center' },
  input: { borderBottomWidth: 2, borderBottomColor: '#3b2d75', fontSize: 20, color: '#fff', paddingBottom: 10, marginBottom: 20 },
  button: { backgroundColor: '#ff007f', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  result: { fontSize: 28, marginTop: 30, color: '#00f3ff', textAlign: 'center', fontWeight: 'bold' }
});