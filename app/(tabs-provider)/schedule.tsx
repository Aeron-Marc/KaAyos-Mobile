import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
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
        return { bg: '#fef3c7', text: '#d97706', label: 'In Progress' };
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
      {/* ── ORGANIZED 2-TAB FILTER WITH BADGE COUNTS ── */}
      <View style={styles.tabContainer}>
        <View style={styles.segmentedControl}>
          {(['upcoming', 'past'] as const).map(f => {
            const active = filter === f;
            const count = f === 'upcoming' ? upcoming.length : past.length;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {f === 'upcoming' ? 'Upcoming' : 'Past Jobs'}
                </Text>
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryAccent} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={{ marginTop: 60 }} />
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
              <TouchableOpacity
                key={job.id}
                style={styles.scheduleRow}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs-provider)/jobs')}
              >
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
              </TouchableOpacity>
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
  tabContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: Colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E8ECF0',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(75, 85, 99, 0.12)',
  },
  tabBadgeActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.primaryAccent,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dateBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
