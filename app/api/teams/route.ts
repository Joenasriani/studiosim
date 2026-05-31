import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const bodySchema = z.object({ name: z.string().min(3).max(80), seatLimit: z.number().int().min(1).max(500) });
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data: org, error } = await supabase.from('organizations').insert({
    name: parsed.data.name,
    slug: `${slugify(parsed.data.name)}-${user.id.slice(0, 6)}`,
    owner_id: user.id,
    seat_limit: parsed.data.seatLimit
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('organization_members').insert({ organization_id: org.id, user_id: user.id, role: 'owner' });
  await supabase.from('analytics_events').insert({ user_id: user.id, event_name: 'organization_created', properties: { seat_limit: parsed.data.seatLimit } });
  return NextResponse.json({ ok: true, organizationId: org.id });
}
