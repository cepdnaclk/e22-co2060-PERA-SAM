/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/lib/ThemeContext';

export function useTheme() {
  const { colors, isDark } = useThemeContext();
  const theme = isDark ? 'dark' : 'light';
  return {
    ...Colors[theme],
    ...colors,
    isDark,
  };
}

export function useBrandTheme() {
  const { colors, isDark } = useThemeContext();
  return {
    isDark,
    brandColors: colors,
  };
}
