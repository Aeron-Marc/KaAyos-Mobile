import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { PromptModal } from '@/components/prompt-modal';
import { RescheduleModal } from '@/components/reschedule-modal';
import { ReviewModal } from '@/components/review-modal';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const segments = ['All', 'new', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled'] as const;
type Segment = typeof segments[number];

export default function BookingsScreen() {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<Segment>('All');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modals state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptType, setPromptType] = useState<'review' | 'report'>('report');
  const [promptBooking, setPromptBooking] = useState<Booking | null>(null);

  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState<'request' | 'respond'>('request');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

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

  const handleOpenRescheduleRequest = (booking: Booking) => {
    setActiveBooking(booking);
    setRescheduleMode('request');
    setRescheduleVisible(true);
  };

  const handleOpenRescheduleRespond = (booking: Booking) => {
    setActiveBooking(booking);
    setRescheduleMode('respond');
    setRescheduleVisible(true);
  };

  const handleRescheduleRequestSubmit = async (proposedAt: string, reason: string) => {
    if (!activeBooking) return;
    try {
      await api.requestReschedule(activeBooking.id, proposedAt, reason);
      showToast('Reschedule request sent to worker', 'success');
      fetchBookings();
    } catch (e: any) {
      showToast(e.message || 'Failed to request reschedule', 'error');
    }
  };

  const handleRescheduleRespondSubmit = async (action: 'approve' | 'decline') => {
    if (!activeBooking) return;
    try {
      await api.respondReschedule(activeBooking.id, action);
      showToast(`Reschedule ${action}d`, 'success');
      fetchBookings();
    } catch (e: any) {
      showToast(e.message || 'Failed to respond to reschedule', 'error');
    }
  };

  const handleConfirmCompletion = async (booking: Booking) => {
    try {
      const res = await api.confirmBookingCompletion(booking.id);
      showToast(res.msg, 'success');
      fetchBookings();
      if (res.fullyCompleted) {
        handleReview(booking);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm completion');
    }
  };

  const handleReview = (booking: Booking) => {
    setReviewBooking(booking);
    setReviewVisible(true);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!reviewBooking) return;
    try {
      await api.submitReview({
        booking_id: reviewBooking.id,
        worker_id: reviewBooking.worker_id,
        rating,
        comment,
      });
      showToast('Review submitted successfully!', 'success');
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit review');
    }
  };

  const handleRespondAmendment = async (booking: Booking, action: 'approved' | 'declined') => {
    try {
      await api.respondScopeAmendment(booking.id, action);
      showToast(`Price adjustment ${action}!`, action === 'approved' ? 'success' : 'info');
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to respond to price adjustment');
    }
  };

  const handleReport = (booking: Booking) => {
    setPromptType('report');
    setPromptBooking(booking);
    setPromptVisible(true);
  };

  const handlePromptSubmit = async (value: string) => {
    const booking = promptBooking;
    if (!booking) return;
    if (value.trim().length < 10) {
      Alert.alert('Error', 'Please provide at least 10 characters for the report.');
      return;
    }
    try {
      await api.submitDispute({ booking_id: booking.id, reason: value.trim() });
      showToast('Report submitted for admin review.', 'success');
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const getStatusBadge = (booking: Booking) => {
    switch (booking.status) {
      case 'new':
        return { label: 'New Request', bg: Colors.warningLight, text: Colors.warning };
      case 'accepted':
        return { label: 'Accepted', bg: '#eff6ff', text: '#2563eb' };
      case 'en_route':
        return { label: 'En Route', bg: Colors.primaryLight, text: Colors.primary };
      case 'in_progress':
        return { label: 'In Progress', bg: '#fef3c7', text: '#d97706' };
      case 'completed':
        return { label: 'Completed', bg: '#f0fdf4', text: '#16a34a' };
      case 'cancelled':
      case 'declined':
        return { label: booking.status === 'declined' ? 'Declined' : 'Cancelled', bg: '#fef2f2', text: '#dc2626' };
      default:
        return { label: booking.status, bg: Colors.surface, text: Colors.textSecondary };
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Track your appointments and service history in Tuy</Text>
      </View>

      {/* Segmented Filter */}
      <View style={styles.segmentsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentsScroll}>
          {segments.map(seg => {
            const active = activeSegment === seg;
            return (
              <PressableScale
                key={seg}
                onPress={() => setActiveSegment(seg)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {seg === 'new' ? 'Pending' : seg === 'en_route' ? 'En Route' : seg === 'in_progress' ? 'Active' : seg.charAt(0).toUpperCase() + seg.slice(1)}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.icon} />
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptyDesc}>When you book services in Tuy, they will appear here.</Text>
          </View>
        ) : (
          filtered.map(booking => {
            const badge = getStatusBadge(booking);
            const isPendingReschedule = booking.reschedule_status === 'pending';
            const workerRequestedReschedule = isPendingReschedule && booking.reschedule_requested_by !== user?.id;
            const clientRequestedReschedule = isPendingReschedule && booking.reschedule_requested_by === user?.id;
            const needsClientConfirmation = booking.status === 'in_progress' && booking.confirmed_by_worker_at && !booking.confirmed_by_client_at;

            return (
              <View key={booking.id} style={styles.card}>
                {/* Top Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.workerCol}>
                    <Text style={styles.workerName}>{booking.other_name || 'Worker'}</Text>
                    <Text style={styles.serviceText}>{booking.service_category}</Text>
                    {booking.booking_ref && (
                      <Text style={styles.refText}>{booking.booking_ref}</Text>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={15} color={Colors.icon} />
                    <Text style={styles.infoText}>
                      {new Date(booking.scheduled_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={15} color={Colors.icon} />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {booking.address}
                    </Text>
                  </View>

                  {booking.price && (
                    <View style={styles.infoRow}>
                      <Ionicons name="cash-outline" size={15} color={Colors.icon} />
                      <Text style={styles.priceHighlight}>₱{booking.price.toLocaleString()} (Cash on Service)</Text>
                    </View>
                  )}
                </View>

                {/* Reschedule Banner */}
                {workerRequestedReschedule && (
                  <View style={styles.rescheduleBanner}>
                    <Ionicons name="alert-circle" size={18} color="#d97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rescheduleTitle}>Worker Proposed Reschedule</Text>
                      <Text style={styles.rescheduleDate}>
                        New Time: {booking.reschedule_proposed_at ? new Date(booking.reschedule_proposed_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                        }) : ''}
                      </Text>
                      {booking.reschedule_reason && (
                        <Text style={styles.rescheduleReason}>"{booking.reschedule_reason}"</Text>
                      )}
                      <TouchableOpacity
                        style={styles.reviewRescheduleBtn}
                        onPress={() => handleOpenRescheduleRespond(booking)}
                      >
                        <Text style={styles.reviewRescheduleText}>Review & Respond</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {clientRequestedReschedule && (
                  <View style={[styles.rescheduleBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <Ionicons name="hourglass-outline" size={18} color="#2563eb" />
                    <Text style={[styles.rescheduleDate, { color: '#1e40af', flex: 1 }]}>
                      You requested a reschedule. Waiting for worker confirmation.
                    </Text>
                  </View>
                )}

                {/* Scope Amendment Proposal Banner */}
                {booking.scope_amendment_status === 'pending' && (
                  <View style={styles.amendmentBanner}>
                    <Ionicons name="pricetag" size={18} color="#7c3aed" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.amendmentTitle}>Price Adjustment Proposed</Text>
                      <Text style={styles.amendmentPriceText}>
                        New Price: ₱{Number(booking.scope_amendment_price || 0).toLocaleString()} (Current: ₱{Number(booking.price || 0).toLocaleString()})
                      </Text>
                      {booking.scope_amendment_notes && (
                        <Text style={styles.amendmentNotes}>"{booking.scope_amendment_notes}"</Text>
                      )}
                      <View style={styles.amendmentBtnRow}>
                        <TouchableOpacity
                          style={[styles.amendmentBtn, { backgroundColor: '#16a34a' }]}
                          onPress={() => handleRespondAmendment(booking, 'approved')}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.amendmentBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.amendmentBtn, { backgroundColor: '#dc2626' }]}
                          onPress={() => handleRespondAmendment(booking, 'declined')}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                          <Text style={styles.amendmentBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Dual-Confirmation Completion Banner */}
                {needsClientConfirmation && (
                  <View style={styles.completionBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completionTitle}>Work Finished by Worker</Text>
                      <Text style={styles.completionDesc}>Please inspect the completed work and confirm to finalize.</Text>
                      <PressableScale
                        style={styles.confirmCompleteBtn}
                        onPress={() => handleConfirmCompletion(booking)}
                      >
                        <Text style={styles.confirmCompleteBtnText}>Confirm Job Completion</Text>
                      </PressableScale>
                    </View>
                  </View>
                )}

                {/* Photos Preview */}
                {booking.photos && booking.photos.length > 0 && (
                  <View style={styles.photosSection}>
                    <Text style={styles.photosTitle}>Proof Photos ({booking.photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                      {booking.photos.map(p => (
                        <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Card Action Buttons */}
                <View style={styles.cardActions}>
                  {/* Chat Action */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/chat/${booking.worker_id}?bookingId=${booking.id}`)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={Colors.text} />
                    <Text style={styles.actionBtnText}>Message</Text>
                  </TouchableOpacity>

                  {/* Call Action */}
                  {booking.other_phone && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => Linking.openURL(`tel:${booking.other_phone}`)}
                    >
                      <Ionicons name="call-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Call</Text>
                    </TouchableOpacity>
                  )}

                  {/* SMS Action */}
                  {booking.other_phone && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => Linking.openURL(`sms:${booking.other_phone}`)}
                    >
                      <Ionicons name="chatbox-ellipses-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.actionBtnText, { color: Colors.primary }]}>SMS</Text>
                    </TouchableOpacity>
                  )}

                  {/* Reschedule Action for Active Bookings */}
                  {['new', 'accepted'].includes(booking.status) && !isPendingReschedule && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenRescheduleRequest(booking)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={Colors.text} />
                      <Text style={styles.actionBtnText}>Reschedule</Text>
                    </TouchableOpacity>
                  )}

                  {/* Cancel for New or Accepted */}
                  {['new', 'accepted'].includes(booking.status) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      onPress={() => handleCancel(booking)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                      <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {/* Review for Completed */}
                  {booking.status === 'completed' && !booking.review_id && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.reviewBtn]}
                      onPress={() => handleReview(booking)}
                    >
                      <Ionicons name="star" size={16} color="#d97706" />
                      <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Rate & Review</Text>
                    </TouchableOpacity>
                  )}

                  {booking.status === 'completed' && !!booking.review_id && (
                    <View style={[styles.actionBtn, { borderColor: '#fef3c7', backgroundColor: '#fffbeb' }]}>
                      <Ionicons name="star" size={14} color="#d97706" />
                      <Text style={[styles.actionBtnText, { color: '#d97706', fontWeight: '700' }]}>
                        {booking.review_rating}★ Reviewed
                      </Text>
                    </View>
                  )}

                  {/* Report Worker for Completed */}
                  {booking.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleReport(booking)}
                    >
                      <Ionicons name="flag-outline" size={16} color={Colors.textMuted} />
                      <Text style={[styles.actionBtnText, { color: Colors.textMuted }]}>Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Star Rating & Review Modal */}
      {reviewBooking && (
        <ReviewModal
          visible={reviewVisible}
          workerName={reviewBooking.other_name || 'Worker'}
          onClose={() => {
            setReviewVisible(false);
            setReviewBooking(null);
          }}
          onSubmit={handleReviewSubmit}
        />
      )}

      {/* Reschedule Modal */}
      {activeBooking && (
        <RescheduleModal
          visible={rescheduleVisible}
          onClose={() => {
            setRescheduleVisible(false);
            setActiveBooking(null);
          }}
          mode={rescheduleMode}
          bookingId={activeBooking.id}
          proposedDate={activeBooking.reschedule_proposed_at}
          proposedReason={activeBooking.reschedule_reason}
          onRequestSubmit={handleRescheduleRequestSubmit}
          onRespondSubmit={handleRescheduleRespondSubmit}
        />
      )}

      {/* Review / Report Prompt Modal */}
      <PromptModal
        visible={promptVisible}
        title={promptType === 'review' ? 'Rate & Review' : 'Report Worker'}
        message={promptType === 'review' ? 'Rate this worker from 1 to 5 stars:' : 'Please explain the issue (minimum 10 characters):'}
        placeholder={promptType === 'review' ? '5' : 'Describe what happened...'}
        keyboardType={promptType === 'review' ? 'numeric' : 'default'}
        submitLabel={promptType === 'review' ? 'Submit Review' : 'Submit Report'}
        onSubmit={handlePromptSubmit}
        onCancel={() => {
          setPromptVisible(false);
          setPromptBooking(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  segmentsRow: { paddingVertical: 10 },
  segmentsScroll: { paddingHorizontal: 20, gap: 8 },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  segmentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  workerCol: { flex: 1, marginRight: 10 },
  workerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceText: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  refText: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoBox: { backgroundColor: Colors.background, borderRadius: 12, padding: 12, gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: Colors.text, flex: 1 },
  priceHighlight: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  rescheduleBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12, marginBottom: 12 },
  rescheduleTitle: { fontSize: 12, fontWeight: '700', color: '#b45309', textTransform: 'uppercase' },
  rescheduleDate: { fontSize: 13, fontWeight: '600', color: '#92400e', marginTop: 2 },
  rescheduleReason: { fontSize: 12, color: '#78350f', fontStyle: 'italic', marginTop: 2 },
  reviewRescheduleBtn: { backgroundColor: '#d97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  reviewRescheduleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  completionBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12, marginBottom: 12 },
  completionTitle: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  completionDesc: { fontSize: 12, color: '#166534', marginTop: 2 },
  confirmCompleteBtn: { backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  confirmCompleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  amendmentBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 12, padding: 12, marginBottom: 12 },
  amendmentTitle: { fontSize: 13, fontWeight: '700', color: '#6d28d9' },
  amendmentPriceText: { fontSize: 13, fontWeight: '600', color: '#4c1d95', marginTop: 2 },
  amendmentNotes: { fontSize: 12, color: '#5b21b6', fontStyle: 'italic', marginTop: 3 },
  amendmentBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  amendmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  amendmentBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photosSection: { marginBottom: 12 },
  photosTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  photoThumb: { width: 70, height: 70, borderRadius: 10, marginRight: 8, backgroundColor: Colors.border },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border, flexWrap: 'wrap' },
  actionBtn: { minWidth: 70, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  cancelBtn: { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },
  reviewBtn: { borderColor: '#fef3c7', backgroundColor: '#fffdf5' },
});