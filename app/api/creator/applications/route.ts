import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const applicationSchema = z.object({
  display_name: z.string().min(2).max(80),
  specialty: z.string().min(4).max(120),
  portfolio_url: z.string().url(),
  proposal: z.string().min(40).max(2000)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = applicationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { error } = await supabase.from('creator_applications').upsert({
    user_id: user.id,
    ...parsed.data,
    status: 'submitted',
    reviewer_note: null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
