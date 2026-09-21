import { useState, useMemo } from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '30'];
const PERIODS = ['AM', 'PM'];

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

interface RescheduleModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'request' | 'respond';
  bookingId: number;
  proposedDate?: string | null;
  proposedReason?: string | null;
  onRequestSubmit: (proposedAt: string, reason: string) => Promise<void>;
  onRespondSubmit: (action: 'approve' | 'decline') => Promise<void>;
}

export function RescheduleModal({
  visible,
  onClose,
  mode,
  proposedDate,
  proposedReason,
  onRequestSubmit,
  onRespondSubmit,
}: RescheduleModalProps) {
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitRequest = async () => {
    if (!selectedDay) return;
    setSubmitting(true);
    try {
      let h24 = selectedHour % 12;
      if (selectedPeriod === 'PM') h24 += 12;
      const scheduledDate = new Date(calYear, calMonth, selectedDay, h24, parseInt(selectedMinute), 0);
      const isoStr = scheduledDate.toISOString();
      await onRequestSubmit(isoStr, reason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (action: 'approve' | 'decline') => {
    setSubmitting(true);
    try {
      await onRespondSubmit(action);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {mode === 'request' ? 'Request Reschedule' : 'Reschedule Proposal'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'request'
                  ? 'Propose a new date and time for this service'
                  : 'The other party requested to change the schedule'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {mode === 'respond' ? (
            <View style={styles.respondContent}>
              <View style={styles.proposedCard}>
                <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.proposedLabel}>Proposed New Schedule</Text>
                  <Text style={styles.proposedValue}>
                    {proposedDate ? new Date(proposedDate).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    }) : 'N/A'}
                  </Text>
                  {proposedReason ? (
                    <Text style={styles.proposedReason}>Reason: "{proposedReason}"</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.actionRow}>
                <PressableScale
                  style={[styles.btn, styles.declineBtn]}
                  onPress={() => handleRespond('decline')}
                  disabled={submitting}
                >
                  <Text style={styles.declineText}>Decline</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleRespond('approve')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.approveText}>Accept Reschedule</Text>
                  )}
                </PressableScale>
              </View>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <View style={styles.calNav}>
                <TouchableOpacity onPress={goPrev} disabled={!canGoPrev} style={[styles.calNavBtn, !canGoPrev && { opacity: 0.3 }]}>
                  <Ionicons name="chevron-back" size={18} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.calNavTitle}>{MONTHS[calMonth]} {calYear}</Text>
                <TouchableOpacity onPress={goNext} style={styles.calNavBtn}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekHeader}>
                {DAY_NAMES.map(d => (
                  <Text key={d} style={styles.dayColHeader}>{d}</Text>
                ))}
              </View>

              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.dayCell} />;
                    const selected = selectedDay === day;
                    return (
                      <TouchableOpacity
                        key={di}
                        onPress={() => setSelectedDay(day)}
                        style={[styles.dayCell, selected && styles.dayCellSelected]}
                      >
                        <Text style={[styles.dayCellText, selected && styles.dayCellTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <Text style={styles.sectionLabel}>Select Time</Text>
              <View style={styles.timeRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
                  {HOURS.map(h => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setSelectedHour(h)}
                      style={[styles.timeChip, selectedHour === h && styles.timeChipSelected]}
                    >
                      <Text style={[styles.timeChipText, selectedHour === h && styles.timeChipTextSelected]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.subTimeRow}>
                <View style={styles.segmentedGroup}>
                  {MINUTES.map(m => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setSelectedMinute(m)}
                      style={[styles.segBtn, selectedMinute === m && styles.segBtnSelected]}
                    >
                      <Text style={[styles.segText, selectedMinute === m && styles.segTextSelected]}>:{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.segmentedGroup}>
                  {PERIODS.map(p => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedPeriod(p)}
                      style={[styles.segBtn, selectedPeriod === p && styles.segBtnSelected]}
                    >
                      <Text style={[styles.segText, selectedPeriod === p && styles.segTextSelected]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionLabel}>Reason for Rescheduling (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Heavy rain in Tuy, emergency errand..."
                placeholderTextColor={Colors.textMuted}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />

              <PressableScale
                style={styles.submitBtn}
                onPress={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Reschedule Request</Text>
                )}
              </PressableScale>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  respondContent: { paddingVertical: 10 },
  proposedCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.primaryLight, padding: 16, borderRadius: 14, marginBottom: 20 },
  proposedLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase' },
  proposedValue: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 4 },
  proposedReason: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  declineText: { fontSize: 14, fontWeight: '600', color: Colors.error },
  approveBtn: { backgroundColor: Colors.primary },
  approveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calNavBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  calNavTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  dayColHeader: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  dayCell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: Colors.primary },
  dayCellText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  dayCellTextSelected: { color: '#fff', fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 14, marginBottom: 8 },
  timeRow: { marginBottom: 10 },
  timeScroll: { gap: 6, paddingVertical: 4 },
  timeChip: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  timeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  timeChipTextSelected: { color: '#fff' },
  subTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  segmentedGroup: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: Colors.border },
  segBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  segBtnSelected: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 70, marginBottom: 16 },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

