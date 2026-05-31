import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminPanel from '@/components/AdminPanel';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return <div className="card"><h2>Admin access required</h2><p>Your account is authenticated but does not have the admin role.</p></div>;
  }

  const { data: courses } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  const { data: lessons } = await supabase.from('lessons').select('*').order('order_index', { ascending: true });
  return <AdminPanel courses={courses ?? []} lessons={lessons ?? []} />;
}
