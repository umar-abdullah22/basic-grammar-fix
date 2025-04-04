import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native';
import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig.extra.OPENAI_API_KEY;
export default function GrammarCheckScreen() {
  const [inputText, setInputText] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    router.replace('/(auth)/login');
  };

  const checkGrammar = async () => {
    if (!inputText.trim()) {
      return Alert.alert('Input Required', 'Please enter text to check.');
    }

    setLoading(true);
    setHighlightedText('');

    try {
        const prompt = `
        You're a grammar correction assistant.
        
        Analyze the following sentence and return ONLY a JSON array of incorrect words with suggestions.
        
        Format:
        [
          { "word": "go", "suggestion": "goes" },
          { "word": "she go", "suggestion": "she goes" }
        ]
        
        Sentence: "${inputText}"
        `;
        
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const result = await response.json();
      const raw = result?.choices?.[0]?.message?.content || '';
      let corrections = [];
      try {
          corrections = JSON.parse(raw);
          console.log(corrections)
      } catch (jsonErr) {
        console.log('Failed to parse:', raw);
        Alert.alert('AI Error', 'Could not parse AI response');
        return;
      }
      
      const highlighted = highlightMistakes(inputText, corrections);
      setHighlightedText(highlighted);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

    const highlightMistakes = (originalText, corrections) => {
       // keep words + contractions + punctuation
    const regex = /[\w’']+|[.,!?;]/g;
    const tokens = originalText.match(regex) || [];
    const highlighted = [];
  
    let lastIndex = 0;
  
    tokens.forEach((token, i) => {
      const indexInOriginal = originalText.indexOf(token, lastIndex);
      const before = originalText.slice(lastIndex, indexInOriginal);
      lastIndex = indexInOriginal + token.length;
  
      const isMistake = corrections.some(
        (item) => item.word.toLowerCase() === token.toLowerCase()
      );
  
      if (before) {
        highlighted.push(
          <Text key={`before-${i}`} style={styles.normalText}>
            {before}
          </Text>
        );
      }
  
      highlighted.push(
        <Text
          key={`word-${i}`}
          style={isMistake ? styles.redText : styles.normalText}
        >
          {token}
        </Text>
      );
    });
  
    return highlighted;
  };
  
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GrammarFix</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Live Output:</Text>
      <View style={styles.outputBox}>
        <ScrollView>
          {highlightedText ? highlightedText : <Text style={styles.normalText}>{inputText}</Text>}
        </ScrollView>
      </View>

      <Text style={styles.label}>Enter Text:</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Type something..."
        value={inputText}
        onChangeText={setInputText}
      />

      <TouchableOpacity style={styles.button} onPress={checkGrammar} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Checking...' : 'Check Grammar'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  logout: { color: 'red', fontSize: 14 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '500' },
  outputBox: {
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '500' },
  redText: { color: 'red', fontWeight: 'bold' },
  normalText: { color: '#333' },
});
