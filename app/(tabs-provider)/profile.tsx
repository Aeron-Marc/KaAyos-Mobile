import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { WorkerDetail, User } from '@/lib/api';
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

  const workerId = authUser?.id;

  const fetchProfile = useCallback(async () => {
    if (!workerId) return;
    try {
      const [data, profileData] = await Promise.all([
        api.getWorkerDetail(workerId),
        api.getProfile(workerId),
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

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : worker ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {`${worker.first_name?.charAt(0) || ''}${worker.last_name?.charAt(0) || ''}`}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{worker.name}</Text>
                <Text style={styles.profileRole}>{worker.category || 'Service Provider'}</Text>
                {worker.verified && (
                  <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                    <Text style={styles.verifiedText}>Verified Provider</Text>
                  </View>
                )}
              </View>
            </View>

            {worker.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{worker.bio}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{worker.totalJobs || 0}</Text>
                <Text style={styles.statLabel}>Jobs Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{worker.rating || 0}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{worker.reviews?.length || 0}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>

            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color={Colors.icon} />
                <Text style={styles.contactText}>{worker.email}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color={Colors.icon} />
                <Text style={styles.contactText}>{worker.phone || 'N/A'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={16} color={Colors.icon} />
                <Text style={styles.contactText}>{worker.city || 'Tuy, Batangas'}</Text>
              </View>
              {worker.hourly_rate && (
                <View style={styles.contactRow}>
                  <Ionicons name="cash-outline" size={16} color={Colors.icon} />
                  <Text style={styles.contactText}>PHP {worker.hourly_rate}/hr</Text>
                </View>
              )}
            </View>

            {worker.skills && worker.skills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.skillsRow}>
                  {worker.skills.map((s, i) => (
                    <View key={i} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{typeof s === 'string' ? s : s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {worker.services && worker.services.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Services Offered</Text>
                <View style={styles.servicesList}>
                  {worker.services.filter(s => s.is_available).map((svc) => (
                    <View key={svc.id} style={styles.serviceBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.serviceText}>{svc.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {worker.portfolio && worker.portfolio.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Portfolio ({worker.portfolio.length})</Text>
                <View style={styles.portfolioGrid}>
                  {worker.portfolio.map((p) => (
                    <View key={p.id} style={styles.portfolioItem}>
                      <View style={styles.portfolioPlaceholder}>
                        <Ionicons name="image-outline" size={24} color={Colors.icon} />
                      </View>
                      {p.title && <Text style={styles.portfolioCaption}>{p.title}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {worker.documents && worker.documents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Documents</Text>
                {worker.documents.map((d, i) => (
                  <View key={i} style={styles.docRow}>
                    <Ionicons
                      name={d.status === 'verified' ? 'checkmark-circle' : d.status === 'pending' ? 'time-outline' : 'close-circle-outline'}
                      size={16}
                      color={d.status === 'verified' ? Colors.success : d.status === 'pending' ? Colors.star : Colors.error}
                    />
                    <Text style={styles.docText}>{d.type.replace(/_/g, ' ')} â€” {d.status}</Text>
                  </View>
                ))}
              </View>
            )}

            {worker.reviews && worker.reviews.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Reviews</Text>
                {worker.reviews.slice(0, 3).map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <Text style={styles.reviewClient}>{review.client_name}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= review.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={Colors.star}
                        />
                      ))}
                    </View>
                    {review.comment && <Text style={styles.reviewText}>{review.comment}</Text>}
                  </View>
                ))}
              </View>
            )}

            <PressableScale onPress={() => router.push('/profile-edit')} style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
                <Text style={styles.menuLabel}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.icon} />
            </PressableScale>

            <PressableScale onPress={() => showToast('Settings coming soon', 'info')} style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Ionicons name="settings-outline" size={20} color={Colors.primary} />
                <Text style={styles.menuLabel}>Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.icon} />
            </PressableScale>

            <PressableScale
              onPress={() => {
                signOut();
                router.replace('/auth/login');
              }}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </PressableScale>
          </>
        ) : (
          <Text style={styles.loadingText}>Failed to load profile</Text>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: Colors.surface, marginBottom: 12, gap: 16 },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  profileRole: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  bioText: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12, alignItems: 'center' },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  contactCard: { borderRadius: 16, padding: 18, backgroundColor: Colors.surface, marginBottom: 12, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactText: { fontSize: 14, color: Colors.text, flex: 1 },
  section: { borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight },
  skillText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  servicesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight },
  serviceText: { fontSize: 13, fontWeight: '500', color: Colors.text },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  portfolioItem: { width: '47%', borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  portfolioPlaceholder: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  portfolioCaption: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, padding: 8, textAlign: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  docText: { fontSize: 13, color: Colors.text, flex: 1, textTransform: 'capitalize' },
  reviewCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  reviewClient: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  reviewText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 14, backgroundColor: Colors.surface, marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, marginTop: 20 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
