/**
 * Shared animated UI primitives for PERA-SAM mobile app.
 * Compatible with Expo Go and React Native Reanimated.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BrandColors } from '../constants/theme';

// ─── Gradient View (layered stops via Views) ────────────────────────────────
interface GradientViewProps {
  colors: readonly string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
}

export function GradientView({ colors, style, children, direction = 'vertical' }: GradientViewProps) {
  const isHoriz = direction === 'horizontal';

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      {colors.map((color, i) => {
        const opacity = 1 - i * (0.8 / colors.length);
        const percent = `${(i / colors.length) * 100}%` as const;
        const posStyle: ViewStyle = isHoriz
          ? { left: percent }
          : { top: percent };

        return (
          <View
            key={i}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: color, opacity },
              posStyle,
            ]}
          />
        );
      })}
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

// ─── Glassmorphism Card ─────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'light' | 'medium' | 'strong';
}

export function GlassCard({ children, style, intensity = 'medium' }: GlassCardProps) {
  const bg =
    intensity === 'light'
      ? 'rgba(255,255,255,0.7)'
      : intensity === 'strong'
      ? 'rgba(255,255,255,0.94)'
      : 'rgba(255,255,255,0.85)';

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: BrandColors.glassBorder,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Animated Entry Wrappers ────────────────────────────────────────────────
interface AnimEntryProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeDown({ children, delay = 0, style }: AnimEntryProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export function FadeUp({ children, delay = 0, style }: AnimEntryProps) {
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export function FadeRight({ children, delay = 0, style }: AnimEntryProps) {
  return (
    <Animated.View entering={FadeInRight.duration(400).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export function FadeLeft({ children, delay = 0, style }: AnimEntryProps) {
  return (
    <Animated.View entering={FadeInLeft.duration(400).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

// ─── Animated Press Hook (scale on press) ──────────────────────────────────
export function useScalePress() {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

// ─── Pulsing Glow (for recording indicator, etc.) ───────────────────────────
export function usePulse(active: boolean) {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 250 });
    }
  }, [active, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return pulseStyle;
}

// ─── Floating Orbs (decorative) ─────────────────────────────────────────────
interface FloatingOrbProps {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  delay?: number;
}

export function FloatingOrb({ color, size, top, left, right, bottom, delay = 0 }: FloatingOrbProps) {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2200 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 2200 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [delay, translateY]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const posStyle: ViewStyle = {};
  if (top !== undefined) posStyle.top = top;
  if (bottom !== undefined) posStyle.bottom = bottom;
  if (left !== undefined) posStyle.left = left;
  if (right !== undefined) posStyle.right = right;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.22,
          ...posStyle,
        },
        orbStyle,
      ]}
    />
  );
}

// ─── Step Badge (numbered circle) ──────────────────────────────────────────
interface StepBadgeProps {
  number: number;
  color?: string;
}

export function StepBadge({ number, color = BrandColors.indigo }: StepBadgeProps) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
      }}
    >
      <Animated.Text
        style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}
      >
        {String(number)}
      </Animated.Text>
    </View>
  );
}
