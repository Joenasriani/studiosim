import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import type { AnalyticsEvent, SupportTicket } from '@/types/database';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return <div className="card"><h2>Admin access required</h2><p>Your account is authenticated but does not have the admin role.</p></div>;

  const { data: events } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(80);
  const { data: tickets } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(40);
  const eventRows = (events ?? []) as AnalyticsEvent[];
  const eventCounts = eventRows.reduce<Record<string, number>>((acc, event) => { acc[event.event_name] = (acc[event.event_name] ?? 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="kicker">Admin intelligence</div>
      <h2>Analytics and support queue</h2>
      <div className="grid three">
        {Object.entries(eventCounts).map(([name, count]) => <div className="card metricTile" key={name}><span>{name}</span><strong>{count}</strong></div>)}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3>Recent analytics events</h3>
        <table className="table"><thead><tr><th>Event</th><th>User</th><th>Lesson</th><th>Created</th></tr></thead><tbody>{eventRows.map(event => <tr key={event.id}><td>{event.event_name}</td><td>{event.user_id ?? 'anonymous'}</td><td>{event.lesson_id ?? event.course_id ?? 'n/a'}</td><td>{new Date(event.created_at).toLocaleString()}</td></tr>)}</tbody></table>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3>Support queue</h3>
        <table className="table"><thead><tr><th>Subject</th><th>Email</th><th>Category</th><th>Status</th></tr></thead><tbody>{((tickets ?? []) as SupportTicket[]).map(ticket => <tr key={ticket.id}><td>{ticket.subject}</td><td>{ticket.email}</td><td>{ticket.category}</td><td>{ticket.status}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
