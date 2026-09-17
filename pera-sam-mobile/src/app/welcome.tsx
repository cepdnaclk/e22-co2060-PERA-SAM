import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors, BorderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WELCOME_STORAGE_KEY = '@perasam:welcomed';
const NUM_BARS = 12;

// Individual animated waveform bar
function WaveBar({ index }: { index: number }) {
  const height = useSharedValue(8);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 0 }),
        withTiming(Math.random() * 30 + 20, {
          duration: 350,
          easing: Easing.out(Easing.sin),
        }),
        withTiming(8, {
          duration: 350,
          easing: Easing.in(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
    marginTop: index % 3 === 0 ? 0 : index % 3 === 1 ? 4 : 8,
  }));

  return <Animated.View style={[styles.waveBar, animStyle]} />;
}

// Pulsing glow ring around the mic
function PulsingGlow() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900 }),
        withTiming(0.7, { duration: 900 }),
      ),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.glowRing, glowStyle]} />;
}

export default function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateToDashboard = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors, don't block navigation
    }
    router.replace('/(tabs)/dashboard');
  };

  useEffect(() => {
    const advance = (currentStep: number) => {
      if (currentStep < 3) {
        timerRef.current = setTimeout(() => {
          setStep(currentStep + 1);
          advance(currentStep + 1);
        }, 1000);
      } else {
        // After step 3, wait 1.2s then navigate
        timerRef.current = setTimeout(() => {
          navigateToDashboard();
        }, 1200);
      }
    };

    advance(0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSkip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    navigateToDashboard();
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.75}>
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      {/* Step 0: Mic icon with pulsing glow */}
      {step === 0 && (
        <Animated.View
          key="step0"
          entering={FadeInDown.duration(500)}
          exiting={FadeOut.duration(300)}
          style={styles.stepContainer}
        >
          <View style={styles.micWrap}>
            <PulsingGlow />
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={64} color={BrandColors.white} />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Step 1: PERA-SAM title + subtitle */}
      {step === 1 && (
        <Animated.View
          key="step1"
          entering={FadeInDown.duration(500)}
          exiting={FadeOut.duration(300)}
          style={styles.stepContainer}
        >
          <Text style={styles.brandTitle}>
            PERA
            <Text style={styles.brandDash}>—</Text>
            SAM
          </Text>
          <Text style={styles.brandSubtitle}>Acoustic Intelligence Systems</Text>
          <View style={styles.accentLine} />
        </Animated.View>
      )}

      {/* Step 2: Waveform bars + initializing text */}
      {step === 2 && (
        <Animated.View
          key="step2"
          entering={FadeInDown.duration(500)}
          exiting={FadeOut.duration(300)}
          style={styles.stepContainer}
        >
          <View style={styles.waveContainer}>
            {Array.from({ length: NUM_BARS }).map((_, i) => (
              <WaveBar key={i} index={i} />
            ))}
          </View>
          <Text style={styles.initializingText}>Initializing Audio Engine...</Text>
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.duration(300).delay(i * 150)}
                style={styles.dot}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Step 3: Green checkmark + Ready */}
      {step === 3 && (
        <Animated.View
          key="step3"
          entering={FadeInDown.duration(500)}
          exiting={FadeOut.duration(300)}
          style={styles.stepContainer}
        >
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={56} color={BrandColors.white} />
          </View>
          <Text style={styles.readyText}>Ready!</Text>
          <Text style={styles.readySubtext}>Your workspace is calibrated.</Text>
        </Animated.View>
      )}

      {/* Step indicator dots */}
      <View style={styles.stepIndicators}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.stepDot, i === step && styles.stepDotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Skip
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // Step containers
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    paddingHorizontal: 40,
    gap: 20,
  },

  // Step 0 – Mic
  micWrap: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BrandColors.indigo,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step 1 – Title
  brandTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: BrandColors.white,
    letterSpacing: -1,
    textAlign: 'center',
  },
  brandDash: {
    color: BrandColors.accent,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    letterSpacing: 1,
  },
  accentLine: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: BrandColors.accent,
    marginTop: 8,
  },

  // Step 2 – Waveform
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 60,
  },
  waveBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.accent,
  },
  initializingText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.accent,
  },

  // Step 3 – Ready
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BrandColors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BrandColors.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  readyText: {
    fontSize: 42,
    fontWeight: '800',
    color: BrandColors.white,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  readySubtext: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  // Step indicators
  stepIndicators: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.accent,
  },
});
