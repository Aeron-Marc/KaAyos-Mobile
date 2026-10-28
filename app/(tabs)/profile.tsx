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

  // Accordion expansion states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  // Personal Info form
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryAccent} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={{ marginTop: 60 }} />
        ) : user ? (
          <>
            {/* ── UNIFIED PROFILE HERO ── */}
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
                    <Ionicons name="camera" size={13} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.heroName}>{user.name || `${firstName} ${lastName}`}</Text>
              <Text style={styles.heroContactText}>
                {user.email} {phone ? `• ${phone}` : ''}
              </Text>

              <View style={styles.heroBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Client Account</Text>
                </View>
                {user.email_verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#16a34a" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── SECTION 1: PERSONAL INFORMATION ── */}
            <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
            <View style={styles.groupCard}>
              <View style={styles.groupHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.groupIconBox}>
                    <Ionicons name="person-outline" size={16} color={Colors.primaryAccent} />
                  </View>
                  <Text style={styles.groupTitle}>Personal Details</Text>
                </View>
                {!isEditingPersonal ? (
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => setIsEditingPersonal(true)}
                  >
                    <Ionicons name="pencil-outline" size={12} color={Colors.primaryAccent} />
                    <Text style={styles.actionPillText}>Edit</Text>
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
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      style={styles.input}
                      placeholder="Last name"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      style={styles.input}
                      placeholder="09XXXXXXXXX"
                      placeholderTextColor={Colors.textMuted}
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
                        <Text style={styles.saveBtnText}>Save</Text>
                      )}
                    </PressableScale>
                    <TouchableOpacity
                      style={styles.discardBtn}
                      onPress={handleDiscardPersonal}
                      disabled={savingPersonal}
                    >
                      <Text style={styles.discardBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.readOnlyList}>
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Name</Text>
                    <Text style={styles.readOnlyVal}>{firstName} {lastName}</Text>
                  </View>
                  <View style={styles.rowDivider} />
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Phone</Text>
                    <Text style={styles.readOnlyVal}>{phone || 'Not set'}</Text>
                  </View>
                  <View style={styles.rowDivider} />
                  <View style={styles.readOnlyRow}>
                    <Text style={styles.readOnlyLabel}>Email</Text>
                    <Text style={styles.readOnlyVal}>{user.email}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── SECTION 2: TUY RESIDENTIAL ADDRESS (ACCORDION) ── */}
            <Text style={styles.sectionLabel}>SERVICE DISPATCH ADDRESS</Text>
            <View style={styles.groupCard}>
              <TouchableOpacity
                style={styles.addressAccordionHeader}
                onPress={() => setIsAddressExpanded(prev => !prev)}
                activeOpacity={0.7}
              >
                <View style={styles.groupIconBox}>
                  <Ionicons name="location-outline" size={16} color={Colors.primaryAccent} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.addressBarangayText}>Brgy. {barangay}, Tuy, Batangas</Text>
                  <Text style={styles.addressStreetSummary} numberOfLines={1}>
                    {streetAddress || 'No street / landmark set'}
                  </Text>
                </View>
                <View style={styles.addressRightHeader}>
                  <View style={[
                    styles.sourceTag,
                    locationSource === 'gps' ? styles.sourceGps : styles.sourceManual
                  ]}>
                    <Text style={[
                      styles.sourceTagText,
                      locationSource === 'gps' ? { color: '#1d4ed8' } : { color: '#b45309' }
                    ]}>
                      {locationSource === 'gps' ? 'GPS' : 'Manual'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isAddressExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textMuted}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </TouchableOpacity>

              {isAddressExpanded && (
                <View style={styles.addressExpandedBody}>
                  <Text style={styles.addressHelperText}>
                    Select your exact barangay in Tuy and house landmark for reliable home service dispatch.
                  </Text>

                  {/* Location Action Buttons */}
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
                          <Ionicons name="navigate" size={14} color="#fff" />
                          <Text style={styles.gpsBtnText}>Detect GPS</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.barangayPickerTrigger}
                      onPress={() => setBarangayModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="list" size={14} color={Colors.primaryAccent} />
                      <Text style={styles.barangayPickerTriggerText} numberOfLines={1}>
                        {barangay}
                      </Text>
                      <Ionicons name="chevron-down" size={12} color={Colors.primaryAccent} />
                    </TouchableOpacity>
                  </View>

                  {/* Street & Landmark Input */}
                  <View style={styles.streetInputRow}>
                    <TextInput
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                      style={styles.streetInput}
                      placeholder="House No. / Street / Landmark"
                      placeholderTextColor={Colors.textMuted}
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
              )}
            </View>

            {/* ── SECTION 3: PREFERENCES ── */}
            <Text style={styles.sectionLabel}>PREFERENCES</Text>
            <View style={styles.groupCard}>
              {/* Notifications */}
              <View style={styles.prefRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={styles.groupIconBox}>
                    <Ionicons name="notifications-outline" size={16} color={Colors.primaryAccent} />
                  </View>
                  <Text style={styles.prefTitle}>Email Notifications</Text>
                </View>
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

              <View style={styles.rowDivider} />

              {/* Language */}
              <View style={[styles.prefRow, { paddingTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={styles.groupIconBox}>
                    <Ionicons name="language-outline" size={16} color={Colors.primaryAccent} />
                  </View>
                  <Text style={styles.prefTitle}>Language</Text>
                </View>
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

            {/* ── SECTION 4: SECURITY NOTE & SIGN OUT ── */}
            <Text style={styles.sectionLabel}>SECURITY & SESSION</Text>
            <View style={styles.groupCard}>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primaryAccent} />
                <Text style={styles.securityText}>
                  Protected with email OTP verification sent to {user.email}
                </Text>
              </View>
            </View>

            {/* Sign Out Button */}
            <PressableScale
              onPress={handleSignOutPrompt}
              style={styles.signOutBtn}
            >
              <Ionicons name="log-out-outline" size={17} color={Colors.error} />
              <Text style={styles.signOutText}>Sign Out of KaAyos</Text>
            </PressableScale>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.loadingText}>Failed to load profile</Text>
          </View>
        )}

        <View style={{ height: 28 }} />
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
              renderItem={({ item }: { item: any }) => {
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
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primaryAccent} />
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },

  // Unified Profile Hero
  heroCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  heroAvatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  heroAvatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primaryAccent,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
  },
  heroContactText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryHover,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },

  // Section Headers
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginLeft: 4,
    marginBottom: 6,
    marginTop: 4,
  },

  // Grouped Cards
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#042C53',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryAccent,
  },

  // Read-only Details
  readOnlyList: {
    marginTop: 10,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  readOnlyVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // Forms
  formContainer: {
    marginTop: 12,
    gap: 8,
  },
  field: {
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    height: 38,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  discardBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  discardBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Address Accordion
  addressAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressBarangayText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  addressStreetSummary: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  addressRightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceGps: { backgroundColor: '#eff6ff' },
  sourceManual: { backgroundColor: '#fef3c7' },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addressExpandedBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addressHelperText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  locButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  gpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primaryAccent,
  },
  gpsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  barangayPickerTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  barangayPickerTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryHover,
    flex: 1,
  },
  streetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streetInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  inlineSaveBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSaveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Preferences
  prefRow: {
    paddingVertical: 2,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 38,
  },
  prefChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  prefChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryAccent,
  },
  prefChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  prefChipTextActive: {
    color: Colors.primaryHover,
    fontWeight: '700',
  },

  // Security Note
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },

  // Sign out button
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 6,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 44, 83, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  barangayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  barangayItemActive: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  barangayItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  barangayItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
