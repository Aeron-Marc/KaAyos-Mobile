import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, RefreshControl, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Category, Worker, DashboardStats } from '@/lib/api';
import { WorkerCard } from '@/components/worker-card';
import type { WorkerCardData } from '@/components/worker-card';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonCard } from '@/components/skeleton';
import { useAuth } from '@/lib/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<DashboardStats['stats'] | null>(null);
  const [catDropdown, setCatDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cats, wrks, dash] = await Promise.all([
        api.getCategories(),
        api.getWorkers(),
        api.getDashboardStats().catch(() => null),
      ]);
      setCategories(cats);
      setWorkers(wrks);
      if (dash) setStats(dash.stats);
    } catch (e) {
      console.error('Failed to fetch data', e);
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
      const matchesCategory = !activeCatName || w.category === activeCatName;
      const matchesSearch = !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCatName, searchQuery, workers]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Good {greeting}</Text>
            <Text style={styles.heroName}>{user?.first_name || 'there'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => (router.push as any)('/notifications')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {stats && stats.unreadMessages > 0 && (
              <View style={styles.bellDot} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.heroSearch}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            placeholder="What service do you need?"
            placeholderTextColor={Colors.textMuted}
            style={styles.heroSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          {[
            { label: 'Active', value: stats.activeBookings ?? 0, icon: 'calendar', color: Colors.primary, route: '/(tabs)/bookings' },
            { label: 'Completed', value: stats.completedJobs ?? 0, icon: 'checkmark-circle', color: '#16a34a', route: '/(tabs)/bookings' },
            { label: 'Messages', value: stats.unreadMessages ?? 0, icon: 'chatbubble', color: '#2563eb', route: '/(tabs)/chat' },
            { label: 'Reviews', value: stats.pendingReviews ?? 0, icon: 'star', color: '#d97706', route: '/(tabs)/bookings' },
          ].map(s => (
            <TouchableOpacity
              key={s.label}
              style={[styles.statCard, { borderTopColor: s.color }]}
              onPress={() => router.push(s.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Discovery Shortcuts */}
      <View style={styles.quickActionsRow}>
        <PressableScale
          style={styles.quickActionCard}
          onPress={() => (router.push as any)('/map')}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="map" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickActionTitle}>Tuy Map</Text>
            <Text style={styles.quickActionSubtitle}>22 Barangays</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </PressableScale>

        <PressableScale
          style={styles.quickActionCard}
          onPress={() => (router.push as any)('/suggestions')}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="sparkles" size={18} color="#d97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickActionTitle}>Smart Match</Text>
            <Text style={styles.quickActionSubtitle}>AI Assistant</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </PressableScale>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity style={styles.catDropdownBtn} onPress={() => setCatDropdown(true)}>
          <Text style={styles.catDropdownText} numberOfLines={1}>
            {activeCategory ? categories.find(c => c.slug === activeCategory)?.name : 'All Categories'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={catDropdown} transparent animationType="fade" onRequestClose={() => setCatDropdown(false)}>
        <TouchableOpacity style={styles.catOverlay} activeOpacity={1} onPress={() => setCatDropdown(false)}>
          <View style={styles.catDropdown}>
            <Text style={styles.catDropdownTitle}>Select Category</Text>
            <FlatList
              data={[{ id: 0, name: 'All Categories', slug: null }, ...categories]}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const active = activeCategory === item.slug;
                return (
                  <TouchableOpacity
                    style={[styles.catOption, active && styles.catOptionActive]}
                    onPress={() => {
                      setActiveCategory(item.slug);
                      setCatDropdown(false);
                    }}
                  >
                    <Text style={[styles.catOptionText, active && styles.catOptionTextActive]}>
                      {item.name}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 420 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle}>Available Workers</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroGreeting: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  heroName: { fontSize: 26, fontWeight: '700', color: '#fff' },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  heroSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  heroSearchInput: { flex: 1, fontSize: 15, color: Colors.text },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  catDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    maxWidth: 180,
  },
  catDropdownText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  catOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    width: '80%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  catDropdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  catOptionActive: { backgroundColor: Colors.primaryLight },
  catOptionText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  catOptionTextActive: { color: Colors.primary, fontWeight: '600' },
});
