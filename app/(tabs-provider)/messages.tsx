import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Message } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';

const workerId = 1;

export default function ProviderMessagesScreen() {
  const [conversations, setConversations] = useState<{
    id: number;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    initials: string;
    avatar: string | null;
  }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await api.getMessages(workerId);
      const grouped = msgs.reduce<Record<number, { name: string; avatar: string | null; msgs: Message[] }>>((acc, m) => {
        const otherId = m.sender_id === workerId ? m.receiver_id : m.sender_id;
        const otherName = m.sender_id === workerId ? m.receiver_name : m.sender_name;
        const otherAvatar = m.sender_id === workerId ? m.receiver_avatar : m.sender_avatar;
        if (!acc[otherId]) {
          acc[otherId] = { name: otherName, avatar: otherAvatar, msgs: [] };
        }
        acc[otherId].msgs.push(m);
        return acc;
      }, {});

      const convos = Object.entries(grouped).map(([id, data]) => {
        const sorted = data.msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sorted[0];
        return {
          id: Number(id),
          name: data.name,
          lastMessage: latest.message,
          time: formatTimeAgo(latest.created_at),
          unread: sorted.filter(m => m.receiver_id === workerId && !m.read_at).length,
          initials: data.name.split(' ').map(s => s.charAt(0)).join('').slice(0, 2).toUpperCase(),
          avatar: data.avatar,
        };
      });

      setConversations(convos);
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  }, []);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Chat with your clients</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : conversations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        ) : (
          conversations.map((convo) => (
            <PressableScale
              key={convo.id}
              style={styles.conversationCard}
              onPress={() => showToast(`Chat with ${convo.name}`, 'info')}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{convo.initials}</Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.conversationTop}>
                  <Text style={styles.conversationName}>{convo.name}</Text>
                  <Text style={styles.conversationTime}>{convo.time}</Text>
                </View>
                <View style={styles.conversationBottom}>
                  <Text style={styles.lastMessage} numberOfLines={1}>{convo.lastMessage}</Text>
                  {convo.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{convo.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </PressableScale>
          ))
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  conversationCard: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 16, backgroundColor: Colors.surface, marginBottom: 8, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  conversationInfo: { flex: 1, gap: 4 },
  conversationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conversationName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  conversationTime: { fontSize: 12, color: Colors.textMuted },
  conversationBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});