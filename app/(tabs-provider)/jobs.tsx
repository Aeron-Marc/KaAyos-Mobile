import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Booking } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { RescheduleModal } from '@/components/reschedule-modal';
import { JobPhotoModal } from '@/components/job-photo-modal';
import { ScopeAmendmentModal } from '@/components/scope-amendment-modal';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const segments = ['All', 'new', 'accepted', 'en_route', 'in_progress', 'completed'] as const;
type Segment = typeof segments[number];

export default function JobsScreen() {
  const { user } = useAuth();
  const [activeSegment, setActiveSegment] = useState<Segment>('All');
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modals
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState<'request' | 'respond'>('request');
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);

  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const [amendmentVisible, setAmendmentVisible] = useState(false);
  const [amendmentJob, setAmendmentJob] = useState<Booking | null>(null);

  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimerTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const workerId = user?.id;

  const fetchJobs = useCallback(async () => {
    if (!workerId) return;
    try {
      const data = await api.getBookings();
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

  const activeJobCount = jobs.filter(j => ['accepted', 'en_route', 'in_progress'].includes(j.status)).length;

  const handleAcceptJob = async (job: Booking) => {
    if (activeJobCount >= 3) {
      Alert.alert(
        'Concurrent Jobs Limit',
        'You have reached the maximum of 3 concurrent active jobs. Complete an ongoing job before accepting more.'
      );
      return;
    }
    try {
      await api.updateBookingStatus(job.id, 'accepted');
      showToast('Job accepted! Added to your schedule.', 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeclineJob = (job: Booking) => {
    Alert.prompt
      ? Alert.prompt(
          'Decline Job',
          'Please provide a reason for declining this request:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Decline',
              style: 'destructive',
              onPress: async (reason?: string) => {
                try {
                  await api.updateBookingStatus(job.id, 'declined', reason || 'Declined by worker');
                  showToast('Job declined', 'info');
                  fetchJobs();
                } catch (e: any) {
                  Alert.alert('Error', e.message);
                }
              },
            },
          ],
          'plain-text',
          'Outside my schedule'
        )
      : Alert.alert('Decline Job', 'Are you sure you want to decline this job request?', [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Decline',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.updateBookingStatus(job.id, 'declined', 'Declined by worker');
                showToast('Job declined', 'info');
                fetchJobs();
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            },
          },
        ]);
  };

  const handleStartTravel = async (job: Booking) => {
    try {
      await api.updateBookingStatus(job.id, 'en_route');
      showToast('Status updated: En Route to client', 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleOpenNavigation = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Could not open maps application.');
    });
  };

  const handleStartWork = async (job: Booking) => {
    try {
      await api.updateBookingStatus(job.id, 'in_progress');
      showToast('Job started: In Progress', 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleOpenPhotoModal = (job: Booking) => {
    setSelectedJob(job);
    setPhotoModalVisible(true);
  };

  const handlePhotoUploaded = async (formData: FormData, caption: string) => {
    if (!selectedJob) return;
    try {
      await api.uploadBookingPhoto(selectedJob.id, formData);
      const res = await api.confirmBookingCompletion(selectedJob.id);
      showToast(res.msg, 'success');
      fetchJobs();
    } catch (e: any) {
      throw e;
    }
  };

  const handleConfirmCompletion = async (job: Booking) => {
    try {
      const res = await api.confirmBookingCompletion(job.id);
      showToast(res.msg, 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to confirm completion');
    }
  };

  const handleOpenRescheduleRequest = (job: Booking) => {
    setSelectedJob(job);
    setRescheduleMode('request');
    setRescheduleVisible(true);
  };

  const handleOpenRescheduleRespond = (job: Booking) => {
    setSelectedJob(job);
    setRescheduleMode('respond');
    setRescheduleVisible(true);
  };

  const handleRescheduleRequestSubmit = async (proposedAt: string, reason: string) => {
    if (!selectedJob) return;
    try {
      await api.requestReschedule(selectedJob.id, proposedAt, reason);
      showToast('Reschedule request sent to client', 'success');
      fetchJobs();
    } catch (e: any) {
      showToast(e.message || 'Failed to request reschedule', 'error');
    }
  };

  const handleRescheduleRespondSubmit = async (action: 'approve' | 'decline') => {
    if (!selectedJob) return;
    try {
      await api.respondReschedule(selectedJob.id, action);
      showToast(`Reschedule ${action}d`, 'success');
      fetchJobs();
    } catch (e: any) {
      showToast(e.message || 'Failed to respond to reschedule', 'error');
    }
  };

  const handleStartTimer = async (job: Booking) => {
    try {
      await api.startWorkTimer(job.id);
      showToast('Work timer started!', 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start work timer');
    }
  };

  const handleStopTimer = async (job: Booking) => {
    try {
      const res = await api.stopWorkTimer(job.id);
      showToast(`Timer stopped: ${res.elapsedHours || 0} hrs. Bill: ₱${res.price?.toLocaleString()}`, 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to stop timer');
    }
  };

  const handleScopeAmendmentSubmit = async (additionalPrice: number, notes: string) => {
    if (!amendmentJob) return;
    try {
      await api.requestScopeAmendment(amendmentJob.id, { additional_price: additionalPrice, notes });
      showToast('Price adjustment submitted for client approval!', 'success');
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit adjustment');
    }
  };

  const formatElapsedTime = (startedAt: string) => {
    const started = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getStatusBadge = (job: Booking) => {
    switch (job.status) {
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
        return { label: job.status === 'declined' ? 'Declined' : 'Cancelled', bg: '#fef2f2', text: '#dc2626' };
      default:
        return { label: job.status, bg: Colors.surface, text: Colors.textSecondary };
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs & Requests</Text>
        <Text style={styles.subtitle}>Active service appointments across Tuy</Text>
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
                  {seg === 'new' ? 'New Requests' : seg === 'en_route' ? 'En Route' : seg === 'in_progress' ? 'In Progress' : seg.charAt(0).toUpperCase() + seg.slice(1)}
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
            <Ionicons name="briefcase-outline" size={48} color={Colors.icon} />
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptyDesc}>New requests and active jobs will be listed here.</Text>
          </View>
        ) : (
          filtered.map(job => {
            const badge = getStatusBadge(job);
            const isPendingReschedule = job.reschedule_status === 'pending';
            const clientRequestedReschedule = isPendingReschedule && job.reschedule_requested_by !== user?.id;
            const workerRequestedReschedule = isPendingReschedule && job.reschedule_requested_by === user?.id;
            const clientAlreadyConfirmed = job.confirmed_by_client_at && !job.confirmed_by_worker_at;
            const waitingForClientConfirmation = job.confirmed_by_worker_at && !job.confirmed_by_client_at && job.status === 'in_progress';

            return (
              <View key={job.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.clientCol}>
                    <Text style={styles.clientName}>{job.other_name || 'Client'}</Text>
                    <Text style={styles.serviceText}>{job.service_category}</Text>
                    {job.booking_ref && <Text style={styles.refText}>{job.booking_ref}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={15} color={Colors.icon} />
                    <Text style={styles.infoText}>
                      {new Date(job.scheduled_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={15} color={Colors.icon} />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {job.address}
                    </Text>
                  </View>

                  {job.other_phone && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={15} color={Colors.icon} />
                      <Text style={styles.infoText}>{job.other_phone}</Text>
                    </View>
                  )}

                  {job.price && (
                    <View style={styles.infoRow}>
                      <Ionicons name="cash-outline" size={15} color={Colors.icon} />
                      <Text style={styles.priceText}>
                        ₱{job.price.toLocaleString()} gross • Net payout: ₱{(job.price * 0.9).toFixed(0)}
                      </Text>
                    </View>
                  )}

                  {job.notes ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={15} color={Colors.icon} />
                      <Text style={[styles.infoText, { fontStyle: 'italic' }]}>"{job.notes}"</Text>
                    </View>
                  ) : null}
                </View>

                {/* Reschedule Banner */}
                {clientRequestedReschedule && (
                  <View style={styles.rescheduleBanner}>
                    <Ionicons name="alert-circle" size={18} color="#d97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rescheduleTitle}>Client Requested Reschedule</Text>
                      <Text style={styles.rescheduleDate}>
                        New Proposed Time: {job.reschedule_proposed_at ? new Date(job.reschedule_proposed_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                        }) : ''}
                      </Text>
                      {job.reschedule_reason && (
                        <Text style={styles.rescheduleReason}>"{job.reschedule_reason}"</Text>
                      )}
                      <TouchableOpacity
                        style={styles.reviewRescheduleBtn}
                        onPress={() => handleOpenRescheduleRespond(job)}
                      >
                        <Text style={styles.reviewRescheduleText}>Review & Respond</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {workerRequestedReschedule && (
                  <View style={[styles.rescheduleBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <Ionicons name="hourglass-outline" size={18} color="#2563eb" />
                    <Text style={[styles.rescheduleDate, { color: '#1e40af', flex: 1 }]}>
                      You proposed a reschedule. Awaiting client response.
                    </Text>
                  </View>
                )}

                {/* Handshake: Client confirmed first */}
                {clientAlreadyConfirmed && (
                  <View style={styles.completionBanner}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#16a34a" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completionTitle}>Client Confirmed Work</Text>
                      <Text style={styles.completionDesc}>The client verified the job. Please confirm to finalize payout.</Text>
                      <PressableScale
                        style={styles.confirmCompleteBtn}
                        onPress={() => handleConfirmCompletion(job)}
                      >
                        <Text style={styles.confirmCompleteBtnText}>Confirm Completion & Log Payout</Text>
                      </PressableScale>
                    </View>
                  </View>
                )}

                {/* Handshake: Waiting for client */}
                {waitingForClientConfirmation && (
                  <View style={[styles.completionBanner, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                    <Ionicons name="hourglass-outline" size={18} color="#2563eb" />
                    <Text style={[styles.completionDesc, { color: '#1e40af', flex: 1 }]}>
                      You submitted completion proof. Waiting for client to inspect and confirm.
                    </Text>
                  </View>
                )}

                {/* Photos Preview */}
                {job.photos && job.photos.length > 0 && (
                  <View style={styles.photosSection}>
                    <Text style={styles.photosTitle}>Job Photos ({job.photos.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                      {job.photos.map(p => (
                        <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Execution Actions */}
                <View style={styles.actionsContainer}>
                  {/* Status: new -> Accept or Decline */}
                  {job.status === 'new' && (
                    <View style={styles.twoBtnRow}>
                      <PressableScale
                        style={[styles.btn, styles.declineBtn]}
                        onPress={() => handleDeclineJob(job)}
                      >
                        <Ionicons name="close" size={16} color={Colors.error} />
                        <Text style={styles.declineText}>Decline</Text>
                      </PressableScale>
                      <PressableScale
                        style={[styles.btn, styles.acceptBtn]}
                        onPress={() => handleAcceptJob(job)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.acceptText}>Accept Job</Text>
                      </PressableScale>
                    </View>
                  )}

                  {/* Status: accepted -> Start Travel + Reschedule */}
                  {job.status === 'accepted' && (
                    <View style={styles.twoBtnRow}>
                      {!isPendingReschedule && (
                        <PressableScale
                          style={[styles.btn, styles.outlineBtn]}
                          onPress={() => handleOpenRescheduleRequest(job)}
                        >
                          <Ionicons name="calendar-outline" size={16} color={Colors.text} />
                          <Text style={styles.outlineBtnText}>Reschedule</Text>
                        </PressableScale>
                      )}
                      <PressableScale
                        style={[styles.btn, styles.primaryBtn]}
                        onPress={() => handleStartTravel(job)}
                      >
                        <Ionicons name="navigate-outline" size={16} color="#fff" />
                        <Text style={styles.primaryBtnText}>Start Travel (En Route)</Text>
                      </PressableScale>
                    </View>
                  )}

                  {/* Status: en_route -> Navigation + Arrived */}
                  {job.status === 'en_route' && (
                    <View style={styles.twoBtnRow}>
                      <PressableScale
                        style={[styles.btn, styles.mapsBtn]}
                        onPress={() => handleOpenNavigation(job.address)}
                      >
                        <Ionicons name="map-outline" size={16} color="#1e40af" />
                        <Text style={styles.mapsBtnText}>Open in Maps</Text>
                      </PressableScale>
                      <PressableScale
                        style={[styles.btn, styles.primaryBtn]}
                        onPress={() => handleStartWork(job)}
                      >
                        <Ionicons name="play-outline" size={16} color="#fff" />
                        <Text style={styles.primaryBtnText}>Arrived (Start Work)</Text>
                      </PressableScale>
                    </View>
                  )}

                  {/* Hourly Job Work Timer Widget */}
                  {job.status === 'in_progress' && job.pricing_type === 'hourly' && (
                    <View style={styles.timerCard}>
                      <View style={styles.timerHeader}>
                        <Ionicons name="stopwatch-outline" size={16} color="#059669" />
                        <Text style={styles.timerTitle}>Hourly Work Timer</Text>
                      </View>
                      {job.work_started_at && !job.work_ended_at ? (
                        <View style={styles.activeTimerRow}>
                          <Text style={styles.timerCountdown}>
                            {formatElapsedTime(job.work_started_at)}
                          </Text>
                          <TouchableOpacity
                            style={styles.stopTimerBtn}
                            onPress={() => handleStopTimer(job)}
                          >
                            <Ionicons name="stop" size={14} color="#fff" />
                            <Text style={styles.stopTimerBtnText}>Stop Timer</Text>
                          </TouchableOpacity>
                        </View>
                      ) : job.work_ended_at ? (
                        <Text style={styles.timerCompletedText}>
                          Finished: {job.estimated_duration_hours || 0} hrs billed (₱{job.price?.toLocaleString()})
                        </Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.startTimerBtn}
                          onPress={() => handleStartTimer(job)}
                        >
                          <Ionicons name="play" size={14} color="#fff" />
                          <Text style={styles.startTimerBtnText}>Start Work Timer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Status: in_progress -> Finish Job & Photo */}
                  {job.status === 'in_progress' && !waitingForClientConfirmation && !clientAlreadyConfirmed && (
                    <PressableScale
                      style={[styles.btn, styles.finishBtn]}
                      onPress={() => handleOpenPhotoModal(job)}
                    >
                      <Ionicons name="camera-outline" size={18} color="#fff" />
                      <Text style={styles.finishBtnText}>Finish Job & Upload Photo Proof</Text>
                    </PressableScale>
                  )}

                  {/* On-Site Price / Scope Amendment Button */}
                  {['accepted', 'en_route', 'in_progress'].includes(job.status) && (
                    <TouchableOpacity
                      style={styles.amendmentActionBtn}
                      onPress={() => {
                        setAmendmentJob(job);
                        setAmendmentVisible(true);
                      }}
                    >
                      <Ionicons name="pricetag-outline" size={14} color="#7c3aed" />
                      <Text style={styles.amendmentActionText}>
                        {job.scope_amendment_status === 'pending'
                          ? `Adjustment Pending: ₱${Number(job.scope_amendment_price || 0).toLocaleString()}`
                          : 'Adjust Price / Add Materials'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Auxiliary: Chat, Call, SMS with Client */}
                  <View style={styles.contactLinksRow}>
                    <TouchableOpacity
                      style={styles.chatLink}
                      onPress={() => router.push(`/chat/${job.client_id}?bookingId=${job.id}`)}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                      <Text style={styles.chatLinkText}>Chat</Text>
                    </TouchableOpacity>
                    {job.other_phone && (
                      <TouchableOpacity
                        style={styles.chatLink}
                        onPress={() => Linking.openURL(`tel:${job.other_phone}`)}
                      >
                        <Ionicons name="call-outline" size={14} color={Colors.primary} />
                        <Text style={styles.chatLinkText}>Call</Text>
                      </TouchableOpacity>
                    )}
                    {job.other_phone && (
                      <TouchableOpacity
                        style={styles.chatLink}
                        onPress={() => Linking.openURL(`sms:${job.other_phone}`)}
                      >
                        <Ionicons name="chatbox-ellipses-outline" size={14} color={Colors.primary} />
                        <Text style={styles.chatLinkText}>SMS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Scope Amendment Modal */}
      {amendmentJob && (
        <ScopeAmendmentModal
          visible={amendmentVisible}
          currentPrice={Number(amendmentJob.price || 0)}
          onClose={() => {
            setAmendmentVisible(false);
            setAmendmentJob(null);
          }}
          onSubmit={handleScopeAmendmentSubmit}
        />
      )}

      {/* Reschedule Modal */}
      {selectedJob && (
        <RescheduleModal
          visible={rescheduleVisible}
          onClose={() => {
            setRescheduleVisible(false);
            setSelectedJob(null);
          }}
          mode={rescheduleMode}
          bookingId={selectedJob.id}
          proposedDate={selectedJob.reschedule_proposed_at}
          proposedReason={selectedJob.reschedule_reason}
          onRequestSubmit={handleRescheduleRequestSubmit}
          onRespondSubmit={handleRescheduleRespondSubmit}
        />
      )}

      {/* Proof Photo Upload Modal */}
      {selectedJob && (
        <JobPhotoModal
          visible={photoModalVisible}
          onClose={() => {
            setPhotoModalVisible(false);
            setSelectedJob(null);
          }}
          bookingId={selectedJob.id}
          onPhotoUploaded={handlePhotoUploaded}
        />
      )}
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
  clientCol: { flex: 1, marginRight: 10 },
  clientName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceText: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  refText: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoBox: { backgroundColor: Colors.background, borderRadius: 12, padding: 12, gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: Colors.text, flex: 1 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  rescheduleBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 12, marginBottom: 12 },
  rescheduleTitle: { fontSize: 12, fontWeight: '700', color: '#b45309', textTransform: 'uppercase' },
  rescheduleDate: { fontSize: 13, fontWeight: '600', color: '#92400e', marginTop: 2 },
  rescheduleReason: { fontSize: 12, color: '#78350f', fontStyle: 'italic', marginTop: 2 },
  reviewRescheduleBtn: { backgroundColor: '#d97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  reviewRescheduleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  completionBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12, marginBottom: 12 },
  completionTitle: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  completionDesc: { fontSize: 12, color: '#166534', marginTop: 2 },
  confirmCompleteBtn: { backgroundColor: '#16a34a', paddingVertical: 9, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  confirmCompleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  photosSection: { marginBottom: 12 },
  photosTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  photoThumb: { width: 70, height: 70, borderRadius: 10, marginRight: 8, backgroundColor: Colors.border },
  actionsContainer: { paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  twoBtnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  declineBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  declineText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  acceptBtn: { backgroundColor: Colors.primary },
  acceptText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  outlineBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  outlineBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  primaryBtn: { backgroundColor: Colors.primary },
  primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  mapsBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  mapsBtnText: { fontSize: 13, fontWeight: '700', color: '#1e40af' },
  finishBtn: { backgroundColor: '#16a34a', width: '100%', height: 46 },
  finishBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  timerCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 14, padding: 12, marginBottom: 8 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  timerTitle: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  activeTimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerCountdown: { fontSize: 24, fontWeight: '800', color: '#064e3b', fontFamily: 'monospace' },
  stopTimerBtn: { backgroundColor: '#dc2626', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  stopTimerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  startTimerBtn: { backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  startTimerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  timerCompletedText: { fontSize: 13, fontWeight: '600', color: '#047857' },
  amendmentActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  amendmentActionText: { fontSize: 12, fontWeight: '700', color: '#6d28d9' },
  contactLinksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 4 },
  chatLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  chatLinkText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
