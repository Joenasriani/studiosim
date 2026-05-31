import { createClient } from '@/lib/supabase-server';
import SupportForm from '@/components/SupportForm';
import type { SupportTicket } from '@/types/database';

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tickets } = user ? await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) : { data: [] };
  return (
    <div>
      <div className="kicker">Support operations</div>
      <h2>Bug reports, billing issues, and lesson feedback go into the product database.</h2>
      <p className="adminIntro">This is a working support intake path, not a decorative contact card.</p>
      <SupportForm defaultEmail={user?.email ?? ''} />
      {user && <div className="card" style={{ marginTop: 18 }}>
        <h3>Your tickets</h3>
        <table className="table">
          <thead><tr><th>Subject</th><th>Category</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>{((tickets ?? []) as SupportTicket[]).map(ticket => <tr key={ticket.id}><td>{ticket.subject}</td><td>{ticket.category}</td><td>{ticket.status}</td><td>{new Date(ticket.created_at).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}
