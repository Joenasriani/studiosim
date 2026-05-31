import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const bodySchema = z.object({ courseId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: course, error } = await supabase.from('courses').select('*').eq('id', parsed.data.courseId).eq('published', true).single();
  if (error || !course) return NextResponse.json({ error: error?.message ?? 'Course unavailable' }, { status: 404 });

  const { data: existingAccess } = await supabase
    .from('course_access')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('active', true)
    .maybeSingle();

  if (existingAccess) return NextResponse.json({ error: 'You already have access to this course.' }, { status: 409 });

  if (course.access_mode === 'free') {
    const { error: grantError } = await supabase.from('course_access').upsert({
      user_id: user.id,
      course_id: course.id,
      source: 'free_course',
      active: true
    }, { onConflict: 'user_id,course_id' });
    if (grantError) return NextResponse.json({ error: grantError.message }, { status: 500 });
    return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/courses` });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = course.stripe_price_id || process.env.STRIPE_PRICE_FULL_COURSE;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  if (!secret || !price) {
    return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY and a Stripe price ID before selling this course.' }, { status: 501 });
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price]', price);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', `${appUrl}/courses?checkout=success`);
  form.set('cancel_url', `${appUrl}/courses?checkout=cancelled`);
  form.set('customer_email', user.email ?? '');
  form.set('metadata[user_id]', user.id);
  form.set('metadata[course_id]', course.id);
  form.set('metadata[product]', 'studiosim_course_access');

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const stripeBody = await stripeResponse.json();
  if (!stripeResponse.ok) return NextResponse.json({ error: stripeBody.error?.message ?? 'Stripe checkout failed.' }, { status: 502 });

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'checkout_started',
    course_id: course.id,
    properties: { price }
  });

  return NextResponse.json({ url: stripeBody.url });
}
