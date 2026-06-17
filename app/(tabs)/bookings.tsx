import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { bookings } from '@/constants/data';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';

const segments = ['All', 'Active', 'Pending', 'Done'] as const;
type Segment = typeof segments[number];

export default function BookingsScreen() {
  const [activeSegment, setActiveSegment] = useState<Segment>('All');
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const filtered = activeSegment === 'All' ? bookings : bookings.filter(b => b.status === activeSegment);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const handleAction = (booking: typeof bookings[0]) => {
    if (booking.status === 'Done') {
      showToast('Review submitted!', 'success');
    } else if (booking.status === 'Active') {
      router.push(`/worker/${booking.workerId}`);
    } else {
      showToast('Booking confirmed!', 'success');
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>Manage your service requests</Text>
      </View>

      <View style={styles.segmentRow}>
        {segments.map((segment) => {
          const isActive = activeSegment === segment;
          return (
            <PressableScale
              key={segment}
              onPress={() => setActiveSegment(segment)}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{segment}</Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyText}>No {activeSegment.toLowerCase()} bookings</Text>
          </View>
        ) : (
          filtered.map((booking) => {
            const statusStyle = booking.status === 'Active' ? styles.activeBadge :
              booking.status === 'Done' ? styles.doneBadge : styles.pendingBadge;
            const statusTextStyle = booking.status === 'Active' ? styles.activeText :
              booking.status === 'Done' ? styles.doneText : styles.pendingText;

            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.serviceName}>{booking.service}</Text>
                    <Text style={styles.workerName}>{booking.workerName}</Text>
                  </View>
                  <View style={[styles.badge, statusStyle]}>
                    <Text style={[styles.badgeText, statusTextStyle]}>{booking.status}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>{booking.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>₱{booking.price}</Text>
                  </View>
                </View>

                <PressableScale haptics style={styles.cardAction} onPress={() => handleAction(booking)}>
                  <Text style={styles.cardActionText}>
                    {booking.status === 'Done' ? 'Leave Review' : booking.status === 'Active' ? 'View Details' : 'Confirm'}
                  </Text>
                </PressableScale>
              </View>
            );
          })
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  segmentRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 6 },
  segment: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 20, marginTop: 8 },
  listContent: { paddingBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  card: { borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTopLeft: { flex: 1 },
  serviceName: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  workerName: { fontSize: 14, color: Colors.textSecondary },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  activeBadge: { backgroundColor: '#f0fdf4' },
  activeText: { color: '#16a34a' },
  doneBadge: { backgroundColor: '#eff6ff' },
  doneText: { color: '#2563eb' },
  pendingBadge: { backgroundColor: '#fffbeb' },
  pendingText: { color: '#d97706' },
  cardDetails: { gap: 8, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  cardAction: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.primary },
  cardActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
