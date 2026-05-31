'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Course, Lesson } from '@/types/database';
import { easingLabTemplate } from '@/lib/lesson-evaluator';

export default function AdminPanel({ courses, lessons }: { courses: Course[]; lessons: Lesson[] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [lessonMessage, setLessonMessage] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [lessonTitle, setLessonTitle] = useState('Easing Lab - Custom Pass');
  const [objective, setObjective] = useState('Tune a motion-design task using deterministic rubric scoring, progressive hints, and learner reflection.');
  const [orderIndex, setOrderIndex] = useState((lessons.length || 1) + 1);
  const [published, setPublished] = useState(true);
  const [schemaText, setSchemaText] = useState(() => JSON.stringify(easingLabTemplate, null, 2));

  const lessonsByCourse = useMemo(() => {
    return courses.map(course => ({ ...course, lessonCount: lessons.filter(lesson => lesson.course_id === course.id).length }));
  }, [courses, lessons]);

  async function createCourse() {
    const response = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, level: 'foundation', published: true })
    });
    const body = await response.json();
    setMessage(response.ok ? 'Course created. Refresh to view it.' : JSON.stringify(body.error ?? body));
  }

  async function createLesson() {
    setLessonMessage('Validating schema and publishing lesson');
    let lessonSchema: unknown;
    try {
      lessonSchema = JSON.parse(schemaText);
    } catch {
      setLessonMessage('Schema is not valid JSON.');
      return;
    }

    const response = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, title: lessonTitle, objective, order_index: orderIndex, lesson_schema: lessonSchema, published })
    });
    const body = await response.json();
    setLessonMessage(response.ok ? 'Lesson created from reusable learning schema. Refresh to view it.' : JSON.stringify(body.error ?? body));
  }

  return (
    <div>
      <div className="kicker">Admin control</div>
      <h2>Learning-engine publishing console</h2>
      <p className="adminIntro">Create courses and publish real lesson schemas with controls, rubric metrics, hints, assessment checks, and learner reflection. This is the content engine for future sandbox lessons.</p>
      <div style={{ marginBottom: 18 }}><Link className="btn" href="/admin/analytics">Open analytics and support queue</Link> <Link className="btn" href="/admin/marketplace">Open marketplace review</Link></div>

      <div className="grid two">
        <div className="card adminVessel">
          <h3>Create course</h3>
          <div className="form">
            <label className="fieldLabel">Course title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} aria-label="Course title" />
            <label className="fieldLabel">Course description</label>
            <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} aria-label="Course description" />
            <button className="btn primary" onClick={createCourse}>Create published course</button>
            {message && <p>{message}</p>}
          </div>
        </div>
        <div className="card adminVessel">
          <h3>Publishing state</h3>
          <p>{courses.length} courses loaded. {lessons.length} lessons loaded.</p>
          <div className="engineChips">
            <span>Schema v1.2</span>
            <span>Rubric total 100</span>
            <span>Hints active</span>
            <span>Reflection required</span>
          </div>
        </div>
      </div>

      <div className="card lessonComposer">
        <div className="deckHeader">
          <div>
            <span className="microLabel">Reusable lesson composer</span>
            <h3>Publish a sandbox lesson</h3>
          </div>
          <span className="statusPill pass">Real schema</span>
        </div>
        <div className="composerGrid">
          <div className="form">
            <label className="fieldLabel">Course</label>
            <select className="input" value={courseId} onChange={event => setCourseId(event.target.value)}>
              {courses.map(course => <option value={course.id} key={course.id}>{course.title}</option>)}
            </select>
            <label className="fieldLabel">Lesson title</label>
            <input className="input" value={lessonTitle} onChange={event => setLessonTitle(event.target.value)} aria-label="Lesson title" />
            <label className="fieldLabel">Objective</label>
            <textarea className="input" value={objective} onChange={event => setObjective(event.target.value)} aria-label="Lesson objective" />
            <label className="fieldLabel">Order index</label>
            <input className="input" type="number" min="1" value={orderIndex} onChange={event => setOrderIndex(Number(event.target.value))} aria-label="Order index" />
            <button type="button" className={published ? 'checkTile active' : 'checkTile'} onClick={() => setPublished(value => !value)}>
              <strong>{published ? 'Published' : 'Draft'}</strong>
              <span>Toggle learner visibility</span>
            </button>
            <button className="btn primary" onClick={createLesson} disabled={!courseId}>Validate and publish lesson</button>
            {lessonMessage && <p>{lessonMessage}</p>}
          </div>
          <div>
            <label className="fieldLabel">Lesson schema JSON</label>
            <textarea className="input codeInput" value={schemaText} onChange={event => setSchemaText(event.target.value)} aria-label="Lesson schema JSON" spellCheck={false} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Existing courses</h3>
        <table className="table">
          <thead><tr><th>Title</th><th>Level</th><th>Lessons</th><th>Published</th></tr></thead>
          <tbody>{lessonsByCourse.map(course => <tr key={course.id}><td>{course.title}</td><td>{course.level}</td><td>{course.lessonCount}</td><td>{String(course.published)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Existing lessons</h3>
        <table className="table">
          <thead><tr><th>Title</th><th>Order</th><th>Schema</th><th>Published</th></tr></thead>
          <tbody>{lessons.map(lesson => <tr key={lesson.id}><td>{lesson.title}</td><td>{lesson.order_index}</td><td>{lesson.lesson_schema.version}</td><td>{String(lesson.published)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
