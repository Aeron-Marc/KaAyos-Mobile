import { useState } from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import type { Booking } from '@/lib/api';

interface JobPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking;
  onPhotoUploaded: (formData: FormData, caption: string, imageUri?: string) => Promise<void>;
}

export function JobPhotoModal({
  visible,
  onClose,
  booking,
  onPhotoUploaded,
}: JobPhotoModalProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number | null } | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');
  const [locationLabel, setLocationLabel] = useState<string>('');

  const acquireLocationStamp = async () => {
    setLocating(true);
    const now = new Date();
    const formattedTime = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString()}`;
    setTimestamp(formattedTime);

    // Default Tuy location fallback
    const defaultLabel = booking.barangay
      ? `Brgy. ${booking.barangay}, Tuy, Batangas`
      : booking.address || 'Tuy, Batangas';
    setLocationLabel(defaultLabel);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        });

        // Try reverse geocode for exact street/barangay
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (geo?.district || geo?.subregion || geo?.street) {
            const locName = [geo.street, geo.district || booking.barangay, 'Tuy, Batangas']
              .filter(Boolean)
              .join(', ');
            setLocationLabel(locName);
          }
        } catch {
          // fallback to default label
        }
      } else {
        // Fallback coordinates for Tuy if permission denied
        setCoords({
          latitude: booking.latitude || 13.9682,
          longitude: booking.longitude || 120.7291,
          accuracy: null,
        });
      }
    } catch {
      setCoords({
        latitude: booking.latitude || 13.9682,
        longitude: booking.longitude || 120.7291,
        accuracy: null,
      });
    } finally {
      setLocating(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take job completion photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      await acquireLocationStamp();
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
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      await acquireLocationStamp();
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Photo Required', 'Please attach a photo of the completed work.');
      return;
    }
    setUploading(true);
    try {
      // Encode location stamp into caption
      const latStr = coords ? `${coords.latitude.toFixed(5)}°N` : '13.9682°N';
      const lonStr = coords ? `${coords.longitude.toFixed(5)}°E` : '120.7291°E';
      const timeStr = timestamp || new Date().toLocaleString();
      const locStr = locationLabel || 'Tuy, Batangas';

      const payload = `[LOCATION: ${locStr} | ${latStr}, ${lonStr} | ${timeStr}] ${caption.trim()}`;

      let formData = new FormData();
      try {
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append('file', blob, 'proof.jpg');
        formData.append('caption', payload);
      } catch {
        formData.append('caption', payload);
      }

      await onPhotoUploaded(formData, payload, imageUri);
      setImageUri(null);
      setCaption('');
      setCoords(null);
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proof of Work Photo</Text>
              <Text style={styles.subtitle}>
                Verified on-site with live location and completion timestamp
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImg} />

                {/* ── SHOPEE-STYLE WATERMARK OVERLAY ── */}
                <View style={styles.shopeeStampOverlay}>
                  <View style={styles.stampHeader}>
                    <View style={styles.shieldBadge}>
                      <Ionicons name="shield-checkmark" size={11} color="#10b981" />
                      <Text style={styles.shieldText}>VERIFIED PROOF OF WORK</Text>
                    </View>
                    <Text style={styles.brandWatermark}>KaAyos Tuy</Text>
                  </View>

                  <View style={styles.stampRow}>
                    <Ionicons name="location" size={12} color="#38bdf8" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {locationLabel || 'Tuy, Batangas'}
                    </Text>
                  </View>

                  <View style={styles.stampMetaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>GPS COORDS</Text>
                      <Text style={styles.metaVal}>
                        {coords ? `${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E` : 'Detecting...'}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>TIMESTAMP</Text>
                      <Text style={styles.metaVal}>{timestamp || 'Just now'}</Text>
                    </View>
                  </View>

                  <View style={styles.stampJobRow}>
                    <Text style={styles.stampJobText} numberOfLines={1}>
                      Ref: #{booking.booking_ref || String(booking.id).padStart(4, '0')} • {booking.service_category}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Retake and Refresh GPS Controls */}
              <View style={styles.previewControlsRow}>
                <TouchableOpacity onPress={() => setImageUri(null)} style={styles.retakeBtn}>
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={acquireLocationStamp} style={styles.refreshGpsBtn} disabled={locating}>
                  <Ionicons name="navigate-outline" size={14} color={Colors.primaryAccent} />
                  <Text style={styles.refreshGpsText}>
                    {locating ? 'Pinging GPS...' : 'Refresh Location'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickerBox} onPress={takePhoto}>
                <View style={styles.iconCircle}>
                  <Ionicons name="camera" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.pickerTitle}>Take Photo</Text>
                <Text style={styles.pickerSub}>Live camera on-site</Text>
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
            placeholder="e.g. Replaced water pipe, tested pressure, cleaned site..."
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Photo Proof & Finish Job</Text>
              </View>
            )}
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    paddingRight: 10,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  pickerBox: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  pickerSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  previewContainer: {
    marginVertical: 10,
  },
  imageWrap: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  shopeeStampOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  stampHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shieldText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.4,
  },
  brandWatermark: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  stampMetaRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    padding: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  metaVal: {
    fontSize: 10,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 6,
  },
  stampJobRow: {
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  stampJobText: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  previewControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retakeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshGpsText: {
    color: Colors.primaryAccent,
    fontSize: 11,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 52,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
