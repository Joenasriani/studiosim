import { z } from 'zod';
import type { EaseType, LessonControlId, LessonSchema } from '@/types/database';

export type LearnerAttempt = {
  duration: number;
  ease: EaseType;
  overshoot: number;
  anticipation: number;
  settleHold: number;
};

export type AssessmentState = {
  reflection: string;
  checks: Record<string, boolean>;
};

export type EvaluationMetric = {
  id: LessonControlId;
  label: string;
  score: number;
  target: string;
  current: string;
  status: 'pass' | 'adjust';
};

export type EvaluationResult = {
  score: number;
  passed: boolean;
  feedback: string;
  issues: string[];
  metrics: EvaluationMetric[];
  nextHint: { title: string; message: string };
  assessmentReady: boolean;
};

const easeSchema = z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'overshoot']);
const controlIdSchema = z.enum(['duration', 'ease', 'overshoot', 'anticipation', 'settleHold']);

export const lessonSchemaValidator = z.object({
  version: z.literal('1.2'),
  kind: z.literal('motion_design_sandbox'),
  scene: z.object({
    studioName: z.string().min(3),
    cameraPosition: z.tuple([z.number(), z.number(), z.number()]),
    targetPosition: z.tuple([z.number(), z.number(), z.number()]),
    accent: z.string().min(2),
    environmentMood: z.string().min(8)
  }),
  briefing: z.object({
    principle: z.string().min(10),
    scenario: z.string().min(10),
    productionContext: z.string().min(8),
    passCondition: z.string().min(8)
  }),
  controls: z.array(z.discriminatedUnion('id', [
    z.object({ id: z.literal('duration'), label: z.string().min(2), unit: z.string().optional(), min: z.number(), max: z.number(), step: z.number(), default: z.number() }),
    z.object({ id: z.literal('overshoot'), label: z.string().min(2), unit: z.string().optional(), min: z.number(), max: z.number(), step: z.number(), default: z.number() }),
    z.object({ id: z.literal('anticipation'), label: z.string().min(2), unit: z.string().optional(), min: z.number(), max: z.number(), step: z.number(), default: z.number() }),
    z.object({ id: z.literal('settleHold'), label: z.string().min(2), unit: z.string().optional(), min: z.number(), max: z.number(), step: z.number(), default: z.number() }),
    z.object({ id: z.literal('ease'), label: z.string().min(2), default: easeSchema, options: z.array(easeSchema).min(2) })
  ])).min(5),
  assessment: z.object({
    type: z.literal('deterministic_rubric'),
    passScore: z.number().int().min(1).max(100),
    metrics: z.array(z.object({
      id: controlIdSchema,
      label: z.string().min(2),
      target: z.union([z.number(), easeSchema]),
      tolerance: z.number().min(0),
      weight: z.number().int().min(1).max(100)
    })).min(1),
    reflectionPrompt: z.string().min(10),
    checks: z.array(z.object({ id: z.string().min(2), label: z.string().min(5), required: z.boolean() })).min(1)
  }),
  hints: z.array(z.object({ minScore: z.number().int().min(0).max(100), maxScore: z.number().int().min(0).max(100), title: z.string().min(2), message: z.string().min(8) })).min(1),
  feedback: z.object({
    success: z.string().min(10),
    fallback: z.string().min(10),
    rules: z.array(z.object({ metricId: controlIdSchema, when: z.enum(['below', 'above', 'mismatch']), message: z.string().min(8) })).min(1)
  })
}).superRefine((schema, ctx) => {
  const totalWeight = schema.assessment.metrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (totalWeight !== 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assessment', 'metrics'], message: `Metric weights must total 100, currently ${totalWeight}` });
  }
  const controlIds = new Set(schema.controls.map(control => control.id));
  for (const metric of schema.assessment.metrics) {
    if (!controlIds.has(metric.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assessment', 'metrics', metric.id], message: `Metric ${metric.id} has no matching control` });
    }
  }
});

export function parseLessonSchema(value: unknown): LessonSchema {
  return lessonSchemaValidator.parse(value) as LessonSchema;
}

export function getDefaultAttempt(schema: LessonSchema): LearnerAttempt {
  const attempt: Partial<LearnerAttempt> = {};
  for (const control of schema.controls) {
    if (control.id === 'ease') attempt.ease = control.default;
    else attempt[control.id] = control.default;
  }
  return {
    duration: attempt.duration ?? 2.4,
    ease: attempt.ease ?? 'easeInOut',
    overshoot: attempt.overshoot ?? 0.2,
    anticipation: attempt.anticipation ?? 0.3,
    settleHold: attempt.settleHold ?? 0.4
  };
}

function metricScore(delta: number, tolerance: number, weight: number) {
  const normalized = Math.min(1, delta / Math.max(tolerance * 2.5, 0.001));
  return Math.max(0, Math.round(weight * (1 - normalized)));
}

function formatMetricValue(value: number | string, unit?: string) {
  if (typeof value === 'number') return `${value.toFixed(1)}${unit ?? ''}`;
  return value;
}

function controlUnit(schema: LessonSchema, id: LessonControlId) {
  const control = schema.controls.find(item => item.id === id);
  return control && control.id !== 'ease' ? control.unit : undefined;
}

function feedbackFor(schema: LessonSchema, id: LessonControlId, attemptValue: number | string, targetValue: number | string) {
  const relation = typeof attemptValue === 'number' && typeof targetValue === 'number'
    ? attemptValue < targetValue ? 'below' : 'above'
    : 'mismatch';
  return schema.feedback.rules.find(rule => rule.metricId === id && rule.when === relation)?.message ?? schema.feedback.fallback;
}

function hintFor(schema: LessonSchema, score: number) {
  return schema.hints.find(hint => score >= hint.minScore && score <= hint.maxScore) ?? schema.hints[schema.hints.length - 1];
}

export function evaluateAttempt(schema: LessonSchema, attempt: LearnerAttempt, assessment: AssessmentState): EvaluationResult {
  const issues: string[] = [];
  const metrics = schema.assessment.metrics.map<EvaluationMetric>((metric) => {
    const currentValue = attempt[metric.id];
    const unit = controlUnit(schema, metric.id);

    if (typeof metric.target === 'number' && typeof currentValue === 'number') {
      const delta = Math.abs(currentValue - metric.target);
      if (delta > metric.tolerance) issues.push(feedbackFor(schema, metric.id, currentValue, metric.target));
      return {
        id: metric.id,
        label: metric.label,
        score: metricScore(delta, metric.tolerance, metric.weight),
        target: formatMetricValue(metric.target, unit),
        current: formatMetricValue(currentValue, unit),
        status: delta <= metric.tolerance ? 'pass' : 'adjust'
      };
    }

    const passed = currentValue === metric.target;
    if (!passed) issues.push(feedbackFor(schema, metric.id, String(currentValue), String(metric.target)));
    return {
      id: metric.id,
      label: metric.label,
      score: passed ? metric.weight : 0,
      target: formatMetricValue(metric.target),
      current: formatMetricValue(String(currentValue)),
      status: passed ? 'pass' : 'adjust'
    };
  });

  const score = Math.min(100, metrics.reduce((sum, metric) => sum + metric.score, 0));
  const requiredChecks = schema.assessment.checks.filter(check => check.required);
  const checksPassed = requiredChecks.every(check => Boolean(assessment.checks[check.id]));
  const reflectionReady = assessment.reflection.trim().length >= 20;
  const assessmentReady = checksPassed && reflectionReady;
  const passed = issues.length === 0 && score >= schema.assessment.passScore && assessmentReady;

  return {
    score,
    passed,
    feedback: passed ? schema.feedback.success : issues[0] ?? (assessmentReady ? schema.feedback.fallback : 'The motion is close. Complete the reflection and required production checks before submitting.'),
    issues,
    metrics,
    nextHint: hintFor(schema, score),
    assessmentReady
  };
}

export const easingLabTemplate: LessonSchema = {
  version: '1.2',
  kind: 'motion_design_sandbox',
  scene: {
    studioName: 'Easing Lab / Motion Timing Workbench',
    cameraPosition: [0, 3.1, 6.2],
    targetPosition: [0, 0.75, 0],
    accent: 'teal-amber',
    environmentMood: 'dark editorial studio, timing rail, curve scope, production correction bench'
  },
  briefing: {
    principle: 'Good motion has readable acceleration, controlled arrival, and a deliberate settle.',
    scenario: 'A client product panel currently slides with a dead mechanical feel. Tune the motion until it feels deliberate enough for a premium launch bumper.',
    productionContext: 'Broadcast-safe product motion for a short social ad opener.',
    passCondition: 'Reach 88+, satisfy the required production checks, and write a short reflection explaining the correction.'
  },
  controls: [
    { id: 'duration', label: 'Duration', unit: 's', min: 0.6, max: 5, step: 0.1, default: 2.4 },
    { id: 'ease', label: 'Easing curve', default: 'easeInOut', options: ['linear', 'easeIn', 'easeOut', 'easeInOut', 'overshoot'] },
    { id: 'overshoot', label: 'Overshoot', min: 0, max: 1, step: 0.1, default: 0.2 },
    { id: 'anticipation', label: 'Anticipation', min: 0, max: 1, step: 0.1, default: 0.3 },
    { id: 'settleHold', label: 'Settle hold', unit: 's', min: 0, max: 1.2, step: 0.1, default: 0.4 }
  ],
  assessment: {
    type: 'deterministic_rubric',
    passScore: 88,
    metrics: [
      { id: 'duration', label: 'Duration', target: 2.4, tolerance: 0.2, weight: 25 },
      { id: 'ease', label: 'Curve choice', target: 'easeInOut', tolerance: 0, weight: 25 },
      { id: 'overshoot', label: 'Overshoot', target: 0.2, tolerance: 0.2, weight: 18 },
      { id: 'anticipation', label: 'Anticipation', target: 0.3, tolerance: 0.2, weight: 17 },
      { id: 'settleHold', label: 'Settle hold', target: 0.4, tolerance: 0.2, weight: 15 }
    ],
    reflectionPrompt: 'Explain why your final motion feels more premium than the mechanical default.',
    checks: [
      { id: 'readable-start', label: 'The viewer can read the start before the move begins.', required: true },
      { id: 'controlled-arrival', label: 'The arrival is controlled, not rubbery or accidental.', required: true },
      { id: 'final-frame-breathes', label: 'The final frame holds long enough for a short ad bumper.', required: true }
    ]
  },
  hints: [
    { minScore: 0, maxScore: 49, title: 'Start with timing', message: 'Fix the duration and curve first. A wrong curve makes every other correction feel decorative.' },
    { minScore: 50, maxScore: 79, title: 'Control the arrival', message: 'Your core move is improving. Now tune overshoot and anticipation so the object feels designed, not dragged.' },
    { minScore: 80, maxScore: 100, title: 'Finish like an editor', message: 'You are close. Check the settle hold and confirm the production checklist before submitting.' }
  ],
  feedback: {
    success: 'Correct. The motion now has balanced acceleration, intentional anticipation, controlled overshoot, enough settle time, and a clear production rationale.',
    fallback: 'One motion property is still outside the production target. Compare the score panel with the curve ribbon and tune the weakest metric.',
    rules: [
      { metricId: 'duration', when: 'below', message: 'The movement is too fast. The viewer cannot read the transfer from start to settle.' },
      { metricId: 'duration', when: 'above', message: 'The movement is dragging. Tighten the duration without making the arrival abrupt.' },
      { metricId: 'ease', when: 'mismatch', message: 'The curve does not match the required premium motion. Use a smoother acceleration and deceleration profile.' },
      { metricId: 'overshoot', when: 'below', message: 'The arrival is too stiff. Add a subtle overshoot so the end frame feels animated rather than parked.' },
      { metricId: 'overshoot', when: 'above', message: 'The arrival is not controlled. Keep the overshoot subtle, not rubbery.' },
      { metricId: 'anticipation', when: 'below', message: 'The move starts too flat. Add a small anticipation pull before the main travel.' },
      { metricId: 'anticipation', when: 'above', message: 'The anticipation is too theatrical for this product motion. Reduce the pre-move pull.' },
      { metricId: 'settleHold', when: 'below', message: 'The final frame does not breathe. Hold the settle a little longer.' },
      { metricId: 'settleHold', when: 'above', message: 'The settle hold is too slow for a short ad bumper. Trim the ending hold.' }
    ]
  }
};
