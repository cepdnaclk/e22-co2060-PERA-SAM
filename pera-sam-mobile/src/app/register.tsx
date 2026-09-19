import React, { useState } from 'react';
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
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors, Typography, BorderRadius, Shadows } from '../constants/theme';
import { GlassCard, FloatingOrb, useScalePress } from '../components/AnimatedUI';

export default function RegisterScreen() {
  const { setDemoSession } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { animatedStyle: btnAnim, onPressIn, onPressOut } = useScalePress();

  // Animated strength bar
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

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured) {
      // Demo mode fallback when Supabase credentials are not in .env yet
      setDemoSession(email.trim(), fullName.trim());
      router.replace('/(tabs)/dashboard');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: fullName.trim(),
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        router.replace('/(tabs)/dashboard');
        return;
      }

      Alert.alert(
        'Account Created',
        'Please check your email to confirm your account, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create your account.';
      Alert.alert(
        'Registration Failed',
        message === 'Network request failed'
          ? 'Could not reach Supabase. Check your internet connection and the Supabase URL in pera-sam-mobile/.env, then restart Expo.'
          : message
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
      >
        {/* Header band */}
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

        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Sign Up</Text>
          <Text style={styles.pageSubtitle}>
            Start analyzing equipment acoustics today
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <GlassCard style={styles.formCard} intensity="strong">
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={BrandColors.purple}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={BrandColors.indigo}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={BrandColors.indigo}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min 6 characters"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={BrandColors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={BrandColors.purple}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
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
          <TouchableOpacity onPress={() => router.replace('/')}>
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
