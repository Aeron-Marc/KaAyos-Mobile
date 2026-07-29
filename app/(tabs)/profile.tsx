import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import * as api from '@/lib/api';
import type { User } from '@/lib/api';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';

export default function ProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  const userId = authUser?.id;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.getProfile();
      setUser(res.user);
      setFirstName(res.user.first_name || '');
      setLastName(res.user.last_name || '');
      setPhone(res.user.phone || '');
      setCity(res.user.city || '');
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

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        city,
      });
      setUser(prev => prev ? {
        ...prev,
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`,
        phone,
        city,
      } : null);
      showToast('Profile saved successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
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
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {`${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{firstName} {lastName}</Text>
                <Text style={styles.profileRole}>Homeowner</Text>
                {user.email_verified && (
                  <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                    <Text style={styles.verifiedText}>Email Verified</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.label}>First Name</Text>
                <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholderTextColor={Colors.icon} placeholder="First name" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholderTextColor={Colors.icon} placeholder="Last name" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Phone</Text>
                <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholderTextColor={Colors.icon} placeholder="+63 or 09..." keyboardType="phone-pad" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>City</Text>
                <TextInput value={city} onChangeText={setCity} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Tuy, Batangas" />
              </View>
            </View>

            <PressableScale haptics style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
            </PressableScale>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.loadingText}>Failed to load profile</Text>
          </View>
        )}

        <PressableScale
          onPress={() => {
            signOut();
            router.replace('/auth/login');
          }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </PressableScale>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: Colors.textSecondary },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: Colors.surface, marginBottom: 12, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  profileRole: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  formCard: { borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12, gap: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  saveBtn: { borderRadius: 14, paddingVertical: 16, backgroundColor: Colors.primary, alignItems: 'center', marginBottom: 12, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.error, paddingVertical: 14, marginTop: 8, backgroundColor: '#fef2f2' },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});