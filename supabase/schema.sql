create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('learner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_level as enum ('foundation', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  level public.course_level not null default 'foundation',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  objective text not null,
  order_index integer not null check (order_index > 0),
  lesson_schema jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(course_id, slug),
  unique(course_id, order_index)
);

create table if not exists public.learner_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.progress_status not null default 'not_started',
  score integer not null default 0 check (score >= 0 and score <= 100),
  attempts integer not null default 0 check (attempts >= 0),
  last_state jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'learner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.learner_progress enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "courses_select_published_or_admin" on public.courses;
create policy "courses_select_published_or_admin" on public.courses
for select using (published = true or public.is_admin());

drop policy if exists "courses_write_admin" on public.courses;
create policy "courses_write_admin" on public.courses
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lessons_select_published_or_admin" on public.lessons;
create policy "lessons_select_published_or_admin" on public.lessons
for select using (published = true or public.is_admin());

drop policy if exists "lessons_write_admin" on public.lessons;
create policy "lessons_write_admin" on public.lessons
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "progress_select_self_or_admin" on public.learner_progress;
create policy "progress_select_self_or_admin" on public.learner_progress
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "progress_insert_self" on public.learner_progress;
create policy "progress_insert_self" on public.learner_progress
for insert with check (user_id = auth.uid());

