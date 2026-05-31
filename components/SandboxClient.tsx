'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Lesson, LearnerProgress, LessonSchema, LessonControlId } from '@/types/database';
import { evaluateAttempt, getDefaultAttempt, type AssessmentState, type LearnerAttempt } from '@/lib/lesson-evaluator';
import SandboxScene from './SandboxScene';

type Props = {
  lesson: Lesson;
  initialProgress: LearnerProgress | null;
  courseLessons: Lesson[];
  courseProgress: LearnerProgress[];
};

function targetAttemptFromSchema(schema: LessonSchema): LearnerAttempt {
  const fallback = getDefaultAttempt(schema);
  const next = { ...fallback };
  for (const metric of schema.assessment.metrics) {
    if (metric.id === 'ease') next.ease = metric.target as LearnerAttempt['ease'];
    else if (typeof metric.target === 'number') next[metric.id] = metric.target;
  }
  return next;
}

function lessonPresets(schema: LessonSchema): { label: string; attempt: LearnerAttempt; note: string }[] {
  const target = targetAttemptFromSchema(schema);
  return [
    {
      label: 'Flat diagnostic',
      note: 'A deliberately lifeless motion pass. Use it to see what the lesson is correcting.',
      attempt: { duration: Math.max(0.8, target.duration - 1), ease: 'linear', overshoot: 0, anticipation: 0, settleHold: 0.1 }
    },
    {
      label: 'Target reference',
      note: 'Loads the lesson target values so you can study why this pass satisfies the rubric.',
      attempt: target
    },
    {
      label: 'Too much sauce',
      note: 'An intentionally exaggerated pass. Useful for seeing where polish becomes noise.',
      attempt: { duration: Math.min(5, target.duration + 0.9), ease: 'overshoot', overshoot: 0.9, anticipation: 0.8, settleHold: 1 }
    }
  ];
}

function restoreAttempt(schema: LessonSchema, progress: LearnerProgress | null): LearnerAttempt {
  const fallback = getDefaultAttempt(schema);
  const state = progress?.last_state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fallback;
  const candidate = state as Record<string, unknown>;
  return {
    duration: typeof candidate.duration === 'number' ? candidate.duration : fallback.duration,
    ease: candidate.ease === 'linear' || candidate.ease === 'easeIn' || candidate.ease === 'easeOut' || candidate.ease === 'easeInOut' || candidate.ease === 'overshoot' ? candidate.ease : fallback.ease,
    overshoot: typeof candidate.overshoot === 'number' ? candidate.overshoot : fallback.overshoot,
    anticipation: typeof candidate.anticipation === 'number' ? candidate.anticipation : fallback.anticipation,
    settleHold: typeof candidate.settleHold === 'number' ? candidate.settleHold : fallback.settleHold
  };
}

function updateAttempt(attempt: LearnerAttempt, id: LessonControlId, value: number | LearnerAttempt['ease']): LearnerAttempt {
  return { ...attempt, [id]: value };
}

