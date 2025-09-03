import { coursesApi } from '@/api/courses';

// Cache for enrollment status to avoid repeated API calls
const enrollmentCache = new Map<number, boolean>();
let enrollmentsPromise: Promise<number[]> | null = null;

/**
 * Get all enrolled course IDs for the current user
 */
async function getEnrolledCourseIds(): Promise<number[]> {
  if (!enrollmentsPromise) {
    enrollmentsPromise = coursesApi.getMyEnrollments()
      .then(enrollments => enrollments.map(e => e.course.id))
      .catch(() => []);
  }
  return enrollmentsPromise;
}

/**
 * Check if user is enrolled in a specific course
 */
export async function isEnrolledInCourse(courseId: number): Promise<boolean> {
  if (enrollmentCache.has(courseId)) {
    return enrollmentCache.get(courseId)!;
  }

  const enrolledIds = await getEnrolledCourseIds();
  const isEnrolled = enrolledIds.includes(courseId);
  enrollmentCache.set(courseId, isEnrolled);
  return isEnrolled;
}

/**
 * Get the correct navigation path for a course based on enrollment status
 */
export async function getCourseNavigationPath(courseId: number): Promise<string> {
  const isEnrolled = await isEnrolledInCourse(courseId);
  return isEnrolled ? `/app/my-courses/${courseId}` : `/app/courses/${courseId}`;
}

/**
 * Get the correct navigation path for a course module based on enrollment status
 */
export async function getCourseModuleNavigationPath(courseId: number, moduleId: number): Promise<string> {
  const isEnrolled = await isEnrolledInCourse(courseId);
  return isEnrolled 
    ? `/app/my-courses/${courseId}/modules/${moduleId}` 
    : `/app/courses/${courseId}/modules/${moduleId}`;
}

/**
 * Get the correct navigation path for course content based on enrollment status
 */
export async function getCourseContentNavigationPath(courseId: number, moduleId: number, contentId: number): Promise<string> {
  const isEnrolled = await isEnrolledInCourse(courseId);
  return isEnrolled 
    ? `/app/my-courses/${courseId}/modules/${moduleId}/content/${contentId}` 
    : `/app/courses/${courseId}/modules/${moduleId}/content/${contentId}`;
}

/**
 * Clear the enrollment cache (useful when enrollment status changes)
 */
export function clearEnrollmentCache(): void {
  enrollmentCache.clear();
  enrollmentsPromise = null;
}

/**
 * Update enrollment cache when user enrolls/unenrolls from a course
 */
export function updateEnrollmentCache(courseId: number, isEnrolled: boolean): void {
  enrollmentCache.set(courseId, isEnrolled);
  // Clear the promise to force refresh on next call
  enrollmentsPromise = null;
}
