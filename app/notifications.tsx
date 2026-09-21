import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, RefreshControl, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Notification } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifs(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const handlePress = async (item: Notification) => {
    await markRead(item.id);
    const text = (item.title + ' ' + item.message).toLowerCase();
    if (text.includes('message') || text.includes('chat')) {
      if (user?.role === 'worker') {
        router.push('/(tabs-provider)/messages' as any);
      } else {
        router.push('/(tabs)/chat' as any);
      }
    } else if (
      text.includes('booking') ||
      text.includes('job') ||
      text.includes('schedule') ||
      text.includes('reschedule') ||
      text.includes('complete') ||
      text.includes('cancel') ||
      text.includes('accepted')
    ) {
      if (user?.role === 'worker') {
        router.push('/(tabs-provider)/jobs' as any);
      } else {
        router.push('/(tabs)/bookings' as any);
      }
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <PressableScale
      style={[styles.card, !item.read && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <View style={[styles.iconCircle, !item.read && styles.iconUnread]}>
        <Ionicons name={item.read ? 'notifications-outline' : 'notifications'} size={20} color={item.read ? Colors.textSecondary : Colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, !item.read && styles.unreadText]}>{item.title || 'Notification'}</Text>
        <Text style={styles.cardMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </PressableScale>
  );

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={notifs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.icon} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  unread: { backgroundColor: Colors.primaryLight },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: Colors.primaryLight },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  unreadText: { fontWeight: '700' },
  cardMsg: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  cardTime: { fontSize: 11, color: Colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
});
