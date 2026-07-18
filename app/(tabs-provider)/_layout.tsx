import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { SwipeableTabContainer } from '@/components/swipeable-tabs';
import { AnimatedTabIcon } from '@/components/animated-tab-icon';

const PROVIDER_TAB_ROUTES = ['index', 'jobs', 'messages', 'profile'];

export default function ProviderTabLayout() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <SwipeableTabContainer routes={PROVIDER_TAB_ROUTES}>
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
              title: 'Dashboard',
              tabBarIcon: ({ focused, color }) => (
                <AnimatedTabIcon name="grid-outline" focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="jobs"
            options={{
              title: 'Jobs',
              tabBarIcon: ({ focused, color }) => (
                <AnimatedTabIcon name="briefcase-outline" focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
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
