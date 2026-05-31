import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import TeamConsole from '@/components/TeamConsole';
import type { Organization } from '@/types/database';

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: owned } = await supabase.from('organizations').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
  return (
    <div>
      <div className="kicker">Organization layer</div>
      <h2>Team accounts with real seat records.</h2>
      <p className="adminIntro">Create organization workspaces and assign seats to users who already have accounts. This keeps seat assignment verifiable and blocks untraceable invites.</p>
      <TeamConsole />
      <div className="card" style={{ marginTop: 18 }}>
        <h3>Your organizations</h3>
        <table className="table"><thead><tr><th>Name</th><th>Seats</th><th>Status</th><th>ID</th></tr></thead><tbody>{((owned ?? []) as Organization[]).map(org => <tr key={org.id}><td>{org.name}</td><td>{org.seat_limit}</td><td>{org.subscription_status}</td><td>{org.id}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
