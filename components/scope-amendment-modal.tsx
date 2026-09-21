import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

interface ScopeAmendmentModalProps {
  visible: boolean;
  currentPrice: number;
  onClose: () => void;
  onSubmit: (additionalPrice: number, notes: string) => Promise<void>;
}

export function ScopeAmendmentModal({
  visible,
  currentPrice,
  onClose,
  onSubmit,
}: ScopeAmendmentModalProps) {
  const [additionalPrice, setAdditionalPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addNum = parseFloat(additionalPrice) || 0;
  const newTotal = currentPrice + addNum;

  const handleSubmit = async () => {
    if (!notes.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(addNum, notes.trim());
      setAdditionalPrice('');
      setNotes('');
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

          <Text style={styles.title}>Adjust Price & Scope</Text>
          <Text style={styles.subtitle}>
            Propose a price adjustment for extra parts, materials, or unforeseen repairs on-site.
          </Text>

          {/* Current & New Price Card */}
          <View style={styles.summaryCard}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>Current Price</Text>
              <Text style={styles.priceVal}>₱{currentPrice.toLocaleString()}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Colors.textMuted} />
            <View style={styles.priceColumn}>
              <Text style={styles.priceLabel}>New Total</Text>
              <Text style={[styles.priceVal, { color: Colors.primary }]}>
                ₱{newTotal.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Additional Amount Field */}
          <Text style={styles.inputLabel}>Additional Amount (₱)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 250"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={additionalPrice}
            onChangeText={setAdditionalPrice}
          />

          {/* Reason / Scope Explanation */}
          <Text style={styles.inputLabel}>Reason / Materials Used *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Explain why extra cost is needed (e.g. Replacement PVC fitting & sealant bought at Tuy hardware)..."
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <PressableScale
              style={[styles.submitBtn, !notes.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !notes.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit to Client</Text>
                </>
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  priceColumn: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 75,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

