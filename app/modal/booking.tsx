import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useToast } from '@/components/toast';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';
import * as api from '@/lib/api';
import type { WorkerDetail } from '@/lib/api';

function getWeeks(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function isPastDate(year: number, month: number, day: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(year, month, day);
  return date < today;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '30'];
const PERIODS = ['AM', 'PM'];

export default function BookingModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [address, setAddress] = useState('');

  const weeks = useMemo(() => getWeeks(calYear, calMonth), [calYear, calMonth]);

  const canGoPrev = calYear > today.getFullYear() || (calYear === today.getFullYear() && calMonth > today.getMonth());

  const goPrev = () => {
    if (!canGoPrev) return;
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const goNext = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  useEffect(() => {
    if (!id) return;
    api.getWorkerDetail(Number(id))
      .then(setWorker)
      .catch(e => console.error('Failed to load worker', e))
      .finally(() => setLoading(false));
  }, [id]);

  const selectHour = (h: number) => { setSelectedHour(h); };
  const selectMinute = (m: string) => { setSelectedMinute(m); };
  const selectPeriod = (p: string) => { setSelectedPeriod(p); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!worker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Worker not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>You must be logged in to book a service.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validPrices = (worker.services ?? [])
    .map(s => s.custom_price || s.base_price)
    .filter((p): p is number => p !== null && p !== undefined);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const canSubmit = selectedDay !== null && address.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSubmit || submitting || selectedDay === null) return;
    setSubmitting(true);
    try {
      let hour = selectedHour;
      if (selectedPeriod === 'PM' && hour < 12) hour += 12;
      if (selectedPeriod === 'AM' && hour === 12) hour = 0;

      const scheduled = new Date(calYear, calMonth, selectedDay, hour, parseInt(selectedMinute, 10), 0, 0);

      await api.createBooking({
        client_id: user.id,
        worker_id: worker.id,
        service_category: worker.service_category || 'General',
        scheduled_at: scheduled.toISOString(),
        address: address.trim(),
        notes: '',
      });
      showToast('Booking created successfully!', 'success');
      setTimeout(() => router.back(), 1000);
    } catch (e: any) {
      showToast(e.message || 'Failed to create booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
            <Text style={styles.serviceLabel}>{worker.service_category || 'Service Provider'}</Text>
            <Text style={styles.price}>PHP {lowestPrice?.toLocaleString() ?? '?'}/hr</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Date</Text>
        <View style={styles.calendarCard}>
          <View style={styles.calHeader}>
            <PressableScale onPress={goPrev} style={[styles.calArrow, !canGoPrev && styles.calArrowDisabled]}>
              <Ionicons name="chevron-back" size={20} color={canGoPrev ? Colors.text : Colors.textMuted} />
            </PressableScale>
            <Text style={styles.calTitle}>{MONTHS[calMonth]} {calYear}</Text>
            <PressableScale onPress={goNext} style={styles.calArrow}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </PressableScale>
          </View>
          <View style={styles.calDayNames}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={styles.calDayName}>{d}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={`w-${wi}`} style={styles.calWeek}>
              {week.map((day, di) => {
                if (day === null) return <View key={`e-${wi}-${di}`} style={styles.calCell} />;
                const past = isPastDate(calYear, calMonth, day);
                const isSelected = day === selectedDay;
                return (
                  <PressableScale
                    key={`d-${day}`}
                    onPress={() => !past && setSelectedDay(day)}
                    style={[styles.calCell, past && styles.calCellDisabled]}
                  >
                    <View style={[styles.calDayInner, isSelected && styles.calDaySelected]}>
                      <Text style={[styles.calDay, isSelected && styles.calDayTextSelected, past && styles.calDayDisabled]}>
                        {day}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeCard}>
          <View style={styles.timeDisplay}>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => selectHour(HOURS[(HOURS.indexOf(selectedHour) + 1) % HOURS.length])} style={styles.timeArrow}>
                <Ionicons name="chevron-up" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(selectedHour).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => selectHour(HOURS[(HOURS.indexOf(selectedHour) - 1 + HOURS.length) % HOURS.length])} style={styles.timeArrow}>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => selectMinute(selectedMinute === '00' ? '30' : '00')} style={styles.timeArrow}>
                <Ionicons name="chevron-up" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{selectedMinute}</Text>
              <TouchableOpacity onPress={() => selectMinute(selectedMinute === '00' ? '30' : '00')} style={styles.timeArrow}>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => selectPeriod(selectedPeriod === 'AM' ? 'PM' : 'AM')} style={styles.timeArrow}>
                <Ionicons name="chevron-up" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeAmPm}>
                <Text style={styles.timeAmPmText}>{selectedPeriod}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selectPeriod(selectedPeriod === 'AM' ? 'PM' : 'AM')} style={styles.timeArrow}>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Service Address</Text>
        <TextInput
          style={styles.addressInput}
          placeholder="Enter your address"
          placeholderTextColor={Colors.textSecondary}
          value={address}
          onChangeText={setAddress}
          multiline
        />

        <PressableScale
          haptics
          onPress={handleConfirm}
          disabled={!canSubmit || submitting}
          style={[styles.confirmBtn, (!canSubmit || submitting) && styles.confirmBtnDisabled]}
        >
          <Text style={styles.confirmText}>
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, elevation: 0 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
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

  calendarCard: {
    borderRadius: 16, padding: 16, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calArrow: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calArrowDisabled: { opacity: 0.3 },
  calTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  calDayNames: { flexDirection: 'row', marginBottom: 6 },
  calDayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  calWeek: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  calCellDisabled: { opacity: 0.3 },
  calDayInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  calDaySelected: { backgroundColor: Colors.primary },
  calDay: { fontSize: 14, fontWeight: '500', color: Colors.text },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  calDayDisabled: { color: Colors.textMuted },

  timeCard: {
    borderRadius: 16, padding: 16, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 24, alignItems: 'center',
  },
  timeDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  timeCol: { alignItems: 'center', gap: 2 },
  timeArrow: { paddingHorizontal: 12, paddingVertical: 4 },
  timeArrowText: { fontSize: 12, color: Colors.textMuted },
  timeDigit: { fontSize: 28, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'], paddingHorizontal: 8 },
  timeColon: { fontSize: 28, fontWeight: '700', color: Colors.textMuted, marginBottom: 20 },
  timeAmPm: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: 8,
  },
  timeAmPmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  addressInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.text, backgroundColor: Colors.surface,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 24,
  },
  confirmBtn: { borderRadius: 12, paddingVertical: 16, backgroundColor: Colors.primary, alignItems: 'center', marginTop: 8 },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
