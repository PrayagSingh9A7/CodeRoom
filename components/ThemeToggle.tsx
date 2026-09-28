'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return <button className={compact ? 'icon-button theme-toggle' : 'theme-control'} onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
    {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    {!compact && <span>{theme === 'light' ? 'Light' : 'Dark'}</span>}
  </button>;
}
