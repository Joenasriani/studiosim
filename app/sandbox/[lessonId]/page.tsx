import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import SandboxClient from '@/components/SandboxClient';
import type { Course, CourseAccess, LearnerProgress, Lesson } from '@/types/database';
import { isLessonUnlocked } from '@/lib/access-control';

export default async function SandboxPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: lesson, error } = await supabase.from('lessons').select('*').eq('id', lessonId).eq('published', true).single();
  if (error || !lesson) {
    return <div className="card"><h2>Lesson unavailable</h2><p>{error?.message ?? 'No published lesson matched this ID.'}</p></div>;
  }

  const lessonRow = lesson as Lesson;
  const { data: course } = await supabase.from('courses').select('*').eq('id', lessonRow.course_id).single();
  if (!course) return <div className="card"><h2>Course unavailable</h2><p>The lesson exists, but its course record could not be loaded.</p></div>;
  const courseRow = course as Course;

  const { data: progress } = await supabase
    .from('learner_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const { data: courseLessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', lessonRow.course_id)
    .eq('published', true)
    .order('order_index', { ascending: true });

  const courseLessonRows = (courseLessons ?? []) as Lesson[];
  const lessonIds = courseLessonRows.map(item => item.id);
  const { data: courseProgress } = lessonIds.length
    ? await supabase
        .from('learner_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
    : { data: [] };
  const { data: access } = await supabase.from('course_access').select('*').eq('user_id', user.id).eq('active', true);

  const courseProgressRows = (courseProgress ?? []) as LearnerProgress[];
  const accessRows = (access ?? []) as CourseAccess[];
  const unlocked = isLessonUnlocked({ userAuthenticated: true, lesson: lessonRow, course: courseRow, courseLessons: courseLessonRows, progressRows: courseProgressRows, accessRows });
  if (!unlocked) redirect('/courses');

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_name: 'lesson_opened',
    course_id: courseRow.id,
    lesson_id: lessonRow.id,
    properties: { order_index: lessonRow.order_index }
  });

  return (
    <SandboxClient
      lesson={lessonRow}
      initialProgress={progress as LearnerProgress | null}
      courseLessons={courseLessonRows}
      courseProgress={courseProgressRows}
    />
  );
}
