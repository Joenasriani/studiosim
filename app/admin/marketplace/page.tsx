import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import MarketplaceReviewConsole from '@/components/MarketplaceReviewConsole';
import type { CreatorApplication, CreatorSubmission } from '@/types/database';

export default async function MarketplaceAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return <div className="card"><h2>Admin access required</h2><p>Your account is authenticated but does not have marketplace review privileges.</p></div>;
  }

  const { data: applications } = await supabase.from('creator_applications').select('*').order('created_at', { ascending: false });
  const { data: submissions } = await supabase.from('creator_submissions').select('*, courses(title, slug)').order('created_at', { ascending: false });

  return <MarketplaceReviewConsole applications={(applications ?? []) as CreatorApplication[]} submissions={(submissions ?? []) as (CreatorSubmission & { courses?: { title?: string; slug?: string } | null })[]} />;
}
