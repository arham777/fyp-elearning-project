import React from 'react';
import { keepPreviousData, useQuery, useQueries } from '@tanstack/react-query';
import { coursesApi } from '@/api/courses';
import { ApiResponse, Course, User, StudentCourseProgress, StudentSubmissionsResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

const StudentRow: React.FC<{ student: User; isActive?: boolean; onClick?: () => void; summary?: string }> = ({ student, isActive, onClick, summary }) => {
    const initials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}` || ((student.username?.slice(0, 2) ?? 'U'));
    return (
        <button onClick={onClick} className={`w-full text-left flex items-center justify-between gap-3 p-2 rounded-lg border transition-colors ${isActive ? 'bg-muted/60 border-border' : 'border-border/40 hover:bg-muted/40'}`}>
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
            <div className="flex flex-col items-end gap-0.5 shrink-0">
                {summary && (
                    <div className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground/80">
                        {summary}
                    </div>
                )}
                <div className="text-[11px] text-muted-foreground">{new Date(student.created_at).toLocaleDateString()}</div>
            </div>
        </button>
    );
};

const StudentsPage: React.FC = () => {
    const { user } = useAuth();
    // UI state for the selected course and table controls
    const [selectedCourseId, setSelectedCourseId] = React.useState<number | null>(null);
    const [selectedStudent, setSelectedStudent] = React.useState<User | null>(null);
    const [filterProgress, setFilterProgress] = React.useState<'all' | 'lt50' | 'lt75'>('all');
    const [filterNoPass, setFilterNoPass] = React.useState<boolean>(false);
    const [search, setSearch] = React.useState<string>('');
    const [ordering, setOrdering] = React.useState<string>('first_name');
    const [page, setPage] = React.useState<number>(1);
    const [pageSize, setPageSize] = React.useState<number>(10);

    // Fetch teacher courses
    const { data: myCourses = [], isLoading: coursesLoading } = useQuery<Course[]>({
        // include user id in key so cache is per-user
        queryKey: ['courses', 'mine', user?.id],
        queryFn: () => coursesApi.getCourses({ page: 1 }),
    });

    // Reset selection when user changes
    React.useEffect(() => {
        setSelectedCourseId(null);
        setPage(1);
        setSearch('');
        setSelectedStudent(null);
    }, [user?.id]);

    // Ensure a default selected course when courses load (only if any exist)
    React.useEffect(() => {
        if (myCourses.length > 0) {
            setSelectedCourseId((prev) => prev ?? myCourses[0].id);
        } else {
            setSelectedCourseId(null);
        }
        setSelectedStudent(null);
    }, [myCourses]);

    // Fetch paginated students for the selected course
    const { data: studentsPage, isLoading: studentsLoading, isError } = useQuery<ApiResponse<User>, Error, ApiResponse<User>>({
        // include user id in key to avoid cross-user cache collisions
        queryKey: ['courseStudentsPaged', user?.id, selectedCourseId, page, pageSize, search, ordering],
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
        setSelectedStudent(null);
    };

    // Fetch detailed progress for selected student in selected course
    const { data: progressData, isLoading: progressLoading, isError: progressError } = useQuery<StudentCourseProgress>({
        queryKey: ['courseStudentProgress', user?.id, selectedCourseId, selectedStudent?.id],
        queryFn: () => coursesApi.getStudentProgress(selectedCourseId as number, selectedStudent!.id),
        enabled: !!selectedCourseId && !!selectedStudent,
        staleTime: 30 * 1000,
    });

    // Bulk-load progress for current page for chips and filters
    const studentList = studentsPage?.results ?? [];
    const progressQueries = useQueries({
        queries: studentList.map((s) => ({
            queryKey: ['courseStudentProgress', user?.id, selectedCourseId, s.id],
            queryFn: () => coursesApi.getStudentProgress(selectedCourseId as number, s.id),
            enabled: !!selectedCourseId && studentList.length > 0,
            staleTime: 30 * 1000,
        })),
    });
    const progressMap = React.useMemo(() => {
        const map = new Map<number, StudentCourseProgress>();
        progressQueries.forEach((q, idx) => {
            const s = studentList[idx];
            if (s && q.data) map.set(s.id, q.data);
        });
        return map;
    }, [progressQueries, studentList]);
    const anyFilterActive = filterProgress !== 'all' || filterNoPass;
    const filteredStudents = React.useMemo(() => {
        return studentList.filter((s) => {
            const p = progressMap.get(s.id);
            if (anyFilterActive && !p) return false;
            if (!p) return true;
            let ok = true;
            if (filterProgress === 'lt50') ok = ok && p.overall_progress < 50;
            if (filterProgress === 'lt75') ok = ok && p.overall_progress < 75;
            if (filterNoPass) {
                const passedCount = p.assignments.filter(a => a.passed).length;
                ok = ok && passedCount === 0;
            }
            return ok;
        });
    }, [studentList, progressMap, filterProgress, filterNoPass, anyFilterActive]);

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
                            <Separator orientation="vertical" className="hidden md:block h-6" />
                            <Select value={filterProgress} onValueChange={(v: any) => setFilterProgress(v)}>
                                <SelectTrigger className="h-9 w-[160px]">
                                    <SelectValue placeholder="Filter progress" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All progress</SelectItem>
                                    <SelectItem value="lt50">Below 50%</SelectItem>
                                    <SelectItem value="lt75">Below 75%</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 pl-1">
                                <Checkbox id="noPass" checked={filterNoPass} onCheckedChange={(v) => setFilterNoPass(!!v)} />
                                <Label htmlFor="noPass" className="text-xs">No assignment passed</Label>
                            </div>
                        </div>

                        {studentsLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
                        {isError && <div className="text-sm text-destructive">Failed to load students</div>}

                        {!studentsLoading && !isError && (
                            <div className="space-y-3">
                                {studentsPage?.results?.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No students</div>
                                ) : (
                                    filteredStudents.map((s) => {
                                        const p = progressMap.get(s.id);
                                        const totalAssignments = p?.assignments?.length ?? undefined;
                                        const passedCount = totalAssignments !== undefined ? p!.assignments.filter(a => a.passed).length : undefined;
                                        const summary = p ? `${p.overall_progress}% • ${passedCount}/${totalAssignments} passed` : undefined;
                                        return (
                                            <StudentRow
                                                key={s.id}
                                                student={s}
                                                isActive={selectedStudent?.id === s.id}
                                                onClick={() => setSelectedStudent(prev => prev?.id === s.id ? null : s)}
                                                summary={summary}
                                            />
                                        );
                                    })
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

                                {/* Progress details */}
                                {selectedStudent && (
                                    <div className="mt-4 border-t border-border/40 pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{selectedStudent.first_name || selectedStudent.last_name ? `${selectedStudent.first_name ?? ''} ${selectedStudent.last_name ?? ''}`.trim() : selectedStudent.username}</div>
                                                <div className="text-xs text-muted-foreground">{selectedStudent.email}</div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">Joined {new Date(selectedStudent.created_at).toLocaleDateString()}</div>
                                        </div>

                                        {progressLoading && <div className="text-sm text-muted-foreground">Loading progress…</div>}
                                        {progressError && <div className="text-sm text-destructive">Failed to load progress</div>}
                                        {progressData && (
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="text-sm font-medium">Overall Progress</div>
                                                        <div className="text-xs text-muted-foreground">{progressData.overall_progress}%</div>
                                                    </div>
                                                    <Progress value={progressData.overall_progress} />
                                                </div>

                                                {/* Modules summary */}
                                                <div>
                                                    <div className="text-sm font-medium mb-2">Modules</div>
                                                    <div className="space-y-2">
                                                        {progressData.modules.map(m => (
                                                            <div key={m.id} className="p-2 rounded-md border border-border/40">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="font-medium text-sm truncate">{m.order}. {m.title}</div>
                                                                    <div className="text-xs text-muted-foreground">{m.percent}% • {m.completed_content}/{m.total_content} content • {m.assignments_passed}/{m.assignments_total} assignments</div>
                                                                </div>
                                                                <div className="mt-2"><Progress value={m.percent} /></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Assignments summary */}
                                                <div>
                                                    <div className="text-sm font-medium mb-2">Assignments</div>
                                                    {progressData.assignments.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground">No assignments in this course.</div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {progressData.assignments.map(a => (
                                                                <div key={a.id} className={`p-2 rounded-md border ${a.passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40'}`}>
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium text-sm truncate">{a.title}</div>
                                                                            <div className="text-xs text-muted-foreground">Best: {a.best_grade !== null ? `${a.best_grade}%` : '—'} • Attempts: {a.attempts_used}/{a.max_attempts} • Pass: {a.passing_grade}%</div>
                                                                        </div>
                                                                        <div className={`text-xs font-medium shrink-0 ${a.passed ? 'text-emerald-500' : 'text-amber-500'}`}>{a.passed ? 'Passed' : 'Pending'}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="mt-3 flex justify-end">
                                                        <DetailsDrawerButton courseId={selectedCourseId!} student={selectedStudent} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// Drawer Button + Content for full submission history
const DetailsDrawerButton: React.FC<{ courseId: number; student: User }> = ({ courseId, student }) => {
    const [open, setOpen] = React.useState(false);
    const { data, isLoading, isError } = useQuery<StudentSubmissionsResponse>({
        queryKey: ['studentSubmissions', courseId, student.id, open],
        queryFn: () => coursesApi.getStudentSubmissions(courseId, student.id),
        enabled: open,
        staleTime: 60 * 1000,
    });
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <button className="px-3 h-8 rounded-md border border-border/60 text-xs hover:bg-muted" onClick={() => setOpen(true)}>
                View details
            </button>
            <DrawerContent className="max-h-[85vh] overflow-y-auto">
                <DrawerHeader>
                    <DrawerTitle>Submission history</DrawerTitle>
                    <DrawerDescription>{student.username} — {student.email}</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-4">
                    {isLoading && <div className="text-sm text-muted-foreground">Loading attempts…</div>}
                    {isError && <div className="text-sm text-destructive">Failed to load attempts.</div>}
                    {data && (
                        <div className="space-y-3">
                            {data.assignments.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No assignments.</div>
                            ) : (
                                data.assignments.map(a => (
                                    <div key={a.id} className="rounded-md border border-border/40">
                                        <div className="p-3 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">{a.title}</div>
                                                <div className="text-xs text-muted-foreground">Pass: {a.passing_grade}% • Best: {a.best_grade !== null ? `${a.best_grade}%` : '—'} • Attempts: {a.submissions.length}/{a.max_attempts}</div>
                                            </div>
                                            <div className={`text-xs font-medium shrink-0 ${a.passed ? 'text-emerald-500' : 'text-amber-500'}`}>{a.passed ? 'Passed' : 'Pending'}</div>
                                        </div>
                                        {a.submissions.length > 0 && (
                                            <div className="border-t border-border/40">
                                                <div className="divide-y divide-border/40">
                                                    {a.submissions.map(sub => (
                                                        <div key={sub.id} className="p-3 text-xs flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium">Attempt #{sub.attempt_number}</div>
                                                                <div className="text-muted-foreground">{sub.submission_date ? new Date(sub.submission_date).toLocaleString() : ''}</div>
                                                            </div>
                                                            <div className="w-36 text-right">
                                                                <div className="font-medium">{sub.status === 'graded' ? `${sub.grade ?? 0}%` : 'Awaiting grade'}</div>
                                                                {sub.feedback && <div className="text-muted-foreground truncate">{sub.feedback}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default StudentsPage;
