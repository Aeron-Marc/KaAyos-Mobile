import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, TextInput, FlatList, RefreshControl, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { categories, workers, providerStats } from '@/constants/data';
import { WorkerCard } from '@/components/worker-card';
import { PressableScale } from '@/components/pressable-scale';
import { SkeletonCard } from '@/components/skeleton';
import { useToast } from '@/components/toast';

export default function HomeScreen() {
  const [role, setRole] = useState<'homeowner' | 'provider'>('homeowner');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesCategory = !activeCategory || w.category.toLowerCase() === activeCategory;
      const matchesSearch = !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />;
  const jobStatuses = ['Plumbing - Leak Fix', 'Deep Cleaning', 'Electrical Inspection'];
  const jobTimes = ['Tomorrow at 2:00 PM', 'Today at 4:00 PM', 'Oct 28 at 9:00 AM'];

  if (role === 'provider') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={refreshControl}>
          <View style={styles.headerSection}>
            <Text style={styles.greeting}>Quezon City, Metro Manila</Text>
            <Text style={styles.pageTitle}>Provider Dashboard</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Earnings</Text>
              <Text style={styles.statValue}>₱{providerStats.earnings.toLocaleString()}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Jobs Done</Text>
              <Text style={styles.statValue}>{providerStats.jobsCompleted}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>{providerStats.rating}</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Weekly Earnings</Text>
            <View style={styles.chart}>
              {providerStats.weeklyData.map((day) => (
                <View key={day.name} style={styles.chartBar}>
                  <View style={[styles.bar, { height: (day.earnings / 3000) * 120 }]} />
                  <Text style={styles.chartLabel}>{day.name}</Text>
                  <Text style={styles.chartValue}>₱{day.earnings}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.jobCard}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>Job Request #{i}</Text>
                <Text style={styles.jobMeta}>{jobStatuses[i - 1]}</Text>
                <Text style={styles.jobTime}>{jobTimes[i - 1]}</Text>
              </View>
              <PressableScale haptics style={styles.acceptBtn} onPress={() => showToast(`Job #${i} accepted successfully`, 'success')}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </PressableScale>
            </View>
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={refreshControl}>
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>Quezon City, Metro Manila</Text>
          <Text style={styles.pageTitle}>Good morning, Maria</Text>
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesList}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <PressableScale
                onPress={() => setActiveCategory(isActive ? null : item.id)}
                style={[styles.categoryItem, isActive && styles.categoryItemActive]}
              >
                <View style={[styles.categoryIcon, isActive && styles.categoryIconActive]}>
                  <Ionicons
                    name={
                      item.id === 'plumbing' ? 'water-outline' :
                      item.id === 'electrical' ? 'flash-outline' :
                      item.id === 'cleaning' ? 'sparkles-outline' :
                      item.id === 'hvac' ? 'thermometer-outline' :
                      item.id === 'carpentry' ? 'hammer-outline' : 'color-palette-outline'
                    }
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
            <WorkerCard key={worker.id} worker={worker} onPress={() => router.push(`/worker/${worker.id}`)} />
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, backgroundColor: Colors.surface },
  statLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.text },
  chartCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, marginTop: 8 },
  chartBar: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '60%', borderRadius: 6, backgroundColor: Colors.primary },
  chartLabel: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  chartValue: { fontSize: 10, fontWeight: '700', color: Colors.text },
  jobCard: { marginHorizontal: 20, borderRadius: 14, padding: 18, backgroundColor: Colors.surface, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  jobMeta: { fontSize: 14, color: Colors.textSecondary, marginBottom: 2 },
  jobTime: { fontSize: 13, color: Colors.textMuted },
  acceptBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.primary },
  acceptBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
