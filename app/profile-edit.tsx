import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/AuthContext';
import * as api from '@/lib/api';

export default function ProfileEditScreen() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState('');
  const [availableDays, setAvailableDays] = useState('');
  const [preferredHours, setPreferredHours] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');

  const userId = authUser?.id;

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      api.getProfile(userId),
      api.getWorkerProfile(userId).catch(() => null),
    ]).then(([profileRes, wp]) => {
      const u = profileRes.user;
      setFirstName(u.first_name || '');
      setLastName(u.last_name || '');
      setPhone(u.phone || '');
      setCity(u.city || '');
      if (wp) {
        setBio(wp.bio || '');
        setHourlyRate(wp.hourly_rate?.toString() || '');
        setCategory(wp.service_category || u.service_category || '');
        setSkills(Array.isArray(wp.skills) ? wp.skills.join(', ') : '');
        setSpokenLanguages(Array.isArray(wp.spoken_languages) ? wp.spoken_languages.join(', ') : '');
        setAvailableDays(wp.available_days || '');
        setPreferredHours(wp.preferred_hours || '');
        setYearsOfExperience(wp.years_of_experience?.toString() || '');
        setServiceRadius(wp.service_radius?.toString() || '');
      } else {
        setCategory(u.service_category || '');
      }
    }).catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.updateProfile(userId, {
        first_name: firstName,
        last_name: lastName,
        phone,
        city,
      });
      if (authUser?.role === 'worker') {
        await api.updateWorkerProfile(userId, {
          bio,
          hourly_rate: parseFloat(hourlyRate) || null,
          first_name: firstName,
          last_name: lastName,
          city,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          spoken_languages: spokenLanguages.split(',').map(s => s.trim()).filter(Boolean),
          available_days: availableDays,
          preferred_hours: preferredHours,
          years_of_experience: parseInt(yearsOfExperience) || null,
          service_radius: parseInt(serviceRadius) || null,
        });
      }
      showToast('Profile saved successfully', 'success');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </PressableScale>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{firstName?.charAt(0) || ''}{lastName?.charAt(0) || ''}</Text>
          </View>
          <PressableScale style={styles.uploadBtn} onPress={() => showToast('Photo upload coming soon', 'info')}>
            <Ionicons name="camera-outline" size={16} color={Colors.primary} />
            <Text style={styles.uploadText}>Upload Photo</Text>
          </PressableScale>
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

          {authUser?.role === 'worker' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Plumbing" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>About</Text>
                <TextInput multiline numberOfLines={4} value={bio} onChangeText={setBio} style={styles.textArea} placeholderTextColor={Colors.icon} placeholder="Tell clients about yourself..." textAlignVertical="top" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Hourly Rate (PHP)</Text>
                <TextInput keyboardType="numeric" value={hourlyRate} onChangeText={setHourlyRate} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. 450" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Skills (comma-separated)</Text>
                <TextInput value={skills} onChangeText={setSkills} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Plumbing, Pipe Repair" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Spoken Languages (comma-separated)</Text>
                <TextInput value={spokenLanguages} onChangeText={setSpokenLanguages} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Filipino, English" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Available Days</Text>
                <TextInput value={availableDays} onChangeText={setAvailableDays} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Monday â€” Friday" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Preferred Hours</Text>
                <TextInput value={preferredHours} onChangeText={setPreferredHours} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. Full Day (8 AM â€” 5 PM)" />
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Years Experience</Text>
                  <TextInput keyboardType="numeric" value={yearsOfExperience} onChangeText={setYearsOfExperience} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. 5" />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Service Radius (km)</Text>
                  <TextInput keyboardType="numeric" value={serviceRadius} onChangeText={setServiceRadius} style={styles.input} placeholderTextColor={Colors.icon} placeholder="e.g. 25" />
                </View>
              </View>
            </>
          )}
        </View>

        <PressableScale haptics style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
        </PressableScale>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  profileHeader: { marginHorizontal: 20, borderRadius: 20, padding: 24, backgroundColor: Colors.surface, alignItems: 'center', marginBottom: 12, gap: 16 },
  avatarLarge: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700', fontFamily: 'monospace' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  uploadText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  formCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, backgroundColor: Colors.surface, marginBottom: 12, gap: 20 },
  field: { gap: 8 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  textArea: { borderRadius: 10, padding: 16, fontSize: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, color: Colors.text, minHeight: 100 },
  saveBtn: { marginHorizontal: 20, borderRadius: 12, paddingVertical: 16, backgroundColor: Colors.primary, alignItems: 'center', marginBottom: 8 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
