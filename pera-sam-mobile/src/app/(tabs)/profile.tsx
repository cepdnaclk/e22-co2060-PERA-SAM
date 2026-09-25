import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { getMlApiConfigError } from '../../lib/mlApi';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useLanguage, LANGUAGES } from '../../lib/i18n';
import { useAppTheme, ThemeMode } from '../../lib/ThemeContext';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { ProfileEditor } from '../../components/ProfileEditor';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { t, language, setLanguage } = useLanguage();
  const { mode, setMode, isDark, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const mlApiConfigError = getMlApiConfigError();

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('signOutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const email = user?.email || 'user@perasam.org';
  const fullName = user?.user_metadata?.full_name || 'PERA-SAM Engineer';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '2026';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <View style={styles.headerIconBg}>
          <Ionicons name="person" size={18} color={BrandColors.white} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t('profileTitle')}
        </Text>
      </Animated.View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}>
        {/* Avatar & Info Banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.profileCard}>
            {/* Gradient background */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.xl },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: BrandColors.purple, opacity: 0.6, borderRadius: BorderRadius.xl },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: BrandColors.pink,
                  opacity: 0.25,
                  borderRadius: BorderRadius.xl,
                  top: '50%',
                },
              ]}
            />
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
                <Text style={styles.memberText}>
                  {t('memberSince')} {createdAt}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <ProfileEditor key={user?.id ?? 'signed-out'} />

        {/* ── Language Selector (English, Sinhala, Tamil) ───────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {t('language')}
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.languageOptionsContainer}>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOptionBtn,
                      {
                        backgroundColor: isActive
                          ? isDark
                            ? 'rgba(99, 102, 241, 0.25)'
                            : BrandColors.indigoLight
                          : colors.muted,
                        borderColor: isActive ? colors.indigo : 'transparent',
                      },
                    ]}
                    onPress={() => setLanguage(lang.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <View style={styles.langTextContainer}>
                      <Text
                        style={[
                          styles.langNativeLabel,
                          {
                            color: isActive
                              ? colors.indigo
                              : colors.foreground,
                            fontWeight: isActive ? '800' : '600',
                          },
                        ]}
                      >
                        {lang.nativeLabel}
                      </Text>
                      <Text
                        style={[
                          styles.langSubLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.indigo}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Appearance & Dark Mode ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {t('appearance')}
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.themeSelectorRow}>
              {[
                { id: 'light', labelKey: 'modeLight', icon: 'sunny-outline' },
                { id: 'dark', labelKey: 'modeDark', icon: 'moon-outline' },
                { id: 'system', labelKey: 'modeSystem', icon: 'phone-portrait-outline' },
              ].map((item) => {
                const isSelected = mode === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.themePill,
                      {
                        backgroundColor: isSelected
                          ? colors.indigo
                          : isDark
                          ? '#1e293b'
                          : colors.muted,
                      },
                    ]}
                    onPress={() => setMode(item.id as ThemeMode)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isSelected ? BrandColors.white : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.themePillText,
                        {
                          color: isSelected
                            ? BrandColors.white
                            : colors.foreground,
                        },
                      ]}
                    >
                      {t(item.labelKey as any)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {t('quickAccess')}
          </Text>
        </Animated.View>
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.quickActionsRow}
        >
          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/history' as any)}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: BrandColors.purpleLight },
              ]}
            >
              <Ionicons name="time" size={22} color={BrandColors.purple} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
              {t('tabHistory')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/analysis' as any)}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: BrandColors.accentLight },
              ]}
            >
              <Ionicons name="mic" size={22} color={BrandColors.accent} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
              {t('tabAnalysis')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/(tabs)/map' as any)}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: BrandColors.blueLight },
              ]}
            >
              <Ionicons name="construct" size={22} color={BrandColors.blue} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
              {t('tabTechnicians')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Settings Sections */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {t('configuration')}
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <SettingsRow
              icon="server-outline"
              label="ML Backend API"
              value={mlApiConfigError ? 'Setup needed' : 'Azure Cloud Connected'}
              valueColor={mlApiConfigError ? BrandColors.warning : BrandColors.success}
              iconColor={BrandColors.orange}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <SettingsRow
              icon="cloud-outline"
              label="Supabase Cloud"
              value={isSupabaseConfigured ? 'Connected' : 'Demo Mode'}
              valueColor={isSupabaseConfigured ? BrandColors.success : BrandColors.warning}
              iconColor={BrandColors.emerald}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <SettingsRow
              icon="phone-portrait-outline"
              label="Mobile Runtime"
              value={`Expo SDK 54 / React 19`}
              iconColor={BrandColors.purple}
              textColor={colors.foreground}
              borderColor={colors.border}
              last
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {t('appInfo')}
          </Text>
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <SettingsRow
              icon="information-circle-outline"
              label={t('appVersion')}
              value="1.0.0 (Production)"
              iconColor={BrandColors.blue}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <SettingsRow
              icon="school-outline"
              label={t('team')}
              value="Invictus-Team29"
              iconColor={BrandColors.indigo}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <SettingsRow
              icon="business-outline"
              label={t('university')}
              value="University of Peradeniya"
              iconColor={BrandColors.cyan}
              textColor={colors.foreground}
              borderColor={colors.border}
            />
            <TouchableOpacity
              onPress={() => {
                Linking.openURL('https://github.com/cepdnaclk/e22-co2060-PERA-SAM');
              }}
            >
              <SettingsRow
                icon="logo-github"
                label="GitHub Repository"
                value="cepdnaclk/e22-co2060 →"
                valueColor={colors.indigo}
                iconColor={colors.foreground}
                textColor={colors.foreground}
                borderColor={colors.border}
                last
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Technologies */}
        <Animated.View entering={FadeInDown.duration(500).delay(600)}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Technologies
          </Text>
          <View style={styles.techGrid}>
            {TECH_ITEMS.map((tech) => (
              <View
                key={tech.name}
                style={[
                  styles.techChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: `${tech.color}40`,
                  },
                ]}
              >
                <Ionicons name={tech.icon as any} size={14} color={tech.color} />
                <Text style={[styles.techChipText, { color: tech.color }]}>
                  {tech.name}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.duration(500).delay(700)}>
          <TouchableOpacity
            style={[
              styles.signOutBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : BrandColors.roseLight,
              },
            ]}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color={BrandColors.rose} />
            <Text style={styles.signOutText}>{t('signOut')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          PERA-SAM — Predictive Equipment Reliability{'\n'}& Acoustics Sound Analysis Manager
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  valueColor,
  iconColor,
  textColor,
  borderColor,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  iconColor?: string;
  textColor?: string;
  borderColor?: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.settingsRow,
        { borderBottomColor: borderColor || '#e2e8f0' },
        last && { borderBottomWidth: 0 },
      ]}
    >
      <View style={styles.settingsLeft}>
        <View
          style={[
            styles.settingsIconBg,
            { backgroundColor: (iconColor || BrandColors.mutedForeground) + '18' },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={16}
            color={iconColor || BrandColors.mutedForeground}
          />
        </View>
        <Text style={[styles.settingsLabel, textColor ? { color: textColor } : {}]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.settingsValue,
          valueColor ? { color: valueColor } : { color: BrandColors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...Shadows.sm,
  },
  headerIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: BrandColors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3 },

  scroll: { padding: 20, paddingBottom: 100 },

  // Profile card
  profileCard: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    minHeight: 180,
  },
  profileContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
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
    color: 'rgba(255,255,255,0.85)',
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
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },

  // Language options
  languageOptionsContainer: {
    padding: 12,
    gap: 8,
  },
  langOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  langFlag: {
    fontSize: 24,
    marginRight: 14,
  },
  langTextContainer: {
    flex: 1,
  },
  langNativeLabel: {
    fontSize: 16,
  },
  langSubLabel: {
    fontSize: 12,
    marginTop: 1,
  },

  // Theme selector
  themeSelectorRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  themePillText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Sections
  sectionTitle: {
    ...Typography.label,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
  },
  settingsCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: 20,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
    fontSize: 14,
    fontWeight: '500',
  },
  settingsValue: {
    ...Typography.bodySmall,
    maxWidth: 160,
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 13,
  },

  // Tech grid
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
  },
  signOutText: {
    ...Typography.button,
    color: BrandColors.rose,
    fontWeight: '700',
  },

  // Footer
  footer: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
