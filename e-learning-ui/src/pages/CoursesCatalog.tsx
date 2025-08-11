import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { coursesApi } from '@/api/courses';
import { Course, Enrollment } from '@/types';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import CourseCard from '@/components/courses/CourseCard';

const CoursesCatalog: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const [list, enrollments] = await Promise.all([
          coursesApi.getCourses({ search: searchQuery }),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
        ]);
        setCourses(list);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((id): id is number => typeof id === 'number')
        );
        setEnrolledCourseIds(ids);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCourses, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            to={`/courses/${course.id}`}
            isEnrolled={enrolledCourseIds.has(course.id)}
          />
        ))}
      </div>

      {courses.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
          <p className="text-muted-foreground">Try a different search.</p>
        </div>
      )}
    </div>
  );
};

export default CoursesCatalog;