import { z } from 'zod';
import type { EvaluationResult, LearnerAttempt } from '@/lib/lesson-evaluator';
import type { Lesson, LessonSchema, LearnerProgress } from '@/types/database';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_MODEL_ROUTER = 'openrouter/free';

const tutorResponseSchema = z.object({
  summary: z.string().min(12).max(900),
  strongest_move: z.string().min(8).max(500),
  correction_priority: z.string().min(8).max(500),
  next_practice: z.string().min(8).max(500),
  caution: z.string().min(8).max(500),
  confidence: z.enum(['low', 'medium', 'high'])
});

export type TutorResponse = z.infer<typeof tutorResponseSchema> & {
  modelUsed: string;
  provider: 'openrouter';
};

export type TutorRequestContext = {
  lesson: Lesson;
  schema: LessonSchema;
  attempt: LearnerAttempt;
  result: EvaluationResult;
  progress: LearnerProgress | null;
};

function requireOpenRouterKey() {
  const key = process.env.IMMERSIVE_EDU_SANDBOX;
  if (!key) throw new Error('Missing IMMERSIVE_EDU_SANDBOX OpenRouter API key');
  return key;
}

function safeMetricSnapshot(result: EvaluationResult) {
  return result.metrics.map(metric => ({
    id: metric.id,
    label: metric.label,
    current: metric.current,
    target: metric.target,
    status: metric.status,
    score: metric.score
  }));
}

function fallbackTutorResponse(context: TutorRequestContext, reason: string): TutorResponse {
  const weakest = [...context.result.metrics].sort((a, b) => a.score - b.score)[0];
  const passedMetrics = context.result.metrics.filter(metric => metric.status === 'pass').map(metric => metric.label).join(', ') || 'none yet';
  return {
    provider: 'openrouter',
    modelUsed: 'local-deterministic-fallback',
    summary: `AI tutor fallback used because ${reason}. Your current deterministic score is ${context.result.score}/100. The lesson engine says: ${context.result.feedback}`,
    strongest_move: `Your strongest checked metrics are: ${passedMetrics}. Keep those stable while correcting the weakest area.`,
    correction_priority: weakest ? `Prioritize ${weakest.label}. Current value: ${weakest.current}. Target: ${weakest.target}.` : 'Prioritize the first metric marked adjust in the scoring panel.',
    next_practice: `Make one small adjustment, rescore, then write a reflection that explains the production reason behind the change: ${context.schema.assessment.reflectionPrompt}`,
    caution: 'This fallback is deterministic and uses only the lesson rubric. It does not invent external facts or override the pass/fail engine.',
    confidence: 'medium'
  };
}

function parseTutorJson(raw: string, context: TutorRequestContext, modelUsed: string): TutorResponse {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = tutorResponseSchema.parse(JSON.parse(trimmed));
    return { ...parsed, modelUsed, provider: 'openrouter' };
  } catch {
    return fallbackTutorResponse(context, 'the free OpenRouter model returned a non-JSON coaching response');
  }
}

export async function requestOpenRouterTutor(context: TutorRequestContext): Promise<TutorResponse> {
  const apiKey = requireOpenRouterKey();
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-OpenRouter-Title': 'StudioSim'
    },
    body: JSON.stringify({
      model: FREE_MODEL_ROUTER,
      temperature: 0.35,
      max_tokens: 620,
      messages: [
        {
          role: 'system',
          content: [
            'You are a strict motion-design learning coach inside an immersive educational sandbox.',
            'Use only the supplied lesson data, learner attempt, deterministic score, rubric targets, and feedback.',
            'Do not claim the learner passed unless the deterministic result says passed.',
            'Do not invent software features, external course material, or unsupported facts.',
            'Return only compact valid JSON with these keys: summary, strongest_move, correction_priority, next_practice, caution, confidence.',
            'confidence must be one of: low, medium, high.'
          ].join(' ')
        },
        {
          role: 'user',
          content: JSON.stringify({
            lesson: {
              title: context.lesson.title,
              objective: context.lesson.objective,
              order_index: context.lesson.order_index
            },
            briefing: context.schema.briefing,
            passScore: context.schema.assessment.passScore,
            reflectionPrompt: context.schema.assessment.reflectionPrompt,
            attempt: context.attempt,
            deterministicResult: {
              score: context.result.score,
              passed: context.result.passed,
              feedback: context.result.feedback,
              issues: context.result.issues,
              nextHint: context.result.nextHint,
              assessmentReady: context.result.assessmentReady,
              metrics: safeMetricSnapshot(context.result)
            },
            priorProgress: context.progress ? {
              bestScore: context.progress.score,
              attempts: context.progress.attempts,
              status: context.progress.status
            } : null
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return fallbackTutorResponse(context, `OpenRouter returned ${response.status}`);
  }

  const payload = await response.json() as { model?: string; choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return fallbackTutorResponse(context, 'OpenRouter returned an empty response');
  return parseTutorJson(content, context, payload.model ?? FREE_MODEL_ROUTER);
}

export function isFreeOpenRouterModel(modelId: string) {
  return modelId === FREE_MODEL_ROUTER || modelId.endsWith(':free');
}
