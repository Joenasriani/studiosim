# Phase 7 - AI Tutor Layer

## Scope

Phase 7 adds a grounded AI coaching layer to the existing deterministic learning engine. The AI tutor does not score the learner, unlock lessons, grant certificates, or replace the rubric. It explains the current attempt using the lesson schema, deterministic score, metric targets, active issues, progress snapshot, reflection prompt, and production checklist state.

## Provider rule

AI is wired to OpenRouter only.

Environment variable:

```bash
IMMERSIVE_EDU_SANDBOX=
```

Vercel must define the same environment variable before `/api/ai/tutor` can call OpenRouter.

## Free-model rule

The tutor route uses:

```ts
model: 'openrouter/free'
```

The event-log database constraint accepts only:

- `openrouter/free`
- model ids ending in `:free`
- `local-deterministic-fallback`

No paid OpenAI, Anthropic, Gemini, or Auto Router model is wired into the project.

## Runtime behavior

1. Learner tunes lesson controls.
2. Existing deterministic engine computes score, pass/fail, metric status, issues, and next hint.
3. Learner presses **Ask AI tutor**.
4. `/api/ai/tutor` reloads the published lesson server-side.
5. The route recomputes the deterministic result server-side.
6. The route sends only scoped lesson/attempt/result data to OpenRouter.
7. Tutor response must be valid JSON with:
   - `summary`
   - `strongest_move`
   - `correction_priority`
   - `next_practice`
   - `caution`
   - `confidence`
8. Response is logged in `ai_tutor_events`.
9. Analytics event `ai_tutor_requested` is stored.

## Safety and product rules

- AI can coach, explain, and suggest the next practice.
- AI cannot override deterministic score.
- AI cannot mark a lesson complete.
- AI cannot unlock lessons.
- AI cannot invent features outside the current lesson.
- AI cannot claim pass status unless the deterministic result says passed.
- If OpenRouter is unavailable, the route returns a deterministic fallback based on the rubric.

## Files added or changed

- `lib/openrouter.ts`
- `app/api/ai/tutor/route.ts`
- `components/SandboxClient.tsx`
- `app/globals.css`
- `supabase/schema.sql`
- `types/database.ts`
- `.env.example`
- `package.json`

## Vercel deployment variable

Add this in Vercel:

```bash
IMMERSIVE_EDU_SANDBOX=<your-openrouter-key>
```

Optional but recommended:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```
