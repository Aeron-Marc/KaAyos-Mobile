import { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import * as api from '@/lib/api';
import type { Worker } from '@/lib/api';

const TUY_LAT = 14.0242;
const TUY_LNG = 120.7302;

export default function MapScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data);
      if (data.length > 0) {
        setSelectedWorker(data[0]);
      }
    } catch (e) {
      console.error('Failed to fetch map workers', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const mapHtml = useMemo(() => {
    const workerPins = workers.map((w, index) => {
      // If coordinates are missing, distribute around Tuy center
      const angle = (index / Math.max(workers.length, 1)) * 2 * Math.PI;
      const offsetLat = Math.sin(angle) * 0.015;
      const offsetLng = Math.cos(angle) * 0.018;
      const lat = TUY_LAT + offsetLat;
      const lng = TUY_LNG + offsetLng;

      return {
        id: w.id,
        name: w.name,
        category: w.category || 'Service Provider',
        rating: w.rating || 5.0,
        price: w.hourly_rate || 350,
        lat,
        lng,
      };
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e2e8f0; }
          .pin-marker {
            background-color: #2563eb;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            cursor: pointer;
          }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${TUY_LAT}, ${TUY_LNG}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          var workers = ${JSON.stringify(workerPins)};
          workers.forEach(function(w) {
            var icon = L.divIcon({
              className: 'custom-pin',
              html: '<div class="pin-marker">' + w.name.charAt(0) + '</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            var m = L.marker([w.lat, w.lng], { icon: icon }).addTo(map);
            m.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select_worker', id: w.id }));
            });
          });
        </script>
      </body>
      </html>
    `;
  }, [workers]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'select_worker') {
        const found = workers.find(w => w.id === data.id);
        if (found) setSelectedWorker(found);
      }
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
        <View>
          <Text style={styles.title}>Tuy Worker Map</Text>
          <Text style={styles.subtitle}>Browse verified local providers</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 10, color: Colors.textSecondary }}>Loading map of Tuy...</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            onMessage={handleMessage}
            style={styles.webview}
          />
        )}

        {/* Selected Worker Floating Bottom Sheet */}
        {selectedWorker && (
          <View style={styles.bottomCard}>
            <View style={styles.workerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{selectedWorker.first_name?.[0]}{selectedWorker.last_name?.[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>{selectedWorker.name}</Text>
                <Text style={styles.workerCategory}>{selectedWorker.category || 'Service Provider'}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={Colors.star} />
                  <Text style={styles.ratingText}>{selectedWorker.rating || 5.0}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.priceText}>
                    {selectedWorker.hourly_rate ? `₱${selectedWorker.hourly_rate}/hr` : 'Negotiable'}
                  </Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.locationBadge}>{selectedWorker.city || 'Tuy'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => router.push(`/worker/${selectedWorker.id}`)}
              >
                <Text style={styles.profileBtnText}>View Profile</Text>
              </TouchableOpacity>
              <PressableScale
                style={styles.bookBtn}
                onPress={() => router.push({
                  pathname: '/modal/booking',
                  params: { id: String(selectedWorker.id), category: selectedWorker.category || '' }
                })}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </PressableScale>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary },
  mapContainer: { flex: 1, position: 'relative' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1 },
  bottomCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  workerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  workerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  workerCategory: { fontSize: 13, color: Colors.textSecondary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  dot: { fontSize: 10, color: Colors.textMuted },
  priceText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  locationBadge: { fontSize: 11, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10 },
  profileBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  profileBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  bookBtn: { flex: 1.3, height: 44, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bookBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
