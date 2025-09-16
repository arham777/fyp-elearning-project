import React, { useEffect, useMemo, useState } from 'react';
import { coursesApi } from '@/api/courses';
import { Course, Enrollment, Certificate } from '@/types';
import CourseCard from '@/components/courses/CourseCard';
import { Progress } from '@/components/ui/progress';

const MyCourses: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        // First, ask server to refresh completion/certificates based on latest progress
        await coursesApi.refreshMyCompletion().catch(() => ({ updated_to_completed: 0 }));
        const [list, certs] = await Promise.all([
          coursesApi.getMyEnrollments(),
          coursesApi.getMyCertificates().catch(() => [] as Certificate[]),
        ]);
        setEnrollments(Array.isArray(list) ? list : []);
        setCertificates(Array.isArray(certs) ? certs : []);
      } catch (error) {
        console.error('Failed to fetch enrollments', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollments();
  }, []);

  const courses: Course[] = useMemo(() => {
    return enrollments
      .map((e) => e.course)
      .filter((c): c is Course => Boolean(c));
  }, [enrollments]);

  const enrollmentByCourseId = useMemo(() => {
    const map: Record<number, Enrollment> = {};
    for (const e of enrollments) {
      if (e.course?.id) map[e.course.id] = e;
    }
    return map;
  }, [enrollments]);

  const completedCourseIds = useMemo(() => {
    return new Set<number>(
      certificates
        .map((c) => c.course?.id)
        .filter((id): id is number => typeof id === 'number')
    );
  }, [certificates]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">Courses you are enrolled in</p>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="space-y-2">
              <CourseCard
                course={course}
                to={`/app/my-courses/${course.id}`}
                isEnrolled
                isCompleted={completedCourseIds.has(course.id)}
                progress={enrollmentByCourseId[course.id]?.progress}
                context="myCourses"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">No enrollments yet</h3>
          <p className="text-muted-foreground">Browse the catalog to start learning.</p>
        </div>
      )}
    </div>
  );
};

export default MyCourses;


