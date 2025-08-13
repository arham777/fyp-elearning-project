import React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { coursesApi } from '@/api/courses';
import { ApiResponse, Course, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StudentRow: React.FC<{ student: User }> = ({ student }) => {
	const initials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}` || (student.username?.slice(0, 2) ?? 'U');
	return (
		<div className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/40">
			<div className="flex items-center gap-3 min-w-0">
				<Avatar className="h-8 w-8">
					<AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<div className="text-sm font-medium truncate">
						{student.first_name || student.last_name ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() : student.username}
					</div>
					<div className="text-xs text-muted-foreground truncate">{student.email}</div>
				</div>
			</div>
			<div className="text-[11px] text-muted-foreground shrink-0">{new Date(student.created_at).toLocaleDateString()}</div>
		</div>
	);
};

const StudentsPage: React.FC = () => {
	// UI state for the selected course and table controls
	const [selectedCourseId, setSelectedCourseId] = React.useState<number | null>(null);
	const [search, setSearch] = React.useState<string>('');
	const [ordering, setOrdering] = React.useState<string>('first_name');
	const [page, setPage] = React.useState<number>(1);
	const [pageSize, setPageSize] = React.useState<number>(10);

	// Fetch teacher courses
	const { data: myCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
		queryKey: ['courses', 'mine'],
		queryFn: () => coursesApi.getCourses({ page: 1 }),
	});

	// Ensure a default selected course when courses load
	React.useEffect(() => {
		if (!selectedCourseId && myCourses.length > 0) {
			setSelectedCourseId(myCourses[0].id);
		}
	}, [myCourses, selectedCourseId]);

	// Fetch paginated students for the selected course
	const { data: studentsPage, isLoading: studentsLoading, isError } = useQuery<ApiResponse<User>, Error, ApiResponse<User>>({
		queryKey: ['courseStudentsPaged', selectedCourseId, page, pageSize, search, ordering],
		queryFn: () => coursesApi.getCourseStudentsPaged(selectedCourseId as number, {
			page,
			page_size: pageSize,
			search: search || undefined,
			ordering: ordering || undefined,
		}),
		enabled: !!selectedCourseId,
		placeholderData: keepPreviousData,
		staleTime: 30 * 1000,
	});

	const total = studentsPage?.count ?? studentsPage?.results?.length ?? 0;
	const totalPages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;

	// Handlers
	const onSelectCourse = (id: number) => {
		setSelectedCourseId(id);
		setPage(1);
		setSearch('');
	};

	if (coursesLoading) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Students</h1>
				<div className="grid grid-cols-12 gap-4">
					<Card className="card-elevated col-span-12 md:col-span-4 min-h-[360px] animate-pulse" />
					<Card className="card-elevated col-span-12 md:col-span-8 min-h-[360px] animate-pulse" />
				</div>
			</div>
		);
	}

	if (myCourses.length === 0) {
		return (
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Students</h1>
				<Card className="card-elevated">
					<CardHeader>
						<CardTitle>No courses found</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						Create a course to start enrolling students.
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Students</h1>
			<div className="grid grid-cols-12 gap-4">
				{/* Left: courses list */}
				<Card className="card-elevated col-span-12 md:col-span-4">
					<CardHeader>
						<CardTitle className="text-base">My Courses</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{myCourses.map((c) => {
							const isActive = c.id === selectedCourseId;
							return (
								<button
									key={c.id}
									onClick={() => onSelectCourse(c.id)}
									className={`w-full text-left p-2 rounded-md border transition-colors ${
										isActive ? 'bg-muted/60 border-border' : 'border-border/40 hover:bg-muted/40'
									}`}
								>
									<div className="font-medium truncate">{c.title}</div>
									<div className="text-[11px] text-muted-foreground truncate">{c.description}</div>
								</button>
							);
						})}
					</CardContent>
				</Card>

				{/* Right: students table */}
				<Card className="card-elevated col-span-12 md:col-span-8">
					<CardHeader>
						<CardTitle className="text-base">Enrolled Students</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex flex-wrap items-center gap-2">
							<Input
								placeholder="Search name, username, email..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="w-full md:w-[280px]"
							/>
							<Select value={ordering} onValueChange={(v) => setOrdering(v)}>
								<SelectTrigger className="h-9 w-[180px]">
									<SelectValue placeholder="Order by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="first_name">First name</SelectItem>
									<SelectItem value="-first_name">First name (desc)</SelectItem>
									<SelectItem value="last_name">Last name</SelectItem>
									<SelectItem value="-last_name">Last name (desc)</SelectItem>
									<SelectItem value="username">Username</SelectItem>
									<SelectItem value="-username">Username (desc)</SelectItem>
									<SelectItem value="email">Email</SelectItem>
									<SelectItem value="-email">Email (desc)</SelectItem>
									<SelectItem value="created_at">Joined</SelectItem>
									<SelectItem value="-created_at">Joined (newest)</SelectItem>
								</SelectContent>
							</Select>
							<Separator orientation="vertical" className="hidden md:block h-6" />
							<Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
								<SelectTrigger className="h-9 w-[120px]">
									<SelectValue placeholder="Page size" />
								</SelectTrigger>
								<SelectContent>
									{[10, 20, 50, 100].map((s) => (
										<SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{studentsLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
						{isError && <div className="text-sm text-destructive">Failed to load students</div>}

						{!studentsLoading && !isError && (
							<div className="space-y-3">
								{studentsPage?.results?.length === 0 ? (
									<div className="text-sm text-muted-foreground">No students</div>
								) : (
									studentsPage?.results?.map((s) => <StudentRow key={s.id} student={s} />)
								)}

								<div className="flex items-center justify-between pt-2">
									<div className="text-[11px] text-muted-foreground">
										Page {page} of {totalPages}
									</div>
									<div className="flex items-center gap-2">
										<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
											Prev
										</Button>
										<Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
											Next
										</Button>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default StudentsPage;