export default function SandboxClient({ lesson, initialProgress, courseLessons, courseProgress }: Props) {
  const schema = lesson.lesson_schema as LessonSchema;
  const initialAttempt = useMemo(() => restoreAttempt(schema, initialProgress), [schema, initialProgress]);
  const [attempt, setAttempt] = useState<LearnerAttempt>(initialAttempt);
  const [assessment, setAssessment] = useState<AssessmentState>({ reflection: '', checks: {} });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [webXRStatus, setWebXRStatus] = useState({ supported: false, active: false, message: 'Checking WebXR support' });
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorMessage, setTutorMessage] = useState('AI tutor is grounded in the current lesson rubric and uses only OpenRouter free models.');
  const [tutor, setTutor] = useState<{ summary: string; strongest_move: string; correction_priority: string; next_practice: string; caution: string; confidence: string; modelUsed: string; provider: string } | null>(null);

  const presets = useMemo(() => lessonPresets(schema), [schema]);
  const completedIds = useMemo(() => new Set(courseProgress.filter(item => item.status === 'completed').map(item => item.lesson_id)), [courseProgress]);
  const currentIndex = courseLessons.findIndex(item => item.id === lesson.id);
  const previousLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;
  const completedCount = courseLessons.filter(item => completedIds.has(item.id)).length;

  const result = useMemo(() => evaluateAttempt(schema, attempt, assessment), [schema, attempt, assessment]);
  const bestScore = useMemo(() => Math.max(initialProgress?.score ?? 0, result.score), [initialProgress?.score, result.score]);

  function update(id: LessonControlId, value: number | LearnerAttempt['ease']) {
    setAttempt(current => updateAttempt(current, id, value));
    setSaveMessage('Unsaved adjustment');
  }

  function nudgeFromXR(id: LessonControlId, deltaOrValue: number | LearnerAttempt['ease']) {
    const control = schema.controls.find(item => item.id === id);
    if (id === 'ease') {
      update('ease', deltaOrValue as LearnerAttempt['ease']);
      return;
    }
    if (!control || control.id === 'ease') return;
    setAttempt(current => {
      const nextValue = Math.max(control.min, Math.min(control.max, Number((current[id] + Number(deltaOrValue)).toFixed(2))));
      return updateAttempt(current, id, nextValue);
    });
    setSaveMessage('VR console adjustment applied');
  }

  function applyPreset(nextAttempt: LearnerAttempt) {
    setAttempt(nextAttempt);
    setSaveMessage('Preset applied. Review the score before saving.');
  }

  function toggleCheck(id: string) {
    setAssessment(current => ({ ...current, checks: { ...current.checks, [id]: !current.checks[id] } }));
    setSaveMessage('Unsaved assessment change');
  }

  async function submit() {
    setSaving(true);
    setSaveMessage('Saving evaluated attempt');
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: lesson.id,
        score: result.score,
        status: result.passed ? 'completed' : 'in_progress',
        lastState: { ...attempt, assessment, result }
      })
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json();
      setSaveMessage(body.error ?? 'Could not save progress');
      return;
    }
    setSaveMessage(result.passed ? 'Saved as completed' : 'Saved as practice attempt');
  }


  async function askTutor() {
    setTutorLoading(true);
    setTutorMessage('Requesting grounded coaching from OpenRouter free models');
    const response = await fetch('/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, attempt, assessment })
    });
    setTutorLoading(false);
    const body = await response.json();
    if (!response.ok) {
      setTutorMessage(body.error ?? 'AI tutor unavailable');
      return;
    }
    setTutor(body.tutor);
    setTutorMessage(`Coach response generated through ${body.tutor.modelUsed}`);
  }

  return (
    <div className="lessonShell">
      <section className="lessonHeader">
        <div>
          <div className="kicker">Phase 7 AI-coached WebXR lesson {lesson.order_index}/{courseLessons.length}</div>
          <h1>{lesson.title}</h1>
          <p>{lesson.objective}</p>
        </div>
        <div className="scoreDial" aria-label={`Current score ${result.score} out of 100`}>
          <span>{result.score}</span>
          <small>/100</small>
        </div>
      </section>

      <section className="courseSpine" aria-label="Course progress spine">
        {courseLessons.map(item => (
          <Link
            key={item.id}
            href={`/sandbox/${item.id}`}
            className={item.id === lesson.id ? 'spineStep active' : completedIds.has(item.id) ? 'spineStep complete' : 'spineStep'}
          >
            <strong>{item.order_index}</strong>
            <span>{item.title}</span>
          </Link>
        ))}
      </section>

      <section className="briefingRail">
        <article>
          <span>Principle</span>
          <strong>{schema.briefing.principle}</strong>
        </article>
        <article>
          <span>Production context</span>
          <strong>{schema.briefing.productionContext}</strong>
        </article>
        <article>
          <span>Pass condition</span>
          <strong>{schema.briefing.passCondition}</strong>
        </article>
      </section>

      <section className="xrReadinessRail" aria-label="WebXR readiness checks">
        <article>
          <span>XR support</span>
          <strong>{webXRStatus.supported ? 'Immersive VR available' : 'Desktop 3D fallback'}</strong>
        </article>
        <article>
          <span>Session state</span>
          <strong>{webXRStatus.active ? 'Headset session active' : 'Browser workbench active'}</strong>
        </article>
        <article>
          <span>Quest rule</span>
          <strong>Controller rays operate the in-scene console; desktop sliders remain the fallback.</strong>
        </article>
      </section>

      <div className="sandbox phaseTwoSandbox">
        <div className="canvasWrap spatialCanvas">
          <SandboxScene {...attempt} schema={schema} score={result.score} passed={result.passed} onNudge={nudgeFromXR} onVrStatus={setWebXRStatus} />
        </div>

        <aside className="controlDeck" aria-label="Motion correction control deck">
          <div className="deckHeader">
            <div>
              <span className="microLabel">Learning engine</span>
              <h2>Shape, check, explain</h2>
            </div>
            <span className={result.passed ? 'statusPill pass' : 'statusPill'}>{result.passed ? 'Completed' : 'In tuning'}</span>
          </div>

          <p className="scenarioCopy">{schema.briefing.scenario}</p>

          <div className="hintCard">
            <span>{result.nextHint.title}</span>
            <p>{result.nextHint.message}</p>
          </div>

          <div className="presetStack">
            {presets.map((preset) => (
              <button key={preset.label} className="presetButton" type="button" onClick={() => applyPreset(preset.attempt)}>
                <strong>{preset.label}</strong>
                <span>{preset.note}</span>
              </button>
            ))}
          </div>

          {schema.controls.map((control) => {
            if (control.id === 'ease') {
              return (
                <div className="controlGroup" key={control.id}>
                  <label>{control.label} <strong>{attempt.ease}</strong></label>
                  <select className="input" value={attempt.ease} onChange={event => update('ease', event.target.value as LearnerAttempt['ease'])}>
                    {control.options.map(option => <option value={option} key={option}>{option}</option>)}
                  </select>
                </div>
              );
            }
            return (
              <div className="controlGroup" key={control.id}>
                <label>{control.label} <strong>{attempt[control.id].toFixed(1)}{control.unit ?? ''}</strong></label>
                <input className="input range" type="range" min={control.min} max={control.max} step={control.step} value={attempt[control.id]} onChange={event => update(control.id, Number(event.target.value))} />
              </div>
            );
          })}

          <div className="metricPanel">
            {result.metrics.map((metric) => (
              <div className="metricRow" key={metric.id}>
                <div>
                  <strong>{metric.label}</strong>
                  <span>Now {metric.current} / target {metric.target}</span>
                </div>
                <em className={metric.status}>{metric.score}</em>
              </div>
            ))}
          </div>

          <div className="assessmentPanel">
            <span className="microLabel">Production assessment</span>
            <label className="fieldLabel">{schema.assessment.reflectionPrompt}</label>
            <textarea
              className="input"
              value={assessment.reflection}
              onChange={event => setAssessment(current => ({ ...current, reflection: event.target.value }))}
              aria-label="Learner reflection"
            />
            <div className="checkStack">
              {schema.assessment.checks.map(check => (
                <button type="button" key={check.id} className={assessment.checks[check.id] ? 'checkTile active' : 'checkTile'} onClick={() => toggleCheck(check.id)}>
                  <strong>{assessment.checks[check.id] ? 'Checked' : 'Check'}</strong>
                  <span>{check.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="aiTutorPanel" aria-label="Grounded AI tutor">
            <div className="aiTutorHeader">
              <div>
                <span className="microLabel">OpenRouter free tutor</span>
                <h3>Rubric-grounded coaching</h3>
              </div>
              <span className="statusPill">{tutor?.confidence ?? 'ready'}</span>
            </div>
            <p>{tutorMessage}</p>
            {tutor && (
              <div className="coachStack">
                <article><strong>Summary</strong><span>{tutor.summary}</span></article>
                <article><strong>Strongest move</strong><span>{tutor.strongest_move}</span></article>
                <article><strong>Correction priority</strong><span>{tutor.correction_priority}</span></article>
                <article><strong>Next practice</strong><span>{tutor.next_practice}</span></article>
                <article><strong>Caution</strong><span>{tutor.caution}</span></article>
              </div>
            )}
            <button className="btn wide" type="button" onClick={askTutor} disabled={tutorLoading}>{tutorLoading ? 'Coaching...' : 'Ask AI tutor'}</button>
          </div>

          <div className="progressBar"><span style={{ width: `${bestScore}%` }} /></div>
          <p className="feedbackText">{result.feedback}</p>
          <button className="btn primary wide" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Submit evaluated attempt'}</button>
          <p className="saveMessage">{saveMessage}</p>
          <div className="lessonNav">
            {previousLesson ? <Link className="btn" href={`/sandbox/${previousLesson.id}`}>Previous lab</Link> : <span />}
            {nextLesson ? <Link className="btn primary" href={`/sandbox/${nextLesson.id}`}>Next lab</Link> : <Link className="btn primary" href={`/certificates/${lesson.course_id}` as any}>Certificate gate</Link>}
          </div>
          <p className="courseCompletion">{completedCount}/{courseLessons.length} course lessons completed.</p>
        </aside>
      </div>
    </div>
  );
}
