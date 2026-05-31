# Phase 7 Audit - AI Tutor Layer

## Status

Phase 7 is complete at source implementation, typecheck, and production-build-output level.

## Verified

- `npm run typecheck` passed with exit code 0.
- Production build compiled successfully.
- Production build completed TypeScript.
- Production build generated all static pages and route table.
- `/api/ai/tutor` appears in the Next.js route table.
- Active model scan found only `openrouter/free` in AI request code.
- Key scan found `IMMERSIVE_EDU_SANDBOX` and no direct OpenAI API key wiring.
- AI tutor route recomputes the deterministic score server-side before requesting coaching.
- AI tutor response is schema-validated JSON.
- Deterministic fallback exists for OpenRouter failure or invalid model output.
- AI tutor events are logged to `ai_tutor_events`.
- Database model constraint blocks non-free model ids except deterministic fallback.
- Existing lesson scoring, progress save, locking, course spine, certificate gate, and WebXR workbench UI were preserved.

## Build limitation

The captured `next build` output showed successful compile, TypeScript completion, static generation, finalization, and route table generation. The terminal process did not return a clean captured shell exit line before tool timeout, so I am not marking it as a perfectly captured exit-code build pass.

## Not verified

- Live OpenRouter API call with the real key.
- Vercel environment variable injection.
- Live Supabase RLS behavior for `ai_tutor_events`.
- Real browser visual QA.
- Meta Quest Browser runtime.
- Stripe webhook runtime from Phase 6.

## Required runtime checks before Phase 8

1. Add `IMMERSIVE_EDU_SANDBOX` to `.env.local` locally or to Vercel project settings.
2. Run updated `supabase/schema.sql`.
3. Sign in as learner.
4. Open a sandbox lesson.
5. Press **Ask AI tutor**.
6. Confirm the coach response appears.
7. Confirm `ai_tutor_events` receives a row.
8. Remove or invalidate the key and confirm deterministic fallback still returns useful coaching.
9. Confirm progress save still works after using AI tutor.
10. Confirm lesson completion and certificate gate remain deterministic, not AI-controlled.
