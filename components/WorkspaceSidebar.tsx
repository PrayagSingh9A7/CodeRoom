'use client';

import Link from 'next/link';
import { BarChart3, Home, LogOut, Plus, Settings, Sparkles, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

type User = { id:string; name:string; email:string };

export default function WorkspaceSidebar({ user, onCreate }: { user: User; onCreate?: () => void }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return <aside className="workspace-sidebar">
    <div>
      <div className="sidebar-brand-wrap"><div className="sidebar-overline">Workspace</div><div className="sidebar-title">CodeRoom</div></div>
      <nav className="sidebar-nav">
        <Link className={active('/dashboard') ? 'active' : ''} href="/dashboard"><Home size={16}/> Overview</Link>
        <button className="sidebar-create" onClick={onCreate}><Plus size={16}/> New room</button>
        <Link className={active('/profile') ? 'active' : ''} href="/profile"><UserRound size={16}/> Profile</Link>
        <Link className={active('/settings') ? 'active' : ''} href="/settings"><Settings size={16}/> Settings</Link>
      </nav>
    </div>
    <div className="sidebar-bottom">
      <button className="sidebar-theme" onClick={toggle}><span><Sparkles size={15}/> Appearance</span><span className="theme-state">{theme === 'light' ? 'Light' : 'Dark'}</span></button>
      <div className="sidebar-user-card"><div className="avatar large">{user.name.slice(0,1).toUpperCase()}</div><div className="sidebar-user-copy"><strong>{user.name}</strong><span>{user.email}</span></div></div>
      <button className="sidebar-logout" onClick={logout}><LogOut size={15}/> Sign out</button>
    </div>
  </aside>;
}
