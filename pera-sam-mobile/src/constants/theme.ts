/**
 * PERA-SAM Mobile Theme
 * Premium design tokens — vibrant colors, gradients, glassmorphism.
 */

import '@/global.css';
import { Platform } from 'react-native';

// ─── Brand Colors ───────────────────────────────────────────────────────────
export const BrandColors = {
  // Core
  background: '#f0f4ff',
  foreground: '#0f172a',
  accent: '#14b8a6',       // Teal-500
  accentDark: '#0d9488',   // Teal-600
  accentLight: '#ccfbf1',  // Teal-100

  // Surfaces
  card: '#ffffff',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',

  // Status (for analysis results)
  success: '#22c55e',       // Green — Normal
  successLight: '#dcfce7',
  warning: '#f59e0b',       // Amber — Warning
  warningLight: '#fef3c7',
  danger: '#ef4444',        // Red — Anomaly
  dangerLight: '#fee2e2',

  // Misc
  destructive: '#ef4444',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#ffffff',
  black: '#000000',

  // Gradient stops
  gradientStart: '#14b8a6',
  gradientEnd: '#0ea5e9',

  // ── Vibrant Accent Palette ─────────────────────────────────────────────
  indigo: '#6366f1',
  indigoLight: '#e0e7ff',
  indigoDark: '#4f46e5',

  purple: '#8b5cf6',
  purpleLight: '#ede9fe',
  purpleDark: '#7c3aed',

  blue: '#3b82f6',
  blueLight: '#dbeafe',
  blueDark: '#2563eb',

  cyan: '#06b6d4',
  cyanLight: '#cffafe',
  cyanDark: '#0891b2',

  pink: '#ec4899',
  pinkLight: '#fce7f3',
  pinkDark: '#db2777',

  orange: '#f97316',
  orangeLight: '#ffedd5',
  orangeDark: '#ea580c',

  rose: '#f43f5e',
  roseLight: '#ffe4e6',
  roseDark: '#e11d48',

  amber: '#f59e0b',
  amberLight: '#fef3c7',
  amberDark: '#d97706',

  emerald: '#10b981',
  emeraldLight: '#d1fae5',
  emeraldDark: '#059669',

  // ── Deep Backgrounds ───────────────────────────────────────────────────
  deepBg: '#0f172a',
  deepCard: '#1e293b',
  deepBorder: '#334155',

  // ── Glassmorphism ──────────────────────────────────────────────────────
  glassWhite: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  glassOverlay: 'rgba(255, 255, 255, 0.12)',
} as const;

// ─── Gradient Presets (layered View stops) ──────────────────────────────────
export const GradientPresets = {
  heroHeader: ['#6366f1', '#8b5cf6', '#06b6d4'],   // indigo → purple → cyan
  warmAccent: ['#f97316', '#ec4899'],                // orange → pink
  coolAccent: ['#3b82f6', '#06b6d4'],                // blue → cyan
  tealGlow: ['#14b8a6', '#06b6d4'],                  // teal → cyan
  successGlow: ['#10b981', '#22c55e'],               // emerald → green
  warningGlow: ['#f59e0b', '#f97316'],               // amber → orange
  dangerGlow: ['#ef4444', '#f43f5e'],                // red → rose
  purpleBlush: ['#8b5cf6', '#ec4899'],               // purple → pink
  sunsetGlow: ['#f97316', '#f43f5e', '#ec4899'],     // orange → rose → pink
} as const;

// ─── Status Map ─────────────────────────────────────────────────────────────
export type AnalysisStatus = 'normal' | 'warning' | 'abnormal';

export const StatusConfig: Record<AnalysisStatus, { color: string; bg: string; label: string; icon: string; gradient: readonly string[] }> = {
  normal: {
    color: BrandColors.success,
    bg: BrandColors.successLight,
    label: 'Normal',
    icon: 'checkmark-circle',
    gradient: GradientPresets.successGlow,
  },
  warning: {
    color: BrandColors.warning,
    bg: BrandColors.warningLight,
    label: 'Warning',
    icon: 'alert-circle',
    gradient: GradientPresets.warningGlow,
  },
  abnormal: {
    color: BrandColors.danger,
    bg: BrandColors.dangerLight,
    label: 'Anomaly',
    icon: 'close-circle',
    gradient: GradientPresets.dangerGlow,
  },
};

// ─── Machine Categories ─────────────────────────────────────────────────────
export const MachineCategories = [
  { value: 'fan', label: 'Fan', icon: 'flash-outline', color: BrandColors.orange, bg: BrandColors.orangeLight },
  { value: 'pump', label: 'Pump', icon: 'water-outline', color: BrandColors.blue, bg: BrandColors.blueLight },
  { value: 'slider', label: 'Slider', icon: 'swap-horizontal-outline', color: BrandColors.purple, bg: BrandColors.purpleLight },
  { value: 'valve', label: 'Valve', icon: 'git-branch-outline', color: BrandColors.emerald, bg: BrandColors.emeraldLight },
] as const;

// ─── Legacy Colors export (for compatibility) ──────────────────────────────
export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ─── Typography ─────────────────────────────────────────────────────────────
export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
  bigNumber: { fontSize: 36, fontWeight: '800' as const },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }),
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  }),
};

// ─── Layout ─────────────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};
