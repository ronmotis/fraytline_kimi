import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import { THEMES, setTheme, useTheme } from '@/lib/theme';
import type { ThemeMeta } from '@/lib/theme';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Theme picker — button in the top bar opens a dropdown with all themes.
 * Dark (Brass & Glacier) stays the default; selection persists via localStorage.
 */
export default function ThemeToggle() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current: ThemeMeta = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const dark = current.mode === 'dark';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 rounded-chip p-2 text-text-2 transition-colors hover:text-text-1"
        title={`Theme: ${current.label} — click to change`}
        aria-label="Choose theme"
        aria-expanded={open}
      >
        <motion.span
          key={theme}
          initial={{ rotate: -40, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="flex"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
        <span className="hidden text-caption xl:inline">{current.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="glass absolute right-0 top-full z-[90] mt-2 w-64 overflow-hidden rounded-card border border-line-strong shadow-modal"
          >
            <div className="flex items-center gap-1.5 border-b border-line-hairline px-3.5 py-2.5 text-micro uppercase text-text-3">
              <Palette className="h-3 w-3" /> Theme
            </div>
            <div className="p-1.5">
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-chip px-2.5 py-2 text-left transition-colors duration-150',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong"
                      style={{ background: t.swatch }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-small text-text-1">{t.label}</span>
                      <span className="block text-caption text-text-3">{t.hint}</span>
                    </span>
                    {t.mode === 'dark' ? (
                      <Moon className="h-3 w-3 shrink-0 text-text-3" />
                    ) : (
                      <Sun className="h-3 w-3 shrink-0 text-text-3" />
                    )}
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-teal" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
