import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, TextInput, Keyboard, Platform, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';

interface SuggestedWorker {
  id: number;
  name: string;
  category?: string;
  rating?: number;
  hourly_rate?: number;
  city?: string;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  workers?: SuggestedWorker[];
}

export default function SuggestionsScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hi! I can help you find verified workers in Tuy, Batangas. Tell me what service you need (e.g. "I need an electrician for wiring repair in Poblacion").',
      suggestions: ['Need a plumber in Guinhawa', 'Electrician in Poblacion', 'Carpentry work in Putol', 'House cleaning service']
    },
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
      const res = await api.chatSuggest(text, newHistory);
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        suggestions: res.suggestions,
        workers: res.workers,
      };
      setMessages(prev => [...prev, reply]);
      setHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      // Fallback to chatBot if chatSuggest has error
      try {
        const fallbackRes = await api.chatBot(text, newHistory);
        const reply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackRes.reply,
          suggestions: fallbackRes.suggestions,
        };
        setMessages(prev => [...prev, reply]);
        setHistory(prev => [...prev, { role: 'assistant', content: fallbackRes.reply }]);
      } catch {
        const errMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I had trouble connecting. Please try again.',
        };
        setMessages(prev => [...prev, errMsg]);
      }
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

  const handleBookWorker = (worker: SuggestedWorker) => {
    router.push({
      pathname: '/modal/booking',
      params: {
        id: String(worker.id),
        category: worker.category || '',
      },
    });
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

        {/* Suggested Workers with direct Booking CTA */}
        {item.workers && item.workers.length > 0 && (
          <View style={styles.workersSection}>
            <Text style={styles.workersHeader}>Recommended Workers:</Text>
            {item.workers.map(w => (
              <View key={w.id} style={styles.workerCard}>
                <TouchableOpacity
                  style={styles.workerTop}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/worker/${w.id}`)}
                >
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitial}>{w.name?.charAt(0) || 'W'}</Text>
                  </View>
                  <View style={styles.workerDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.workerName}>{w.name}</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </View>
                    <Text style={styles.workerCategory}>{w.category || 'Service Provider'}</Text>
                    <View style={styles.workerSubRow}>
                      <Ionicons name="star" size={13} color={Colors.star} />
                      <Text style={styles.workerRating}>{w.rating || 5.0}</Text>
                      {w.hourly_rate ? (
                        <>
                          <Text style={styles.dot}>•</Text>
                          <Text style={styles.workerPrice}>₱{w.hourly_rate}/hr</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>

                <PressableScale
                  style={styles.bookBtn}
                  onPress={() => handleBookWorker(w)}
                >
                  <Ionicons name="calendar-outline" size={15} color="#fff" />
                  <Text style={styles.bookBtnText}>Book This Worker</Text>
                </PressableScale>
              </View>
            ))}
          </View>
        )}

        {/* Quick Suggestion Chips */}
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
          <Text style={styles.title}>AI Booking Assistant</Text>
          <Text style={styles.subtitle}>Instant worker matching in Tuy</Text>
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
        ListFooterComponent={
          sending ? (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Finding matched workers in Tuy...</Text>
            </View>
          ) : null
        }
      />

      <View style={[styles.inputBar, inputPadding]}>
        <TextInput
          style={styles.input}
          placeholder="Ask for any service or worker..."
          placeholderTextColor={Colors.icon}
          value={input}
          onChangeText={setInput}
          onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200)}
          multiline
          maxLength={500}
        />
        <PressableScale
          haptics
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  bubble: { flexDirection: 'row', marginBottom: 14, maxWidth: '92%', gap: 8 },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubbleContent: { flex: 1 },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 22, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, overflow: 'hidden' },
  userText: { backgroundColor: Colors.primary, color: '#fff', borderBottomRightRadius: 4 },
  workersSection: { marginTop: 10, gap: 8 },
  workersHeader: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  workerCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  workerTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  workerAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  workerInitial: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  workerDetails: { flex: 1 },
  workerName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  workerCategory: { fontSize: 12, color: Colors.textSecondary },
  workerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  workerRating: { fontSize: 11, fontWeight: '600', color: Colors.text },
  dot: { fontSize: 8, color: Colors.textMuted },
  workerPrice: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
