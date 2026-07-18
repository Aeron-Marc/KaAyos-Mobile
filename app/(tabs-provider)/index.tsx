import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking, Earnings } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const dayNames: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
};

export default function ProviderDashboardScreen() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const workerId = user?.id;

  const fetchData = useCallback(async () => {
    if (!workerId) return;
    try {
      const [earnRes, bookRes] = await Promise.all([
        api.getEarnings(workerId),
        api.getBookings(workerId, 'worker'),
      ]);
      setEarnings(earnRes);
      setBookings(bookRes.filter(b => b.status === 'pending'));
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

  const handleAccept = async (bookingId: number) => {
    try {
      await api.updateBookingStatus(bookingId, 'confirmed');
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

  const weeklyData = earnings?.weekly?.map(w => {
    const d = new Date(w.date);
    return { name: dayNames[String(d.getDay())] || '?', earnings: Number(w.earnings) };
  }) || [];

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Your Dashboard</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>P</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (
          <>
            <View style={styles.statsRow}>
              {[
                { label: 'Earnings', value: `PHP ${(earnings?.stats?.total_earnings || 0).toLocaleString()}`, icon: 'wallet-outline' as const, color: '#059669' },
                { label: 'Jobs Done', value: `${earnings?.stats?.completed_jobs || 0}`, icon: 'checkmark-done-outline' as const, color: '#2563eb' },
                { label: 'Total Jobs', value: `${earnings?.stats?.total_jobs || 0}`, icon: 'briefcase-outline' as const, color: '#d97706' },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                    <Ionicons name={stat.icon} size={18} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {weeklyData.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.sectionTitle}>Weekly Earnings</Text>
                  <Text style={styles.chartTotal}>
                    PHP {weeklyData.reduce((s, d) => s + d.earnings, 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.chart}>
                  {weeklyData.map((day) => {
                    const maxEarning = Math.max(...weeklyData.map(d => d.earnings), 1);
                    return (
                      <View key={day.name} style={styles.chartItem}>
                        <View style={[styles.bar, { height: Math.max((day.earnings / maxEarning) * 100, 6) }]} />
                        <Text style={styles.chartDay}>{day.name}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Job Requests</Text>
            </View>

            {bookings.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="briefcase-outline" size={44} color={Colors.icon} />
                <Text style={styles.emptyText}>No pending job requests</Text>
              </View>
            ) : (
              bookings.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobTop}>
                    <View style={styles.jobTopLeft}>
                      <Text style={styles.jobService}>{job.service_category}</Text>
                      <Text style={styles.jobClient}>{job.other_name}</Text>
                    </View>
                    <View style={styles.jobStatus}>
                      <Text style={styles.jobStatusText}>New</Text>
                    </View>
                  </View>

                  <View style={styles.jobDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>{new Date(job.scheduled_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>{job.address}</Text>
                    </View>
                    {job.price && (
                      <View style={styles.detailRow}>
                        <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailText}>PHP {job.price}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.jobActions}>
                    <PressableScale haptics style={styles.acceptBtn} onPress={() => handleAccept(job.id)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </PressableScale>
                    <PressableScale style={styles.declineBtn} onPress={() => handleDecline(job.id)}>
                      <Ionicons name="close" size={16} color={Colors.textSecondary} />
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </PressableScale>
                  </View>
                </View>
              ))
            )}
          </>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  greeting: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  avatarSmall: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 20, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, backgroundColor: Colors.surface, alignItems: 'center', gap: 8 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  chartCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 8 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  chartTotal: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  chartItem: { flex: 1, alignItems: 'center', gap: 8 },
  bar: { width: '60%', borderRadius: 6, backgroundColor: Colors.primary },
  chartDay: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  sectionAction: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  jobCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 10 },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  jobTopLeft: { flex: 1, marginRight: 12 },
  jobService: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  jobClient: { fontSize: 14, color: Colors.textSecondary },
  jobStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.warningLight },
  jobStatusText: { color: Colors.warning, fontSize: 11, fontWeight: '600' },
  jobDetails: { gap: 8, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  jobActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  declineBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});