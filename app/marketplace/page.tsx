import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import type { Course, CourseCategory, Lesson } from '@/types/database';

export default async function MarketplacePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('course_categories').select('*').eq('published', true).order('sort_order', { ascending: true });
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('published', true)
    .in('marketplace_status', ['platform_published', 'approved'])
    .order('created_at', { ascending: true });
  const { data: lessons } = await supabase.from('lessons').select('id, course_id, title, order_index, published').eq('published', true).order('order_index', { ascending: true });

  const categoryRows = (categories ?? []) as CourseCategory[];
  const courseRows = (courses ?? []) as Course[];
  const lessonRows = (lessons ?? []) as Pick<Lesson, 'id' | 'course_id' | 'title' | 'order_index' | 'published'>[];

  return (
    <div>
      <div className="kicker">Curated sandbox marketplace</div>
      <h2>Expansion without generic course clutter</h2>
      <p className="adminIntro">Only platform-authored or reviewed creator courses appear here. The marketplace is built around categories, review state, paid access, lesson schemas, and measurable sandbox outcomes.</p>

      <div className="marketCategoryRail">
        {categoryRows.map(category => (
          <article key={category.slug}>
            <span>{category.slug}</span>
            <strong>{category.title}</strong>
            <p>{category.description}</p>
          </article>
        ))}
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        {courseRows.map(course => {
          const lessonCount = lessonRows.filter(lesson => lesson.course_id === course.id).length;
          const category = categoryRows.find(item => item.slug === course.category_slug);
          return (
            <section className="card marketplaceTile" key={course.id}>
              <div className="deckHeader">
                <span className="badge">{category?.title ?? 'Studio course'}</span>
                <span className={course.marketplace_status === 'approved' ? 'statusPill pass' : 'statusPill'}>{course.marketplace_status ?? 'platform_published'}</span>
              </div>
              <h3>{course.title}</h3>
              <p>{course.marketplace_summary ?? course.description}</p>
              <div className="engineChips"><span>{lessonCount} labs</span><span>{course.level}</span><span>{course.price_label ?? 'course access'}</span></div>
              <div className="commerceStrip"><span>Real learning engine</span><Link className="btn primary" href="/courses">Open course pack</Link></div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
