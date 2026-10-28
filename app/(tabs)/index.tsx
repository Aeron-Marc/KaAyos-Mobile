import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, RefreshControl, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Category, Worker, Booking } from '@/lib/api';
import { WorkerCard } from '@/components/worker-card';
import type { WorkerCardData } from '@/components/worker-card';
import { SkeletonCard } from '@/components/skeleton';
import { useAuth } from '@/lib/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, wrksRes, bksRes] = await Promise.allSettled([
        api.getCategories(),
        api.getWorkers(),
        api.getBookings(),
      ]);

      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value);
      }
      if (wrksRes.status === 'fulfilled') {
        setWorkers(wrksRes.value);
        setFetchError(null);
      } else {
        console.error('Failed to fetch workers', wrksRes.reason);
        setFetchError('Unable to connect to KaAyos server. Please tap Retry or pull down.');
      }

      if (bksRes.status === 'fulfilled') {
        const active = (bksRes.value || []).find(b => ['in_progress', 'en_route', 'accepted', 'new'].includes(b.status));
        setActiveBooking(active || null);
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
      setFetchError('Connection error. Please check your internet and tap Retry.');
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const activeCatName = activeCategory
    ? categories.find(c => c.slug === activeCategory)?.name
    : null;

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesCategory = !activeCatName ||
        (w.category && w.category.toLowerCase() === activeCatName.toLowerCase()) ||
        (activeCategory && w.category && w.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch = !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCatName, activeCategory, searchQuery, workers]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryAccent} />}
    >
      {/* ── COMPACT HERO ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <View style={styles.heroLocRow}>
              <Ionicons name="location-sharp" size={11} color="#85B7EB" />
              <Text style={styles.heroLocText}>Tuy, Batangas</Text>
            </View>
            <Text style={styles.heroGreeting}>Good {greeting}, {user?.first_name || 'there'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => (router.push as any)('/notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Input with Integrated Map Button */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={Colors.textMuted} />
          <TextInput
            placeholder="Search plumber, electrician, carpenter..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            style={styles.mapSearchBtn}
            onPress={() => (router.push as any)('/map')}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={15} color={Colors.primaryAccent} />
            <Text style={styles.mapSearchBtnText}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CONTEXTUAL ACTIVE BOOKING BANNER ── */}
      {activeBooking && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push('/(tabs)/bookings')}
          activeOpacity={0.8}
        >
          <View style={styles.activeBannerIconBox}>
            <Ionicons name="flash" size={15} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.activeBannerTopRow}>
              <Text style={styles.activeBannerTitle} numberOfLines={1}>
                {activeBooking.service_category} • {activeBooking.other_name || 'Worker'}
              </Text>
              <View style={styles.activeBannerBadge}>
                <Text style={styles.activeBannerBadgeText}>
                  {activeBooking.status === 'in_progress' ? 'In Progress' :
                   activeBooking.status === 'en_route' ? 'En Route' :
                   activeBooking.status === 'accepted' ? 'Accepted' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={styles.activeBannerSub} numberOfLines={1}>
              {new Date(activeBooking.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • Tap to view tracking
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* ── 1-TAP CATEGORY FILTER CHIPS ── */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !activeCategory && styles.categoryChipActive]}
            onPress={() => setActiveCategory(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, !activeCategory && styles.categoryChipTextActive]}>
              All Services
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const active = activeCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setActiveCategory(active ? null : cat.slug)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── RECOMMENDED WORKERS ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeCatName ? `${activeCatName} Workers` : 'Available Workers'}
        </Text>
        <Text style={styles.sectionMeta}>{filteredWorkers.length} available</Text>
      </View>

      {fetchError && workers.length === 0 ? (
        <View style={styles.errorStateBox}>
          <Ionicons name="cloud-offline-outline" size={42} color="#dc2626" />
          <Text style={styles.errorStateTitle}>Connection Issue</Text>
          <Text style={styles.errorStateSub}>{fetchError}</Text>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={() => {
              setLoading(true);
              fetchData().finally(() => setLoading(false));
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="reload" size={16} color="#fff" />
            <Text style={styles.errorRetryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={{ paddingHorizontal: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : filteredWorkers.length === 0 ? (
        <View style={styles.emptyWorkers}>
          <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyWorkersText}>No workers found for this search.</Text>
        </View>
      ) : (
        filteredWorkers.map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker as WorkerCardData}
            onPress={() => router.push(`/worker/${worker.id}`)}
          />
        ))
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
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  heroLocText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#85B7EB',
  },
  heroGreeting: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    height: 44,
    gap: 8,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  mapSearchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
  },
  mapSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryAccent,
  },
  activeBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  activeBannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    flex: 1,
  },
  activeBannerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  activeBannerSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
  },
  categoriesSection: {
    marginTop: 14,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  emptyWorkers: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyWorkersText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  errorStateBox: {
    marginHorizontal: 20,
    marginVertical: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 10,
    marginBottom: 4,
  },
  errorStateSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorRetryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
