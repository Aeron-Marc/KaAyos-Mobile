import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, RefreshControl, Text, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Message } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherName, setOtherName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const userId = user?.id;
  const otherId = Number(id);

  const fetchMessages = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.getMessages();
      const filtered = data.filter(
        m => (m.sender_id === otherId && m.receiver_id === userId) ||
             (m.sender_id === userId && m.receiver_id === otherId)
      );
      const first = filtered[0];
      if (first) {
        const name = first.sender_id === userId ? first.receiver_name : first.sender_name;
        setOtherName(name);
      }
      setMessages(filtered);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  }, [userId, otherId]);

  useEffect(() => {
    if (userId) {
      fetchMessages().finally(() => setLoading(false));
    }
  }, [userId, fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    const text = input.trim();
    setInput('');

    try {
      await api.sendMessage({
        sender_id: userId,
        receiver_id: otherId,
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

  const convoMessages = [...messages].reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </PressableScale>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{otherName || 'Chat'}</Text>
          </View>
        </View>

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
              {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} /> : <Text style={styles.emptyText}>No messages yet. Start a conversation!</Text>}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
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
