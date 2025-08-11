import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Course, CourseModule, Enrollment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const formatPKR = (value: number | string): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const courseId = Number(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, mods, enrollments] = await Promise.all([
          coursesApi.getCourse(courseId),
          coursesApi.getCourseModules(courseId).catch(() => []),
          coursesApi.getMyEnrollments().catch(() => [] as Enrollment[]),
        ]);
        setCourse(c);
        setModules(mods as CourseModule[]);
        const ids = new Set<number>(
          (enrollments as Enrollment[])
            .map((e) => e.course?.id)
            .filter((cid): cid is number => typeof cid === 'number')
        );
        setEnrolledCourseIds(ids);
      } finally {
        setIsLoading(false);
      }
    };
    if (!Number.isNaN(courseId)) fetchData();
  }, [courseId]);

  const isEnrolled = useMemo(() => enrolledCourseIds.has(courseId), [enrolledCourseIds, courseId]);

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      await coursesApi.enrollInCourse(courseId);
      const updated = new Set(enrolledCourseIds);
      updated.add(courseId);
      setEnrolledCourseIds(updated);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><div className="h-8 bg-muted rounded w-64" /><div className="h-40 bg-muted rounded" /></div>;
  }

  if (!course) {
    return <div className="text-muted-foreground">Course not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{course.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {isTeacher ? `${course.enrollment_count ?? 0} enrolled` : formatPKR(course.price)}
          </Badge>
          {!isTeacher && (
            isEnrolled ? (
              <Button className="h-9" asChild>
                <Link to="#">Continue</Link>
              </Button>
            ) : (
              <Button className="h-9" onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? 'Enrolling...' : 'Enroll now'}
              </Button>
            )
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modules</CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-sm text-muted-foreground">No modules added yet.</div>
          ) : (
            <ol className="space-y-3 list-decimal pl-6">
              {modules.map((m) => (
                <li key={m.id} className="text-foreground">
                  <div className="font-medium">{m.title}</div>
                  {m.description && (
                    <div className="text-sm text-muted-foreground">{m.description}</div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
              <span><span className="text-foreground font-medium">{course.enrollment_count ?? 0}</span> enrolled</span>
              <span>•</span>
              <span><span className="text-foreground font-medium">{modules.length}</span> modules</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseDetail;


