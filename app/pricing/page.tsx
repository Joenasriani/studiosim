import Link from 'next/link';
import PurchaseButton from '@/components/PurchaseButton';
import { createClient } from '@/lib/supabase-server';
import type { Course, CourseAccess } from '@/types/database';

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: courses } = await supabase.from('courses').select('*').eq('published', true).order('created_at', { ascending: true });
  const courseRows = (courses ?? []) as Course[];
  const { data: access } = user ? await supabase.from('course_access').select('*').eq('user_id', user.id).eq('active', true) : { data: [] };
  const accessRows = (access ?? []) as CourseAccess[];

  return (
    <div>
      <div className="kicker">Commercial access layer</div>
      <h2>Course access with verified checkout states.</h2>
      <p className="adminIntro">Paid courses use Stripe Checkout. If Stripe keys are not configured, checkout returns a configuration error instead of pretending payment worked.</p>
      <div className="pricingGrid">
        <article className="pricePlate">
          <span className="microLabel">Free learner account</span>
          <h3>Preview access</h3>
          <p>Account, dashboard, first preview lab, saved progress, and support ticket access.</p>
          <Link className="btn" href={user ? '/courses' : '/signup'}>{user ? 'Open courses' : 'Open StudioSim'}</Link>
        </article>
        {courseRows.map(course => {
          const hasAccess = accessRows.some(row => row.course_id === course.id);
          return (
            <article className="pricePlate paid" key={course.id}>
              <span className="microLabel">{course.price_label ?? 'Full course access'}</span>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <div className="engineChips"><span>{course.preview_lessons ?? 1} preview lab</span><span>{course.access_mode ?? 'paid'}</span><span>certificate gate</span></div>
              {hasAccess ? <Link className="btn primary" href="/courses">Access granted</Link> : user ? <PurchaseButton courseId={course.id} label="Buy full course access" /> : <Link className="btn primary" href="/login">Login to buy</Link>}
            </article>
          );
        })}
        <article className="pricePlate org">
          <span className="microLabel">Teams</span>
          <h3>Organization workspace</h3>
          <p>Create a team account, assign seats to existing users, and track organizational learning later through the admin analytics layer.</p>
          <Link className="btn" href="/teams">Open teams</Link>
        </article>
      </div>
    </div>
  );
}
