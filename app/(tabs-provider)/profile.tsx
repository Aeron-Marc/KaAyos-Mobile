import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
  Alert,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import { SERVER_URL, type WorkerDetail, type User } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

export default function ProviderProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [toggling, setToggling] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const workerId = authUser?.id;

  const fetchProfile = useCallback(async () => {
    if (!workerId) return;
    try {
      const [data, profileData] = await Promise.all([
        api.getWorkerDetail(workerId),
        api.getProfile(),
      ]);
      setWorker(data);
      setProfile(profileData.user);
    } catch (e) {
      console.error('Failed to load provider profile', e);
    }
  }, [workerId]);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleToggleService = useCallback(async (serviceId: number, current: number | boolean) => {
    setToggling(serviceId);
    try {
      const res = await api.toggleWorkerService(serviceId, !current);
      if (res.success) {
        showToast(`Service ${!current ? 'enabled' : 'disabled'}`, 'success');
        fetchProfile();
      } else {
        showToast(res.msg || 'Failed to toggle', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setToggling(null);
    }
  }, [fetchProfile, showToast]);

  const handleShareLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await api.updateWorkerLocation(pos.coords.latitude, pos.coords.longitude);
      if (res.success) {
        showToast('Tuy live location updated!', 'success');
        fetchProfile();
      } else {
        showToast(res.msg || 'Failed to update location', 'error');
      }
    } catch {
      showToast('Could not obtain GPS location', 'error');
    } finally {
      setLocating(false);
    }
  }, [fetchProfile, showToast]);

  const handleUploadDoc = async (docType: 'government_id' | 'barangay_clearance') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Permission to access photos is required', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingDocType(docType);
      await api.uploadWorkerDocument(docType, result.assets[0].uri);
      showToast(`${docType === 'government_id' ? 'Government ID' : 'Barangay Clearance'} uploaded! Pending review.`, 'success');
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload document');
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleChangePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Permission to access photos is required', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingPhoto(true);
      const res = await api.uploadAvatar(result.assets[0].uri);
      if (res.avatar_url) {
        showToast('Profile photo updated!', 'success');
        fetchProfile();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOutPrompt = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const avatarUrl = profile?.avatar || worker?.avatar
    ? ((profile?.avatar || worker?.avatar)!.startsWith('http')
        ? (profile?.avatar || worker?.avatar)!
        : `${SERVER_URL}${profile?.avatar || worker?.avatar}`)
    : null;

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Provider Hub</Text>
        <Text style={styles.subtitle}>Manage your Tuy services, credentials & profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : worker ? (
          <>
            {/* ── CARD 1: PROVIDER HERO & STATS (WEB MIRROR) ── */}
            <View style={styles.heroCard}>
              <View style={styles.heroAvatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImg} />
                ) : (
                  <View style={styles.heroAvatarFallback}>
                    <Text style={styles.heroAvatarText}>
                      {`${worker.first_name?.charAt(0) || 'W'}${worker.last_name?.charAt(0) || ''}`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.heroCameraBtn}
                  onPress={handleChangePhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={13} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.heroName}>{worker.name}</Text>
              <Text style={styles.heroCategory}>{worker.category || 'Service Provider'}</Text>

              <View style={styles.badgeRow}>
                {worker.verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                    <Text style={styles.verifiedBadgeText}>Tuy Verified Provider</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={12} color="#d97706" />
                    <Text style={styles.pendingBadgeText}>Verification Pending</Text>
                  </View>
                )}

                {worker.hourly_rate && (
                  <View style={styles.rateBadge}>
                    <Ionicons name="pricetag-outline" size={11} color={Colors.primary} />
                    <Text style={styles.rateBadgeText}>₱{worker.hourly_rate}/hr</Text>
                  </View>
                )}
              </View>

              {/* Stats Bar */}
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{worker.totalJobs || 0}</Text>
                  <Text style={styles.statLbl}>Jobs Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={14} color={Colors.star} />
                    <Text style={styles.statVal}>{worker.rating ? Number(worker.rating).toFixed(1) : '5.0'}</Text>
                  </View>
                  <Text style={styles.statLbl}>Rating</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{worker.reviews?.length || 0}</Text>
                  <Text style={styles.statLbl}>Reviews</Text>
                </View>
              </View>
            </View>

            {/* ── CARD 2: ABOUT & LIVE TUY PRESENCE ── */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>About & Presence</Text>
                </View>
              </View>

              {worker.bio ? (
                <Text style={styles.bioText}>{worker.bio}</Text>
              ) : (
                <Text style={styles.emptyBioText}>No professional bio provided yet. Tap Edit Profile to add one.</Text>
              )}

              <View style={styles.contactList}>
                <View style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={16} color={Colors.icon} />
                  <Text style={styles.contactItemText}>{worker.email}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={16} color={Colors.icon} />
                  <Text style={styles.contactItemText}>{worker.phone || 'Phone not set'}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.icon} />
                  <Text style={styles.contactItemText}>{worker.city || 'Tuy, Batangas'}</Text>
                </View>
              </View>

              {/* Integrated GPS sharing button */}
              <TouchableOpacity
                style={styles.gpsShareBtn}
                onPress={handleShareLocation}
                disabled={locating}
                activeOpacity={0.8}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.gpsShareBtnText}>Update Live Tuy GPS Location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── CARD 3: SERVICES & TRADE SKILLS ── */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="construct-outline" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Services Offered</Text>
                </View>
                <Text style={styles.badgeCounter}>{worker.services?.length || 0} Registered</Text>
              </View>

              {worker.services && worker.services.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {worker.services.map((svc) => (
                    <View key={svc.id} style={styles.serviceRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Ionicons
                          name={svc.is_available ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={svc.is_available ? Colors.success : Colors.icon}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName}>{svc.name}</Text>
                          <Text style={styles.serviceStatusLabel}>
                            {svc.is_available ? 'Accepting Bookings' : 'Temporarily Inactive'}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={!!svc.is_available}
                        onValueChange={() => handleToggleService(svc.id, svc.is_available)}
                        disabled={toggling === svc.id}
                        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                        thumbColor={svc.is_available ? Colors.primary : Colors.icon}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No services registered under your account yet.</Text>
              )}

              {/* Skills Tags */}
              {worker.skills && worker.skills.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.subTitle}>Specialized Skills</Text>
                  <View style={styles.skillsWrapper}>
                    {worker.skills.map((s, i) => (
                      <View key={i} style={styles.skillChip}>
                        <Text style={styles.skillChipText}>
                          {typeof s === 'string' ? s : (s as any).name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* ── CARD 4: TUY TRUST & VERIFICATION DOCUMENTS (WEB MIRROR) ── */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Tuy Verification Hub</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Official documentation required to receive verified status and accept priority bookings in Tuy.
              </Text>

              {[
                {
                  type: 'government_id' as const,
                  label: 'Government-Issued ID',
                  desc: 'PhilSys National ID, Driver’s License, UMID, or Postal ID',
                  icon: 'card-outline',
                },
                {
                  type: 'barangay_clearance' as const,
                  label: 'Tuy Barangay Clearance',
                  desc: 'Official clearance issued by your registered Tuy barangay',
                  icon: 'document-text-outline',
                },
              ].map((item) => {
                const doc = (worker.documents || []).find((d) => d.type === item.type);
                const status = doc?.status || 'not_uploaded';
                const isUploading = uploadingDocType === item.type;

                return (
                  <View key={item.type} style={styles.docItemCard}>
                    <View style={styles.docIconBox}>
                      <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.docTitle}>{item.label}</Text>
                      <Text style={styles.docSubtitle}>{item.desc}</Text>

                      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={[
                            styles.docStatusPill,
                            status === 'verified' && styles.statusPillVerified,
                            status === 'pending' && styles.statusPillPending,
                            status === 'not_uploaded' && styles.statusPillNone,
                          ]}
                        >
                          <Text
                            style={[
                              styles.docStatusText,
                              status === 'verified' && { color: '#16a34a' },
                              status === 'pending' && { color: '#d97706' },
                              status === 'not_uploaded' && { color: Colors.textSecondary },
                            ]}
                          >
                            {status === 'verified'
                              ? 'Verified'
                              : status === 'pending'
                              ? 'Pending Review'
                              : 'Not Uploaded'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.docUploadBtn}
                      onPress={() => handleUploadDoc(item.type)}
                      disabled={isUploading}
                      activeOpacity={0.8}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={13} color="#fff" />
                          <Text style={styles.docUploadBtnText}>
                            {status === 'not_uploaded' ? 'Upload' : 'Retake'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* ── CARD 5: REVIEWS PREVIEW ── */}
            {worker.reviews && worker.reviews.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
                    <Text style={styles.cardTitle}>Client Reviews ({worker.reviews.length})</Text>
                  </View>
                </View>

                {worker.reviews.slice(0, 3).map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.reviewClientName}>{review.client_name}</Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= review.rating ? 'star' : 'star-outline'}
                            size={12}
                            color={Colors.star}
                          />
                        ))}
                      </View>
                    </View>
                    {review.comment && <Text style={styles.reviewCommentText}>{review.comment}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* ── CARD 6: ACCOUNT MANAGEMENT & NAVIGATION ── */}
            <PressableScale
              onPress={() => router.push('/profile-edit')}
              style={styles.navMenuCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.navMenuIcon}>
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.navMenuTitle}>Edit Full Profile</Text>
                  <Text style={styles.navMenuSubtitle}>Bio, trade skills, work hours & coverage</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.icon} />
            </PressableScale>

            {/* ── SIGN OUT ── */}
            <PressableScale
              onPress={handleSignOutPrompt}
              style={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </PressableScale>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.loadingText}>Failed to load provider profile</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },

  // Hero Card
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroAvatarWrap: { position: 'relative', marginBottom: 12 },
  heroAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  heroAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 4 },
  heroCategory: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: '#f0fdf4',
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: '#fffbeb',
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
  },
  rateBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  // Section Card
  sectionCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: Colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 12 },
  badgeCounter: { fontSize: 11, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },

  // Bio & Contact
  bioText: { fontSize: 13, color: Colors.text, lineHeight: 20, marginBottom: 12 },
  emptyBioText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginBottom: 12 },
  contactList: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactItemText: { fontSize: 13, color: Colors.text },
  gpsShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  gpsShareBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Services & Skills
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  serviceName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  serviceStatusLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  emptyText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', paddingVertical: 8 },
  subTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
  },
  skillChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Documents
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  docSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 15 },
  docStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  statusPillVerified: { backgroundColor: '#f0fdf4' },
  statusPillPending: { backgroundColor: '#fffbeb' },
  statusPillNone: { backgroundColor: '#f1f5f9' },
  docStatusText: { fontSize: 10, fontWeight: '700' },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  docUploadBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Reviews
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  reviewClientName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  reviewCommentText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Navigation Menu Card
  navMenuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  navMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navMenuTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  navMenuSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Sign Out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: Colors.error },
});
