import { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useSegments, useRouter } from 'expo-router';

const TAB_ROUTES = ['index', 'bookings', 'chat', 'profile'];

export function SwipeableTabContainer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const translateX = useSharedValue(0);

  const currentTab = segments.filter(s => s !== '(tabs)').pop() || 'index';
  const currentIndex = TAB_ROUTES.indexOf(currentTab);

  const navigateToTab = (index: number) => {
    if (index < 0 || index >= TAB_ROUTES.length) return;
    translateX.value = 0;
    const route = TAB_ROUTES[index];
    if (route === 'index') {
      router.replace('/(tabs)' as any);
    } else {
      router.replace(`/(tabs)/${route}` as any);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const absX = Math.abs(event.translationX);
      const absVX = Math.abs(event.velocityX);
      const canGoNext = currentIndex < TAB_ROUTES.length - 1;
      const canGoPrev = currentIndex > 0;

      if ((absVX > 400 || absX > 80) && event.translationX < 0 && canGoNext) {
        translateX.value = withSpring(0, { stiffness: 200, damping: 20 });
        runOnJS(navigateToTab)(currentIndex + 1);
      } else if ((absVX > 400 || absX > 80) && event.translationX > 0 && canGoPrev) {
        translateX.value = withSpring(0, { stiffness: 200, damping: 20 });
        runOnJS(navigateToTab)(currentIndex - 1);
      } else {
        translateX.value = withSpring(0, { stiffness: 200, damping: 20 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
