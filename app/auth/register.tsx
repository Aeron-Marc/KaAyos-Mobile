import { StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { PressableScale } from '@/components/pressable-scale';

export default function RegisterScreen() {
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
              <Text style={styles.tagline}>Join today</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor={Colors.icon}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.icon}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={Colors.icon}
                  style={styles.input}
                  secureTextEntry
                />
              </View>

              <PressableScale haptics style={styles.button} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.buttonText}>Create Account</Text>
              </PressableScale>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Link href="/auth/login" asChild>
                  <PressableScale>
                    <Text style={styles.link}>Sign in</Text>
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
  header: { alignItems: 'center', marginBottom: 48 },
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
