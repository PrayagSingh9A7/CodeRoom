'use client';

import Link from 'next/link';
import { LayoutDashboard, LogOut, UserRound, Settings, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';

export default function AppHeader() {
  const [user, setUser] = useState<{ id:string; name:string; email:string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (r.ok) setUser((await r.json()).user);
    }).catch(() => undefined).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return <header className="app-header">
    <Brand />
    <div className="header-actions">
      <ThemeToggle compact />
      {!authChecked ? <div className="header-auth-placeholder"/> : user ? <>
        <Link className="text-button desktop-only" href="/dashboard"><LayoutDashboard size={16}/> Dashboard</Link>
        <div className="profile-menu" ref={ref}>
          <button className="profile-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}>
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="profile-trigger-copy desktop-only"><strong>{user.name}</strong><small>{user.email}</small></span>
            <ChevronDown size={15}/>
          </button>
          {open && <div className="profile-menu-popover">
            <Link href="/profile" onClick={() => setOpen(false)}><UserRound size={15}/> Profile</Link>
            <Link href="/settings" onClick={() => setOpen(false)}><Settings size={15}/> Settings</Link>
            <button onClick={logout}><LogOut size={15}/> Sign out</button>
          </div>}
        </div>
      </> : <>
        <Link className="text-button" href="/login">Sign in</Link>
        <Link className="button button-gold" href="/register">Get started</Link>
      </>}
    </div>
  </header>;
}
