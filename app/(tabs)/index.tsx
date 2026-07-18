import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, FlatList, RefreshControl, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { Category, Worker } from '@/lib/api';
import { WorkerCard } from '@/components/worker-card';
import type { WorkerCardData } from '@/components/worker-card';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonCard } from '@/components/skeleton';

const categoryIcons: Record<string, string> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  cleaning: 'sparkles-outline',
  hvac: 'thermometer-outline',
  carpentry: 'hammer-outline',
  painting: 'color-palette-outline',
  other: 'construct-outline',
};

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [cats, wrks] = await Promise.all([
        api.getCategories(),
        api.getWorkers(),
      ]);
      setCategories(cats);
      setWorkers(wrks);
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

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesCategory = !activeCategory || w.category === activeCategory;
      const matchesSearch = !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, workers]);

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={refreshControl}>
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>Quezon City, Metro Manila</Text>
          <Text style={styles.pageTitle}>Find a service</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.icon} />
            <TextInput
              placeholder="What service do you need?"
              placeholderTextColor={Colors.icon}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.categoriesList}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.slug;
            return (
              <PressableScale
                onPress={() => setActiveCategory(isActive ? null : item.slug)}
                style={[styles.categoryItem, isActive && styles.categoryItemActive]}
              >
                <View style={[styles.categoryIcon, isActive && styles.categoryIconActive]}>
                  <Ionicons
                    name={(categoryIcons[item.slug] || 'construct-outline') as any}
                    size={22}
                    color={isActive ? '#fff' : Colors.iconActive}
                  />
                </View>
                <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>
                  {item.name}
                </Text>
              </PressableScale>
            );
          }}
        />

        <Text style={styles.sectionTitle}>Recommended for you</Text>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          filteredWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker as WorkerCardData}
              onPress={() => router.push(`/worker/${worker.id}`)}
            />
          ))
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  greeting: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  searchRow: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, height: 48, backgroundColor: Colors.surface },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10, color: Colors.text },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14 },
  categoriesList: { paddingHorizontal: 20, gap: 12 },
  categoryItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surface, minWidth: 80 },
  categoryItemActive: { backgroundColor: Colors.primary },
  categoryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryName: { fontSize: 12, fontWeight: '600', color: Colors.text },
  categoryNameActive: { color: '#fff' },
});