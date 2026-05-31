# Phase 8 - Marketplace / Expansion Layer

## Purpose

Phase 8 adds the curated expansion layer for StudioSim. The goal is not an open upload dump. The marketplace is governed, reviewed, and tied to the existing learning engine, paid access, progress tracking, and deterministic lesson rules.

## Added product areas

- Public marketplace page at `/marketplace`.
- Creator console at `/creator`.
- Admin marketplace review queue at `/admin/marketplace`.
- Creator application API at `/api/creator/applications`.
- Creator course submission API at `/api/creator/submissions`.
- Admin review API at `/api/admin/marketplace/review`.
- Course categories for expansion tracks.
- Creator applications with review status.
- Marketplace submissions with review status.
- Course marketplace status fields.
- Course review table foundation.

## Marketplace rules

- A creator must be approved before submitting a course.
- A course must be approved before it is publicly treated as a marketplace course.
- Platform-authored courses can remain listed as `platform_published`.
- Creator submissions can be `submitted`, `changes_requested`, `approved`, or `rejected`.
- Review decisions write to database state, not only UI state.
- Paid course access and lesson locking remain controlled by Phase 6 access logic.
- AI tutor behavior remains controlled by Phase 7 and cannot approve courses.

## Expansion categories seeded

- Motion Design
- Video Post-Production
- Spatial Production
- Sound Design

## What is deliberately not added yet

- Public creator revenue share accounting.
- Creator payout handling.
- User-generated asset upload review pipeline.
- Automated plagiarism checks.
- Public star-rating UI.
- Multi-instructor co-authoring.

Those should be implemented only after the marketplace review model is runtime-tested with Supabase and a real admin account.

## Runtime gate

Before treating Phase 8 as production-ready, verify:

1. Run the updated `supabase/schema.sql`.
2. Create a learner user.
3. Open `/creator`.
4. Submit a creator application.
5. Promote an admin.
6. Open `/admin/marketplace`.
7. Approve the creator application.
8. Submit a course to the marketplace.
9. Approve or request changes from the admin review queue.
10. Confirm `/marketplace` only lists platform-published or approved courses.
11. Confirm `/courses` and `/sandbox/[lessonId]` still enforce paid access and sequential lesson locking.
