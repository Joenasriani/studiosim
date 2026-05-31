import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().min(0).max(100),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  lastState: z.unknown()
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { lessonId, score, status, lastState } = parsed.data;
  const { data: existing } = await supabase
    .from('learner_progress')
    .select('attempts, score')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const { error } = await supabase.from('learner_progress').upsert({
    user_id: user.id,
    lesson_id: lessonId,
    status,
    score: Math.max(existing?.score ?? 0, score),
    attempts: (existing?.attempts ?? 0) + 1,
    last_state: lastState,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,lesson_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_name: status === 'completed' ? 'lesson_completed' : 'lesson_progress_saved',
    lesson_id: lessonId,
    properties: { score, status, previous_best: existing?.score ?? 0 }
  });

  return NextResponse.json({ ok: true });
}
