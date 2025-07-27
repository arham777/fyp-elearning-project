import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { coursesApi } from '@/api/courses';
import { Enrollment, Course } from '@/types';
import { BookOpen, Clock, Award, TrendingUp, Play, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [enrollmentsData, coursesData] = await Promise.all([
          coursesApi.getMyEnrollments(),
          coursesApi.getCourses({ page: 1 }),
        ]);
        
        setEnrollments(enrollmentsData);
        setRecommendedCourses(coursesData.results.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const completedCourses = enrollments.filter(e => e.progress === 100).length;
  const inProgressCourses = enrollments.filter(e => e.progress > 0 && e.progress < 100).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Continue your learning journey and explore new courses.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {inProgressCourses} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses}</div>
            <p className="text-xs text-muted-foreground">
              Courses finished
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24h</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.length > 0 
                ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continue Learning */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Continue Learning</span>
            </CardTitle>
            <CardDescription>
              Pick up where you left off
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrollments.filter(e => e.progress > 0 && e.progress < 100).slice(0, 3).map((enrollment) => (
              <div key={enrollment.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{enrollment.course.title}</h4>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress value={enrollment.progress} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to={`/courses/${enrollment.course.id}`}>
                    Continue
                  </Link>
                </Button>
              </div>
            ))}
            
            {enrollments.filter(e => e.progress > 0 && e.progress < 100).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No courses in progress</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link to="/courses">Browse Courses</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Courses */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Recommended for You</CardTitle>
            <CardDescription>
              Courses you might be interested in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedCourses.map((course) => (
              <div key={course.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{course.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {course.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      ${course.price}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      by {course.teacher.first_name} {course.teacher.last_name}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/courses/${course.id}`}>
                    View
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Upcoming Assignments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming assignments</p>
            <p className="text-xs">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;