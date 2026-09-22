import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import { TUY_BARANGAYS, SERVER_URL, type User } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

const NOTIFICATION_OPTIONS = ['All updates', 'Bookings only', 'Messages only', 'None'];
const LANGUAGE_OPTIONS = ['English', 'Filipino'];

export default function ProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Personal Info form
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Tuy Location
  const [barangay, setBarangay] = useState<string>('Luna');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>('manual');
  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState('All updates');
  const [language, setLanguage] = useState('English');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Avatar upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const userId = authUser?.id;

  const syncStateFromUser = (u: User) => {
    setUser(u);
    setFirstName(u.first_name || '');
    setLastName(u.last_name || '');
    setPhone(u.phone || '');
    setBarangay(u.barangay || 'Luna');
    setStreetAddress(u.street_address || '');
    setLocationSource((u.location_source as any) || 'manual');
    setEmailNotifications(u.email_notifications || 'All updates');
    setLanguage(u.language || 'English');
  };

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.getProfile();
      syncStateFromUser(res.user);
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchProfile().finally(() => setLoading(false));
  }, [userId, fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  // Photo change
  const handleChangePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('Permission to access photos is required', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingPhoto(true);
      const res = await api.uploadAvatar(result.assets[0].uri);
      if (res.avatar_url) {
        setUser(prev => prev ? { ...prev, avatar: res.avatar_url } : null);
        showToast('Profile photo updated!', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Personal Details
  const handleSavePersonal = async () => {
    if (!userId) return;
    setSavingPersonal(true);
    try {
      await api.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      setUser(prev => prev ? {
        ...prev,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
      } : null);
      setIsEditingPersonal(false);
      showToast('Personal information updated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update personal info', 'error');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleDiscardPersonal = () => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
    setIsEditingPersonal(false);
  };

  // Detect GPS
  const handleDetectGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Attempt reverse geocode
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      let detectedBarangay = barangay;
      if (geo?.district || geo?.subregion || geo?.street) {
        const candidate = geo.district || geo.subregion || '';
        const match = TUY_BARANGAYS.find(b => b.toLowerCase() === candidate.toLowerCase());
        if (match) detectedBarangay = match;
      }

      const detectedStreet = geo?.street || geo?.name || streetAddress;
      setBarangay(detectedBarangay);
      if (detectedStreet) setStreetAddress(detectedStreet);
      setLocationSource('gps');

      await api.updateProfile({
        barangay: detectedBarangay,
        street_address: detectedStreet,
        location_source: 'gps',
        city: 'Tuy',
      });
      setUser(prev => prev ? {
        ...prev,
        barangay: detectedBarangay,
        street_address: detectedStreet,
        location_source: 'gps',
      } : null);
      showToast('GPS Location detected & updated!', 'success');
    } catch {
      showToast('Could not detect location. Please select your Barangay.', 'error');
    } finally {
      setLocating(false);
    }
  };

  // Save Tuy Address Manual
  const handleSaveLocation = async (chosenBarangay = barangay) => {
    setSavingLocation(true);
    try {
      await api.updateProfile({
        barangay: chosenBarangay,
        street_address: streetAddress.trim(),
        location_source: locationSource,
        city: 'Tuy',
      });
      setUser(prev => prev ? {
        ...prev,
        barangay: chosenBarangay,
        street_address: streetAddress.trim(),
        location_source: locationSource,
      } : null);
      showToast('Residential address saved', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save address', 'error');
    } finally {
      setSavingLocation(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (newNotification?: string, newLang?: string) => {
    const notifyVal = newNotification || emailNotifications;
    const langVal = newLang || language;
    setSavingPrefs(true);
    try {
      await api.updateProfile({
        email_notifications: notifyVal,
        language: langVal,
      });
      setUser(prev => prev ? {
        ...prev,
        email_notifications: notifyVal,
        language: langVal,
      } : null);
      showToast('Preferences updated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSignOutPrompt = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of KaAyos?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const avatarUrl = user?.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${SERVER_URL}${user.avatar}`
    : null;

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your profile, residence & settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : user ? (
          <>
            {/* ── CARD 1: ACCOUNT HERO (WEB SIDEBAR MIRROR) ── */}
            <View style={styles.heroCard}>
              <View style={styles.heroAvatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImg} />
                ) : (
                  <View style={styles.heroAvatarFallback}>
                    <Text style={styles.heroAvatarText}>
                      {`${firstName?.charAt(0) || 'U'}${lastName?.charAt(0) || ''}`}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.heroCameraBtn}
                  onPress={handleChangePhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.heroName}>{user.name || `${firstName} ${lastName}`}</Text>
              <Text style={styles.heroEmail}>{user.email}</Text>

              <View style={styles.heroBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Client</Text>
                </View>
                {user.email_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.changePhotoTextBtn}
                onPress={handleChangePhoto}
                disabled={uploadingPhoto}
              >
                <Ionicons name="image-outline" size={14} color={Colors.primary} />
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </TouchableOpacity>
            </View>

            {/* ── CARD 2: PERSONAL INFORMATION ── */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Personal Information</Text>
                </View>
                {!isEditingPersonal ? (
                  <TouchableOpacity
                    style={styles.headerActionBtn}
                    onPress={() => setIsEditingPersonal(true)}
                  >
                    <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                    <Text style={styles.headerActionText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {isEditingPersonal ? (
                <View style={styles.formContainer}>
                  <View style={styles.field}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      style={styles.input}
                      placeholder="First name"
                      placeholderTextColor={Colors.icon}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor={Colors.icon}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      style={styles.input}
                      placeholder="09XXXXXXXXX"
                      placeholderTextColor={Colors.icon}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.editActionsRow}>
                    <PressableScale
                      haptics
                      style={styles.saveBtn}
                      onPress={handleSavePersonal}
                      disabled={savingPersonal}
                    >
                      {savingPersonal ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save changes</Text>
                      )}
                    </PressableScale>
                    <TouchableOpacity
                      style={styles.discardBtn}
                      onPress={handleDiscardPersonal}
                      disabled={savingPersonal}
                    >
                      <Text style={styles.discardBtnText}>Discard</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.readOnlyList}>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Full Name</Text>
                    <Text style={styles.readOnlyVal}>{firstName} {lastName}</Text>
                  </View>
                  <View style={styles.readOnlyDivider} />
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Phone Number</Text>
                    <Text style={styles.readOnlyVal}>{phone || 'Not provided'}</Text>
                  </View>
                  <View style={styles.readOnlyDivider} />
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Account Email</Text>
                    <Text style={styles.readOnlyVal}>{user.email}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── CARD 3: TUY RESIDENTIAL ADDRESS & LOCATION PICKER ── */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="location-outline" size={20} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Residential Address</Text>
                </View>
                <View style={[
                  styles.sourceChip,
                  locationSource === 'gps' ? styles.sourceGps : styles.sourceManual
                ]}>
                  <Ionicons
                    name={locationSource === 'gps' ? 'navigate' : 'hand-left'}
                    size={11}
                    color={locationSource === 'gps' ? '#1d4ed8' : '#b45309'}
                  />
                  <Text style={[
                    styles.sourceChipText,
                    locationSource === 'gps' ? { color: '#1d4ed8' } : { color: '#b45309' }
                  ]}>
                    {locationSource === 'gps' ? 'GPS DETECTED' : 'MANUAL TUY'}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Official address within Tuy, Batangas for on-site service dispatch.
              </Text>

              {/* Current Address Display Banner */}
              <View style={styles.addressDisplayBox}>
                <Ionicons name="home-outline" size={20} color={Colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressBarangayText}>Brgy. {barangay}, Tuy, Batangas</Text>
                  <Text style={styles.addressStreetText}>
                    {streetAddress || 'Street address / landmark not set'}
                  </Text>
                </View>
              </View>

              {/* Location Actions */}
              <View style={styles.locButtonsRow}>
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={handleDetectGPS}
                  disabled={locating}
                  activeOpacity={0.8}
                >
                  {locating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={15} color="#fff" />
                      <Text style={styles.gpsBtnText}>Detect GPS</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.barangayPickerTrigger}
                  onPress={() => setBarangayModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="list" size={15} color={Colors.primary} />
                  <Text style={styles.barangayPickerTriggerText} numberOfLines={1}>
                    Brgy: {barangay}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Street & Landmark Input */}
              <View style={[styles.field, { marginTop: 12 }]}>
                <Text style={styles.label}>House No. / Street / Landmark</Text>
                <View style={styles.inputWithBtn}>
                  <TextInput
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                    style={[styles.input, { flex: 1 }]}
                    placeholder="e.g. Unit 4, Rizal Street"
                    placeholderTextColor={Colors.icon}
                  />
                  <TouchableOpacity
                    style={styles.inlineSaveBtn}
                    onPress={() => handleSaveLocation()}
                    disabled={savingLocation}
                  >
                    {savingLocation ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.inlineSaveBtnText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── CARD 4: PREFERENCES (NOTIFICATIONS & LANGUAGE) ── */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="options-outline" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Preferences</Text>
              </View>

              {/* Notifications */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.prefSubheading}>Email Notifications</Text>
                <View style={styles.chipGroup}>
                  {NOTIFICATION_OPTIONS.map((opt) => {
                    const isSelected = emailNotifications === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.prefChip, isSelected && styles.prefChipActive]}
                        onPress={() => {
                          setEmailNotifications(opt);
                          handleSavePreferences(opt, undefined);
                        }}
                      >
                        <Text style={[styles.prefChipText, isSelected && styles.prefChipTextActive]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Language */}
              <View>
                <Text style={styles.prefSubheading}>Language</Text>
                <View style={styles.chipGroup}>
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const isSelected = language === lang;
                    return (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.prefChip, isSelected && styles.prefChipActive]}
                        onPress={() => {
                          setLanguage(lang);
                          handleSavePreferences(undefined, lang);
                        }}
                      >
                        <Text style={[styles.prefChipText, isSelected && styles.prefChipTextActive]}>
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── CARD 5: SECURITY & ACCOUNT NOTICE ── */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
                <Text style={styles.cardTitle}>Security & Access</Text>
              </View>
              <Text style={styles.cardDesc}>
                An OTP verification code will be sent to <Text style={{ fontWeight: '600', color: Colors.text }}>{user.email}</Text> prior to any password modifications.
              </Text>
            </View>

            {/* ── SIGN OUT ── */}
            <PressableScale
              onPress={handleSignOutPrompt}
              style={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </PressableScale>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.loadingText}>Failed to load profile</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── TUY BARANGAY PICKER MODAL ── */}
      <Modal
        visible={barangayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBarangayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tuy Barangay</Text>
              <TouchableOpacity onPress={() => setBarangayModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose from the 22 official barangays of Tuy, Batangas:
            </Text>

            <FlatList
              data={TUY_BARANGAYS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = barangay === item;
                return (
                  <TouchableOpacity
                    style={[styles.barangayItem, isSelected && styles.barangayItemActive]}
                    onPress={() => {
                      setBarangay(item);
                      setLocationSource('manual');
                      setBarangayModalVisible(false);
                      handleSaveLocation(item);
                    }}
                  >
                    <Text style={[styles.barangayItemText, isSelected && styles.barangayItemTextActive]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },

  // Hero Identity Card
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  heroAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  heroAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 4 },
  heroEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: Colors.primaryLight,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: '#f0fdf4',
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  changePhotoTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changePhotoText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Generic Section Card
  sectionCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: Colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 12 },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  headerActionText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Read-only Details List
  readOnlyList: { gap: 8 },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  readOnlyLabel: { fontSize: 13, color: Colors.textSecondary },
  readOnlyVal: { fontSize: 13, fontWeight: '600', color: Colors.text },
  readOnlyDivider: { height: 1, backgroundColor: Colors.border },

  // Personal Form Container
  formContainer: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  editActionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  saveBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  discardBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Tuy Location
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  sourceGps: { backgroundColor: '#eff6ff' },
  sourceManual: { backgroundColor: '#fef3c7' },
  sourceChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  addressDisplayBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  addressBarangayText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  addressStreetText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  locButtonsRow: { flexDirection: 'row', gap: 10 },
  gpsBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  gpsBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  barangayPickerTrigger: {
    flex: 1.2,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  barangayPickerTriggerText: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 4 },
  inputWithBtn: { flexDirection: 'row', gap: 8 },
  inlineSaveBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Preferences Chips
  prefSubheading: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  prefChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  prefChipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  prefChipTextActive: { color: Colors.primary, fontWeight: '700' },

  // Sign Out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: Colors.error },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 14 },
  barangayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  barangayItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  barangayItemText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  barangayItemTextActive: { fontWeight: '700', color: Colors.primary },
});