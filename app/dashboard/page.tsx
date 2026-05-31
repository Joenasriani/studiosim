import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import type { CourseAccess, Organization, LearnerProgress } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: progress, error } = await supabase
    .from('learner_progress')
    .select('*, lessons(title, objective, id), courses:lessons(courses(title))')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  const { data: access } = await supabase.from('course_access').select('*, courses(title)').eq('user_id', user.id).eq('active', true);
  const { data: orgs } = await supabase.from('organizations').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
  const rows = (progress ?? []) as (LearnerProgress & { lessons?: { title?: string } })[];
  const completed = rows.filter(item => item.status === 'completed').length;
  const bestScore = rows.length ? Math.max(...rows.map(item => item.score)) : 0;

  return (
    <div>
      <div className="kicker">Learner operating room</div>
      <h2>Your progress, access, and team layer</h2>
      {error && <p>{error.message}</p>}
      <div className="grid three">
        <div className="card metricTile"><span>Signed in as</span><strong>{user.email}</strong><Link className="btn primary" href="/courses">Continue courses</Link></div>
        <div className="card metricTile"><span>Completed labs</span><strong>{completed}</strong><p>{rows.length} saved attempts recorded.</p></div>
        <div className="card metricTile"><span>Best score</span><strong>{bestScore}</strong><p>Highest saved rubric score.</p></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Course access</h3>
          <table className="table"><thead><tr><th>Course</th><th>Source</th><th>Granted</th></tr></thead><tbody>{((access ?? []) as (CourseAccess & { courses?: { title?: string } })[]).map(item => <tr key={item.id}><td>{item.courses?.title ?? item.course_id}</td><td>{item.source}</td><td>{new Date(item.granted_at).toLocaleDateString()}</td></tr>)}</tbody></table>
          <Link className="btn" href="/pricing">Manage access</Link>
        </div>
        <div className="card">
          <h3>Organizations</h3>
          <table className="table"><thead><tr><th>Name</th><th>Seats</th><th>Status</th></tr></thead><tbody>{((orgs ?? []) as Organization[]).map(org => <tr key={org.id}><td>{org.name}</td><td>{org.seat_limit}</td><td>{org.subscription_status}</td></tr>)}</tbody></table>
          <Link className="btn" href="/teams">Open team console</Link>
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h3>Recent lesson states</h3>
        <table className="table">
          <thead><tr><th>Lesson</th><th>Status</th><th>Score</th><th>Attempts</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.map((item: any) => (
              <tr key={item.id}>
                <td>{item.lessons?.title ?? item.lesson_id}</td>
                <td>{item.status}</td>
                <td>{item.score}</td>
                <td>{item.attempts}</td>
                <td>{new Date(item.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
