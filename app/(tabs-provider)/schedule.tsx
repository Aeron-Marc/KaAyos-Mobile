import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProviderScheduleScreen() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const workerId = user?.id;

  const fetchData = useCallback(async () => {
    if (!workerId) return;
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (e) {
      console.error('Failed to fetch schedule', e);
    }
  }, [workerId]);

  useEffect(() => {
    if (workerId) fetchData().finally(() => setLoading(false));
  }, [workerId, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const upcoming = bookings.filter(b => b.status === 'accepted' || b.status === 'en_route' || b.status === 'in_progress');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  const displayed = filter === 'upcoming' ? upcoming : past;

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h12}:${min} ${ampm}`;
  }

  function scheduleDate(dateStr: string) {
    const d = new Date(dateStr);
    return { month: monthNames[d.getMonth()], day: String(d.getDate()).padStart(2, '0') };
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'accepted':
        return { bg: Colors.successLight, text: Colors.success, label: 'Accepted' };
      case 'en_route':
        return { bg: Colors.primaryLight, text: Colors.primary, label: 'En Route' };
      case 'in_progress':
        return { bg: Colors.primaryLight, text: Colors.primary, label: 'In Progress' };
      case 'completed':
        return { bg: '#eff6ff', text: '#2563eb', label: 'Completed' };
      case 'cancelled':
        return { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' };
      default:
        return { bg: Colors.warningLight, text: Colors.warning, label: 'New' };
    }
  }

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.subtitle}>Manage your upcoming and past jobs</Text>
      </View>

      <View style={styles.filterRow}>
        {(['upcoming', 'past'] as const).map(f => (
          <PressableScale
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'upcoming' ? 'Upcoming' : 'Past Jobs'}
            </Text>
          </PressableScale>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyTitle}>
              {filter === 'upcoming' ? 'No upcoming jobs' : 'No past jobs'}
            </Text>
            <Text style={styles.emptyDesc}>
              {filter === 'upcoming'
                ? 'Your schedule will populate once you accept job requests from clients.'
                : 'Completed jobs will appear here.'}
            </Text>
          </View>
        ) : (
          displayed.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()).map((job) => {
            const sb = statusBadge(job.status);
            const sd = scheduleDate(job.scheduled_at);
            const isPast = job.status === 'completed' || job.status === 'cancelled';
            return (
              <View key={job.id} style={styles.scheduleRow}>
                <View style={[styles.dateBox, isPast && styles.dateBoxPast]}>
                  <Text style={[styles.dateMonth, isPast && styles.dateMonthPast]}>{sd.month}</Text>
                  <Text style={[styles.dateDay, isPast && styles.dateDayPast]}>{sd.day}</Text>
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.serviceName}>{job.service_category}</Text>
                  <View style={styles.scheduleMeta}>
                    <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{formatTime(job.scheduled_at)}</Text>
                  </View>
                  <View style={styles.scheduleMeta}>
                    <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{job.other_name}</Text>
                    <Text style={styles.metaSep}>·</Text>
                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.metaText} numberOfLines={1}>{job.address}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: sb.bg }]}>
                  <Text style={[styles.badgeText, { color: sb.text }]}>{sb.label}</Text>
                </View>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 8 },
  filterPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterPillActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, backgroundColor: Colors.surface, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  dateBox: {
    width: 54, height: 54, borderRadius: 12, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dateBoxPast: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dateMonth: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' },
  dateMonthPast: { color: Colors.textMuted },
  dateDay: { fontSize: 18, fontWeight: '700', color: Colors.text },
  dateDayPast: { color: Colors.textMuted },
  scheduleInfo: { flex: 1, gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  scheduleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  metaSep: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});

