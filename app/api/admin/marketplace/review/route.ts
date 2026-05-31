import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const reviewSchema = z.object({
  kind: z.enum(['application', 'submission']),
  id: z.string().uuid(),
  status: z.enum(['approved', 'changes_requested', 'rejected']),
  reviewer_note: z.string().min(8).max(1200)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin role required' }, { status: 403 });

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.kind === 'application') {
    const { error } = await supabase.from('creator_applications').update({
      status: parsed.data.status,
      reviewer_note: parsed.data.reviewer_note,
      updated_at: new Date().toISOString()
    }).eq('id', parsed.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: submission, error: submissionError } = await supabase.from('creator_submissions').select('course_id').eq('id', parsed.data.id).maybeSingle();
  if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 500 });
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  const { error } = await supabase.from('creator_submissions').update({
    review_status: parsed.data.status,
    reviewer_note: parsed.data.reviewer_note,
    reviewed_at: new Date().toISOString()
  }).eq('id', parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const courseStatus = parsed.data.status === 'approved' ? 'approved' : parsed.data.status;
  await supabase.from('courses').update({ marketplace_status: courseStatus, reviewer_note: parsed.data.reviewer_note }).eq('id', submission.course_id);

  return NextResponse.json({ ok: true });
}
