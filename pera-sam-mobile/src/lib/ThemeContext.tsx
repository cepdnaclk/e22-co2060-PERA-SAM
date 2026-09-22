import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandColors, DarkBrandColors } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export type BrandColorPalette = Record<keyof typeof BrandColors, string>;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: BrandColorPalette;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = '@perasam:theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: BrandColors,
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark = mode === 'system' ? deviceScheme === 'dark' : mode === 'dark';

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setMode(nextMode);
  };

  const colors = isDark ? DarkBrandColors : BrandColors;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        toggleTheme,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
