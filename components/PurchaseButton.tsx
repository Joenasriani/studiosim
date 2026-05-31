'use client';

import { useState } from 'react';

export default function PurchaseButton({ courseId, label }: { courseId: string; label: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function startCheckout() {
    setBusy(true);
    setMessage('Opening secure checkout');
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(typeof body.error === 'string' ? body.error : 'Checkout could not start.');
      return;
    }
    window.location.assign(body.url);
  }

  return (
    <div className="commerceAction">
      <button className="btn primary" onClick={startCheckout} disabled={busy}>{busy ? 'Preparing checkout' : label}</button>
      {message && <p className="saveMessage">{message}</p>}
    </div>
  );
}
