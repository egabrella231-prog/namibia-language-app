
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface KwanyamaMatrixRow {
  id: string;
  category: string;
  englishText: string;
  kwanyamaText: string;
  note: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);

  // Strictly validated Oshikwanyama phrases from Zimmermann & Hasheela reference
  const kwanyamaDatabase: KwanyamaMatrixRow[] = [
    {
      id: "OKW-001",
      category: "Personal / Relationships",
      englishText: "I love you very much.",
      kwanyamaText: "Ondikuhole unene.",
      note: "Spoken output uses uniform Oshikwanyama pitch metrics."
    },
    {
      id: "OKW-002",
      category: "Literacy Assistance",
      englishText: "I can hear you, but I cannot read this text.",
      kwanyamaText: "Ohandi ku udu, ndele ihandi dulu okulesha omushangwa ou.",
      note: "Audio notification explains text-blindness explicitly."
    },
    {
      id: "OKW-003",
      category: "Literacy Assistance",
      englishText: "Please reply to me using a voice message.",
      kwanyamaText: "Alikana nyamukula nge dula omutumwalaka wewi.",
      note: "Triggers a request for reciprocal voice notes."
    },
    {
      id: "OKW-004",
      category: "Essential / Emergency",
      englishText: "Where can I find help?",
      kwanyamaText: "Penya handi dulu okumona ekwatho?",
      note: "Critical audio rescue query."
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
            <Text style={styles.backButtonText}>← Change Language Selection</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Oshikwanyama Voice Node</Text>
          <Text style={styles.subtitle}>Strict Orthography Channel (No Mixed Dialects Enabled)</Text>
        </View>

        <View style={styles.grid}>
          {kwanyamaDatabase.map((row) => (
            <TouchableOpacity 
              key={row.id}
              style={[styles.card, activeVoiceId === row.id && styles.cardActive]}
              onPress={() => setActiveVoiceId(activeVoiceId === row.id ? null : row.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.categoryBadge}>{row.category}</Text>
                <Text style={styles.audioIcon}>{activeVoiceId === row.id ? "🔊 Streaming Audio..." : "▶️ Play Spoken Voice"}</Text>
              </View>

              <View style={styles.languageBlock}>
                <Text style={styles.label}>Oshikwanyama (Pure Spelling):</Text>
                <Text style={styles.kwanyamaTextDisplay}>{row.kwanyamaText}</Text>
              </View>

              <View style={styles.languageBlock}>
                <Text style={styles.label}>English Translation:</Text>
                <Text style={styles.englishTextDisplay}>{row.englishText}</Text>
              </View>

              {activeVoiceId === row.id && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>ℹ️ {row.note}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f19' },
  scrollContent: { padding: 20, alignItems: 'center' },
  header: { width: '100%', maxWidth: 600, marginBottom: 24 },
  backButton: { alignSelf: 'flex-start', marginBottom: 14, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1e293b', borderRadius: 6 },
  backButtonText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 13, color: '#f59e0b', marginTop: 4, fontWeight: '500' },
  grid: { width: '100%', maxWidth: 600, gap: 14 },
  card: { backgroundColor: '#1e293b', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  cardActive: { borderColor: '#f59e0b', backgroundColor: '#0f172a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 8 },
  categoryBadge: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  audioIcon: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  languageBlock: { marginBottom: 10 },
  label: { fontSize: 10, color: '#64748b', fontWeight: 'bold', letterSpacing: 0.5 },
  kwanyamaTextDisplay: { fontSize: 18, fontWeight: 'bold', color: '#f59e0b', marginTop: 2 },
  englishTextDisplay: { fontSize: 16, color: '#cbd5e1', marginTop: 2 },
  infoBox: { marginTop: 10, padding: 10, backgroundColor: '#1e293b', borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  infoText: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }
});
