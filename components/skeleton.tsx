import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      <View style={styles.topRow}>
        <View style={styles.avatar} />
        <View style={styles.nameBlock}>
          <View style={styles.nameLine} />
          <View style={styles.subLine} />
        </View>
        <View style={styles.badge} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaLine} />
        <View style={styles.priceLine} />
      </View>
      <View style={styles.skillsRow}>
        <View style={styles.skill} />
        <View style={styles.skill} />
        <View style={styles.skill} />
      </View>
    </Animated.View>
  );
}

export function SkeletonCardAlt({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.cardAlt, animatedStyle, style]}>
      <View style={styles.lineWide} />
      <View style={styles.lineMedium} />
      <View style={styles.lineShort} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 18, backgroundColor: Colors.surface,
    marginBottom: 10, marginHorizontal: 20,
  },
  cardAlt: {
    borderRadius: 16, padding: 20, backgroundColor: Colors.surface,
    marginBottom: 12, marginHorizontal: 20, gap: 12,
  },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.border },
  nameBlock: { flex: 1, gap: 6 },
  nameLine: { height: 14, width: '60%', borderRadius: 4, backgroundColor: Colors.border },
  subLine: { height: 10, width: '40%', borderRadius: 4, backgroundColor: Colors.border },
  badge: { width: 40, height: 22, borderRadius: 8, backgroundColor: Colors.border },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  metaLine: { height: 12, width: '30%', borderRadius: 4, backgroundColor: Colors.border },
  priceLine: { height: 12, width: '20%', borderRadius: 4, backgroundColor: Colors.border },
  skillsRow: { flexDirection: 'row', gap: 6 },
  skill: { height: 24, width: 60, borderRadius: 8, backgroundColor: Colors.border },
  lineWide: { height: 16, width: '70%', borderRadius: 4, backgroundColor: Colors.border },
  lineMedium: { height: 12, width: '50%', borderRadius: 4, backgroundColor: Colors.border },
  lineShort: { height: 12, width: '30%', borderRadius: 4, backgroundColor: Colors.border },
});
