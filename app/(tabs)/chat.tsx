import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, RefreshControl, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Message } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const userId = user?.id;

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.getMessages(userId);
      setMessages(data);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMessages().finally(() => setLoading(false));
    }
  }, [userId, fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    const text = input.trim();
    setInput('');

    const receiverId = messages.find(m => m.sender_id !== userId)?.sender_id;
    if (!receiverId) {
      Alert.alert('Error', 'No conversation partner found');
      return;
    }

    try {
      await api.sendMessage({
        sender_id: userId,
        receiver_id: receiverId,
        message: text,
      });
      await fetchMessages();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  const grouped = messages.reduce<{ id: number; other_name: string; other_avatar: string | null; msgs: Message[] }[]>((acc, m) => {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    const existing = acc.find(g => g.id === otherId);
    const otherName = m.sender_id === userId ? m.receiver_name : m.sender_name;
    const otherAvatar = m.sender_id === userId ? m.receiver_avatar : m.sender_avatar;
    if (existing) {
      existing.msgs.push(m);
    } else {
      acc.push({ id: otherId, other_name: otherName, other_avatar: otherAvatar, msgs: [m] });
    }
    return acc;
  }, []);

  const currentConvo = grouped[0];
  const convoMessages = currentConvo?.msgs.reverse() || [];

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Chat with service providers</Text>
        </View>

        {currentConvo && (
          <View style={styles.convoHeader}>
            <View style={styles.convoAvatar}>
              <Text style={styles.convoAvatarText}>{currentConvo.other_name.charAt(0)}</Text>
            </View>
            <Text style={styles.convoName}>{currentConvo.other_name}</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={loading ? [] : convoMessages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color={Colors.icon} />
              <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No messages yet. Start a conversation!'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === userId;
            return (
              <View style={[styles.row, isMine ? styles.userRow : styles.botRow]}>
                <View style={[styles.bubble, isMine ? styles.userBubble : styles.botBubble]}>
                  <Text style={[styles.bubbleText, isMine && styles.userBubbleText]}>
                    {item.message}
                  </Text>
                  <Text style={[styles.timeText, isMine ? styles.userTimeText : styles.botTimeText]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
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
  convoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  convoAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  convoAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  convoName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  messagesList: { padding: 20, gap: 12, flexGrow: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', marginBottom: 4 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 16 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: Colors.text },
  userBubbleText: { color: '#fff' },
  timeText: { fontSize: 11, marginTop: 4 },
  userTimeText: { color: 'rgba(255,255,255,0.7)' },
  botTimeText: { color: Colors.textMuted },
  inputBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: 'center', backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});