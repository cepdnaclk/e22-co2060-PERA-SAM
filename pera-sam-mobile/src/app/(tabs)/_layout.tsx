import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { BrandColors } from '../../constants/theme';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  activeColor: string;
}[] = [
  { name: 'dashboard', title: 'Home', icon: 'grid-outline', iconFocused: 'grid', activeColor: BrandColors.indigo },
  { name: 'analysis', title: 'Analysis', icon: 'mic-outline', iconFocused: 'mic', activeColor: BrandColors.accent },
  { name: 'map', title: 'Map', icon: 'map-outline', iconFocused: 'map', activeColor: BrandColors.blue },
  { name: 'requests', title: 'Requests', icon: 'chatbubbles-outline', iconFocused: 'chatbubbles', activeColor: BrandColors.purple },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconFocused: 'person', activeColor: BrandColors.pink },
];

// Hidden tabs that remain navigable but don't show in the bottom bar
const HIDDEN_TABS = ['history'];

// ── Animated Badge ──────────────────────────────────────────────────────────
function AnimatedBadge({ count }: { count: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    } else {
      scale.value = withSpring(0, { damping: 10, stiffness: 200 });
    }
  }, [count, scale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badge, badgeStyle]}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
}

// ── Animated Tab Icon ───────────────────────────────────────────────────────
function AnimatedTabIcon({
  focused,
  color,
  tab,
  unreadCount,
}: {
  focused: boolean;
  color: string;
  tab: (typeof TAB_ITEMS)[number];
  unreadCount: number;
}) {
  const scale = useSharedValue(1);
  const dotOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.12, { damping: 8, stiffness: 200 });
      dotOpacity.value = withSpring(1, { damping: 12 });
      bgOpacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 10, stiffness: 180 });
      dotOpacity.value = withTiming(0, { duration: 150 });
      bgOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [focused, scale, dotOpacity, bgOpacity]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotAnimStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotOpacity.value }],
  }));

  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <View style={styles.iconContainer}>
      {/* Active background glow */}
      <Animated.View
        style={[
          styles.iconActiveBg,
          { backgroundColor: `${tab.activeColor}12` },
          bgAnimStyle,
        ]}
      />
      <Animated.View style={iconAnimStyle}>
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={focused ? 23 : 21}
          color={color}
        />
      </Animated.View>
      {/* Active dot indicator */}
      <Animated.View
        style={[
          styles.activeDot,
          { backgroundColor: tab.activeColor },
          dotAnimStyle,
        ]}
      />
      {/* Unread badge for Requests tab */}
      {tab.name === 'requests' && <AnimatedBadge count={unreadCount} />}
    </View>
  );
}

// ── Main Layout ─────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread request messages count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const { count } = await (supabase as any)
          .from('request_messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .neq('sender_id', user.id);

        if (count !== null) setUnreadCount(count);
      } catch {
        // Table might not exist
      }
    };

    fetchUnread();

    // Real-time subscription for message updates
    const channel = supabase
      .channel('tab-unread-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_messages',
        },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.indigo,
        tabBarInactiveTintColor: BrandColors.mutedForeground,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarActiveTintColor: tab.activeColor,
            tabBarIcon: ({ focused, color }) => (
              <AnimatedTabIcon
                focused={focused}
                color={color}
                tab={tab}
                unreadCount={unreadCount}
              />
            ),
          }}
        />
      ))}
      {/* Hidden tabs — still routable but not shown in tab bar */}
      {HIDDEN_TABS.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            href: null, // Hides from tab bar
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  tabItem: {
    paddingTop: 2,
  },
  iconContainer: {
    width: 48,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconActiveBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BrandColors.rose,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: BrandColors.white,
    letterSpacing: 0.3,
  },
});
