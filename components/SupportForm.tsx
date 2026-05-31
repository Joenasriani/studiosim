'use client';

import { useState } from 'react';

export default function SupportForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  async function submitTicket() {
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, subject, category, message })
    });
    const body = await response.json();
    setStatus(response.ok ? `Ticket recorded: ${body.ticketId}` : JSON.stringify(body.error ?? body));
  }

  return (
    <div className="card supportConsole">
      <div className="deckHeader"><h3>Submit a product support ticket</h3><span className="statusPill pass">Stored in database</span></div>
      <div className="form">
        <label className="fieldLabel">Email</label>
        <input className="input" value={email} onChange={event => setEmail(event.target.value)} aria-label="Support email" />
        <label className="fieldLabel">Subject</label>
        <input className="input" value={subject} onChange={event => setSubject(event.target.value)} aria-label="Support subject" />
        <label className="fieldLabel">Category</label>
        <select className="input" value={category} onChange={event => setCategory(event.target.value)} aria-label="Support category">
          <option value="technical">Technical issue</option>
          <option value="billing">Billing/access</option>
          <option value="lesson">Lesson feedback</option>
          <option value="organization">Team account</option>
        </select>
        <label className="fieldLabel">Message</label>
        <textarea className="input" value={message} onChange={event => setMessage(event.target.value)} aria-label="Support message" />
        <button className="btn primary" onClick={submitTicket}>Create support ticket</button>
        {status && <p>{status}</p>}
      </div>
    </div>
  );
}
