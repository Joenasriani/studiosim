'use client';

import { useState } from 'react';

export default function TeamConsole() {
  const [name, setName] = useState('');
  const [seatLimit, setSeatLimit] = useState(5);
  const [memberEmail, setMemberEmail] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [message, setMessage] = useState('');

  async function createTeam() {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seatLimit })
    });
    const body = await response.json();
    if (response.ok) setOrganizationId(body.organizationId);
    setMessage(response.ok ? `Team created: ${body.organizationId}` : JSON.stringify(body.error ?? body));
  }

  async function addSeat() {
    const response = await fetch('/api/teams/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, memberEmail })
    });
    const body = await response.json();
    setMessage(response.ok ? 'Member seat assigned.' : JSON.stringify(body.error ?? body));
  }

  return (
    <div className="grid two">
      <div className="card teamVessel">
        <h3>Create organization</h3>
        <div className="form">
          <label className="fieldLabel">Organization name</label>
          <input className="input" value={name} onChange={event => setName(event.target.value)} aria-label="Organization name" />
          <label className="fieldLabel">Seat limit</label>
          <input className="input" type="number" min="1" value={seatLimit} onChange={event => setSeatLimit(Number(event.target.value))} aria-label="Seat limit" />
          <button className="btn primary" onClick={createTeam}>Create team workspace</button>
        </div>
      </div>
      <div className="card teamVessel">
        <h3>Assign a seat</h3>
        <div className="form">
          <label className="fieldLabel">Organization ID</label>
          <input className="input" value={organizationId} onChange={event => setOrganizationId(event.target.value)} aria-label="Organization ID" />
          <label className="fieldLabel">Member email</label>
          <input className="input" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} aria-label="Member email" />
          <button className="btn" onClick={addSeat}>Assign member seat</button>
          {message && <p>{message}</p>}
        </div>
      </div>
    </div>
  );
}
