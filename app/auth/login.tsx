import { useState } from 'react';
import { StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Text, View, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

type LoginRole = 'homeowner' | 'provider';

export default function LoginScreen() {
  const [role, setRole] = useState<LoginRole>('homeowner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.login(email.trim(), password.trim());
      if (response.success) {
        signIn(response.user);
        const userRole = response.user.role;
        if (userRole === 'worker') {
          router.replace('/(tabs-provider)' as any);
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>K</Text>
              </View>
              <Text style={styles.appName}>KaAyos</Text>
              <Text style={styles.tagline}>Welcome back</Text>
            </View>

            <View style={styles.roleToggle}>
              <PressableScale
                style={[styles.roleOption, role === 'homeowner' && styles.roleOptionActive]}
                onPress={() => setRole('homeowner')}
              >
                <Text style={[styles.roleText, role === 'homeowner' && styles.roleTextActive]}>Homeowner</Text>
              </PressableScale>
              <PressableScale
                style={[styles.roleOption, role === 'provider' && styles.roleOptionActive]}
                onPress={() => setRole('provider')}
              >
                <Text style={[styles.roleText, role === 'provider' && styles.roleTextActive]}>Provider</Text>
              </PressableScale>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.icon}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={Colors.icon}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <PressableScale haptics style={styles.button} onPress={handleSignIn} disabled={loading}>
                <Text style={styles.buttonText}>
                  {loading ? 'Signing in...' : role === 'provider' ? 'Sign In as Provider' : 'Sign In'}
                </Text>
              </PressableScale>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Link href="/auth/register" asChild>
                  <PressableScale>
                    <Text style={styles.link}>Sign up</Text>
                  </PressableScale>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  header: { alignItems: 'center', marginBottom: 32 },
  roleToggle: { flexDirection: 'row', marginHorizontal: 28, marginBottom: 24, borderRadius: 12, backgroundColor: Colors.surface, padding: 4 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  roleOptionActive: { backgroundColor: Colors.primary },
  roleText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  roleTextActive: { color: '#fff' },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '700', fontFamily: 'monospace' },
  appName: { fontSize: 30, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  tagline: { fontSize: 16, color: Colors.textSecondary },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  button: { height: 52, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  link: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
