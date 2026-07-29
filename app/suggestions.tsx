import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, TextInput, Keyboard, Platform, View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export default function SuggestionsScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', role: 'assistant', content: 'Hi! I can help you find plumbers, electricians, cleaners, carpenters, and more. Just tell me what you need help with!' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);

    try {
      const res = await api.chatBot(text, newHistory);
      const reply: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.reply, suggestions: res.suggestions };
      setMessages(prev => [...prev, reply]);
      setHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, history]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSuggestionTap = (suggestion: string) => {
    setInput(suggestion);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      {item.role === 'assistant' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="bulb" size={16} color="#fff" />
        </View>
      )}
      <View style={styles.bubbleContent}>
        <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
        {item.suggestions && item.suggestions.length > 0 && (
          <View style={styles.chipsRow}>
            {item.suggestions.map((s, i) => (
              <PressableScale key={i} style={styles.chip} onPress={() => handleSuggestionTap(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const inputPadding = useMemo(() => ({ paddingBottom: keyboardHeight }), [keyboardHeight]);

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </PressableScale>
        <View>
          <Text style={styles.title}>AI Assistant</Text>
          <Text style={styles.subtitle}>Find the right worker</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={sending ? <View style={styles.typing}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.typingText}>Thinking...</Text></View> : null}
      />

      <View style={[styles.inputBar, inputPadding]}>
        <TextInput
          style={styles.input}
          placeholder="What do you need help with?"
          placeholderTextColor={Colors.icon}
          value={input}
          onChangeText={setInput}
          onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)}
          multiline
          maxLength={500}
        />
        <PressableScale haptics style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || sending}>
          <Ionicons name="send" size={18} color="#fff" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  bubble: { flexDirection: 'row', marginBottom: 14, maxWidth: '88%', gap: 8 },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubbleContent: { flex: 1 },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 22, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
  userText: { backgroundColor: Colors.primary, color: '#fff', borderBottomRightRadius: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: Colors.background, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  typingText: { fontSize: 13, color: Colors.textSecondary },
});
