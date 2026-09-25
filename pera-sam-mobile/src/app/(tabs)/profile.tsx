import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Switch,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { mlApiUrl, getMlApiConfigError } from '../../lib/mlApi';
import {
  BrandColors,
  Typography,
  BorderRadius,
  Shadows,
  MachineCategories,
} from '../../constants/theme';
import { FloatingOrb } from '../../components/AnimatedUI';
import { useThemeContext } from '../../lib/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  fetchProfile,
  updateProfile,
  pickAndUploadAvatar,
  geocodeAddress,
} from '../../lib/profileApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage, LANGUAGES } from '../../lib/i18n';
import { ProfileEditor } from '../../components/ProfileEditor';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTIF_PREFS_KEY = '@perasam:notif-prefs';
const PRIVACY_PREFS_KEY = '@perasam:privacy-prefs';

const TECH_ITEMS = [
  { name: 'React Native', icon: 'logo-react', color: BrandColors.cyan },
  { name: 'Expo', icon: 'phone-portrait-outline', color: BrandColors.purple },
  { name: 'TypeScript', icon: 'code-slash-outline', color: BrandColors.blue },
  { name: 'Supabase', icon: 'cloud-outline', color: BrandColors.emerald },
  { name: 'FastAPI (ML)', icon: 'flask-outline', color: BrandColors.orange },
  { name: 'TensorFlow', icon: 'hardware-chip-outline', color: BrandColors.pink },
];

type SectionKey = 'profile' | 'language' | 'password' | 'notifications' | 'privacy' | 'info' | 'account';

