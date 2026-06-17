import { useMemo } from 'react';
import { StyleSheet, ScrollView, Image, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { workers } from '@/constants/data';
import { PressableScale } from '@/components/pressable-scale';

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worker = useMemo(() => workers.find(w => w.id === id), [id]);

  if (!worker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Worker not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <Image source={{ uri: worker.avatar }} style={styles.avatar} />
          {worker.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            </View>
          )}
          <Text style={styles.name}>{worker.name}</Text>
          <Text style={styles.category}>{worker.category}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="star" size={14} color={Colors.star} />
                <Text style={styles.statValue}>{worker.rating}</Text>
              </View>
              <Text style={styles.statLabel}>{worker.reviews} reviews</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.statValue}>{worker.distance}</Text>
              </View>
              <Text style={styles.statLabel}>away</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statPrice}>₱{worker.price}</Text>
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
          <Text style={styles.aboutText}>{worker.about}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsWrap}>
            {worker.skills.map((skill) => (
              <View key={skill} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>Customer {i}</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star" size={12} color={Colors.star} />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>Great service and very professional. Highly recommended!</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  scrollContent: { paddingBottom: 24 },
  topBar: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  profileSection: { marginHorizontal: 20, borderRadius: 20, padding: 24, backgroundColor: Colors.surface, alignItems: 'center', marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 20, marginBottom: 4 },
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
  skillBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight },
  skillText: { fontSize: 13, fontWeight: '500', color: Colors.text },
  reviewCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
});
