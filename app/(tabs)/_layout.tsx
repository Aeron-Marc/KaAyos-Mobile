import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { SwipeableTabContainer } from '@/components/swipeable-tabs';
import { AnimatedTabIcon } from '@/components/animated-tab-icon';

export default function TabLayout() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <SwipeableTabContainer>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.tabIconSelected,
          tabBarInactiveTintColor: Colors.tabIconDefault,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon name="home-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon name="calendar-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon name="chatbubble-ellipses-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon name="person-outline" focused={focused} color={color} />
            ),
          }}
        />
      </Tabs>
      </SwipeableTabContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
});
