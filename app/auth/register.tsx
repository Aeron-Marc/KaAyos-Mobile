import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInputProps,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/pressable-scale';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

type RegisterRole = 'client' | 'provider';

interface FormInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightElement?: React.ReactNode;
}

const FormInput = React.forwardRef<any, FormInputProps>(
  ({ label, icon, rightElement, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const innerRef = useRef<any>(null);

    const handleBoxPress = () => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.focus();
      } else if (innerRef.current) {
        innerRef.current.focus();
      }
    };

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleBoxPress}
          style={[styles.inputWrap, isFocused && styles.inputWrapFocused]}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isFocused ? '#1A6FC4' : '#6E7A88'}
              style={styles.inputIcon}
            />
          )}
          <TextInput
            ref={(node) => {
              innerRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref && 'current' in ref) {
                (ref as React.MutableRefObject<any>).current = node;
              }
            }}
            placeholderTextColor="#A8AFB8"
            cursorColor="#1A6FC4"
            selectionColor="rgba(26, 111, 196, 0.3)"
            style={[styles.input, style]}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightElement}
        </TouchableOpacity>
      </View>
    );
  }
);
FormInput.displayName = 'FormInput';

export default function RegisterScreen() {
  const [role, setRole] = useState<RegisterRole>('client');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  // Input refs for smooth keyboard next navigation
  const lastNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  const handleCreateAccount = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please complete all required fields (Name, Email, and Password).');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role: role === 'provider' ? 'worker' : 'client',
      });
      if (response.success) {
        signIn(response.user, response.token);
        setLoading(false);
        const userRole = response.user.role;
        if (userRole === 'worker') {
          router.replace('/(tabs-provider)' as any);
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create your account.');
    }
    setLoading(false);
  };

  const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const keyboardProps = Platform.OS === 'ios' ? { behavior: 'padding' as const, style: styles.flex } : { style: styles.flex };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Floating Background Icons (Matching KaAyos Web) */}
      <View style={styles.bgIcons} pointerEvents="none">
        <Ionicons name="build-outline" size={54} color="#FFFFFF" style={[styles.bgIcon, { top: '5%', left: '4%' }]} />
        <Ionicons name="flash-outline" size={42} color="#FFFFFF" style={[styles.bgIcon, { top: '12%', right: '5%' }]} />
        <Ionicons name="hammer-outline" size={46} color="#FFFFFF" style={[styles.bgIcon, { top: '35%', right: '3%' }]} />
        <Ionicons name="color-palette-outline" size={48} color="#FFFFFF" style={[styles.bgIcon, { top: '48%', left: '3%' }]} />
        <Ionicons name="shield-checkmark-outline" size={44} color="#FFFFFF" style={[styles.bgIcon, { bottom: '10%', left: '6%' }]} />
        <Ionicons name="star-outline" size={36} color="#FFFFFF" style={[styles.bgIcon, { bottom: '6%', right: '8%' }]} />
      </View>

      <KeyboardWrapper {...keyboardProps}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('@/assets/images/KaAyos_Logo_Mobile.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>KaAyos</Text>
          </View>

          {/* White Card Container (Matching Web .auth-card) */}
          <View style={styles.card}>
            {/* Step Progress & Eyebrow */}
            <View style={styles.stepMeta}>
              <Text style={styles.stepCount}>ACCOUNT SETUP</Text>
              <View style={styles.stepTrack}>
                <View style={[styles.stepSeg, styles.stepSegActive]} />
                <View style={[styles.stepSeg, styles.stepSegActive]} />
              </View>
            </View>

            <View style={styles.head}>
              <Text style={styles.eyebrow}>GET STARTED</Text>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Pick your role and tell us about you to get started.</Text>
            </View>

            {/* Role Selection Cards (Matching Web role-cards) */}
            <Text style={styles.sectionLabel}>WHO'S THIS ACCOUNT FOR?</Text>
            <View style={styles.roleCards}>
              {/* Client Card */}
              <TouchableOpacity
                style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
                onPress={() => setRole('client')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIconBox, role === 'client' && styles.roleIconBoxActive]}>
                  <Ionicons
                    name="person"
                    size={20}
                    color={role === 'client' ? '#FFFFFF' : '#6E7A88'}
                  />
                </View>
                <View style={styles.roleBody}>
                  <Text style={[styles.roleTitle, role === 'client' && styles.roleTitleActive]}>
                    I'm a Client
                  </Text>
                  <Text style={styles.roleSub}>
                    I want to find and hire trusted workers nearby
                  </Text>
                </View>
                <View style={[styles.radioCircle, role === 'client' && styles.radioCircleActive]}>
                  {role === 'client' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              {/* Worker / Provider Card */}
              <TouchableOpacity
                style={[styles.roleCard, role === 'provider' && styles.roleCardActive]}
                onPress={() => setRole('provider')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIconBox, role === 'provider' && styles.roleIconBoxActive]}>
                  <Ionicons
                    name="construct"
                    size={20}
                    color={role === 'provider' ? '#FFFFFF' : '#6E7A88'}
                  />
                </View>
                <View style={styles.roleBody}>
                  <Text style={[styles.roleTitle, role === 'provider' && styles.roleTitleActive]}>
                    I'm a Worker
                  </Text>
                  <Text style={styles.roleSub}>
                    I want to offer my trade and get matched to jobs
                  </Text>
                </View>
                <View style={[styles.radioCircle, role === 'provider' && styles.radioCircleActive]}>
                  {role === 'provider' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>YOUR DETAILS</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Name Fields (2 Columns like Web grid-2) */}
            <View style={styles.grid2}>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="First name"
                  placeholder="Juan"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>

              <View style={{ flex: 1 }}>
                <FormInput
                  ref={lastNameRef}
                  label="Last name"
                  placeholder="dela Cruz"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email Field */}
            <FormInput
              ref={emailRef}
              label="Email address"
              icon="mail-outline"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />

            {/* Phone Number Field */}
            <FormInput
              ref={phoneRef}
              label="Mobile phone number"
              icon="call-outline"
              placeholder="0912 345 6789"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password Field */}
            <FormInput
              ref={passwordRef}
              label="Password (min. 8 characters)"
              icon="lock-closed-outline"
              placeholder="Create a strong password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              rightElement={
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6E7A88"
                  />
                </TouchableOpacity>
              }
            />

            {/* Confirm Password Field */}
            <FormInput
              ref={confirmPasswordRef}
              label="Confirm password"
              icon="shield-checkmark-outline"
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleCreateAccount}
              rightElement={
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#6E7A88"
                  />
                </TouchableOpacity>
              }
            />

            {/* Terms Note */}
            <Text style={styles.termsText}>
              By creating an account, you agree to KaAyos Verified Service Guidelines & Privacy Policy.
            </Text>

            {/* Submit Button */}
            <PressableScale haptics style={styles.submitBtn} onPress={handleCreateAccount} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>Create Account</Text>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </PressableScale>

            {/* Footer / Switch to Login */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#042C53',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  bgIcons: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  bgIcon: {
    position: 'absolute',
    opacity: 0.08,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 10,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stepCount: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6E7A88',
    letterSpacing: 0.8,
  },
  stepTrack: {
    flexDirection: 'row',
    gap: 5,
  },
  stepSeg: {
    width: 24,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#E3DED2',
  },
  stepSegActive: {
    backgroundColor: '#1A6FC4',
  },
  head: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#1A6FC4',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#042C53',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6E7A88',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E7A88',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  roleCards: {
    gap: 10,
    marginBottom: 18,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3DED2',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  roleCardActive: {
    borderColor: '#1A6FC4',
    backgroundColor: '#EAF3FC',
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#F1ECE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: {
    backgroundColor: '#1A6FC4',
  },
  roleBody: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#042C53',
    marginBottom: 2,
  },
  roleTitleActive: {
    color: '#042C53',
  },
  roleSub: {
    fontSize: 11.5,
    color: '#6E7A88',
    lineHeight: 15,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#E3DED2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#1A6FC4',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A6FC4',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E3DED2',
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6E7A88',
    letterSpacing: 0.8,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#202B36',
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3DED2',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapFocused: {
    borderColor: '#1A6FC4',
    backgroundColor: '#FBFDFF',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#202B36',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    height: '100%',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 11.5,
    color: '#6E7A88',
    lineHeight: 16,
    marginBottom: 18,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#1A6FC4',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A6FC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#6E7A88',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A6FC4',
  },
});
