import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { getMlApiConfigError, mlApiUrl } from '../../lib/mlApi';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { FloatingOrb } from '../../components/AnimatedUI';

const TECH_ITEMS = [
  { name: 'React Native', icon: 'logo-react', color: BrandColors.cyan },
  { name: 'Expo', icon: 'phone-portrait-outline', color: BrandColors.purple },
  { name: 'TypeScript', icon: 'code-slash-outline', color: BrandColors.blue },
  { name: 'Supabase', icon: 'cloud-outline', color: BrandColors.emerald },
  { name: 'FastAPI (ML)', icon: 'flask-outline', color: BrandColors.orange },
  { name: 'TensorFlow', icon: 'hardware-chip-outline', color: BrandColors.pink },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const mlApiConfigError = getMlApiConfigError();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const email = user?.email || 'Unknown';
  const fullName = user?.user_metadata?.full_name || 'PERA-SAM User';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerIconBg}>
          <Ionicons name="person" size={18} color={BrandColors.white} />
        </View>
        <Text style={styles.headerTitle}>Profile</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar & Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.profileCard}>
            {/* Gradient background */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.xl }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5, borderRadius: BorderRadius.xl }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.pink, opacity: 0.2, borderRadius: BorderRadius.xl, top: '50%' }]} />
            <FloatingOrb color="#fff" size={50} top={-10} right={20} delay={0} />
            <FloatingOrb color={BrandColors.pink} size={30} top={40} left={10} delay={500} />

            <View style={styles.profileContent}>
              {/* Avatar with gradient ring */}
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.memberBadge}>
                <Ionicons name="shield-checkmark" size={14} color={BrandColors.white} />
                <Text style={styles.memberText}>Member since {createdAt}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/history' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: BrandColors.purpleLight }]}>
              <Ionicons name="time" size={22} color={BrandColors.purple} />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/analysis' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: BrandColors.accentLight }]}>
              <Ionicons name="mic" size={22} color={BrandColors.accent} />
            </View>
            <Text style={styles.quickActionLabel}>Analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/requests' as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: BrandColors.blueLight }]}>
              <Ionicons name="chatbubbles" size={22} color={BrandColors.blue} />
            </View>
            <Text style={styles.quickActionLabel}>Requests</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Settings Sections */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="server-outline"
              label="ML Backend URL"
              value={mlApiConfigError ? 'Setup needed' : mlApiUrl}
              valueColor={mlApiConfigError ? BrandColors.warning : BrandColors.success}
              iconColor={BrandColors.orange}
            />
            <SettingsRow
              icon="cloud-outline"
              label="Supabase"
              value={isSupabaseConfigured ? 'Configured' : 'Setup needed'}
              valueColor={isSupabaseConfigured ? BrandColors.success : BrandColors.warning}
              iconColor={BrandColors.emerald}
            />
            <SettingsRow
              icon="phone-portrait-outline"
              label="Platform"
              value={`Expo SDK 54`}
              iconColor={BrandColors.purple}
              last
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon="information-circle-outline" label="App Version" value="1.0.0" iconColor={BrandColors.blue} />
            <SettingsRow
              icon="school-outline"
              label="Team"
              value="Invictus-Team29"
              iconColor={BrandColors.indigo}
            />
            <SettingsRow
              icon="business-outline"
              label="University"
              value="University of Peradeniya"
              iconColor={BrandColors.cyan}
            />
            <TouchableOpacity
              onPress={() => {
                Linking.openURL('https://github.com/cepdnaclk/e22-co2060-PERA-SAM');
              }}
            >
              <SettingsRow
                icon="logo-github"
                label="GitHub Repository"
                value="Open →"
                valueColor={BrandColors.indigo}
                iconColor={BrandColors.foreground}
                last
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Technologies */}
        <Animated.View entering={FadeInDown.duration(500).delay(600)}>
          <Text style={styles.sectionTitle}>Technologies</Text>
          <View style={styles.techGrid}>
            {TECH_ITEMS.map((tech) => (
              <View key={tech.name} style={[styles.techChip, { borderColor: `${tech.color}30` }]}>
                <Ionicons name={tech.icon as any} size={14} color={tech.color} />
                <Text style={[styles.techChipText, { color: tech.color }]}>{tech.name}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.duration(500).delay(700)}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color={BrandColors.rose} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footer}>
          PERA-SAM — Predictive Equipment Reliability{'\n'}& Acoustics Sound Analysis Manager
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  valueColor,
  iconColor,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingsRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || BrandColors.mutedForeground) + '15' }]}>
          <Ionicons name={icon as any} size={16} color={iconColor || BrandColors.mutedForeground} />
        </View>
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.settingsValue, valueColor ? { color: valueColor } : {}]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.white,
    ...Shadows.sm,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BrandColors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },

  scroll: { padding: 20, paddingBottom: 40 },

  // Profile card
  profileCard: {
    borderRadius: BorderRadius.xl,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    minHeight: 200,
  },
  profileContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: BrandColors.indigo,
  },
  profileName: {
    ...Typography.h2,
    color: BrandColors.white,
    marginBottom: 4,
  },
  profileEmail: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  memberText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  quickAction: {
    flex: 1,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    ...Typography.caption,
    color: BrandColors.foreground,
    fontWeight: '700',
  },

  // Sections
  sectionTitle: {
    ...Typography.label,
    color: BrandColors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: 24,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.muted,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingsIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsLabel: {
    ...Typography.body,
    color: BrandColors.foreground,
    fontSize: 15,
  },
  settingsValue: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
    maxWidth: 160,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Tech grid
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  techChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: BrandColors.roseLight,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.15)',
  },
  signOutText: {
    ...Typography.button,
    color: BrandColors.rose,
    fontWeight: '700',
  },

  // Footer
  footer: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
});
