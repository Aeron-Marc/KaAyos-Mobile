import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { providerStats } from '@/constants/data';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';

export default function ProviderDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.statsRow}>
          {[
            { label: 'Earnings', value: `₱${providerStats.earnings.toLocaleString()}`, icon: 'wallet-outline' as const },
            { label: 'Jobs Done', value: `${providerStats.jobsCompleted}`, icon: 'checkmark-done-outline' as const },
            { label: 'Rating', value: `${providerStats.rating}`, icon: 'star-outline' as const },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon} size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chart}>
            {providerStats.weeklyData.map((day) => (
              <View key={day.name} style={styles.chartItem}>
                <Text style={styles.chartAmount}>₱{day.earnings}</Text>
                <View style={[styles.bar, { height: Math.max((day.earnings / 3000) * 150, 8) }]} />
                <Text style={styles.chartDay}>{day.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Jobs</Text>

        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View>
                <Text style={styles.jobTitle}>Job Request #{i}</Text>
                <Text style={styles.jobService}>Plumbing - Leak Fix</Text>
              </View>
              <View style={styles.jobStatus}>
                <Text style={styles.jobStatusText}>New</Text>
              </View>
            </View>

            <View style={styles.jobDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.detailText}>Tomorrow at 2:00 PM</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.detailText}>Quezon City</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="wallet-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.detailText}>₱450</Text>
              </View>
            </View>

            <View style={styles.jobActions}>
              <PressableScale haptics style={styles.acceptBtn} onPress={() => showToast(`Job #${i} accepted`, 'success')}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </PressableScale>
              <PressableScale style={styles.declineBtn} onPress={() => showToast(`Job #${i} declined`, 'info')}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </PressableScale>
            </View>
          </View>
        ))}
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, backgroundColor: Colors.surface, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },
  chartCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 180 },
  chartItem: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 },
  chartAmount: { fontSize: 9, fontWeight: '600', color: Colors.textSecondary },
  bar: { width: '60%', borderRadius: 6, backgroundColor: Colors.primary },
  chartDay: { fontSize: 12, fontWeight: '600', color: Colors.text },
  jobCard: { marginHorizontal: 20, borderRadius: 14, padding: 18, backgroundColor: Colors.surface, marginBottom: 10 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  jobService: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  jobStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#fffbeb' },
  jobStatusText: { color: '#d97706', fontSize: 11, fontWeight: '600' },
  jobDetails: { gap: 8, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.textSecondary },
  jobActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  declineBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
});
