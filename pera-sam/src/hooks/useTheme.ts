import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pera-sam-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = useCallback((event?: React.MouseEvent) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    // ── View Transition API (kavithakanchana.me circle-expand effect) ──────
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      event
    ) {
      const x = event.clientX;
      const y = event.clientY;
      // Largest distance from click point to any corner
      const maxR = Math.hypot(
        Math.max(x, window.innerWidth  - x),
        Math.max(y, window.innerHeight - y),
      );

      document.documentElement.style.setProperty('--vt-x', `${x}px`);
      document.documentElement.style.setProperty('--vt-y', `${y}px`);
      document.documentElement.style.setProperty('--vt-r', `${maxR}px`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).startViewTransition(() => {
        applyTheme(next);
        setTheme(next);
      });
    } else {
      applyTheme(next);
      setTheme(next);
    }
  }, [theme]);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
