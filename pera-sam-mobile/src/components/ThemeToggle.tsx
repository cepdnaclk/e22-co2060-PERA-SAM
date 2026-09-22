import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../lib/ThemeContext';
import { BrandColors } from '../constants/theme';

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 20 }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useThemeContext();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.7, { damping: 10 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    rotation.value = withSpring(rotation.value + 180, { damping: 12 });
    toggleTheme();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: isDark ? '#1e293b' : BrandColors.muted,
          borderColor: isDark ? '#334155' : BrandColors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={size}
          color={isDark ? '#f59e0b' : BrandColors.indigo}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
