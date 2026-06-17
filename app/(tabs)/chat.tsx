import { useState, useCallback, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

const initialMessages: Message[] = [
  { id: '1', text: "Hi! I'm here to help you find the perfect service provider. What do you need help with?", sender: 'bot' },
  { id: '2', text: "I'm looking for a plumber in Quezon City", sender: 'user' },
  { id: '3', text: 'Great! I found several plumbers near you. Would you like to see their profiles?', sender: 'bot' },
];

const botReplies = [
  "Thanks for your message! I'm looking into available service providers for you.",
  "I found several options nearby. Would you like me to narrow down by price range?",
  "Sure! Let me check availability for this week.",
  "Great choice! You can book directly from their profile page.",
  "Is there anything else I can help you with?",
  "I've noted your preferences. Let me search for the best matches.",
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Chat</Text>
          <Text style={styles.subtitle}>Get help finding the right service</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.row, item.sender === 'user' ? styles.userRow : styles.botRow]}>
              <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.bubbleText, item.sender === 'user' && styles.userBubbleText]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingText}>Bot is typing</Text>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, { animationDelay: '0s' }]} />
                    <View style={[styles.dot, { animationDelay: '0.2s' }]} />
                    <View style={[styles.dot, { animationDelay: '0.4s' }]} />
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={Colors.icon}
            style={styles.chatInput}
          />
          <PressableScale haptics onPress={sendMessage} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  messagesList: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 16 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: Colors.text },
  userBubbleText: { color: '#fff' },
  typingRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 4 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
    borderBottomLeftRadius: 4, backgroundColor: Colors.surface,
  },
  typingText: { fontSize: 13, color: Colors.textSecondary },
  typingDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted,
  },
  inputBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
