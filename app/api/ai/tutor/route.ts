import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { parseLessonSchema } from '@/lib/learning-engine';
import { evaluateAttempt, getDefaultAttempt, type LearnerAttempt } from '@/lib/lesson-evaluator';
import { requestOpenRouterTutor } from '@/lib/openrouter';
import type { Lesson, LearnerProgress } from '@/types/database';

const easeSchema = z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'overshoot']);
const attemptSchema = z.object({
  duration: z.number().min(0).max(20),
  ease: easeSchema,
  overshoot: z.number().min(0).max(3),
  anticipation: z.number().min(0).max(3),
  settleHold: z.number().min(0).max(5)
});
const assessmentSchema = z.object({
  reflection: z.string().default(''),
  checks: z.record(z.string(), z.boolean()).default({})
});
const bodySchema = z.object({
  lessonId: z.string().uuid(),
  attempt: attemptSchema,
  assessment: assessmentSchema.default({ reflection: '', checks: {} })
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', parsed.data.lessonId)
    .eq('published', true)
    .single();

  if (lessonError || !lesson) return NextResponse.json({ error: lessonError?.message ?? 'Lesson unavailable' }, { status: 404 });

  const lessonRow = lesson as Lesson;
  const schema = parseLessonSchema(lessonRow.lesson_schema);
  const fallbackAttempt = getDefaultAttempt(schema);
  const attempt: LearnerAttempt = { ...fallbackAttempt, ...parsed.data.attempt };
  const result = evaluateAttempt(schema, attempt, parsed.data.assessment);

  const { data: progress } = await supabase
    .from('learner_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', parsed.data.lessonId)
    .maybeSingle();

  const tutor = await requestOpenRouterTutor({ lesson: lessonRow, schema, attempt, result, progress: progress as LearnerProgress | null });

  await supabase.from('ai_tutor_events').insert({
    user_id: user.id,
    lesson_id: lessonRow.id,
    model_used: tutor.modelUsed,
    score_snapshot: result.score,
    request_snapshot: { attempt, assessment: parsed.data.assessment, result },
    response_snapshot: tutor
  });

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'ai_tutor_requested',
    course_id: lessonRow.course_id,
    lesson_id: lessonRow.id,
    properties: { model_used: tutor.modelUsed, score: result.score, passed: result.passed }
  });

  return NextResponse.json({ tutor, deterministic: { score: result.score, passed: result.passed, feedback: result.feedback } });
}
