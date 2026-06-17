import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';

export default function ProfileScreen() {
  const { showToast } = useToast();

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MR</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Maria Reyes</Text>
            <Text style={styles.profileRole}>Homeowner</Text>
          </View>
        </View>

        <PressableScale onPress={() => router.push('/map')} style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Ionicons name="map-outline" size={20} color={Colors.primary} />
            <Text style={styles.menuLabel}>Nearby Map</Text>
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
          onPress={() => router.replace('/auth/login')}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </PressableScale>
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
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, backgroundColor: Colors.surface, marginBottom: 12, gap: 16 },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  profileRole: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  menuCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 14, backgroundColor: Colors.surface, marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, marginTop: 20 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
