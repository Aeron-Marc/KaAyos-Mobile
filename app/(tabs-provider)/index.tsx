import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking, Earnings } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProviderDashboardScreen() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rating, setRating] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const workerId = user?.id;
  const firstName = (user?.name || 'Worker').split(' ')[0];
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
      await api.updateBookingStatus(bookingId, 'cancelled');
      showToast('Job declined', 'info');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const today = new Date();
  const todayStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroDate}>{todayStr}</Text>
            <Text style={styles.heroGreeting}>Good {greeting}, {firstName}</Text>
          </View>
          <PressableScale style={styles.avatarCircle} onPress={() => router.push('/(tabs-provider)/profile')}>
            <Text style={styles.avatarLetter}>{firstName.charAt(0)}</Text>
          </PressableScale>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsTop}>
            <Text style={styles.earningsLabel}>Earnings This Week</Text>
            <Ionicons name="trending-up" size={18} color="#059669" />
          </View>
          <Text style={styles.earningsValue}>PHP {earningsThisWeek.toLocaleString()}</Text>
          <View style={styles.earningsMeta}>
            <View style={styles.earningsMetaItem}>
              <Ionicons name="briefcase-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.earningsMetaText}>{activeJobs} active</Text>
            </View>
            <View style={styles.earningsDot} />
            <View style={styles.earningsMetaItem}>
              <Ionicons name="checkmark-circle-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.earningsMetaText}>{completedJobs} completed</Text>
            </View>
            <View style={styles.earningsDot} />
            <View style={styles.earningsMetaItem}>
              <Ionicons name="star-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={styles.earningsMetaText}>{rating} ★</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Job Requests</Text>
        <PressableScale onPress={() => router.push('/(tabs-provider)/jobs')}>
          <Text style={styles.sectionAction}>View all</Text>
        </PressableScale>
      </View>

      {recentRequests.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={40} color={Colors.icon} />
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
                  {job.price && (
                    <>
                      <Text style={styles.jobMetaSep}>·</Text>
                      <Text style={styles.jobMetaText}>PHP {job.price}</Text>
                    </>
                  )}
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

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <PressableScale onPress={() => router.push('/(tabs-provider)/schedule')}>
          <Text style={styles.sectionAction}>View all</Text>
        </PressableScale>
      </View>

      {upcomingSchedule.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color={Colors.icon} />
          <Text style={styles.emptyText}>No upcoming jobs</Text>
        </View>
      ) : (
        upcomingSchedule.map((item, i) => {
          const colors: Record<string, { bg: string; text: string; label: string }> = {
            accepted: { bg: '#f0fdf4', text: '#16a34a', label: 'Accepted' },
            en_route: { bg: Colors.primaryLight, text: Colors.primary, label: 'En Route' },
            in_progress: { bg: Colors.primaryLight, text: Colors.primary, label: 'In Progress' },
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
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroDate: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  heroGreeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  earningsCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 20,
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  earningsLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  earningsValue: { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 12 },
  earningsMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earningsMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  earningsDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionAction: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  empty: { marginHorizontal: 20, alignItems: 'center', paddingVertical: 36, gap: 10, borderRadius: 16, backgroundColor: Colors.surface },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  jobCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  jobCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  jobIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobInfo: { flex: 1 },
  jobService: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  jobClient: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobMetaText: { fontSize: 12, color: Colors.textMuted },
  jobMetaSep: { fontSize: 12, color: Colors.textMuted },
  jobActions: { flexDirection: 'column', gap: 8, marginLeft: 12 },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    padding: 14,
    marginLeft: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  schedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  schedService: { fontSize: 14, fontWeight: '600', color: Colors.text },
  schedBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 16 },
  schedBadgeText: { fontSize: 11, fontWeight: '600' },
  schedPerson: { fontSize: 13, color: Colors.textSecondary },
});
