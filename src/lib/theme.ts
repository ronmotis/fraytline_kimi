import { useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light';

const KEY = 'fraytline-theme';
const EVENT = 'fraytline-theme';

/** Read the active theme from <html data-theme>. Dark is the default. */
export function getTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
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

/** React hook — re-renders the component when the theme flips. */
export function useTheme(): ThemeName {
  const [t, setT] = useState<ThemeName>(getTheme());
  useEffect(() => {
    const handler = () => setT(getTheme());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return t;
}
