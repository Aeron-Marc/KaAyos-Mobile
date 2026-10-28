import { StyleSheet, Image, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

export type WorkerCardData = {
  id: number;
  name: string;
  avatar: string | null;
  category: string | null;
  rating: number;
  reviews: number;
  city: string | null;
  verified: boolean;
  hourly_rate: number | null;
  skills: string[];
  services: { name: string; price: number | null; base_price?: number | null }[];
};

export function WorkerCard({ worker, onPress }: { worker: WorkerCardData; onPress: () => void }) {
  const prices = worker.services
    .map(s => s.price ?? s.base_price ?? null)
    .filter((p): p is number => p !== null && p !== undefined);
  const minPrice = prices.length > 0 ? Math.min(...prices) : worker.hourly_rate;

  return (
    <PressableScale onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        {worker.avatar ? (
          <Image source={{ uri: worker.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{worker.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{worker.name}</Text>
            {worker.verified && (
              <Ionicons name="checkmark-circle" size={16} color={Colors.primaryAccent} />
            )}
          </View>
          <Text style={styles.category}>{worker.category || 'Service Provider'}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={Colors.star} />
          <Text style={styles.rating}>{worker.rating.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.metaText}>{worker.city || 'Tuy, Batangas'}</Text>
        </View>
        {minPrice !== null && isFinite(minPrice) && (
          <Text style={styles.price}>₱{minPrice.toLocaleString()}/hr</Text>
        )}
      </View>

      <View style={styles.skillsRow}>
        {worker.skills.slice(0, 3).map((skill) => (
          <View key={skill} style={styles.skillBadge}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 10,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 12 },
  avatarPlaceholder: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  nameSection: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text },
  category: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.amberLight,
  },
  rating: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  price: { fontSize: 15, fontWeight: '700', color: Colors.primaryAccent },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  skillText: { fontSize: 11, fontWeight: '600', color: Colors.primaryHover },
});
