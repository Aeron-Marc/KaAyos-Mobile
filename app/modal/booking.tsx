import { useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { workers } from '@/constants/data';
import { useToast } from '@/components/toast';
import { PressableScale } from '@/components/pressable-scale';

const dates = ['Today', 'Tomorrow', 'Oct 26'];
const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

export default function BookingModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worker = workers.find(w => w.id === id);
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  if (!worker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Worker not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleConfirm = () => {
    showToast(`Booked ${worker.name} for ${selectedDate} at ${selectedTime}`, 'success');
    setTimeout(() => router.back(), 1000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Book Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Ionicons name="person-circle-outline" size={48} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.serviceLabel}>{worker.category}</Text>
            <Text style={styles.price}>₱{worker.price}/hr</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Date</Text>
        <View style={styles.optionsRow}>
          {dates.map((date) => (
            <PressableScale
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[styles.option, selectedDate === date && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selectedDate === date && styles.optionTextSelected]}>{date}</Text>
            </PressableScale>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.optionsGrid}>
          {times.map((time) => (
            <PressableScale
              key={time}
              onPress={() => setSelectedTime(time)}
              style={[styles.option, selectedTime === time && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selectedTime === time && styles.optionTextSelected]}>{time}</Text>
            </PressableScale>
          ))}
        </View>

        <PressableScale haptics onPress={handleConfirm} style={styles.confirmBtn}>
          <Text style={styles.confirmText}>Confirm Booking</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 24, marginTop: 8,
  },
  summaryInfo: { flex: 1 },
  workerName: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  serviceLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 2 },
  price: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  optionsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  option: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  optionTextSelected: { color: '#fff' },
  confirmBtn: {
    borderRadius: 12, paddingVertical: 16, backgroundColor: Colors.primary,
    alignItems: 'center', marginTop: 8,
  },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
