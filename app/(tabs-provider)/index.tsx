import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking, Earnings } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

export default function ProviderDashboardScreen() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rating, setRating] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const workerId = user?.id;
  const firstName = user?.first_name || (user?.name ? user.name.split(' ')[0] : 'Partner');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const fetchData = useCallback(async () => {
    if (!workerId) return;
    try {
      const [earnRes, bookRes, workerData] = await Promise.all([
        api.getEarnings(),
        api.getBookings(),
        api.getWorkerDetail(workerId),
      ]);
      setEarnings(earnRes);
      setBookings(bookRes);
      setRating(workerData.rating || 0);
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
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

  const activeJobs = bookings.filter(b => b.status === 'accepted' || b.status === 'en_route' || b.status === 'in_progress').length;
  const completedJobs = earnings?.stats?.completed_jobs || 0;
  const earningsThisWeek = (earnings?.weekly || []).reduce((sum, d) => sum + Number(d.earnings), 0);

  const recentRequests = bookings.filter(b => b.status === 'new').slice(0, 3);
  const upcomingSchedule = bookings.filter(b => b.status === 'accepted' || b.status === 'en_route' || b.status === 'in_progress').slice(0, 2);

  const handleAccept = async (bookingId: number) => {
    try {
      await api.updateBookingStatus(bookingId, 'accepted');
      showToast('Job accepted!', 'success');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDecline = async (bookingId: number) => {
    try {
      await api.updateBookingStatus(bookingId, 'declined');
      showToast('Job declined', 'info');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryAccent} />}
    >
      {/* ── UNIFIED PROVIDER HERO ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <View style={styles.heroLocRow}>
              <Ionicons name="location-sharp" size={11} color="#85B7EB" />
              <Text style={styles.heroLocText}>Tuy, Batangas • Provider Partner</Text>
            </View>
            <Text style={styles.heroGreeting}>Good {greeting}, {firstName} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => (router.push as any)('/notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── EARNINGS SUMMARY CARD ── */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsTop}>
            <Text style={styles.earningsLabel}>Earnings This Week</Text>
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={14} color="#059669" />
              <Text style={styles.trendingText}>Tuy Active</Text>
            </View>
          </View>
          <Text style={styles.earningsValue}>₱{earningsThisWeek.toLocaleString()}</Text>
          <View style={styles.earningsMeta}>
            <View style={styles.earningsMetaItem}>
              <Ionicons name="briefcase-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.earningsMetaText}>{activeJobs} active</Text>
            </View>
            <View style={styles.earningsDot} />
            <View style={styles.earningsMetaItem}>
              <Ionicons name="checkmark-circle-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.earningsMetaText}>{completedJobs} completed</Text>
            </View>
            <View style={styles.earningsDot} />
            <View style={styles.earningsMetaItem}>
              <Ionicons name="star" size={12} color="#f5a623" />
              <Text style={styles.earningsMetaText}>{rating ? Number(rating).toFixed(1) : '5.0'} ★</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── JOB REQUESTS SECTION ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Job Requests</Text>
        <PressableScale onPress={() => router.push('/(tabs-provider)/jobs')}>
          <Text style={styles.sectionAction}>View all</Text>
        </PressableScale>
      </View>

      {recentRequests.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={36} color={Colors.icon} />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        recentRequests.map((job) => (
          <View key={job.id} style={styles.jobCard}>
            <View style={styles.jobCardLeft}>
              <View style={styles.jobIcon}>
                <Ionicons name="hammer-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobService}>{job.service_category}</Text>
                <Text style={styles.jobClient}>{job.other_name}</Text>
                <View style={styles.jobMeta}>
                  <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.jobMetaText}>{new Date(job.scheduled_at).toLocaleDateString()}</Text>
                  {job.price ? (
                    <>
                      <Text style={styles.jobMetaSep}>·</Text>
                      <Text style={styles.jobMetaText}>₱{job.price}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={styles.jobActions}>
              <PressableScale haptics style={styles.acceptBtn} onPress={() => handleAccept(job.id)}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </PressableScale>
              <PressableScale style={styles.declineBtn} onPress={() => handleDecline(job.id)}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </PressableScale>
            </View>
          </View>
        ))
      )}

      {/* ── UPCOMING SCHEDULE SECTION ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
        <PressableScale onPress={() => router.push('/(tabs-provider)/schedule')}>
          <Text style={styles.sectionAction}>View all</Text>
        </PressableScale>
      </View>

      {upcomingSchedule.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={36} color={Colors.icon} />
          <Text style={styles.emptyText}>No upcoming jobs scheduled</Text>
        </View>
      ) : (
        upcomingSchedule.map((item, i) => {
          const colors: Record<string, { bg: string; text: string; label: string }> = {
            accepted: { bg: '#f0fdf4', text: '#16a34a', label: 'Accepted' },
            en_route: { bg: Colors.primaryLight, text: Colors.primary, label: 'En Route' },
            in_progress: { bg: '#fef3c7', text: '#d97706', label: 'In Progress' },
          };
          const sb = colors[item.status] || { bg: Colors.warningLight, text: Colors.warning, label: item.status };
          return (
            <View key={item.id} style={styles.schedCard}>
              <View style={styles.schedTimeline}>
                <View style={[styles.schedDot, i === 0 && styles.schedDotActive]} />
                {i < upcomingSchedule.length - 1 && <View style={styles.schedLine} />}
              </View>
              <View style={styles.schedContent}>
                <View style={styles.schedTop}>
                  <Text style={styles.schedService}>{item.service_category}</Text>
                  <View style={[styles.schedBadge, { backgroundColor: sb.bg }]}>
                    <Text style={[styles.schedBadgeText, { color: sb.text }]}>{sb.label}</Text>
                  </View>
                </View>
                <Text style={styles.schedPerson}>{item.other_name} · {new Date(item.scheduled_at).toLocaleDateString()}</Text>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 24 },
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  heroLocText: {
    fontSize: 12,
    color: '#85B7EB',
    fontWeight: '500',
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  earningsValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 10 },
  earningsMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earningsMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  earningsDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionAction: { fontSize: 13, fontWeight: '600', color: Colors.primaryAccent },
  empty: { marginHorizontal: 20, alignItems: 'center', paddingVertical: 28, gap: 8, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  jobCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.surface,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  jobCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  jobIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobInfo: { flex: 1 },
  jobService: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  jobClient: { fontSize: 13, color: Colors.textSecondary, marginBottom: 3 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMetaText: { fontSize: 12, color: Colors.textMuted },
  jobMetaSep: { fontSize: 12, color: Colors.textMuted },
  jobActions: { flexDirection: 'column', gap: 6, marginLeft: 10 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    marginBottom: 4,
  },
  schedTimeline: { alignItems: 'center', width: 20, paddingTop: 4 },
  schedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  schedDotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  schedLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    minHeight: 24,
  },
  schedContent: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginLeft: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  schedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  schedService: { fontSize: 14, fontWeight: '600', color: Colors.text },
  schedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  schedBadgeText: { fontSize: 11, fontWeight: '600' },
  schedPerson: { fontSize: 13, color: Colors.textSecondary },
});
