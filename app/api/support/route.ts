import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const bodySchema = z.object({
  email: z.string().email(),
  subject: z.string().min(4).max(120),
  category: z.string().min(3).max(40),
  message: z.string().min(12).max(3000)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.from('support_tickets').insert({
    user_id: user?.id ?? null,
    ...parsed.data
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (user) await supabase.from('analytics_events').insert({ user_id: user.id, event_name: 'support_ticket_created', properties: { category: parsed.data.category } });
  return NextResponse.json({ ok: true, ticketId: data.id });
}
