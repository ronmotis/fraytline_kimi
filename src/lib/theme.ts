import { useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light' | 'fluent' | 'noir' | 'harbor';

export interface ThemeMeta {
  id: ThemeName;
  label: string;
  /** short descriptor shown in the picker */
  hint: string;
  /** swatch dot in the picker */
  swatch: string;
  mode: 'dark' | 'light';
}

/** Registry order = picker order. Dark (Brass & Glacier) is the default. */
export const THEMES: ThemeMeta[] = [
  { id: 'dark', label: 'Brass & Glacier', hint: 'ink-navy · brass action', swatch: '#d9a23b', mode: 'dark' },
  { id: 'noir', label: 'Noir Studio', hint: 'monochrome · white action', swatch: '#8E7CF0', mode: 'dark' },
  { id: 'light', label: 'Flagship Light', hint: 'crisp white · coral action', swatch: '#E04A2F', mode: 'light' },
  { id: 'fluent', label: 'Fluent Ops', hint: 'Microsoft enterprise blue', swatch: '#0F6CBD', mode: 'light' },
  { id: 'harbor', label: 'Harbor Ops', hint: 'Fraytline orange · navy', swatch: '#FF7A1A', mode: 'light' },
];

const KEY = 'fraytline-theme';
const EVENT = 'fraytline-theme';
const VALID = new Set<string>(THEMES.map((t) => t.id));

/** Read the active theme from <html data-theme>. Dark is the default. */
export function getTheme(): ThemeName {
  const v = document.documentElement.dataset.theme;
  return (v && VALID.has(v) ? v : 'dark') as ThemeName;
}

/** Apply + persist a theme, then notify subscribers. */
export function setTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode — non-fatal */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Cycle dark → light (quick flip between the two flagship themes). */
export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

/** Current value of a CSS custom property, e.g. cssVar('--teal') → '#7fc2de'. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * rgba() string from an RGB-triplet custom property, for JS-driven
 * animation/canvas colors: trgb('--teal-rgb', 0.4) → 'rgba(127,194,222,0.4)'.
 */
export function trgb(name: string, alpha: number): string {
  return `rgba(${cssVar(name).replace(/\s+/g, ',')},${alpha})`;
}

/** React hook — re-renders the component when the theme changes. */
export function useTheme(): ThemeName {
  const [t, setT] = useState<ThemeName>(getTheme());
  useEffect(() => {
    const handler = () => setT(getTheme());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return t;
}
