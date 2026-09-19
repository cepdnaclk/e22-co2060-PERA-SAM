import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={(e) => toggleTheme(e)}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
        bg-muted hover:bg-accent/10 border border-border hover:border-accent/30
        text-muted-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {/* Sun icon — shown in dark mode so clicking switches to light */}
      <Sun
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
        }}
      />
      {/* Moon icon — shown in light mode so clicking switches to dark */}
      <Moon
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      />
    </button>
  );
};
