import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Course } from '@/types';
import { Badge as UiBadge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

interface CourseCardProps {
  course: Course;
  to?: string; // optional link target
  isEnrolled?: boolean;
  isCompleted?: boolean;
  progress?: number;
  // Controls visual behavior differences across pages
  context?: 'default' | 'myCourses' | 'catalog';
}

const formatPKR = (value: number | string): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getInitials = (first?: string, last?: string, username?: string): string => {
  const a = (first?.[0] ?? '').toUpperCase();
  const b = (last?.[0] ?? '').toUpperCase();
  const fallback = (username ?? 'U').slice(0, 1).toUpperCase();
  return (a + b) || fallback;
};

const CourseCard: React.FC<CourseCardProps> = ({ course, to, isEnrolled, isCompleted, progress, context = 'default' }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const teacher = course.teacher;
  const teacherName = `${teacher?.first_name || teacher?.username || 'Instructor'}${teacher?.last_name ? ` ${teacher.last_name}` : ''}`;

  return (
    <Card className="hover:shadow-sm transition-shadow h-full flex flex-col">
      <CardHeader className="flex-none space-y-2 min-h-[96px]">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-1">{course.title}</CardTitle>
          {(() => {
            // On catalog page, hide badges for students but show for teachers
            if (context === 'catalog' && !isTeacher) return null;

            // Teacher view (non-catalog pages): show enrollment count
            if (isTeacher) {
              return (
                <div className="flex items-center gap-2">
                  <UiBadge variant={course.is_published ? undefined : 'destructive'}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </UiBadge>
                  <Badge variant="secondary">{`${course.enrollment_count ?? 0} enrolled`}</Badge>
                </div>
              );
            }

            if (context === 'myCourses') {
              // In My Courses, hide the "Enrolled" badge; show "Completed" instead when applicable
              if (isCompleted) {
                return (
                  <Badge variant="secondary">Completed</Badge>
                );
              }
              return null;
            }

            // Default behavior (non-catalog general use): show Enrolled or price
            const text = isEnrolled ? 'Enrolled' : formatPKR(course.price);
            return (
              <Badge variant="secondary">{text}</Badge>
            );
          })()}
        </div>
        <CardDescription className="text-sm line-clamp-2">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3">

      {typeof progress === 'number' && (
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="flex items-center justify-between w-full text-xs mb-1 text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 w-full" />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-ink/10 flex items-center justify-center text-[11px] font-medium">
            {getInitials(teacher?.first_name, teacher?.last_name, teacher?.username)}
          </div>
          <div className="truncate">
            <span className="font-medium">{teacherName}</span>
            <span className="ml-2 text-muted-foreground">Instructor</span>
          </div>
        </div>

       

        {isTeacher && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{course.enrollment_count ?? 0} enrolled</span>
            {typeof course.modules !== 'undefined' && (
              <>
                <span>•</span>
                <span>{course.modules?.length ?? 0} modules</span>
              </>
            )}
          </div>
        )}

        <div className="pt-1 flex items-center gap-2">
          {!isTeacher && isCompleted && (
            <>
              {context !== 'myCourses' && (
                <UiBadge>Completed</UiBadge>
              )}
              <Button asChild variant="outline" className="h-9">
                <Link to={`/app/certificates?courseId=${course.id}`}>View certificate</Link>
              </Button>
            </>
          )}
          {to ? (
            <Button asChild className="w-full h-9">
              <Link to={to}>{isTeacher ? 'View' : (isCompleted ? 'Review' : (isEnrolled ? 'Continue' : 'View details'))}</Link>
            </Button>
          ) : (
            <Button className="w-full h-9">{isTeacher ? 'View' : (isEnrolled ? 'Continue' : 'View details')}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseCard;


