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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

interface WarrantyRecallModalProps {
  visible: boolean;
  bookingId: number;
  workerName: string;
  onClose: () => void;
  onSubmitRecall: (reason: string) => Promise<void>;
}

export function WarrantyRecallModal({
  visible,
  bookingId,
  workerName,
  onClose,
  onSubmitRecall,
}: WarrantyRecallModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitRecall(reason.trim());
      setReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

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
              <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
              <Text style={styles.title}>Request Warranty Recall (Back-Job)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>7-Day KaAyos Service Warranty Guarantee</Text>
              <Text style={styles.noticeText}>
                If the problem was not fully fixed or recurred within 7 days of service completion, you are entitled to a free re-service by {workerName}.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Describe the issue / defect</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Explain why a service recall is needed (e.g. pipe joint still dripping, outlet has no power)..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
            />

            <PressableScale
              style={[styles.submitBtn, (!reason.trim() || submitting) && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Warranty Claim</Text>
              )}
            </PressableScale>
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
    maxHeight: '80%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  noticeBox: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginVertical: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  noticeText: { fontSize: 12, color: '#1e3a8a', lineHeight: 17 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: Colors.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

