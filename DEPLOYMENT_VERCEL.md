# StudioSim - Vercel Deployment Notes

## Vercel project settings

- Framework preset: Next.js
- Install command: `npm ci --no-audit --no-fund --prefer-online`
- Build command: `npm run build`
- Output directory: leave empty / Vercel default
- Root directory: repository root
- Node.js version: Vercel default unless your account requires pinning Node 20+

## Required environment variables

Add these in Vercel Project Settings -> Environment Variables.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app

STRIPE_SECRET_KEY=
STRIPE_PRICE_FULL_COURSE=
STRIPE_WEBHOOK_SECRET=

IMMERSIVE_EDU_SANDBOX=
```

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor before testing the app.

## Stripe webhook endpoint

Use this endpoint in Stripe:

```text
https://your-vercel-domain.vercel.app/api/billing/webhook
```

The webhook must listen for:

```text
checkout.session.completed
```

## OpenRouter

The AI tutor uses `IMMERSIVE_EDU_SANDBOX` and the `openrouter/free` router only.

## Final smoke test after deploy

1. Open `/signup` and create an account.
2. Run the admin promotion SQL for your email.
3. Open `/courses` and confirm the ten StudioSim labs appear.
4. Complete Lesson 1 and verify Lesson 2 unlocks only after completion/access.
5. Open `/pricing` and test Stripe Checkout in test mode.
6. Verify the Stripe webhook grants `course_access`.
7. Open a lesson and request AI tutor coaching.
8. Open `/creator`, submit an application, then approve it from `/admin/marketplace`.
9. Test `/marketplace` listing behavior.
10. Test a WebXR lesson on Quest Browser before claiming headset readiness.


## Node runtime

Use Node.js 22.x in Vercel Project Settings.
