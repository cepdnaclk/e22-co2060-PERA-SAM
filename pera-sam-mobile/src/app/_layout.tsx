import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BrandColors } from '../../constants/theme';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: IoniconsName; iconFocused: IoniconsName; activeColor: string }[] = [
  { name: 'dashboard', title: 'Home', icon: 'grid-outline', iconFocused: 'grid', activeColor: BrandColors.indigo },
  { name: 'analysis', title: 'Analysis', icon: 'mic-outline', iconFocused: 'mic', activeColor: BrandColors.accent },
  { name: 'map', title: 'Map', icon: 'map-outline', iconFocused: 'map', activeColor: BrandColors.blue },
  { name: 'requests', title: 'Requests', icon: 'chatbubbles-outline', iconFocused: 'chatbubbles', activeColor: BrandColors.purple },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconFocused: 'person', activeColor: BrandColors.pink },
];

// Hidden tabs that remain navigable but don't show in the bottom bar
const HIDDEN_TABS = ['history'];

function AnimatedBadge({ count }: { count: number }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      scale.value = withSpring(0, { damping: 12, stiffness: 180 });
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
              <View style={[styles.iconWrap, focused && { backgroundColor: `${tab.activeColor}15` }]}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={focused ? 22 : 20}
                  color={color}
                />
                {/* Unread badge for Requests tab */}
                {tab.name === 'requests' && (
                  <AnimatedBadge count={unreadCount} />
                )}
              </View>
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
    backgroundColor: BrandColors.white,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 90 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 10,
    elevation: 12,
    shadowColor: BrandColors.indigo,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 4,
  },
  iconWrap: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BrandColors.rose,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: BrandColors.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.white,
  },
});
