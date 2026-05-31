import type { Course, CourseAccess, LearnerProgress, Lesson } from '@/types/database';

export function hasCourseAccess(course: Course, accessRows: CourseAccess[] = []) {
  if ((course.access_mode ?? 'paid') === 'free') return true;
  return accessRows.some(row => row.course_id === course.id && row.active && (!row.expires_at || new Date(row.expires_at) > new Date()));
}

export function isLessonUnlocked(params: {
  userAuthenticated: boolean;
  lesson: Lesson;
  course: Course;
  courseLessons: Lesson[];
  progressRows: LearnerProgress[];
  accessRows: CourseAccess[];
}) {
  const { userAuthenticated, lesson, course, courseLessons, progressRows, accessRows } = params;
  if (!userAuthenticated) return false;
  const index = courseLessons.findIndex(item => item.id === lesson.id);
  if (index < 0) return false;

  const previewLimit = course.preview_lessons ?? 1;
  const accessGranted = hasCourseAccess(course, accessRows);
  const withinPreview = index < previewLimit;
  if (!accessGranted && !withinPreview) return false;

  if (index === 0) return true;
  const previousLesson = courseLessons[index - 1];
  return progressRows.some(item => item.lesson_id === previousLesson.id && item.status === 'completed');
}
