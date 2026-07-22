// Tinted surfaces as inline styles (design.md §3 tones at 10–14% fill / ~30% border).
// Values are computed from the live CSS theme variables, so they follow the
// dark (Brass & Glacier) / light (Flagship Light) switch automatically.
import type { CSSProperties } from 'react';
import { trgb } from '@/lib/theme';

export type TintTone = 'ember' | 'teal' | 'ok' | 'warn' | 'danger' | 'quote';

const ALPHAS: Record<TintTone, { border: number; bg: number }> = {
  ember: { border: 0.32, bg: 0.14 },
  teal: { border: 0.28, bg: 0.12 },
  ok: { border: 0.30, bg: 0.10 },
  warn: { border: 0.32, bg: 0.10 },
  danger: { border: 0.32, bg: 0.10 },
  quote: { border: 0.30, bg: 0.10 },
};

export function tintStyle(tone: TintTone): CSSProperties {
  const a = ALPHAS[tone];
  return {
    borderColor: trgb(`--${tone}-rgb`, a.border),
    background: trgb(`--${tone}-rgb`, a.bg),
  };
}

export function tintBorder(tone: TintTone): CSSProperties {
  return { borderColor: trgb(`--${tone}-rgb`, ALPHAS[tone].border) };
}

/** modal backdrop per §6.2.3 — canvas dim + blur(8px), theme-aware */
export function backdropStyle(): CSSProperties {
  return {
    background: trgb('--canvas-rgb', 0.6),
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
}
