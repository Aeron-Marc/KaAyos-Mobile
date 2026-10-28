import { Modal, StyleSheet, View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface PhotoViewerModalProps {
  visible: boolean;
  onClose: () => void;
  photoUrl: string | null;
  caption?: string | null;
  jobRef?: string | null;
  serviceCategory?: string | null;
  address?: string | null;
  barangay?: string | null;
  createdAt?: string | null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PhotoViewerModal({
  visible,
  onClose,
  photoUrl,
  caption,
  jobRef,
  serviceCategory,
  address,
  barangay,
  createdAt,
}: PhotoViewerModalProps) {
  if (!photoUrl) return null;

  // Parse location stamp from caption if present: [LOCATION: location | coords | timestamp] optional user note
  let parsedLocation = barangay ? `${barangay}, Tuy, Batangas` : address || 'Tuy, Batangas';
  let parsedCoords = '13.9682° N, 120.7291° E';
  let parsedTime = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();
  let userNote = caption || '';

  const tagPrefix = caption?.startsWith('[LOCATION:')
    ? '[LOCATION:'
    : caption?.startsWith('[GEOTAG:')
    ? '[GEOTAG:'
    : null;

  if (caption && tagPrefix) {
    const endIdx = caption.indexOf(']');
    if (endIdx !== -1) {
      const geoContent = caption.slice(tagPrefix.length, endIdx);
      const parts = geoContent.split('|').map(s => s.trim());
      if (parts[0]) parsedLocation = parts[0];
      if (parts[1]) parsedCoords = parts[1];
      if (parts[2]) parsedTime = parts[2];
      userNote = caption.slice(endIdx + 1).trim();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.headerTitle}>Job Completion Proof</Text>
            <Text style={styles.headerSubtitle}>
              {jobRef ? `Ref: ${jobRef}` : 'Verified Work Photo'} • {serviceCategory || 'Service'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Photo with Watermark Stamp Box */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUrl }} style={styles.mainImage} resizeMode="cover" />

          {/* Watermark / On-Site Verification Card */}
          <View style={styles.shopeeStamp}>
            <View style={styles.stampHeader}>
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                <Text style={styles.shieldText}>VERIFIED ON-SITE PROOF</Text>
              </View>
              <Text style={styles.brandWatermark}>KaAyos Tuy</Text>
            </View>

            <View style={styles.stampRow}>
              <Ionicons name="location" size={13} color="#38bdf8" style={{ marginTop: 2 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {parsedLocation}
              </Text>
            </View>

            <View style={styles.stampMetaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>GPS COORDS</Text>
                <Text style={styles.metaVal}>{parsedCoords}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>TIMESTAMP</Text>
                <Text style={styles.metaVal}>{parsedTime}</Text>
              </View>
            </View>

            {jobRef || serviceCategory ? (
              <View style={styles.jobRefRow}>
                <Text style={styles.jobRefText} numberOfLines={1}>
                  {jobRef ? `#${jobRef} • ` : ''}{serviceCategory || 'Task Proof'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Optional User Remarks / Notes */}
        {userNote ? (
          <View style={styles.noteBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#94a3b8" />
            <Text style={styles.noteText}>{userNote}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.95)',
    justifyContent: 'center',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  shopeeStamp: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  stampHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shieldText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.4,
  },
  brandWatermark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  stampMetaRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    marginBottom: 4,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 1,
  },
  metaVal: {
    fontSize: 11,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
  },
  jobRefRow: {
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  jobRefText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noteText: {
    fontSize: 13,
    color: '#e2e8f0',
    flex: 1,
  },
});
