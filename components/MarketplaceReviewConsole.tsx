'use client';

import { useState } from 'react';
import type { CreatorApplication, CreatorSubmission } from '@/types/database';

type SubmissionRow = CreatorSubmission & { courses?: { title?: string; slug?: string } | null };

export default function MarketplaceReviewConsole({ applications, submissions }: { applications: CreatorApplication[]; submissions: SubmissionRow[] }) {
  const [message, setMessage] = useState('');

  async function review(kind: 'application' | 'submission', id: string, status: 'approved' | 'changes_requested' | 'rejected', note: string) {
    setMessage('Saving review decision.');
    const response = await fetch('/api/admin/marketplace/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, status, reviewer_note: note })
    });
    const body = await response.json();
    setMessage(response.ok ? 'Review saved. Refresh to see updated queues.' : JSON.stringify(body.error ?? body));
  }

  return (
    <div>
      <div className="kicker">Marketplace governance</div>
      <h2>Review creator access and course submissions</h2>
      <p className="adminIntro">This queue protects the marketplace from generic content. Approval updates real database state and determines whether a course can appear publicly.</p>
      {message && <p className="feedbackText">{message}</p>}

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Creator applications</h3>
        <table className="table">
          <thead><tr><th>Creator</th><th>Specialty</th><th>Status</th><th>Decision</th></tr></thead>
          <tbody>{applications.map(item => <tr key={item.id}><td>{item.display_name}<br /><span>{item.portfolio_url}</span></td><td>{item.specialty}</td><td>{item.status}</td><td><button className="btn" onClick={() => review('application', item.id, 'approved', 'Approved for curated sandbox publishing.')}>Approve</button> <button className="btn" onClick={() => review('application', item.id, 'changes_requested', 'Clarify the learning outcome and production evidence.')}>Request changes</button> <button className="btn danger" onClick={() => review('application', item.id, 'rejected', 'Rejected: not aligned with current marketplace quality bar.')}>Reject</button></td></tr>)}</tbody>
        </table>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h3>Course submissions</h3>
        <table className="table">
          <thead><tr><th>Course</th><th>Category</th><th>Status</th><th>Decision</th></tr></thead>
          <tbody>{submissions.map(item => <tr key={item.id}><td>{item.submission_title}<br /><span>{item.courses?.title ?? item.course_id}</span></td><td>{item.category_slug}</td><td>{item.review_status}</td><td><button className="btn" onClick={() => review('submission', item.id, 'approved', 'Approved for marketplace listing.')}>Approve</button> <button className="btn" onClick={() => review('submission', item.id, 'changes_requested', 'Revise the course summary, proof of outcomes, or lesson progression.')}>Request changes</button> <button className="btn danger" onClick={() => review('submission', item.id, 'rejected', 'Rejected: does not meet current marketplace standard.')}>Reject</button></td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