drop policy if exists "progress_update_self" on public.learner_progress;
create policy "progress_update_self" on public.learner_progress
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.courses (id, slug, title, description, level, published)
values ('11111111-1111-4111-8111-111111111111', 'motion-design-fundamentals', 'Motion Design Fundamentals', 'A sellable ten-lab interactive course where learners practice keyframes, easing, timing contrast, anticipation, overshoot, settle, reveal rhythm, text cadence, product bumper assembly, and a final launch-motion proof inside a WebGL/WebXR-ready production workbench.', 'foundation', true)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'keyframe-transfer-lab',
  'Keyframe Transfer Lab',
  'Set a readable beginning, travel, and final hold so the object feels intentionally keyframed rather than merely moved.',
  1,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"01 / Keyframe Transfer Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"A good keyframe pass makes the viewer understand where the object starts, where it travels, and where it lands.","scenario":"A title-card object is moving from start to settle with no design intent. Create a clean foundational pass before style is added.","productionContext":"Foundation motion pass for a product-title opener.","passCondition":"Reach 88+, confirm the staging checks, and explain the start-travel-settle logic."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.4},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.2,"tolerance":0.2,"weight":28},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":24},{"id":"overshoot","label":"Overshoot","target":0.1,"tolerance":0.2,"weight":12},{"id":"anticipation","label":"Anticipation","target":0.2,"tolerance":0.2,"weight":16},{"id":"settleHold","label":"Settle hold","target":0.4,"tolerance":0.2,"weight":20}],"reflectionPrompt":"Explain how your pass clarifies start, travel, and settle.","checks":[{"id":"start-readable","label":"The first position is readable before movement.","required":true},{"id":"path-clear","label":"The travel path feels intentional.","required":true},{"id":"end-held","label":"The end frame is held long enough to read.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The motion now has a readable start, clean travel, and a held end frame.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'easing-lab',
  'Easing Lab',
  'Correct a robotic product-panel move by tuning duration, easing, overshoot, anticipation, and settle hold until it reads as polished motion design.',
  2,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"02 / Easing Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Good motion has readable acceleration, controlled arrival, and deliberate settle.","scenario":"A client product panel currently slides with a dead mechanical feel. Tune the motion until it feels deliberate enough for a premium launch bumper.","productionContext":"Broadcast-safe product motion for a short social ad opener.","passCondition":"Reach 88+, satisfy the production checks, and explain the correction."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.6},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.4,"tolerance":0.2,"weight":25},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":25},{"id":"overshoot","label":"Overshoot","target":0.2,"tolerance":0.2,"weight":18},{"id":"anticipation","label":"Anticipation","target":0.3,"tolerance":0.2,"weight":17},{"id":"settleHold","label":"Settle hold","target":0.4,"tolerance":0.2,"weight":15}],"reflectionPrompt":"Explain why your final motion feels more premium than the mechanical default.","checks":[{"id":"readable-start","label":"The viewer can read the start before the move begins.","required":true},{"id":"controlled-arrival","label":"The arrival is controlled, not rubbery or accidental.","required":true},{"id":"final-frame-breathes","label":"The final frame holds long enough for a short ad bumper.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The motion now has balanced acceleration, intentional anticipation, controlled overshoot, and enough settle time.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'timing-contrast-lab',
  'Timing Contrast Lab',
  'Shape a faster editorial movement that still remains readable in a tight social ad cut.',
  3,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"03 / Timing Contrast Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Fast motion still needs readable structure; speed is not an excuse for chaos.","scenario":"The cut is only a few seconds long. Make the object move with urgency while preserving a clear settle frame.","productionContext":"Short-form social ad transition for a fast product bumper.","passCondition":"Reach 88+, prove the fast cut remains readable, and explain the timing compromise."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":0.9},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":1.7,"tolerance":0.2,"weight":35},{"id":"ease","label":"Curve choice","target":"easeOut","tolerance":0,"weight":25},{"id":"overshoot","label":"Overshoot","target":0.1,"tolerance":0.2,"weight":10},{"id":"anticipation","label":"Anticipation","target":0.1,"tolerance":0.2,"weight":10},{"id":"settleHold","label":"Settle hold","target":0.3,"tolerance":0.2,"weight":20}],"reflectionPrompt":"Explain how you kept the motion fast without making it unreadable.","checks":[{"id":"fast-readable","label":"The fast movement is still readable.","required":true},{"id":"no-chaos","label":"The arrival does not feel chaotic.","required":true},{"id":"short-settle","label":"The final frame has a short but visible hold.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The timing is fast, readable, and controlled enough for a tight cut.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'anticipation-pull-lab',
  'Anticipation Pull Lab',
  'Use anticipation to prepare motion without turning a premium object move into cartoon exaggeration.',
  4,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"04 / Anticipation Pull Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Anticipation prepares the eye; too much anticipation turns polish into pantomime.","scenario":"The object needs a subtle pre-move pull so the main travel feels motivated, not teleported.","productionContext":"Premium UI/product animation with visible but restrained preparation.","passCondition":"Reach 88+, confirm the anticipation is readable, and explain why it is not overplayed."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.7},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.5,"tolerance":0.2,"weight":20},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":20},{"id":"overshoot","label":"Overshoot","target":0.1,"tolerance":0.2,"weight":10},{"id":"anticipation","label":"Anticipation","target":0.5,"tolerance":0.2,"weight":35},{"id":"settleHold","label":"Settle hold","target":0.4,"tolerance":0.2,"weight":15}],"reflectionPrompt":"Explain how anticipation changes the viewer''s perception of the main movement.","checks":[{"id":"prep-visible","label":"The pre-move preparation is visible.","required":true},{"id":"prep-restrained","label":"The anticipation is not theatrical.","required":true},{"id":"main-move-motivated","label":"The main move feels motivated by the preparation.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The anticipation prepares the viewer without overwhelming the premium tone.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  'overshoot-discipline-lab',
  'Overshoot Discipline Lab',
  'Tune expressive arrival energy while keeping the final motion controlled and production-safe.',
  5,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"05 / Overshoot Discipline Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Overshoot adds life only when it is controlled; uncontrolled overshoot becomes noise.","scenario":"The arrival needs energy, but the brand object cannot wobble like a toy. Find the disciplined overshoot zone.","productionContext":"Brand-safe product reveal with controlled expressive arrival.","passCondition":"Reach 88+, confirm the arrival has life without wobble, and explain your overshoot limit."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.8},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.6,"tolerance":0.2,"weight":20},{"id":"ease","label":"Curve choice","target":"overshoot","tolerance":0,"weight":22},{"id":"overshoot","label":"Overshoot","target":0.4,"tolerance":0.2,"weight":34},{"id":"anticipation","label":"Anticipation","target":0.3,"tolerance":0.2,"weight":12},{"id":"settleHold","label":"Settle hold","target":0.5,"tolerance":0.2,"weight":12}],"reflectionPrompt":"Explain where expressive arrival becomes too much and how your pass avoids that.","checks":[{"id":"arrival-alive","label":"The arrival has visible energy.","required":true},{"id":"not-rubbery","label":"The object does not feel rubbery.","required":true},{"id":"brand-safe","label":"The end frame feels brand-safe.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The arrival has energy while staying disciplined and brand-safe.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-4111-8111-111111111111',
  'settle-hold-lab',
  'Settle Hold Lab',
  'Control the last frame so the viewer can read the message before the edit moves on.',
  6,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"06 / Settle Hold Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"A motion pass is not finished when the object arrives; the viewer still needs time to read the result.","scenario":"The move arrives correctly but cuts away too quickly. Build a settle that respects the final frame.","productionContext":"End-card readability pass for a product/ad bumper.","passCondition":"Reach 88+, confirm final-frame readability, and explain the role of settle hold."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":2.0},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.8,"tolerance":0.2,"weight":18},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":18},{"id":"overshoot","label":"Overshoot","target":0.2,"tolerance":0.2,"weight":12},{"id":"anticipation","label":"Anticipation","target":0.2,"tolerance":0.2,"weight":12},{"id":"settleHold","label":"Settle hold","target":0.8,"tolerance":0.2,"weight":40}],"reflectionPrompt":"Explain why the end hold matters in motion design, not just video editing.","checks":[{"id":"end-readable","label":"The final frame is readable.","required":true},{"id":"not-lingering","label":"The hold does not feel like a dead pause.","required":true},{"id":"cut-ready","label":"The move is ready for the next edit.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The final frame breathes without dragging the whole movement.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '88888888-8888-4888-8888-888888888888',
  '11111111-1111-4111-8111-111111111111',
  'camera-reveal-rhythm-lab',
  'Camera Reveal Rhythm Lab',
  'Tune object motion as if it must synchronize with a cinematic camera reveal.',
  7,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"07 / Camera Reveal Rhythm Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Motion timing must leave room for camera rhythm; two beautiful moves can still fight each other.","scenario":"A camera reveal needs the product object to arrive just before the imagined lens settles, not after it.","productionContext":"Cinematic product reveal timing for a 3D motion bumper.","passCondition":"Reach 88+, confirm the move supports a camera reveal, and explain the rhythm relationship."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":2.2},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":3.0,"tolerance":0.2,"weight":26},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":22},{"id":"overshoot","label":"Overshoot","target":0.2,"tolerance":0.2,"weight":12},{"id":"anticipation","label":"Anticipation","target":0.4,"tolerance":0.2,"weight":20},{"id":"settleHold","label":"Settle hold","target":0.6,"tolerance":0.2,"weight":20}],"reflectionPrompt":"Explain how your object motion would support a camera reveal instead of fighting it.","checks":[{"id":"supports-camera","label":"The object timing leaves room for the camera reveal.","required":true},{"id":"arrival-before-settle","label":"The object arrives before the imagined camera settle.","required":true},{"id":"not-sleepy","label":"The duration does not feel sleepy.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The object timing now supports a cinematic reveal rhythm.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  'text-reveal-cadence-lab',
  'Text Reveal Cadence Lab',
  'Design a motion cadence suitable for title or copy reveal where readability matters more than spectacle.',
  8,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"08 / Text Reveal Cadence Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Text motion must respect reading time; unreadable motion is decoration pretending to communicate.","scenario":"A title reveal needs energy but must let the viewer actually read the copy. Tune the motion like typography matters.","productionContext":"Title and copy reveal timing for branded social content.","passCondition":"Reach 88+, confirm text readability assumptions, and explain the cadence."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":2.1},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.9,"tolerance":0.2,"weight":24},{"id":"ease","label":"Curve choice","target":"easeOut","tolerance":0,"weight":24},{"id":"overshoot","label":"Overshoot","target":0.1,"tolerance":0.2,"weight":8},{"id":"anticipation","label":"Anticipation","target":0.2,"tolerance":0.2,"weight":14},{"id":"settleHold","label":"Settle hold","target":0.7,"tolerance":0.2,"weight":30}],"reflectionPrompt":"Explain how your timing would help a viewer read title or copy content.","checks":[{"id":"copy-readable","label":"The reveal would give copy enough reading time.","required":true},{"id":"arrival-clean","label":"The text would not wobble excessively at arrival.","required":true},{"id":"cadence-clear","label":"The timing cadence feels intentional.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The reveal has usable cadence and respects text readability.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'product-bumper-assembly-lab',
  'Product Bumper Assembly Lab',
  'Balance timing, easing, anticipation, overshoot, and settle as one cohesive ad-motion pass.',
  9,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"09 / Product Bumper Assembly Lab","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"A production pass is a system; changing one motion property changes the whole read.","scenario":"This is no longer an isolated drill. Balance all properties into one polished product bumper motion.","productionContext":"Integrated product-motion pass for a launch bumper.","passCondition":"Reach 88+, confirm the full production checklist, and explain how the variables work together."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.9},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.7,"tolerance":0.2,"weight":24},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":24},{"id":"overshoot","label":"Overshoot","target":0.3,"tolerance":0.2,"weight":18},{"id":"anticipation","label":"Anticipation","target":0.3,"tolerance":0.2,"weight":16},{"id":"settleHold","label":"Settle hold","target":0.5,"tolerance":0.2,"weight":18}],"reflectionPrompt":"Explain how duration, curve, anticipation, overshoot, and settle work together in your pass.","checks":[{"id":"balanced-system","label":"The variables feel balanced as one system.","required":true},{"id":"premium-tone","label":"The tone feels premium rather than gimmicky.","required":true},{"id":"ad-ready","label":"The pass is ready for a short ad opener.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The motion properties now function as one coherent product bumper pass.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;

insert into public.lessons (id, course_id, slug, title, objective, order_index, lesson_schema, published)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-1111-4111-8111-111111111111',
  'final-launch-motion-proof',
  'Final Challenge - Launch Motion Proof',
  'Complete a final scored motion pass that proves you understand timing, easing, anticipation, overshoot, and settle as production decisions.',
  10,
  '{"version":"1.2","kind":"motion_design_sandbox","scene":{"studioName":"10 / Final Challenge - Launch Motion Proof","cameraPosition":[0,3.1,6.2],"targetPosition":[0,0.75,0],"accent":"teal-amber","environmentMood":"dark editorial motion bay, curve scope, timing rail, critique lights"},"briefing":{"principle":"Motion design is not slider decoration; it is a chain of timing decisions that shape perception.","scenario":"Create the final launch-card movement. The pass must be polished, readable, and defensible as a production decision.","productionContext":"Final practical assessment for the Motion Design Fundamentals course.","passCondition":"Reach 90+, complete every production check, and write a reflection that justifies the whole motion system."},"controls":[{"id":"duration","label":"Duration","unit":"s","min":0.6,"max":5,"step":0.1,"default":1.8},{"id":"ease","label":"Easing curve","default":"linear","options":["linear","easeIn","easeOut","easeInOut","overshoot"]},{"id":"overshoot","label":"Overshoot","min":0,"max":1,"step":0.1,"default":0.0},{"id":"anticipation","label":"Anticipation","min":0,"max":1,"step":0.1,"default":0.0},{"id":"settleHold","label":"Settle hold","unit":"s","min":0,"max":1.2,"step":0.1,"default":0.1}],"assessment":{"type":"deterministic_rubric","passScore":88,"metrics":[{"id":"duration","label":"Duration","target":2.6,"tolerance":0.2,"weight":22},{"id":"ease","label":"Curve choice","target":"easeInOut","tolerance":0,"weight":24},{"id":"overshoot","label":"Overshoot","target":0.2,"tolerance":0.2,"weight":18},{"id":"anticipation","label":"Anticipation","target":0.4,"tolerance":0.2,"weight":18},{"id":"settleHold","label":"Settle hold","target":0.6,"tolerance":0.2,"weight":18}],"reflectionPrompt":"Defend your final motion pass as if presenting it to a creative director before delivery.","checks":[{"id":"readable-system","label":"The full motion system is readable.","required":true},{"id":"controlled-energy","label":"The move has controlled energy.","required":true},{"id":"production-rationale","label":"The final pass can be defended as a production choice.","required":true},{"id":"course-ready","label":"The result proves course-level understanding.","required":true}]},"hints":[{"minScore":0,"maxScore":49,"title":"Find the main failure","message":"Start with the dominant production problem. Duration and curve usually decide whether the motion can be read at all."},{"minScore":50,"maxScore":79,"title":"Tighten the behavior","message":"The motion is forming. Now adjust anticipation, overshoot, and settle until the intent feels designed rather than accidental."},{"minScore":80,"maxScore":100,"title":"Finish the pass","message":"The numbers are close. Confirm the production checks and write a useful reflection before submitting."}],"feedback":{"success":"Correct. The final pass proves controlled timing, smooth easing, prepared motion, disciplined arrival, and production-readable settle.","fallback":"One production property is still outside the target. Use the weakest metric as your next correction, not random slider hunting.","rules":[{"metricId":"duration","when":"below","message":"The motion is too fast for this brief. Give the viewer enough time to read the change."},{"metricId":"duration","when":"above","message":"The motion drags. Tighten the duration without flattening the arrival."},{"metricId":"ease","when":"mismatch","message":"The curve choice does not match the production intent. Change the acceleration profile before polishing details."},{"metricId":"overshoot","when":"below","message":"The arrival is too stiff. Add controlled overshoot only if the brief asks for expressive arrival."},{"metricId":"overshoot","when":"above","message":"The overshoot is stealing attention. Reduce it until the arrival feels deliberate."},{"metricId":"anticipation","when":"below","message":"The start lacks preparation. Add anticipation when the viewer needs to feel the move before it travels."},{"metricId":"anticipation","when":"above","message":"The anticipation is too theatrical. Reduce the pre-move pull."},{"metricId":"settleHold","when":"below","message":"The final frame does not breathe. Increase settle hold for readability."},{"metricId":"settleHold","when":"above","message":"The ending hold is too slow for this cut. Trim the settle."}]}}'::jsonb,
  true
)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  objective = excluded.objective,
  order_index = excluded.order_index,
  lesson_schema = excluded.lesson_schema,
  published = excluded.published;


-- Phase 6 SaaS product layer: access, billing, teams, analytics, support.
do $$ begin
  create type public.subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_access_mode as enum ('free', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_role as enum ('owner', 'manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_ticket_status as enum ('open', 'in_review', 'resolved');
exception when duplicate_object then null; end $$;

alter table public.profiles add column if not exists subscription_status public.subscription_status not null default 'none';
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists billing_plan text not null default 'free';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.courses add column if not exists access_mode public.course_access_mode not null default 'paid';
alter table public.courses add column if not exists stripe_price_id text;
alter table public.courses add column if not exists price_label text not null default 'Paid course';
alter table public.courses add column if not exists preview_lessons integer not null default 1 check (preview_lessons >= 0);

create table if not exists public.course_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'manual',
  active boolean not null default true,
  stripe_checkout_session_id text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(user_id, course_id)
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  seat_limit integer not null default 5 check (seat_limit > 0),
  subscription_status public.subscription_status not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  category text not null,
  message text not null,
  status public.support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_access enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.analytics_events enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "course_access_select_self_or_admin" on public.course_access;
create policy "course_access_select_self_or_admin" on public.course_access
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "course_access_write_admin" on public.course_access;
create policy "course_access_write_admin" on public.course_access
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "organizations_select_member_or_admin" on public.organizations;
create policy "organizations_select_member_or_admin" on public.organizations
for select using (owner_id = auth.uid() or public.is_admin() or exists(select 1 from public.organization_members m where m.organization_id = id and m.user_id = auth.uid()));

drop policy if exists "organizations_insert_self" on public.organizations;
create policy "organizations_insert_self" on public.organizations
for insert with check (owner_id = auth.uid());

drop policy if exists "organizations_update_owner_or_admin" on public.organizations;
create policy "organizations_update_owner_or_admin" on public.organizations
for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "members_select_member_or_admin" on public.organization_members;
create policy "members_select_member_or_admin" on public.organization_members
for select using (user_id = auth.uid() or public.is_admin() or exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));

drop policy if exists "members_write_owner_or_admin" on public.organization_members;
create policy "members_write_owner_or_admin" on public.organization_members
for all using (public.is_admin() or exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())) with check (public.is_admin() or exists(select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()));

drop policy if exists "analytics_insert_authenticated" on public.analytics_events;
create policy "analytics_insert_authenticated" on public.analytics_events
for insert with check (user_id = auth.uid());

drop policy if exists "analytics_select_admin" on public.analytics_events;
create policy "analytics_select_admin" on public.analytics_events
for select using (public.is_admin());

drop policy if exists "support_insert_anyone" on public.support_tickets;
create policy "support_insert_anyone" on public.support_tickets
for insert with check (true);

drop policy if exists "support_select_self_or_admin" on public.support_tickets;
create policy "support_select_self_or_admin" on public.support_tickets
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "support_update_admin" on public.support_tickets;
create policy "support_update_admin" on public.support_tickets
for update using (public.is_admin()) with check (public.is_admin());

update public.courses
set access_mode = 'paid', price_label = 'Full course access', preview_lessons = 1
where slug = 'motion-design-fundamentals';

-- Phase 7 AI tutor event log. AI coaching is grounded in deterministic lesson state and routed through OpenRouter free models only.
create table if not exists public.ai_tutor_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  model_used text not null check (model_used = 'local-deterministic-fallback' or model_used = 'openrouter/free' or right(model_used, 5) = ':free'),
  score_snapshot integer not null check (score_snapshot >= 0 and score_snapshot <= 100),
  request_snapshot jsonb not null default '{}'::jsonb,
  response_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_tutor_events enable row level security;

drop policy if exists "ai_tutor_events_select_self_or_admin" on public.ai_tutor_events;
create policy "ai_tutor_events_select_self_or_admin" on public.ai_tutor_events
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "ai_tutor_events_insert_self" on public.ai_tutor_events;
create policy "ai_tutor_events_insert_self" on public.ai_tutor_events
for insert with check (user_id = auth.uid());

-- Phase 8 marketplace / expansion layer
alter table public.courses add column if not exists marketplace_status text not null default 'platform_published';
alter table public.courses add column if not exists creator_id uuid references public.profiles(id) on delete set null;
alter table public.courses add column if not exists category_slug text;
alter table public.courses add column if not exists marketplace_summary text;
alter table public.courses add column if not exists reviewer_note text;
do $$ begin
  alter table public.courses add constraint courses_marketplace_status_check check (marketplace_status in ('platform_published', 'draft', 'submitted', 'changes_requested', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

create table if not exists public.course_categories (
  slug text primary key,
  title text not null,
  description text not null,
  sort_order integer not null default 100,
  published boolean not null default true
);

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  specialty text not null,
  portfolio_url text not null,
  proposal text not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'changes_requested', 'rejected')),
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.creator_submissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  category_slug text not null references public.course_categories(slug),
  submission_title text not null,
  submission_note text not null,
  review_status text not null default 'submitted' check (review_status in ('submitted', 'approved', 'changes_requested', 'rejected')),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(course_id)
);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text not null,
  created_at timestamptz not null default now(),
  unique(course_id, reviewer_id)
);

