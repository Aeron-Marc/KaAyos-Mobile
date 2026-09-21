import { useState } from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

interface JobPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: number;
  onPhotoUploaded: (formData: FormData, caption: string) => Promise<void>;
}

export function JobPhotoModal({
  visible,
  onClose,
  bookingId,
  onPhotoUploaded,
}: JobPhotoModalProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take job completion photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is required to upload work photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Photo Required', 'Please attach a photo of the completed work.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'job-completion.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: imageUri, name: filename, type } as any);
      formData.append('caption', caption);

      await onPhotoUploaded(formData, caption);
      setImageUri(null);
      setCaption('');
      onClose();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload job photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proof of Work Photo</Text>
              <Text style={styles.subtitle}>Upload a photo of the completed work for client verification</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImg} />
              <TouchableOpacity onPress={() => setImageUri(null)} style={styles.retakeBtn}>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.retakeText}>Remove & Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickerBox} onPress={takePhoto}>
                <View style={styles.iconCircle}>
                  <Ionicons name="camera" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.pickerTitle}>Take Photo</Text>
                <Text style={styles.pickerSub}>Use camera on-site</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerBox} onPress={pickImage}>
                <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="images" size={26} color="#16a34a" />
                </View>
                <Text style={styles.pickerTitle}>Photo Library</Text>
                <Text style={styles.pickerSub}>Select from device</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Notes / Remarks (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Replaced leaking valve, tested pressure..."
            placeholderTextColor={Colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={2}
          />

          <PressableScale
            style={[styles.submitBtn, (!imageUri || uploading) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={!imageUri || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Upload & Mark Job Complete</Text>
            )}
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, paddingRight: 10 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  pickRow: { flexDirection: 'row', gap: 12, marginVertical: 14 },
  pickerBox: { flex: 1, padding: 18, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 6 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  pickerSub: { fontSize: 11, color: Colors.textMuted },
  previewContainer: { marginVertical: 12, alignItems: 'center' },
  previewImg: { width: '100%', height: 180, borderRadius: 14, backgroundColor: Colors.surface },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: -18 },
  retakeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 60, marginBottom: 16 },
  submitBtn: { backgroundColor: Colors.primary, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

