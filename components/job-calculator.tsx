import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

interface JobCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyEstimate?: (estimatedPrice: number, estimatedHours: number) => void;
}

const COMMON_TASKS = [
  { trade: 'Plumbing', name: 'Faucet / Pipe Leak Repair', base: 450, hours: 1.5 },
  { trade: 'Plumbing', name: 'Toilet / Drain Declogging', base: 650, hours: 2.0 },
  { trade: 'Electrical', name: 'Outlet / Switch Installation', base: 350, hours: 1.0 },
  { trade: 'Electrical', name: 'Full Breaker / Rewiring Check', base: 850, hours: 3.5 },
  { trade: 'Carpentry', name: 'Door / Lockset Repair', base: 500, hours: 2.0 },
  { trade: 'Carpentry', name: 'Custom Cabinet / Shelf Assembly', base: 1200, hours: 5.0 },
  { trade: 'Aircon', name: 'Split / Window AC Deep Cleaning', base: 600, hours: 2.0 },
  { trade: 'Cleaning', name: 'General Home Deep Cleaning', base: 700, hours: 4.0 },
];

export function JobCalculatorModal({ visible, onClose, onApplyEstimate }: JobCalculatorModalProps) {
  const [selectedTask, setSelectedTask] = useState(COMMON_TASKS[0]);
  const [complexity, setComplexity] = useState<'standard' | 'moderate' | 'complex'>('standard');
  const [materialEstimate, setMaterialEstimate] = useState('');

  const complexityMultiplier = complexity === 'complex' ? 1.5 : (complexity === 'moderate' ? 1.2 : 1.0);
  const baseLabor = selectedTask.base * complexityMultiplier;
  const estimatedHours = selectedTask.hours * complexityMultiplier;
  const materialsCost = parseFloat(materialEstimate) || 0;

  const lowEstimate = Math.round((baseLabor * 0.9) + materialsCost);
  const highEstimate = Math.round((baseLabor * 1.15) + materialsCost);
  const averagePrice = Math.round((lowEstimate + highEstimate) / 2);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calculator-outline" size={24} color={Colors.primary} />
              <Text style={styles.title}>Job Cost & Duration Estimator</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Task Selector */}
            <Text style={styles.sectionLabel}>Select Common Task</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {COMMON_TASKS.map((task, idx) => {
                  const active = selectedTask.name === task.name;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedTask(task)}
                      style={[styles.taskChip, active && styles.taskChipActive]}
                    >
                      <Text style={[styles.taskChipText, active && styles.taskChipTextActive]}>
                        {task.trade}: {task.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Complexity Multiplier */}
            <Text style={styles.sectionLabel}>Job Scope Complexity</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {(['standard', 'moderate', 'complex'] as const).map(lvl => {
                const active = complexity === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => setComplexity(lvl)}
                    style={[styles.lvlBtn, active && styles.lvlBtnActive]}
                  >
                    <Text style={[styles.lvlBtnText, active && styles.lvlBtnTextActive]}>
                      {lvl === 'standard' ? 'Standard (1.0x)' : (lvl === 'moderate' ? 'Moderate (1.2x)' : 'Complex (1.5x)')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Materials Estimate */}
            <Text style={styles.sectionLabel}>Estimated Materials / Parts Cost (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 350 (pipes, fittings, wire)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={materialEstimate}
              onChangeText={setMaterialEstimate}
            />

            {/* Calculation Result Breakdown */}
            <View style={styles.resultCard}>
              <Text style={styles.resultHeading}>Estimated Calculation</Text>
              
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Estimated Duration:</Text>
                <Text style={styles.rowVal}>~{estimatedHours.toFixed(1)} Hours</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Labor Allowance:</Text>
                <Text style={styles.rowVal}>₱{Math.round(baseLabor).toLocaleString()}</Text>
              </View>

              {materialsCost > 0 && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Materials Allowance:</Text>
                  <Text style={styles.rowVal}>₱{materialsCost.toLocaleString()}</Text>
                </View>
              )}

              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.rowLabel, { fontWeight: '700', color: Colors.primary }]}>Estimated Range:</Text>
                <Text style={[styles.rowVal, { fontWeight: '700', color: Colors.primary, fontSize: 16 }]}>
                  ₱{lowEstimate.toLocaleString()} – ₱{highEstimate.toLocaleString()}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' }}>
                Note: Final rates are agreed directly with the worker on-site with zero platform deductions.
              </Text>
            </View>

            {onApplyEstimate && (
              <PressableScale
                style={styles.applyBtn}
                onPress={() => {
                  onApplyEstimate(averagePrice, estimatedHours);
                  onClose();
                }}
              >
                <Text style={styles.applyBtnText}>Apply Estimate to Booking</Text>
              </PressableScale>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 10, textTransform: 'uppercase' },
  taskChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  taskChipText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  taskChipTextActive: { color: Colors.primary, fontWeight: '700' },
  lvlBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  lvlBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  lvlBtnText: { fontSize: 11, color: Colors.text, fontWeight: '600' },
  lvlBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 6,
    color: Colors.text,
  },
  resultCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14,
  },
  resultHeading: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  rowLabel: { fontSize: 12, color: Colors.textSecondary },
  rowVal: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

