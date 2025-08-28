import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { coursesApi } from '@/api/courses';
import { Course, Enrollment, Certificate } from '@/types';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from '@/components/courses/CourseCard';
import { useAuth } from '@/contexts/AuthContext';

const CoursesCatalog: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const [list, enrollments, certs] = await Promise.all([
          coursesApi.getCourses({ search: searchQuery }),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
          coursesApi.getMyCertificates().catch(() => [] as Certificate[]),
        ]);
        setCourses(list);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((id): id is number => typeof id === 'number')
        );
        setEnrolledCourseIds(ids);
        const completed = new Set<number>(
          (certs as Certificate[])
            .map((c) => c.course?.id)
            .filter((id): id is number => typeof id === 'number')
        );
        setCompletedCourseIds(completed);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCourses, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const visibleCourses = useMemo(() => {
    // Students should only see courses they are NOT enrolled in
    if (user?.role === 'student') {
      return courses.filter((c) => !enrolledCourseIds.has(c.id));
    }
    return courses;
  }, [user?.role, courses, enrolledCourseIds]);

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
        <h1 className="text-2xl font-semibold text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse available courses</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            to={`/app/courses/${course.id}`}
            isEnrolled={enrolledCourseIds.has(course.id)}
            isCompleted={completedCourseIds.has(course.id)}
          />
        ))}
      </div>

      {visibleCourses.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses available</h3>
          <p className="text-muted-foreground">You may already be enrolled in all visible courses.</p>
        </div>
      )}
    </div>
  );
};

export default CoursesCatalog;