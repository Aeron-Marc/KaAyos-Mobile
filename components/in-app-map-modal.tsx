import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { Booking } from '@/lib/api';
import { TUY_BARANGAY_CENTROIDS } from '@/lib/api';

const TUY_LAT = 14.0242;
const TUY_LNG = 120.7302;

// Calculate approximate straight-line distance in km between two coords
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface InAppMapModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  userRole?: 'client' | 'worker';
  onArrivedStartWork?: (booking: Booking) => void;
}

export function InAppMapModal({
  visible,
  onClose,
  booking,
  userRole = 'client',
  onArrivedStartWork,
}: InAppMapModalProps) {
  const [roadMetrics, setRoadMetrics] = useState<{
    distanceKm: number;
    durationMinutes: number;
    isOsrm: boolean;
  } | null>(null);

  // Reset metrics whenever the active booking changes
  useEffect(() => {
    setRoadMetrics(null);
  }, [booking?.id]);

  // Resolve Destination (Client / Job Location)
  const destCoords = useMemo<[number, number]>(() => {
    if (!booking) return [TUY_LAT, TUY_LNG];
    if (booking.latitude && booking.longitude) {
      return [Number(booking.latitude), Number(booking.longitude)];
    }

    // Try finding by barangay name
    const brgy = (booking.barangay || '').replace(/^Brgy\.?\s+/i, '').trim();
    if (brgy && TUY_BARANGAY_CENTROIDS[brgy]) {
      return TUY_BARANGAY_CENTROIDS[brgy];
    }

    // Try matching inside full address text
    for (const [key, coords] of Object.entries(TUY_BARANGAY_CENTROIDS)) {
      if (new RegExp(`\\b${key}\\b`, 'i').test(booking.address || '')) {
        return coords;
      }
    }

    return [TUY_LAT, TUY_LNG];
  }, [booking]);

  // Resolve Worker Location
  const workerCoords = useMemo<[number, number]>(() => {
    if (!booking) return [TUY_LAT, TUY_LNG];

    // If live tracking coordinates are recorded
    if (booking.worker_live_latitude && booking.worker_live_longitude) {
      return [Number(booking.worker_live_latitude), Number(booking.worker_live_longitude)];
    }

    // If in progress or completed, worker is at destination
    if (['in_progress', 'completed'].includes(booking.status)) {
      return [destCoords[0] + 0.0001, destCoords[1] + 0.0001];
    }

    // If en route, worker is moving between Tuy Hub and Destination
    if (booking.status === 'en_route') {
      const midLat = destCoords[0] * 0.6 + TUY_LAT * 0.4;
      const midLng = destCoords[1] * 0.6 + TUY_LNG * 0.4;
      return [midLat, midLng];
    }

    // Default: Tuy town center
    return [TUY_LAT, TUY_LNG];
  }, [booking, destCoords]);

  // Straight line fallback metrics
  const fallbackDistanceKm = useMemo(() => {
    const d = getDistanceKm(workerCoords[0], workerCoords[1], destCoords[0], destCoords[1]);
    return Math.max(0.4, Number(d.toFixed(1)));
  }, [workerCoords, destCoords]);

  const fallbackEtaMinutes = useMemo(() => {
    if (booking?.status === 'in_progress') return 0;
    return Math.max(3, Math.round((fallbackDistanceKm / 25) * 60));
  }, [fallbackDistanceKm, booking?.status]);

  // Effective displayed metrics (favoring real OSRM road measurements)
  const displayDistance = roadMetrics?.distanceKm ?? fallbackDistanceKm;
  const displayEta = roadMetrics?.durationMinutes ?? fallbackEtaMinutes;
  const isOsrmSnapped = roadMetrics?.isOsrm ?? false;

  // Receive OSRM road calculation result from WebView Leaflet script
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'osrm_result') {
        setRoadMetrics({
          distanceKm: Number(data.distanceKm),
          durationMinutes: Number(data.durationMinutes),
          isOsrm: Boolean(data.isOsrm),
        });
      }
    } catch {}
  }, []);

  // Leaflet + OSRM HTML definition
  const mapHtml = useMemo(() => {
    if (!booking) return '';

    const clientLabel = userRole === 'worker' ? (booking.other_name || 'Client') : 'Your Address';
    const workerLabel = userRole === 'worker' ? 'You (Worker)' : (booking.other_name || 'Worker');

    const isSamePlace =
      ['in_progress', 'completed'].includes(booking.status) ||
      (Math.abs(destCoords[0] - workerCoords[0]) < 0.0002 &&
        Math.abs(destCoords[1] - workerCoords[1]) < 0.0002);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e2e8f0; }
          .dest-pin {
            background-color: #dc2626;
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45);
            border: 2px solid #ffffff;
          }
          .worker-pin {
            background-color: #0284c7;
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.45);
            border: 2px solid #ffffff;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .popup-content {
            font-size: 13px;
            line-height: 1.4;
          }
          .popup-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .popup-sub {
            color: #64748b;
          }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var dest = [${destCoords[0]}, ${destCoords[1]}];
          var worker = [${workerCoords[0]}, ${workerCoords[1]}];
          var isSame = ${isSamePlace ? 'true' : 'false'};

          var map = L.map('map', { zoomControl: true });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'OpenStreetMap'
          }).addTo(map);

          // Destination Pin (Home / Job Address)
          var destIcon = L.divIcon({
            className: 'custom-dest-pin',
            html: '<div class="dest-pin">📍</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          var destMarker = L.marker(dest, { icon: destIcon }).addTo(map);
          destMarker.bindPopup('<div class="popup-content"><div class="popup-title">🏠 ' + ${JSON.stringify(clientLabel)} + '</div><div class="popup-sub">' + ${JSON.stringify(booking.address || 'Tuy, Batangas')} + '</div></div>').openPopup();

          if (!isSame) {
            // Worker Pin (Moving / Heading to job)
            var workerIcon = L.divIcon({
              className: 'custom-worker-pin',
              html: '<div class="worker-pin">🔧</div>',
              iconSize: [36, 36],
              iconAnchor: [18, 36]
            });
            var workerMarker = L.marker(worker, { icon: workerIcon }).addTo(map);
            workerMarker.bindPopup('<div class="popup-content"><div class="popup-title">👷 ' + ${JSON.stringify(workerLabel)} + '</div><div class="popup-sub">Status: ' + ${JSON.stringify(booking.status)} + '</div></div>');

            // 1. Initial dashed placeholder path while OSRM detects real roads
            var placeholderLine = L.polyline([worker, dest], {
              color: '#94a3b8',
              weight: 3,
              opacity: 0.6,
              dashArray: '6, 6',
              lineCap: 'round'
            }).addTo(map);

            var initialGroup = new L.featureGroup([destMarker, workerMarker, placeholderLine]);
            map.fitBounds(initialGroup.getBounds(), { padding: [60, 60], maxZoom: 16 });

            // 2. Query OSRM Driving Service for road-snapped pathing
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' +
              worker[1] + ',' + worker[0] + ';' + dest[1] + ',' + dest[0] +
              '?overview=full&geometries=geojson';

            fetch(osrmUrl)
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data.code === 'Ok' && data.routes && data.routes[0]) {
                  var route = data.routes[0];
                  // GeoJSON coordinates are [lng, lat], map to Leaflet [lat, lng]
                  var roadPoints = route.geometry.coordinates.map(function(pt) {
                    return [pt[1], pt[0]];
                  });

                  // Remove placeholder line
                  map.removeLayer(placeholderLine);

                  // Outer road highlight glow
                  var roadGlow = L.polyline(roadPoints, {
                    color: '#60a5fa',
                    weight: 8,
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }).addTo(map);

                  // Inner precise driving route
                  var roadRoute = L.polyline(roadPoints, {
                    color: '#1d4ed8',
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }).addTo(map);

                  // Re-fit map to the exact road path
                  var activeGroup = new L.featureGroup([destMarker, workerMarker, roadRoute]);
                  map.fitBounds(activeGroup.getBounds(), { padding: [60, 60], maxZoom: 16 });

                  var roadDistKm = (route.distance / 1000).toFixed(1);
                  var roadMinutes = Math.max(2, Math.round(route.duration / 60));

                  // Send OSRM road telemetry back to React Native
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'osrm_result',
                      distanceKm: roadDistKm,
                      durationMinutes: roadMinutes,
                      isOsrm: true
                    }));
                  }
                }
              })
              .catch(function(err) {
                console.log('OSRM road detection fallback to straight line:', err);
              });
          } else {
            map.setView(dest, 16);
          }
        </script>
      </body>
      </html>
    `;
  }, [booking, userRole, destCoords, workerCoords]);

  if (!booking) return null;

  const handleOpenGoogleMaps = () => {
    const addressToUse = booking.address || `${booking.barangay || ''}, Tuy, Batangas`;
    const destinationQuery = booking.latitude && booking.longitude
      ? `${booking.latitude},${booking.longitude}`
      : encodeURIComponent(addressToUse);

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Could not open Google Maps on this device.');
    });
  };

  const handleCall = () => {
    if (!booking.other_phone) {
      Alert.alert('Phone Unavailable', 'No contact number provided for this booking.');
      return;
    }
    Linking.openURL(`tel:${booking.other_phone}`).catch(() => {
      Alert.alert('Call Error', 'Could not start phone call.');
    });
  };

  const statusBadge = () => {
    switch (booking.status) {
      case 'en_route':
        return { label: 'En Route', color: '#d97706', bg: '#fef3c7', icon: 'bicycle-outline' as const };
      case 'in_progress':
        return { label: 'In Progress On Site', color: '#16a34a', bg: '#dcfce7', icon: 'construct-outline' as const };
      case 'accepted':
        return { label: 'Accepted & Scheduled', color: '#2563eb', bg: '#dbeafe', icon: 'calendar-outline' as const };
      case 'completed':
        return { label: 'Completed', color: '#475569', bg: '#f1f5f9', icon: 'checkmark-circle-outline' as const };
      default:
        return { label: 'Booking Request', color: '#6366f1', bg: '#e0e7ff', icon: 'time-outline' as const };
    }
  };

  const badge = statusBadge();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userRole === 'worker' ? 'Client Destination' : 'Worker Live Tracking'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {booking.service_category} • {booking.other_name || (userRole === 'worker' ? 'Client' : 'Worker')}
            </Text>
          </View>

          {booking.other_phone ? (
            <TouchableOpacity onPress={handleCall} style={styles.callHeaderBtn} activeOpacity={0.8}>
              <Ionicons name="call" size={17} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── IN-APP INTERACTIVE LEAFLET + OSRM MAP ── */}
        <View style={styles.mapContainer}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
          />

          {/* Floating Status Pill on Top of Map */}
          <View style={styles.floatingStatusRow}>
            <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.color }]}>
              <Ionicons name={badge.icon} size={15} color={badge.color} />
              <Text style={[styles.statusPillText, { color: badge.color }]}>{badge.label}</Text>
            </View>

            <View style={styles.topRightPillContainer}>
              <View style={styles.etaPill}>
                <Ionicons name="car-outline" size={14} color="#fff" />
                <Text style={styles.etaPillText}>~{displayEta} min ({displayDistance} km)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── BOTTOM INFORMATION & ACTIONS CARD ── */}
        <View style={styles.bottomCard}>
          <View style={styles.addressRow}>
            <View style={styles.addressIconBox}>
              <Ionicons name="location-sharp" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.addressLabel}>Service Address</Text>
              </View>

              <Text style={styles.addressText} numberOfLines={2}>
                {booking.house_no ? `${booking.house_no}, ` : ''}
                {booking.address}
              </Text>
              {booking.barangay ? (
                <Text style={styles.barangayBadgeText}>Brgy. {booking.barangay}, Tuy, Batangas</Text>
              ) : null}
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            {/* 1. External Google Maps Navigation Option */}
            <TouchableOpacity
              style={[styles.btn, styles.googleMapsBtn]}
              onPress={handleOpenGoogleMaps}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-circle" size={20} color="#15803d" />
              <Text style={styles.googleMapsBtnText}>Open in Google Maps</Text>
            </TouchableOpacity>

            {/* 2. Worker Quick Action: "Arrived (Start Work)" */}
            {userRole === 'worker' && booking.status === 'en_route' && onArrivedStartWork && (
              <TouchableOpacity
                style={[styles.btn, styles.arrivedBtn]}
                onPress={() => {
                  onArrivedStartWork(booking);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.arrivedBtnText}>I've Arrived (Start)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#ffffff',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  webview: {
    flex: 1,
  },
  floatingStatusRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  topRightPillContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#042C53',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  etaPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomCard: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  addressIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
  },
  barangayBadgeText: {
    fontSize: 12,
    color: Colors.primaryAccent,
    fontWeight: '600',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  googleMapsBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  googleMapsBtnText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '700',
  },
  arrivedBtn: {
    backgroundColor: Colors.primary,
  },
  arrivedBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
