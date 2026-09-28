'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

export default function JoinPage(){const params=useSearchParams();const router=useRouter();const[error,setError]=useState('');useEffect(()=>{const token=params.get('token');if(!token){setError('Missing invite token.');return;} (async()=>{const me=await fetch('/api/auth/me');if(!me.ok){router.replace(`/login?next=${encodeURIComponent(`/join?token=${token}`)}`);return;}const r=await fetch(`/api/rooms/join/${encodeURIComponent(token)}`,{method:'POST'});const j=await r.json();if(!r.ok){setError(j.error??'Invite could not be accepted.');return;}router.replace(`/room/${j.roomId}`);})();},[params,router]);return <div className="auth-shell">{error?<div className="auth-card"><div className="form-error">{error}</div></div>:<Loading label="Joining the room…"/>}</div>}
