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

	const formatPKR = (value: number | string): string => {
		const amount = typeof value === 'string' ? parseFloat(value) : value;
		if (Number.isNaN(amount)) return 'PKR 0';
		return new Intl.NumberFormat('en-PK', {
			style: 'currency',
			currency: 'PKR',
			maximumFractionDigits: 0,
		}).format(amount);
	};

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				const [enrollmentsData, coursesData] = await Promise.all([
					coursesApi.getMyEnrollments(),
					coursesApi.getCourses({ page: 1 }),
				]);
				
				setEnrollments(enrollmentsData);
				const enrolledIds = new Set<number>(
					enrollmentsData
						.map((e) => e.course?.id)
						.filter((id): id is number => typeof id === 'number')
				);
				const notEnrolled = coursesData.filter(c => !enrolledIds.has(c.id));
				setRecommendedCourses(notEnrolled.slice(0, 3));
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
	// Enrollments to show in "Continue Learning" (hide fully completed)
	const incompleteEnrollments = enrollments.filter(e => e.progress < 100 && e.status !== 'completed');

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
				<h1 className="text-2xl font-semibold text-foreground">
					Welcome back, {user?.first_name || user?.username}!
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Continue your learning journey and explore new courses.
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="card-elevated">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Enrolled Courses</CardTitle>
						<BookOpen className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">{enrollments.length}</div>
						<p className="text-[11px] text-muted-foreground">{inProgressCourses} in progress</p>
					</CardContent>
				</Card>

				<Card className="card-elevated">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Completed</CardTitle>
						<Award className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">{completedCourses}</div>
						<p className="text-[11px] text-muted-foreground">Courses finished</p>
					</CardContent>
				</Card>

				<Card className="card-elevated">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Study Time</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">24h</div>
						<p className="text-[11px] text-muted-foreground">This month</p>
					</CardContent>
				</Card>

				<Card className="card-elevated">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Progress</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">
							{enrollments.length > 0 
								? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
								: 0}%
						</div>
						<p className="text-[11px] text-muted-foreground">Average completion</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
					<CardContent className="space-y-3">
						{incompleteEnrollments.slice(0, 3).map((enrollment) => (
							<div key={enrollment.id} className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
								<div className="flex-1">
									<h4 className="font-medium text-sm line-clamp-1">{enrollment.course.title}</h4>
									<div className="flex items-center space-x-2 mt-1">
										<Progress value={enrollment.progress} className="h-2 flex-1" />
										<span className="text-[11px] text-muted-foreground">{enrollment.progress}%</span>
									</div>
								</div>
								<Button size="sm" asChild>
									<Link to={`/app/courses/${enrollment.course.id}`}>
										Continue
									</Link>
								</Button>
							</div>
						))}
						
						{incompleteEnrollments.length === 0 && (
							<div className="text-center py-6 text-muted-foreground">
								<BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
								<p>No courses in progress</p>
								<Button variant="outline" size="sm" className="mt-2" asChild>
									<Link to="/app/courses">Browse Courses</Link>
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
					<CardContent className="space-y-3">
						{recommendedCourses.map((course) => (
							<div key={course.id} className="flex items-center space-x-3 p-3 rounded-md bg-muted/50">
								<div className="flex-1">
									<h4 className="font-medium text-sm line-clamp-1">{course.title}</h4>
									<p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
										{course.description}
									</p>
									<div className="flex items-center space-x-2 mt-2">
										<Badge variant="secondary" className="text-[11px]">
											{formatPKR(course.price)}
										</Badge>
										<span className="text-[11px] text-muted-foreground">
											by {course.teacher.first_name || course.teacher.username} {course.teacher.last_name || ''}
										</span>
									</div>
								</div>
								<Button size="sm" variant="outline" asChild>
									<Link to={`/app/courses/${course.id}`}>
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
					<div className="text-center py-6 text-muted-foreground">
						<Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
						<p>No upcoming assignments</p>
						<p className="text-[11px]">You're all caught up!</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default StudentDashboard;


