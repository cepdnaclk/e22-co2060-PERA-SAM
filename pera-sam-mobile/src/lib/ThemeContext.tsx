import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandColors } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface DynamicThemeColors {
  isDark: boolean;
  background: string;
  card: string;
  cardSecondary: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  inputBg: string;
  navBar: string;
  navBarBorder: string;
  glassBg: string;
  glassBorder: string;
  badgeBg: string;
  // Brand accents remain vibrant
  accent: string;
  indigo: string;
  purple: string;
  blue: string;
  cyan: string;
  pink: string;
  emerald: string;
  amber: string;
  rose: string;
}

const LIGHT_THEME: DynamicThemeColors = {
  isDark: false,
  background: '#f5f7fa',
  card: '#ffffff',
  cardSecondary: '#f8fafc',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  inputBg: '#ffffff',
  navBar: '#ffffff',
  navBarBorder: '#e2e8f0',
  glassBg: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  badgeBg: '#e0e7ff',
  accent: BrandColors.accent,
  indigo: BrandColors.indigo,
  purple: BrandColors.purple,
  blue: BrandColors.blue,
  cyan: BrandColors.cyan,
  pink: BrandColors.pink,
  emerald: BrandColors.emerald,
  amber: BrandColors.amber,
  rose: BrandColors.rose,
};

const DARK_THEME: DynamicThemeColors = {
  isDark: true,
  background: '#0b0f19',
  card: '#151c2e',
  cardSecondary: '#1e293b',
  foreground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  border: '#2a374f',
  inputBg: '#1e293b',
  navBar: '#111726',
  navBarBorder: '#1e293b',
  glassBg: 'rgba(21, 28, 46, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  badgeBg: 'rgba(99, 102, 241, 0.25)',
  accent: BrandColors.accent,
  indigo: '#818cf8',
  purple: '#a78bfa',
  blue: '#60a5fa',
  cyan: '#22d3ee',
  pink: '#f472b6',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
};

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: DynamicThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: async () => {},
  isDark: false,
  colors: LIGHT_THEME,
});

const STORAGE_KEY = '@perasam_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch((e) => console.warn('Failed to load theme preference:', e));
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to persist theme preference:', e);
    }
  };

  const isDark = mode === 'dark' || (mode === 'system' && deviceScheme === 'dark');
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
