import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, RefreshControl, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { WorkerDetail } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorker = async () => {
    if (!id) return;
    try {
      const data = await api.getWorkerDetail(Number(id));
      setWorker(data);
    } catch (e) {
      console.error('Failed to load worker', e);
    }
  };

  useEffect(() => {
    fetchWorker().finally(() => setLoading(false));
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorker();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!worker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Worker not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validPrices = (worker.services ?? [])
    .map(s => s.custom_price || s.base_price)
    .filter((p): p is number => p !== null && p !== undefined);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.profileSection}>
          {worker.avatar ? (
            <Image source={{ uri: worker.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
              </Text>
            </View>
          )}
          {worker.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            </View>
          )}
          <Text style={styles.name}>{worker.name}</Text>
          <Text style={styles.category}>{worker.service_category || 'Service Provider'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="star" size={14} color={Colors.star} />
                <Text style={styles.statValue}>{worker.rating}</Text>
              </View>
              <Text style={styles.statLabel}>{worker.reviews?.length || 0} reviews</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="briefcase-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.statValue}>{worker.totalJobs || 0}</Text>
              </View>
              <Text style={styles.statLabel}>jobs done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statPrice}>₱{lowestPrice || '?'}</Text>
              <Text style={styles.statLabel}>/hour</Text>
            </View>
          </View>

          <PressableScale haptics style={styles.bookBtn} onPress={() => router.push(`/modal/booking?id=${worker.id}`)}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Book Service</Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            {worker.service_category
              ? `Experienced ${worker.service_category} service provider serving in ${worker.city || 'your area'}.`
              : 'Professional service provider ready to help you.'}
          </Text>
        </View>

        {worker.services && worker.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.skillsWrap}>
              {worker.services.filter(s => s.is_available).map((svc) => (
                <View key={svc.id} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{svc.name}</Text>
                  {svc.custom_price && (
                    <Text style={styles.skillPrice}>₱{svc.custom_price}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {worker.portfolio && worker.portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            {worker.portfolio.map((item) => (
              <View key={item.id} style={styles.portfolioItem}>
                {item.image_path && (
                  <Image source={{ uri: item.image_path }} style={styles.portfolioImage} />
                )}
                {item.description && <Text style={styles.portfolioText}>{item.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {worker.reviews && worker.reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({worker.reviews.length})</Text>
            {worker.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.client_name}</Text>
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
                </View>
                {review.comment && <Text style={styles.reviewText}>{review.comment}</Text>}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  scrollContent: { paddingBottom: 24 },
  topBar: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  profileSection: { marginHorizontal: 20, borderRadius: 20, padding: 24, backgroundColor: Colors.surface, alignItems: 'center', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 20, marginBottom: 4 },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '700' },
  verifiedBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -13, marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  category: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, width: '100%' },
  statItem: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: Colors.background, alignItems: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  statPrice: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: Colors.primary },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  aboutText: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center' },
  skillText: { fontSize: 13, fontWeight: '500', color: Colors.text },
  skillPrice: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  portfolioItem: { marginBottom: 12 },
  portfolioImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 6 },
  portfolioText: { fontSize: 14, color: Colors.textSecondary },
  reviewCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
});