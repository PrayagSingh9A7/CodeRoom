'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, UserRound } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter(); const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e: FormEvent){e.preventDefault(); setBusy(true); setError(''); const res=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,password})}); const json=await res.json(); setBusy(false); if(!res.ok)return setError(json.error??'Registration failed.'); router.push('/dashboard');}
  return <main className="auth-shell"><div className="auth-card"><div className="eyebrow">Create your workspace</div><h1>Join CodeRoom</h1><p className="auth-subtitle">A private, polished home for pair programming and technical interviews.</p><form className="form-grid" onSubmit={submit}><div className="field"><label>Name</label><div className="input-with-icon"><UserRound size={16}/><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Prayag Singh" required /></div></div><div className="field"><label>Email</label><div className="input-with-icon"><Mail size={16}/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" required /></div></div><div className="field"><label>Password</label><div className="input-with-icon"><KeyRound size={16}/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required /></div></div>{error && <div className="form-error">{error}</div>}<button className="button button-gold" disabled={busy}>{busy ? <span className="button-loading"><span className="spinner"/> Creating…</span> : 'Create account'}</button></form><p className="form-meta">Already have an account? <Link href="/login">Sign in</Link></p></div></main>;
}
