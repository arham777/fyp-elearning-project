import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, ClipboardList, TrendingUp, Plus, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coursesApi } from '@/api/courses';
import { Course, CourseRating, Enrollment } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const TeacherDashboard: React.FC = () => {
	const { user } = useAuth();
	const [myCourses, setMyCourses] = useState<Course[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [uniqueStudentsCount, setUniqueStudentsCount] = useState<number>(0);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Backend filters teacher to only their courses
				const [courses, enrollments] = await Promise.all([
					coursesApi.getCourses({ page: 1 }),
					coursesApi.getMyEnrollments(),
				]);
				setMyCourses(courses);

				// Compute unique students across all teacher courses
				const uniqueIds = new Set<number>();
				(enrollments as Enrollment[]).forEach((enr) => {
					const studentField: any = (enr as any).student;
					const id = typeof studentField === 'object' ? studentField?.id : studentField;
					if (typeof id === 'number') uniqueIds.add(id);
				});
				setUniqueStudentsCount(uniqueIds.size);
			} catch (error) {
				console.error('Failed to fetch teacher dashboard data', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, []);

	const recentCourses = useMemo(() => {
		return [...myCourses]
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 3);
	}, [myCourses]);

	// Overall average across all teacher courses
	const overallAverageRating = useMemo(() => {
		if (!myCourses || myCourses.length === 0) return 0;
		let weightedSum = 0;
		let totalCount = 0;
		for (const c of myCourses) {
			const avg = typeof c.average_rating === 'number' ? c.average_rating : 0;
			const count = typeof c.ratings_count === 'number' ? c.ratings_count : 0;
			if (count > 0) {
				weightedSum += avg * count;
				totalCount += count;
			}
		}
		if (totalCount === 0) {
			const arr = myCourses.map((c) => (typeof c.average_rating === 'number' ? c.average_rating : 0));
			return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
		}
		return weightedSum / totalCount;
	}, [myCourses]);

	const [ratingsOpen, setRatingsOpen] = useState(false);
	// Per-course ratings (all individual ratings)
	const [openCourseAccordions, setOpenCourseAccordions] = useState<string[]>([]);
	const [courseRatings, setCourseRatings] = useState<Record<number, CourseRating[]>>({});
	const [ratingsLoading, setRatingsLoading] = useState<Record<number, boolean>>({});
	const [ratingsError, setRatingsError] = useState<Record<number, string | null>>({});
	const [pendingOpen, setPendingOpen] = useState(false);
	const [pendingLoading, setPendingLoading] = useState(false);
	const [pendingError, setPendingError] = useState<string | null>(null);
	const [pendingReviews, setPendingReviews] = useState<Array<{ id: number; courseId: number; courseTitle: string; rating: number; review: string; student?: any; updated_at?: string }>>([]);
	const [replyTextById, setReplyTextById] = useState<Record<number, string>>({});

	const loadCourseRatings = async (courseId: number) => {
		if (ratingsLoading[courseId] || courseRatings[courseId]) return;
		setRatingsLoading((s) => ({ ...s, [courseId]: true }));
		setRatingsError((s) => ({ ...s, [courseId]: null }));
		try {
			const data = await coursesApi.getCourseRatings(courseId);
			const items: CourseRating[] = Array.isArray(data) ? data : (data?.results ?? []);
			setCourseRatings((s) => ({ ...s, [courseId]: items }));
		} catch (e) {
			setRatingsError((s) => ({ ...s, [courseId]: 'Failed to load ratings' }));
		} finally {
			setRatingsLoading((s) => ({ ...s, [courseId]: false }));
		}
	};

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
					<Link to="/app/courses">
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
						<div className="text-xl font-semibold">{isLoading ? '—' : uniqueStudentsCount}</div>
						<p className="text-[11px] text-muted-foreground">{uniqueStudentsCount === 0 ? 'No students yet' : 'Unique students across your courses'}</p>
					</CardContent>
				</Card>

				<Card className="card-elevated cursor-pointer" onClick={() => setPendingOpen(true)}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Pending Reviews</CardTitle>
						<ClipboardList className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">{pendingLoading ? '—' : pendingReviews.length}</div>
						<p className="text-[11px] text-muted-foreground">Reviews awaiting your reply</p>
					</CardContent>
				</Card>

				<Card className="card-elevated cursor-pointer" onClick={() => setRatingsOpen(true)}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
						<CardTitle className="text-xs font-medium">Course Rating</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="pt-0">
						<div className="text-xl font-semibold">{isLoading ? '—' : overallAverageRating.toFixed(1)}</div>
						<p className="text-[11px] text-muted-foreground">Average rating</p>
					</CardContent>
				</Card>
			</div>

			{/* Ratings and Feedback modal */}
			<Dialog open={ratingsOpen} onOpenChange={setRatingsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Course Ratings & Feedback</DialogTitle>
						<DialogDescription>Overall average: {isLoading ? '—' : overallAverageRating.toFixed(1)}</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						{isLoading && <div className="py-6 text-sm text-muted-foreground">Loading…</div>}
						{!isLoading && myCourses.length === 0 && (
							<div className="py-6 text-sm text-muted-foreground">No courses yet.</div>
						)}
						{!isLoading && (
							<Accordion type="multiple" value={openCourseAccordions} onValueChange={(vals) => {
								setOpenCourseAccordions(vals as string[]);
								// Fetch ratings for any newly opened course
								(vals as string[]).forEach((v) => {
									const id = parseInt(v, 10);
									if (!Number.isNaN(id)) void loadCourseRatings(id);
								});
							}}>
								{myCourses.map((c) => {
									const avg = typeof c.average_rating === 'number' ? c.average_rating : 0;
									const count = typeof c.ratings_count === 'number' ? c.ratings_count : 0;
									const cid = String(c.id);
									const items = courseRatings[c.id] || [];
									const loading = !!ratingsLoading[c.id];
									const err = ratingsError[c.id];
									return (
										<AccordionItem key={c.id} value={cid} className="rounded-md border px-3">
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1 min-w-0">
													<AccordionTrigger>
														<div className="min-w-0 pr-3 text-left">
															<div className="font-medium text-sm truncate">{c.title}</div>
															<div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
																{Array.from({ length: 5 }).map((_, idx) => {
																	const starVal = idx + 1;
																	const activeFill = (avg ?? 0) >= starVal;
																	return <Star key={idx} className={`w-3.5 h-3.5 ${activeFill ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />;
																})}
																<span className="ml-1">{avg.toFixed(1)}</span>
																<span>({count})</span>
															</div>
														</div>
													</AccordionTrigger>
												</div>
											</div>
											<Button asChild size="sm" variant="outline" className="mt-3 mb-2">
												<Link to={`/app/courses/${c.id}`}>View</Link>
											</Button>
											<AccordionContent className="pt-2">
												{loading && <div className="py-2 text-xs text-muted-foreground">Loading ratings…</div>}
												{err && <div className="py-2 text-xs text-destructive">{err}</div>}
												{!loading && !err && (
													<div className="space-y-2">
														{items.length === 0 && <div className="py-2 text-xs text-muted-foreground">No ratings yet.</div>}
														{items.map((r) => (
															<div key={r.id} className="border rounded-md p-2 bg-muted/30">
																<div className="flex items-center justify-between">
																	<div className="min-w-0 pr-3">
																		<div className="text-sm font-medium truncate">{r.student?.first_name || r.student?.username || 'Student'}</div>
																	</div>
																	<div className="flex items-center gap-1 text-xs text-muted-foreground">
																		{Array.from({ length: 5 }).map((_, idx) => {
																			const starVal = idx + 1; const active = (r.rating ?? 0) >= starVal;
																			return <Star key={idx} className={`w-3.5 h-3.5 ${active ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />;
																		})}
																		<span className="ml-1">{Number(r.rating ?? 0).toFixed(1)}</span>
																	</div>
																</div>
																{r.review && <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.review}</div>}
															</div>
														))}
													</div>
												)}
											</AccordionContent>
										</AccordionItem>
									);
								})}
							</Accordion>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Pending Reviews modal */}
			<Dialog open={pendingOpen} onOpenChange={(open) => { setPendingOpen(open); if (open) void (async () => {
				setPendingLoading(true); setPendingError(null);
				try {
					const results = await Promise.all(myCourses.map(async (c) => {
						try {
							// Fallback to full ratings list; filter to only entries with review text
							const data = await coursesApi.getCourseRatings(c.id);
							const arr = Array.isArray(data) ? data : (data?.results ?? []);
							return arr
								.filter((r: any) => Boolean((r?.review || '').trim()))
								.map((r: any) => ({ id: r.id, courseId: c.id, courseTitle: c.title, rating: r.rating, review: r.review, student: r.student, updated_at: r.updated_at }));
						} catch { return []; }
					}));
					setPendingReviews(results.flat());
				} catch { setPendingError('Failed to load pending reviews'); } finally { setPendingLoading(false); }
			})(); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Pending Reviews</DialogTitle>
						<DialogDescription>Reply to student feedback across your courses.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						{pendingLoading && <div className="py-6 text-sm text-muted-foreground">Loading…</div>}
						{pendingError && <div className="py-6 text-sm text-destructive">{pendingError}</div>}
						{!pendingLoading && !pendingError && pendingReviews.length === 0 && (
							<div className="py-6 text-sm text-muted-foreground">No pending reviews.</div>
						)}
						{!pendingLoading && !pendingError && pendingReviews.map((r) => (
							<div key={r.id} className="border rounded-md p-3">
								<div className="flex items-center justify-between">
									<div className="min-w-0 pr-3">
										<div className="text-sm font-medium truncate">{r.courseTitle}</div>
										<div className="text-xs text-muted-foreground truncate">{r.student?.first_name || r.student?.username}</div>
									</div>
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										{Array.from({ length: 5 }).map((_, idx) => {
											const starVal = idx + 1; const active = (r.rating ?? 0) >= starVal;
											return <Star key={idx} className={`w-3.5 h-3.5 ${active ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />;
										})}
										<span className="ml-1">{Number(r.rating ?? 0).toFixed(1)}</span>
									</div>
								</div>
								<div className="mt-2 text-sm text-muted-foreground">{r.review}</div>
								<div className="mt-3 space-y-2">
									<Textarea
										placeholder="Write a reply"
										value={replyTextById[r.id] ?? ''}
										onChange={(e) => setReplyTextById((s) => ({ ...s, [r.id]: e.target.value }))}
									/>
									<div className="flex justify-end">
										<Button
											size="sm"
											onClick={async () => {
												const text = (replyTextById[r.id] ?? '').trim(); if (!text) return;
												try { await coursesApi.replyToReview(r.courseId, r.id, text);
													setPendingReviews((list) => list.filter((x) => x.id !== r.id));
													setReplyTextById((s) => ({ ...s, [r.id]: '' })); } catch {}
											}}
										>
											Send Reply
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>

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
									<Link to="/app/courses">
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
							<Link to="/app/courses">
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
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default TeacherDashboard;


