'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email,password}) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? 'Sign in failed.');
    router.push('/dashboard');
  }
  return <main className="auth-shell"><div className="auth-card"><div className="eyebrow">Welcome back</div><h1>Sign in to CodeRoom</h1><p className="auth-subtitle">Open your rooms, resume a session and keep collaborating.</p><form className="form-grid" onSubmit={submit}><div className="field"><label>Email</label><div className="input-with-icon"><Mail size={16}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" required /></div></div><div className="field"><label>Password</label><div className="input-with-icon"><LockKeyhole size={16}/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Your password" required /></div></div>{error && <div className="form-error">{error}</div>}<button className="button button-gold" disabled={busy}>{busy ? <span className="button-loading"><span className="spinner"/> Signing in…</span> : 'Sign in'}</button></form><p className="form-meta">New to CodeRoom? <Link href="/register">Create an account</Link></p></div></main>;
}
