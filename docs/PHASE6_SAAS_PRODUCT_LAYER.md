# Phase 6 - SaaS Product Layer

Phase 6 turns the immersive learning engine into a commercial product shell. The platform now includes real records for access, payments, teams, analytics, and support instead of only course and lesson delivery.

## Added systems

- Pricing and access page at `/pricing`.
- Stripe Checkout session API at `/api/billing/checkout`.
- Stripe webhook grant path at `/api/billing/webhook`.
- Course access table with RLS.
- Preview lesson limit per paid course.
- Paid lesson lock logic layered on top of sequential lesson locking.
- Learner dashboard access summary.
- Organization workspace records.
- Seat assignment to existing users.
- Support ticket page and API.
- Admin analytics and support queue.
- Analytics events for lesson open, progress save, checkout start/completion, support tickets, and organizations.

## Payment behavior

The checkout API calls Stripe Checkout directly through Stripe's HTTP API. If `STRIPE_SECRET_KEY` or a course Stripe price ID is missing, the route returns a configuration error. It does not mark payment as complete.

Required environment values:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_PRICE_FULL_COURSE=
STRIPE_WEBHOOK_SECRET=
```

## Access behavior

A paid course may expose a limited number of preview lessons through `courses.preview_lessons`. For the seeded Motion Design Fundamentals course, the first lesson is preview-accessible. All later lessons require a real `course_access` row and previous-lesson completion.

Lesson unlock now requires:

1. Authenticated user.
2. Course access or preview eligibility.
3. Previous lesson completion when the lesson is not the first lesson.

## Organization behavior

The team console creates `organizations` and owner membership records. Seat assignment currently requires the target user to already have an account. This is deliberate because email-only invitations would need an email provider and token system to be production-complete.

## Support behavior

Support tickets are stored in `support_tickets` and visible to the submitting user. Admins can view the support queue from `/admin/analytics`.

## Analytics behavior

Events are stored in `analytics_events`. Admins can view recent events and counts. This is not yet a full BI dashboard, but it is real event storage with RLS and admin visibility.

## Not included yet

- Stripe customer portal.
- Subscription renewals.
- Organization billing checkout.
- Email invitations.
- Transactional email.
- Production observability provider.
- Privacy/terms legal pages.

Those belong to the next production hardening pass unless prioritized earlier.
