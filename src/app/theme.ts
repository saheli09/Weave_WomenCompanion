import { useEffect, useState } from 'react';
import { useWeave } from '../state/store';

/**
 * Light or dark, as the app should draw now (decision 2026-10-30): her choice in
 * Settings, or the phone's when she leaves it on System. Follows the phone live.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useWeave((s) => s.theme);
  const query = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  const [systemDark, setSystemDark] = useState(Boolean(query?.matches));
  useEffect(() => {
    if (!query) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, [query]);
  return pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
}
