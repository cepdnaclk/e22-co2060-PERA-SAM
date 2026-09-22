import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors, Typography, BorderRadius, Shadows } from '../constants/theme';
import { GlassCard, FloatingOrb, useScalePress } from '../components/AnimatedUI';

// ─── Service categories ────────────────────────────────────────────────────
const SERVICE_CATEGORIES = [
  { value: 'fan',             label: 'Industrial Fan',        icon: 'aperture-outline',        color: BrandColors.orange,  bg: BrandColors.orangeLight  },
  { value: 'pump',            label: 'Industrial Pumps',      icon: 'water-outline',            color: BrandColors.blue,    bg: BrandColors.blueLight    },
  { value: 'slider',          label: 'Slide Rail / Conveyor', icon: 'swap-horizontal-outline',  color: BrandColors.purple,  bg: BrandColors.purpleLight  },
  { value: 'valve',           label: 'Industrial Valves',     icon: 'git-branch-outline',       color: BrandColors.emerald, bg: BrandColors.emeraldLight },
  { value: 'vehicle_bearing', label: 'Vehicle Bearings',      icon: 'settings-outline',         color: BrandColors.rose,    bg: BrandColors.roseLight    },
  { value: 'industrial',      label: 'Industrial Machinery',  icon: 'construct-outline',        color: BrandColors.indigo,  bg: BrandColors.indigoLight  },
] as const;

// ─── Animated role toggle ──────────────────────────────────────────────────
function RoleToggle({
  activeRole,
  onSelect,
}: {
  activeRole: 'user' | 'company';
  onSelect: (role: 'user' | 'company') => void;
}) {
  const progress = useSharedValue(activeRole === 'user' ? 0 : 1);
  React.useEffect(() => {
    progress.value = withTiming(activeRole === 'user' ? 0 : 1, { duration: 250 });
  }, [activeRole, progress]);

  const userTabStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [BrandColors.indigo, 'transparent']),
  }));
  const companyTabStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', BrandColors.indigo]),
  }));

  return (
    <View style={toggleSt.track}>
      <Animated.View style={[toggleSt.tab, userTabStyle]}>
        <TouchableOpacity style={toggleSt.tabInner} onPress={() => onSelect('user')} activeOpacity={0.85}>
          <Ionicons name="person-outline" size={16} color={activeRole === 'user' ? BrandColors.white : BrandColors.mutedForeground} />
          <Text style={[toggleSt.tabLabel, { color: activeRole === 'user' ? BrandColors.white : BrandColors.mutedForeground }]}>Normal User</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[toggleSt.tab, companyTabStyle]}>
        <TouchableOpacity style={toggleSt.tabInner} onPress={() => onSelect('company')} activeOpacity={0.85}>
          <Ionicons name="business-outline" size={16} color={activeRole === 'company' ? BrandColors.white : BrandColors.mutedForeground} />
          <Text style={[toggleSt.tabLabel, { color: activeRole === 'company' ? BrandColors.white : BrandColors.mutedForeground }]}>Service Company</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const toggleSt = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: BrandColors.muted, borderRadius: BorderRadius.md, padding: 4, marginBottom: 20 },
  tab: { flex: 1, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 8 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
});

