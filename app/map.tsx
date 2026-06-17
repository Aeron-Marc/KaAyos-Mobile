import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Nearby Map</Text>
      </View>

      <View style={styles.placeholder}>
        <View style={styles.iconCircle}>
          <Ionicons name="map-outline" size={44} color={Colors.icon} />
        </View>
        <Text style={styles.placeholderTitle}>Map Coming Soon</Text>
        <Text style={styles.placeholderDesc}>Interactive map will show nearby service providers in your area</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  placeholder: { marginHorizontal: 20, borderRadius: 20, padding: 40, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', flex: 1, marginBottom: 40, gap: 12 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  placeholderDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