alter table public.course_categories enable row level security;
alter table public.creator_applications enable row level security;
alter table public.creator_submissions enable row level security;
alter table public.course_reviews enable row level security;

drop policy if exists "categories_public_read" on public.course_categories;
create policy "categories_public_read" on public.course_categories for select using (published = true or public.is_admin());

drop policy if exists "categories_admin_write" on public.course_categories;
create policy "categories_admin_write" on public.course_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "creator_applications_self_or_admin_read" on public.creator_applications;
create policy "creator_applications_self_or_admin_read" on public.creator_applications for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "creator_applications_self_insert" on public.creator_applications;
create policy "creator_applications_self_insert" on public.creator_applications for insert with check (user_id = auth.uid());

drop policy if exists "creator_applications_self_update" on public.creator_applications;
create policy "creator_applications_self_update" on public.creator_applications for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "creator_submissions_read_visible" on public.creator_submissions;
create policy "creator_submissions_read_visible" on public.creator_submissions for select using (creator_id = auth.uid() or review_status = 'approved' or public.is_admin());

drop policy if exists "creator_submissions_creator_insert" on public.creator_submissions;
create policy "creator_submissions_creator_insert" on public.creator_submissions for insert with check (creator_id = auth.uid());

drop policy if exists "creator_submissions_creator_or_admin_update" on public.creator_submissions;
create policy "creator_submissions_creator_or_admin_update" on public.creator_submissions for update using (creator_id = auth.uid() or public.is_admin()) with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "course_reviews_read" on public.course_reviews;
create policy "course_reviews_read" on public.course_reviews for select using (true);

drop policy if exists "course_reviews_insert_self" on public.course_reviews;
create policy "course_reviews_insert_self" on public.course_reviews for insert with check (reviewer_id = auth.uid());

insert into public.course_categories (slug, title, description, sort_order, published) values
  ('motion-design', 'Motion Design', 'Interactive labs for keyframes, easing, timing, title motion, product motion, and expressive animation craft.', 10, true),
  ('video-post-production', 'Video Post-Production', 'Sandbox workflows for editing rhythm, color decisions, compositing logic, and finishing discipline.', 20, true),
  ('spatial-production', 'Spatial Production', 'WebGL and WebXR learning spaces for camera blocking, scene layout, and immersive production thinking.', 30, true),
  ('sound-design', 'Sound Design', 'Applied sound layers, mix decisions, timing cues, and sonic feedback for media production.', 40, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  published = excluded.published;

update public.courses
set category_slug = coalesce(category_slug, 'motion-design'),
    marketplace_status = case when marketplace_status = 'draft' then marketplace_status else 'platform_published' end,
    marketplace_summary = coalesce(marketplace_summary, 'A platform-authored production course with deterministic scoring, WebGL/WebXR workbench lessons, saved progress, and certificate gating.')
where id = '11111111-1111-4111-8111-111111111111';
