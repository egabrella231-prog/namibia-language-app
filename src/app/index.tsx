import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase'; // Adjust this import path if your file lives elsewhere
import * as Speech from 'expo-speech';

// Type definitions for dictionary entries
interface DictionaryWord {
  id: string;
  english_word: string;
  translated_word: string;
  language: string;
  pronunciation_hint?: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [filteredWords, setFilteredWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Load dictionary on startup
  useEffect(() => {
    fetchDictionary();
  }, []);

  // Handle filtering when user types or changes language selection
  useEffect(() => {
    const filtered = words.filter((item) => {
      const matchesLanguage = item.language.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesSearch = 
        item.english_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.translated_word.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLanguage && matchesSearch;
    });
    setFilteredWords(filtered);
  }, [searchQuery, selectedLanguage, words]);

  // Main fetch engine with built-in fallback logic
  const fetchDictionary = async () => {
    setLoading(true);
    try {
      // 1. Try to fetch fresh records from cloud Supabase instance
      const { data, error } = await supabase
        .from('dictionary') // Replace with your exact Supabase table name if different
        .select('*');

      if (error) throw error;

      if (data) {
        setWords(data);
        setIsOffline(false);
        // Save to local device storage container for future offline use
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('cached_dictionary', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.log('Network fetch failed, activating offline mode...', err);
      setIsOffline(true);

      // 2. Fallback: Retrieve the last successful download from cache storage
      if (typeof window !== 'undefined' && window.localStorage) {
        const cachedData = window.localStorage.getItem('cached_dictionary');
        if (cachedData) {
          setWords(JSON.parse(cachedData));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger Native Text-to-Speech Engine
  const speakWord = (text: string) => {
    if (!text) return;
    Speech.speak(text, {
      language: selectedLanguage === 'Oshikwanyama' ? 'en' : 'en', // Fallback to compatible vocal nodes
      pitch: 1.0,
      rate: 0.85,
    });
  };

  return (
    <View style={styles.container}>
      {/* App Header Banner */}
      <View style={styles.header}>
        <Text style={styles.title}>Toloka: Namibia</Text>
        <Text style={styles.subtitle}>Speech Bridge Dictionary</Text>
        
        {/* Sync / Status Indicator Banner */}
        <View style={[styles.statusBadge, isOffline ? styles.offlineBadge : styles.onlineBadge]}>
          <Text style={styles.statusText}>
            {isOffline ? '⚠️ Offline Mode (Cached Data)' : '🟢 Connected to Cloud'}
          </Text>
        </View>
      </View>

      {/* Language Selector Controls */}
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

      {/* Search Input Box */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search English or local words..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#888"
      />

      {/* Render Component State Layout */}
      {loading ? (
        <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vocabulary terms found matching your query.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.wordCard}>
              <View style={styles.wordInfo}>
                <Text style={styles.englishWord}>{item.english_word}</Text>
                <Text style={styles.translatedWord}>{item.translated_word}</Text>
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
  activeTab: { backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 16, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#0066cc' },
  searchBar: { backgroundColor: '#fff', padding: 14, borderRadius: 8, fontSize: 16, borderHorizontalWidth: 1, borderColor: '#ddd', marginBottom: 16, color: '#333' },
  wordCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  wordInfo: { flex: 1, paddingRight: 8 },
  englishWord: { fontSize: 14, color: '#777', textTransform: 'uppercase', fontWeight: '500' },
  translatedWord: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 2 },
  hintText: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 4 },
  speakButton: { backgroundColor: '#e6f0fa', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  speakIcon: { fontSize: 18 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 16 },
});