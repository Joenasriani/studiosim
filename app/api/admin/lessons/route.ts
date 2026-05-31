import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { lessonSchemaValidator } from '@/lib/lesson-evaluator';

const lessonPayloadSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(3),
  objective: z.string().min(10),
  order_index: z.number().int().min(1),
  lesson_schema: lessonSchemaValidator,
  published: z.boolean()
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin role required' }, { status: 403 });

  const parsed = lessonPayloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { error } = await supabase.from('lessons').insert({ ...parsed.data, slug: slugify(parsed.data.title) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