const SECTIONS: { key: SectionKey; label: string; icon: string; color: string }[] = [
  { key: 'profile', label: 'Profile', icon: 'person-outline', color: BrandColors.indigo },
  { key: 'language', label: 'Language', icon: 'language-outline', color: BrandColors.teal },
  { key: 'password', label: 'Password', icon: 'lock-closed-outline', color: BrandColors.purple },
  { key: 'notifications', label: 'Notifs', icon: 'notifications-outline', color: BrandColors.blue },
  { key: 'privacy', label: 'Privacy', icon: 'eye-off-outline', color: BrandColors.emerald },
  { key: 'info', label: 'Info', icon: 'information-circle-outline', color: BrandColors.cyan },
  { key: 'account', label: 'Account', icon: 'settings-outline', color: BrandColors.rose },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, isDark } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const mlApiConfigError = getMlApiConfigError();

  // Active settings tab
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // ── Profile fields ──────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Password fields ─────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Notification preferences ────────────────────────────────────────────
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [analysisAlerts, setAnalysisAlerts] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);

  // ── Privacy preferences ─────────────────────────────────────────────────
  const [shareReports, setShareReports] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────
  const email = user?.email || 'Unknown';
  const role: string = (user?.user_metadata?.role as string) || 'user';
  const isCompany = role === 'company';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';
  const displayName = name || user?.user_metadata?.full_name || 'PERA-SAM User';

  // ── Load profile on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id)
      .then((p) => {
        if (p) {
          setName(p.name || user.user_metadata?.full_name || '');
          setPhone(p.phone || user.user_metadata?.phone || '');
          setAddress(p.address || user.user_metadata?.address || '');
          setCompanyName(p.company_name || user.user_metadata?.company_name || '');
          setTechnicianName(p.technician_name || user.user_metadata?.technician_name || '');
          setSecondaryPhone(p.contact_numbers?.[1] || '');
          setServiceCategories(p.service_categories || []);
          if (p.avatar_url) setAvatarUrl(p.avatar_url);
        }
      })
      .catch(() => {
        // Profiles table may not exist yet — silently ignore
      });
  }, [user]);

  // ── Load notification & privacy prefs from AsyncStorage ─────────────────
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREFS_KEY)
      .then((val) => {
        if (val) {
          const prefs = JSON.parse(val);
          setEmailNotifs(prefs.emailNotifs ?? true);
          setPushNotifs(prefs.pushNotifs ?? true);
          setAnalysisAlerts(prefs.analysisAlerts ?? true);
          setMessageAlerts(prefs.messageAlerts ?? true);
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(PRIVACY_PREFS_KEY)
      .then((val) => {
        if (val) {
          const prefs = JSON.parse(val);
          setShareReports(prefs.shareReports ?? false);
          setPublicProfile(prefs.publicProfile ?? false);
        }
      })
      .catch(() => {});
  }, []);

  const [savingNotif, setSavingNotif] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // ── Save notification preferences ───────────────────────────────────────
  const saveNotifPrefs = useCallback(
    async (key: string, value: boolean) => {
      const current = {
        emailNotifs,
        pushNotifs,
        analysisAlerts,
        messageAlerts,
        [key]: value,
      };
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(current)).catch(() => {});
    },
    [emailNotifs, pushNotifs, analysisAlerts, messageAlerts]
  );

  const handleSaveAllNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      const current = {
        emailNotifs,
        pushNotifs,
        analysisAlerts,
        messageAlerts,
      };
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(current));
      await supabase.auth.updateUser({
        data: { notification_preferences: current },
      }).catch(() => {});
      Alert.alert('Preferences Saved', 'Your notification preferences have been saved successfully.');
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSavingNotif(false);
    }
  };

  // ── Save privacy preferences ─────────────────────────────────────────────
  const savePrivacyPrefs = useCallback(
    async (key: string, value: boolean) => {
      const current = {
        shareReports,
        publicProfile,
        [key]: value,
      };
      await AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(current)).catch(() => {});
    },
    [shareReports, publicProfile]
  );

  const handleSaveAllPrivacyPrefs = async () => {
    setSavingPrivacy(true);
    try {
      const current = {
        shareReports,
        publicProfile,
      };
      await AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(current));
      await supabase.auth.updateUser({
        data: { privacy_preferences: current },
      }).catch(() => {});
      Alert.alert('Settings Saved', 'Your privacy settings have been saved successfully.');
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save privacy settings.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  // ── Avatar upload ────────────────────────────────────────────────────────
  const handleAvatarPress = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadAvatar(user.id);
      if (url) {
        setAvatarUrl(url);
        await updateProfile(user.id, { avatar_url: url });
      }
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updates: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      if (isCompany) {
        updates.company_name = companyName.trim();
        updates.technician_name = technicianName.trim();
        updates.service_categories = serviceCategories;
        const contactNums = [phone.trim()];
        if (secondaryPhone.trim()) contactNums.push(secondaryPhone.trim());
        updates.contact_numbers = contactNums;

        if (address.trim()) {
          const coords = await geocodeAddress(address.trim());
          if (coords) {
            updates.location_lat = coords.lat;
            updates.location_lng = coords.lng;
          }
        }
      }

      await updateProfile(user.id, updates);
      await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      }).catch(() => {});

      Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Empty Password', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── Toggle service category ──────────────────────────────────────────────
  const toggleCategory = (value: string) => {
    setServiceCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { backgroundColor: colors.card, justifyContent: 'space-between' }]}>
          {/* Teal gradient accent bar */}
          <View style={styles.headerAccentBar}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.accent }]} />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, opacity: 0.5 }]}
            />
          </View>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Ionicons name="person" size={18} color={BrandColors.white} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile & Settings</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
          <ThemeToggle />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ── Profile Hero Card ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(500).delay(80)}>
            <View style={styles.profileCard}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.xl }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5, borderRadius: BorderRadius.xl }]} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.pink, opacity: 0.18, borderRadius: BorderRadius.xl, top: '50%' }]} />
              <FloatingOrb color="#fff" size={50} top={-10} right={20} delay={0} />
              <FloatingOrb color={BrandColors.pink} size={30} top={40} left={10} delay={500} />

              <View style={styles.profileContent}>
                {/* Avatar */}
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  onPress={handleAvatarPress}
                  activeOpacity={0.85}
                  disabled={uploadingAvatar}
                >
                  <View style={styles.avatarRing}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.avatarCameraBtn}>
                    {uploadingAvatar ? (
                      <ActivityIndicator size={12} color={BrandColors.white} />
                    ) : (
                      <Ionicons name="camera" size={14} color={BrandColors.white} />
                    )}
                  </View>
                </TouchableOpacity>

                <Text style={styles.profileName}>{displayName}</Text>

                <View style={styles.roleBadge}>
                  <Ionicons
                    name={isCompany ? 'business' : 'person'}
                    size={12}
                    color={BrandColors.white}
                  />
                  <Text style={styles.roleText}>{isCompany ? 'Company' : 'User'}</Text>
                </View>

                <View style={styles.memberBadge}>
                  <Ionicons name="shield-checkmark" size={13} color={BrandColors.white} />
                  <Text style={styles.memberText}>Member since {createdAt}</Text>
                </View>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: BorderRadius.full,
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  }}
                  onPress={() => setIsEditingProfile(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={13} color={BrandColors.white} />
                  <Text style={{ ...Typography.caption, fontWeight: '700', color: BrandColors.white }}>
                    {t('editProfile') || 'Edit Profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Section Tab Selector ───────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(500).delay(160)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabRow}
            >
              {SECTIONS.map((s) => {
                const active = activeSection === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.tabChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      active && { backgroundColor: s.color, borderColor: s.color },
                    ]}
                    onPress={() => setActiveSection(s.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={s.icon as any}
                      size={14}
                      color={active ? BrandColors.white : colors.mutedForeground}
                    />
                    <Text style={[styles.tabChipText, { color: colors.mutedForeground }, active && { color: BrandColors.white }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Edit Profile
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'profile' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title="Edit Profile" icon="person-outline" iconColor={BrandColors.indigo}>
                <FieldLabel>Full Name</FieldLabel>
                <StyledInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  icon="person-outline"
                />

                <FieldLabel>Phone Number</FieldLabel>
                <StyledInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+94 77 123 4567"
                  icon="call-outline"
                  keyboardType="phone-pad"
                />

                <FieldLabel>Address</FieldLabel>
                <StyledInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="City, Province, Sri Lanka"
                  icon="location-outline"
                  multiline
                />

                {isCompany && (
                  <>
                    <FieldLabel>Company Name</FieldLabel>
                    <StyledInput
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Your company name"
                      icon="business-outline"
                    />

                    <FieldLabel>Technician Name</FieldLabel>
                    <StyledInput
                      value={technicianName}
                      onChangeText={setTechnicianName}
                      placeholder="Lead technician name"
                      icon="hammer-outline"
                    />

                    <FieldLabel>Secondary Phone</FieldLabel>
                    <StyledInput
                      value={secondaryPhone}
                      onChangeText={setSecondaryPhone}
                      placeholder="+94 71 987 6543"
                      icon="call-outline"
                      keyboardType="phone-pad"
                    />

                    <FieldLabel>Service Categories</FieldLabel>
                    <View style={styles.categoryGrid}>
                      {MachineCategories.map((cat) => {
                        const selected = serviceCategories.includes(cat.value);
                        return (
                          <TouchableOpacity
                            key={cat.value}
                            style={[
                              styles.categoryChip,
                              {
                                borderColor: selected ? cat.color : colors.border,
                                backgroundColor: selected ? cat.bg : colors.card,
                              },
                            ]}
                            onPress={() => toggleCategory(cat.value)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={cat.icon as any}
                              size={16}
                              color={selected ? cat.color : colors.mutedForeground}
                            />
                            <Text
                              style={[
                                styles.categoryChipText,
                                { color: selected ? cat.color : colors.mutedForeground },
                              ]}
                            >
                              {cat.label}
                            </Text>
                            {selected && (
                              <View style={[styles.categoryCheck, { backgroundColor: cat.color }]}>
                                <Ionicons name="checkmark" size={10} color={BrandColors.white} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: BrandColors.indigo }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  activeOpacity={0.85}
                >
                  {savingProfile ? (
                    <ActivityIndicator size={18} color={BrandColors.white} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={BrandColors.white} />
                      <Text style={styles.primaryBtnText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SectionCard>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Language Settings (Sinhala, Tamil, English)
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'language' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title={t('language') || 'Language'} icon="language-outline" iconColor={BrandColors.teal}>
                <Text style={{ ...Typography.caption, color: colors.mutedForeground, marginBottom: 16 }}>
                  Choose your preferred application display language.
                </Text>
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: BorderRadius.md,
                        borderWidth: 1.5,
                        borderColor: isSelected ? BrandColors.indigo : colors.border,
                        backgroundColor: isSelected ? `${BrandColors.indigo}15` : colors.card,
                        marginBottom: 10,
                      }}
                      onPress={() => setLanguage(lang.code)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                        <View>
                          <Text style={{ ...Typography.body, fontWeight: '700', color: colors.foreground }}>
                            {lang.nativeLabel}
                          </Text>
                          <Text style={{ ...Typography.caption, color: colors.mutedForeground }}>
                            {lang.label}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={BrandColors.indigo} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </SectionCard>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Change Password
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'password' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title="Change Password" icon="lock-closed-outline" iconColor={BrandColors.purple}>
                <FieldLabel>New Password</FieldLabel>
                <View style={styles.passwordRow}>
                  <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? colors.background : BrandColors.muted, borderColor: colors.border }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={colors.mutedForeground}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInputInner, { color: colors.foreground }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.eyeBtn, { backgroundColor: isDark ? colors.background : BrandColors.muted, borderColor: colors.border }]}
                    onPress={() => setShowNewPassword((v) => !v)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                <FieldLabel>Confirm New Password</FieldLabel>
                <View style={styles.passwordRow}>
                  <View style={[styles.inputWrapper, { flex: 1, backgroundColor: isDark ? colors.background : BrandColors.muted, borderColor: colors.border }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={colors.mutedForeground}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInputInner, { color: colors.foreground }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat new password"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.eyeBtn, { backgroundColor: isDark ? colors.background : BrandColors.muted, borderColor: colors.border }]}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                {newPassword.length > 0 && newPassword !== confirmPassword && (
                  <View style={styles.errorHint}>
                    <Ionicons name="alert-circle-outline" size={14} color={BrandColors.rose} />
                    <Text style={styles.errorHintText}>Passwords do not match</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: BrandColors.purple }]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                  activeOpacity={0.85}
                >
                  {savingPassword ? (
                    <ActivityIndicator size={18} color={BrandColors.white} />
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={18} color={BrandColors.white} />
                      <Text style={styles.primaryBtnText}>Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SectionCard>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Notification Preferences
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'notifications' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title="Notification Preferences" icon="notifications-outline" iconColor={BrandColors.blue}>
                <ToggleRow
                  label="Email Notifications"
                  description="Receive analysis results via email"
                  icon="mail-outline"
                  iconColor={BrandColors.blue}
                  value={emailNotifs}
                  onValueChange={(v) => {
                    setEmailNotifs(v);
                    saveNotifPrefs('emailNotifs', v);
                  }}
                />
                <ToggleRow
                  label="Push Notifications"
                  description="In-app alerts on your device"
                  icon="phone-portrait-outline"
                  iconColor={BrandColors.indigo}
                  value={pushNotifs}
                  onValueChange={(v) => {
                    setPushNotifs(v);
                    saveNotifPrefs('pushNotifs', v);
                  }}
                />
                <ToggleRow
                  label="Analysis Complete"
                  description="Alert when your audio analysis finishes"
                  icon="mic-outline"
                  iconColor={BrandColors.emerald}
                  value={analysisAlerts}
                  onValueChange={(v) => {
                    setAnalysisAlerts(v);
                    saveNotifPrefs('analysisAlerts', v);
                  }}
                />
                <ToggleRow
                  label="New Messages"
                  description="Alert when you receive a new message"
                  icon="chatbubble-outline"
                  iconColor={BrandColors.purple}
                  value={messageAlerts}
                  onValueChange={(v) => {
                    setMessageAlerts(v);
                    saveNotifPrefs('messageAlerts', v);
                  }}
                  last
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: BrandColors.blue, marginTop: 14 }]}
                  onPress={handleSaveAllNotifPrefs}
                  disabled={savingNotif}
                  activeOpacity={0.85}
                >
                  {savingNotif ? (
                    <ActivityIndicator size={18} color={BrandColors.white} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={BrandColors.white} />
                      <Text style={styles.primaryBtnText}>Save Notification Preferences</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SectionCard>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Privacy Settings
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'privacy' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title="Privacy Settings" icon="eye-off-outline" iconColor={BrandColors.emerald}>
                <ToggleRow
                  label="Share Reports"
                  description="Allow your analysis reports to be shared with technicians"
                  icon="share-outline"
                  iconColor={BrandColors.emerald}
                  value={shareReports}
                  onValueChange={(v) => {
                    setShareReports(v);
                    savePrivacyPrefs('shareReports', v);
                  }}
                />
                <ToggleRow
                  label="Public Profile"
                  description="Let service companies see your basic profile"
                  icon="globe-outline"
                  iconColor={BrandColors.cyan}
                  value={publicProfile}
                  onValueChange={(v) => {
                    setPublicProfile(v);
                    savePrivacyPrefs('publicProfile', v);
                  }}
                  last
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: BrandColors.emerald, marginTop: 14 }]}
                  onPress={handleSaveAllPrivacyPrefs}
                  disabled={savingPrivacy}
                  activeOpacity={0.85}
                >
                  {savingPrivacy ? (
                    <ActivityIndicator size={18} color={BrandColors.white} />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={18} color={BrandColors.white} />
                      <Text style={styles.primaryBtnText}>Save Privacy Settings</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SectionCard>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: App Information
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'info' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              <SectionCard title="App Information" icon="information-circle-outline" iconColor={BrandColors.cyan}>
                <InfoRow icon="information-circle-outline" label="Version" value="1.0.0" iconColor={BrandColors.blue} />
                <InfoRow
                  icon="server-outline"
                  label="ML Backend"
                  value={mlApiConfigError ? 'Setup needed' : (mlApiUrl || 'Not set')}
                  valueColor={mlApiConfigError ? BrandColors.amber : BrandColors.emerald}
                  iconColor={BrandColors.orange}
                />
                <InfoRow icon="school-outline" label="Team" value="Invictus-Team29" iconColor={BrandColors.indigo} />
                <InfoRow
                  icon="business-outline"
                  label="University"
                  value="University of Peradeniya"
                  iconColor={BrandColors.cyan}
                />
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com/cepdnaclk/e22-co2060-PERA-SAM')}
                >
                  <InfoRow
                    icon="logo-github"
                    label="GitHub Repository"
                    value="Open →"
                    valueColor={BrandColors.indigo}
                    iconColor={BrandColors.foreground}
                    last
                  />
                </TouchableOpacity>
              </SectionCard>

              {/* Tech Stack */}
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Technologies</Text>
              <View style={styles.techGrid}>
                {TECH_ITEMS.map((tech) => (
                  <View
                    key={tech.name}
                    style={[styles.techChip, { backgroundColor: colors.card, borderColor: `${tech.color}40` }]}
                  >
                    <Ionicons name={tech.icon as any} size={14} color={tech.color} />
                    <Text style={[styles.techChipText, { color: tech.color }]}>{tech.name}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Account Actions
          ═══════════════════════════════════════════════════════════════ */}
          {activeSection === 'account' && (
            <Animated.View entering={FadeInRight.duration(350).delay(40)}>
              {/* System Status */}
              <SectionCard title="System Status" icon="pulse-outline" iconColor={BrandColors.emerald}>
                <StatusRow
                  label="Supabase Database"
                  ok={isSupabaseConfigured}
                  okText="Connected"
                  failText="Not configured"
                  icon="cloud-outline"
                  iconColor={BrandColors.emerald}
                />
                <StatusRow
                  label="ML API"
                  ok={!mlApiConfigError}
                  okText="Configured"
                  failText="Setup needed"
                  icon="hardware-chip-outline"
                  iconColor={BrandColors.orange}
                  last
                />
              </SectionCard>

              {/* Quick Navigation */}
              <SectionCard title="Quick Navigation" icon="navigate-outline" iconColor={BrandColors.blue}>
                <NavRow
                  icon="time-outline"
                  label="Analysis History"
                  iconColor={BrandColors.purple}
                  onPress={() => router.push('/(tabs)/history' as any)}
                />
                <NavRow
                  icon="mic-outline"
                  label="New Analysis"
                  iconColor={BrandColors.accent}
                  onPress={() => router.push('/(tabs)/analysis' as any)}
                />
                <NavRow
                  icon="chatbubbles-outline"
                  label="Repair Requests"
                  iconColor={BrandColors.blue}
                  onPress={() => router.push('/(tabs)/requests' as any)}
                  last
                />
              </SectionCard>

              {/* Sign Out */}
              <TouchableOpacity
                style={[
                  styles.signOutBtn,
                  isDark && { backgroundColor: 'rgba(244,63,94,0.12)', borderColor: 'rgba(244,63,94,0.3)' },
                ]}
                onPress={handleSignOut}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={20} color={BrandColors.rose} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Footer */}
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            PERA-SAM — Predictive Equipment Reliability{'\n'}& Acoustics Sound Analysis Manager
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ProfileEditor
        visible={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        initialFullName={name || (user?.user_metadata?.full_name as string) || ''}
        initialPhone={phone || (user?.user_metadata?.phone as string) || ''}
        onProfileUpdated={(updatedName, updatedPhone) => {
          setName(updatedName);
          setPhone(updatedPhone);
        }}
      />
    </SafeAreaView>
  );
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  const { colors } = useThemeContext();
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: (iconColor || BrandColors.indigo) + '18' }]}>
          <Ionicons name={icon as any} size={15} color={iconColor || BrandColors.indigo} />
        </View>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useThemeContext();
  return <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{children}</Text>;
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  const { colors, isDark } = useThemeContext();
  return (
    <View
      style={[
        styles.inputWrapper,
        {
          backgroundColor: isDark ? colors.background : BrandColors.muted,
          borderColor: colors.border,
        },
        multiline && { height: 72, alignItems: 'flex-start' },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={16}
          color={colors.mutedForeground}
          style={[styles.inputIcon, multiline && { marginTop: 14 }]}
        />
      )}
      <TextInput
        style={[
          styles.textInputInner,
          { color: colors.foreground },
          multiline && { height: 60, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

function ToggleRow({
  label,
  description,
  icon,
  iconColor,
  value,
  onValueChange,
  last,
}: {
  label: string;
  description: string;
  icon: string;
  iconColor?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  const { colors } = useThemeContext();
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || BrandColors.indigo) + '18' }]}>
        <Ionicons name={icon as any} size={16} color={iconColor || BrandColors.indigo} />
      </View>
      <View style={styles.toggleLabelBlock}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: BrandColors.indigo + '80' }}
        thumbColor={value ? BrandColors.indigo : colors.mutedForeground}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function InfoRow({
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
  const { colors } = useThemeContext();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || colors.mutedForeground) + '15' }]}>
          <Ionicons name={icon as any} size={16} color={iconColor || colors.mutedForeground} />
        </View>
        <Text style={[styles.infoLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Text
        style={[styles.infoValue, { color: valueColor || colors.mutedForeground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
  icon,
  iconColor,
  last,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
  icon: string;
  iconColor?: string;
  last?: boolean;
}) {
  const { colors } = useThemeContext();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || colors.mutedForeground) + '15' }]}>
          <Ionicons name={icon as any} size={16} color={iconColor || colors.mutedForeground} />
        </View>
        <Text style={[styles.infoLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: ok ? BrandColors.emeraldLight : BrandColors.amberLight }]}>
        <View style={[styles.statusDot, { backgroundColor: ok ? BrandColors.emerald : BrandColors.amber }]} />
        <Text style={[styles.statusPillText, { color: ok ? BrandColors.emerald : BrandColors.amber }]}>
          {ok ? okText : failText}
        </Text>
      </View>
    </View>
  );
}

function NavRow({
  icon,
  label,
  iconColor,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  iconColor?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useThemeContext();
  return (
    <TouchableOpacity
      style={[styles.navRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || BrandColors.indigo) + '18' }]}>
          <Ionicons name={icon as any} size={16} color={iconColor || BrandColors.indigo} />
        </View>
        <Text style={[styles.infoLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: BrandColors.white,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  headerAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: BrandColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...Typography.h3, color: BrandColors.foreground },
  headerSub: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    marginTop: 1,
  },

  scroll: { padding: 20, paddingBottom: 48 },

  // Profile card
  profileCard: {
    borderRadius: BorderRadius.xl,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 230,
  },
  profileContent: { alignItems: 'center', zIndex: 10 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: BrandColors.indigo },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BrandColors.white,
  },
  profileName: { ...Typography.h2, color: BrandColors.white, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  },
  roleText: { ...Typography.caption, color: BrandColors.white, fontWeight: '700' },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  memberText: { ...Typography.caption, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  // Tab row
  tabRow: { paddingBottom: 16, gap: 8 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    ...Shadows.sm,
  },
  tabChipText: { ...Typography.caption, color: BrandColors.mutedForeground, fontWeight: '700' },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    ...Typography.label,
    color: BrandColors.foreground,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Card wrapper
  card: {
    backgroundColor: BrandColors.card,
    borderRadius: BorderRadius.xl,
    marginBottom: 24,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 16,
  },

  // Fields
  fieldLabel: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.muted,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  textInputInner: {
    flex: 1,
    ...Typography.body,
    color: BrandColors.foreground,
    fontSize: 15,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: {
    width: 44,
    height: 48,
    backgroundColor: BrandColors.muted,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginTop: 2,
  },
  errorHintText: { ...Typography.caption, color: BrandColors.rose },

  // Service categories grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 4 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    position: 'relative',
  },
  categoryChipText: { ...Typography.label, fontSize: 13, fontWeight: '700' },
  categoryCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    ...Shadows.md,
  },
  primaryBtnText: { ...Typography.button, color: BrandColors.white, fontWeight: '700' },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.muted,
    gap: 12,
  },
  toggleLabelBlock: { flex: 1 },
  toggleLabel: { ...Typography.body, color: BrandColors.foreground, fontSize: 15, fontWeight: '600' },
  toggleDesc: { ...Typography.caption, color: BrandColors.mutedForeground, marginTop: 2 },

  // Info / Settings rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.muted,
  },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingsIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { ...Typography.body, color: BrandColors.foreground, fontSize: 15 },
  infoValue: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
    maxWidth: 160,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  // Nav row
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.muted,
  },

  // Tech grid
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
    marginTop: 4,
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
    ...Shadows.sm,
  },
  techChipText: { fontSize: 12, fontWeight: '700' },

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
    borderColor: 'rgba(244,63,94,0.2)',
  },
  signOutText: { ...Typography.button, color: BrandColors.rose, fontWeight: '700' },

  // Footer
  footer: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
