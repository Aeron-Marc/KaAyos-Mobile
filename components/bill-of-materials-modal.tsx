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

export interface MaterialItem {
  id?: number;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface BillOfMaterialsModalProps {
  visible: boolean;
  bookingId: number;
  existingMaterials?: MaterialItem[];
  isWorker: boolean;
  onClose: () => void;
  onSaveMaterials: (materials: MaterialItem[]) => Promise<void>;
}

export function BillOfMaterialsModal({
  visible,
  bookingId,
  existingMaterials = [],
  isWorker,
  onClose,
  onSaveMaterials,
}: BillOfMaterialsModalProps) {
  const [items, setItems] = useState<MaterialItem[]>(existingMaterials);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    if (!itemName.trim() || !unitCost) return;
    const q = parseFloat(quantity) || 1;
    const cost = parseFloat(unitCost) || 0;
    const newItem: MaterialItem = {
      item_name: itemName.trim(),
      quantity: q,
      unit: unit.trim() || 'pcs',
      unit_cost: cost,
      total_cost: q * cost,
    };
    setItems([...items, newItem]);
    setItemName('');
    setQuantity('1');
    setUnitCost('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalMaterials = items.reduce((sum, item) => sum + item.total_cost, 0);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSaveMaterials(items);
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
              <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
              <Text style={styles.title}>Bill of Materials (BOM)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 12 }}>
              Track hardware, supplies, or replacement parts purchased for Booking #{bookingId}.
            </Text>

            {/* List Existing Items */}
            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>No materials added yet.</Text>
              </View>
            ) : (
              <View style={styles.listCard}>
                {items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.item_name}</Text>
                      <Text style={styles.itemMeta}>
                        {item.quantity} {item.unit} × ₱{item.unit_cost.toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>₱{item.total_cost.toLocaleString()}</Text>
                    {isWorker && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ marginLeft: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Materials Cost:</Text>
                  <Text style={styles.totalValue}>₱{totalMaterials.toLocaleString()}</Text>
                </View>
              </View>
            )}

            {/* Add Item Form (Visible to worker) */}
            {isWorker && (
              <View style={styles.addForm}>
                <Text style={styles.sectionLabel}>Add Part or Material</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Item Name (e.g. PVC Elbow 1/2 in)"
                  placeholderTextColor={Colors.textMuted}
                  value={itemName}
                  onChangeText={setItemName}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Qty"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Unit (pcs/m)"
                    placeholderTextColor={Colors.textMuted}
                    value={unit}
                    onChangeText={setUnit}
                  />
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Unit Price (₱)"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={unitCost}
                    onChangeText={setUnitCost}
                  />
                </View>
                <TouchableOpacity onPress={addItem} style={styles.addBtn}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            )}

            {isWorker && items.length > 0 && (
              <PressableScale style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Bill of Materials</Text>
                )}
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
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyCard: { padding: 24, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginVertical: 8 },
  listCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  addForm: { marginTop: 12, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: Colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0284c7', borderRadius: 8, paddingVertical: 8, marginTop: 8 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

