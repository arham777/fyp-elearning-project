import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, ClipboardList, TrendingUp, Plus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome, Professor {user?.last_name}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your courses and track student progress.
          </p>
        </div>
        <Button asChild>
          <Link to="/create-course">
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
            <div className="text-xl font-semibold">12</div>
            <p className="text-[11px] text-muted-foreground">
              3 published this month
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">284</div>
            <p className="text-[11px] text-muted-foreground">
              +18 this week
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">7</div>
            <p className="text-[11px] text-muted-foreground">
              Assignments to grade
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Course Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl font-semibold">4.8</div>
            <p className="text-[11px] text-muted-foreground">
              Average rating
            </p>
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
            {[
              { title: 'Advanced React Patterns', students: 45, status: 'Published' },
              { title: 'TypeScript Fundamentals', students: 32, status: 'Draft' },
              { title: 'API Design Principles', students: 67, status: 'Published' },
            ].map((course, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                <div className="flex-1">
                  <h4 className="font-medium text-sm line-clamp-1">{course.title}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {course.students} students
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      course.status === 'Published'
                        ? 'bg-accent-light text-foreground'
                        : 'bg-muted text-ink/60'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" />
                  View
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
            {[
              { student: 'John Smith', assignment: 'React Project', course: 'Advanced React', submitted: '2 hours ago' },
              { student: 'Sarah Johnson', assignment: 'TypeScript Quiz', course: 'TypeScript Fundamentals', submitted: '1 day ago' },
              { student: 'Mike Chen', assignment: 'API Documentation', course: 'API Design', submitted: '2 days ago' },
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
                <div className="flex-1">
                  <h4 className="font-medium text-sm line-clamp-1">{item.assignment}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    by {item.student} • {item.course}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{item.submitted}</p>
                </div>
                <Button size="sm">Grade</Button>
              </div>
            ))}
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
              <Link to="/create-course">
                <Plus className="h-6 w-6" />
                <span>Create New Course</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col space-y-1" asChild>
              <Link to="/assignments">
                <ClipboardList className="h-6 w-6" />
                <span>View All Assignments</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col space-y-1" asChild>
              <Link to="/students">
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