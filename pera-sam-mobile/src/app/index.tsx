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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors, Typography, BorderRadius, Shadows } from '../constants/theme';
import { GlassCard, FloatingOrb, useScalePress } from '../components/AnimatedUI';

export default function LoginScreen() {
  const { setDemoSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { animatedStyle: btnAnim, onPressIn, onPressOut } = useScalePress();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    if (!isSupabaseConfigured) {
      // Demo mode fallback when Supabase credentials are not in .env yet
      setDemoSession(email.trim(), email.trim().split('@')[0] || 'Demo User');
      router.replace('/(tabs)/dashboard');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not sign in. Please try again.';
      Alert.alert(
        'Login Failed',
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
        {/* Gradient-like header band */}
        <View style={styles.headerBand}>
          {/* Layered gradient stops */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.6 }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.cyan, opacity: 0.25, top: '50%' }]} />

          {/* Floating orbs for depth */}
          <FloatingOrb color="#ffffff" size={80} top={20} right={-20} delay={0} />
          <FloatingOrb color="#ffffff" size={50} top={60} left={10} delay={400} />
          <FloatingOrb color={BrandColors.pink} size={40} top={10} left={60} delay={800} />

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.headerBandInner}>
            <View style={styles.logoCircle}>
              <Ionicons name="mic" size={28} color={BrandColors.white} />
            </View>
            <View>
              <Text style={styles.brandName}>PERA-SAM</Text>
              <Text style={styles.brandTag}>Sound Analysis Manager</Text>
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Welcome Back</Text>
          <Text style={styles.pageSubtitle}>
            Sign in to monitor your equipment health
          </Text>
        </Animated.View>

        {/* Form (Glassmorphism card) */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <GlassCard style={styles.formCard} intensity="strong">
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
                  placeholder="••••••••"
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

            {/* Remember / Forgot */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color={BrandColors.white} />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <Animated.View style={btnAnim}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleLogin}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                {/* Gradient background layers */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo, borderRadius: BorderRadius.md }]} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.5, borderRadius: BorderRadius.md }]} />
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color={BrandColors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </GlassCard>
        </Animated.View>

        {/* Sign Up link */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.signupRow}>
          <Text style={styles.signupText}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Info */}
        <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.infoBox}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="sparkles" size={16} color={BrandColors.purple} />
          </View>
          <Text style={styles.infoText}>
            PERA-SAM uses ML-powered acoustics to detect equipment anomalies before they cause failures.
          </Text>
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
    paddingBottom: 36,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    marginBottom: 32,
    overflow: 'hidden',
  },
  headerBandInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 10,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // Title
  titleBlock: {
    marginBottom: 24,
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
    gap: 18,
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

  // Options
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.indigo,
    borderColor: BrandColors.indigo,
  },
  rememberText: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
  },
  forgotText: {
    ...Typography.bodySmall,
    color: BrandColors.indigo,
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

  // Sign up
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  signupText: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
  },
  signupLink: {
    ...Typography.bodySmall,
    color: BrandColors.indigo,
    fontWeight: '700',
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: BrandColors.purpleLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    ...Typography.bodySmall,
    color: BrandColors.purpleDark,
    lineHeight: 20,
  },
});
