import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map(part => {
    const [key, value] = part.split('=');
    return [key, value];
  }));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Stripe webhook secret missing.' }, { status: 501 });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!verifyStripeSignature(rawBody, signature, secret)) return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });

  const event = JSON.parse(rawBody);
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const courseId = session.metadata?.course_id;
    if (userId && courseId) {
      const supabase = await createClient();
      await supabase.from('course_access').upsert({
        user_id: userId,
        course_id: courseId,
        source: 'stripe_checkout',
        active: true,
        stripe_checkout_session_id: session.id
      }, { onConflict: 'user_id,course_id' });
      await supabase.from('analytics_events').insert({
        user_id: userId,
        event_name: 'checkout_completed',
        course_id: courseId,
        properties: { session_id: session.id, amount_total: session.amount_total, currency: session.currency }
      });
    }
  }
  return NextResponse.json({ received: true });
}
