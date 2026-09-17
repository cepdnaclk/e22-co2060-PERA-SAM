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
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors, Typography, BorderRadius, Shadows } from '../constants/theme';
import { GlassCard, FloatingOrb, useScalePress } from '../components/AnimatedUI';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { animatedStyle: btnAnim, onPressIn, onPressOut } = useScalePress();

  function validateEmail(value: string): boolean {
    return value.trim().length > 0 && value.includes('@');
  }

  async function handleSendResetLink() {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'perasammobile://reset-password',
      });

      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not send reset link. Please try again.';
      Alert.alert('Error', message);
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
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.indigo }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.purple, opacity: 0.6 }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: BrandColors.cyan, opacity: 0.25, top: '50%' }]} />

          <FloatingOrb color="#ffffff" size={80} top={20} right={-20} delay={0} />
          <FloatingOrb color="#ffffff" size={50} top={60} left={10} delay={400} />
          <FloatingOrb color={BrandColors.pink} size={40} top={10} left={60} delay={800} />

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.headerBandInner}>
            <View style={styles.logoCircle}>
              <Ionicons name="key" size={28} color={BrandColors.white} />
            </View>
            <View>
              <Text style={styles.brandName}>PERA-SAM</Text>
              <Text style={styles.brandTag}>Password Recovery</Text>
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Forgot Password?</Text>
          <Text style={styles.pageSubtitle}>
            Enter your email and we will send you a reset link.
          </Text>
        </Animated.View>

        {success ? (
          /* ── Success state ── */
          <Animated.View entering={FadeInDown.duration(500)}>
            <GlassCard style={styles.formCard} intensity="strong">
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={64} color={BrandColors.emerald} />
              </View>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successBody}>
                {"We've sent a password reset link to "}
                <Text style={styles.successEmail}>{email.trim()}</Text>
                {'. Open the link to choose a new password.'}
              </Text>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={16} color={BrandColors.indigo} />
                <Text style={styles.backBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        ) : (
          /* ── Form state ── */
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            <GlassCard style={styles.formCard} intensity="strong">
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
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

              {/* Submit Button */}
              <Animated.View style={btnAnim}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                  onPress={handleSendResetLink}
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
                      <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                      <Ionicons name="send" size={18} color={BrandColors.white} />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Back to login */}
              <TouchableOpacity style={styles.backLinkRow} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={14} color={BrandColors.mutedForeground} />
                <Text style={styles.backLinkText}>Back to Login</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        )}

        {/* Info box */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.infoBox}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="shield-checkmark" size={16} color={BrandColors.purple} />
          </View>
          <Text style={styles.infoText}>
            Reset links expire after 60 minutes. Check your spam folder if you do not see the email.
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

  // Input
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

  // Back link (inline in form)
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  backLinkText: {
    ...Typography.bodySmall,
    color: BrandColors.mutedForeground,
    fontWeight: '500',
  },

  // Success state
  successIconWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successTitle: {
    ...Typography.h2,
    color: BrandColors.foreground,
    textAlign: 'center',
  },
  successBody: {
    ...Typography.body,
    color: BrandColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
  },
  successEmail: {
    color: BrandColors.indigo,
    fontWeight: '700',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.background,
    marginTop: 4,
  },
  backBtnText: {
    ...Typography.button,
    color: BrandColors.indigo,
    fontWeight: '600',
    fontSize: 15,
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
