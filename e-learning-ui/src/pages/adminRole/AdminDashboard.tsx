import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, BookOpen, Award, TrendingUp } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendUp, onClick }) => (
  <Card className={`${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
          <TrendingUp className={`h-3 w-3 ${!trendUp ? 'rotate-180' : ''}`} />
          {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard-stats', { months: 12 }],
    queryFn: adminApi.getDashboardStats,
    // Faster refresh for near real-time updates
    refetchInterval: 10000, // 10 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  const stats = dashboardStats || {
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    monthlyEnrollments: []
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your e-learning platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users />}
          trend="+12% from last month"
          trendUp={true}
          onClick={() => navigate('/app/users')}
        />
        <StatsCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={<GraduationCap />}
          trend="+3% from last month"
          trendUp={true}
          onClick={() => navigate('/app/users')}
        />
        <StatsCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={<BookOpen />}
          trend="+8% from last month"
          trendUp={true}
          onClick={() => navigate('/app/course-management')}
        />
        <StatsCard
          title="Total Enrollments"
          value={stats.totalEnrollments}
          icon={<Award />}
          trend="+15% from last month"
          trendUp={true}
          onClick={() => navigate('/app/course-management')}
        />
      </div>

      {/* Monthly Enrollments Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Student Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyEnrollments}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="enrollments" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/users')}>
          <CardHeader>
            <CardTitle className="text-lg">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage students and teachers</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/course-management')}>
          <CardHeader>
            <CardTitle className="text-lg">Course Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Review and manage courses</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/settings')}>
          <CardHeader>
            <CardTitle className="text-lg">Platform Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure platform settings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
