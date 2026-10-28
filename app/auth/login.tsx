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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const passwordRef = useRef<any>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.login(email.trim(), password.trim());
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
      Alert.alert('Login Failed', error.message || 'Invalid email or password.');
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Forgot Password',
      'Enter your registered email address to receive password reset instructions:',
      async (targetEmail) => {
        if (!targetEmail || !targetEmail.trim()) return;
        try {
          const res = await api.forgotPassword(targetEmail.trim());
          Alert.alert('Reset Link Sent', res.msg || 'If that email exists in our system, password reset instructions have been sent.');
        } catch (err: any) {
          Alert.alert('Notice', err.message || 'Please contact support or check your email.');
        }
      },
      'plain-text',
      email.trim()
    );
  };

  const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const keyboardProps = Platform.OS === 'ios' ? { behavior: 'padding' as const, style: styles.flex } : { style: styles.flex };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Floating Background Icons (Matching KaAyos Web) */}
      <View style={styles.bgIcons} pointerEvents="none">
        <Ionicons name="build-outline" size={54} color="#FFFFFF" style={[styles.bgIcon, { top: '6%', left: '4%' }]} />
        <Ionicons name="flash-outline" size={42} color="#FFFFFF" style={[styles.bgIcon, { top: '15%', right: '6%' }]} />
        <Ionicons name="color-palette-outline" size={48} color="#FFFFFF" style={[styles.bgIcon, { top: '38%', left: '2%' }]} />
        <Ionicons name="hammer-outline" size={44} color="#FFFFFF" style={[styles.bgIcon, { top: '55%', right: '4%' }]} />
        <Ionicons name="shield-checkmark-outline" size={46} color="#FFFFFF" style={[styles.bgIcon, { bottom: '12%', left: '8%' }]} />
        <Ionicons name="star-outline" size={38} color="#FFFFFF" style={[styles.bgIcon, { bottom: '8%', right: '10%' }]} />
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
            {/* Card Headings */}
            <View style={styles.head}>
              <Text style={styles.eyebrow}>WELCOME BACK</Text>
              <Text style={styles.title}>Sign in to your account</Text>
              <Text style={styles.subtitle}>Find and book trusted workers near you.</Text>
            </View>

            {/* Email Field */}
            <FormInput
              label="Email address"
              icon="mail-outline"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password Field */}
            <FormInput
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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

            {/* Options Row: Remember Me & Forgot Password */}
            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={styles.checkWrap}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={rememberMe ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={rememberMe ? '#1A6FC4' : '#A8AFB8'}
                />
                <Text style={styles.checkLabel}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <PressableScale haptics style={styles.submitBtn} onPress={handleSignIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.submitText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </PressableScale>

            {/* Footer / Switch to Register */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/auth/register" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign up</Text>
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
    paddingHorizontal: 20,
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
    marginBottom: 20,
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
    paddingVertical: 32,
    paddingHorizontal: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  head: {
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#1A6FC4',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#042C53',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#6E7A88',
    lineHeight: 18,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#202B36',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E3DED2',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
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
    fontSize: 14.5,
    color: '#202B36',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    height: '100%',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: 2,
  },
  checkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkLabel: {
    fontSize: 13,
    color: '#202B36',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A6FC4',
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
    marginTop: 20,
  },
  footerText: {
    fontSize: 13.5,
    color: '#6E7A88',
  },
  footerLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A6FC4',
  },
});
