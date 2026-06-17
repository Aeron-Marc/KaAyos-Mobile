import { useState } from 'react';
import { StyleSheet, ScrollView, TextInput, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';

const serviceOptions = [
  'Pipe Fixing',
  'Water Heater Installation',
  'Drain Unblocking',
  'Leak Detection',
];

export default function ProviderProfileEditScreen() {
  const [selectedServices, setSelectedServices] = useState<string[]>(serviceOptions);
  const { showToast } = useToast();

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <PressableScale style={styles.uploadBtn} onPress={() => showToast('Photo upload coming soon', 'info')}>
            <Ionicons name="camera-outline" size={16} color={Colors.primary} />
            <Text style={styles.uploadText}>Upload Photo</Text>
          </PressableScale>
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              defaultValue="Juan Dela Cruz"
              style={styles.input}
              placeholderTextColor={Colors.icon}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              defaultValue="Plumbing"
              style={styles.input}
              placeholderTextColor={Colors.icon}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>About</Text>
            <TextInput
              multiline
              numberOfLines={4}
              defaultValue="Experienced plumber with over 10 years of service. Fast, reliable, and guarantees high-quality work."
              style={styles.textArea}
              placeholderTextColor={Colors.icon}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Hourly Rate (₱)</Text>
            <TextInput
              keyboardType="numeric"
              defaultValue="450"
              style={styles.input}
              placeholderTextColor={Colors.icon}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Services Offered</Text>
            <View style={styles.servicesList}>
              {serviceOptions.map((service) => (
                <PressableScale
                  key={service}
                  onPress={() => toggleService(service)}
                  style={[styles.serviceItem, selectedServices.includes(service) && styles.serviceItemSelected]}
                >
                  <View style={[styles.checkbox, selectedServices.includes(service) && styles.checkboxSelected]}>
                    {selectedServices.includes(service) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={[styles.serviceLabel, selectedServices.includes(service) && styles.serviceLabelSelected]}>{service}</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        </View>

        <PressableScale haptics style={styles.saveBtn} onPress={() => showToast('Profile saved successfully', 'success')}>
          <Text style={styles.saveText}>Save Changes</Text>
        </PressableScale>
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
  profileHeader: { marginHorizontal: 20, borderRadius: 20, padding: 24, backgroundColor: Colors.surface, alignItems: 'center', marginBottom: 12, gap: 16 },
  avatarLarge: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700', fontFamily: 'monospace' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  uploadText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  formCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  textArea: { borderRadius: 10, padding: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text, minHeight: 100 },
  servicesList: { gap: 8 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14 },
  serviceItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.icon, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  serviceLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  serviceLabelSelected: { color: Colors.primary },
  saveBtn: { marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, backgroundColor: Colors.primary, alignItems: 'center', marginBottom: 8 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
