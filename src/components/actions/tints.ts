// Tinted surfaces as inline styles (design.md §3 tones at 10–14% fill / ~30% border).
// Tailwind v3 cannot apply /alpha modifiers to the var-backed palette tokens,
// so tone-tinted chips/panels use these exact rgba values instead.
import type { CSSProperties } from 'react';

export type TintTone = 'ember' | 'teal' | 'ok' | 'warn' | 'danger' | 'quote';

const TINTS: Record<TintTone, { border: string; bg: string }> = {
  ember: { border: 'rgba(232,145,45,0.32)', bg: 'rgba(232,145,45,0.14)' },
  teal: { border: 'rgba(47,211,190,0.28)', bg: 'rgba(47,211,190,0.12)' },
  ok: { border: 'rgba(76,195,138,0.30)', bg: 'rgba(76,195,138,0.10)' },
  warn: { border: 'rgba(240,180,41,0.32)', bg: 'rgba(240,180,41,0.10)' },
  danger: { border: 'rgba(227,93,91,0.32)', bg: 'rgba(227,93,91,0.10)' },
  quote: { border: 'rgba(143,184,216,0.30)', bg: 'rgba(143,184,216,0.10)' },
};

export function tintStyle(tone: TintTone): CSSProperties {
  return { borderColor: TINTS[tone].border, background: TINTS[tone].bg };
}

export function tintBorder(tone: TintTone): CSSProperties {
  return { borderColor: TINTS[tone].border };
}

/** modal backdrop per §6.2.3 — dims to rgba(14,13,11,0.6) + blur(8px) */
export const BACKDROP_STYLE: CSSProperties = {
  background: 'rgba(14,13,11,0.6)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
