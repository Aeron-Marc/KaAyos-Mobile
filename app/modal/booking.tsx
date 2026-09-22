import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, View, Text, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useToast } from '@/components/toast';
import { PressableScale } from '@/components/pressable-scale';
import { useAuth } from '@/lib/AuthContext';
import * as api from '@/lib/api';
import type { WorkerDetail } from '@/lib/api';

const TUY_BARANGAYS = [
  'Acle', 'Bayudbud', 'Bolbok', 'Dalima', 'Dao', 'Guinhawa',
  'Lumbangan', 'Luntal', 'Magahis', 'Malaruhatan', 'Mataywanac',
  'Palincaro', 'Pinagbayanan', 'Poblacion 1', 'Poblacion 2',
  'Poblacion 3', 'Poblacion 4', 'Rillo', 'Sabang', 'San Jose',
  'San Nicolas', 'Toong', 'Tuyon-Tuyon'
];

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
  const params = useLocalSearchParams<{ id: string; category?: string; service?: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState('Poblacion 1');
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [houseNo, setHouseNo] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [pricingType, setPricingType] = useState<'fixed' | 'hourly'>('fixed');
  const [complexity, setComplexity] = useState<'standard' | 'moderate' | 'complex'>('standard');
  const [notes, setNotes] = useState('');

  // Calendar & Time
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

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
    if (!params.id) return;
    api.getWorkerDetail(Number(params.id))
      .then(w => {
        setWorker(w);
        if (params.service) {
          setSelectedService(params.service);
        } else if (w.services && w.services.length > 0) {
          setSelectedService(w.services[0].name);
        } else {
          setSelectedService(w.category || 'General Service');
        }
      })
      .catch(e => console.error('Failed to load worker', e))
      .finally(() => setLoading(false));
  }, [params.id, params.service]);

  // Price Calculation
  const estimatedPrice = useMemo(() => {
    if (!worker) return 0;
    let base = 0;
    const workerHourly = Number(worker.hourly_rate) > 0 ? Number(worker.hourly_rate) : 350;
    if (pricingType === 'hourly') {
      base = workerHourly * 2; // 2 hours default
    } else {
      const svc = worker.services?.find(s => s.name === selectedService);
      base = Number(svc?.custom_price) || Number(svc?.base_price) || workerHourly || 400;
    }
    const mult = complexity === 'moderate' ? 1.2 : complexity === 'complex' ? 1.5 : 1.0;
    return Math.max(300, Math.round(base * mult));
  }, [worker, pricingType, selectedService, complexity]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
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

  const handleConfirm = async () => {
    if (!selectedDay) {
      showToast('Please select a booking date', 'error');
      return;
    }
    if (!streetAddress.trim()) {
      showToast('Please enter your house/street address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let hour = selectedHour % 12;
      if (selectedPeriod === 'PM') hour += 12;
      const scheduled = new Date(calYear, calMonth, selectedDay, hour, parseInt(selectedMinute, 10), 0, 0);

      const fullAddress = `${houseNo ? houseNo + ', ' : ''}${streetAddress.trim()}, ${selectedBarangay}, Tuy, Batangas`;

      const res = await api.createBooking({
        worker_id: worker.id,
        service_category: selectedService || worker.category || 'General',
        scheduled_at: scheduled.toISOString(),
        address: fullAddress,
        house_no: houseNo.trim(),
        barangay: selectedBarangay,
        notes: notes.trim(),
        price: estimatedPrice,
        property_type: propertyType,
        pricing_type: pricingType,
        estimated_duration_hours: 2.0,
        complexity_level: complexity,
      });

      showToast(`Booking ${res.bookingRef || 'created'} successfully!`, 'success');
      setTimeout(() => router.replace('/(tabs)/bookings' as any), 900);
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Worker Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{worker.first_name?.[0]}{worker.last_name?.[0]}</Text>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.serviceLabel}>{worker.category || 'Service Provider'}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.star} />
              <Text style={styles.ratingText}>{worker.rating || 0} rating</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.tuyBadge}>Tuy, Batangas</Text>
            </View>
          </View>
        </View>

        {/* Service Selection */}
        {worker.services && worker.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Service</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {worker.services.map(svc => {
                const active = selectedService === svc.name;
                return (
                  <TouchableOpacity
                    key={svc.id}
                    onPress={() => setSelectedService(svc.name)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{svc.name}</Text>
                    {(svc.custom_price || svc.base_price) && (
                      <Text style={[styles.chipPrice, active && styles.chipPriceActive]}>
                        ₱{svc.custom_price || svc.base_price}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Date Selection */}
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

        {/* Time Selection */}
        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {HOURS.map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setSelectedHour(h)}
                style={[styles.timeBtn, selectedHour === h && styles.timeBtnActive]}
              >
                <Text style={[styles.timeBtnText, selectedHour === h && styles.timeBtnTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.timeSubRow}>
            <View style={styles.toggleGroup}>
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMinute(m)}
                  style={[styles.toggleBtn, selectedMinute === m && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, selectedMinute === m && styles.toggleTextActive]}>:{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleGroup}>
              {PERIODS.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setSelectedPeriod(p)}
                  style={[styles.toggleBtn, selectedPeriod === p && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, selectedPeriod === p && styles.toggleTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Location / Tuy Barangay */}
        <Text style={styles.sectionTitle}>Service Location in Tuy</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Barangay (Tuy, Batangas)</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowBarangayModal(true)}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.selectBtnText}>{selectedBarangay}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>House / Building No.</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Unit 4, Blk 2 Lot 15"
            placeholderTextColor={Colors.textMuted}
            value={houseNo}
            onChangeText={setHouseNo}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Street / Sitio / Landmark *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Calle Real, near Barangay Hall"
            placeholderTextColor={Colors.textMuted}
            value={streetAddress}
            onChangeText={setStreetAddress}
          />
        </View>

        {/* Property & Complexity Options */}
        <Text style={styles.sectionTitle}>Job Specification</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Property Type</Text>
          <View style={styles.specRow}>
            {(['residential', 'commercial'] as const).map(pt => (
              <TouchableOpacity
                key={pt}
                onPress={() => setPropertyType(pt)}
                style={[styles.specBtn, propertyType === pt && styles.specBtnActive]}
              >
                <Ionicons name={pt === 'residential' ? 'home-outline' : 'business-outline'} size={16} color={propertyType === pt ? '#fff' : Colors.text} />
                <Text style={[styles.specBtnText, propertyType === pt && styles.specBtnTextActive]}>
                  {pt === 'residential' ? 'Residential' : 'Commercial'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Pricing Model</Text>
          <View style={styles.specRow}>
            {(['fixed', 'hourly'] as const).map(pm => (
              <TouchableOpacity
                key={pm}
                onPress={() => setPricingType(pm)}
                style={[styles.specBtn, pricingType === pm && styles.specBtnActive]}
              >
                <Text style={[styles.specBtnText, pricingType === pm && styles.specBtnTextActive]}>
                  {pm === 'fixed' ? 'Fixed Scope' : 'Hourly Rate'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Problem Notes / Details</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Describe the issue or required work in detail..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Pricing Summary */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceValue}>₱{estimatedPrice.toLocaleString()}</Text>
          </View>
          <Text style={styles.paymentNotice}>
            Payment method: <Text style={{ fontWeight: '700' }}>Cash on Service</Text> upon job completion and dual verification.
          </Text>
        </View>

        <PressableScale
          style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Request Booking</Text>
          )}
        </PressableScale>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Barangay Picker Modal */}
      <Modal visible={showBarangayModal} transparent animationType="slide" onRequestClose={() => setShowBarangayModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBarangayModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tuy Barangay</Text>
              <TouchableOpacity onPress={() => setShowBarangayModal(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TUY_BARANGAYS}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const isSelected = selectedBarangay === item;
                return (
                  <TouchableOpacity
                    style={[styles.barangayItem, isSelected && styles.barangayItemActive]}
                    onPress={() => {
                      setSelectedBarangay(item);
                      setShowBarangayModal(false);
                    }}
                  >
                    <Text style={[styles.barangayText, isSelected && styles.barangayTextActive]}>{item}</Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 380 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.error },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  summaryCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 18, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  summaryInfo: { flex: 1 },
  workerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  dot: { fontSize: 10, color: Colors.textMuted },
  tuyBadge: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, marginTop: 8 },
  chipsRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#fff' },
  chipPrice: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chipPriceActive: { color: '#e0f2fe' },
  calendarCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calArrow: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  calArrowDisabled: { opacity: 0.3 },
  calTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  calDayNames: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calDayName: { width: 34, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  calWeek: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  calCell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  calCellDisabled: { opacity: 0.25 },
  calDayInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calDaySelected: { backgroundColor: Colors.primary },
  calDay: { fontSize: 13, fontWeight: '500', color: Colors.text },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  calDayDisabled: { color: Colors.textMuted },
  timeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  timeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  timeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  timeBtnTextActive: { color: '#fff' },
  timeSubRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  toggleGroup: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  formCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12 },
  selectBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text, marginLeft: 8 },
  textInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text },
  specRow: { flexDirection: 'row', gap: 10 },
  specBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  specBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  specBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  specBtnTextActive: { color: '#fff' },
  priceCard: { backgroundColor: Colors.primaryLight, padding: 16, borderRadius: 16, marginBottom: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priceLabel: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  priceValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  paymentNotice: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  confirmBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  barangayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  barangayItemActive: { backgroundColor: Colors.primaryLight, marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 8 },
  barangayText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  barangayTextActive: { color: Colors.primary, fontWeight: '700' },
});
