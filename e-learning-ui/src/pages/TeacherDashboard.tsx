import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, ClipboardList, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Course } from '@/types';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        // Backend filters teacher to only their courses
        const courses = await coursesApi.getCourses({ page: 1 });
        setMyCourses(courses);
      } catch (error) {
        console.error('Failed to fetch teacher courses', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyCourses();
  }, []);

  const recentCourses = useMemo(() => {
    return [...myCourses]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [myCourses]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome, Professor {user?.first_name || user?.username}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your courses and track student progress.
          </p>
        </div>
        <Button asChild>
          <Link to="/app/create-course">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">My Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">{isLoading ? '—' : myCourses.length}</div>
            <p className="text-[11px] text-muted-foreground">
              {myCourses.length === 0 ? 'No courses created yet' : 'Total you have created'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">0</div>
            <p className="text-[11px] text-muted-foreground">No students yet</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">0</div>
            <p className="text-[11px] text-muted-foreground">No assignments to grade</p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Course Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">0.0</div>
            <p className="text-[11px] text-muted-foreground">Average rating</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Courses */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Recent Courses</CardTitle>
            <CardDescription>
              Your latest course activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myCourses.length === 0 && !isLoading && (
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div>
                  <h4 className="font-medium text-sm">No courses created</h4>
                  <p className="text-[11px] text-muted-foreground">Create your first course to get started.</p>
                </div>
                <Button asChild size="sm">
                  <Link to="/app/create-course">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Link>
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
                ))}
              </div>
            )}

            {recentCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div className="min-w-0 pr-3">
                  <h4 className="font-medium text-sm truncate">{course.title}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {course.description}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/app/courses/${course.id}`}>
                    View <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Assignments to Grade</CardTitle>
            <CardDescription>
              Recent student submissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-md bg-muted/50">
              <h4 className="font-medium text-sm">No submissions yet</h4>
              <p className="text-[11px] text-muted-foreground">You'll see recent student work here.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-16 flex flex-col space-y-1" asChild>
              <Link to="/app/create-course">
                <Plus className="h-6 w-6" />
                <span>Create New Course</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col space-y-1" asChild>
              <Link to="/app/students">
                <Users className="h-6 w-6" />
                <span>Manage Students</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col space-y-1" asChild>
              <Link to="/app/students">
                <Users className="h-6 w-6" />
                <span>Manage Students</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;