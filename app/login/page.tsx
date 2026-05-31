'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    router.push('/dashboard');
  }

  return (
    <div className="card">
      <div className="kicker">Learner login</div>
      <h2>Continue your sandbox training</h2>
      <div className="form">
        <label className="fieldLabel">Email</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
        <label className="fieldLabel">Password</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} aria-label="Password" />
        <button className="btn primary" onClick={signIn} disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
