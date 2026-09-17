/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, BrandColors, DarkBrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const isDark = theme === 'dark';
  const brand = isDark ? DarkBrandColors : BrandColors;

  return {
    ...Colors[theme],
    ...brand,
    isDark,
  };
}

export function useBrandTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    brandColors: isDark ? DarkBrandColors : BrandColors,
  };
}
