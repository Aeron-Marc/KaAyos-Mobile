import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
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

  const userId = user?.id;
  const userRole = 'client';

  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.getBookings(userId, userRole);
      setBookings(data);
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
  }, [userId]);

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
    Alert.alert('Leave a Review', 'Rating (1-5):', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: () => {
          Alert.prompt?.('Rating', 'Enter rating 1-5', async (ratingStr) => {
            const rating = parseInt(ratingStr);
            if (isNaN(rating) || rating < 1 || rating > 5) {
              Alert.alert('Error', 'Rating must be 1-5');
              return;
            }
            try {
              await api.submitReview({
                booking_id: booking.id,
                client_id: userId!,
                worker_id: 0,
                rating,
              });
              showToast('Review submitted!', 'success');
              fetchBookings();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          });
        },
      },
    ]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { badge: styles.activeBadge, text: styles.activeText, label: 'Active' };
      case 'in_progress': return { badge: styles.activeBadge, text: styles.activeText, label: 'In Progress' };
      case 'completed': return { badge: styles.doneBadge, text: styles.doneText, label: 'Done' };
      case 'cancelled': return { badge: styles.cancelledBadge, text: styles.cancelledText, label: 'Cancelled' };
      default: return { badge: styles.pendingBadge, text: styles.pendingText, label: 'Pending' };
    }
  };

  const handleAction = (booking: Booking) => {
    if (booking.status === 'completed') {
      handleReview(booking);
    } else if (booking.status === 'pending') {
      handleCancel(booking);
    } else if (booking.status === 'confirmed' || booking.status === 'in_progress') {
      showToast('Contact your provider for updates', 'info');
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Leave Review';
      case 'cancelled': return '';
      case 'pending': return 'Cancel';
      case 'confirmed': return 'View';
      case 'in_progress': return 'View';
      default: return 'View';
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
          <Text style={styles.loadingText}>Loading...</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color={Colors.icon} />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          filtered.map((booking) => {
            const sb = getStatusStyle(booking.status);
            const actionLabel = getActionLabel(booking.status);
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
  cardAction: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.primary },
  cardActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});