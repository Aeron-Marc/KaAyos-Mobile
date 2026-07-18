import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const segments = ['All', 'pending', 'confirmed', 'in_progress', 'completed'] as const;
type Segment = typeof segments[number];

export default function JobsScreen() {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<Segment>('All');
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const workerId = user?.id;

  const fetchJobs = useCallback(async () => {
    if (!workerId) return;
    try {
      const data = await api.getBookings(workerId, 'worker');
      setJobs(data);
    } catch (e) {
      console.error('Failed to fetch jobs', e);
    }
  }, [workerId]);

  useEffect(() => {
    if (workerId) fetchJobs().finally(() => setLoading(false));
  }, [workerId, fetchJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  const filtered = activeSegment === 'All' ? jobs : jobs.filter(j => j.status === activeSegment);

  const handleAction = async (job: Booking) => {
    switch (job.status) {
      case 'pending':
        try {
          await api.updateBookingStatus(job.id, 'confirmed');
          showToast('Job started', 'success');
          fetchJobs();
        } catch (e: any) { Alert.alert('Error', e.message); }
        break;
      case 'confirmed':
      case 'in_progress':
        try {
          const nextStatus = job.status === 'confirmed' ? 'in_progress' : 'completed';
          await api.updateBookingStatus(job.id, nextStatus);
          showToast(nextStatus === 'completed' ? 'Marked as completed' : 'In progress', 'success');
          fetchJobs();
        } catch (e: any) { Alert.alert('Error', e.message); }
        break;
      case 'completed':
        showToast('Invoice sent to client', 'success');
        break;
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Accept Job';
      case 'confirmed': return 'Start Job';
      case 'in_progress': return 'Complete';
      case 'completed': return 'Send Invoice';
      default: return 'View';
    }
  };

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { badge: styles.activeBadge, text: styles.activeText };
      case 'in_progress': return { badge: styles.activeBadge, text: styles.activeText };
      case 'completed': return { badge: styles.completedBadge, text: styles.completedText };
      case 'cancelled': return { badge: styles.cancelledBadge, text: styles.cancelledText };
      default: return { badge: styles.pendingBadge, text: styles.pendingText };
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
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
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {segment === 'in_progress' ? 'Active' : segment.charAt(0).toUpperCase() + segment.slice(1)}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        ) : (
          filtered.map((job) => {
            const sb = statusBadgeStyle(job.status);
            return (
              <View key={job.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.serviceName}>{job.service_category}</Text>
                    <Text style={styles.clientName}>{job.other_name}</Text>
                  </View>
                  <View style={[styles.badge, sb.badge]}>
                    <Text style={[styles.badgeText, sb.text]}>
                      {job.status === 'confirmed' ? 'Active' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
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

                <PressableScale haptics style={styles.cardAction} onPress={() => handleAction(job)}>
                  <Text style={styles.cardActionText}>{getActionLabel(job.status)}</Text>
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
  segmentRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 6, flexWrap: 'wrap' },
  segment: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 20, marginTop: 8 },
  listContent: { paddingBottom: 4 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  card: { borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTopLeft: { flex: 1 },
  serviceName: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  clientName: { fontSize: 14, color: Colors.textSecondary },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  activeBadge: { backgroundColor: Colors.successLight },
  activeText: { color: Colors.success },
  completedBadge: { backgroundColor: '#eff6ff' },
  completedText: { color: '#2563eb' },
  pendingBadge: { backgroundColor: Colors.warningLight },
  pendingText: { color: Colors.warning },
  cancelledBadge: { backgroundColor: '#fef2f2' },
  cancelledText: { color: '#dc2626' },
  cardDetails: { gap: 8, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  cardAction: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.primary },
  cardActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});