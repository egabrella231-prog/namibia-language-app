import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

interface DictionaryWord {
  id: string;
  english_word: string;
  translated_word: string;
  language: string;
  pronunciation_hint?: string;
}

const FALLBACK_WORDS: DictionaryWord[] = [
  { id: 'f1', english_word: 'Hello', translated_word: 'Wa aluka', language: 'Oshikwanyama', pronunciation_hint: 'Wah ah-loo-kah' },
  { id: 'f2', english_word: 'Thank you', translated_word: 'Tangi unene', language: 'Oshikwanyama', pronunciation_hint: 'Tahn-gee oo-neh-neh' },
  { id: 'f3', english_word: 'Welcome', translated_word: 'Mbe uya', language: 'Otjiherero', pronunciation_hint: 'Mbeh oo-yah' },
  { id: 'f4', english_word: 'Good morning', translated_word: 'Wamuhuka', language: 'Otjiherero', pronunciation_hint: 'Wah-moo-hoo-kah' }
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetchDictionary();
  }, []);

  useEffect(() => {
    const dataToFilter = words.length > 0 ? words : FALLBACK_WORDS;
    const filtered = dataToFilter.filter((item) => {
      // Safe fallback checks to prevent toLowerCase() crashes on missing column names
      const itemLang = item?.language ? String(item.language).toLowerCase() : '';
      const targetLang = selectedLanguage ? selectedLanguage.toLowerCase() : '';
      
      const englishWord = item?.english_word ? String(item.english_word).toLowerCase() : '';
      const localWord = item?.translated_word ? String(item.translated_word).toLowerCase() : '';
      const search = searchQuery ? searchQuery.toLowerCase() : '';

      const matchesLanguage = itemLang === targetLang;
      const matchesSearch = englishWord.includes(search) || localWord.includes(search);
      
      return matchesLanguage && matchesSearch;
    });
    setFilteredWords(filtered);
  }, [searchQuery, selectedLanguage, words]);

  const fetchDictionary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dictionary')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        setWords(data);
        setIsOffline(false);
      } else {
        setWords(FALLBACK_WORDS);
      }
    } catch (err) {
      console.log('Database connection failed. Using local offline records safely.', err);
      setIsOffline(true);
      setWords(FALLBACK_WORDS);
    } finally {
      setLoading(false);
    }
  };

  const speakWord = (text: string) => {
    if (!text) return;
    try {
      Speech.speak(text, { pitch: 1.0, rate: 0.85 });
    } catch (e) {
      console.log('TTS vocal module error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Toloka: Namibia</Text>
        <Text style={styles.subtitle}>Speech Bridge Dictionary</Text>
        
        <View style={[styles.statusBadge, isOffline ? styles.offlineBadge : styles.onlineBadge]}>
          <Text style={styles.statusText}>
            {isOffline ? '⚠️ Offline Mode (Local Dataset)' : '🟢 Connected to Cloud'}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {(['Oshikwanyama', 'Otjiherero'] as const).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.tab, selectedLanguage === lang && styles.activeTab]}
            onPress={() => setSelectedLanguage(lang)}
          >
            <Text style={[styles.tabText, selectedLanguage === lang && styles.activeTabText]}>
              {lang}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Search English or local words..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#888"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item, index) => item?.id || String(index)}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vocabulary terms found matching your query.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.wordCard}>
              <View style={styles.wordInfo}>
                <Text style={styles.englishWord}>{item.english_word || 'No English'}</Text>
                <Text style={styles.translatedWord}>{item.translated_word || 'No Translation'}</Text>
                {item.pronunciation_hint && (
                  <Text style={styles.hintText}>🗣️ {item.pronunciation_hint}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.speakButton} onPress={() => speakWord(item.translated_word)}>
                <Text style={styles.speakIcon}>🔊</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb', paddingHorizontal: 16, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, marginTop: 10 },
  onlineBadge: { backgroundColor: '#e2f9e9' },
  offlineBadge: { backgroundColor: '#fff3cd' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e4e7eb', borderRadius: 8, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#ffffff', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 16, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#0066cc' },
  searchBar: { backgroundColor: '#fff', padding: 14, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, color: '#333' },
  wordCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eaeaea' },
  wordInfo: { flex: 1, paddingRight: 8 },
  englishWord: { fontSize: 14, color: '#777', textTransform: 'uppercase', fontWeight: '500' },
  translatedWord: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 2 },
  hintText: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 4 },
  speakButton: { backgroundColor: '#e6f0fa', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  speakIcon: { fontSize: 18 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 16 },
});