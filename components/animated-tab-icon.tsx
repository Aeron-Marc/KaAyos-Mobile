import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';

type IoniconsName = keyof typeof Ionicons.glyphMap;

type Props = {
  name: IoniconsName;
  focused: boolean;
  color: string;
};

export function AnimatedTabIcon({ name, focused, color }: Props) {
  const animation = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    animation.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused]);

  const iconScale = useAnimatedStyle(() => {
    const scale = interpolate(animation.value, [0, 1], [1, 1.35]);
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View style={iconScale}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
}
