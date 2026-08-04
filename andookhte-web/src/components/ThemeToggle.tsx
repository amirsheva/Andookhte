import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../store/themeContext';
import { haptic } from '../hooks/useMediaQuery';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => {
        haptic(12);
        toggle();
      }}
      aria-label={isDark ? 'روشن کردن تم' : 'تاریک کردن تم'}
      title={isDark ? 'تم روشن' : 'تم تاریک'}
      className="glass-soft group relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 50% 50%, rgb(129 140 248 / .35), transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgb(251 191 36 / .35), transparent 70%)',
        }}
      />
      <Sun
        size={18}
        className="absolute text-amber-500 transition-all duration-500"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(-90deg) scale(.4)' : 'rotate(0) scale(1)',
        }}
      />
      <Moon
        size={18}
        className="absolute text-indigo-300 transition-all duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(.4)',
        }}
      />
    </button>
  );
}
