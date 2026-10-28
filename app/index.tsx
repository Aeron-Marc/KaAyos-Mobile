import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Official KaAyos Brand Colors from landing.css
const BRAND_NAVY = '#042C53'; // var(--b9)
const BRAND_ACCENT = '#378ADD'; // var(--b4)
const BRAND_LIGHT = '#85B7EB';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [minTimerDone, setMinTimerDone] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current; // Screen fade-out
  const floatAnim = useRef(new Animated.Value(0)).current; // Gentle floating
  const flipAnim = useRef(new Animated.Value(0)).current; // 3D card flip between KaAyos and PESO
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  // Background floating shapes animations
  const shape1Anim = useRef(new Animated.Value(0)).current;
  const shape2Anim = useRef(new Animated.Value(0)).current;
  const shape3Anim = useRef(new Animated.Value(0)).current;

  // Minimum show timer (800ms) matching Web preloader MIN_SHOW_MS
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimerDone(true);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  // Continuous floating animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating background shapes
    Animated.loop(
      Animated.sequence([
        Animated.timing(shape1Anim, {
          toValue: -15,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shape1Anim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shape2Anim, {
          toValue: 12,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shape2Anim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shape3Anim, {
          toValue: -10,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shape3Anim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered loading dots
    const pulseDot = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(800 - delay),
        ])
      ).start();
    };
    pulseDot(dot1Anim, 0);
    pulseDot(dot2Anim, 200);
    pulseDot(dot3Anim, 400);

    // 3D Flip logo sequence (Phase 1: KaAyos -> Phase 2: PESO -> Phase 3: KaAyos)
    const flipTimer = setTimeout(() => {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 450);

    return () => clearTimeout(flipTimer);
  }, []);

  // When auth state is settled AND minTimer is reached, fade out and redirect
  useEffect(() => {
    if (!isLoading && minTimerDone && !isNavigating) {
      setIsNavigating(true);

      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (!user) {
          router.replace('/auth/login');
        } else if (user.role === 'worker') {
          router.replace('/(tabs-provider)');
        } else {
          router.replace('/(tabs)');
        }
      });
    }
  }, [isLoading, minTimerDone, user, isNavigating]);

  // 3D Flip interpolations
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* ── BACKGROUND FLOATING SHAPES (identical to Web landing.css .ls-shape) ── */}
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsCircleMain,
          { transform: [{ translateY: shape1Anim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsSquareMain,
          { transform: [{ translateY: shape2Anim }, { rotate: '25deg' }] },
        ]}
      />
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsRingMain,
          { transform: [{ translateY: shape3Anim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsDiamondMain,
          { transform: [{ translateY: shape1Anim }, { rotate: '45deg' }] },
        ]}
      />
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsCircleTiny,
          { transform: [{ translateY: shape2Anim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.lsShape,
          styles.lsRingTiny,
          { transform: [{ translateY: shape3Anim }] },
        ]}
      />

      {/* ── CENTER LOGO CONTAINER ── */}
      <Animated.View
        style={[
          styles.centerBox,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <View style={styles.cardWrapper}>
          {/* Front: Official KaAyos Logo */}
          <Animated.View
            style={[
              styles.logoCard,
              {
                opacity: frontOpacity,
                transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/KaAyos_Logo_Mobile.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Back: Official PESO Tuy Partner Logo */}
          <Animated.View
            style={[
              styles.logoCard,
              styles.logoCardBack,
              {
                opacity: backOpacity,
                transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/peso-logo.png')}
              style={styles.pesoLogoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Brand Titles */}
        <Text style={styles.brandTitle}>KaAyos</Text>
        <Text style={styles.brandSubtitle}>Tuy, Batangas • Verified Home Services</Text>

        {/* Pulsing Dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
        </View>
      </Animated.View>

      {/* Bottom Footer Notice */}
      <View style={styles.footerNotice}>
        <Text style={styles.footerText}>In partnership with PESO Tuy</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  // Floating Background Shapes
  lsShape: {
    position: 'absolute',
    opacity: 0.28,
  },
  lsCircleMain: {
    top: SCREEN_HEIGHT * 0.14,
    left: SCREEN_WIDTH * 0.1,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND_ACCENT,
  },
  lsSquareMain: {
    bottom: SCREEN_HEIGHT * 0.18,
    right: SCREEN_WIDTH * 0.12,
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: BRAND_ACCENT,
  },
  lsRingMain: {
    bottom: SCREEN_HEIGHT * 0.14,
    left: SCREEN_WIDTH * 0.14,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3.5,
    borderColor: BRAND_ACCENT,
    backgroundColor: 'transparent',
  },
  lsDiamondMain: {
    top: SCREEN_HEIGHT * 0.12,
    right: SCREEN_WIDTH * 0.18,
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: BRAND_ACCENT,
  },
  lsCircleTiny: {
    top: SCREEN_HEIGHT * 0.32,
    right: SCREEN_WIDTH * 0.12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND_LIGHT,
  },
  lsRingTiny: {
    top: SCREEN_HEIGHT * 0.26,
    left: SCREEN_WIDTH * 0.22,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BRAND_LIGHT,
    backgroundColor: 'transparent',
  },

  // Center Presentation
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoCard: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoCardBack: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  pesoLogoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: BRAND_LIGHT,
    letterSpacing: 0.3,
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_LIGHT,
  },

  // Footer
  footerNotice: {
    position: 'absolute',
    bottom: 34,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.4,
  },
});
