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

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { animatedStyle: btnAnim, onPressIn, onPressOut } = useScalePress();

  async function handleUpdatePassword() {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure both passwords match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully. Please sign in with your new password.',
        [{ text: 'OK', onPress: () => router.replace('/') }],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update password. Please try again.';
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
              <Ionicons name="lock-open" size={28} color={BrandColors.white} />
            </View>
            <View>
              <Text style={styles.brandName}>PERA-SAM</Text>
              <Text style={styles.brandTag}>Set New Password</Text>
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Reset Password</Text>
          <Text style={styles.pageSubtitle}>
            Choose a strong new password for your account.
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <GlassCard style={styles.formCard} intensity="strong">
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={BrandColors.indigo}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={BrandColors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={BrandColors.indigo}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={BrandColors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={BrandColors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password requirements hint */}
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={14} color={BrandColors.mutedForeground} />
              <Text style={styles.hintText}>Password must be at least 6 characters long.</Text>
            </View>

            {/* Update Button */}
            <Animated.View style={btnAnim}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleUpdatePassword}
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
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                    <Ionicons name="checkmark-circle" size={18} color={BrandColors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Back to login */}
            <TouchableOpacity
              style={styles.backLinkRow}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="arrow-back" size={14} color={BrandColors.mutedForeground} />
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Info box */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.infoBox}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="shield-checkmark" size={16} color={BrandColors.purple} />
          </View>
          <Text style={styles.infoText}>
            After updating your password you will be redirected to the login screen to sign in again.
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
  eyeBtn: {
    padding: 14,
  },

  // Hint
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    marginTop: -4,
  },
  hintText: {
    ...Typography.caption,
    color: BrandColors.mutedForeground,
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

  // Back link
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
