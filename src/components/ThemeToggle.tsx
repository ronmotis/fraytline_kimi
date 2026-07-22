import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { toggleTheme, useTheme } from '@/lib/theme';

/** Dark/light switcher — dark (Brass & Glacier) is the default, light is Flagship Light. */
export default function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center gap-1.5 rounded-chip p-2 text-text-2 transition-colors hover:text-text-1"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -40, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </motion.span>
      <span className="hidden text-caption xl:inline">{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
