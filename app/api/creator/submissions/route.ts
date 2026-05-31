import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const submissionSchema = z.object({
  course_id: z.string().uuid(),
  category_slug: z.string().min(2),
  submission_title: z.string().min(3).max(120),
  submission_note: z.string().min(30).max(2400)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: application } = await supabase.from('creator_applications').select('status').eq('user_id', user.id).maybeSingle();
  if (application?.status !== 'approved') return NextResponse.json({ error: 'Approved creator application required before marketplace submission.' }, { status: 403 });

  const { data: course } = await supabase.from('courses').select('id, title').eq('id', parsed.data.course_id).maybeSingle();
  if (!course) return NextResponse.json({ error: 'Course not found or not visible to this user.' }, { status: 404 });

  const { error } = await supabase.from('creator_submissions').upsert({
    creator_id: user.id,
    ...parsed.data,
    review_status: 'submitted',
    reviewer_note: null,
    reviewed_at: null
  }, { onConflict: 'course_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('courses').update({
    marketplace_status: 'submitted',
    creator_id: user.id,
    category_slug: parsed.data.category_slug,
    marketplace_summary: parsed.data.submission_note
  }).eq('id', parsed.data.course_id);

  return NextResponse.json({ ok: true });
}
