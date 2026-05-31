import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import CreatorConsole from '@/components/CreatorConsole';
import type { Course, CourseCategory, CreatorApplication, CreatorSubmission } from '@/types/database';

export default async function CreatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: courses } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  const { data: categories } = await supabase.from('course_categories').select('*').eq('published', true).order('sort_order', { ascending: true });
  const { data: application } = await supabase.from('creator_applications').select('*').eq('user_id', user.id).maybeSingle();
  const { data: submissions } = await supabase.from('creator_submissions').select('*').eq('creator_id', user.id).order('created_at', { ascending: false });

  return <CreatorConsole courses={(courses ?? []) as Course[]} categories={(categories ?? []) as CourseCategory[]} application={(application ?? null) as CreatorApplication | null} submissions={(submissions ?? []) as CreatorSubmission[]} />;
}
