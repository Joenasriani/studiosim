# StudioSim

StudioSim is a browser-native practice studio for creative production skills. It turns motion design, edit rhythm, camera timing, and post-production judgment into interactive WebGL/WebXR workrooms instead of passive tutorial watching.

## What is included

- Next.js App Router application
- Supabase authentication and database schema
- Course and lesson system
- Ten-lab motion production course
- Deterministic scoring engine
- Reflection and production-check gates
- WebGL workroom runtime
- WebXR entry path and controller-console layer
- Stripe Checkout access flow
- Team seats and support tickets
- Admin analytics and publishing tools
- OpenRouter-only AI tutor using `openrouter/free`
- Curated creator marketplace and review queue

## Local setup

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run build
npm run dev
```

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_PRICE_FULL_COURSE=
STRIPE_WEBHOOK_SECRET=

IMMERSIVE_EDU_SANDBOX=
```

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add Supabase URL and anon key to `.env.local`.
4. Create a user account.
5. Promote an admin:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Stripe

The checkout route creates a real Stripe Checkout Session. The webhook route grants course access only after a signed `checkout.session.completed` event.

Webhook endpoint:

```text
https://your-domain.com/api/billing/webhook
```

## AI tutor

AI uses OpenRouter free routing only.

```env
IMMERSIVE_EDU_SANDBOX=your_openrouter_key
```

The tutor explains the rubric result, but it never changes scores, unlocks lessons, grants certificates, or replaces the deterministic evaluator.

## Main routes

- `/` - StudioSim landing page
- `/courses` - Course spine, progress, access locks
- `/marketplace` - Curated course expansion surface
- `/creator` - Creator application and submission console
- `/pricing` - Course access page
- `/dashboard` - Learner progress and access summary
- `/teams` - Team workspace and seat assignment
- `/support` - Support ticket intake
- `/admin` - Course and lesson publishing
- `/admin/analytics` - Analytics events and support queue
- `/admin/marketplace` - Creator/course review queue
- `/sandbox/[lessonId]` - Interactive WebGL/WebXR lesson runtime
- `/certificates/[courseId]` - Completion certificate gate

## Vercel

See `DEPLOYMENT_VERCEL.md` for exact Vercel settings.
