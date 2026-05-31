'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled, then login.');
  }

  return (
    <div className="card">
      <div className="kicker">Open StudioSim</div>
      <h2>Start the interactive course path</h2>
      <div className="form">
        <label className="fieldLabel">Email</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
        <label className="fieldLabel">Password, minimum 6 characters</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} aria-label="Password, minimum 6 characters" />
        <button className="btn primary" onClick={signUp} disabled={loading}>{loading ? 'Creating...' : 'Open StudioSim'}</button>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
