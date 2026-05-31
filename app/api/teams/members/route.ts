import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const bodySchema = z.object({ organizationId: z.string().uuid(), memberEmail: z.string().email() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: organization } = await supabase.from('organizations').select('*').eq('id', parsed.data.organizationId).single();
  if (!organization || organization.owner_id !== user.id) return NextResponse.json({ error: 'Organization owner access required.' }, { status: 403 });

  const { data: memberProfile } = await supabase.from('profiles').select('id,email').eq('email', parsed.data.memberEmail).single();
  if (!memberProfile) return NextResponse.json({ error: 'The user must create an account before a seat can be assigned.' }, { status: 404 });

  const { count } = await supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id);
  if ((count ?? 0) >= organization.seat_limit) return NextResponse.json({ error: 'Seat limit reached.' }, { status: 409 });

  const { error } = await supabase.from('organization_members').insert({ organization_id: organization.id, user_id: memberProfile.id, role: 'member' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('analytics_events').insert({ user_id: user.id, event_name: 'organization_member_added', properties: { organization_id: organization.id } });
  return NextResponse.json({ ok: true });
}
