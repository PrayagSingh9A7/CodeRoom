'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const saved = window.localStorage.getItem('coderoom-theme') as Theme | null;
    const preferred = saved === 'light' || saved === 'dark' ? saved : 'light';
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);
  const value = useMemo(() => ({ theme, toggle: () => setTheme(current => { const next = current === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; window.localStorage.setItem('coderoom-theme', next); return next; }) }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
