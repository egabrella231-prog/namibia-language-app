import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Speech from 'expo-speech';

// Expansive Multi-Tier Local Offline Dictionary 
const OFFLINE_DICTIONARY = [
  // Oshikwanyama Pairs
  { english_word: 'good', translated_word: 'nawa', language: 'oshikwanyama' },
  { english_word: 'hello', translated_word: 'wa aluka', language: 'oshikwanyama' },
  { english_word: 'hello', translated_word: 'walelepo', language: 'oshikwanyama' },
  { english_word: 'how are you', translated_word: 'ongeipi', language: 'oshikwanyama' },
  { english_word: 'thank you', translated_word: 'tangi unene', language: 'oshikwanyama' },
  { english_word: 'bye', translated_word: 'paife', language: 'oshikwanyama' },
  
  // Otjiherero Pairs
  { english_word: 'good', translated_word: 'nawa', language: 'otjiherero' },
  { english_word: 'hello', translated_word: 'tjike', language: 'otjiherero' },
  { english_word: 'hello', translated_word: 'koreva', language: 'otjiherero' },
  { english_word: 'how are you', translated_word: 'matavi', language: 'otjiherero' },
  { english_word: 'thank you', translated_word: 'okuhepa', language: 'otjiherero' },
  { english_word: 'bye', translated_word: 'uharapo', language: 'otjiherero' }
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'Oshikwanyama' | 'Otjiherero'>('Oshikwanyama');
  const [isLocalToEnglish, setIsLocalToEnglish] = useState(true); // Default to Local -> English based on screenshot
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<any[]>(OFFLINE_DICTIONARY);
  
  // App Functional States
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Synchronize database records on startup with immediate local verification
  useEffect(() => {
    const fetchPhrases = async () => {
      try {
        const { data, error } = await supabase.from('dictionary').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          // Merge local core dictionary with remote assets safely
          const merged = [...OFFLINE_DICTIONARY, ...data.filter(d => 
            !OFFLINE_DICTIONARY.some(o => o.english_word === d.english_word && o.language === d.language)
          )];
          setWords(merged);
          console.log("Cloud synced successfully.");
        }
      } catch (err) {
        console.log('Operating in pure offline localized database sandbox safely:', err);
        setWords(OFFLINE_DICTIONARY);
      }
    };
    fetchPhrases();
  }, []);

  // Universal Web Speech Recognition Interface Initialization
  useEffect(() => {
    if (Platform.OS === 'web') {
      const WebSpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (WebSpeechRecognition) {
        const recognition = new WebSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => setIsListening(true);
        recognition.onerror = (e: any) => {
          console.log("Speech recognition exception caught: ", e);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
          const speechToTextResult = event.results[0][0].transcript;
          if (speechToTextResult) {
            // Write the spoken word into input block instantly
            setInputText(speechToTextResult);
          }
        };
        setRecognitionInstance(recognition);
      }
    }
  }, [selectedLanguage, isLocalToEnglish]);

  // Handle Speech-to-Text Dictation Toggle
  const toggleSpeechRecognition = () => {
    if (!recognitionInstance) {
      alert("Voice Dictation is only supported on Google Chrome, Safari, and modern web engines currently.");
      return;
    }

    if (isListening) {
      recognitionInstance.stop();
    } else {
      // Dynamically assign target locale rules
      recognitionInstance.lang = isLocalToEnglish ? 'en-ZA' : 'en-US'; 
      try {
        recognitionInstance.start();
      } catch (err) {
        console.log("Speech restart collision managed cleanly: ", err);
      }
    }
  };

  // Enhanced Substring Fuzzy Matching Translation Engine
  const handleTranslate = () => {
    const cleanInput = inputText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    if (!cleanInput) {
      setTranslatedText('');
      return;
    }

    setLoading(true);

    const currentLangWords = words.filter(
      (item) => String(item?.language || '').trim().toLowerCase() === selectedLanguage.toLowerCase()
    );

    let match = null;

    if (isLocalToEnglish) {
      // Local Language ➔ English Path (Fuzzy containment check)
      match = currentLangWords.find(
        (w) => String(w?.translated_word || '').trim().toLowerCase() === cleanInput ||
               cleanInput.includes(String(w?.translated_word || '').trim().toLowerCase())
      );
      if (match) {
        setTranslatedText(match.english_word);
        triggerTextToSpeechPlay(match.english_word, 'en-US'); // Auto read out English output
      } else {
        setTranslatedText("Translation not found in dictionary.");
      }
    } else {
      // English ➔ Local Language Path
      match = currentLangWords.find(
        (w) => String(w?.english_word || '').trim().toLowerCase() === cleanInput ||
               cleanInput.includes(String(w?.english_word || '').trim().toLowerCase())
      );
      if (match) {
        setTranslatedText(match.translated_word);
        triggerTextToSpeechPlay(match.translated_word, 'en-ZA'); // Auto read out Local translation
      } else {
        setTranslatedText("Translation not found in dictionary.");
      }
    }

    setLoading(false);
  };

  // Native Text-To-Speech Output Engine 
  const triggerTextToSpeechPlay = (text: string, localeCode: string) => {
    try {
      Speech.stop();
      Speech.speak(text, { 
        language: localeCode,
        pitch: 1.0, 
        rate: 0.88
      });
    } catch (e) {
      console.log('Audio track translation output missed:', e);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Neon Digital Header */}
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>Toloka</Text>
          <View style={styles.neonBadge}>
            <Text style={styles.subtitle}>NAMIBIA SPEECH BRIDGE</Text>
          </View>
        </View>

        {/* Target Language Card Selection */}
        <View style={styles.neonCard}>
          <Text style={styles.sectionLabel}>CHOOSE TARGET NAMIBIAN LANGUAGE</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.langButton, 
                selectedLanguage === 'Oshikwanyama' && styles.activeLangButton,
                hoveredButton === 'osh' && styles.langButtonHovered
              ]}
              onPress={() => setSelectedLanguage('Oshikwanyama')}
              {...Platform.select({
                web: {
                  onMouseEnter: () => setHoveredButton('osh'),
                  onMouseLeave: () => setHoveredButton(null)
                }
              } as any)}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Oshikwanyama' && styles.activeLangButtonText]}>
                Oshikwanyama
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.langButton, 
                selectedLanguage === 'Otjiherero' && styles.activeLangButton,
                hoveredButton === 'otj' && styles.langButtonHovered
              ]}
              onPress={() => setSelectedLanguage('Otjiherero')}
              {...Platform.select({
                web: {
                  onMouseEnter: () => setHoveredButton('otj'),
                  onMouseLeave: () => setHoveredButton(null)
                }
              } as any)}
            >
              <Text style={[styles.langButtonText, selectedLanguage === 'Otjiherero' && styles.activeLangButtonText]}>
                Otjiherero
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Direction Swap Toggle */}
        <View style={styles.directionWrapper}>
          <Text style={styles.directionTextText}>
            {isLocalToEnglish ? `${selectedLanguage} ➔ English` : `English ➔ ${selectedLanguage}`}
          </Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.neonSwapButton, hoveredButton === 'swap' && styles.neonSwapButtonHovered]} 
            onPress={() => {
              setIsLocalToEnglish(!isLocalToEnglish);
              setInputText('');
              setTranslatedText('');
            }}
            {...Platform.select({
              web: {
                onMouseEnter: () => setHoveredButton('swap'),
                onMouseLeave: () => setHoveredButton(null)
              }
            } as any)}
          >
            <Text style={styles.swapButtonText}>⇄ Swap Path</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Functional Translation Deck */}
        <View style={[styles.mainConsoleCard, isFocused && styles.mainConsoleCardFocused]}>
          <View style={styles.interactiveInputRow}>
            <TextInput
              style={styles.cleanTextArea}
              multiline
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLocalToEnglish ? `Speak or type ${selectedLanguage}...` : "Speak or type English..."}
              placeholderTextColor="#555861"
              value={inputText}
              onChangeText={setInputText}
            />
            
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[
                styles.micAudioNode, 
                isListening && styles.micAudioNodeActive,
                hoveredButton === 'mic' && styles.micAudioNodeHovered
              ]} 
              onPress={toggleSpeechRecognition}
              {...Platform.select({
                web: {
                  onMouseEnter: () => setHoveredButton('mic'),
                  onMouseLeave: () => setHoveredButton(null)
                }
              } as any)}
            >
              <Text style={styles.micEmojiIcon}>{isListening ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          </View>

          {/* Real-time Render Outputs */}
          {loading ? (
            <ActivityIndicator size="small" color="#00f3ff" style={{ marginVertical: 14 }} />
          ) : (
            translatedText !== '' && (
              <View style={styles.neonResultContainer}>
                <Text style={styles.resultHeaderTag}>TRANSLATION RESULT</Text>
                <Text style={styles.resultValueText}>{translatedText}</Text>
                <TouchableOpacity 
                  style={styles.speakOutputBadge}
                  onPress={() => triggerTextToSpeechPlay(translatedText, isLocalToEnglish ? 'en-US' : 'en-ZA')}
                >
                  <Text style={styles.speakOutputBadgeText}>🔊 Repeat Translation Out Loud</Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {/* Action Translation Execution Node */}
          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.glowingActionBtn, hoveredButton === 'translate' && styles.glowingActionBtnHovered]} 
            onPress={handleTranslate}
            {...Platform.select({
              web: {
                onMouseEnter: () => setHoveredButton('translate'),
                onMouseLeave: () => setHoveredButton(null)
              }
            } as any)}
          >
            <Text style={styles.glowingActionBtnText}>Translate System</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0813' },
  scrollContainer: { padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingTop: 50 },
  headerWrapper: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 46, fontWeight: '900', color: '#ffffff', letterSpacing: 1.5, textShadowColor: '#00f3ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  neonBadge: { borderBottomWidth: 2, borderBottomColor: '#ff007f', paddingBottom: 4, marginTop: 4 },
  subtitle: { fontSize: 12, fontWeight: '800', color: '#ff007f', letterSpacing: 3 },
  neonCard: { backgroundColor: '#131124', width: '100%', borderRadius: 16, padding: 18, borderHorizontalWidth: 1, borderColor: '#1f1c3a', marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#6a6b83', marginBottom: 12, letterSpacing: 1.5, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', gap: 12 },
  langButton: { flex: 1, backgroundColor: '#1b1931', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' } as any,
  langButtonHovered: { borderColor: '#ff007f', transform: [{ scale: 1.02 }] } as any,
  activeLangButton: { backgroundColor: '#15122b', borderColor: '#00f3ff', shadowColor: '#00f3ff', shadowOpacity: 0.3, shadowRadius: 8 },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#767891' },
  activeLangButtonText: { color: '#00f3ff', textShadowColor: '#00f3ff', textShadowRadius: 4 },
  directionWrapper: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 6 },
  directionTextText: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  neonSwapButton: { backgroundColor: '#1b1931', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ff007f' } as any,
  neonSwapButtonHovered: { backgroundColor: '#ff007f', shadowColor: '#ff007f', shadowOpacity: 0.4, shadowRadius: 8, transform: [{ scale: 1.05 }] } as any,
  swapButtonText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  mainConsoleCard: { backgroundColor: '#131124', width: '100%', borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: '#1f1c3a' },
  mainConsoleCardFocused: { borderColor: '#00f3ff', shadowColor: '#00f3ff', shadowOpacity: 0.25, shadowRadius: 15 },
  interactiveInputRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 90, padding: 4 },
  cleanTextArea: { flex: 1, fontSize: 17, color: '#ffffff', padding: 0, minHeight: 75, fontWeight: '600', outlineStyle: 'none' } as any,
  micAudioNode: { backgroundColor: '#1b1931', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderHorizontalWidth: 1, borderColor: '#00f3ff' } as any,
  micAudioNodeHovered: { transform: [{ scale: 1.1 }], shadowColor: '#00f3ff', shadowOpacity: 0.5, shadowRadius: 10 } as any,
  micAudioNodeActive: { backgroundColor: '#ef4444', borderColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.6, shadowRadius: 12, transform: [{ scale: 1.15 }] } as any,
  micEmojiIcon: { fontSize: 18 },
  glowingActionBtn: { backgroundColor: '#00f3ff', width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4, shadowColor: '#00f3ff', shadowOpacity: 0.4, shadowRadius: 10 } as any,
  glowingActionBtnHovered: { backgroundColor: '#00cacc', shadowColor: '#00f3ff', shadowOpacity: 0.6, shadowRadius: 14, transform: [{ scale: 1.02 }] } as any,
  glowingActionBtnText: { color: '#0a0813', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  neonResultContainer: { borderTopWidth: 1, borderTopColor: '#1f1c3a', paddingTop: 16, width: '100%', gap: 6 },
  resultHeaderTag: { fontSize: 11, fontWeight: '800', color: '#ff007f', letterSpacing: 2 },
  resultValueText: { fontSize: 22, fontWeight: '700', color: '#00f3ff', marginTop: 2, textShadowColor: '#00f3ff', textShadowRadius: 4 },
  speakOutputBadge: { marginTop: 8, backgroundColor: '#1b1931', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ff007f' },
  speakOutputBadgeText: { color: '#ff007f', fontSize: 12, fontWeight: '700' }
});