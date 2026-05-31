import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Course, CourseAccess, LearnerProgress, Lesson } from '@/types/database';
import { isLessonUnlocked, hasCourseAccess } from '@/lib/access-control';
import PurchaseButton from '@/components/PurchaseButton';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: courses, error: courseError } = await supabase.from('courses').select('*').eq('published', true).order('created_at', { ascending: true });
  const { data: lessons } = await supabase.from('lessons').select('*').eq('published', true).order('order_index', { ascending: true });
  const lessonList = (lessons ?? []) as Lesson[];
  const courseRows = (courses ?? []) as Course[];
  const lessonIds = lessonList.map(lesson => lesson.id);
  const { data: progress } = user && lessonIds.length
    ? await supabase.from('learner_progress').select('*').eq('user_id', user.id).in('lesson_id', lessonIds)
    : { data: [] };
  const { data: access } = user
    ? await supabase.from('course_access').select('*').eq('user_id', user.id).eq('active', true)
    : { data: [] };
  const progressRows = (progress ?? []) as LearnerProgress[];
  const accessRows = (access ?? []) as CourseAccess[];
  const progressByLesson = new Map(progressRows.map(item => [item.lesson_id, item]));

  if (courseError) {
    return <div className="card"><h2>Courses unavailable</h2><p>{courseError.message}</p></div>;
  }

  return (
    <div>
      <div className="kicker">Sellable course pack</div>
      <h2>Motion Design Fundamentals</h2>
      <p className="adminIntro">A complete interactive course pack with preview access, paid access control, scoring, saved progress, certificate gate, and no decorative lesson cards pretending to be product logic.</p>
      <div className="grid">
        {courseRows.map(course => {
          const courseLessons = lessonList.filter(lesson => lesson.course_id === course.id);
          const completed = courseLessons.filter(lesson => progressByLesson.get(lesson.id)?.status === 'completed').length;
          const percentage = courseLessons.length ? Math.round((completed / courseLessons.length) * 100) : 0;
          const granted = hasCourseAccess(course, accessRows);
          return (
            <div className="card coursePackCard" key={course.id}>
              <div className="deckHeader">
                <span className="badge">{course.level}</span>
                <span className={granted ? 'statusPill pass' : 'statusPill'}>{granted ? 'Access granted' : `${course.preview_lessons ?? 1} preview lab`}</span>
              </div>
              <h3 style={{ marginTop: 16 }}>{course.title}</h3>
              <p>{course.description}</p>
              <div className="commerceStrip">
                <span>{course.price_label ?? 'Full course access'}</span>
                {granted ? <Link className="btn primary" href="/dashboard">View learner dashboard</Link> : user ? <PurchaseButton courseId={course.id} label="Unlock full course" /> : <Link className="btn primary" href="/login">Login to unlock</Link>}
              </div>
              <div className="progressBar" aria-label={`${percentage}% complete`}><span style={{ width: `${percentage}%` }} /></div>
              <p className="courseCompletion">{completed}/{courseLessons.length} completed</p>
              <table className="table labTable">
                <tbody>
                  {courseLessons.map(lesson => {
                    const itemProgress = progressByLesson.get(lesson.id);
                    const unlocked = user ? isLessonUnlocked({ userAuthenticated: true, lesson, course, courseLessons, progressRows, accessRows }) : false;
                    return (
                      <tr key={lesson.id}>
                        <td>{lesson.order_index}</td>
                        <td>
                          <strong>{lesson.title}</strong>
                          <span>{itemProgress ? `${itemProgress.status} / ${itemProgress.score}` : 'not started'}</span>
                        </td>
                        <td>
                          {!unlocked
                            ? <span className="badge">{user ? 'Locked' : 'Login'}</span>
                            : <Link className="btn" href={`/sandbox/${lesson.id}`}>{itemProgress?.status === 'completed' ? 'Review' : 'Start'}</Link>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 16 }}>
                <Link className="btn primary" href={(user ? `/certificates/${course.id}` : '/login') as any}>Certificate gate</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
