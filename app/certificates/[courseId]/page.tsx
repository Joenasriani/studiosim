import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import type { Course, LearnerProgress, Lesson } from '@/types/database';

export default async function CertificatePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('published', true)
    .single();

  if (courseError || !course) {
    return <div className="card"><h2>Certificate unavailable</h2><p>{courseError?.message ?? 'No published course matched this certificate route.'}</p></div>;
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .eq('published', true)
    .order('order_index', { ascending: true });

  const lessonRows = (lessons ?? []) as Lesson[];
  const lessonIds = lessonRows.map(lesson => lesson.id);

  const { data: progress } = lessonIds.length
    ? await supabase
        .from('learner_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
    : { data: [] };

  const progressRows = (progress ?? []) as LearnerProgress[];
  const completed = progressRows.filter(item => item.status === 'completed');
  const completedIds = new Set(completed.map(item => item.lesson_id));
  const missing = lessonRows.filter(lesson => !completedIds.has(lesson.id));
  const complete = lessonRows.length > 0 && missing.length === 0;
  const averageScore = completed.length ? Math.round(completed.reduce((sum, item) => sum + item.score, 0) / completed.length) : 0;
  const issuedAt = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
  const courseRow = course as Course;

  return (
    <div className="certificatePage">
      <div className="kicker">Completion proof</div>
      <h2>{complete ? 'Certificate ready' : 'Certificate locked'}</h2>

      <section className={complete ? 'certificatePlate ready' : 'certificatePlate'}>
        <div className="certificateOrbit"><span /><span /><span /></div>
        <div>
          <p className="microLabel">StudioSim</p>
          <h1>{courseRow.title}</h1>
          <p className="certificateStatement">
            {complete
              ? `This certifies that ${user.email} completed the full interactive course with an average score of ${averageScore}/100.`
              : `Complete every published lesson in this course to unlock the certificate. ${completed.length}/${lessonRows.length} lessons are complete.`}
          </p>
        </div>
        <div className="certificateMeta">
          <strong>{complete ? 'Issued' : 'Progress'}</strong>
          <span>{complete ? issuedAt : `${completed.length}/${lessonRows.length}`}</span>
        </div>
      </section>

      {!complete && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>Remaining lessons</h3>
          <table className="table">
            <tbody>
              {missing.map(lesson => (
                <tr key={lesson.id}>
                  <td>{lesson.order_index}</td>
                  <td>{lesson.title}</td>
                  <td><Link className="btn" href={`/sandbox/${lesson.id}`}>Continue</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/courses">Back to course pack</Link>
        <Link className="btn" href="/dashboard">Dashboard</Link>
      </div>
    </div>
  );
}