// ─── Category checkbox card ────────────────────────────────────────────────
function CategoryCard({
  item,
  selected,
  onToggle,
}: {
  item: (typeof SERVICE_CATEGORIES)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[catSt.card, selected && { borderColor: item.color, backgroundColor: item.bg }]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <View style={[catSt.iconWrap, { backgroundColor: selected ? item.color : BrandColors.muted }]}>
        <Ionicons name={item.icon as any} size={18} color={selected ? BrandColors.white : BrandColors.mutedForeground} />
      </View>
      <Text style={[catSt.cardLabel, { color: selected ? item.color : BrandColors.foreground, fontWeight: selected ? '700' : '500' }]} numberOfLines={2}>
        {item.label}
      </Text>
      {selected && (
        <View style={[catSt.checkBadge, { backgroundColor: item.color }]}>
          <Ionicons name="checkmark" size={10} color={BrandColors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const catSt = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', maxWidth: '50%', borderWidth: 1.5, borderColor: BrandColors.border, borderRadius: BorderRadius.md, padding: 12, alignItems: 'center', gap: 8, backgroundColor: BrandColors.card, position: 'relative' },
  iconWrap: { width: 38, height: 38, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
});

// ─── Reusable labelled input ───────────────────────────────────────────────
function FieldInput({
  label,
  icon,
  iconColor,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  autoCorrect,
}: {
  label: string;
  icon: string;
  iconColor: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  secureTextEntry?: boolean;
  autoCorrect?: boolean;
}) {
  return (
    <View style={fldSt.group}>
      <Text style={fldSt.label}>{label}</Text>
      <View style={fldSt.inputWrap}>
        <Ionicons name={icon as any} size={18} color={iconColor} style={fldSt.inputIcon} />
        <TextInput
          style={fldSt.input}
          placeholder={placeholder}
          placeholderTextColor={BrandColors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          autoCorrect={autoCorrect}
        />
      </View>
    </View>
  );
}

const fldSt = StyleSheet.create({
  group: { gap: 6 },
  label: { ...Typography.label, color: BrandColors.foreground },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BrandColors.border, borderRadius: BorderRadius.md, backgroundColor: BrandColors.background, height: 52 },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, height: 52, paddingHorizontal: 12, fontSize: 16, color: BrandColors.foreground },
});

export default function RegisterScreen() {
  const { setDemoSession } = useAuth();
  const [activeRole, setActiveRole] = useState<'user' | 'company'>('user');
  const [loading, setLoading] = useState(false);

  // Shared password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Normal user fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { animatedStyle: btnAnim, onPressIn, onPressOut } = useScalePress();

  // ── Password strength animation ──────────────────────────────────────────
  const strengthWidth = useSharedValue(0);
  const strengthColor = useSharedValue<string>(BrandColors.danger);

  React.useEffect(() => {
    if (password.length === 0) {
      strengthWidth.value = withTiming(0, { duration: 300 });
    } else if (password.length >= 8) {
      strengthWidth.value = withTiming(100, { duration: 400 });
      strengthColor.value = BrandColors.success;
    } else if (password.length >= 6) {
      strengthWidth.value = withTiming(66, { duration: 400 });
      strengthColor.value = BrandColors.warning;
    } else {
      strengthWidth.value = withTiming(33, { duration: 400 });
      strengthColor.value = BrandColors.danger;
    }
  }, [password, strengthWidth, strengthColor]);

  const strengthBarStyle = useAnimatedStyle(() => ({
    width: `${strengthWidth.value}%`,
    backgroundColor: strengthColor.value,
  }));

  const toggleCategory = useCallback((value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }, []);

  const handleRoleSwitch = useCallback((role: 'user' | 'company') => {
    setActiveRole(role);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────
  function validateUser(): string | null {
    if (!fullName.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!phone.trim()) return 'Phone number is required.';
    if (!age.trim()) return 'Age is required.';
    if (!address.trim()) return 'Address is required.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  function validateCompany(): string | null {
    if (!companyName.trim()) return 'Company name is required.';
    if (!technicianName.trim()) return 'Technician name is required.';
    if (!companyEmail.trim()) return 'Email is required.';
    if (!phone1.trim()) return 'Primary contact number is required.';
    if (!companyAddress.trim()) return 'Address is required.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (selectedCategories.length === 0) return 'Please select at least one service category.';
    return null;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleRegister() {
    const validationError = activeRole === 'user' ? validateUser() : validateCompany();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    // Demo mode fallback when Supabase is not configured
    if (!isSupabaseConfigured) {
      const displayName = activeRole === 'user' ? fullName.trim() : companyName.trim();
      const emailUsed = activeRole === 'user' ? email.trim() : companyEmail.trim();
      setDemoSession(emailUsed, displayName);
      router.replace('/welcome' as any);
      return;
    }

    setLoading(true);
    try {
      let signUpError: Error | null = null;

      if (activeRole === 'user') {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              name: fullName.trim(),
              role: 'user',
              phone: phone.trim(),
              age: age.trim(),
              address: address.trim(),
            },
          },
        });
        if (err) signUpError = err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: companyEmail.trim(),
          password,
          options: {
            data: {
              full_name: companyName.trim(),
              name: technicianName.trim(),
              company_name: companyName.trim(),
              technician_name: technicianName.trim(),
              role: 'company',
              phone: phone1.trim(),
              contact_numbers: [phone1.trim(), phone2.trim()].filter(Boolean),
              address: companyAddress.trim(),
              service_categories: selectedCategories,
            },
          },
        });
        if (err) signUpError = err;
      }

      if (signUpError) throw signUpError;
      router.replace('/welcome' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create your account.';
      Alert.alert(
        'Registration Failed',
        message === 'Network request failed'
          ? 'Could not reach Supabase. Check your internet connection and the Supabase URL in pera-sam-mobile/.env, then restart Expo.'
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header band ── */}
        <View style={styles.headerBand}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.6 }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.pink, opacity: 0.2, top: '50%' }]} />
          <FloatingOrb color="#ffffff" size={60} top={15} right={-10} delay={0} />
          <FloatingOrb color={BrandColors.pink} size={45} top={50} left={20} delay={500} />
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.headerBandInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={BrandColors.white} />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Ionicons name="mic" size={28} color={BrandColors.white} />
            </View>
            <View>
              <Text style={styles.brandName}>PERA-SAM</Text>
              <Text style={styles.brandTag}>Create Your Account</Text>
            </View>
          </Animated.View>
        </View>

        {/* ── Title ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Sign Up</Text>
          <Text style={styles.pageSubtitle}>
            {activeRole === 'user'
              ? 'Start analyzing equipment acoustics today'
              : 'Register your service company to receive repair requests'}
          </Text>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <GlassCard style={styles.formCard} intensity="strong">

            {/* Role toggle */}
            <RoleToggle activeRole={activeRole} onSelect={handleRoleSwitch} />

            {/* ── Normal User fields ── */}
            {activeRole === 'user' && (
              <>
                <FieldInput label="Full Name" icon="person-outline" iconColor={BrandColors.purple} placeholder="John Doe" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                <FieldInput label="Email" icon="mail-outline" iconColor={BrandColors.indigo} placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <FieldInput label="Phone Number" icon="call-outline" iconColor={BrandColors.emerald} placeholder="+94 77 000 0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
                <FieldInput label="Age" icon="calendar-outline" iconColor={BrandColors.amber} placeholder="25" value={age} onChangeText={setAge} keyboardType="numeric" autoCapitalize="none" />
                <FieldInput label="Address" icon="location-outline" iconColor={BrandColors.rose} placeholder="123 Main St, Colombo" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
              </>
            )}

            {/* ── Company fields ── */}
            {activeRole === 'company' && (
              <>
                <FieldInput label="Company Name" icon="business-outline" iconColor={BrandColors.indigo} placeholder="Acme Service Co." value={companyName} onChangeText={setCompanyName} autoCapitalize="words" />
                <FieldInput label="Technician Name" icon="person-outline" iconColor={BrandColors.purple} placeholder="Jane Smith" value={technicianName} onChangeText={setTechnicianName} autoCapitalize="words" />
                <FieldInput label="Email" icon="mail-outline" iconColor={BrandColors.blue} placeholder="company@example.com" value={companyEmail} onChangeText={setCompanyEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <FieldInput label="Primary Contact" icon="call-outline" iconColor={BrandColors.emerald} placeholder="+94 77 000 0000" value={phone1} onChangeText={setPhone1} keyboardType="phone-pad" autoCapitalize="none" />
                <FieldInput label="Secondary Contact (optional)" icon="call-outline" iconColor={BrandColors.cyan} placeholder="+94 71 000 0000" value={phone2} onChangeText={setPhone2} keyboardType="phone-pad" autoCapitalize="none" />
                <FieldInput label="Address" icon="location-outline" iconColor={BrandColors.rose} placeholder="456 Industry Rd, Kandy" value={companyAddress} onChangeText={setCompanyAddress} autoCapitalize="sentences" />

                {/* Service categories multi-select grid */}
                <View style={styles.categorySection}>
                  <Text style={styles.label}>Service Categories</Text>
                  <Text style={styles.categoryHint}>Select all categories your company services (at least 1)</Text>
                  <View style={styles.categoryGrid}>
                    {SERVICE_CATEGORIES.map((item) => (
                      <CategoryCard
                        key={item.value}
                        item={item}
                        selected={selectedCategories.includes(item.value)}
                        onToggle={() => toggleCategory(item.value)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* ── Shared Password fields ── */}
            <View style={fldSt.group}>
              <Text style={fldSt.label}>Password</Text>
              <View style={fldSt.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={BrandColors.indigo} style={fldSt.inputIcon} />
                <TextInput
                  style={[fldSt.input, { flex: 1 }]}
                  placeholder="Min 6 characters"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((s) => !s)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={BrandColors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={fldSt.group}>
              <Text style={fldSt.label}>Confirm Password</Text>
              <View style={fldSt.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={BrandColors.purple} style={fldSt.inputIcon} />
                <TextInput
                  style={fldSt.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthTrack}>
                  <Animated.View style={[styles.strengthBar, strengthBarStyle]} />
                </View>
                <Text style={styles.strengthText}>
                  {password.length >= 8 ? 'Strong' : password.length >= 6 ? 'Fair' : 'Weak'}
                </Text>
              </View>
            )}

            {/* Register Button */}
            <Animated.View style={btnAnim}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleRegister}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5, borderRadius: BorderRadius.md }]} />
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                    <Ionicons name="checkmark-circle" size={18} color={BrandColors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

          </GlassCard>
        </Animated.View>

        {/* Sign In link */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.signinLink}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Header band
  headerBand: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    marginBottom: 28,
    overflow: 'hidden',
  },
  headerBandInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // Title
  titleBlock: {
    marginBottom: 20,
  },
  pageTitle: {
    ...Typography.h1,
    color: BrandColors.foreground,
    marginBottom: 6,
    fontSize: 30,
  },
  pageSubtitle: {
    ...Typography.body,
    color: BrandColors.mutedForeground,
  },

  // Form card
  formCard: {
    borderRadius: BorderRadius.xl,
    padding: 22,
    gap: 16,
    ...Shadows.lg,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    ...Typography.label,
    color: BrandColors.foreground,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.background,
    height: 52,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    color: BrandColors.foreground,
  },
  eyeBtn: {
    padding: 14,
  },

  // Category styles
  categorySection: {
    gap: 8,
    marginTop: 4,
  },
  categoryHint: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    marginTop: -2,
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Password strength
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: BrandColors.muted,
    overflow: 'hidden',
  },
  strengthBar: {
    height: 5,
    borderRadius: 3,
  },
  strengthText: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
    fontWeight: '600',
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    overflow: 'hidden',
    ...Shadows.glow(BrandColors.indigo),
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    ...Typography.button,
    color: BrandColors.white,
    fontSize: 17,
    fontWeight: '700',
  },

  // Sign in
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  signinText: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
  },
  signinLink: {
    ...Typography.bodySmall,
    color: BrandColors.indigo,
    fontWeight: '700',
  },
});
