import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { PromptModal } from '@/components/prompt-modal';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const segments = ['All', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
type Segment = typeof segments[number];

export default function BookingsScreen() {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<Segment>('All');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [promptVisible, setPromptVisible] = useState(false);
  const [promptType, setPromptType] = useState<'review' | 'report'>('review');
  const [promptBooking, setPromptBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.getBookings();
      setBookings(data);
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
  }, []);

  useEffect(() => {
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const filtered = activeSegment === 'All' ? bookings : bookings.filter(b => b.status === activeSegment);

  const handleCancel = (booking: Booking) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.updateBookingStatus(booking.id, 'cancelled');
            showToast('Booking cancelled', 'info');
            fetchBookings();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleReview = (booking: Booking) => {
    setPromptType('review');
    setPromptBooking(booking);
    setPromptVisible(true);
  };

  const handleReport = (booking: Booking) => {
    setPromptType('report');
    setPromptBooking(booking);
    setPromptVisible(true);
  };

  const handlePromptSubmit = async (value: string) => {
    const booking = promptBooking;
    if (!booking) return;
    if (promptType === 'review') {
      const rating = parseInt(value);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        Alert.alert('Error', 'Rating must be 1-5');
        return;
      }
      try {
        await api.submitReview({
          booking_id: booking.id,
          client_id: user!.id,
          worker_id: booking.worker_id,
          rating,
        });
        showToast('Review submitted!', 'success');
        fetchBookings();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    } else {
      if (value.trim().length < 10) {
        Alert.alert('Error', 'Please provide at least 10 characters.');
        return;
      }
      try {
        await api.submitDispute({ booking_id: booking.id, reason: value.trim() });
        showToast('Report submitted. We will review it.', 'success');
        fetchBookings();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }
  };

  const getStatusStyle = (booking: Booking) => {
    if (booking.status === 'in_progress' && booking.completion_status?.is_pending) {
      return { badge: styles.pendingBadge, text: styles.pendingText, label: 'Awaiting Confirmation' };
    }
    switch (booking.status) {
      case 'in_progress': return { badge: styles.activeBadge, text: styles.activeText, label: 'In Progress' };
      case 'completed': return { badge: styles.doneBadge, text: styles.doneText, label: 'Done' };
      case 'cancelled': return { badge: styles.cancelledBadge, text: styles.cancelledText, label: 'Cancelled' };
      default: return { badge: styles.pendingBadge, text: styles.pendingText, label: 'Pending' };
    }
  };

  const handleAction = (booking: Booking) => {
    if (booking.status === 'completed') {
      handleReview(booking);
    } else if (booking.status === 'new' || booking.status === 'accepted') {
      handleCancel(booking);
    } else if (booking.status === 'in_progress') {
      // Handle two-sided completion for in_progress bookings
      if (booking.completion_status?.is_pending) {
        // Completion already requested
        if (booking.completion_status.pending_from === 'client') {
          // Client already marked complete, awaiting worker
          Alert.alert('Awaiting Confirmation', 'Waiting for worker to confirm job completion...');
        } else {
          // Worker marked complete, client needs to confirm
          Alert.alert(
            'Confirm Completion',
            'Worker has confirmed the job is complete. Do you agree?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Confirm',
                onPress: async () => {
                  try {
                    await api.confirmBookingCompletion(booking.id);
                    showToast('Job completion confirmed!', 'success');
                    fetchBookings();
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                },
              },
            ]
          );
        }
      } else {
        // No completion request yet, client initiating
        Alert.alert(
          'Mark Job Complete',
          'Once you mark this complete, the worker will need to confirm. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Mark Complete',
              onPress: async () => {
                try {
                  await api.markBookingComplete(booking.id);
                  showToast('Job marked complete. Awaiting worker confirmation.', 'success');
                  fetchBookings();
                } catch (e: any) {
                  Alert.alert('Error', e.message);
                }
              },
            },
          ]
        );
      }
    }
  };

  const getActionLabel = (booking: Booking) => {
    switch (booking.status) {
      case 'completed':
        return 'Leave Review';
      case 'cancelled':
        return '';
      case 'new':
        return 'Cancel';
      case 'accepted':
        return 'Cancel';
      case 'in_progress':
        // Show different label based on completion status
        if (booking.completion_status?.is_pending) {
          return booking.completion_status.pending_from === 'client'
            ? 'Awaiting Confirmation'
            : 'Confirm Complete';
        }
        return 'Mark Complete';
      default:
        return 'View';
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
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {segment === 'in_progress' ? 'Active' : segment.charAt(0).toUpperCase() + segment.slice(1)}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          filtered.map((booking) => {
            const sb = getStatusStyle(booking);
            const actionLabel = getActionLabel(booking);
            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.serviceName}>{booking.service_category}</Text>
                    <Text style={styles.workerName}>{booking.other_name}</Text>
                  </View>
                  <View style={[styles.badge, sb.badge]}>
                    <Text style={[styles.badgeText, sb.text]}>{sb.label}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>{new Date(booking.scheduled_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>{booking.address}</Text>
                  </View>
                  {booking.price && (
                    <View style={styles.detailRow}>
                      <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>PHP {booking.price}</Text>
                    </View>
                  )}
                </View>

                {actionLabel ? (
                  <PressableScale haptics style={styles.cardAction} onPress={() => handleAction(booking)}>
                    <Text style={styles.cardActionText}>{actionLabel}</Text>
                  </PressableScale>
                ) : null}
                {booking.status === 'completed' && (
                  <PressableScale style={styles.reportBtn} onPress={() => handleReport(booking)}>
                    <Ionicons name="flag-outline" size={14} color={Colors.error} />
                    <Text style={styles.reportText}>Report</Text>
                  </PressableScale>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      <PromptModal
        visible={promptVisible}
        title={promptType === 'review' ? 'Leave a Review' : 'Report Worker'}
        message={promptType === 'review' ? 'Enter a rating from 1 to 5' : 'Describe what went wrong (min 10 characters)'}
        placeholder={promptType === 'review' ? 'Rating (1-5)' : 'Describe the issue...'}
        submitLabel={promptType === 'review' ? 'Submit Review' : 'Submit Report'}
        keyboardType={promptType === 'review' ? 'numeric' : 'default'}
        onSubmit={handlePromptSubmit}
        onCancel={() => setPromptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  segmentRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 8 },
  segment: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 20, marginTop: 4 },
  listContent: { paddingBottom: 4 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  card: { borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
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
  cancelledBadge: { backgroundColor: '#fef2f2' },
  cancelledText: { color: '#dc2626' },
  cardDetails: { gap: 8, marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  cardAction: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  cardActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 4, borderRadius: 10, backgroundColor: '#fef2f2' },
  reportText: { fontSize: 13, fontWeight: '600', color: Colors.error },
});